# LocalRAG — Architecture Overview

## Executive Summary

LocalRAG (branded "DocuAssist" in the API) is a production-ready Retrieval-Augmented Generation system with **dual-mode operation**: fully local (Ollama) or cloud-powered (AWS Bedrock). It implements hybrid search (dense vector + sparse BM25), multimodal document processing (text + images), intelligent conversation memory, and PII protection. The system is deployed via Docker to AWS EC2 with GitHub Actions CI/CD.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LocalRAG Monorepo                         │
├────────────────────────┬────────────────────────────────────┤
│   Backend (FastAPI)    │   Frontend (Next.js 14)            │
│   Port 8000            │   Port 3000                        │
│   Python 3.11+         │   React 18 + TypeScript            │
├────────────────────────┴────────────────────────────────────┤
│                    Docker Compose                            │
│   backend + frontend + redis (optional)                      │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure                            │
│   EC2 (t3.small+) · ECR · EBS · GitHub Actions              │
└─────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Dual-Mode Isolation
Every component has a private (local) and public (cloud) path. These paths use **separate databases, separate indices, and different embedding dimensions** to prevent cross-contamination.

| Layer | Private Mode | Public Mode |
|-------|-------------|-------------|
| LLM | Ollama (qwen3:4b) | Bedrock (Claude 3 Haiku) |
| Text Embeddings | SBERT nomic-embed-text (768d) | Bedrock Titan v2 (1024d) |
| Image Embeddings | Nomic Vision (768d) | Cohere Embed v4 (1024d) |
| Vision/OCR | Docling (local) | Bedrock Claude 3 Vision |
| Memory | Sliding window (no LLM) | Mem0 + sliding window |
| Metadata Extraction | Spacy NLP | Bedrock LLM + Spacy fallback |
| Vector DB | ChromaDB (private collection) | ChromaDB (public collection) |
| BM25 Index | bm25_index_private.pkl | bm25_index_public.pkl |

### 2. Hybrid Retrieval
Combines dense (vector similarity) and sparse (BM25 keyword) search via LangChain's EnsembleRetriever with configurable weights.

### 3. Fallback Chains
Every critical path has a graceful fallback:
- Metadata extraction: Bedrock → Ollama → Spacy
- Memory: Mem0 → Sliding window
- Image formats: Direct load → JPEG conversion

### 4. Configuration-Driven
Pydantic Settings reads from `.env`, environment variables override defaults, model family auto-detection from model ID prefix.

## Module Map

```
backend/
├── api/
│   ├── main.py              # FastAPI app, routes, CORS, lifecycle
│   └── models.py            # Pydantic request/response schemas
├── core/
│   ├── config.py            # Pydantic Settings (env vars, paths, model IDs)
│   ├── cache.py             # Lazy-loaded model caches (SBERT, BM25, Spacy, Vision)
│   ├── prompts.py           # Prompt templates (Ollama vs Bedrock variants)
│   └── bedrock_client.py    # Multi-model-family Bedrock abstraction
├── data_loading/
│   ├── text_extraction.py   # Unified extraction (Docling / Bedrock Vision / direct)
│   ├── ocr.py               # PDF→image→vision OCR pipeline (Bedrock)
│   ├── chunking.py          # Semantic / Spacy / Recursive chunking
│   └── indexing.py          # ChromaDB + BM25 index management + image indexing
├── retrieval/
│   ├── retriever.py         # Hybrid search (EnsembleRetriever + image search)
│   └── metadata_extraction.py  # Query → metadata filter (Bedrock/Ollama/Spacy)
├── generation/
│   ├── generator.py         # LLM generation (text + vision, streaming)
│   ├── memory.py            # Mem0 + sliding window memory system
│   └── pii.py               # Presidio PII masking/unmasking
└── tests/
    ├── conftest.py          # Pytest fixtures
    └── test_api.py          # 7 endpoint tests

frontend/src/
├── app/
│   ├── layout.tsx           # Root layout (Inter font, metadata)
│   ├── page.tsx             # Main page (state: session, mode, tabs)
│   └── globals.css          # Custom scrollbar + markdown styles
├── components/
│   ├── ChatInterface.tsx    # Chat UI with streaming SSE support
│   ├── DataUpload.tsx       # Drag-drop upload with metadata + chunking config
│   └── Header.tsx           # Mode toggle (Public/Private) + branding
└── lib/
    ├── api.ts               # API client (REST + SSE streaming)
    └── utils.ts             # UUID generation
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health + dependency status |
| POST | `/api/v1/upload` | File upload (multipart/form-data) |
| POST | `/api/v1/load-data` | Load from path (JSON) |
| POST | `/api/v1/retrieve` | Hybrid search (vector + BM25) |
| POST | `/api/v1/generate` | LLM generation with context |
| POST | `/api/v1/chat` | Combined retrieve + generate |
| POST | `/api/v1/chat/stream` | Streaming chat (public mode only) |

## Data Flow Summary

### Ingestion Pipeline
```
File Upload → Text Extraction → Chunking → Embedding → ChromaDB + BM25 Index
                                                         ↓
                                                   Metadata Schema
                                                   (auto-extracted)
```

### Query Pipeline
```
User Query → Metadata Extraction → Hybrid Search → LLM Generation → Response
                (optional)          (Vector+BM25)    (with memory)
```

## Key Technologies

| Category | Technology | Version |
|----------|-----------|---------|
| Backend Framework | FastAPI | 0.115.0 |
| Frontend Framework | Next.js | 14.2.21 |
| Vector Database | ChromaDB | 0.5.7 |
| Keyword Search | BM25 (rank-bm25) | 0.2.2 |
| Document Processing | Docling | 2.66.0+ |
| PDF Processing | PyMuPDF | 1.24.0+ |
| NLP | Spacy | 3.8.0+ |
| PII Protection | Presidio | 2.2.355 |
| Memory | Mem0 | 0.1.0+ |
| Local LLM | Ollama | 3.x+ |
| Cloud LLM | AWS Bedrock | — |
| Containerization | Docker Compose | 5.0.1+ |
| CI/CD | GitHub Actions | — |

## Deployment Architecture

```
GitHub (push to master/main)
        ↓
GitHub Actions
  ├── Build backend Docker image
  ├── Build frontend Docker image (with API URL arg)
  ├── Push to AWS ECR
  └── SSH deploy to EC2
        ↓
AWS EC2 (t3.small+)
  ├── Backend container (port 8000)
  ├── Frontend container (port 3000)
  ├── EBS volume for /home/ec2-user/docuassist-data
  └── Security group: 22, 80, 443, 3000, 8000
```

## File & Storage Layout

```
./Chroma/
├── chroma_db_private/           # Private text vectors (768d)
├── chroma_db_public/            # Public text vectors (1024d)
├── chroma_db_images_private/    # Private image vectors (768d)
├── chroma_db_images_public/     # Public image vectors (1024d)
├── bm25_index_private.pkl       # Private BM25 sparse index
├── bm25_index_public.pkl        # Public BM25 sparse index
├── metadata_schema_private.json # Auto-extracted private metadata keys
├── metadata_schema_public.json  # Auto-extracted public metadata keys
└── mem0_db/                     # Mem0 semantic memory store
```

## Related Documents

- [02-backend-pipeline.md](./02-backend-pipeline.md) — Deep dive into ingestion, retrieval, and generation
- [03-frontend-analysis.md](./03-frontend-analysis.md) — Component architecture and streaming
- [04-dual-mode-and-infrastructure.md](./04-dual-mode-and-infrastructure.md) — Mode switching, Docker, CI/CD, AWS deployment
