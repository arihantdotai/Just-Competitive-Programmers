import container from 'markdown-it-container'
import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import { escapeHtml } from './util'

interface CalloutMeta {
  label: string
  icon: string
}

const CALLOUTS: Record<string, CalloutMeta> = {
  theorem: { label: 'Theorem', icon: '◆' },
  definition: { label: 'Definition', icon: '▣' },
  example: { label: 'Example', icon: '▸' },
  note: { label: 'Note', icon: 'ℹ' },
  tip: { label: 'Tip', icon: '★' },
  warning: { label: 'Warning', icon: '⚠' },
  complexity: { label: 'Complexity', icon: '⏱' },
}

export const CALLOUT_NAMES = Object.keys(CALLOUTS)

export function calloutsPlugin(md: MarkdownIt): void {
  for (const [name, meta] of Object.entries(CALLOUTS)) {
    md.use(container, name, {
      render(tokens: Token[], index: number): string {
        const token = tokens[index]

        if (token.nesting === 1) {
          const info = token.info.trim()
          const customTitle = info.slice(name.length).trim()
          const title = customTitle || meta.label

          return (
            `<aside class="callout callout--${name}" role="note">\n` +
            `<p class="callout__title"><span class="callout__icon" aria-hidden="true">${meta.icon}</span>` +
            `<span>${escapeHtml(title)}</span></p>\n`
          )
        }

        return '</aside>\n'
      },
    })
  }
}
