import { copyFile, mkdir, rm, unlink } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..')
const outDir = path.join(root, 'design', 'fonts')

const fontsource = path.join(root, 'node_modules', '@fontsource')

const woff2: Array<[string, string]> = [
  // JetBrains Mono (code)
  [
    'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    'JetBrainsMono-Regular.woff2',
  ],
  [
    'jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2',
    'JetBrainsMono-Italic.woff2',
  ],
  [
    'jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
    'JetBrainsMono-Medium.woff2',
  ],
  [
    'jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2',
    'JetBrainsMono-Bold.woff2',
  ],

  // Fira Sans Condensed (display / headings)
  [
    'fira-sans-condensed/files/fira-sans-condensed-latin-400-normal.woff2',
    'FiraSansCondensed-Regular.woff2',
  ],
  [
    'fira-sans-condensed/files/fira-sans-condensed-latin-400-italic.woff2',
    'FiraSansCondensed-Italic.woff2',
  ],
  [
    'fira-sans-condensed/files/fira-sans-condensed-latin-500-normal.woff2',
    'FiraSansCondensed-Medium.woff2',
  ],
  [
    'fira-sans-condensed/files/fira-sans-condensed-latin-600-normal.woff2',
    'FiraSansCondensed-SemiBold.woff2',
  ],
  [
    'fira-sans-condensed/files/fira-sans-condensed-latin-600-italic.woff2',
    'FiraSansCondensed-SemiBoldItalic.woff2',
  ],
  [
    'fira-sans-condensed/files/fira-sans-condensed-latin-700-normal.woff2',
    'FiraSansCondensed-Bold.woff2',
  ],

  // Crimson Pro (body)
  [
    'crimson-pro/files/crimson-pro-latin-400-normal.woff2',
    'CrimsonPro-Regular.woff2',
  ],
  [
    'crimson-pro/files/crimson-pro-latin-400-italic.woff2',
    'CrimsonPro-Italic.woff2',
  ],
  [
    'crimson-pro/files/crimson-pro-latin-600-normal.woff2',
    'CrimsonPro-SemiBold.woff2',
  ],
  [
    'crimson-pro/files/crimson-pro-latin-600-italic.woff2',
    'CrimsonPro-SemiBoldItalic.woff2',
  ],
  [
    'crimson-pro/files/crimson-pro-latin-700-normal.woff2',
    'CrimsonPro-Bold.woff2',
  ],
  [
    'crimson-pro/files/crimson-pro-latin-700-italic.woff2',
    'CrimsonPro-BoldItalic.woff2',
  ],
]

const remoteFonts: Array<[string, string]> = [
  // JetBrains Mono
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf',
    'JetBrainsMono.ttf',
  ],

  // Fira Sans Condensed TTFs
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Regular.ttf',
    'FiraSansCondensed-Regular.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Italic.ttf',
    'FiraSansCondensed-Italic.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Medium.ttf',
    'FiraSansCondensed-Medium.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-SemiBold.ttf',
    'FiraSansCondensed-SemiBold.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-SemiBoldItalic.ttf',
    'FiraSansCondensed-SemiBoldItalic.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firasanscondensed/FiraSansCondensed-Bold.ttf',
    'FiraSansCondensed-Bold.ttf',
  ],

  // Crimson Pro TTFs (EPUB & Print)
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/ttf/CrimsonPro-Regular.ttf',
    'CrimsonPro-Regular.ttf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/ttf/CrimsonPro-Italic.ttf',
    'CrimsonPro-Italic.ttf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/ttf/CrimsonPro-SemiBold.ttf',
    'CrimsonPro-SemiBold.ttf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/ttf/CrimsonPro-SemiBoldItalic.ttf',
    'CrimsonPro-SemiBoldItalic.ttf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/ttf/CrimsonPro-Bold.ttf',
    'CrimsonPro-Bold.ttf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/ttf/CrimsonPro-BoldItalic.ttf',
    'CrimsonPro-BoldItalic.ttf',
  ],

  // Crimson Pro OTFs (LaTeX & Print quality)
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/otf/CrimsonPro-Regular.otf',
    'CrimsonPro-Regular.otf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/otf/CrimsonPro-Italic.otf',
    'CrimsonPro-Italic.otf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/otf/CrimsonPro-SemiBold.otf',
    'CrimsonPro-SemiBold.otf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/otf/CrimsonPro-SemiBoldItalic.otf',
    'CrimsonPro-SemiBoldItalic.otf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/otf/CrimsonPro-Bold.otf',
    'CrimsonPro-Bold.otf',
  ],
  [
    'https://raw.githubusercontent.com/Fonthausen/CrimsonPro/master/fonts/otf/CrimsonPro-BoldItalic.otf',
    'CrimsonPro-BoldItalic.otf',
  ],
]

