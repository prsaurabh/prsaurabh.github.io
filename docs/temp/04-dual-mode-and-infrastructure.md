# LocalRAG — Dual-Mode Design & Infrastructure

## 1. Dual-Mode Architecture

The `private_mode: bool` parameter flows through every API call, selecting completely isolated paths.

### Embedding Dimension Consistency

The most critical design constraint: **all embeddings in one mode must use the same dimension**.

| Mode | Text Embeddings | Image Embeddings | Dimension |
|------|----------------|-------------------|-----------|
| Private | SBERT (nomic-embed-text) | Nomic Vision | **768d** |
| Public | Bedrock Titan v2 | Cohere Embed v4 | **1024d** |

Separate ChromaDB databases per mode prevent dimension mismatch errors.

### Database Separation

```
./Chroma/
├── chroma_db_private/           # Text vectors (768d, SBERT)
├── chroma_db_public/            # Text vectors (1024d, Titan)
├── chroma_db_images_private/    # Image vectors (768d, Nomic Vision)
├── chroma_db_images_public/     # Image vectors (1024d, Cohere)
├── bm25_index_private.pkl       # Sparse index (private corpus)
├── bm25_index_public.pkl        # Sparse index (public corpus)
├── metadata_schema_private.json # Field names (private)
├── metadata_schema_public.json  # Field names (public)
└── mem0_db/                     # Mem0 memory (public only)
```

### Component Selection Matrix

| Component | Private | Public |
|-----------|---------|--------|
| Text extraction | Docling (local) | Bedrock Vision |
| Chunking embeddings | SBERT cached | Bedrock Titan |
| Metadata extraction | Spacy NLP | Bedrock LLM → Spacy fallback |
| Vector retrieval | Chroma (SBERT) | Chroma (Titan) |
| BM25 retrieval | Private index | Public index |
| Generation | Ollama chat API | Bedrock invoke_model |
| Vision generation | Ollama qwen2.5vl | Bedrock Claude 3 |
| Conversation memory | Sliding window (deque) | Mem0 + sliding window |
| Streaming | Not supported | SSE via chat/stream |

### Cost Implications

| | Private | Public |
|-|---------|--------|
| Compute cost | $0 (local hardware) | Pay-per-token (Bedrock) |
| Storage cost | Local disk | Local disk + Bedrock API |
| Network | None | AWS API calls |
| Privacy | Complete | Data touches AWS |
| Quality | Limited by local model | Higher (Claude 3 Haiku) |
| Latency | Lower (no network) | Higher (API round-trips) |

## 2. Docker Orchestration

### Development (`docker-compose.yml`)

```yaml
services:
  backend:
    build: ./backend
    ports: [8000:8000]
    volumes:
      - ./backend/Data:/app/Data         # Documents
      - ./backend/Chroma:/app/Chroma     # Vector DBs
      - ./backend/models:/app/models     # Embedding models
    healthcheck:
      test: curl -f http://localhost:8000/health
      interval: 30s
      start_period: 40s

  frontend:
    build:
      context: ./frontend
      args: [NEXT_PUBLIC_API_URL=http://localhost:8000]
    ports: [3000:3000]
    depends_on:
      backend: {condition: service_healthy}

  redis:  # Optional
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes: [redis-data:/data]
```

### Production (`docker-compose.prod.yml`)

Key differences:
- Uses ECR images instead of local builds
- Named volumes with explicit host binding
- Extended healthcheck start period (120s)
- No Redis included (simplified)

### Dockerfile (Backend — Multi-Stage)

```dockerfile
# Stage 1: Builder
FROM python:3.11-slim as builder
RUN pip install --target=/install -r requirements.txt
RUN python -m spacy download en_core_web_sm

# Stage 2: Production
FROM python:3.11-slim
COPY --from=builder /install /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/lib/python3.11/site-packages/en_core_web_sm ...
COPY . /app
USER appuser  # Non-root
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 3. CI/CD Pipeline (`.github/workflows/deploy.yml`)

**Trigger:** Push to `master`/`main` + manual dispatch.

### Stage 1: Build & Push
1. Checkout code
2. Configure AWS credentials
3. Login to ECR
4. Build backend image → tag with `$GITHUB_SHA` + `latest`
5. Build frontend image → inject `NEXT_PUBLIC_API_URL=http://<EC2_HOST>:8000`
6. Push both to ECR

### Stage 2: Deploy to EC2
1. SSH to EC2 instance
2. ECR login
3. Pull latest images
4. Stop & remove old containers
5. Create Docker network
6. Run backend with host-mounted volume: `/home/ec2-user/docuassist-data:/app/backend/Data`
7. Wait 30s for backend startup
8. Run frontend container
9. Prune old images

