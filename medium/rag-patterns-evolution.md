# I Built Three RAG Systems. Here's What Actually Works in Production.

*Traditional pipelines, ReAct agents, and orchestrated graphs — the real trade-offs nobody talks about.*

---

Retrieval-Augmented Generation is everywhere. Every tutorial shows you how to embed documents, search a vector database, and feed chunks to an LLM. Simple enough.

But here's the problem: **the "retrieve then generate" pipeline that works in a tutorial breaks the moment you point it at real users with messy, unpredictable questions.** And the fancy agentic architectures that promise to fix everything? They introduce a whole new category of problems.

Over the past year, I built three distinct RAG systems — each representing a different point on the complexity spectrum. Not toy demos. Production systems processing real documents, handling real queries, and failing in real ways. This article walks through the architecture, trade-offs, and the hard-won lessons from each.

The three patterns are not strictly better or worse than one another. Each fits different requirements. Understanding where each excels — and where it breaks down — is the key to choosing the right one.

---

## Pattern 1: Traditional RAG — The Straight Line

The traditional RAG pipeline is the foundation everything else builds on. The flow is linear and deterministic: take the user's query, convert it to an embedding vector, search a vector database for the most similar document chunks, pass those chunks as context to an LLM, and return the generated answer. No loops, no branching decisions, no autonomous reasoning. The developer controls the entire path.

![Pattern 1: Traditional RAG — linear pipeline from Query through Embed, Vector Search, Top-K Chunks, LLM to Answer](images/rag-pattern1-traditional.png)

I implemented this pattern in **VaultRAG**, a dual-mode system that runs either against AWS Bedrock (cloud mode) or entirely locally using Ollama (private mode). The project handles PDF, DOCX, TXT, and image files, extracting text through a unified pipeline before chunking and embedding into ChromaDB.

Building VaultRAG surfaced several practical decisions that documentation rarely covers:

- **PDF processing**: I initially used `pdf2image` with Poppler for OCR-based extraction, but Poppler's system-level dependency made deployment painful across different environments. Switching to **PyMuPDF** eliminated that dependency entirely — it handles PDF-to-image conversion natively in Python, and the resulting images feed directly into Bedrock's vision models for OCR.
- **Model API choice**: I chose **BedrockConverse** over the raw Bedrock API because the Converse API provides a unified interface across model families (Claude, Titan, Llama). Swapping models doesn't require rewriting the integration layer.
- **Embedding models matter more than you think**: In public mode, I use Amazon Titan Embeddings through Bedrock. In private mode, `nomic-embed-text` via Ollama. The dimensionality and similarity characteristics differ, so the ChromaDB collections are kept separate per mode. **Mixing embeddings from different models in the same vector space produces meaningless similarity scores.** This is a detail that trips up many RAG implementations.

### Strengths

- **Simplicity.** The entire pipeline is a straight line. You can trace any answer back through the retrieved chunks to the original document. If the answer is wrong, check if the right chunks were retrieved. If they were, the prompt needs work. If not, the chunking or embedding strategy needs adjustment.
- **Performance.** A single embedding call, a single vector search, and a single LLM call. Latency is predictable and low.
- **Transparency.** You can log every retrieved chunk and show it to the user as a citation. No hidden decisions or opaque reasoning steps.

### Weaknesses

- **No self-correction.** If the initial retrieval misses the relevant documents, the system has no way to try again with a reformulated query.
- **Single retrieval attempt.** Complex questions that span multiple topics often fail because a single embedding can't capture all the nuances.
- **No external sources.** The system can only answer from its indexed corpus. If the answer isn't in the documents, it either hallucinates or says it doesn't know.

### When to Use It

Traditional RAG is the right choice when you have a well-defined document corpus and users are asking straightforward questions. Internal knowledge bases, documentation search, customer support over product manuals — all excellent fits. **If you're building an MVP to validate whether RAG solves your problem at all, start here.**

---

## Pattern 2: ReAct Agent — The Autonomous Explorer

The ReAct (Reason-Act-Observe) pattern hands control to the LLM itself. Instead of following a fixed pipeline, the agent receives a query and autonomously decides what to do: which tool to call, what arguments to pass, whether to search again with different terms, or whether it has enough information to answer. This loop continues until the agent determines it can produce a final answer.