const legacyFiles = [
  'DMSans-Regular.woff2',
  'DMSans-Italic.woff2',
  'DMSans-Medium.woff2',
  'DMSans-SemiBold.woff2',
  'DMSans-Bold.woff2',
  'FunnelDisplay-Regular.woff2',
  'FunnelDisplay-Medium.woff2',
  'FunnelDisplay-SemiBold.woff2',
  'FunnelDisplay-Bold.woff2',
  'FiraCode-Regular.woff2',
  'FiraCode-Medium.woff2',
  'FiraCode-Bold.woff2',
  'DMSans.ttf',
  'FunnelDisplay.ttf',
  'FiraCode.ttf',
  'BarlowCondensed-Regular.woff2',
  'BarlowCondensed-Medium.woff2',
  'BarlowCondensed-SemiBold.woff2',
  'BarlowCondensed-Bold.woff2',
  'BarlowCondensed-Regular.ttf',
  'BarlowCondensed-SemiBold.ttf',
  'BarlowCondensed-Bold.ttf',
  'AtkinsonHyperlegible-Regular.woff2',
  'AtkinsonHyperlegible-Italic.woff2',
  'AtkinsonHyperlegible-Bold.woff2',
  'AtkinsonHyperlegible-BoldItalic.woff2',
  'AtkinsonHyperlegible-Regular.ttf',
  'AtkinsonHyperlegible-Italic.ttf',
  'AtkinsonHyperlegible-Bold.ttf',
  'AtkinsonHyperlegible-BoldItalic.ttf',
]

const legacyDirs = [
  'minion-pro',
  'minion-pro-webfont',
]

async function main() {
  await mkdir(outDir, { recursive: true })

  // Clean up legacy files and directories
  for (const name of legacyFiles) {
    await unlink(path.join(outDir, name)).catch(() => undefined)
  }
  for (const dir of legacyDirs) {
    await rm(path.join(outDir, dir), { recursive: true, force: true }).catch(() => undefined)
  }

  // Copy WOFF2 fonts from node_modules/@fontsource
  for (const [from, to] of woff2) {
    const src = path.join(fontsource, from)
    const dest = path.join(outDir, to)
    await copyFile(src, dest)
    console.log(`copied  ${to}`)
  }

  // Download TTF and OTF fonts for EPUB / LaTeX / print
  for (const [url, to] of remoteFonts) {
    const dest = path.join(outDir, to)
    const existing = Bun.file(dest)
    if (await existing.exists() && (await existing.size) > 0) {
      console.log(`exists  ${to}`)
      continue
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      await Bun.write(dest, arrayBuffer)
      console.log(`fetched ${to}`)
    } catch (error) {
      console.warn(`fetch failed for ${to}, trying curl: ${(error as Error).message}`)
      try {
        const proc = Bun.spawnSync(['curl', '-fsSL', '--max-time', '30', url, '-o', dest])
        if (proc.exitCode === 0) {
          console.log(`curled  ${to}`)
        } else {
          console.warn(`warning: could not fetch ${to}: curl failed with code ${proc.exitCode}`)
        }
      } catch (curlErr) {
        console.warn(`warning: could not fetch ${to}: ${(curlErr as Error).message}`)
      }
    }
  }

  console.log(`\nFonts written to ${path.relative(root, outDir)}/`)
}

await main()