### Required Secrets
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`
- `EC2_HOST`, `EC2_USERNAME`, `EC2_SSH_KEY`

## 4. AWS Architecture

### EC2 Configuration
- **Instance:** t3.small minimum (2GB RAM — t2.micro insufficient)
- **AMI:** Amazon Linux 2023
- **Storage:** 20 GB gp3 EBS
- **Elastic IP:** Static public IP

### Security Group
| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Admin IP | Management |
| HTTP | 80 | 0.0.0.0/0 | Web (future Nginx) |
| HTTPS | 443 | 0.0.0.0/0 | Secure web (future) |
| Custom TCP | 3000 | 0.0.0.0/0 | Frontend |
| Custom TCP | 8000 | 0.0.0.0/0 | Backend API |

### Cost (us-east-1)
| Resource | Free Tier | After Free Tier |
|----------|-----------|-----------------|
| t3.small | 750 hrs/month (12 mo) | ~$15/month |
| EBS 20GB | 30 GB/month (12 mo) | ~$2/month |
| Elastic IP | Free (if attached) | $0.005/hr unattached |
| Bedrock | Pay per token | Varies |

### Production Hardening Recommendations
1. **Nginx reverse proxy** with TLS termination (Let's Encrypt)
2. **API key authentication** (header-based)
3. **Request size limits** for file uploads
4. **CloudWatch** basic metrics (CPU, memory, disk)
5. **AWS Budget** alert ($5-10 threshold)
6. **IAM role** instead of access keys (when possible)

## 5. Environment Variables

### Critical (Public Mode)
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Application
```
APP_ENV=development|production
API_VERSION=v1
LOG_LEVEL=INFO
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Models
```
OLLAMA_GENERATION_MODEL=qwen3:4b
OLLAMA_VISION_MODEL=qwen2.5vl:3b
BEDROCK_GENERATION_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_EMBED_MODEL_ID=amazon.titan-embed-text-v2:0
SBERT_MODEL=nomic-ai/nomic-embed-text-v1.5
SPACY_MODEL=en_core_web_sm
```

### Features
```
USE_MEM0_PUBLIC=true
MAX_CONVERSATION_TURNS=20
BM25_MAX_DOCUMENTS=5000
```

## 6. Testing

### Test Suite (pytest)
```
tests/
├── conftest.py     # Fixtures: client, sample_file_path, api_version
└── test_api.py     # 7 tests
```

| Test | Mode | Description |
|------|------|-------------|
| test_health | Both | Health endpoint returns healthy |
| test_upload_private | Private | Upload creates chunks |
| test_retrieve_private | Private | Retrieve returns documents |
| test_chat_private | Private | Full RAG pipeline |
| test_upload_public | Public | Upload (skipped without AWS creds) |
| test_chat_public | Public | Full RAG (skipped without AWS creds) |
| test_generate_private | Private | Generation with provided context |

### Quick Test Script
```bash
python scripts/quick_test.py --mode private  # Local only
python scripts/quick_test.py --mode public   # AWS only
python scripts/quick_test.py --mode both     # All tests
```

## 7. Project Evolution

### Current (Phase 1 — Complete)
- Core RAG endpoints (upload, retrieve, generate, chat)
- Hybrid search (vector + BM25)
- Dual-mode operation
- Docker + CI/CD
- AWS EC2 deployment
- Mem0 memory integration
- Vision OCR benchmarking

### Planned (Phase 2)
- Redis session management
- API key authentication
- Rate limiting
- Structured logging (replace print statements)
- Prometheus metrics

### Planned (Phase 3)
- Async embeddings
- Celery background jobs
- Horizontal scaling
- Load balancing

### Future (Agentic RAG)
- LlamaIndex ReAct agents (`agentic-rag-react` repo)
- LangGraph orchestrated workflows (`agentic-rag-orchestrated` repo)
- MCP server for standardized tool access
- Multi-agent coordination

## 8. Vision Model Benchmarks

CPU-only testing (January 2026):

| Model | Size | Cold Start | Warm Query | Recommendation |
|-------|------|-----------|-----------|----------------|
| **qwen2.5vl:3b** | 3.2 GB | ~17 min | 4-15s | **Winner** |
| qwen3-vl:2b | 1.9 GB | ~25 min | 6-14.9s | Runner-up |
| qwen3-vl:4b | 3.1 GB | ~30 min | 24-39s | Not recommended |

qwen2.5vl:3b selected for default config: fastest cold start, fastest warm queries, concise answers.

## 9. Key Design Tradeoffs

| Decision | Tradeoff | Rationale |
|----------|----------|-----------|
| Mode-specific databases | More storage | Prevents dimension mismatch |
| BM25 limit (5000 docs) | Doesn't scale infinitely | Prevents OOM on large corpora |
| Sliding window (20 turns) | Limited history | Bounded memory growth |
| In-memory sessions | Single-instance only | Simplicity (Redis for Phase 2) |
| Ensemble weights (0.4/0.3/0.3) | Manual tuning | Balanced for title insurance domain |
| Output priming ("Answer: The") | Less flexible | Better response quality |
| Lazy model loading | First request slower | Faster startup |
| PII not integrated | Feature incomplete | Ready for integration via flag |
