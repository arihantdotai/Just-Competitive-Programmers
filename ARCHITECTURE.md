# ARCHITECTURE.md — Book Pipeline Architecture

This document is the plan of record for how this repo is organized and how a rough
manuscript becomes a print-ready PDF and an interactive website.

Status: **plan, not yet implemented.** Where the current pipeline already provides a
piece (EPUB, fonts, design tokens), this document says what to keep and what to retire.

---

## 1. What we are building

One repo, two products, one source of truth:

1. **A PDF book** — typeset in *pure LaTeX*, using the exact typography of
   `design/DESIGN.md` (Minion Pro body, Barlow Condensed headings, JetBrains Mono code).
2. **A book website** — not a normal website. A reading environment with:
   - a **left sidebar**: book name on top, then the chapter / part / subsection tree;
   - a **one-column main content area** on the right (never two columns on screen);
   - **dark mode**;
   - **artifacts**: interactive visual components (animated data structures, step
     controls, explorables) embedded inside chapters for visual intuition.

Both products are generated from the **same LaTeX source**. The text of the site is
converted from LaTeX (via LaTeXML); artifacts are LaTeX-declared placeholders that the
site runtime hydrates with real JavaScript components.

The human writes rough material. The AI agent converts it. Machines do everything else.

---

## 2. The three layers

```
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — HUMAN INPUT         (source of truth for content)        │
│                                                                     │
│  manuscript/          rough markdown, notes, sketches, PNGs         │
│    <part>/<chapter>/  index.md + figures/ + anything                │
│                                                                     │
│  Written by: human. Never machine-edited.                           │
├─────────────────────────────────────────────────────────────────────┤
│  LAYER 2 — AI CONVERSION       (one-time per chapter, idempotent)   │
│                                                                     │
│  manuscript ──▶ AI agent ──▶ latex/chapters/chNN-slug.tex            │
│                                                                     │
│  Written by: AI agent, per the conversion contract (§5).            │
├────────────────────────────────────────────────────────────────-----┤
│  LAYER 3 — DETERMINISTIC BUILDS (reproducible, no AI involved)      │
│                                                                     │
│  latex/ ── latexmk (LuaLaTeX) ──▶ dist/book.pdf                     │
│  latex/ ── LaTeXML + Vite     ──▶ dist/site/                        │
│  site HTML ── existing epub step ─▶ dist/book.epub                  │
│                                                                     │
│  Written by: build scripts. Byte-for-byte repeatable.               │
└─────────────────────────────────────────────────────────────────────┘
```

The key architectural rule: **AI is used only between Layer 1 and Layer 2.** Everything
downstream of `latex/` is deterministic tooling, so a rebuilt PDF or site never changes
because a model felt like it.

---

## 3. Directory layout

