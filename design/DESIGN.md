# Design

This document is the visual and editorial contract for the book. The build pipeline and the writing agent both follow it. If a rule here conflicts with a chapter, the rule wins unless the chapter documents an explicit exception.

## Trim size and page

- **Trim size:** 7 × 9.1875 in (504 × 661.5 pt), a compact trade format.
- **Margins:** 22 mm top, 20 mm inside/outside, 24 mm bottom.
- **Live text area:** approximately 137.8 × 187.4 mm.
- **Columns:** the chapter body is set in two columns with a 6 mm gutter and a hairline rule. Each column is approximately 65.9 mm wide.
- **Bleed:** none. The PDF is a single-page layout, not a print-ready imposition.
- **PDF engine:** Paged.js, with `@page` rules in `design/print.css`.
- **EPUB:** reflowable and single-column; the trim size does not apply. The EPUB should remain readable at any viewport.

The page size is declared in three places and must stay in sync:

1. `book.config.ts` → `page.width`, `page.height`, `page.size`
2. `design/print.css` → `@page { size: 7in 9.1875in; }`
3. `design/tokens.css` → `--page-width`, `--page-height`

Chromium rounds fractional inch dimensions, so a 9.1875 in page would otherwise print at 661.92 pt instead of 661.5 pt. After Paged.js finishes, the PDF build rewrites every page box (MediaBox, CropBox, BleedBox, TrimBox, ArtBox) with `pdf-lib` to the exact configured size. The normalized values always come from `book.config.ts`.

## Layout

The book has one column model for front matter and two models for chapters. The writer chooses the model that fits the content.

- **Front matter** is always single-column.
- **Chapters and appendices** are two-column by default.
- **Single-column chapters:** set `layout: single-column` in the chapter frontmatter when the chapter is dominated by wide diagrams, large tables, or long code lines.
- **Wide blocks:** wrap an individual figure, table, or code sample in a `::: wide` block when it needs the full page width inside a two-column chapter. `::: single-column` is accepted as an alias.
- The chapter label, title, and summary always span the full width above the columns.
- Figures, tables, code blocks, callouts, display math, and footnotes span both columns automatically. They are never squeezed into a single column.
- On screen, the body switches to one column below 960 px. The PDF always follows the print rules.

## Typography

The book uses three families. Do not introduce a fourth without updating this document and the font pipeline.

### Barlow Condensed — headers

Barlow Condensed is the display face. It is used for:

- The cover title, part titles, chapter titles, and section headings (`h1`–`h4`)
- Callout titles and table headers
- The running header in print
- The dev toolbar brand

Rules:

- Weight 600 for chapter and part titles; weight 500–600 for section headings.
- Tighten tracking slightly on large titles (`letter-spacing: -0.015em`).
- Never use Barlow Condensed for body copy, captions, or code.
- Do not set long paragraphs in Barlow Condensed; it is a display face, not a text face.

### Atkinson Hyperlegible — body text

Atkinson Hyperlegible is the text face. It is used for:

- Paragraphs, lists, blockquotes, captions, footnotes, and table cells
- Front matter and copyright pages
- Running page numbers
- UI labels in the dev preview

Rules:

- Body size: 17 px on screen, 10.5 pt in print, and 1 rem in EPUB.
- Line height: 1.65 on screen, 1.5 in print, 1.6 in EPUB.
- Measure: 68 characters (`--measure`) for single-column text. In two-column print, the column width is the measure.
- Use weight 400 for body and 700 for strong emphasis. There is no synthetic weight in between.
- Italic is available for emphasis and book titles.

### JetBrains Mono — code and math-adjacent text

JetBrains Mono is the monospace face. It is used for:

- Fenced code blocks and inline code
- File paths, command names, and identifiers in prose
- Complexity callouts when they are written as code-like lines
- The index labels in SVG diagrams when a monospace look is helpful

Rules:

