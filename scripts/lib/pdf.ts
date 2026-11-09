import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { chromium } from 'playwright'
import type { BookConfig } from '../../book.config'
import { fileExists, formatBytes } from './util'

export interface PdfOptions {
  simple?: boolean
}

export async function buildPdf(config: BookConfig, options: PdfOptions = {}): Promise<string> {
  const htmlPath = path.join(config.distDir, 'book.html')
  if (!(await fileExists(htmlPath))) {
    throw new Error('dist/book.html not found; run the HTML build first')
  }

  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      let pathname = decodeURIComponent(url.pathname)
      if (pathname === '/') pathname = '/book.html'

      const root = path.resolve(config.distDir)
      const filePath = path.resolve(root, `.${pathname}`)

      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        return new Response('Forbidden', { status: 403 })
      }

      const file = Bun.file(filePath)
      if (!(await file.exists())) return new Response('Not found', { status: 404 })
      return new Response(file)
    },
  })

  const pageUrl = `http://127.0.0.1:${server.port}/book.html`
  const outputPath = path.join(config.distDir, 'book.pdf')

  try {
    // `channel: "chromium"` uses the full browser instead of the separate
    // headless-shell build, which is not always installed alongside it.
    const browser = await chromium.launch({ headless: true, channel: 'chromium' })

    try {
      const page = await browser.newPage()
      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60_000 })
      await page.evaluate(() => document.fonts.ready)

      if (!options.simple && config.pdf.paged) {
        await page.addScriptTag({
          path: path.resolve('node_modules', 'pagedjs', 'dist', 'paged.polyfill.js'),
        })

        await page.waitForFunction(
          () => document.querySelectorAll('.pagedjs_page').length > 0,
          { timeout: 120_000 },
        )
        await page.waitForTimeout(1_500)
      }

      if (options.simple) {
        await page.pdf({
          path: outputPath,
          width: config.page.width,
          height: config.page.height,
          printBackground: config.pdf.printBackground,
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate:
            '<div style="width:100%;text-align:center;font-size:9px;color:#6f6f6f;"><span class="pageNumber"></span></div>',
          margin: parseMargin(config.page.margin),
        })
      } else {
        await page.pdf({
          path: outputPath,
          printBackground: config.pdf.printBackground,
          preferCSSPageSize: true,
        })
      }
    } finally {
      await browser.close()
    }
  } catch (error) {
    console.warn(`warning: Playwright PDF failed (${(error as Error).message}); trying headless Chromium`)
    await buildPdfWithChrome(config, pageUrl, outputPath)
  } finally {
    server.stop()
  }

  await normalizePageSize(
    outputPath,
    parseLengthToPoints(config.page.width),
    parseLengthToPoints(config.page.height),
  )

  const size = (await Bun.file(outputPath).stat()).size
  console.log(`  pdf    ${path.relative(process.cwd(), outputPath)} (${formatBytes(size)})`)
  return outputPath
}

function parseMargin(value: string): { top: string; right: string; bottom: string; left: string } {
  const [top, right = top, bottom = top, left = right] = value.trim().split(/\s+/)
  return { top, right, bottom, left }
}

function parseLengthToPoints(value: string): number {
  const match = value.trim().match(/^([\d.]+)\s*(in|mm|cm|pt|px)?$/i)
  if (!match) throw new Error(`Unsupported page length: ${value}`)

  const amount = Number(match[1])
  const unit = (match[2] ?? 'pt').toLowerCase()

  switch (unit) {
    case 'in':
      return (amount * 72)
    case 'mm':
      return (amount * 72) / 25.4
    case 'cm':
      return (amount * 72) / 2.54
    case 'px':
      return (amount * 72) / 96
    default:
      return amount
  }
}

/**
 * Chromium's print pipeline rounds fractional inch sizes, so a 9.1875in page
 * comes out as 661.92pt instead of 661.5pt. Rewrite every page box to the
 * configured trim size so the PDF matches the design contract exactly.
 */
async function normalizePageSize(
  file: string,
  width: number,
  height: number,
): Promise<void> {
  const document = await PDFDocument.load(await Bun.file(file).arrayBuffer())

  for (const page of document.getPages()) {
    page.setMediaBox(0, 0, width, height)
    page.setCropBox(0, 0, width, height)
    page.setBleedBox(0, 0, width, height)
    page.setTrimBox(0, 0, width, height)
    page.setArtBox(0, 0, width, height)
  }

  await Bun.write(file, await document.save())
}

async function buildPdfWithChrome(
  config: BookConfig,
  pageUrl: string,
  outputPath: string,
): Promise<void> {
  const executable = chromium.executablePath()
  if (!(await fileExists(executable))) {
    throw new Error(
      'Chromium is not installed. Run: bunx playwright install chromium',
    )
  }

  const process = Bun.spawn({
    cmd: [
      executable,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      `--print-to-pdf=${outputPath}`,
      '--virtual-time-budget=20000',
      pageUrl,
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await process.exited
  if (exitCode !== 0) {
    const stderr = await new Response(process.stderr).text()
    throw new Error(`headless Chromium exited with code ${exitCode}\n${stderr.trim()}`)
  }

  if (!(await fileExists(outputPath))) {
    throw new Error('headless Chromium did not produce a PDF')
  }

  console.log('  pdf    built with headless Chromium fallback (Paged.js disabled)')
}
