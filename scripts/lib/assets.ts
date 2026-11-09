import { copyFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { BookConfig } from '../../book.config'
import type { Chapter, RenderTarget } from './types'
import { ensureDir, hashString, isExternalUrl } from './util'

const IMAGE_PATTERN = /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g

export type ImageMap = Map<string, Map<string, string>>

export async function prepareAssets(
  chapters: Chapter[],
  config: BookConfig,
): Promise<ImageMap> {
  const assetsDir = path.join(config.distDir, 'assets')
  const fontsDir = path.join(assetsDir, 'fonts')
  await ensureDir(assetsDir)
  await ensureDir(fontsDir)

  for (const file of ['tokens.css', 'book.css', 'print.css']) {
    await copyFile(path.join(config.designDir, file), path.join(assetsDir, file))
  }

  const katexDir = path.resolve('node_modules', 'katex', 'dist')
  await copyFile(path.join(katexDir, 'katex.min.css'), path.join(assetsDir, 'katex.min.css'))
  await copyDirectory(path.join(katexDir, 'fonts'), fontsDir)
  await copyDirectory(path.join(config.designDir, 'fonts'), fontsDir)

  const imageMap: ImageMap = new Map()

  for (const chapter of chapters) {
    const perChapter = new Map<string, string>()
    const usedNames = new Map<string, string>()

    for (const match of chapter.content.matchAll(IMAGE_PATTERN)) {
      const raw = match[1]
      const src = raw.startsWith('<') && raw.endsWith('>') ? raw.slice(1, -1) : raw

      if (isExternalUrl(src) || src.startsWith('file://')) continue
      if (perChapter.has(src)) continue

      const sourceFile = resolveSourceFile(src, chapter, config)
      if (!(await Bun.file(sourceFile).exists())) {
        throw new Error(`${chapter.relPath}: image not found: ${src}`)
      }

      const baseName = path.basename(sourceFile)
      let outputName = baseName
      const previousSource = usedNames.get(outputName)

      if (previousSource && previousSource !== sourceFile) {
        outputName = `${hashString(sourceFile).slice(0, 8)}-${baseName}`
      }
      usedNames.set(outputName, sourceFile)

      const relativeOutput = path.posix.join('assets', 'figures', chapter.slug, outputName)
      const outputFile = path.join(config.distDir, relativeOutput)
      await ensureDir(path.dirname(outputFile))
      await copyFile(sourceFile, outputFile)

      perChapter.set(src, relativeOutput)
    }

    imageMap.set(chapter.slug, perChapter)
  }

  return imageMap
}

export function resolveBuildImage(
  src: string,
  chapter: Chapter,
  imageMap: ImageMap,
  config: BookConfig,
  target: RenderTarget,
): string {
  if (isExternalUrl(src) || src.startsWith('file://')) return src

  const relative = imageMap.get(chapter.slug)?.get(src)
  if (!relative) {
    throw new Error(`${chapter.relPath}: unresolved image: ${src}`)
  }

  if (target === 'epub') {
    return pathToFileURL(path.join(config.distDir, relative)).href
  }

  return relative
}

export function resolveDevImage(src: string, chapter: Chapter, config: BookConfig): string {
  if (isExternalUrl(src) || src.startsWith('file://')) return src

  const relativeDir = path.posix.dirname(chapter.relPath.split(path.sep).join('/'))
  const clean = src.replace(/^\.\//, '')
  const parts = relativeDir === '.' ? [clean] : [relativeDir, clean]
  const urlPath = parts.map((part) => part.split('/').map(encodeURIComponent).join('/')).join('/')

  return `/__book/manuscript/${urlPath}`
}

function resolveSourceFile(src: string, chapter: Chapter, config: BookConfig): string {
  if (src.startsWith('/')) {
    return path.resolve(config.manuscriptDir, src.slice(1))
  }
  return path.resolve(chapter.dir, src)
}

async function copyDirectory(source: string, destination: string): Promise<void> {
  await ensureDir(destination)

  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name)
    const to = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(from, to)
    } else {
      await copyFile(from, to)
    }
  }
}
