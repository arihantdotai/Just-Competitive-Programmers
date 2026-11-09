# Only Competitive Programmer's Handbook

A Bun + TypeScript book pipeline that turns chapter-wise Markdown into a portable HTML book, a print-ready PDF, and a reflowable EPUB. Mathematics is typeset with KaTeX, diagrams with TikZ (or SVG), and code with Shiki.

- **HTML** — a portable page in `dist/book.html` with local CSS, fonts, KaTeX, and figures.
- **PDF** — `dist/book.pdf`, paginated by Paged.js at 7 × 9.1875 in (504 × 661.5 pt).
- **EPUB** — `dist/book.epub`, reflowable, with MathML and embedded fonts.

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
  assets/
    book.css
    print.css
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
| `bun run build` | Builds HTML, PDF, and EPUB |
| `bun run build:html` | Builds only `dist/book.html` |
| `bun run build:pdf` | Builds HTML, then `dist/book.pdf` |
| `bun run build:epub` | Builds only `dist/book.epub` |
| `bun run lint:content` | Checks frontmatter, links, images, math delimiters, and callouts |
| `bun run doctor` | Reports the toolchain, fonts, browser, and output status |
| `bun run prepare` | Copies WOFF2 fonts and fetches the TTF fonts into `design/fonts/` |
| `bun run fonts` | Alias for `bun run prepare` |
| `bun test` | Runs the test suite |
| `bun run clean` | Removes `dist/` and `.cache/` |

Build flags:

```bash
bun run build -- --no-pdf          # HTML + EPUB
bun run build -- --simple-pdf      # HTML + PDF without Paged.js pagination
bun run build -- --pdf             # HTML + PDF only
bun run build -- --epub            # EPUB only
```

## Project layout

```text
book.config.ts          Book metadata, page size, math macros, TikZ packages
design/
  DESIGN.md             Typography, color, layout, and editorial rules
  tokens.css            Font faces and CSS variables
  book.css              Screen layout, callouts, code, figures, TOC
  print.css             @page rules and Paged.js margin boxes
  epub.css              EPUB typography and embedded fonts
  fonts/                Self-hosted WOFF2 and TTF files
manuscript/
  _TEMPLATE/            Chapter template (ignored by the build)
  00-frontmatter/       Title, copyright, preface
  part-1-foundations/
    01-dummy/           Sample chapter + figures/
scripts/
  build.ts              Full build
  dev.ts                Vite dev server with a chapter picker
  lint.ts               Content checks
  doctor.ts             Environment checks
  clean.ts              Output cleanup
  fonts.ts              Font preparation
  lib/                  Markdown, KaTeX, TikZ, HTML, PDF, EPUB, assets
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
- `kind` is one of `chapter`, `preface`, `title`, `copyright`, `appendix`.
- `status` is one of `draft`, `review`, `final`. A `final` chapter cannot contain `TODO`, `FIXME`, or `TBD`.
- Use `##` for sections. Do not use `#`; the chapter title is generated from the frontmatter.
- Chapters are two-column by default. Set `layout: single-column` in the frontmatter when the chapter is dominated by wide diagrams, large tables, or long code lines.
- Wrap an individual wide figure, table, or code sample in a `::: wide` block when it needs the full page width inside a two-column chapter.
- Put images in `figures/` next to the chapter and reference them relatively: `![Alt](figures/tree.svg "Caption")`.
- Use `chapter:slug` links to cross-reference chapters: `[prefix sums](chapter:dummy)`.
- Use the `::: definition`, `::: theorem`, `::: example`, `::: note`, `::: tip`, `::: warning`, and `::: complexity` callouts.
- Use `$...$` for inline math and `$$...$$` for display math. The macros in `book.config.ts` are available.

See `manuscript/_TEMPLATE/index.md` for a complete starter file and `design/DESIGN.md` for the editorial and visual rules.

## Fonts

The book uses:

- **Barlow Condensed** for headers and display text
- **Atkinson Hyperlegible** for body text
- **JetBrains Mono** for code blocks

All three are self-hosted in `design/fonts/`. The build copies WOFF2 files for HTML/PDF and embeds TTF files in EPUB. The font files are generated by `bun run prepare` and are intentionally not committed, so a fresh checkout stays small. See `design/fonts/README.md` for sources and regeneration.

## Page size

The PDF trim size is **7 × 9.1875 in (504 × 661.5 pt)**. It is declared in:

- `book.config.ts` → `page.width` / `page.height`
- `design/print.css` → `@page { size: 7in 9.1875in; }`
- `design/tokens.css` → `--page-width` / `--page-height`

If you change the trim size, update all three.

Chromium rounds fractional inch page sizes, so the PDF build post-processes every page with `pdf-lib` to force the MediaBox, CropBox, BleedBox, TrimBox, and ArtBox to exactly 504 × 661.5 pt. The normalized size is derived from `book.config.ts`, so the config remains the source of truth.

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
