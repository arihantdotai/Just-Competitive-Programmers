import path from 'node:path'
import matter from 'gray-matter'
import type { BookConfig } from '../../book.config'
import type {
  BookParts,
  Chapter,
  ChapterFrontmatter,
  ChapterKind,
  ChapterLayout,
  ChapterStatus,
  Part,
} from './types'
import { slugify, stripNumericPrefix } from './util'

const KINDS: ChapterKind[] = ['chapter', 'preface', 'title', 'copyright', 'appendix']
const STATUSES: ChapterStatus[] = ['draft', 'review', 'final']
const LAYOUTS: ChapterLayout[] = ['two-column', 'single-column']

export async function discoverChapters(config: BookConfig): Promise<BookParts> {
  const manuscriptDir = path.resolve(config.manuscriptDir)
  const glob = new Bun.Glob('**/*.md')
  const files: string[] = []

  for await (const relative of glob.scan({ cwd: manuscriptDir })) {
    const segments = relative.split(path.sep)
    if (segments.some((segment) => segment.startsWith('_') || segment.startsWith('.'))) {
      continue
    }
    files.push(relative)
  }

  const chapters: Chapter[] = []
  const seenSlugs = new Map<string, string>()

  for (const relative of files.sort()) {
    const file = path.join(manuscriptDir, relative)
    const raw = await Bun.file(file).text()
    const parsed = matter(raw)
    const data = parsed.data as ChapterFrontmatter

    if (!data.title || typeof data.title !== 'string') {
      throw new Error(`${relative}: missing required frontmatter field "title"`)
    }

    const kind = (data.kind ?? 'chapter') as ChapterKind
    if (!KINDS.includes(kind)) {
      throw new Error(`${relative}: invalid kind "${kind}" (expected ${KINDS.join(', ')})`)
    }

    const status = (data.status ?? 'draft') as ChapterStatus
    if (!STATUSES.includes(status)) {
      throw new Error(`${relative}: invalid status "${status}" (expected ${STATUSES.join(', ')})`)
    }

    const defaultLayout: ChapterLayout =
      kind === 'chapter' || kind === 'appendix' ? 'two-column' : 'single-column'
    const layout = (data.layout ?? defaultLayout) as ChapterLayout
    if (!LAYOUTS.includes(layout)) {
      throw new Error(`${relative}: invalid layout "${layout}" (expected ${LAYOUTS.join(', ')})`)
    }

    const dir = path.dirname(file)
    const relativeDir = path.dirname(relative)
    const folder = path.basename(relativeDir)
    const base = path.basename(relative, '.md')
    const slug =
      data.slug ??
      slugify(base === 'index' ? stripNumericPrefix(folder) : stripNumericPrefix(base))

    if (!slug) {
      throw new Error(`${relative}: could not derive a slug; add "slug" to the frontmatter`)
    }

    const previous = seenSlugs.get(slug)
    if (previous) {
      throw new Error(`${relative}: duplicate slug "${slug}" (also used by ${previous})`)
    }
    seenSlugs.set(slug, relative)

    const part = data.part ?? (kind === 'chapter' || kind === 'appendix' ? 'Chapters' : 'Front Matter')
    const partOrder = data.partOrder ?? derivePartOrder(relativeDir, kind)
    const order = data.order ?? deriveOrder(base, folder)
    const number = data.number ?? (kind === 'chapter' ? order : undefined)

    chapters.push({
      file,
      relPath: relative,
      dir,
      slug,
      title: data.title,
      part,
      partOrder,
      order,
      number,
      kind,
      layout,
      topics: Array.isArray(data.topics) ? data.topics.map(String) : [],
      summary: data.summary ?? '',
      status,
      content: parsed.content,
      data,
    })
  }

  chapters.sort((a, b) => {
    return a.partOrder - b.partOrder || a.order - b.order || a.title.localeCompare(b.title)
  })

  const partMap = new Map<string, Part>()
  for (const chapter of chapters) {
    const key = `${chapter.partOrder}::${chapter.part}`
    let part = partMap.get(key)
    if (!part) {
      part = { title: chapter.part, order: chapter.partOrder, chapters: [] }
      partMap.set(key, part)
    }
    part.chapters.push(chapter)
  }

  const parts = [...partMap.values()].sort((a, b) => {
    return a.order - b.order || a.title.localeCompare(b.title)
  })

  return { chapters, parts }
}

export function isTocEntry(chapter: Chapter): boolean {
  return chapter.kind === 'chapter' || chapter.kind === 'preface' || chapter.kind === 'appendix'
}

export function tocEntries(parts: Part[]): Chapter[] {
  return parts.flatMap((part) => part.chapters.filter(isTocEntry))
}

export function chapterLabel(chapter: Chapter): string {
  if (chapter.kind === 'appendix') return chapter.number ? `Appendix ${chapter.number}` : 'Appendix'
  if (chapter.kind === 'chapter') return chapter.number ? `Chapter ${chapter.number}` : 'Chapter'
  return ''
}

function derivePartOrder(relativeDir: string, kind: ChapterKind): number {
  if (kind === 'title' || kind === 'copyright' || kind === 'preface') return 0
  const match = relativeDir.match(/(?:^|[\\/])part-(\d+)/i)
  return match ? Number(match[1]) : 99
}

function deriveOrder(base: string, folder: string): number {
  const fromBase = base.match(/^(\d+)/)
  if (fromBase) return Number(fromBase[1])
  const fromFolder = folder.match(/^(\d+)/)
  if (fromFolder) return Number(fromFolder[1])
  return 0
}
