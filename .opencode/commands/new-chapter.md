---
description: Scaffold a new chapter from the book template
agent: book-writer
---

Create a new chapter in `manuscript/` for: $ARGUMENTS

Steps:

1. Read `design/DESIGN.md`, `book.config.ts`, and `manuscript/_TEMPLATE/index.md`.
2. Choose the correct part directory. If it does not exist, create it using `part-<n>-<slug>/`. Ask only if the part is genuinely ambiguous.
3. Create `<nn>-<chapter-slug>/index.md` with valid frontmatter. Derive the slug from the title unless the user provided one. Set `status: draft`, a one-sentence `summary`, and 2–5 `topics`.
4. Write a complete first draft with `##` sections, at least one worked example, one callout, and one exercise. Use KaTeX for mathematics. Add a TikZ or SVG figure only if it clarifies the idea.
5. If you add an image, place it in `figures/` next to the chapter and reference it relatively.
6. Run `bun run lint:content` and fix any errors or warnings caused by the new chapter.
7. Report the files created and the chapter slug.

Do not edit `scripts/`, `design/`, `book.config.ts`, or `package.json`.
