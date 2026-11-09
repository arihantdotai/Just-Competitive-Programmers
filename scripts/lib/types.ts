export type ChapterKind = 'chapter' | 'preface' | 'title' | 'copyright' | 'appendix'
export type ChapterStatus = 'draft' | 'review' | 'final'
export type MathOutput = 'html' | 'mathml'
export type RenderTarget = 'html' | 'pdf' | 'epub'

export interface ChapterFrontmatter {
  title: string
  slug?: string
  part?: string
  partOrder?: number
  order?: number
  number?: number
  kind?: ChapterKind
  topics?: string[]
  summary?: string
  status?: ChapterStatus
  [key: string]: unknown
}

export interface Chapter {
  file: string
  relPath: string
  dir: string
  slug: string
  title: string
  part: string
  partOrder: number
  order: number
  number?: number
  kind: ChapterKind
  topics: string[]
  summary: string
  status: ChapterStatus
  content: string
  data: ChapterFrontmatter
}

export interface Part {
  title: string
  order: number
  chapters: Chapter[]
}

export interface TikzFigure {
  hash: string
  svg: string
  caption: string
  alt: string
  id: string
}

export interface RenderResult {
  html: string
  figures: TikzFigure[]
}

export interface RenderOptions {
  mathOutput: MathOutput
  target: RenderTarget
  assetBase: string
  resolveImage: (src: string) => string
}

export interface BookParts {
  chapters: Chapter[]
  parts: Part[]
}
