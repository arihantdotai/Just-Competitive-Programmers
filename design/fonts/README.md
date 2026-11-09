# Fonts

These files are self-hosted so the book renders identically on the web, in the PDF, and in EPUB readers that honor embedded fonts.

| Family | Role | Web (WOFF2) | EPUB (TTF) |
| --- | --- | --- | --- |
| Funnel Display | Headers, display text | `FunnelDisplay-Regular.woff2`, `-Medium`, `-SemiBold`, `-Bold` | `FunnelDisplay.ttf` (variable) |
| DM Sans | Body text | `DMSans-Regular.woff2`, `-Italic`, `-Medium`, `-SemiBold`, `-Bold` | `DMSans.ttf` (variable) |
| Fira Code | Code blocks, inline code | `FiraCode-Regular.woff2`, `-Medium`, `-Bold` | `FiraCode.ttf` (variable) |

## Source

- WOFF2 files are copied from the Fontsource packages (`@fontsource/dm-sans`, `@fontsource/funnel-display`, `@fontsource/fira-code`).
- TTF files are fetched from the Google Fonts repository (`ofl/funneldisplay`, `ofl/dmsans`, `ofl/firacode`).
- All three families are licensed under the SIL Open Font License 1.1.

## Regenerating

```bash
bun run fonts
```

The script copies the WOFF2 files and downloads the variable TTF files if they are missing. It is idempotent.

## Usage

- `design/tokens.css` declares the WOFF2 `@font-face` rules for HTML and PDF.
- `design/epub.css` declares the TTF `@font-face` rules for EPUB.
- The build copies `design/fonts/` into `dist/assets/fonts/` for HTML/PDF and embeds the TTF files in the EPUB container.

Do not reference fonts by a remote URL. The build must work offline.
