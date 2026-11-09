import katex from 'katex'
import type MarkdownIt from 'markdown-it'
import type { MathOutput } from './types'

export interface MathPluginOptions {
  output: MathOutput
  macros?: Record<string, string>
  throwOnError?: boolean
  idPrefix?: string
}

const isSpace = (code: number): boolean =>
  code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d

function renderMath(content: string, displayMode: boolean, options: MathPluginOptions): string {
  return katex.renderToString(content, {
    displayMode,
    throwOnError: options.throwOnError ?? false,
    output: options.output,
    macros: { ...(options.macros ?? {}) },
    strict: 'ignore',
    trust: false,
  })
}

export function mathPlugin(md: MarkdownIt, options: MathPluginOptions): void {
  // Display equations are numbered per chapter. Each chapter gets a fresh
  // MarkdownIt instance, so a plugin-local counter is chapter-local.
  let equation = 0

  md.inline.ruler.after('backticks', 'math_inline', (state, silent) => {
    const start = state.pos
    const src = state.src

    if (src.charCodeAt(start) !== 0x24) return false
    if (src.charCodeAt(start + 1) === 0x24) return false

    const first = src.charCodeAt(start + 1)
    if (Number.isNaN(first) || isSpace(first)) return false

    let pos = start + 1
    while (pos < state.posMax) {
      const code = src.charCodeAt(pos)

      if (code === 0x5c) {
        pos += 2
        continue
      }

      if (code === 0x0a) return false

      if (code === 0x24) {
        const previous = src.charCodeAt(pos - 1)
        const next = src.charCodeAt(pos + 1)
        const followedByDigit = next >= 0x30 && next <= 0x39

        if (!isSpace(previous) && !followedByDigit) {
          if (!silent) {
            const token = state.push('math_inline', 'math', 0)
            token.markup = '$'
            token.content = src.slice(start + 1, pos)
          }
          state.pos = pos + 1
          return true
        }
      }

      pos += 1
    }

    return false
  })

  md.block.ruler.before(
    'paragraph',
    'math_block',
    (state, startLine, endLine, silent) => {
      const start = state.bMarks[startLine] + state.tShift[startLine]
      const lineMax = state.eMarks[startLine]

      if (start + 2 > lineMax) return false
      if (state.src.charCodeAt(start) !== 0x24) return false
      if (state.src.charCodeAt(start + 1) !== 0x24) return false

      let line = startLine
      let pos = start + 2
      let content = ''
      let found = false

      while (line < endLine) {
        const lineEnd = state.eMarks[line]
        const close = state.src.indexOf('$$', pos)

        if (close !== -1 && close + 2 <= lineEnd) {
          const after = state.src.slice(close + 2, lineEnd).trim()
          if (after) return false
          content += state.src.slice(pos, close)
          found = true
          state.line = line + 1
          break
        }

        content += state.src.slice(pos, lineEnd) + '\n'
        line += 1
        if (line < endLine) pos = state.bMarks[line] + state.tShift[line]
      }

      if (!found) return false
      if (silent) return true

      const token = state.push('math_block', 'math', 0)
      token.block = true
      token.content = content.trim()
      token.markup = '$$'
      token.map = [startLine, state.line]
      return true
    },
    { alt: ['paragraph', 'reference', 'blockquote'] },
  )

  md.renderer.rules.math_inline = (tokens, index) => {
    const token = tokens[index]
    return `<span class="math-inline">${renderMath(token.content, false, options)}</span>`
  }

  md.renderer.rules.math_block = (tokens, index) => {
    const token = tokens[index]
    equation += 1
    const body = renderMath(token.content, true, options)
    const id = options.idPrefix ? `${options.idPrefix}-equation-${equation}` : `equation-${equation}`

    return (
      `<div class="math-display" id="${id}">` +
      `<span class="math-display__body">${body}</span>` +
      `<span class="math-display__number" aria-label="Equation ${equation}">(${equation})</span>` +
      `</div>\n`
    )
  }
}
