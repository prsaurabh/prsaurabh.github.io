# LocalRAG — Frontend Analysis

## Stack

- **Framework:** Next.js 14.2.21 (React 18, TypeScript)
- **Styling:** Tailwind CSS with custom primary color palette
- **Markdown:** react-markdown 9.0.1
- **State Management:** React hooks only (no Redux/Zustand)
- **Build:** Standalone output for Docker deployment

## Component Architecture

```
layout.tsx (Inter font, metadata)
  └── page.tsx (root state: sessionId, privateMode, activeTab)
        ├── Header.tsx (mode toggle, branding)
        ├── ChatInterface.tsx (chat UI, streaming)
        └── DataUpload.tsx (file upload, metadata, chunking)
```

## Root Page (`src/app/page.tsx`)

Client component managing three pieces of state:
- `sessionId` — UUID generated once per browser session
- `privateMode` — boolean toggle (Public = AWS Bedrock, Private = Ollama)
- `activeTab` — `'chat'` or `'upload'`

**Key behavior:** Re-keys `ChatInterface` when `privateMode` changes, which resets the chat state entirely. Tab navigation uses simple conditional rendering.

## Header (`src/components/Header.tsx`)

Pure presentation component. Animated toggle switch:
- **Public (left):** Green background, "AWS Bedrock" badge
- **Private (right):** Purple background, "Local/Ollama" badge
- Smooth CSS transform animation on toggle circle

Uses `role="switch"` and `aria-checked` for accessibility.

## Chat Interface (`src/components/ChatInterface.tsx`)

### State
```typescript
messages: Message[]          // {id, role, content, timestamp, processingTimeMs}
input: string               // Current user input
isLoading: boolean          // Disables input during generation
error: string | null        // Red error banner
useImageRetrieval: boolean  // Toggle for image embedding search
```

### Dual Response Handling

**Public mode (non-image)** → Streaming via SSE:
1. Create empty assistant message immediately
2. Call `sendChatMessageStreaming()` with `onChunk` callback
3. Each "data: " line parsed as JSON, text appended to message
4. Component re-renders on each chunk for live typing effect
5. "[DONE]" terminates stream

**Private mode or image retrieval** → Full response:
1. Call `sendChatMessage()`, wait for complete response
2. Display full answer with processing time badge

### UI Design
- **Empty state:** Large icon with "Talk to your documents"
- **User messages:** Right-aligned, blue (primary-600), white text
- **Assistant messages:** Left-aligned, gray-100, rendered via ReactMarkdown
- **Loading:** 3-dot bounce animation
- **Processing time:** Badge below assistant responses (e.g., "2.3s")
- **Auto-scroll:** useEffect scrolls to bottom on new messages

## Data Upload (`src/components/DataUpload.tsx`)

### Features
- **Drag & drop** with visual feedback (border color changes)
- **File validation:** PDF, DOCX, TXT, TIFF, PNG, JPG, JPEG, BMP, WebP
- **Chunking strategy selector:** Semantic / Spacy / Recursive
- **Image embedding toggle:** Skip OCR, embed image directly with vision models
- **Dynamic metadata fields:** Add/remove key-value pairs with UUIDs for React keys

### Upload Flow
1. Validate file type
2. Build metadata object from key-value fields (trimmed)
3. POST multipart/form-data to `/api/v1/upload`
4. Display success (job ID + processing time) or error
5. Clear form on success

## API Client (`src/lib/api.ts`)

Base URL configurable via `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`).

### Functions
| Function | Endpoint | Protocol |
|----------|----------|----------|
| `sendChatMessage()` | POST `/api/v1/chat` | JSON request/response |
| `sendChatMessageStreaming()` | POST `/api/v1/chat/stream` | SSE (ReadableStream) |
| `uploadDocument()` | POST `/api/v1/upload` | Multipart FormData |
| `checkHealth()` | GET `/health` | JSON response |

**Error handling:** Attempts JSON parse for error detail field, falls back to HTTP status.

**Streaming implementation:**
```typescript
const reader = response.body.getReader()
const decoder = new TextDecoder()
// Read chunks, split on "data: " prefix, parse JSON, call onChunk(data.text)
// "[DONE]" signals stream end
```

## Styling Approach

- **Tailwind CSS** for all component styling
- **Custom primary palette:** blue shades (primary-50 through primary-900)
- **globals.css additions:**
  - Custom webkit scrollbar (6px, gray)
  - `.markdown-content` styles for headings, paragraphs, lists, code blocks
  - CSS variables for light/dark mode (via `prefers-color-scheme`)

## Legacy Gradio UI (`ui/gradio_app.py`)

Single-user Python UI using Gradio 4.44.0. No file upload, no streaming, no image retrieval. Direct Python function calls to backend (no REST API). Fixed session ID "gradio_default".

| Feature | Gradio | Next.js |
|---------|--------|---------|
| Multi-user | No | Yes (UUID sessions) |
| File upload | No | Drag & drop + metadata |
| Streaming | No | SSE (public mode) |
| Image retrieval | No | Toggle option |
| Mode switching | Radio button | Animated toggle |
| Markdown | Basic | ReactMarkdown + custom CSS |

The Next.js frontend is the production UI; Gradio is kept for backwards compatibility.
