---
description: Lint the manuscript, check the toolchain, and build the book
---

Check and build the book:

1. Run `bun run lint:content`. Report every error and warning. Fix content errors only; do not edit pipeline code or design files.
2. Run `bun run doctor`. Report missing required tools, fonts, or browser binaries.
3. Run `bun run build`. If the build fails, read the stack trace, identify the failing chapter or figure, and fix the content. If the failure is in the pipeline, explain the cause and the file that needs changing instead of editing it.
4. Report the paths and sizes of `dist/book.html`, `dist/book.pdf`, and `dist/book.epub`, plus the number of errors and warnings from the lint step.

Do not commit generated output. Do not delete `dist/` unless the user asks.
