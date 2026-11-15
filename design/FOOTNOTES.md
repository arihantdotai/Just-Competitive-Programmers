# FOOTNOTES.md — Footnote and Citation Specification

How footnotes and citations work in every output. Usage guidance (what belongs in a
footnote) lives in `manuscript/STYLE.md` §11.

## 1. Placement

Notes are set at the **bottom of the page**, not at the end of the chapter:

- Source is a normal Markdown footnote: `Text.[^label]` and `[^label]: The note.`
- The build copies each note to its call site; Paged.js floats it to the `@footnote`
  area with `float: footnote`.
- Numbering restarts at 1 in each chapter; the writer never types note numbers.
- A hairline (`--rule`) separates notes from body text.

## 2. Values

| Element | Family | Size / leading | Alignment |
| --- | --- | --- | --- |
| Footnote text | Minion Pro Regular | 7.5 pt / 10 pt | Left, ragged right |
| Footnote marker | Minion Pro | superscript, body size | in text |
| Separator | — | hairline `--rule` | full measure |

## 3. Per-output behavior

| Output | Behavior |
| --- | --- |
| PDF / print | Page bottom via Paged.js `@footnote` float |
| HTML | End-of-chapter note list remains for screen readers; hidden in print |
| EPUB | Converted to endnotes (`epub:type="endnotes"` / `epub:type="endnote"`) |

## 4. Citations

- Short asides, attributions, and citations ride in footnotes.
- Full reference lists live in a `kind: references` chapter
  (e.g. `manuscript/99-references/`): single-column, unnumbered sections, included in
  the table of contents, no chapter number in the TOC entry.
- No citation style is invented inside a chapter; the references chapter owns the
  list format, and it is used consistently (numeric or author–year).
- Nothing essential goes in a footnote: if skipping it breaks the argument, it is
  body text.
