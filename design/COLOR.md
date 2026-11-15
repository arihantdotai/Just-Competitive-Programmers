# COLOR.md — Palette Specification

Values only. The single source of truth is `design/css/tokens.css` — if a value here and
there differ, `design/css/tokens.css` wins and this file is stale. Usage rules (what may be bold,
how diagrams are composed) live in `manuscript/_STYLE.md` and `ARCHITECTURE.md`.

## 1. Core tokens

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
| `--accent-soft` | `#f2f2f2` | Subtle accent surface |
| `--accent-ink` | `#111111` | Accent text |
| `--warning` | `#7a4a00` | Tips and warnings (text) |
| `--warning-soft` | `#f7f1e6` | Warning surface |
| `--danger` | `#8a1f1f` | Errors, hard warnings (text) |
| `--danger-soft` | `#f8eded` | Danger surface |
| `--note` | `#333333` | Neutral note text |
| `--note-soft` | `#f3f3f3` | Neutral note surface |

## 2. Rules

- Body text is always `--ink` on `--paper`. No pure black `#000000` for body copy.
- Links are near-black with a visible underline. No blue.
- Semantic colors (`--warning`, `--danger`) are muted; they support a label and never
  replace one.
- Color alone never conveys meaning.
- Dark mode (website) is a second variable set under `:root[data-theme="dark"]` in
  `design/css/tokens.css`; type sizes and leading do not change between themes.

## 3. Diagram palette

Soft fills, dark strokes, deliberately desaturated so diagrams read as part of the
page.

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

- One primary color per diagram; a second color only to mark a distinct state or path.
- Fills are always light; strokes and labels always dark. No dark fill behind
  body-sized text.
- Color is never the only distinction between two series — add a pattern, dashed
  stroke, shape, or direct label.
- Every diagram must pass a grayscale check.
- SVG diagrams are loaded as images (they cannot read CSS variables), so they use the
  literal hex values above. Artifacts (website, code-driven) read the CSS variables and
  therefore follow dark mode automatically.
