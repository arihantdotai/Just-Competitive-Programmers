---
description: Convert a manuscript chapter to LaTeX (which also yields the website page)
agent: scribe
---

Convert the manuscript at $ARGUMENTS into LaTeX for this book.

Rules:

1. Read `manuscript/STYLE.md`, `AGENTS.md`, the design specs (`design/FONTS.md`,
   `design/COLOR.md`, `design/CALLOUTS.md`, `design/FOOTNOTES.md`),
   `ARCHITECTURE.md`, and the target chapter first.
2. Convert **one chapter only**: the folder named in $ARGUMENTS
   (e.g. `manuscript/part-2-trees/03-segment-trees`), writing
   `latex/chapters/chNN-<slug>.tex` per the `AGENTS.md` §2 table.
3. Honor every `%%` mark. Answer nothing for the author that a mark or the
   manuscript already answers; ask via `%% ask` handling when something is
   genuinely ambiguous.
4. Verify the chapter compiles standalone before reporting.
5. Do not touch `manuscript/`, `design/`, `site/`, `scripts/`, the preamble, or
   `book.config.ts`.
6. End with the report described in `AGENTS.md` §3 step 6.
