import { describe, expect, test } from 'bun:test'
import { pathToFileURL } from 'node:url'
import config from '../book.config'
import {
  resolveBuildImage,
  resolveDevImage,
  type ImageMap,
} from '../scripts/lib/assets'
import type { Chapter } from '../scripts/lib/types'

const chapter: Chapter = {
  file: '/book/manuscript/part-1/01-dummy/index.md',
  relPath: 'part-1/01-dummy/index.md',
  dir: '/book/manuscript/part-1/01-dummy',
  slug: 'dummy',
  title: 'Dummy',
  part: 'Part One',
  partOrder: 1,
  order: 1,
  kind: 'chapter',
  layout: 'two-column',
  topics: [],
  summary: '',
  status: 'draft',
  content: '',
  data: { title: 'Dummy' },
}

const imageMap: ImageMap = new Map([
  ['dummy', new Map([['figures/array.svg', 'assets/figures/dummy/array.svg']])],
])

describe('resolveBuildImage', () => {
  test('returns a relative path for HTML', () => {
    expect(
      resolveBuildImage('figures/array.svg', chapter, imageMap, config, 'html'),
    ).toBe('assets/figures/dummy/array.svg')
  })

  test('returns a file URL for EPUB', () => {
    const result = resolveBuildImage(
      'figures/array.svg',
      chapter,
      imageMap,
      config,
      'epub',
    )

    expect(result).toBe(
      pathToFileURL(`${config.distDir}/assets/figures/dummy/array.svg`).href,
    )
  })

  test('passes through remote and file URLs', () => {
    expect(
      resolveBuildImage('https://example.com/a.png', chapter, imageMap, config, 'html'),
    ).toBe('https://example.com/a.png')
  })

  test('throws for an unmapped local image', () => {
    expect(() =>
      resolveBuildImage('figures/missing.svg', chapter, imageMap, config, 'html'),
    ).toThrow('unresolved image')
  })
})

describe('resolveDevImage', () => {
  test('builds a manuscript URL next to the chapter', () => {
    expect(resolveDevImage('figures/array.svg', chapter, config)).toBe(
      '/__book/manuscript/part-1/01-dummy/figures/array.svg',
    )
  })

  test('encodes spaces and removes a leading dot slash', () => {
    expect(resolveDevImage('./figures/a b.svg', chapter, config)).toBe(
      '/__book/manuscript/part-1/01-dummy/figures/a%20b.svg',
    )
  })
})
