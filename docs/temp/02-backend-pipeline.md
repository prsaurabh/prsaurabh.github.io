# LocalRAG — Backend Pipeline Deep Dive

## 1. Configuration System (`core/config.py`)

Centralized Pydantic Settings class with environment variable override. Single global instance: `config = Config()`.

**Key configuration groups:**
- **AWS**: access key, secret, region (optional for private mode)
- **Models**: `sbert_model` (nomic-ai/nomic-embed-text-v1.5), `ollama_generation_model` (qwen3:4b), `ollama_vision_model` (qwen2.5vl:3b), Bedrock model IDs for generation/embedding/metadata/vision
- **Paths**: Mode-specific paths for ChromaDB, BM25, metadata schema, image storage
- **Features**: `use_mem0_public`, `max_conversation_turns` (20), `bm25_max_documents` (5000)

**Path isolation pattern:**
```python
def get_chroma_db_path(self, private: bool) -> str:
    return self.chroma_db_path_private if private else self.chroma_db_path_public
```

## 2. Caching Layer (`core/cache.py`)

Lazy-loaded global singletons prevent expensive model reloading. Mode-specific caches use `{"private": None, "public": None}` dictionaries.

**Cached resources:**
| Cache | Type | Purpose |
|-------|------|---------|
| `_cached_sbert_embeddings` | SentenceTransformerEmbeddings | Text embeddings (768d) |
| `_cached_spacy_nlp` | spacy.Language | NLP for metadata extraction |
| `_cached_bm25_retriever` | Dict[str, BM25Retriever] | Mode-specific keyword indices |
| `_cached_metadata_schema` | Dict[str, List[str]] | Mode-specific field names |
| `_cached_nomic_vision_embeddings` | NomicVisionEmbeddings | Local image embeddings (768d) |
| `_cached_cohere_image_embeddings` | CohereImageEmbeddings | Cloud image embeddings (1024d) |

**Custom vision embedding classes:**
- `NomicVisionEmbeddings`: Loads HuggingFace model, L2-normalizes CLS token, converts TIFF/BMP→RGB, outputs 768d vectors
- `CohereImageEmbeddings`: Calls Bedrock Cohere Embed v4, supports data URI format, outputs 1024d vectors

## 3. Bedrock Client (`core/bedrock_client.py`)

Multi-model-family abstraction with auto-detection from model ID prefix.

**Supported families:**
| Family | Prefix | Request Format | Parse Path |
|--------|--------|---------------|------------|
| Claude | `anthropic.claude` | messages array | `content[0].text` |
| Llama | `meta.llama` | prompt field | `generation` |
| Mistral | `mistral.` | prompt field | `outputs[0].text` |
| Titan | `amazon.titan-text` | inputText | `results[0].outputText` |
| Cohere | `cohere.command` | message field | `text` |

**Functions:**
- `detect_model_family(model_id)` — Auto-detect from prefix
- `build_text_request(model_id, prompt, ...)` — Create model-specific request body
- `parse_text_response(model_id, response_body)` — Extract text from model-specific response
- `invoke_text_model(prompt, ...)` — Unified text generation
- `invoke_text_model_streaming(prompt, ...)` — Streaming variant (Claude, Llama, Mistral)
- `invoke_vision_model(image_path, prompt, ...)` — Image+text input (Claude only)

## 4. Prompt Templates (`core/prompts.py`)

Separate templates for Ollama vs Bedrock, with/without metadata schema.

**Metadata extraction prompts:**
- With schema: Lists available fields, asks LLM to extract matching values
- Without schema: Generic entity extraction (Buyer > Seller > File Number > Policy Number > County > Address)
- Ollama variant uses `/no_think` directive for faster processing

**Generation prompt:**
```
You are a document assistant. Answer using ONLY the provided context.
Rules:
- Answer directly with facts. Never start with "Based on", "According to"...
- Match response length to question complexity
- If not in context: "I don't have that information..."

Previous Conversation: {history}
Context: {context}
Question: {question}
Answer: The
```
Key technique: Output primer "Answer: The" forces direct response, avoids preambles.

## 5. Text Extraction (`data_loading/text_extraction.py`)

Unified entry point: `extract_text_unified(file_path, private, use_vision_ocr)`.

**Routing logic:**
| Mode | File Type | Method |
|------|-----------|--------|
| Private | .txt | Direct read (UTF-8, fallback latin-1) |
| Private | .pdf, .docx, images | Docling → Markdown output |
| Public | .txt | Direct read |
| Public | .pdf, images | Bedrock Vision OCR |

**Docling** converts to Markdown preserving document structure (headings, lists, tables).

## 6. OCR Pipeline (`data_loading/ocr.py`)

Public-mode OCR using Bedrock Vision (Claude 3).

**Pipeline:**
1. PDF → PyMuPDF → JPEG images (200 DPI)
2. Image format normalization (TIFF/BMP → JPEG, RGBA→RGB)
3. Base64 encode → Bedrock Vision model
4. Extract text preserving structure

Vision prompt: "Extract all text from this document image. Return only the extracted text, preserving the original formatting and structure."

## 7. Chunking Strategies (`data_loading/chunking.py`)

Three strategies, selectable per upload:

| Strategy | Method | Speed | Quality |
|----------|--------|-------|---------|
| **Semantic** | LangChain SemanticChunker with embeddings | Slow | Best |
| **Spacy** | Sentence-based splitting (~3 chunks) | Medium | Good |
| **Recursive** | Character split (600 chars, 30 overlap) | Fast | Adequate |

Semantic chunking uses mode-specific embeddings (SBERT for private, Bedrock Titan for public) with percentile breakpoint threshold of 0.7.

## 8. Indexing & Storage (`data_loading/indexing.py`)

