# article2video — Build Spec

Turn an article page from my website into a narrated "read-along" YouTube video: the actual page is shown in a browser, each sentence is highlighted and auto-scrolled while a TTS voice reads it, the session is recorded, audio is muxed in, and the result is uploaded to YouTube (Unlisted) and appended to my "Study Queue" playlist via my existing YouTube MCP.

**Target machine:** macOS (Apple Silicon MacBook Air). Node.js 20+, ffmpeg required.

**Invocation goal (end state):**
```
article2video <url> [--voice <name>] [--skip-upload] [--dry-run]
```
One command, zero manual steps after kickoff. Also expose as a Claude Code slash command `/article2video <url>`.

---

## Pipeline Stages

### 1. Fetch & Parse
- Load the page (Playwright, since the site may be local/private — reuse an authenticated context if needed).
- Extract the readable article content: title (H1), main body container selector, sentences.
- Sentence-split the body text (use a proper splitter, e.g. `sbd` or Intl.Segmenter — handle abbreviations, code blocks, list items).
- **Skip non-narratable elements:** code blocks, image captions can be announced briefly ("see the diagram") rather than read verbatim. Make this configurable.
- Output: ordered list of `{ id, selector/textOffset, text }` segments.

### 2. TTS Generation
- Default provider: **edge-tts** (`@andresaya/edge-tts` or similar — free, Microsoft neural voices; fine for personal use; note it's unofficial).
- Optional provider: ElevenLabs (env var `ELEVENLABS_API_KEY`).
- Generate one audio clip per sentence/segment; record each clip's exact duration.
- Concatenate into one narration track later, OR keep per-clip and schedule at offsets (preferred — see stage 4).
- Insert small silence gaps (~350ms) between sentences, longer (~700ms) between paragraphs/headings.
- Cache TTS output per sentence hash so re-runs are cheap.

### 3. Highlight & Record (Playwright)
- Launch Chromium, viewport **1920x1080**, load the article page.
- Inject a small JS controller that:
  - Wraps each target sentence in a `<mark>`-style span (soft yellow background, subtle transition) — inject CSS, don't rely on site styles.
  - Highlights exactly one sentence at a time; removes previous highlight.
  - Smooth-scrolls to keep the current sentence in the upper third of the viewport.
  - Optionally bumps base font size slightly for TV readability (configurable, e.g. 115%).
- Drive timing from the TTS durations: highlight sentence N, wait `duration(N) + gap`, advance.
- Record video of the session. **Important: browser recording captures no audio — this is expected.** Options in order of preference:
  1. `playwright-recast` or `playwright-recorder-plus` (handles recording + audio scheduling + ffmpeg muxing — evaluate first, may eliminate stage 4 glue code)
  2. Playwright's built-in `recordVideo` (WebM, trims/converts in stage 4)
- Add a 2s title card at start (article title on clean background) and 1s tail.

### 4. Mux (ffmpeg)
- If not handled by the library in stage 3: place each TTS clip at its known wall-clock offset (or concat clips+silences into one track) and mux onto the video.
- Trim leading blank frames (Playwright recordings often start with ~1s white).
- Output: **H.264 MP4, 1080p, AAC audio** (YouTube-friendly).
- Verify A/V sync: total audio timeline must equal video timeline; log drift if > 200ms.

### 5. Upload & Playlist (YouTube MCP)
- Upload via my existing YouTube MCP / YouTube Data API OAuth (confirm token has `youtube.upload` scope — one-time check).
- Visibility: **Unlisted** (plays cleanly in TV apps from a playlist, stays off public channel).
- Title: article H1. Description: first paragraph + source URL + generation date.
- Append to playlist **"Study Queue"** (create if missing).
- Note quota: uploads cost ~1600 units against the 10k/day default — cap at ~6/day.
- `--skip-upload` flag: stop after MP4 for local review.

---

## Project Structure (suggested)
```
article2video/
  src/
    fetch.ts        # page load + article extraction + sentence split
    tts.ts          # provider abstraction (edge-tts | elevenlabs), caching
    record.ts       # playwright session, highlight injection, recording
    mux.ts          # ffmpeg assembly (skip if recast handles it)
    upload.ts       # YouTube upload + playlist append
    index.ts        # CLI orchestrator
  assets/highlight.css
  cache/tts/        # sentence-hash keyed audio clips
  out/              # final mp4s
  .env.example      # ELEVENLABS_API_KEY, YT credentials path, SITE_AUTH if needed
```

## Config (config.json or flags)
- `voice` (default: an en-US neural voice, pick a natural one)
- `readCodeBlocks`: false (announce instead)
- `fontScale`: 1.15
- `sentenceGapMs`: 350, `paragraphGapMs`: 700
- `maxDurationMin`: 15 → if estimated narration exceeds this, warn and suggest splitting the article into parts (Part 1/2 titles)
- `playlist`: "Study Queue"

## Build Order / Milestones
1. **M1:** fetch + sentence split working on one real article URL from my site; print segments.
2. **M2:** TTS per sentence with durations, cached; play concatenated audio locally to sanity-check voice.
3. **M3:** Playwright highlight walkthrough (no recording) — watch it live, tune scroll/highlight feel.
4. **M4:** recording + mux → local MP4. **Stop here for my review before building upload.**
5. **M5:** upload + playlist via YouTube MCP; wire `--skip-upload` and slash command.

## Acceptance Criteria
- One command takes a URL → Unlisted YouTube video in "Study Queue" with zero manual steps.
- Highlight is in sync with narration (no visible drift by end of a 10-min video).
- Images/diagrams on the page are visible in frame when their surrounding text is read.
- Re-running on the same article reuses cached TTS.
- Fails loudly with a clear message on: unreachable URL, TTS failure, quota exceeded.

## Non-Goals (v1)
- No avatars, stock footage, or generated visuals — the article page IS the visual.
- No editing UI. No multi-language. No shorts/clips.
