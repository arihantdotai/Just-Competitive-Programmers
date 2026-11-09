# Design

This document is the visual and editorial contract for the book. The build pipeline and the writing agent both follow it. If a rule here conflicts with a chapter, the rule wins unless the chapter documents an explicit exception.

## Trim size and page

- **Trim size:** 7 × 9.1875 in (504 × 661.5 pt), a compact trade format.
- **Margins:** 22 mm top, 20 mm inside/outside, 24 mm bottom.
- **Live text area:** approximately 137.8 × 187.4 mm.
- **Bleed:** none. The PDF is a single-page layout, not a print-ready imposition.
- **PDF engine:** Paged.js, with `@page` rules in `design/print.css`.
- **EPUB:** reflowable; the trim size does not apply. The EPUB should remain readable at any viewport.

The page size is declared in three places and must stay in sync:

1. `book.config.ts` → `page.width`, `page.height`, `page.size`
2. `design/print.css` → `@page { size: 7in 9.1875in; }`
3. `design/tokens.css` → `--page-width`, `--page-height`

Chromium rounds fractional inch dimensions, so a 9.1875 in page would otherwise print at 661.92 pt instead of 661.5 pt. After Paged.js finishes, the PDF build rewrites every page box (MediaBox, CropBox, BleedBox, TrimBox, ArtBox) with `pdf-lib` to the exact configured size. The normalized values always come from `book.config.ts`.

## Typography

The book uses three families. Do not introduce a fourth without updating this document and the font pipeline.

### Funnel Display — headers

Funnel Display is the display face. It is used for:

- The cover title, part titles, chapter titles, and section headings (`h1`–`h4`)
- Callout titles and table headers
- The running header in print
- The dev toolbar brand

Rules:

- Weight 600 for chapter and part titles; weight 500–600 for section headings.
- Tighten tracking slightly on large titles (`letter-spacing: -0.015em`).
- Never use Funnel Display for body copy, captions, or code.
- Do not set long paragraphs in Funnel Display; it is a display face, not a text face.

### DM Sans — body text

DM Sans is the text face. It is used for:

- Paragraphs, lists, blockquotes, captions, footnotes, and table cells
- Front matter and copyright pages
- Running page numbers
- UI labels in the dev preview

Rules:

- Body size: 17 px on screen, 1 rem in EPUB, and the browser default in print.
- Line height: 1.65 on screen, 1.6 in EPUB.
- Measure: 68 characters (`--measure`) on screen; the print measure is the live text area.
- Use weight 400 for body, 500–600 for emphasis and labels, 700 sparingly.
- Italic is available for emphasis and book titles.

### Fira Code — code and math-adjacent text

Fira Code is the monospace face. It is used for:

- Fenced code blocks and inline code
- File paths, command names, and identifiers in prose
- Complexity callouts when they are written as code-like lines
- The index labels in SVG diagrams when a monospace look is helpful

Rules:

- Code size: 0.88 rem in print/HTML, 0.86 em in EPUB.
- Enable ligatures (`calt`, `liga`) for code blocks; disable them only if a language's syntax would be ambiguous.
- Do not use Fira Code for mathematics. Math is typeset by KaTeX with its own fonts.
- Keep code lines under 88 characters where possible; the PDF cannot scroll horizontally.

### Fallbacks

Every family has a fallback stack in `design/tokens.css`:

- Display: `"Funnel Display", "Inter", system-ui, sans-serif`
- Body: `"DM Sans", "Inter", system-ui, sans-serif`
- Mono: `"Fira Code", "JetBrains Mono", ui-monospace, monospace`
- Math: `"KaTeX_Main", "Latin Modern Math", "STIX Two Math", serif`

The fallbacks are for development and for readers whose EPUB system ignores embedded fonts. They are not a license to use a different family in the source.

## Color

