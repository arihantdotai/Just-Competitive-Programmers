# FONTS.md — Typeface Specification

Values only. Usage rules (when to use which family, emphasis policy) live in
`manuscript/_STYLE.md`. The single source of truth for font loading is
`design/css/tokens.css`; the file inventory is `design/fonts/` (+
`design/fonts/README.md` for sources and regeneration).

## 1. Families

| Role | Family | Files (design/fonts/) | Weights loaded |
| --- | --- | --- | --- |
| Display / headings | Fira Sans Condensed | `FiraSansCondensed-{Regular,Italic,Medium,SemiBold,SemiBoldItalic,Bold}.woff2` + `.ttf` | 400, 500, 600, 700 (+italic) |
| Body | Crimson Pro | `CrimsonPro-{Regular,Italic,SemiBold,SemiBoldItalic,Bold,BoldItalic}.woff2` + `.ttf` + `.otf` | 400, 600, 700 (+italic) |
| Code / mono | JetBrains Mono | `JetBrainsMono-{Regular,Italic,Medium,Bold}.woff2`, `JetBrainsMono.ttf` | 400, 500, 700 (+italic) |
| Math | KaTeX fonts | bundled by the build | — |

Fira Sans Condensed plays the role of the display face in this book; Crimson Pro is the
serif body face; JetBrains Mono is the monospace face. No fourth family without updating
this file, `design/css/tokens.css`, and the font pipeline.

## 2. Print type scale (authoritative)

| Element | Font Family | Recommended Size / Leading | Styling & Alignment |
| --- | --- | --- | --- |
| **Chapter Number & Title** | Fira Sans Condensed | 20–26 pt / 1.1 | Bold (700); title left-aligned under a full-width rule; `CHAPTER X` label (10–11 pt uppercase bold, tracked out) right-aligned above the rule. |
| **Epigraph (Chapter Quote)** | Crimson Pro Italic | 9.5 pt / 13 pt | Left-aligned beneath the chapter title; em-dash attribution indented with author accented in crimson. |
| **A-Level Heading (H1)** | Fira Sans Condensed | 15–16 pt / 1.2 | Bold (700); Title Case; generous top margin. |
| **B-Level Heading (H2)** | Fira Sans Condensed | 12.5–13.5 pt / 1.25 | SemiBold (600); Title Case. |
| **C-Level Heading (H3)** | Fira Sans Condensed | 11 pt / 1.3 | SemiBold Italic (600i) or Medium (500); Sentence case. |
| **Body Text** | Crimson Pro Regular | 10.5 pt / 13.5 pt | Weight 400; justified with hyphenation (or ragged-right for screens). *Crimson Pro runs slightly smaller than Minion Pro, so 10.5 pt matches Minion's visual 10 pt.* |
| **Inline Code** | JetBrains Mono | 8 pt (≈ `0.78em`) | Weight 400; subtle background tint optional; matches the x-height of Crimson Pro without overpowering prose. |
| **Code Blocks & Listings** | JetBrains Mono | 7.5–8 pt / 11–11.5 pt | Weight 400; left-aligned; bold (700) for literal user commands, italic for placeholders. |
| **Tables & Captions** | Fira Sans Condensed (headers) / Crimson Pro (cells) | 8.5–9 pt / 11.5 pt | Bold sans-serif column headers; numbered captions (`Table X-Y`, `Figure X-Y`) in 8.5 pt Fira Sans Condensed. |
| **Running Headers & Footers** | Fira Sans Condensed | 8 pt | Regular (400) or Medium (500); muted contrast; verso: `Page # \| Chapter`, recto: `Section \| Page #`. |
| **References / Bibliography** | Crimson Pro | 8.5–9 pt / 11.5 pt | Numbered `[1]` with hanging indent; italic titles. |

Large display titles tighten tracking: `letter-spacing: -0.015em`.

### Calibration Notes

- **Why JetBrains Mono is 7.5–8 pt:** JetBrains Mono has a notably tall x-height and wide character advance. Dropping it to **7.5–8 pt** (around `0.76–0.78em` relative to body text) keeps code blocks dense enough to avoid awkward line wrapping and makes inline code sit visually flush with Crimson Pro.
- **Why Crimson Pro is 10.5 pt:** Compared to Minion Pro, Crimson Pro has a slightly smaller optical size at `10pt`. Bumping body text to `10.5pt` with `13.5pt` leading preserves the exact same page density and readability.

## 3. Per-medium body and code sizes

| Element | Screen (HTML / website) | Print (PDF) | EPUB |
| --- | --- | --- | --- |
| Body size | 17.5 px | 10.5 pt | 1 em |
| Body leading | 1.65 | 1.285 (13.5 pt) | 1.55 |
| Code size | 0.78 em / 0.80 rem | 7.8 pt (11.2 pt) | 0.78 em |

Measure: `--measure: 68ch` for the single column. Paragraph indent:
`--paragraph-indent: 1.2em`; the first paragraph after a heading, figure, table, code
block, display equation, note, or list is not indented.

## 4. Screen size ramp (`design/css/tokens.css`)

| Token | Value | Token | Value |
| --- | --- | --- | --- |
| `--text-xs` | 0.78 rem | `--text-lg` | 1.12 rem |
| `--text-sm` | 0.90 rem | `--text-xl` | 1.30 rem |
| `--text-base` | 1 rem | `--text-2xl` | 1.55 rem |
| | | `--text-3xl` | 1.90 rem |
| | | `--text-4xl` | 2.40 rem |

## 5. Fallback stacks

| Role | Stack |
| --- | --- |
| Display | `"Fira Sans Condensed", "Arial Narrow", system-ui, sans-serif` |
| Body | `"Crimson Pro", Georgia, serif` |
| Mono | `"JetBrains Mono", ui-monospace, monospace` |
| Math | `"KaTeX_Main", "Latin Modern Math", "STIX Two Math", serif` |

Fallbacks exist for development and for EPUB systems that ignore embedded fonts; they
are not a license to use another family in source.

## 6. File management

- WOFF2 → HTML/website/PDF. TTF → embedded in EPUB. OTF → LuaLaTeX via
  `fontspec` (see `ARCHITECTURE.md` §6).
- Font binaries are generated/managed by `bun run prepare` and are not committed.
- Math is typeset by KaTeX with its own fonts; no body family is used for math.
