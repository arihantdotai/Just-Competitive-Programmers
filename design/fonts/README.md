# Fonts

These files are self-hosted so the book renders identically on the web, in the PDF, and in EPUB readers that honor embedded fonts.

The font files are generated, not committed. This keeps the repository small; a fresh checkout gets them from `bun run prepare`, which runs automatically after `bun install`.

| Family | Role | Web (WOFF2) | EPUB (TTF) |
| --- | --- | --- | --- |
| Barlow Condensed | Headers, display text | `BarlowCondensed-Regular.woff2`, `-Medium`, `-SemiBold`, `-Bold` | `BarlowCondensed-Regular.ttf`, `-SemiBold`, `-Bold` |
| Atkinson Hyperlegible | Body text | `AtkinsonHyperlegible-Regular.woff2`, `-Italic`, `-Bold`, `-BoldItalic` | `AtkinsonHyperlegible-Regular.ttf`, `-Italic`, `-Bold`, `-BoldItalic` |
| JetBrains Mono | Code blocks, inline code | `JetBrainsMono-Regular.woff2`, `-Medium`, `-Bold` | `JetBrainsMono.ttf` (variable) |

## Source

- WOFF2 files are copied from the Fontsource packages (`@fontsource/barlow-condensed`, `@fontsource/atkinson-hyperlegible`, `@fontsource/jetbrains-mono`).
- TTF files are fetched from the Google Fonts repository (`ofl/barlowcondensed`, `ofl/atkinsonhyperlegible`, `ofl/jetbrainsmono`).
- All three families are licensed under the SIL Open Font License 1.1.

## Regenerating

```bash
bun run prepare
```

`bun run fonts` is kept as an alias. The script copies the WOFF2 files, downloads the TTF files if they are missing, and removes the old font set from previous builds. It is idempotent.

## Usage

- `design/tokens.css` declares the WOFF2 `@font-face` rules for HTML and PDF.
- `design/epub.css` declares the TTF `@font-face` rules for EPUB.
- The build copies `design/fonts/` into `dist/assets/fonts/` for HTML/PDF and embeds the TTF files in the EPUB container.

Do not reference fonts by a remote URL. The build must work offline.
