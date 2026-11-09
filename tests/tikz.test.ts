import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { hashTikz, inlineTikz, materializeTikz } from '../scripts/lib/tikz'
import type { TikzFigure } from '../scripts/lib/types'

const figures: TikzFigure[] = [
  {
    hash: hashTikz('\\draw (0,0) -- (1,1);'),
    svg: '<svg class="tikz-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>',
    caption: 'A diagonal line.',
    alt: 'A diagonal line from top left to bottom right.',
    id: 'fig-test-1',
  },
]

describe('hashTikz', () => {
  test('is stable across whitespace at the edges', () => {
    expect(hashTikz('  \\draw (0,0);  ')).toBe(hashTikz('\\draw (0,0);'))
  })

  test('differs for different diagrams', () => {
    expect(hashTikz('\\draw (0,0);')).not.toBe(hashTikz('\\draw (0,1);'))
  })
})

describe('inlineTikz', () => {
  test('replaces the placeholder with accessible inline SVG', () => {
    const html = `<figure><div><!--TIKZ:${figures[0].hash}--></div></figure>`
    const result = inlineTikz(html, figures)

    expect(result).toContain('<svg role="img" aria-label="A diagonal line from top left to bottom right."')
    expect(result).toContain('class="tikz-svg"')
    expect(result).not.toContain('<!--TIKZ:')
  })

  test('drops placeholders with no matching figure', () => {
    const result = inlineTikz('<p><!--TIKZ:deadbeef--></p>', figures)
    expect(result).toBe('<p></p>')
  })
})

describe('materializeTikz', () => {
  test('writes SVG files and rewrites placeholders to file URLs', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'book-tikz-'))
    const html = `<div><!--TIKZ:${figures[0].hash}--></div>`

    try {
      const result = await materializeTikz(html, figures, dir)

      expect(result).toContain('<img src="file://')
      expect(result).toContain(`assets/tikz/${figures[0].hash}.svg`)
      expect(result).toContain('alt="A diagonal line from top left to bottom right."')

      const svg = Bun.file(
        path.join(dir, 'assets', 'tikz', `${figures[0].hash}.svg`),
      )
      expect(await svg.exists()).toBe(true)
      expect(await svg.text()).toContain('<svg')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