![Pattern 2: ReAct Agent — autonomous reasoning loop with tool selection](images/rag-pattern2-react.png)

I built this using **LlamaIndex's ReAct agent** framework, with three tools: a vector search tool backed by ChromaDB, a file search tool for direct file access, and a web search tool using Tavily's API. A question like *"What does the README say about installation?"* triggers the file search tool directly, while *"How does this project compare to LangChain's approach?"* invokes both vector search and web search.

The implementation also exposes the vector database through an **MCP (Model Context Protocol) server** — a standardized interface for LLM-tool communication. Think of it as a REST API designed specifically for AI agents. This interoperability is increasingly important as AI systems move from isolated applications to interconnected ecosystems.

**One lesson learned the hard way:** a ReAct agent, left unconstrained, will sometimes call every available tool "just to be thorough," even when the first retrieval already returned a perfect answer. I addressed this by carefully engineering the tool descriptions and system prompt to emphasize efficiency — only search when the current context is insufficient, prefer the most specific tool, and stop when confident.

### Strengths

- **Flexibility.** The agent adapts its strategy to the query. Simple questions get fast answers. Complex questions trigger multi-step research across multiple sources.
- **Multi-source reasoning.** The agent can combine information from your documents, raw files, and the open web in a single response.
- **Handles ambiguity.** Vague queries get explored from multiple angles rather than committed to a single retrieval strategy upfront.

### Weaknesses

- **Unpredictable execution.** You can't guarantee how many tool calls the agent will make, which tools it will choose, or how long a query will take. The same question asked twice might follow different paths.
- **Higher latency.** Each reasoning step involves an LLM call. Total latency can be 5-10x higher than traditional RAG.
- **Debugging difficulty.** When the agent produces a wrong answer, tracing the reasoning chain to find where it went astray is significantly harder.
- **Poor tool selection.** LLMs occasionally make suboptimal choices — searching the web when the answer is in the local corpus, or vice versa.

### When to Use It

ReAct agents shine when queries are complex, open-ended, or require information from multiple sources. Research assistants, exploratory analysis, and scenarios where you can't predict which data source will have the answer. **Use this when flexibility matters more than predictability.**

---

## Pattern 3: Orchestrated Graph — The Controlled Intelligence

The orchestrated graph takes a fundamentally different approach. Instead of letting the LLM decide the workflow, the developer defines it explicitly as a state machine. The LLM is called at specific nodes to make focused decisions — route this query, grade this document, check for hallucinations — but the overall flow is deterministic and controlled.

**You get the intelligence of LLM-based decisions combined with the predictability of developer-defined logic.**

![Pattern 3: Orchestrated Graph — developer-defined state machine with Router, Grader, Generator, Hallucination Check, and Rewriter](images/rag-pattern3-orchestrated.png)

I implemented this using **LangGraph**, which provides a clean abstraction for building stateful, multi-step workflows as directed graphs. Each node receives the current state, performs its work, and returns an updated state. Edges between nodes can be conditional, allowing the graph to branch based on LLM decisions or programmatic logic.

Here's how the flow works:

1. A **router** examines the query and decides: vector store or web search?
2. A **retriever** fetches relevant chunks from ChromaDB.
3. A **grader** evaluates each document for relevance — a focused LLM call with a binary output (relevant or not).
4. If enough documents pass grading, a **generator** produces the answer.
5. A **hallucination checker** evaluates whether the response is actually grounded in the retrieved documents.
6. If the grader rejects too many documents, a **rewriter** reformulates the query, and the retrieval loop repeats.

This architecture embeds quality controls directly into the pipeline. The grader prevents irrelevant context from reaching the generator. The hallucination checker catches answers that sound plausible but aren't supported by source material. The rewriter provides the self-correction that traditional RAG lacks.

**A practical detail worth noting:** the grader and hallucination checker use smaller, faster prompts with constrained outputs (just "yes" or "no" with brief justification). They don't need full reasoning capability. This keeps per-node latency manageable even though total LLM calls are higher.

