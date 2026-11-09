import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import config from '../book.config'
import {
  chapterLabel,
  discoverChapters,
  isTocEntry,
  tocEntries,
} from '../scripts/lib/chapters'

describe('discoverChapters', () => {
  const loaded = discoverChapters(config)

  test('finds the scaffold manuscript', async () => {
    const { chapters } = await loaded
    expect(chapters.length).toBeGreaterThanOrEqual(4)
    expect(chapters.some((chapter) => chapter.slug === 'dummy')).toBe(true)
    expect(chapters.some((chapter) => chapter.slug === 'preface')).toBe(true)
  })

  test('ignores underscore-prefixed template directories', async () => {
    const { chapters } = await loaded
    expect(chapters.some((chapter) => chapter.slug.includes('template'))).toBe(false)
  })

  test('assigns unique slugs', async () => {
    const { chapters } = await loaded
    const slugs = chapters.map((chapter) => chapter.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test('sorts chapters by part then order', async () => {
    const { chapters } = await loaded
    const sorted = [...chapters].sort(
      (a, b) =>
        a.partOrder - b.partOrder ||
        a.order - b.order ||
        a.title.localeCompare(b.title),
    )
    expect(chapters.map((chapter) => chapter.slug)).toEqual(
      sorted.map((chapter) => chapter.slug),
    )
  })

  test('groups chapters into parts', async () => {
    const { parts } = await loaded
    expect(parts.length).toBeGreaterThan(0)
    expect(parts[0].order).toBe(0)
    expect(parts.every((part) => part.chapters.length > 0)).toBe(true)
  })

  test('keeps the dummy chapter frontmatter', async () => {
    const { chapters } = await loaded
    const dummy = chapters.find((chapter) => chapter.slug === 'dummy')

    expect(dummy).toBeDefined()
    expect(dummy?.kind).toBe('chapter')
    expect(dummy?.number).toBe(1)
    expect(dummy?.topics).toContain('prefix sums')
    expect(dummy?.content).toContain('## The array model')
  })
})

describe('chapter helpers', () => {
  test('labels chapters and appendices', async () => {
    const { chapters } = await discoverChapters(config)
    const dummy = chapters.find((chapter) => chapter.slug === 'dummy')!
    const preface = chapters.find((chapter) => chapter.slug === 'preface')!

    expect(chapterLabel(dummy)).toBe('Chapter 1')
    expect(chapterLabel(preface)).toBe('')
  })

  test('includes only chapter, preface, and appendix in the TOC', async () => {
    const { chapters, parts } = await discoverChapters(config)
    const entries = tocEntries(parts)

    expect(entries.every(isTocEntry)).toBe(true)
    expect(entries.some((chapter) => chapter.kind === 'copyright')).toBe(false)
    expect(entries.some((chapter) => chapter.kind === 'title')).toBe(false)
    expect(entries.length).toBeLessThanOrEqual(chapters.length)
  })
})

const tempDirs: string[] = []

async function manuscript(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ocph-chapters-'))
  tempDirs.push(dir)
  for (const [relative, content] of Object.entries(files)) {
    await Bun.write(path.join(dir, relative), content)
  }
  return dir
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('chapter layout', () => {
  test('defaults chapters and appendices to two columns, front matter to one', async () => {
    const manuscriptDir = await manuscript({
      'part-1/01-alpha/index.md': '---\ntitle: Alpha\nkind: chapter\n---\n\nBody.\n',
      'preface.md': '---\ntitle: Preface\nkind: preface\n---\n\nBody.\n',
      'appendix.md': '---\ntitle: Appendix\nkind: appendix\nnumber: 1\n---\n\nBody.\n',
    })
    const { chapters } = await discoverChapters({ ...config, manuscriptDir })
    const bySlug = new Map(chapters.map((chapter) => [chapter.slug, chapter]))

    expect(bySlug.get('alpha')?.layout).toBe('two-column')
    expect(bySlug.get('preface')?.layout).toBe('single-column')
    expect(bySlug.get('appendix')?.layout).toBe('two-column')
  })

  test('honors an explicit layout override', async () => {
    const manuscriptDir = await manuscript({
      'part-1/01-alpha/index.md':
        '---\ntitle: Alpha\nlayout: single-column\n---\n\nBody.\n',
      'part-1/02-beta/index.md':
        '---\ntitle: Beta\nkind: preface\nlayout: two-column\n---\n\nBody.\n',
    })
    const { chapters } = await discoverChapters({ ...config, manuscriptDir })
    const bySlug = new Map(chapters.map((chapter) => [chapter.slug, chapter]))

    expect(bySlug.get('alpha')?.layout).toBe('single-column')
    expect(bySlug.get('beta')?.layout).toBe('two-column')
  })

  test('rejects an unknown layout', async () => {
    const manuscriptDir = await manuscript({
      'part-1/01-alpha/index.md':
        '---\ntitle: Alpha\nlayout: three-column\n---\n\nBody.\n',
    })

    await expect(discoverChapters({ ...config, manuscriptDir })).rejects.toThrow(
      /invalid layout "three-column"/,
    )
  })
})