- Code size: 0.88 rem in HTML, 8.2 pt in print, 0.82 em in EPUB.
- Enable ligatures (`calt`, `liga`) for code blocks; disable them only if a language's syntax would be ambiguous.
- Do not use JetBrains Mono for mathematics. Math is typeset by KaTeX with its own fonts.
- Keep code lines under 88 characters where possible; the PDF cannot scroll horizontally. Long examples should use a `::: wide` block or a single-column chapter.

### Fallbacks

Every family has a fallback stack in `design/tokens.css`:

- Display: `"Barlow Condensed", "Arial Narrow", system-ui, sans-serif`
- Body: `"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif`
- Mono: `"JetBrains Mono", ui-monospace, monospace`
- Math: `"KaTeX_Main", "Latin Modern Math", "STIX Two Math", serif`

The fallbacks are for development and for readers whose EPUB system ignores embedded fonts. They are not a license to use a different family in the source.

## Color

The palette is neutral and the page is pure white. It is defined in `design/tokens.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#ffffff` | Page background |
| `--paper-deep` | `#f4f4f4` | Table headers, inline code, subtle surfaces |
| `--paper-code` | `#f7f7f7` | Code block background |
| `--ink` | `#161616` | Body text |
| `--ink-soft` | `#3f3f3f` | Secondary text |
| `--ink-muted` | `#6f6f6f` | Captions, page numbers |
| `--rule` | `#e4e4e4` | Hairlines and borders |
| `--rule-strong` | `#c7c7c7` | Stronger dividers |
| `--accent` | `#111111` | Links, chapter labels, accents |
| `--accent-deep` | `#000000` | Hover and theorem accents |
| `--accent-soft` | `#f2f2f2` | Definition and note backgrounds |
| `--warning` | `#7a4a00` | Tips and warnings |
| `--danger` | `#8a1f1f` | Warnings and errors |

Rules:

- Body text is always `--ink` on pure white `--paper`.
- Links are near-black with a visible underline. Do not use blue.
- Callouts use a 4 px left border and a light neutral tint. They must remain readable in grayscale.
- Do not use color alone to convey meaning. Every callout has a label and an icon.
- Semantic colors are muted. They support the label; they never replace it.

## Structure

### Front matter

1. Cover (generated from `book.config.ts`)
2. Title page
3. Copyright
4. Table of contents
5. Preface

### Parts and chapters

- A part opens on a new page with a large Roman numeral and the part title.
- Every chapter opens on a new page.
- The chapter label (`Chapter 1`) is set in Barlow Condensed, uppercase, near-black.
- The chapter title is the largest text on the page.
- The summary is set in Atkinson Hyperlegible at 1.15 rem, with a hairline below it.
- The chapter body follows the layout rules above: two columns by default, single column when the chapter sets `layout: single-column`.
- Sections use `##`; subsections use `###`. Do not use `#` in chapter Markdown.

### Table of contents

- Part names are uppercase, near-black labels.
- Entries show the chapter number, title, a dotted leader, and the page number.
- Page numbers are generated by Paged.js `target-counter`. On screen they are hidden.
- The TOC is excluded from the EPUB TOC itself; the EPUB navigation is generated by the EPUB writer.

## Mathematics

- Inline math: `$...$`.
- Display math: `$$...$$` on its own lines.
- Use the macros in `book.config.ts` (`\N`, `\Z`, `\R`, `\bigO`, `\dp`, `\dist`, `\argmax`, `\argmin`, `\mod`, `\gcd`, `\eps`).
- Do not use `\text{}` for multi-word math if a macro or `\operatorname{}` is clearer.
- Display equations span both columns in print. They may scroll horizontally on narrow screens. They must not overflow the print measure.
- In HTML and PDF, math is rendered as KaTeX HTML. In EPUB, math is rendered as MathML.
- Do not put a display equation inside a table cell or a code block.

## Figures

### SVG and raster images

