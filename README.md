# Just Competitive Programmers

A Bun + TypeScript book pipeline that turns chapter-wise Markdown into a portable HTML book, a print-ready PDF, a reflowable EPUB, and a reading website. Mathematics is typeset with KaTeX, diagrams with TikZ (or SVG), and code with Shiki. The print design is a single-column 7 × 9 in book: one justified measure, running heads, numbered sections and equations, and notes at the bottom of the page.

- **HTML** — a portable page in `dist/book.html` with local CSS, fonts, KaTeX, and figures.
- **PDF** — `dist/book.pdf`, paginated by Paged.js at 7 × 9 in (504 × 648 pt).
- **EPUB** — `dist/book.epub`, reflowable, with MathML and embedded fonts.
- **Website** — `dist/site/`, one page per chapter, with a contents sidebar, dark mode, interactive artifacts, and pinpoint links.

## Requirements

- [Bun](https://bun.sh/) 1.4 or newer
- Chromium for PDF generation (`bunx playwright install chromium`)
- Optional: `latex` (or `pdflatex`) and `dvisvgm` for the system TikZ backend. Without them, the pipeline uses the bundled `node-tikzjax` WASM renderer.

## Quick start

```bash
bun install                      # also runs `bun run prepare` for the fonts
bunx playwright install chromium
bun run build
```

Outputs land in `dist/`:

```text
dist/
  book.html
  book.pdf
  book.epub
  site/
    index.html
    <chapter-slug>/index.html
    assets/
  assets/
    book.css
    print.css
    site.css
    tokens.css
    katex.min.css
    fonts/
    figures/
    tikz/
```

## Commands

| Command | What it does |
| --- | --- |
| `bun run dev` | Prompts for a chapter, starts Vite, and hot-reloads the preview |
| `bun run dev -- --chapter dummy` | Starts the preview on a specific chapter |
| `bun run dev -- --all` | Previews the whole book in one scroll |
| `bun run build` | Builds HTML, PDF, EPUB, and the website |
| `bun run build:html` | Builds only `dist/book.html` |
| `bun run build:pdf` | Builds HTML, then `dist/book.pdf` |
| `bun run build:epub` | Builds only `dist/book.epub` |
| `bun run build:site` | Builds only `dist/site/` |
| `bun run lint:content` | Checks frontmatter, links, images, math delimiters, and callouts |
| `bun run doctor` | Reports the toolchain, fonts, browser, and output status |
| `bun run prepare` | Copies WOFF2 fonts and fetches the TTF fonts into `design/fonts/` |
| `bun run fonts` | Alias for `bun run prepare` |
| `bun test` | Runs the test suite |
| `bun run clean` | Removes `dist/` and `.cache/` |

Build flags:

```bash
bun run build -- --no-pdf          # HTML + EPUB + site
bun run build -- --simple-pdf      # HTML + PDF without Paged.js pagination
bun run build -- --pdf             # HTML + PDF only
bun run build -- --epub            # EPUB only
bun run build -- --site            # website only
```

## Project layout

```text
book.config.ts          Book metadata, page size, math macros, TikZ packages
design/
  DESIGN.md             Design spec: layout, structure, numbering, callouts, footnotes
  FONTS.md              Typeface families and type-scale values
  COLOR.md              Color tokens and diagram palette values
  css/
    tokens.css          Font faces, palette, and CSS variables
    book.css            Shared book typography: notes, code, figures, TOC
    print.css           @page rules, running heads, footnotes, single column
    site.css            Website shell, sidebar, pins, artifact frame
    epub.css            EPUB typography, endnotes, and embedded fonts
  fonts/                Self-hosted WOFF2 and TTF files
manuscript/
  _TEMPLATE/            Chapter template (ignored by the build)
  00-frontmatter/       Title, copyright, preface
  part-1-foundations/
    01-dummy/           Sample chapter + figures/
site/
  runtime.js            Theme, sidebar, scroll-spy, pinpoint links, artifacts
  artifacts/            Artifact registry and interactive components
scripts/
  build.ts              Full build
  dev.ts                Vite dev server with a chapter picker
  lint.ts               Content checks
  doctor.ts             Environment checks
  clean.ts              Output cleanup
  fonts.ts              Font preparation
  lib/                  Markdown, KaTeX, TikZ, HTML, PDF, EPUB, site, assets
tests/                  Unit and rendering tests
```

## Writing a chapter

Create a directory under `manuscript/` with an `index.md`:

```text
manuscript/part-2-trees/03-segment-trees/index.md
manuscript/part-2-trees/03-segment-trees/figures/tree.svg
```

Start the file with YAML frontmatter:

```yaml
---
title: "Segment Trees"
runningTitle: "Segment Trees"   # optional; used in the print running head
slug: segment-trees
part: Trees and Range Queries
partOrder: 2
order: 3
number: 3
kind: chapter
topics:
  - segment trees
  - range queries
summary: "A divide-and-conquer structure for range queries with point updates."
status: draft
---
```

Rules:

- `title` is required. `slug` is derived from the folder name if omitted, but an explicit slug is safer.
- `runningTitle` is optional. Use it when the full title is too long for the top-left running head.
- `kind` is one of `chapter`, `preface`, `title`, `copyright`, `appendix`, `references`.
- `references` chapters are single-column, unnumbered, and included in the table of contents. Put the reference list in `manuscript/99-references/index.md` or a similarly ordered directory.
- `status` is one of `draft`, `review`, `final`. A `final` chapter cannot contain `TODO`, `FIXME`, or `TBD`.
- Use `##` for sections. They are numbered 1, 2, 3 per chapter. `###` subsections are unnumbered. Do not use `#`; the chapter title is generated from the frontmatter.
- Chapters are single-column. `layout: single-column` is the default for every chapter kind; `two-column` is still accepted but has no layout effect.
- Figures are set to the text measure. Wrap a figure, table, or code sample in a `::: wide` block when it needs the full page width. Use `::: wide page` to force the block onto its own page.
- Put images in `figures/` next to the chapter and reference them relatively: `![Alt](figures/tree.svg "Caption")`.
- Use `chapter:slug` links to cross-reference chapters: `[prefix sums](chapter:dummy)`.
- Use the `::: definition`, `::: theorem`, `::: example`, `::: note`, `::: tip`, `::: warning`, and `::: complexity` notes. They render as run-in labels with no box or icon. Theorem and definition bodies are italic.
- Use `$...$` for inline math and `$$...$$` for display math. Display equations are numbered per chapter. The macros in `book.config.ts` are available.
- Use Markdown footnotes for short asides and citations: `Text.[^source]` and `[^source]: The note.` In print they appear at the bottom of the page; in EPUB they become endnotes.
- Keep bold and italic structural. See the usage policy in `manuscript/_STYLE.md` §5 and the values in `design/FONTS.md`.

See `manuscript/_TEMPLATE/index.md` for a complete starter file, `manuscript/_STYLE.md` for writing rules, and the design specs in `design/` (`DESIGN.md`, `FONTS.md`, `COLOR.md`) for the visual rules.

### Author marks

Lines starting with `%%` are commands to the conversion agent, not prose. They never appear in an output.

| Mark | Effect |
| --- | --- |
| `%% add: <text>` | Inserts the text verbatim at that point |
| `%% artifact: <id> \| <caption>` | Declares an interactive artifact; an indented block below it describes the fallback |
| `%% link: <text> -> pin:<id>` | Generates a "see also" line to a pinpoint target |
| `%% link: <text> -> https://…` | Generates a "see also" line to an external URL |
| `%% todo: <text>` | Leaves a visible TODO in every output |
| `%% ask: <text>` | Stops the agent and asks the author |
| `%% scribe: <instruction>` | Instructs the LaTeX conversion agent |
| `%% qr: <pin-id>` | Adds a QR companion block in print |

A mark that cannot be satisfied is surfaced as a visible TODO, never silently dropped.

## Website

`bun run build:site` writes a static reading site to `dist/site/`: a cover and contents page, one page per chapter, and copied assets. The layout is a fixed left sidebar (book name, parts, chapters, the current chapter's sections) and a single reading column on the right.

- **Dark mode** follows the system preference, can be toggled, and is remembered in `localStorage`.
- **Pinpoint links** target any numbered element: equations (`ch-01-eq-1`), notes (`ch-01-note-3`), figures (`ch-01-fig-1`), artifacts (`ch-01-art-prefix-sum-grid`), and sections (`ch-01-sec-2`). Hover an element and click the link button to copy its canonical URL; `?p=<id>` opens the page scrolled to that element.
- **Artifacts** declared with `%% artifact:` become a static figure by default. The runtime lazily imports a component from `site/artifacts/registry.js` and mounts it over the fallback; an unregistered id keeps the fallback visible.
- **No build step for site JavaScript**: `site/` is plain ES modules, copied as-is and served natively.

The canonical base URL for copied links and QR codes is `site.baseUrl` in `book.config.ts`.

## Design at a glance

- **Page:** 7 × 9 in, one justified column, mirrored margins for verso and recto.
- **Running heads:** chapter name at the top left, page number at the top right. No bottom page number.
- **Chapter anatomy:** chapter number and title, one-line summary, optional epigraph, body, a "what comes next" close, and exercises.
- **Footnotes:** Markdown footnotes are floated to the bottom of the page in print and become endnotes in EPUB.
- **Numbering:** `##` sections and display equations are numbered per chapter; figures and artifacts use chapter-based numbering (`Figure 1-1`).
- **Notes:** `::: theorem`, `::: definition`, and the other note blocks are run-in labels with no box or icon. Theorem and definition bodies are italic.
- **Wide material:** the text is one measure. Use `::: wide` for a full-measure figure, table, or code sample, and `::: wide page` to give it its own page.
- **Diagrams:** soft slate, sage, clay, ochre, plum, and teal fills with dark strokes. Every diagram must remain legible in grayscale.

## Fonts

The book uses:

- **Fira Sans Condensed** for headers and display text
- **Crimson Pro** for body text
- **JetBrains Mono** for code blocks

All three are self-hosted in `design/fonts/`. The build copies WOFF2 files for HTML/PDF and embeds TTF files in EPUB. The font files are generated by `bun run prepare` and are intentionally not committed, so a fresh checkout stays small. See `design/fonts/README.md` for sources and regeneration.

## Page size

The PDF trim size is **7 × 9 in (504 × 648 pt)**. It is declared in:

- `book.config.ts` → `page.width` / `page.height`
- `design/css/print.css` → `@page { size: 7in 9in; }`
- `design/css/tokens.css` → `--page-width` / `--page-height`

If you change the trim size, update all three.

Chromium can round page sizes, so the PDF build post-processes every page with `pdf-lib` to force the MediaBox, CropBox, BleedBox, TrimBox, and ArtBox to exactly 504 × 648 pt. The normalized size is derived from `book.config.ts`, so the config remains the source of truth.

## Metadata

Edit `book.config.ts` to set the title, subtitle, author, publisher, edition, language, and description. The front-matter files in `manuscript/00-frontmatter/` contain the copyright and preface text. `isbn` is reserved for a future distribution step; the EPUB currently receives a generated identifier.

## TikZ

TikZ fences are rendered to SVG and cached by source hash:

````md
```tikz caption="A binary tree." alt="A binary tree with three levels."
\begin{tikzpicture}
  \node {root}
    child { node {left} }
    child { node {right} };
\end{tikzpicture}
```
````

The default backend is `auto`: it uses the system TeX toolchain (`latex` or `pdflatex`, plus `dvisvgm`) when available, and falls back to `node-tikzjax` otherwise. Rendering is serialized because the WASM renderer is not safe to run concurrently.

## License

Copyright © 2026 **Arihant Jain**.

This work is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International Public License](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0). See the [`LICENSE`](LICENSE) file for the full text.

- **Attribution** — credit the author, Arihant Jain, link the license, and indicate any changes.
- **NonCommercial** — no commercial use.
- **ShareAlike** — adaptations must be released under the same license.

No spreading or redistribution without the author's name and the license name is permitted.

## Troubleshooting

**PDF build fails with "Chromium is not installed"**  
Run `bunx playwright install chromium`.

**TikZ render fails**  
Check that the packages and libraries you use are listed in `book.config.ts`. The WASM distribution does not include every LaTeX package. For debugging, set `showConsole: true` in `scripts/lib/tikz.ts` temporarily to see the TeX log.

**Fonts look wrong in the PDF**  
Run `bun run prepare`, then `bun run build`. Make sure the font files exist in `design/fonts/` and are copied to `dist/assets/fonts/`. The font files are generated, not committed, so a fresh checkout must run `bun install` or `bun run prepare` first.

**A chapter does not appear**  
Check that its directory does not start with `_` or `.`, and that its frontmatter has a unique `slug` and a valid `kind`.

**EPUB math is missing**  
EPUB uses MathML. Check that `renderChapter` is called with `mathOutput: "mathml"` in `scripts/build.ts` and that the reader supports MathML (Apple Books, Calibre, and most modern readers do).
