# DESIGN.md: Production Design Specification

This section serves as the complete DESIGN.md specification for the competitive programming manuscript toolchain.

## 1. Font Family Selection & Rationale

### Body Text (Minion Pro)
A classic serif typeface designed specifically for book typography and long-form reading. Its elegant proportions, warm texture, high legibility at small point sizes, and distinct italic styles make it the industry gold standard for technical books (e.g., O'Reilly Media). It creates a clear contrast against code blocks and sans-serif headers.

### Headings (Barlow Condensed)
A clean, narrow sans-serif typeface. The condensed width allows long section titles (e.g., Amortized Analysis of Disjoint Set Union) to fit on a single line without awkward wrapping or excessive vertical space consumption.

### Code & Math-Adjacent (JetBrains Mono)
A modern monospace font engineered for developers. Features open counters, clear character differentiation (0 vs O, 1 vs l vs I), expanded letter spacing, and programming ligatures that make complex C++ pointer and logic syntax easy to parse.

## 2. Typographic Hierarchy & Specifications

| Document Element | Typeface Family | Weight / Style | Point Size | Leading (Line Height) | Alignment / Options |
|---|---|---|---|---|---|
| Book Title | Barlow Condensed | Bold | 28 pt | 32 pt | Centered, +5% Tracking |
| Chapter Title (H1) | Barlow Condensed | Bold | 20 pt | 24 pt | Left-aligned, 18 pt space after |
| Section Title (H2) | Barlow Condensed | SemiBold | 14 pt | 17 pt | Left-aligned, 12 pt space before |
| Sub-section (H3) | Barlow Condensed | Medium / Italic | 11 pt | 14 pt | Left-aligned, 8 pt space before |
| Body Paragraphs | Minion Pro | Regular | 9.5 pt | 13.5 pt (142%) | Justified, tight hyphenation |
| Code Blocks | JetBrains Mono | Regular | 8.0 pt | 10.5 pt (131%) | Flush-left, tab-size 2, custom syntax |
| Inline Code / Math | JetBrains Mono | Regular | 8.5 pt | Auto | Off-white background, crimson text |
| Table Text / Captions | Barlow Condensed | Regular / Medium | 8.0 pt | 10.0 pt | Centered / Small-Caps headers |
| Footnotes / Margin | Minion Pro | Regular | 7.5 pt | 10.0 pt | Left-aligned / Ragged-right |

## 3. Color Palette Architecture

The color strategy uses soft, neutral tones to reduce visual fatigue during long reading sessions, while providing clear functional distinctions for warnings, callouts, and code elements:

- **Page Surface (#FAFAFA)**: Soft off-white cream paper tone that eliminates high-contrast eye glare.
- **Body Text (#2D3748)**: Charcoal slate for body narrative, offering sharp legibility without the harshness of pure black #000000.
- **Primary Headings (#1A365D)**: Deep navy for chapter and section headings.
- **Secondary Accents (#2B6CB0)**: Steel blue for H2 titles, inline links, and list markers.
- **Code Container (#F7FAFC)**: Cool light gray fill with a #E2E8F0 subtle border.
- **Note Box (#F0F4F8)**: Soft ice blue container with #3182CE accent left border.
- **Warning Box (#FFF5F5)**: Soft crimson container with #E53E3E accent left border.

## 4. Callout Box Specifications

### Note Container
Used for algorithmic tips, time complexity hints, and edge case reminders. It features a 3 pt left border in steel blue, ice blue background, heading in Barlow Condensed Bold, and body prose in 8.5 pt Minion Pro.

### Warning Container
Used for pitfalls like integer overflow, out-of-bounds indexing, and memory limits. It features a 3 pt left border in soft crimson, soft pink/red background, heading in Barlow Condensed Bold, and body prose in 8.5 pt Minion Pro.

## 5. Grid Architecture and Hybrid Layout Rules

A strict two-column grid works well for narrative prose, but technical books on competitive programming frequently feature wide code blocks, mathematical derivations, wide tables, and complex graph diagrams. These elements break if forced into a narrow 2.62-inch column. Therefore, the book utilizes a hybrid layout engine capable of dynamically switching between two-column narrative flow and single-column full-width spans.

Every text page carries a running head:

- **Top left:** the chapter or section name, in Barlow Condensed, uppercase, muted gray.
- **Top right:** the page number, in Minion Pro, tabular figures, muted gray.

The running head is set with `string-set: chapter-title attr(data-running-title)`. The `runningTitle` frontmatter field overrides the visible chapter title when the title is too long for the head. Cover and part-title pages suppress the running head. There is no page number at the bottom of the page.

### Footnotes

Notes are set at the bottom of the page, not at the end of the chapter:

- The source is a normal Markdown footnote: `Text.[^label]` and `[^label]: The note.`
- The build copies each note to its call site. Paged.js floats it to the `@footnote` area with `float: footnote`.
- Numbering restarts at 1 in each chapter.
- A hairline separates the notes from the body text.
- The end-of-chapter note list remains in the HTML for screen readers and is converted to EPUB endnotes (`epub:type="endnotes"` / `epub:type="endnote"`). It is hidden in print.

## 5. Grid Architecture and Hybrid Layout Rules

A strict two-column grid works well for narrative prose, but technical books on competitive programming frequently feature wide code blocks, mathematical derivations, wide tables, and complex graph diagrams. These elements break if forced into a narrow 2.62-inch column. Therefore, the book utilizes a hybrid layout engine capable of dynamically switching between two-column narrative flow and single-column full-width spans.

### Physical Page Geometry

- **Trim Size**: Crown Quarto (7.44" × 9.68")
- **Top Margin**: 0.75 in (54 pt)
- **Bottom Margin**: 1.00 in (72 pt)
- **Inside (Gutter) Margin**: 0.875 in (63 pt) to prevent text loss in the binding
- **Outside Margin**: 0.625 in (45 pt)

### Column Layout

- **Column Count**: 2 (default body)
- **Column Width**: 2.62 in (188.6 pt) per column
- **Column Gap**: 0.25 in (18 pt)

### Layout Decision Rules

| Element Type | Layout Format Mode | Decision Threshold / Trigger Rule | Pedagogical Justification |
|---|---|---|---|
| Standard Body Prose | Two-Column | Default state | Keeps measure to ~45 chars; minimizes eye-sweep fatigue |
| Short Code Snippets | Two-Column | Line width ≤ 42 characters | Fits naturally within the 2.62" - 3.4" column width |
| Wide Code Listings | Single-Column Span | Line width > 42 characters | Prevents horizontal wrapping or microscopic font scaling |
| Algorithm Trace Tables | Single-Column Span | Table width > 3.0 in or > 4 columns | Avoids cramped numeric data and text truncation |
| Complex Diagrams | Single-Column Span | Binary trees, graph flows, segment tree structures | Preserves spatial topology without vertical distortion |
| Callout Boxes | Two-Column or Span | Inline notes = 2-Col; Key algorithms = Span | Matches the structural weight of the underlying content |

## 6. Layout Decision Quick Reference

For any element in the manuscript, apply the following decision process:

1. Is the element wide code, a large table, or a complex diagram?
   - Yes → Use Single-Column Span mode
   - No → Continue to step 2

2. Is this body prose or a short code snippet (≤ 42 char line width)?
   - Yes → Use Two-Column mode
   - No → Re-evaluate step 1

3. For callout boxes: Does the content match the structural weight of surrounding material?
   - Inline/short notes → Two-Column
   - Key algorithms/complex topics → Single-Column Span
- **References** is a `references` chapter kind: single-column, unnumbered, and included in the table of contents.
- **Chapters and appendices** are two-column by default.
- **Single-column chapters:** set `layout: single-column` in the chapter frontmatter when the chapter is dominated by wide diagrams, large tables, or long code lines.
- **Wide blocks:** wrap an individual figure, table, or code sample in a `::: wide` block when it needs the full page width inside a two-column chapter. `::: single-column` is accepted as an alias. Use `::: wide page` when the block should also start and end on its own page.
- The chapter label, title, and summary always span the full width above the columns.
- **Figures** are set to the column width by default. Use `::: wide` only when the diagram genuinely needs the full measure.
- **Tables and code blocks** span both columns automatically.
- **Notes and display equations** flow inside the column. They do not span both columns.
- On screen, the body switches to one column below 960 px. The PDF always follows the print rules.

## Typography

The book uses three families. Do not introduce a fourth without updating this document and the font pipeline.

### Barlow Condensed — headers

Barlow Condensed is the display face. It is used for:

- The cover title, part titles, chapter titles, and section headings (`h1`–`h4`)
- Table headers
- The running head in print
- The dev toolbar brand

Rules:

- Weight 600 for chapter and part titles; weight 500–600 for section headings.
- Tighten tracking slightly on large titles (`letter-spacing: -0.015em`).
- Never use Barlow Condensed for body copy, captions, or code.
- Do not set long paragraphs in Barlow Condensed; it is a display face, not a text face.

### Minion Pro — body text

Minion Pro is the text face. It is used for:

- Paragraphs, lists, blockquotes, captions, notes, and table cells
- Front matter and copyright pages
- Page numbers and running-head page numbers
- UI labels in the dev preview

Rules:

- Body size: 17 px on screen, 10.5 pt in print, and 1 em in EPUB.
- Line height: 1.65 on screen, 1.5 in print, 1.55 in EPUB.
- Measure: 68 characters (`--measure`) for single-column text. In two-column print, the column width is the measure.
- Body text is justified. The first paragraph after a heading, figure, table, code block, display equation, note, or list is not indented; every following paragraph begins with a 1.2 em indent and has no extra inter-paragraph gap.
- Use weight 400 for body and 700 for strong emphasis. There is no synthetic weight in between.
- Italic is available for emphasis, book titles, theorem and definition bodies, and the chapter summary.

### JetBrains Mono — code and math-adjacent text

JetBrains Mono is the monospace face. It is used for:

- Fenced code blocks and inline code
- File paths, command names, and identifiers in prose
- Index labels in SVG diagrams when a monospace look is helpful

Rules:

- Code size: 0.88 rem in HTML, 7.6 pt in print, 0.82 em in EPUB.
- Enable ligatures (`calt`, `liga`) for code blocks; disable them only if a language's syntax would be ambiguous.
- Do not use JetBrains Mono for mathematics. Math is typeset by KaTeX with its own fonts.
- Keep code lines under 88 characters where possible; the PDF cannot scroll horizontally. Long examples should use a `::: wide` block or a single-column chapter.

### Fallbacks

Every family has a fallback stack in `design/tokens.css`:

- Display: `"Barlow Condensed", "Arial Narrow", system-ui, sans-serif`
- Body: `"Minion Pro", "Segoe UI", system-ui, sans-serif`
- Mono: `"JetBrains Mono", ui-monospace, monospace`
- Math: `"KaTeX_Main", "Latin Modern Math", "STIX Two Math", serif`

The fallbacks are for development and for readers whose EPUB system ignores embedded fonts. They are not a license to use a different family in the source.

## Emphasis policy

Bold and italic are structural, not decorative. Do not use them to make a paragraph look busier.

### Bold

Use bold for:

- The run-in label of a note: **Theorem.**, **Definition.**, **Example.**, **Note.**, **Tip.**, **Warning.**, **Complexity.**
- Figure and table numbers: **Figure 1.2.**, **Table 3.1.**
- Terms at their point of definition, once per chapter, when the term is the subject of the sentence.
- The lead-in of a list when the list is a glossary or a set of named rules.
- Matrix and vector names only when the surrounding prose would otherwise be ambiguous.

Do not use bold for:

- Whole sentences or paragraphs.
- Emphasis inside a theorem or definition body; the body is already italic.
- Section headings; headings already use the display face and weight.
- Code identifiers; code is already monospaced.

### Italic

Use italic for:

- Theorem and definition bodies.
- Book and paper titles.
- Foreign words and phrases on first use.
- A word used as a word: *the token `sum` means…*.
- The chapter summary.
- Variables in prose when they are not already set in math. Prefer math delimiters (`$n$`) over italic markup for variables.

Do not use italic for:

- Long passages. Italic is a signal, not a texture.
- Notes other than theorems and definitions.
- Code, file paths, or command names.
- Headings.

### Both

Bold italic is reserved for a defined term that is also a theorem or definition label in running text. It is rare. If a sentence needs both, rewrite the sentence.

## Color

The palette is neutral and the page is pure white. It is defined in `design/tokens.css`.

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#ffffff` | Page background |
| `--paper-deep` | `#f4f4f4` | Inline code, subtle surfaces |
| `--paper-code` | `#f7f7f7` | Code block background |
| `--ink` | `#161616` | Body text |
| `--ink-soft` | `#3f3f3f` | Secondary text, captions |
| `--ink-muted` | `#6f6f6f` | Running heads, page numbers |
| `--rule` | `#e4e4e4` | Hairlines and borders |
| `--rule-strong` | `#c7c7c7` | Stronger dividers |
| `--accent` | `#111111` | Links and accents |
| `--accent-deep` | `#000000` | Hover states |
| `--warning` | `#7a4a00` | Tips and warnings, if color is used |
| `--danger` | `#8a1f1f` | Warnings and errors, if color is used |

Rules:

- Body text is always `--ink` on pure white `--paper`.
- Links are near-black with a visible underline. Do not use blue.
- Notes have no background, border, or icon. They are separated from the body by their run-in label and spacing alone.
- Do not use color alone to convey meaning. Notes always have a label.
- Semantic colors are muted. They support the label; they never replace it.

### Diagram palette

Diagrams use soft fills and dark strokes. The palette is deliberately desaturated so it reads as part of the page rather than as an infographic.

| Token | Value | Use |
| --- | --- | --- |
| `--diagram-slate` | `#55657a` | Default stroke and label |
| `--diagram-slate-soft` | `#e8edf2` | Default fill |
| `--diagram-sage` | `#5b705f` | Secondary stroke |
| `--diagram-sage-soft` | `#e8efe7` | Secondary fill |
| `--diagram-clay` | `#8a5a4a` | Accent stroke |
| `--diagram-clay-soft` | `#f3e9e5` | Accent fill |
| `--diagram-ochre` | `#866a32` | Highlight stroke |
| `--diagram-ochre-soft` | `#f4eddd` | Highlight fill |
| `--diagram-plum` | `#6b5572` | Alternate stroke |
| `--diagram-plum-soft` | `#efe8f1` | Alternate fill |
| `--diagram-teal` | `#3f6f70` | Alternate stroke |
| `--diagram-teal-soft` | `#e3efef` | Alternate fill |
| `--diagram-ink` | `#2b2b2b` | Text and strong strokes |
| `--diagram-grid` | `#d8d8d8` | Grids and guides |

Rules:

- Use one primary color per diagram, with a second color only to mark a distinct state or path.
- Fills are always light; strokes and labels are always dark. Never use a dark fill behind body-sized text.
- Do not use color as the only distinction between two series. Add a pattern, a dashed stroke, a shape, or a direct label.
- Check every diagram in grayscale. If two elements merge, the diagram is not finished.
- SVG diagrams are loaded as images in the PDF, so they cannot read page CSS variables. Use the literal palette values above in the SVG.

## Structure

### Front matter

1. Cover (generated from `book.config.ts`)
2. Title page
3. Copyright
4. Table of contents
5. Preface

### Parts and chapters

- A part opens on a new page with a large Roman numeral and the part title. The running head is suppressed on part-title pages.
- Every chapter opens on a new page.
- The chapter label (`Chapter 1`) is set in Barlow Condensed, uppercase, muted gray.
- The chapter title is the largest text on the page.
- The summary is set in Minion Pro, italic, with a hairline below it.
- The chapter body follows the layout rules above.
- Sections use `##`; subsections use `###`. Do not use `#` in chapter Markdown.

### Back matter

- Use `kind: references` for the reference list. It is single-column, unnumbered, and included in the table of contents.
- A references chapter may use `##` for thematic groups. Those headings are numbered like any other section; if numbering is not wanted, use `###` or a definition list instead.
- Do not invent a citation style inside the chapter. Use footnotes for short asides and a consistent author–year or numeric list in the references chapter.

### Table of contents

- Part names are uppercase, muted gray labels.
- Entries show the chapter number (when there is one), title, a dotted leader, and the page number.
- References entries have no chapter number.
- Page numbers are generated by Paged.js `target-counter`. On screen they are hidden.
- The TOC is excluded from the EPUB TOC itself; the EPUB navigation is generated by the EPUB writer.

## Numbering

- **Sections:** top-level `##` headings are numbered 1, 2, 3, … within each chapter. `###` and `h4` headings are unnumbered.
- **Display equations:** numbered (1), (2), … within each chapter. The number is set flush right on the equation line.
- **Figures:** numbered Figure *chapter*.*n* (for example, Figure 1.2). The number is bold, followed by the caption.
- **Tables:** use chapter-based numbering when a table is captioned. Keep table numbering consistent with figures.
- **Notes:** numbered 1, 2, 3, … within each chapter, at the page bottom.

Numbers are generated by the build, not typed by the writer. Do not add numbers manually.

## Mathematics

- Inline math: `$...$`.
- Display math: `$$...$$` on its own lines.
- Use the macros in `book.config.ts` (`\N`, `\Z`, `\R`, `\bigO`, `\dp`, `\dist`, `\argmax`, `\argmin`, `\mod`, `\gcd`, `\eps`).
- Do not use `\text{}` for multi-word math if a macro or `\operatorname{}` is clearer.
- Display equations stay inside the column and may scroll horizontally on narrow screens. They must not overflow the print measure.
- In HTML and PDF, math is rendered as KaTeX HTML. In EPUB, math is rendered as MathML.
- Do not put a display equation inside a table cell or a code block.

## Figures

### SVG and raster images

- Store chapter figures next to the chapter in `figures/`.
- Use descriptive alt text and an optional title. The title becomes the caption.
- Prefer SVG for diagrams, line art, and anything with text. Use PNG or JPEG only for photographs or textures.
- Do not use external image URLs in the manuscript. The build must be reproducible offline.
- Figures are centered, never floated, and are kept with their captions (`break-inside: avoid`).
- Figures default to column width. Use a `::: wide` block only when the diagram genuinely needs the full measure.
- If a diagram is unreadable at column width, simplify it, split it into two figures, or replace it with a table before reaching for `::: wide`.

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

## Notes

Notes are part of the editorial voice, not decoration. They have a run-in label and no container, background, or icon. The label begins the first paragraph: **Theorem.** *Every range sum can be answered in constant time.*

| Note | Purpose | Body |
| --- | --- | --- |
| `definition` | Introduce a term or formal object | Italic |
| `theorem` | State a claim that is proved or justified | Italic |
| `example` | Work a concrete case | Upright |
| `note` | Add context that is useful but not essential | Upright |
| `tip` | Give practical advice or a shortcut | Upright |
| `warning` | Warn about a common mistake or a constraint | Upright |
| `complexity` | State time and memory costs | Upright |

Syntax:

```md
::: definition Prefix sums
The prefix-sum array is ...
:::
```

The text after the note name is an optional custom title. If omitted, the default label is used.

Notes flow inside the column. A note that belongs to a single argument should stay near that argument; do not use notes as a substitute for paragraph structure. Do not nest notes.

## 6. Layout Decision Quick Reference

For any element in the manuscript, apply the following decision process:

1. Is the element wide code, a large table, or a complex diagram?
   - Yes → Use Single-Column Span mode
   - No → Continue to step 2

2. Is this body prose or a short code snippet (≤ 42 char line width)?
   - Yes → Use Two-Column mode
   - No → Re-evaluate step 1

3. For callout boxes: Does the content match the structural weight of surrounding material?
   - Inline/short notes → Two-Column
   - Key algorithms/complex topics → Single-Column Span






:    

- 































