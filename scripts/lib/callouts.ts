import container from 'markdown-it-container'
import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import { escapeHtml } from './util'

interface NoteMeta {
  label: string
  italic?: boolean
}

/**
 * Notes are part of the running text. They have a run-in label and no
 * container, background, or icon. Theorem and definition bodies are italic;
 * every other note is upright.
 */
const NOTES: Record<string, NoteMeta> = {
  theorem: { label: 'Theorem', italic: true },
  definition: { label: 'Definition', italic: true },
  example: { label: 'Example' },
  note: { label: 'Note' },
  tip: { label: 'Tip' },
  warning: { label: 'Warning' },
  complexity: { label: 'Complexity' },
}

export const CALLOUT_NAMES = Object.keys(NOTES)

function withPeriod(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.?!:]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

export function calloutsPlugin(md: MarkdownIt): void {
  for (const [name, meta] of Object.entries(NOTES)) {
    md.use(container, name, {
      render(tokens: Token[], index: number): string {
        const token = tokens[index]

        if (token.nesting === -1) return '</aside>\n'

        const info = token.info.trim()
        const customTitle = info.slice(name.length).trim()
        const label = escapeHtml(withPeriod(meta.label))
        const title = customTitle
          ? ` <span class="note__title">${escapeHtml(withPeriod(customTitle))}</span>`
          : ''
        const labelMarkup = `<span class="note__label">${label}</span>${title} `
        const className = `note note--${name}${meta.italic ? ' note--italic' : ''}`

        // Run the label into the first paragraph of the note. If the note
        // starts with a block (for example display math), fall back to a
        // separate label paragraph so nothing is lost.
        const paragraph = tokens[index + 1]
        const inline = tokens[index + 2]
        if (paragraph?.type === 'paragraph_open' && inline?.type === 'inline') {
          inline.children ??= []
          inline.children.unshift({
            type: 'html_inline',
            content: labelMarkup,
          } as Token)
          return `<aside class="${className}" role="note">\n`
        }

        return (
          `<aside class="${className}" role="note">\n` +
          `<p class="note__title">${labelMarkup}</p>\n`
        )
      },
    })
  }
}
