import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..')
const outDir = path.join(root, 'design', 'fonts')

const fontsource = path.join(root, 'node_modules', '@fontsource')

const woff2: Array<[string, string]> = [
  ['dm-sans/files/dm-sans-latin-400-normal.woff2', 'DMSans-Regular.woff2'],
  ['dm-sans/files/dm-sans-latin-400-italic.woff2', 'DMSans-Italic.woff2'],
  ['dm-sans/files/dm-sans-latin-500-normal.woff2', 'DMSans-Medium.woff2'],
  ['dm-sans/files/dm-sans-latin-600-normal.woff2', 'DMSans-SemiBold.woff2'],
  ['dm-sans/files/dm-sans-latin-700-normal.woff2', 'DMSans-Bold.woff2'],
  ['funnel-display/files/funnel-display-latin-400-normal.woff2', 'FunnelDisplay-Regular.woff2'],
  ['funnel-display/files/funnel-display-latin-500-normal.woff2', 'FunnelDisplay-Medium.woff2'],
  ['funnel-display/files/funnel-display-latin-600-normal.woff2', 'FunnelDisplay-SemiBold.woff2'],
  ['funnel-display/files/funnel-display-latin-700-normal.woff2', 'FunnelDisplay-Bold.woff2'],
  ['fira-code/files/fira-code-latin-400-normal.woff2', 'FiraCode-Regular.woff2'],
  ['fira-code/files/fira-code-latin-500-normal.woff2', 'FiraCode-Medium.woff2'],
  ['fira-code/files/fira-code-latin-700-normal.woff2', 'FiraCode-Bold.woff2'],
]

const ttf: Array<[string, string]> = [
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/funneldisplay/FunnelDisplay%5Bwght%5D.ttf',
    'FunnelDisplay.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz,wght%5D.ttf',
    'DMSans.ttf',
  ],
  [
    'https://raw.githubusercontent.com/google/fonts/main/ofl/firacode/FiraCode%5Bwght%5D.ttf',
    'FiraCode.ttf',
  ],
]

async function main() {
  await mkdir(outDir, { recursive: true })

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