### Text Document Indexing
1. Create `Document` objects with chunk text + metadata
2. Add to ChromaDB (mode-specific collection, mode-specific embedding function)
3. Rebuild BM25 index from all ChromaDB documents
4. Auto-extract metadata schema (unique keys, filtered system keys)
5. Clear caches to force reload

### Image Indexing
1. Generate UUID doc_id
2. Copy image to storage path with UUID filename
3. Generate embedding (Nomic Vision 768d or Cohere 1024d)
4. Store in separate images ChromaDB collection (mode-specific)

### BM25 Index Management
- Built from ChromaDB corpus on each upload
- Skipped if corpus > 5000 documents (configurable)
- Pickled to disk, loaded lazily into cache
- k=15 candidates per search

## 9. Metadata Extraction (`retrieval/metadata_extraction.py`)

Extracts structured filters from natural language queries.

**Three-tier approach:**
1. **Bedrock LLM** (public mode): Schema-aware, best accuracy, temperature 0.3
2. **Ollama LLM** (private mode): Schema-aware when available
3. **Spacy NLP** (fallback): Regex for file numbers, NER for persons/locations

All return single key-value pair for simple ChromaDB filtering:
```python
{"File Number": "12345"}  # or {"Buyer": "John Smith"} etc.
```

## 10. Hybrid Retrieval (`retrieval/retriever.py`)

Main function: `retrival_rag(query, private, k, use_metadata_extraction)`.

### Ensemble Configuration

| Scenario | Retriever | Weight | k (internal) |
|----------|-----------|--------|-------------|
| With metadata filter | Chroma + metadata filter | 0.4 | 15 |
| With metadata filter | Chroma (unfiltered) | 0.3 | 15 |
| With metadata filter | BM25 | 0.3 | 15 |
| **No metadata filter** | **Chroma (unfiltered)** | **0.7** | **15** |
| No metadata filter | BM25 | 0.3 | 15 |

The unfiltered Chroma retriever is always present as a safety net when metadata filtering is too restrictive.

### Image Retrieval
Separate path: `retrieve_images(query, k, private)`.
- Embeds query using mode-specific vision embedding
- Searches mode-specific images ChromaDB collection
- Converts cosine distance to similarity: `1 - distance`

## 11. Generation (`generation/generator.py`)

Main function: `generation_rag(context, question, private, reset, session_id, max_tokens, use_image_context)`.

**Flow:**
1. Check reset → clear memory, return
2. If image context → route to vision generation
3. Else:
   - Get conversation history from memory
   - Build prompt with history + context + question
   - Generate via Ollama or Bedrock
   - Save to memory
   - Return answer

**Vision generation:**
- Private: Ollama qwen2.5vl (base64 image + chat API)
- Public: Bedrock Claude 3 (invoke_vision_model)

**Streaming:** `generation_rag_streaming` yields text chunks via SSE (public mode only).

## 12. Memory System (`generation/memory.py`)

### Architecture

```
memory_search(question, session_id, private)
  ├── Private: sliding_window_search() → last 5 exchanges
  └── Public: mem0_search() → semantic memory → fallback: sliding_window_search()

memory_add(question, answer, session_id, private)
  ├── Private: sliding_window_add()
  └── Public: mem0_add() + sliding_window_add() [always both]
```

### Sliding Window (Private)
- In-memory `deque` per session_id
- Max size: `config.max_conversation_turns` (default 20)
- Auto-evicts oldest entries
- Returns formatted string of last N exchanges

### Mem0 (Public)
- Lazy-initialized with Bedrock LLM + Titan embeddings + ChromaDB
- Semantic search: finds relevant memories by meaning, not just recency
- Dual storage: always writes to both Mem0 and sliding window (resilience)
- Falls back to sliding window if Mem0 initialization fails

## 13. PII Protection (`generation/pii.py`)

Microsoft Presidio integration for entity detection and reversible masking.

```python
mask_pii("John Smith's SSN is 123-45-6789")
# → "<PERSON_1>'s SSN is <US_SSN_2>"
# mapping: {"<PERSON_1>": "John Smith", "<US_SSN_2>": "123-45-6789"}

unmask_pii("<PERSON_1>'s SSN is <US_SSN_2>")
# → "John Smith's SSN is 123-45-6789"
```

**Status:** Implemented but not integrated into the main API flow. Ready for integration with a per-request flag.

## 14. API Layer (`api/main.py`)

FastAPI app with versioned endpoints (`/api/v1/...`).

**Key patterns:**
- `asyncio.to_thread()` wraps all blocking I/O
- In-memory session storage (production should use Redis)
- Global exception handler with full traceback logging
- CORS middleware (allow_origins=["*"])
- Lifespan manager for startup/shutdown

**File upload validation:** `.pdf, .docx, .txt, .tiff, .tif, .png, .jpg, .jpeg, .bmp, .webp`

## 15. Complete Data Flows

### Ingestion (Upload → Stored)
```
POST /api/v1/upload (multipart/form-data)
  ↓
Save file → Extract text (Docling/Bedrock) → Chunk (semantic/spacy/recursive)
  ↓
Create Documents with metadata → Embed → Store in ChromaDB
  ↓
Rebuild BM25 index → Extract metadata schema → Clear caches
```

### Query (Question → Answer)
```
POST /api/v1/chat
  ↓
Load metadata schema → Extract filter from query (Bedrock/Spacy)
  ↓
Build ensemble: Chroma+filter (0.4) + Chroma unfiltered (0.3) + BM25 (0.3)
  ↓
Search → Combine scores → Top k results
  ↓
Get conversation history (Mem0/sliding window)
  ↓
Build prompt (history + context + question + "Answer: The")
  ↓
Generate (Ollama/Bedrock) → Save to memory → Return answer + sources
```
