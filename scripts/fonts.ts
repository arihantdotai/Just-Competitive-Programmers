import { copyFile, mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..')
const outDir = path.join(root, 'design', 'fonts')

const fontsource = path.join(root, 'node_modules', '@fontsource')

const woff2: Array<[string, string]> = [
  [
    'jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2',
    'JetBrainsMono-Regular.woff2',
  ],
  [
    'jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
    'JetBrainsMono-Medium.woff2',
  ],
  [
    'jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2',
    'JetBrainsMono-Bold.woff2',
  ],
  [
    'barlow-condensed/files/barlow-condensed-latin-400-normal.woff2',
    'BarlowCondensed-Regular.woff2',
  ],
  [
    'barlow-condensed/files/barlow-condensed-latin-500-normal.woff2',
    'BarlowCondensed-Medium.woff2',
  ],
  [
    'barlow-condensed/files/barlow-condensed-latin-600-normal.woff2',
    'BarlowCondensed-SemiBold.woff2',
  ],
  [
    'barlow-condensed/files/barlow-condensed-latin-700-normal.woff2',
    'BarlowCondensed-Bold.woff2',
  ],
]

const ttf: Array<[string, string]> = [
  ['https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf', 'JetBrainsMono.ttf'],
  ['https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-Regular.ttf', 'BarlowCondensed-Regular.ttf'],
  ['https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf', 'BarlowCondensed-SemiBold.ttf'],
  ['https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf', 'BarlowCondensed-Bold.ttf'],
]

// Minion Pro WOFF2 and OTF files are already present locally in
// design/fonts/minion-pro-webfont/ and design/fonts/minion-pro/.
// They are proprietary (Adobe) and not available on @fontsource or Google Fonts.

const legacy = [
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
]

async function main() {
  await mkdir(outDir, { recursive: true })

  for (const name of legacy) {
    await unlink(path.join(outDir, name)).catch(() => undefined)
  }

  for (const [from, to] of woff2) {
    const src = path.join(fontsource, from)
    const dest = path.join(outDir, to)
    await copyFile(src, dest)
    console.log(`copied  ${to}`)
  }

  for (const [url, to] of ttf) {
    const dest = path.join(outDir, to)
    const existing = Bun.file(dest)
    if (await existing.exists()) {
      console.log(`exists  ${to}`)
      continue
    }
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      await Bun.write(dest, response)
      console.log(`fetched ${to}`)
    } catch (error) {
      console.warn(`warning: could not fetch ${to}: ${(error as Error).message}`)
    }
  }

  console.log(`\nFonts written to ${path.relative(root, outDir)}/`)
}

await main()