The palette is warm paper and deep teal. It is defined in `design/tokens.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#fffdf8` | Page background |
| `--paper-deep` | `#f6f1e6` | Table headers, inline code |
| `--paper-code` | `#fbf7ee` | Code block background |
| `--ink` | `#1c1b18` | Body text |
| `--ink-soft` | `#46433c` | Secondary text |
| `--ink-muted` | `#6d685e` | Captions, page numbers |
| `--rule` | `#ddd5c6` | Hairlines and borders |
| `--accent` | `#0f6b62` | Links, chapter labels, accents |
| `--accent-deep` | `#0a4f49` | Hover and theorem accents |
| `--accent-soft` | `#e3f1ee` | Definition and note backgrounds |
| `--warning` | `#9a5b12` | Tips and warnings |
| `--danger` | `#9b2c2c` | Warnings and errors |

Rules:

- Body text is always `--ink` on `--paper`.
- Links are `--accent`; do not use blue.
- Callouts use a 4 px left border and a soft tinted background. They must remain readable in grayscale.
- Do not use color alone to convey meaning. Every callout has a label and an icon.

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
- The chapter label (`Chapter 1`) is set in Funnel Display, uppercase, accent color.
- The chapter title is the largest text on the page.
- The summary is set in DM Sans at 1.15 rem, with a hairline below it.
- Sections use `##`; subsections use `###`. Do not use `#` in chapter Markdown.

### Table of contents

- Part names are uppercase, accent-colored labels.
- Entries show the chapter number, title, a dotted leader, and the page number.
- Page numbers are generated by Paged.js `target-counter`. On screen they are hidden.
- The TOC is excluded from the EPUB TOC itself; the EPUB navigation is generated by the EPUB writer.

## Mathematics

- Inline math: `$...$`.
- Display math: `$$...$$` on its own lines.
- Use the macros in `book.config.ts` (`\N`, `\Z`, `\R`, `\bigO`, `\dp`, `\dist`, `\argmax`, `\argmin`, `\mod`, `\gcd`, `\eps`).
- Do not use `\text{}` for multi-word math if a macro or `\operatorname{}` is clearer.
- Display equations are centered and may scroll horizontally on narrow screens. They must not overflow the print measure.
- In HTML and PDF, math is rendered as KaTeX HTML. In EPUB, math is rendered as MathML.
- Do not put a display equation inside a table cell or a code block.

## Figures

### SVG and raster images

- Store chapter figures next to the chapter in `figures/`.
- Use descriptive alt text and an optional title. The title becomes the caption.
- Prefer SVG for diagrams, line art, and anything with text. Use PNG or JPEG only for photographs or textures.
- Do not use external image URLs in the manuscript. The build must be reproducible offline.
- Figures are centered, never floated, and are kept with their captions (`break-inside: avoid`).

### TikZ

- Use a `tikz` fence for diagrams that are easier to express as code.
- Always provide `caption` and `alt` attributes.
- Keep diagrams within the print measure. When in doubt, use `scale=0.9` or a smaller `minimum width`.
- The WASM backend is the fallback; the system backend is used automatically when `latex` (or `pdflatex`) and `dvisvgm` are on `PATH`.
- Do not use packages or libraries that are not listed in `book.config.ts`. The WASM distribution is finite.
- TikZ rendering is serialized and cached by source hash. Identical diagrams are rendered once.

## Code

- Fence code with a language: `cpp`, `python`, `ts`, `bash`, `json`, `md`.
- Use `cpp` for C++ examples and `python` for Python examples.
- Keep examples self-contained enough to compile or run, but do not include boilerplate that distracts from the idea.
- Use comments to mark the important line, not to narrate every line.
- The theme is `vitesse-light`. Do not add a second theme.

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

## EPUB

- EPUB output is reflowable and uses `design/epub.css`.
- Fonts are embedded as TTF: DM Sans, Funnel Display, and Fira Code.
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
- `bun run clean` removes `dist/` and `.cache/`.

The build must be reproducible from a clean checkout with `bun install`, `bunx playwright install chromium`, and `bun run build`. No network access is required at build time once the fonts and dependencies are installed.
