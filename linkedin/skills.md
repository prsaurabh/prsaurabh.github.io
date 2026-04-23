# LinkedIn Skills — Source of Truth

Working file for LinkedIn Skills section. Kept in sync with the resume (v3) and website Technical Skills.

**Last synced:** 2026-04-14
**LinkedIn cap**: ~50 visible skills, top 3 pinnable.

---

## Current LinkedIn skills (dump from 2026-04-14, 61 total)

### AI / Agentic
1. Generative AI
2. AI Agents
3. Retrieval-Augmented Generation (RAG)
4. Model Context Protocol (MCP)
5. LangGraph
6. LangChain
7. Agent SDK
8. Microsoft Agent framework
9. Claude Code
10. A2A
11. AG-UI
12. CrewAI
13. Context Engineering
14. AgentOps
15. Prompt Engineering
16. Large Language Models (LLM)
17. Vector Databases
18. Graph Databases
19. OpenCode
20. Gemini CLI

### Programming / Backend
21. C#
22. Python
23. Java
24. JavaScript
25. TypeScript
26. Node.js
27. .Net
28. ASP.NET
29. Spring Boot
30. FastAPI

### Data
31. SQL
32. NoSQL
33. MongoDB
34. Redis
35. Elasticsearch
36. Apache Kafka
37. Apache Flink
38. Apache Spark
39. PyTorch

### Frontend
40. Angular
41. React.js

### Cloud / Infra
42. AWS
43. Microsoft Azure
44. GCP
45. Dockers
46. Kubernetes
47. CI/CD
48. Infrastructure as code (IaC)
49. Git

### Architecture / Concepts
50. Distributed Systems
51. System Architecture
52. Software Architecture
53. Microservices
54. Event Driven Architecture
55. REST APIs
56. API Design
57. Platform Engineering
58. Domain-Driven Design (DDD)
59. Enterprise Architecture

### Leadership / Soft
60. Leadership
61. People Management

---

## Target state: sync to resume v3

### ADD (missing from LinkedIn, present on resume/website)

**AI — high priority, LinkedIn search gold:**
- AWS Bedrock
- Azure AI
- OpenAI
- Claude (as Anthropic API / platform)
- LlamaIndex
- Agentic RAG
- Multi-Agent Orchestration
- Agentic Coding
- A2UI
- Guardrails
- Evals
- LangSmith
- Braintrust
- Arize
- GraphRAG
- Neo4j
- Multimodal
- Fine-tuning
- Distillation

**Data:**
- Postgres (or PostgreSQL — LinkedIn uses full name)
- SQL Server
- Cassandra

**Frontend:**
- Next.js
- Streamlit

**Cloud observability:**
- Datadog
- Prometheus

### RENAME / FIX (LinkedIn is off the naming convention)

- **Dockers** → **Docker** (typo on LinkedIn)
- **Microsoft Agent framework** → **Semantic Kernel** (these are related but Semantic Kernel is the canonical name; MAF/Microsoft Agent Framework is adjacent). Keep BOTH if LinkedIn allows, else keep Semantic Kernel.
- **.Net** → **.NET** (capitalization)
- **React.js** → **React** (optional, LinkedIn is slightly better with full "React.js")
- **Apache Kafka / Apache Spark / Apache Flink** — keep as is (LinkedIn benefits from full names for exact-match search)

### REMOVE (stale, redundant, or too generic)

- **Generative AI** — too broad, covered by LLM + specific tools
- **Claude Code** — dropped from resume (it's a tool, not a framework); AgentOps + Agentic Coding cover it
- **OpenCode** — niche tool, low industry recognition, drop for a stronger skill
- **Gemini CLI** — niche, same reasoning
- **System Architecture** — duplicate of Software Architecture / Distributed Systems
- **Software Architecture** — keep OR drop, pick one between this and System Architecture
- **PyTorch** — user doesn't do classical ML. Drop unless targeting ML Engineer roles specifically.
- **Git** — industry assumed, signals nothing at Staff level
- **REST APIs** — redundant with API Design (which implies REST)
- **Event Driven Architecture** — keep; it's a distinct concept from Architecture & Design at LinkedIn's search level
- **Microsoft Azure** + **AWS** + **GCP** — generic cloud skills; keep them but add the specific AI platforms (AWS Bedrock, Azure AI) as separate skills for AI searches

### PIN AT TOP (3 slots)

Recommendation based on resume v3 + current target roles (Staff/Principal AI Engineer, AI Platform):

1. **AI Agents** (or Agentic RAG) — the identity signal
2. **LangGraph** — the top-recognized production framework in 2026 for senior AI engineers
3. **Distributed Systems** — the foundation credibility

Alternative pin 3: **Python** (if applying to more ML-leaning roles), **MCP** (if betting on the protocol wave).

---

## Naming convention rules for LinkedIn

- Prefer **full names** for search match: "Apache Kafka" not "Kafka", "React.js" not "React", "Large Language Models (LLM)" not "LLM".
- Protocol-level skills: both short and full form ("Model Context Protocol (MCP)") if LinkedIn allows.
- Tool brackets: LinkedIn doesn't do "Evals (Braintrust)" — list them separately.

## Change log

- **2026-04-14 — v1**: Initial LinkedIn skills dump captured. Identified 27 adds, 7 removes, 3 renames. Target sync to resume v3.