### Strengths

- **Predictable flow.** Every query follows a path you defined. You can draw the graph on a whiteboard and trace any query through it.
- **Built-in quality checks.** Relevance grading, hallucination detection, and query rewriting are structural components, not afterthoughts.
- **Self-correction within bounds.** Failed retrieval triggers automatic reformulation — with developer-controlled retry limits, so it can't loop forever.
- **Developer control.** You decide the routing logic, grading criteria, retry limits, and fallback strategies.

### Weaknesses

- **Implementation complexity.** Each node needs its own prompt, error handling, and testing.
- **Less flexible.** Queries that don't fit anticipated paths may get forced through inappropriate branches.
- **Multiple LLM calls.** A single query may trigger 4-6 LLM calls. Cost and latency are higher than traditional RAG, though more predictable than a ReAct agent.

### When to Use It

The orchestrated graph is the right choice for production systems where answer quality and reliability outweigh flexibility. **Regulated industries (healthcare, finance, legal) that need auditable reasoning paths benefit enormously from the structured flow.** Any application where a wrong answer carries significant cost should consider this pattern.

---

## So Which One Should You Actually Pick?

The three patterns form a spectrum from simplicity to sophistication. But sophistication is not always better.

**Start with Traditional RAG** when you're validating an idea or working with a focused document corpus. Most RAG applications should start here and only move to more complex patterns when specific limitations surface.

**Move to a ReAct Agent** when queries regularly require combining information from multiple sources, or when the nature of questions is so varied that you can't anticipate the right retrieval strategy. Accept the trade-off: you gain flexibility but lose predictability.

**Choose an Orchestrated Graph** when you need production-grade reliability with built-in quality guarantees. You trade flexibility for control, and in most production scenarios, that's the right trade.

One insight from building all three: **most production systems benefit from the orchestrated approach.** The ReAct agent is intellectually elegant and impressive in demos, but its unpredictability makes it difficult to operate at scale. When your on-call engineer gets paged at 2 AM because answer quality dropped, they need to trace the exact path a query took. The orchestrated graph gives you that. The ReAct agent doesn't.

That said, hybrid approaches are increasingly common. You might use an orchestrated graph as the primary pipeline but delegate specific complex sub-tasks to a ReAct agent within a single node. The patterns are composable, not mutually exclusive.

---

## What's Coming Next

RAG continues to evolve in several directions:

- **Multi-agent systems** are the natural extension — multiple specialized agents collaborating on a query, each with its own tools and expertise. Frameworks like LangGraph and CrewAI are making this practical, though coordination complexity grows quickly.
- **Tool use standardization** through the **Model Context Protocol (MCP)** is emerging as a common interface for connecting LLMs to external tools. Instead of every application implementing its own integration, MCP provides a shared protocol — similar to how REST standardized web APIs.
- **Evaluation frameworks** remain the biggest gap. We have good tools for building RAG systems but limited tools for systematically measuring their quality. Projects like RAGAS and DeepEval are making progress, but evaluation is still the weakest link.

The fundamental trajectory is clear: RAG is moving from static pipelines to dynamic, self-improving systems that combine retrieval, reasoning, and tool use in increasingly sophisticated ways. **Understanding the trade-offs at each stage — simplicity versus flexibility, predictability versus autonomy, speed versus quality — is what separates production-ready systems from impressive prototypes.**

---

*If this helped you think about your own RAG architecture, follow me for more on building AI systems in production. I write about the engineering decisions that don't make it into tutorials.*

---

**Tags:** `RAG` `LLM` `AI` `Software Engineering` `LangGraph` `Machine Learning`

---

### About the Author

**Saurabh Prasad** is a Senior Staff Software Engineer based in New York, specializing in AI-native enterprise systems. He has spent the past year building production RAG architectures, agent frameworks, and MCP-based integrations at scale — working across the full spectrum from local/offline AI to cloud-native multi-agent systems. He writes about the engineering trade-offs that surface only after you've shipped to production.

[LinkedIn](https://www.linkedin.com/in/saurabhpd) | [GitHub](https://github.com/prsaurabh) | [Portfolio](https://prsaurabh.github.io)
