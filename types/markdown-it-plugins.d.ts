declare module 'markdown-it-container' {
  import type MarkdownIt from 'markdown-it'
  import type Token from 'markdown-it/lib/token.mjs'

  interface ContainerOptions {
    validate?: (params: string) => boolean
    render?: (tokens: Token[], index: number, options: MarkdownIt.Options, env: unknown) => string
    marker?: string
  }

  const container: (md: MarkdownIt, name: string, options?: ContainerOptions) => void
  export default container
}

declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it'
  const footnote: (md: MarkdownIt) => void
  export default footnote
}

declare module 'markdown-it-deflist' {
  import type MarkdownIt from 'markdown-it'
  const deflist: (md: MarkdownIt) => void
  export default deflist
}
