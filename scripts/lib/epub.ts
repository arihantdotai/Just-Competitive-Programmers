import path from "node:path";
import { pathToFileURL } from "node:url";
import epub from "epub-gen-memory";
import type { Chapter as EpubChapter } from "epub-gen-memory";
import { allowedAttributes } from "epub-gen-memory/dist/lib/util/constants.js";
import type { BookConfig } from "../../book.config";
import { chapterLabel } from "./chapters";
import { materializeTikz } from "./tikz";
import type { Chapter, Part, RenderResult } from "./types";
import { escapeHtml, formatBytes } from "./util";

/**
 * epub-gen-memory sanitizes attributes against a conservative XHTML 1.1 list.
 * MathML needs a few extra attributes to survive that pass.
 */
const MATHML_ATTRIBUTES = [
  "xmlns",
  "display",
  "displaystyle",
  "scriptlevel",
  "mathvariant",
  "mathsize",
  "mathcolor",
  "mathbackground",
  "stretchy",
  "symmetric",
  "fence",
  "separator",
  "lspace",
  "rspace",
  "accent",
  "accentunder",
  "columnalign",
  "rowspacing",
  "columnspacing",
  "linethickness",
  "notation",
  "movablelimits",
  "largeop",
  "minsize",
  "maxsize",
  "form",
  "lquote",
  "rquote",
  "width",
  "height",
  "depth",
  "voffset",
  "encoding",
  "definitionurl",
  "definitionURL",
  "alttext",
  "xlink:href",
  "xmlns:epub",
];

for (const attribute of MATHML_ATTRIBUTES) {
  const list = allowedAttributes as unknown as string[];
  if (!list.includes(attribute)) list.push(attribute);
}

export interface EpubRenderOptions {
  renderChapter: (chapter: Chapter) => Promise<RenderResult>;
}

export async function buildEpub(
  chapters: Chapter[],
  parts: Part[],
  config: BookConfig,
  options: EpubRenderOptions,
): Promise<string> {
  const css = await Bun.file(path.join(config.designDir, "epub.css")).text();
  const content: EpubChapter[] = [];

  content.push({
    title: "Cover",
    filename: "cover.xhtml",
    content: renderCover(config),
    beforeToc: true,
    excludeFromToc: true,
  });

  content.push({
    title: "Title Page",
    filename: "title.xhtml",
    content: renderTitlePage(config),
    beforeToc: true,
    excludeFromToc: true,
  });

  const copyright = chapters.find((chapter) => chapter.kind === "copyright");
  if (copyright) {
    content.push({
      title: "Copyright",
      filename: "copyright.xhtml",
      content: await renderEpubChapter(copyright, config, options),
      beforeToc: true,
      excludeFromToc: true,
    });
  }

  for (const part of parts) {
    const partChapters = part.chapters.filter(
      (chapter) => chapter.kind !== "title" && chapter.kind !== "copyright",
    );

    if (partChapters.length === 0) continue;

    if (part.order > 0) {
      content.push({
        title: `Part ${roman(part.order)} — ${part.title}`,
        filename: `part-${part.order}.xhtml`,
        content: renderPart(part),
        excludeFromToc: false,
      });
    }

    for (const chapter of partChapters) {
      const label = chapterLabel(chapter);
      const html = await renderEpubChapter(chapter, config, options);

      content.push({
        title:
          chapter.kind === "preface"
            ? "Preface"
            : chapter.kind === "references"
              ? "References"
              : chapter.title,
        filename: `${chapter.slug}.xhtml`,
        content:
          `<section class="book-chapter book-chapter--single">\n` +
          `<header class="book-chapter__header">\n` +
          (label ? `<p class="chapter-label">${escapeHtml(label)}</p>\n` : "") +
          `<h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>\n` +
          (chapter.summary
            ? `<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>\n`
            : "") +
          `</header>\n` +
          `<div class="book-chapter__body">\n${html}\n</div>\n</section>`,
        excludeFromToc: false,
      });
    }
  }

  const fonts = [
    "AtkinsonHyperlegible-Regular.ttf",
    "AtkinsonHyperlegible-Italic.ttf",
    "AtkinsonHyperlegible-Bold.ttf",
    "AtkinsonHyperlegible-BoldItalic.ttf",
    "JetBrainsMono.ttf",
    "BarlowCondensed-Regular.ttf",
    "BarlowCondensed-SemiBold.ttf",
    "BarlowCondensed-Bold.ttf",
  ].map((filename) => ({
    filename,
    url: pathToFileURL(path.join(config.designDir, "fonts", filename)).href,
  }));

  const outputPath = path.join(config.distDir, "book.epub");
  const buffer = await epub(
    {
      title: config.title,
      author: config.author,
      publisher: config.publisher,
      description: config.description,
      lang: config.language,
      css,
      fonts,
      prependChapterTitles: false,
      tocTitle: "Contents",
      tocInTOC: false,
      numberChaptersInTOC: false,
      verbose: false,
    },
    content,
  );

  await Bun.write(outputPath, buffer);
  const size = (await Bun.file(outputPath).stat()).size;
  console.log(`  epub   ${path.relative(process.cwd(), outputPath)} (${formatBytes(size)})`);
  return outputPath;
}

async function renderEpubChapter(
  chapter: Chapter,
  config: BookConfig,
  options: EpubRenderOptions,
): Promise<string> {
  const result = await options.renderChapter(chapter);
  return materializeTikz(result.html, result.figures, config.distDir);
}

function renderCover(config: BookConfig): string {
  return `<section class="book-cover" id="cover">
  <p class="book-cover__eyebrow">${escapeHtml(config.edition)}</p>
  <h1 class="book-cover__title">${escapeHtml(config.title)}</h1>
  <p class="book-cover__subtitle">${escapeHtml(config.subtitle)}</p>
  <div class="book-cover__rule" aria-hidden="true"></div>
  <p class="book-cover__author">${escapeHtml(config.author)}</p>
  <p class="book-cover__edition">${escapeHtml(config.publisher)}</p>
</section>`;
}

function renderTitlePage(config: BookConfig): string {
  return `<section class="book-titlepage" id="title-page">
  <h1>${escapeHtml(config.title)}</h1>
  <p>${escapeHtml(config.subtitle)}</p>
  <p>${escapeHtml(config.author)}</p>
  <p>${escapeHtml(config.edition)} · ${escapeHtml(config.publisher)}</p>
</section>`;
}

function renderPart(part: Part): string {
  return `<section class="book-part" id="part-${part.order}">
  <p class="book-part__eyebrow">Part ${roman(part.order)}</p>
  <h1>${escapeHtml(part.title)}</h1>
</section>`;
}

function roman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = value;
  let output = "";

  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      output += numeral;
      remaining -= amount;
    }
  }

  return output;
}
