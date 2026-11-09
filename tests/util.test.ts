import { describe, expect, test } from 'bun:test'
import {
  escapeAttr,
  escapeHtml,
  formatBytes,
  hashString,
  isExternalUrl,
  parseArgs,
  slugify,
  stripNumericPrefix,
} from '../scripts/lib/util'

describe('escapeHtml', () => {
  test('escapes the five HTML entities', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    )
  })

  test('escapeAttr is an alias', () => {
    expect(escapeAttr).toBe(escapeHtml)
  })
})

describe('slugify', () => {
  test('lowercases, strips accents, and collapses separators', () => {
    expect(slugify('  Range-Sum Queries & Prefixes  ')).toBe('range-sum-queries-prefixes')
  })

  test('removes diacritics', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume')
  })

  test('keeps numbers', () => {
    expect(slugify('Chapter 12: Fenwick Trees')).toBe('chapter-12-fenwick-trees')
  })
})

describe('stripNumericPrefix', () => {
  test('removes a leading chapter number', () => {
    expect(stripNumericPrefix('01-dummy')).toBe('dummy')
    expect(stripNumericPrefix('12_segment-trees')).toBe('segment-trees')
  })

  test('leaves unprefixed names alone', () => {
    expect(stripNumericPrefix('preface')).toBe('preface')
  })
})

describe('parseArgs', () => {
  test('parses flags, values, equals forms, and positionals', () => {
    const parsed = parseArgs([
      '--html',
      '--chapter',
      'dummy',
      '--port=5173',
      'extra',
      '--no-pdf',
    ])

    expect([...parsed.flags].sort()).toEqual(['html', 'no-pdf'])
    expect(parsed.options.get('chapter')).toBe('dummy')
    expect(parsed.options.get('port')).toBe('5173')
    expect(parsed.positional).toEqual(['extra'])
  })

  test('treats a following flag as a new flag, not a value', () => {
    const parsed = parseArgs(['--chapter', '--all'])
    expect(parsed.flags.has('chapter')).toBe(true)
    expect(parsed.flags.has('all')).toBe(true)
    expect(parsed.options.has('chapter')).toBe(false)
  })
})

describe('isExternalUrl', () => {
  test('accepts protocols, protocol-relative URLs, and data URIs', () => {
    expect(isExternalUrl('https://example.com')).toBe(true)
    expect(isExternalUrl('//example.com/x')).toBe(true)
    expect(isExternalUrl('data:image/svg+xml;base64,AAA')).toBe(true)
  })

  test('rejects relative paths', () => {
    expect(isExternalUrl('figures/array.svg')).toBe(false)
    expect(isExternalUrl('#section')).toBe(false)
  })
})

describe('formatBytes', () => {
  test('formats bytes, kilobytes, and megabytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})

describe('hashString', () => {
  test('is deterministic and sensitive to input', () => {
    expect(hashString('tikz')).toBe(hashString('tikz'))
    expect(hashString('tikz')).not.toBe(hashString('tikz '))
    expect(hashString('tikz')).toMatch(/^[a-f0-9]{64}$/)
  })
})