- Store chapter figures next to the chapter in `figures/`.
- Use descriptive alt text and an optional title. The title becomes the caption.
- Prefer SVG for diagrams, line art, and anything with text. Use PNG or JPEG only for photographs or textures.
- Do not use external image URLs in the manuscript. The build must be reproducible offline.
- Figures are centered, never floated, and are kept with their captions (`break-inside: avoid`).
- A figure should fit one column when it can. If it needs the full page width, wrap it in a `::: wide` block.
- If a diagram is unreadable at column width, split it into two simpler figures or replace it with a table.

### TikZ

- Use a `tikz` fence for diagrams that are easier to express as code.
- Always provide `caption` and `alt` attributes.
- Keep diagrams within the column or use a `::: wide` block. When in doubt, use `scale=0.9` or a smaller `minimum width`.
- The WASM backend is the fallback; the system backend is used automatically when `latex` (or `pdflatex`) and `dvisvgm` are on `PATH`.
- Do not use packages or libraries that are not listed in `book.config.ts`. The WASM distribution is finite.
- TikZ rendering is serialized and cached by source hash. Identical diagrams are rendered once.

## Code

- Fence code with a language: `cpp`, `python`, `ts`, `bash`, `json`, `md`.
- Use `cpp` for C++ examples and `python` for Python examples.
- Keep examples self-contained enough to compile or run, but do not include boilerplate that distracts from the idea.
- Use comments to mark the important line, not to narrate every line.
- The theme is `vitesse-light`. Do not add a second theme.
- Code blocks span both columns automatically. If a sample is long or needs more than 88 characters per line, use a `::: wide` block or a single-column chapter.

## Callouts

Callouts are part of the editorial voice, not decoration. Use them consistently:

| Callout | Purpose |
| --- | --- |
| `definition` | Introduce a term or formal object |
| `theorem` | State a claim that is proved or justified |
| `example` | Work a concrete case |
| `note` | Add context that is useful but not essential |
| `tip` | Give practical advice or a shortcut |
| `warning` | Warn about a common mistake or a constraint |
| `complexity` | State time and memory costs |

Syntax:

```md
::: definition Prefix sums
The prefix-sum array is ...
:::
```

The text after the callout name is an optional custom title. If omitted, the default label is used.

Callouts span both columns in print. A callout that belongs to a single argument should stay near that argument; do not use callouts as a substitute for paragraph structure.

## EPUB

- EPUB output is reflowable, single-column, and uses `design/epub.css`.
- Fonts are embedded as TTF: Atkinson Hyperlegible, Barlow Condensed, and JetBrains Mono.
- Math is MathML. Do not rely on KaTeX CSS in EPUB.
- TikZ diagrams are materialized as SVG files and referenced by relative URL; the EPUB writer embeds them.
- Images use `file://` URLs during the build and are rewritten into the EPUB container.
- The EPUB has a generated cover page, title page, copyright page, and navigation document.
- Do not use fixed page sizes, multi-column layouts, or absolute positioning in EPUB CSS.

## Accessibility

- Every image has alt text. Every TikZ figure has an `alt` attribute.
- Heading levels are sequential: chapter title (`h1`), sections (`h2`), subsections (`h3`).
- Links are descriptive; avoid "click here".
- Color is never the only signal. Callouts have labels; warnings have icons.
- The PDF uses selectable text and tagged headings where the renderer supports it.
- The EPUB uses semantic HTML (`section`, `nav`, `figure`, `figcaption`, `aside`).

## Build contract

- `bun run build` produces `dist/book.html`, `dist/book.pdf`, and `dist/book.epub`.
- `bun run build:html`, `build:pdf`, and `build:epub` build one target.
- `bun run dev` prompts for a chapter and serves a single-chapter preview with hot reload.
- `bun run lint:content` checks frontmatter, links, images, math delimiters, and callout names.
- `bun run doctor` checks the toolchain, fonts, browser, and outputs.
- `bun run prepare` copies the WOFF2 files and fetches the TTF files into `design/fonts/`. It runs automatically on `bun install`.
- `bun run clean` removes `dist/` and `.cache/`.

Fonts are generated files and are not committed. A clean checkout needs `bun install` (which runs `prepare`) and `bunx playwright install chromium`. No network access is required after that: the fonts and dependencies are already local.
