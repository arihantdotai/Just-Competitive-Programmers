export type ChapterKind =
  | 'chapter'
  | 'preface'
  | 'title'
  | 'copyright'
  | 'appendix'
  | 'references'
export type ChapterStatus = 'draft' | 'review' | 'final'
export type ChapterLayout = 'two-column' | 'single-column'
export type MathOutput = 'html' | 'mathml'
export type RenderTarget = 'html' | 'pdf' | 'epub' | 'site'

export interface ChapterFrontmatter {
  title: string
  runningTitle?: string
  slug?: string
  part?: string
  partOrder?: number
  order?: number
  number?: number
  kind?: ChapterKind
  layout?: ChapterLayout
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
  runningTitle: string
  part: string
  partOrder: number
  order: number
  number?: number
  kind: ChapterKind
  layout: ChapterLayout
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
  /** Render `%% artifact:` marks as hydratable figures (the website). */
  artifacts?: boolean
  /** Resolve a `chapter:` link for the current target. */
  chapterHref?: (slug: string, anchor?: string) => string
  /** Resolve a `pin:` target to an href for the current target. */
  pinHref?: (pin: string) => string
}

export interface BookParts {
  chapters: Chapter[]
  parts: Part[]
}
