# Fonts

These files are self-hosted so the book renders identically on the web, in the PDF, and in EPUB readers that honor embedded fonts.

The font files are generated, not committed. This keeps the repository small; a fresh checkout gets them from `bun run prepare`, which runs automatically after `bun install`.

| Family | Role | Web (WOFF2) | EPUB (TTF) | PDF/Print (OTF/TTF) |
| --- | --- | --- | --- | --- |
| **Fira Sans Condensed** | Headers, display text | `FiraSansCondensed-{Regular,Italic,Medium,SemiBold,SemiBoldItalic,Bold}.woff2` | `FiraSansCondensed-{Regular,Italic,Medium,SemiBold,SemiBoldItalic,Bold}.ttf` | `FiraSansCondensed-*.ttf` |
| **Crimson Pro** | **Body text** | `CrimsonPro-{Regular,Italic,SemiBold,SemiBoldItalic,Bold,BoldItalic}.woff2` | `CrimsonPro-{Regular,Italic,SemiBold,SemiBoldItalic,Bold,BoldItalic}.ttf` | `CrimsonPro-*.otf` |
| **JetBrains Mono** | Code blocks, inline code | `JetBrainsMono-{Regular,Italic,Medium,Bold}.woff2` | `JetBrainsMono.ttf` (variable) | `JetBrainsMono.ttf` |

## Source

- **WOFF2 files**: Copied from `@fontsource` packages (`@fontsource/crimson-pro`, `@fontsource/fira-sans-condensed`, `@fontsource/jetbrains-mono`) by `bun run prepare`.
- **TTF & OTF files**: Sourced directly from official OFL repositories (Google Fonts OFL & Fonthausen/CrimsonPro).
- **JetBrains Mono**: Open source, licensed under Apache 2.0.
- **Fira Sans Condensed & Crimson Pro**: Open source, licensed under SIL Open Font License (OFL).

## Regenerating

```bash
bun run prepare
```

`bun run fonts` is kept as an alias. The script:
- Copies WOFF2 files from `node_modules/@fontsource/` to `design/fonts/`
- Fetches required TTF and OTF files for offline EPUB and LuaLaTeX / print rendering
- Cleans up legacy font sets from previous designs
- Is idempotent (safe to run multiple times)

## Usage

- `design/css/tokens.css` declares the WOFF2 `@font-face` rules for HTML and PDF.
- `design/css/epub.css` declares the TTF `@font-face` rules for EPUB.
- The build copies `design/fonts/` into `dist/assets/fonts/` for HTML/PDF and embeds the TTF files in the EPUB container.

Do not reference fonts by a remote URL. The build must work offline.