```text
JustCompetitiveProgrammers/
├── manuscript/                  # LAYER 1 — the inbox (already exists)
│   ├── _TEMPLATE/               #   starter chapter (ignored by builds)
│   ├── _inbox/                  #   unsorted: scratch notes, loose PNGs, screenshots
│   ├── 00-frontmatter/          #   title, copyright, preface
│   └── part-N-name/
│       └── NN-slug/
│           ├── index.md         #   the rough manuscript (any quality)
│           ├── figures/         #   PNGs, SVGs, scanned sketches, photos
│           └── anything-else/   #   raw material the agent may consult
│
├── latex/                       # LAYER 2 output — chapter-wise LaTeX
│   ├── main.tex                 #   book skeleton: \input preamble + chapters
│   ├── preamble.tex             #   fonts, geometry, macros, environments, TikZ setup
│   ├── macros/artifacts.sty     #   the \begin{artifact} environment (§7)
│   └── chapters/
│       ├── ch00-title.tex       #   one .tex per manuscript chapter
│       ├── ch01-preface.tex
│       └── ch03-segment-trees.tex
│
├── site/                        # WEBSITE source (new)
│   ├── shell/                   #   page template, sidebar markup, styles refs
│   ├── runtime/                 #   TS entry: sidebar builder, dark mode, artifact loader
│   ├── artifacts/               #   one TS module per artifact, registered by id
│   │   ├── registry.ts          #   maps artifact id → component
│   │   └── prefix-sum-grid.ts   #   example artifact component
│   └── styles/                  #   reuses design/tokens.css, design/book.css
│
├── design/                      # existing design system (kept)
│   ├── DESIGN.md                #   typography/color/layout spec — still authoritative
│   ├── tokens.css               #   palette + fonts; gains dark-mode variable set (§8)
│   ├── book.css                 #   screen styles (sidebar layout lives here or site/styles)
│   ├── print.css                #   kept for the legacy EPUB step only
│   ├── epub.css                 #   kept for EPUB
│   └── fonts/                   #   OTF/WOFF2 — consumed by BOTH LuaLaTeX and the site
│
├── scripts/
│   ├── build.ts                 #   orchestrator: --pdf / --site / --epub / --all
│   ├── lib/
│   │   ├── latex-pdf.ts         #   latexmk -lualatex runner (§6)
│   │   ├── latexml.ts           #   LaTeXML wrapper: latex/ → HTML fragments (§7)
│   │   ├── site.ts              #   assembles sidebar shell + fragments → dist/site
│   │   ├── epub.ts              #   existing EPUB step, repointed at site HTML
│   │   └── check.ts             #   lint: labels, links, artifact ids, figure paths
│   └── (legacy markdown lib/ modules stay until EPUB is repointed)
│
├── dist/                        # build output (gitignored)
│   ├── book.pdf
│   ├── book.epub
│   └── site/                    #   the deployable website
│
├── AGENTS.md                    # instructions for the AI conversion agent (§5)
├── ARCHITECTURE.md              # this document
├── book.config.ts               # metadata stays here; gains latex/site sections
└── README.md
```

---

## 4. Layer 1 — manuscripts (the inbox)

`manuscript/` is for humans and remains the **source of truth for content**.

- Chapter folders keep the existing convention: `manuscript/part-N-name/NN-slug/index.md`
  with YAML frontmatter (`title`, `slug`, `part`, `order`, `number`, `kind`, `status`, …).
- Any roughness is allowed: bullet fragments, duplicate notes, "TODO: explain this
  better", voice-memo transcripts pasted as text. The agent's job is to turn it into
  polished prose, not to transcribe it literally.
- Images of any kind (PNG screenshots, photos of whiteboards, SVGs) go in the chapter's
  `figures/`. Unsorted material goes to `manuscript/_inbox/` and the agent files it.
- `status` in frontmatter controls agent behavior:
  - `draft` / `review` → agent may (re)generate the chapter's `.tex`;
  - `final` → agent refuses to overwrite `latex/chapters/chNN-slug.tex` unless
    explicitly told to regenerate, so late LaTeX-side fixes aren't clobbered.

Hand-editing `latex/` is allowed once a chapter is `final` (e.g. to nudge a line
break), but the fix that matters must eventually be made in the manuscript too.

---

## 5. Layer 2 — the AI conversion agent

The agent runs inside this repo (OpenCode) with instructions in `AGENTS.md` plus a
conversion contract. One invocation converts **one chapter at a time**:

```
Convert manuscript/part-2-trees/03-segment-trees/index.md to
latex/chapters/ch03-segment-trees.tex
```

### 5.1 The conversion contract (encoded in AGENTS.md)

Every manuscript construct has exactly one LaTeX target:

