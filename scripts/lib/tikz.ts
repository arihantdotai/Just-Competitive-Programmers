import { rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import tex2svg from 'node-tikzjax'
import type { BookConfig } from '../../book.config'
import type { Chapter, TikzFigure } from './types'
import { ensureDir, escapeAttr, escapeHtml, hashString } from './util'

let queue: Promise<unknown> = Promise.resolve()

function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function hasSystemTex(): boolean {
  return Boolean(
    Bun.which('dvisvgm') && (Bun.which('latex') || Bun.which('pdflatex')),
  )
}

export function hashTikz(source: string): string {
  return hashString(source.trim())
}

export async function renderTikz(source: string, config: BookConfig): Promise<string> {
  const hash = hashTikz(source)
  const cacheDir = path.join(config.cacheDir, 'tikz')
  const cacheFile = path.join(cacheDir, `${hash}.svg`)

  const cached = Bun.file(cacheFile)
  if (await cached.exists()) return cached.text()

  await ensureDir(cacheDir)
  const svg = await serial(() => renderUncached(source, config))
  await Bun.write(cacheFile, svg)
  return svg
}

async function renderUncached(source: string, config: BookConfig): Promise<string> {
  const backend =
    config.tikz.backend === 'auto' ? (hasSystemTex() ? 'system' : 'wasm') : config.tikz.backend

  if (backend === 'system') {
    try {
      return await renderWithSystemTex(source, config)
    } catch (error) {
      if (config.tikz.backend !== 'auto') throw error
      console.warn(
        `warning: system TikZ failed (${(error as Error).message.split('\n')[0]}); falling back to WASM`,
      )
    }
  }

  return renderWithWasm(source, config)
}

async function renderWithWasm(source: string, config: BookConfig): Promise<string> {
  const document = source.includes('\\begin{document}')
    ? source
    : `\\begin{document}\n${source}\n\\end{document}`

  const svg = await tex2svg(document, {
    showConsole: false,
    texPackages: Object.fromEntries(config.tikz.packages.map((name) => [name, ''])),
    tikzLibraries: config.tikz.libraries.join(','),
  })

  return normalizeSvg(svg)
}

async function renderWithSystemTex(source: string, config: BookConfig): Promise<string> {
  const hash = hashTikz(source)
  const tmpDir = path.join(config.cacheDir, 'tikz', `tmp-${hash}-${Date.now()}`)
  await ensureDir(tmpDir)

  const packages = config.tikz.packages.map((name) => `\\usepackage{${name}}`).join('\n')
  const libraries = config.tikz.libraries.length
    ? `\\usetikzlibrary{${config.tikz.libraries.join(',')}}`
    : ''

  const document = source.includes('\\begin{document}')
    ? source
    : `\\documentclass[border=2pt]{standalone}
\\usepackage{amsmath,amssymb}
\\usepackage{tikz}
${libraries}
${packages}
\\begin{document}
${source}
\\end{document}`

  try {
    await Bun.write(path.join(tmpDir, 'figure.tex'), document)

    const latex = Bun.which('latex')
    const pdflatex = Bun.which('pdflatex')
    const dvisvgm = Bun.which('dvisvgm')
    if (!dvisvgm || (!latex && !pdflatex)) {
      throw new Error('System TikZ backend requires latex or pdflatex, plus dvisvgm')
    }

    if (latex) {
      await runCommand(
        [latex, '-interaction=nonstopmode', '-halt-on-error', 'figure.tex'],
        tmpDir,
        'latex',
      )

      await runCommand(
        [dvisvgm, '--no-fonts', '--exact-bbox', '--output=figure.svg', 'figure.dvi'],
        tmpDir,
        'dvisvgm',
      )
    } else {
      await runCommand(
        [pdflatex!, '-interaction=nonstopmode', '-halt-on-error', 'figure.tex'],
        tmpDir,
        'pdflatex',
      )

      await runCommand(
        [
          dvisvgm,
          '--pdf',
          '--no-fonts',
          '--exact-bbox',
          '--output=figure.svg',
          'figure.pdf',
        ],
        tmpDir,
        'dvisvgm',
      )
    }

    const svg = await Bun.file(path.join(tmpDir, 'figure.svg')).text()
    return normalizeSvg(svg)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

async function runCommand(command: string[], cwd: string, label: string): Promise<void> {
  const process = Bun.spawn({
    cmd: command,
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await process.exited
  if (exitCode === 0) return

  const stderr = await new Response(process.stderr).text()
  const stdout = await new Response(process.stdout).text()
  const output = (stderr || stdout).trim().split('\n').slice(-12).join('\n')

  throw new Error(`${label} exited with code ${exitCode}\n${output}`)
}

function normalizeSvg(svg: string): string {
  return svg
    .replace(/^<\?xml[^>]*>\s*/i, '')
    .replace(/<!DOCTYPE[^>]*>\s*/i, '')
    .replace('<svg', '<svg class="tikz-svg"')
}

function parseInfo(info: string): Record<string, string> {
  const result: Record<string, string> = {}
  const pattern = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(info))) {
    result[match[1]] = match[2] ?? match[3] ?? match[4] ?? ''
  }

  return result
}

export async function extractTikz(
  markdown: string,
  chapter: Chapter,
  config: BookConfig,
): Promise<{ markdown: string; figures: TikzFigure[] }> {
  const figures: TikzFigure[] = []
  const fence = /^([ \t]*)```tikz([^\n]*)\n([\s\S]*?)^\1```[ \t]*$/gm

  let output = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fence.exec(markdown))) {
    output += markdown.slice(lastIndex, match.index)

    const info = parseInfo(match[2])
    const source = match[3].trim()
    const svg = await renderTikz(source, config)
    const figure: TikzFigure = {
      hash: hashTikz(source),
      svg,
      caption: info.caption ?? '',
      alt: info.alt ?? info.caption ?? 'TikZ diagram',
      id: info.id ?? `fig-${chapter.slug}-${figures.length + 1}`,
    }

    figures.push(figure)

    output +=
      `\n\n<figure class="book-figure book-figure--tikz" id="${escapeAttr(figure.id)}">\n` +
      `<div class="book-figure__body"><!--TIKZ:${figure.hash}--></div>\n` +
      `${figure.caption ? `<figcaption>${escapeHtml(figure.caption)}</figcaption>\n` : ''}` +
      `</figure>\n\n`

    lastIndex = fence.lastIndex
  }

  output += markdown.slice(lastIndex)
  return { markdown: output, figures }
}

export function inlineTikz(html: string, figures: TikzFigure[]): string {
  const byHash = new Map(figures.map((figure) => [figure.hash, figure]))

  return html.replace(/<!--TIKZ:([a-f0-9]+)-->/g, (_match, hash: string) => {
    const figure = byHash.get(hash)
    if (!figure) return ''

    return figure.svg.replace(
      '<svg',
      `<svg role="img" aria-label="${escapeAttr(figure.alt)}"`,
    )
  })
}

export async function materializeTikz(
  html: string,
  figures: TikzFigure[],
  outDir: string,
): Promise<string> {
  const byHash = new Map(figures.map((figure) => [figure.hash, figure]))
  const tikzDir = path.join(outDir, 'assets', 'tikz')
  await ensureDir(tikzDir)

  for (const figure of figures) {
    await Bun.write(path.join(tikzDir, `${figure.hash}.svg`), figure.svg)
  }

  return html.replace(/<!--TIKZ:([a-f0-9]+)-->/g, (_match, hash: string) => {
    const figure = byHash.get(hash)
    if (!figure) return ''

    const url = pathToFileURL(path.join(tikzDir, `${figure.hash}.svg`)).href
    return `<img src="${escapeAttr(url)}" alt="${escapeAttr(figure.alt)}" />`
  })
}
