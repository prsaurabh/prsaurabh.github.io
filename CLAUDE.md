# CLAUDE.md

## ACTIVE CORRECTIONS (remove when resolved)
- **Project/article titles must be 4-5 words** — not 1-2 word brand names, not full sentences. Think GitHub repo style but slightly longer.
- **Do NOT reuse the old name** when renaming something — that's the whole point of renaming.
- **Do NOT expand abbreviations in titles** — "RAG" is enough, never write "Retrieval-Augmented Generation" in a title.
- **Read the last 5+ messages before answering** — user has been correcting the same mistake repeatedly. Stop and re-read before responding.
- **Titles should capture what makes the project unique** — not generic descriptions. Focus on the differentiators (local/offline, privacy, multimodal, dual-mode).
- **Figma diagrams: NO black/very dark backgrounds** — use lighter dark backgrounds (e.g., r:0.14, g:0.16, b:0.2) so they're visible on the dark-themed website. Text must be clearly readable.
- **Each project page is independent** — do not assume the reader has seen other projects. Every page must make sense on its own without cross-references being required to understand the basics.
- **Never use `cat >` or shell heredoc to create files.** ALWAYS use the Write tool. If Write errors with "Read first," READ the file — that error means the file may already exist with content you'd destroy. Never route around the Write safety with Bash.
- **Commit AND push after finishing each unit of work — do not wait, do not ask.** User has explicitly opted in to auto-commit-and-push for this project. Batch only related changes; never leave finished work uncommitted or unpushed between turns.
- **NO em dashes (—) in user-facing copy.** Applies to website prose, LinkedIn headlines/summaries, resume content, article body text. Use periods or commas instead. Em dashes are a strong AI-generated tell that makes the content easy to flag as machine-written. CLAUDE.md and internal docs are exempt — this rule only applies to content the public will read.
- **Default to SHORT answers. Long answers only when the user explicitly asks for depth.** Most questions need 2-5 sentences, not paragraphs with headers and bullet lists. Do not pad with restatements, caveats, "on the other hand" asides, multi-section structures, or closing summaries. If the user asks a yes/no or comparison question, lead with the direct answer in the first sentence. Expand only if the question genuinely requires it or the user asked for detail. **Why:** repeated frustration — long answers bury the point, waste the user's time, and signal that I do not actually know what is load-bearing. **How to apply:** before sending any answer, ask "can I cut this in half without losing the point?" If yes, cut. If the user says "short answer" or "concise," that is a hard limit, not a suggestion. When in doubt, ship the short version and offer to expand.
- **ZERO external attribution in any public-facing content. No exceptions.** Never cite, name-drop, link, or credit external people, videos, articles, gists, tools, products, frameworks, standards, or companies by name in website prose, article body text, LinkedIn posts, resume, or any public copy. No "inspired by X," no "as Karpathy showed," no "borrowed from Claude Code's architecture," no "adopted by Cursor/Codex/Copilot," no "Cole Medin's video," no "agentskills.io open standard." When the user shares a YouTube video, blog post, gist, or paper, it is **research input for me only** — I read it, understand the idea, then present the idea in our own voice as our own synthesis. The reader must never know where it came from. **Why:** past blunder — I quietly slid in references like "Inspired by production patterns in Claude Code, the Agent SDK, and enterprise multi-agent frameworks (LangGraph, Semantic Kernel)" and "This is borrowed from Claude Code's architecture" into ai-native-platform.html. That is exactly the behavior being banned. Every idea on the site must read as original voice, full stop. **How to apply:** before writing any sentence that names an external entity, stop and rewrite it as a principle or pattern stated in our own words. If the idea cannot survive without the name attached, the idea is not yet ours — keep working on it until it is. Naming protocols/formats that are literally part of the tech stack being described (e.g., "HTTP," "JSON," "SQL") is fine; naming people, companies, products, branded frameworks, or branded standards is not. When in doubt, strip the name.

## Project
This is a personal portfolio website (GitHub Pages) for Saurabh Prasad, Senior Staff Software Engineer. Pure static HTML/CSS, no build system.

**The resume is NOT the source of truth.** The website is independent — it can go beyond, diverge from, or extend the resume in any direction. There is no single source of truth. Everything can be changed.

## Resume PDF workflow
Resume PDFs are **not** generated in this repo. The pipeline lives in a sibling repo:

- **Source + scripts:** `c:/Users/LENOVO/Repo/interview-prep/pdf-resume/`
  - `resume.html` + `generate-pdf.py` → `resume.pdf` (short/public version, no phone number)
  - `resume-full.html` + `generate-full-pdf.py` → `resume-full.pdf` (full version, includes phone + full contact)
- **Tool:** Playwright (Chromium headless) renders the HTML to PDF at Letter size.
- **Output sync:** each script copies its PDF to `C:\Users\LENOVO\OneDrive\portfolio-resumes\` automatically.
- **What's in this repo:** `assets/resume.pdf` is a committed copy of the public/short version (v1), linked from the homepage Resume button. The full version (v2) lives only on OneDrive and is linked from the DN page.

**If asked to update the resume PDF:** edit the HTML in `interview-prep/pdf-resume/`, run the relevant Python script, then copy the regenerated PDF into `assets/resume.pdf` here (for v1) or use the OneDrive share URL (for v2). Do NOT try to generate PDFs from this repo — there is no pipeline here and there never has been.

## Footer visit counters (stealth feature)
The homepage footer shows three small dot-separated numbers next to the `dn` link. They look like decoration; only Saurabh knows what they are. **Order is fixed left → right:**
1. **Total** (gray `#7d8590`) — every homepage hit
2. **LinkedIn** (blue `#0A66C2`) — hits with `?ref=linkedin`
3. **Resume** (amber `#f0883e`) — hits with `?ref=resume`

Backed by free public counter API at `https://abacus.jasoncameron.dev`, namespace `prsaurabh-portfolio-2026`, keys `total` / `linkedin` / `resume`. No signup, no auth. Logic in [js/counter.js](js/counter.js).

**To self-exclude visits:** visit `prsaurabh.github.io/#notrack` once per browser — sets `localStorage.notrack=1` and increments are skipped from then on. Re-enable by clearing localStorage.

**Public URLs to use when sharing:**
- LinkedIn posts: `https://prsaurabh.github.io/?ref=linkedin`
- Resume PDF link: `https://prsaurabh.github.io/?ref=resume`

## Guidelines
- All web searches must target **2026** — always include the current year in search queries to get up-to-date results.
- Do not add summary or technical skills sections to the experience page — keep it focused on company header + role summary + project cards.
- Do not give generic suggestions — stay specific to this project's scope.
- Do not highlight tags on the experience page — all tags use the base `.tag` class (no `.tag.highlight`).
- Tag order on experience page: languages first, then frameworks/systems.
- Metric boxes should have consistent size — do not stretch single boxes to fill the full row.
- The `drafts/` folder is for working content (gitignored). Keep a copy of source materials there.
- **Do not take action unless explicitly asked.** If the user asks a question or asks for an opinion, respond with information only. Do not edit files, run commands, or make changes unless the user says to do so.