| Manuscript construct | LaTeX target |
| --- | --- |
| Frontmatter `title` / `number` | `\chapter[running title]{Title}\label{chap:slug}` |
| Frontmatter `summary` | `\chaptersummary{...}` (custom macro) |
| `##` / `###` headings | `\section{}` / `\subsection{}` (auto-numbered; writer never types numbers) |
| `$…$` / `$$…$$` math | same, verbatim (macros from `book.config.ts` live in the preamble) |
| `::: definition`, `::: theorem`, `::: example`, `::: note`, `::: tip`, `::: warning`, `::: complexity` | matching custom environments (`\begin{definition}[Prefix sums] … \end{definition}`) |
| ```tikz fences | native TikZ, verbatim (packages already in `book.config.ts`) |
| `![alt](figures/x.png "caption")` | `\fig{figures/x.png}{caption}` (custom figure macro, chapter.n numbering) |
| `[text](chapter:slug)` | `\chapref{slug}` → `\hyperref[chap:slug]{text}` |
| Footnotes `[^x]` | `\footnote{}` |
| Code fences | `listings`/`fvextra` with JetBrains Mono, ≥42-char lines trigger the wide-span style |
| `::: wide` blocks | `\begin{widestuff*} … \end{widestuff*}` (full-measure float) |
| **Artifact declaration** (new, §7) | `\begin{artifact}{id}{caption} fallback text \end{artifact}` |
| **Pointable elements** (§9) | nothing to write — display equations, figures, notes, and artifacts receive stable ids automatically; an explicit `\label{my-name}` overrides the generated id |

The agent must not invent new macros; anything missing becomes a proposal appended to
the preamble discussion, and the preamble is updated once, by a human-approved edit.

### 5.2 Agent operating rules

- **Idempotent, chapter-scoped.** Writes only `latex/chapters/chNN-slug.tex` for the
  chapter it was asked to convert. Never touches `main.tex`, the preamble, or other
  chapters' files (except adding one `\input` line when a *new* chapter is created).
- **No content invention.** It may smooth grammar and expand "rough" into prose, but
  technical claims, code, and numbers come from the manuscript or its `figures/`. If a
  passage is ambiguous, it asks or marks it `\todo{clarify: …}`.
- **Figures are referenced, never moved.** It copies nothing; the LaTeX figure macro
  resolves paths back into `manuscript/**/figures/` via `\graphicspath`.
- **Every conversion is verified.** After writing the `.tex`, the agent compiles that
  chapter standalone (`latexmk -lualatex` on a scratch wrapper) and fixes its own
  compile errors before declaring done.
- **Style authority** is `design/DESIGN.md` + this file. Where DESIGN.md describes
  print layout (two-column rules etc.), the agent ignores the *layout* parts — layout
  belongs to the preamble/classes, not to chapter files. Chapter files are layout-free.

---

## 6. Layer 3a — LaTeX → PDF

- Engine: **LuaLaTeX** (`latexmk -lualatex -interaction=nonstopmode`), chosen so the
  actual font files in `design/fonts/` load directly via `fontspec`.
- `preamble.tex` reproduces `design/DESIGN.md`:
  - `fontspec`: Minion Pro (body, from `design/fonts/minion-pro/*.otf`),
    Barlow Condensed (display, via `\setmainfont`-style family), JetBrains Mono
    (`\setmonofont`);
  - `microtype` for justified, tightly hyphenated paragraphs;
  - custom environments for the seven note types (run-in bold label, italic body for
    theorem/definition — no boxes, per DESIGN.md);
  - per-chapter numbering of sections, display equations, figures (chapter.n), and
    footnotes;
  - print geometry and running heads from `book.config.ts` (`page.size`, margins).
- Output: `dist/book.pdf`, post-processed with the existing `pdf-lib` MediaBox
  normalization so trim size stays exactly 7 × 9.1875 in.
- `book.config.ts` gains a `latex` section (engine, packages, compile settings) so the
  config remains the single source of configuration truth.

EPUB continues from the existing pipeline, but its HTML input is repointed to the
LaTeXML site content (§7), so `book.epub` and the site never diverge either.

---

## 7. Artifacts — the interaction layer

An **artifact** is an interactive visual (animated array, draggable graph, step-through
simulation) that exists on the website and has a static fallback in print.

### 7.1 Declaration (in LaTeX, inside a chapter)

```latex
\begin{artifact}{prefix-sum-grid}{Prefix sums built step by step.}
  % Static fallback: shown in the PDF, hidden on the site.
  \includegraphics{figures/prefix-sum-static}
\end{artifact}
```

- First `{}`: artifact **id** — must match a registered component in
  `site/artifacts/registry.ts`.
- Second `{}`: caption. The artifact is treated like a figure for numbering
  (`Artifact 3.1`).

### 7.2 Rendering on each output

- **PDF:** the fallback image is typeset as a normal numbered figure, followed by an
  **"Interactive companion" strip**: one line noting that an interactive version of
  this artifact exists on the website, the pinpoint URL in small monospace text, and a
  **QR code** encoding that exact deep link (§9). Nothing interactive is lost to
  readers of paper — the artifact is a bonus, not a dependency — and the reader who
  wants it is one camera-point away from the live version. If the PDF is opened
  digitally, the URL text is also a `hyperref` link.
- **Website (LaTeXML):** the environment converts to
  `<figure class="artifact" data-artifact="prefix-sum-grid" data-caption="…">` with the
  fallback image inside as no-JS content. The site runtime replaces it with the live
  component (progressive enhancement), and the artifact is a pinpoint target: it
  receives the stable id `chNN-art-prefix-sum-grid` and the hover-pin affordance (§9).

### 7.3 QR codes in the PDF

- Generated **in LaTeX** with the `qrcode` package — part of the deterministic build,
  no post-processing needed.
- The URL encoded is the canonical pinpoint form
  `<site.baseUrl>/<chapter-slug>/?p=<artifact-id>` (§9.1). The base URL lives in
  `book.config.ts` (`site.baseUrl`) so it can be changed once and every QR in the book
  regenerates with the next PDF build.
- QRs are emitted for artifacts by default; per-element QRs for figures, equations, and
  notes are opt-in (`\figqr{…}` etc.) to keep pages clean.
- QR fill color follows the ink/paper tokens so codes stay scannable in print.

### 7.4 Component contract (`site/artifacts/*`)

Each artifact is a TypeScript module:

```ts
export default {
  id: "prefix-sum-grid",
  mount(el: HTMLElement, ctx: ArtifactContext): void;
};
```

- `ctx` provides theme info (the component **must** respond to dark-mode changes —
  artifacts read CSS variables, never hard-coded colors) and a dispose hook.
- Components are bundled by Vite and lazy-loaded per artifact id, so chapters without
  artifacts ship no artifact JavaScript.
- `scripts/lib/check.ts` fails the build if a LaTeX artifact id has no registered
  component or vice versa (this is how artifact/registry drift is caught).

---

## 8. The website

### 8.1 Structure

- **Multi-page static site** (decided): one HTML page per chapter under
  `dist/site/<slug>/`, plus `index.html` (cover + TOC).
- Shared **sidebar shell**: book name on top (links home), then the part/chapter/
  subsection tree built from the LaTeX sectioning. Current chapter highlighted;
  subsection entries scroll-link to headings on the page.
- **One column, always.** Content measure follows DESIGN.md (68 characters). No
  two-column behavior on any screen size — the wide-material machinery of the old
  print design does not apply to the site.
- Site pages are plain, crawlable HTML; JS only adds dark mode, artifact hydration,
  and small niceties (scroll-spy in the sidebar). The site is fully readable with JS
  disabled.

### 8.2 Dark mode

- `design/tokens.css` gains a second variable set: `:root[data-theme="dark"]`.
- Toggle in the sidebar footer; persisted in `localStorage`; defaults to the OS
  `prefers-color-scheme`. A tiny inline script sets the attribute before first paint
  to avoid a flash.
- Typography sizes/leading stay identical between themes (DESIGN.md hierarchy is
  theme-independent).
- **Figures stay legible**: SVG diagrams keep their literal palette (per DESIGN.md) and
  sit on a light "plate" surface in dark mode rather than being inverted; artifacts are
  theme-aware because they read CSS variables.

### 8.3 Conversion path

`latex/chapters/*.tex`
→ LaTeXML (`latexmlc`, with custom bindings for `artifact`, notes, `\chapref`)
→ chapter HTML fragments
→ `scripts/lib/site.ts` wraps fragments in the sidebar shell, injects KaTeX CSS/fonts,
   resolves cross-chapter links to `dist/site/<slug>/` URLs
→ Vite bundles `site/runtime` + artifacts (lazy chunks)
→ `dist/site/` — deploy anywhere static.

---

## 9. Pinpoint URLs — pointing at any part of the book

The site is multi-page, so every chapter is its own URL. On top of that, **every
meaningful element inside a chapter is individually addressable**, so a PDF reader can
be sent to the exact equation, note, figure, or artifact — not just the chapter.

### 9.1 What is pointable

| Element | Pointable? | Stable id pattern |
| --- | --- | --- |
| Part | yes | `pt-2` |
| Chapter (whole page) | yes | `ch-03` |
| Section / subsection | yes | `ch-03-sec-1`, `ch-03-sec-1-2` |
| **Display / multiline equation** | **yes** | `ch-03-eq-4` |
| Inline math | no (it is text, not a destination) | — |
| Figure / captioned table | yes | `ch-03-fig-2`, `ch-03-tab-1` |
| Note (`definition`, `theorem`, `example`, `note`, `tip`, `warning`, `complexity`) | yes | `ch-03-note-3` |
| Inquiry / question block (if added later) | yes | `ch-03-q-1` |
| Artifact | yes | `ch-03-art-<id>` (human-readable, from the artifact declaration) |

Id rules:

- Ids are **derived from the numbering the build already generates** (chapter 3,
  equation 4 → `ch-03-eq-4`). Zero effort from the writer, deterministic, and equal to
  what the element is visibly numbered as in print.
- An explicit `\label{prefix-sum-recurrence}` in the LaTeX overrides the generated id —
  use it when a link must survive reordering.
- The same id scheme is what QR codes in the PDF encode, so the print numbering and the
  URL fragment are the same numbers the reader sees on the page.

### 9.2 URL grammar

```text
https://book.example/<chapter-slug>/                    # whole chapter
https://book.example/<chapter-slug>/#ch-03-eq-4         # hash form (same-page, sharable)
https://book.example/<chapter-slug>/?p=ch-03-eq-4       # canonical pinpoint form
https://book.example/<chapter-slug>/?p=ch-03-art-prefix-sum-grid
```

- The **canonical form is the `?p=` query param** — this is the form QR codes encode
  and the form the copy button produces. Query params survive static hosting,
  print-to-QR, and don't collide with in-page anchors; the runtime normalizes them.
- The **hash form also works** (`#ch-03-eq-4`) for plain same-page anchors.
- Cross-chapter pinpointing is legal and trivial since pages are real URLs:
  `[this recurrence](../prefix-sums/?p=ch-02-eq-1)` in LaTeX
  (`\pinref[slug]{ch-02-eq-1}{text}`) renders as a normal link on the site.

### 9.3 Runtime behavior of a pinpoint

When a page loads with `?p=` (or a hash), the runtime:

1. scrolls the target into view (smoothly; respecting `prefers-reduced-motion`);
2. **flashes a highlight** on the target so the reader's eye lands on it — one soft
   accent pulse, theme-aware, gone in ~1.5 s;
3. if the target is an **artifact**, hydrates it immediately even if it is below the
   fold, and may auto-play its first step;
4. rewrites the address bar to the hash form so refresh and share keep working.

### 9.4 The hover pin (in-page affordance)

This is the mechanism that lets you *grab* a pinpoint URL for any element:

- Hovering any pointable element (equation, note, figure, artifact) reveals a small
  **pin/chain button** at its margin — equations top-right of the equation row, figures
  and notes top-right of the block, artifacts top-right of the frame.
- Clicking it **copies the canonical `?p=` URL** and shows a transient tooltip
  ("Link to equation 3.4 copied").
- Implemented once in `site/runtime` as a delegated listener — zero per-page markup;
  LaTeXML only needs to emit the `data-pin` id attribute, which the id scheme already
  provides.
- Keyboard-accessible (pin buttons are real buttons, focusable), and on touch screens
  the pin is always visible at reduced opacity so tapping it works without hover.
- Elements deep-linked *to* show the pin persistently for a few seconds, so a reader
  who arrived via QR can see where the link landed and copy it onward.

### 9.5 LaTeX-side plumbing

- LaTeXML custom bindings attach `id="ch-03-eq-4"` / `data-pin` to the corresponding
  elements; `\begin{artifact}{id}…` carries its human-readable id through.
- `\pinref[slug]{ch-02-eq-1}{text}` is the LaTeX macro for authoring cross-references
  to pinpoint URLs (renders as `\hyperref` in print).
- `scripts/lib/check.ts` verifies that every id referenced by a `\pinref` or QR exists,
  so print pointers can never dangle.

---

## 10. Build commands (target state)

```bash
bun run build:pdf     # latexmk over latex/main.tex → dist/book.pdf
bun run build:site    # LaTeXML + shell + Vite → dist/site/
bun run build:epub    # existing EPUB step, fed from site HTML → dist/book.epub
bun run build         # all three
bun run check         # lint manuscripts + LaTeX + artifact registry + links
bun run dev           # (adapted) live preview of a chapter as it will appear on the site
```

LaTeX-specific cache (`.latex-cache/`) holds `aux`, `toc`, `log` so incremental builds
are fast; `bun run clean` clears it.

---

## 11. Migration plan from the current pipeline

The repo already renders Markdown → HTML/PDF/EPUB. Migration is staged, nothing is
deleted up front:

1. **Add LaTeX targets.** Create `latex/` skeleton (`main.tex`, `preamble.tex`,
   `macros/artifacts.sty`), write `AGENTS.md`, convert the dummy chapter as the pilot.
2. **Stand up the PDF path.** `scripts/lib/latex-pdf.ts` + LuaLaTeX/fontspec; iterate on
   the preamble until the dummy chapter visually matches the old Paged.js output.
3. **Stand up the site path.** LaTeXML bindings, `site/` shell, sidebar, dark mode,
   artifact protocol + one demo artifact (e.g. an animated prefix-sum grid), and the
   pinpoint system (stable ids, `?p=` handling, hover pins) from day one — retrofitting
   ids after content exists is painful; generating them during conversion is free.
4. **Repoint EPUB.** Feed the existing `epub.ts` from LaTeXML HTML instead of
   markdown-rendered HTML; keep `print.css`/`epub.css` as-is.
5. **Retire.** Remove the markdown → HTML/PDF path (`html.ts`, `pdf.ts`, Paged.js,
   `markdown.ts` and friends) once LaTeX output is trusted for every chapter.
6. **Ongoing.** Chapters migrate as their manuscripts reach `review`; the agent converts
   on demand; `bun run check` guards both worlds during the transition.

## 12. Open decisions (flagged for later, not blockers)

- Cover artwork for the PDF title page (generated from `book.config.ts` in TikZ vs.
  a designed asset in `design/`).
- Whether artifacts ever get export-to-static-SVG tooling so the fallback can be
  generated instead of hand-drawn.
- Search (client-side index per chapter vs. none) — defer until the site exists.
- Comments/annotations (e.g. side discussions per paragraph) — out of scope for now.
