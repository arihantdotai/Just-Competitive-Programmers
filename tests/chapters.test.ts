import { describe, expect, test } from 'bun:test'
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
