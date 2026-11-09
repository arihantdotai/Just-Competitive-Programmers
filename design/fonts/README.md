# Fonts

These files are self-hosted so the book renders identically on the web, in the PDF, and in EPUB readers that honor embedded fonts.

The font files are generated, not committed. This keeps the repository small; a fresh checkout gets them from `bun run prepare`, which runs automatically after `bun install`.

| Family | Role | Web (WOFF2) | EPUB (TTF) | PDF/Print (OTF) |
| --- | --- | --- | --- | --- |
| **Barlow Condensed** | Headers, display text | `BarlowCondensed-Regular.woff2`, `-Medium`, `-SemiBold`, `-Bold` | `BarlowCondensed-Regular.ttf`, `-SemiBold`, `-Bold` | — |
| **Minion Pro** | **Body text** | `minion-pro-webfont/MinionPro-Regular.woff` | `minion-pro/MinionPro-Regular.otf` | `minion-pro/MinionPro-Regular.otf` |
| **JetBrains Mono** | Code blocks, inline code | `JetBrainsMono-Regular.woff2`, `-Medium`, `-Bold` | `JetBrainsMono.ttf` (variable) | — |

## Why are there two Minion Pro folders?

The book generates **three different outputs**, each requiring a different font format:

1. **EPUB** (reflowable ebook): Requires **OTF** fonts embedded in the ebook container. These are in `minion-pro/` with `.otf` extensions.

2. **HTML & PDF (Paged.js)**: Requires **WOFF2** fonts for the web build, declared in `design/tokens.css` `@font-face` rules. These are in `minion-pro-webfont/` with `.woff` extensions.

3. **Print/PDF quality**: The Paged.js PDF builder also uses the OTF files for highest-quality print output, same files as EPUB but accessed from the `minion-pro/` folder.

Having both folders ensures the build pipeline can produce all three outputs (EPUB, HTML, PDF) without relying on remote font URLs or internet connectivity during the build.

## Source

- **WOFF2 files**: Self-hosted from the build output of `bun run prepare`.
- **OTF files**: Adobe Minion Pro typeface, license required for commercial distribution.
- **JetBrains Mono**: Open source, licensed under the Apache 2.0 license.

## Regenerating

```bash
bun run prepare
```

`bun run fonts` is kept as an alias. The script:
- Copies WOFF2 files to `design/fonts/` and `dist/assets/fonts/`
- Ensures TTF/OTF files are present in `minion-pro/` and `minion-pro-webfont/`
- Removes old font sets from previous builds
- Is idempotent (safe to run multiple times)

## Usage

- `design/tokens.css` declares the WOFF2 `@font-face` rules for HTML and PDF.
- `design/epub.css` declares the TTF `@font-face` rules for EPUB.
- The build copies `design/fonts/` into `dist/assets/fonts/` for HTML/PDF and embeds the TTF/OTF files in the EPUB container.

Do not reference fonts by a remote URL. The build must work offline.
