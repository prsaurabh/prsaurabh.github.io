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

## Project
This is a personal portfolio website (GitHub Pages) for Saurabh Prasad, Senior Staff Software Engineer. Pure static HTML/CSS, no build system.

**The resume is NOT the source of truth.** The website is independent — it can go beyond, diverge from, or extend the resume in any direction. There is no single source of truth. Everything can be changed.

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
