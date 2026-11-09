import path from "node:path";
import config from "../book.config";
import { prepareAssets, resolveBuildImage } from "./lib/assets";
import { discoverChapters } from "./lib/chapters";
import { buildEpub } from "./lib/epub";
import { renderBook } from "./lib/html";
import { renderChapter as renderChapterMarkdown } from "./lib/markdown";
import { buildPdf } from "./lib/pdf";
import { ensureDir, parseArgs } from "./lib/util";

const args = parseArgs();
const requested = new Set(
  ["html", "pdf", "epub"].filter((target) => args.flags.has(target)),
);
if (args.flags.has("simple-pdf")) requested.add("pdf");
const explicit = requested.size > 0;

let doHtml = explicit ? requested.has("html") || requested.has("pdf") : config.outputs.html;
let doPdf = explicit ? requested.has("pdf") : config.outputs.pdf;
let doEpub = explicit ? requested.has("epub") : config.outputs.epub;

if (args.flags.has("no-html")) doHtml = false;
if (args.flags.has("no-pdf")) doPdf = false;
if (args.flags.has("no-epub")) doEpub = false;

if (doPdf && !doHtml) {
  console.warn("PDF output requires HTML; enabling the HTML build.");
  doHtml = true;
}

if (!doHtml && !doPdf && !doEpub) {
  console.error("Nothing to build. Use --html, --pdf, or --epub.");
  process.exit(1);
}

const started = performance.now();

try {
  await ensureDir(config.distDir);

  const { chapters, parts } = await discoverChapters(config);

  if (chapters.length === 0) {
    throw new Error(`No chapters found in ${config.manuscriptDir}/.`);
  }

  console.log(
    `Building ${chapters.length} chapter${chapters.length === 1 ? "" : "s"} from ${config.manuscriptDir}/`,
  );

  const imageMap = await prepareAssets(chapters, config);

  if (doHtml) {
    const step = performance.now();
    const html = await renderBook(chapters, parts, config, {
      target: "html",
      renderChapter: (chapter) =>
        renderChapterMarkdown(chapter, config, {
          mathOutput: "html",
          target: "html",
          assetBase: "",
          resolveImage: (src) =>
            resolveBuildImage(src, chapter, imageMap, config, "html"),
        }),
    });

    const outputPath = path.join(config.distDir, "book.html");
    await Bun.write(outputPath, html);
    console.log(
      `  html   ${path.relative(process.cwd(), outputPath)} (${seconds(step)})`,
    );
  }

  if (doPdf) {
    const step = performance.now();
    await buildPdf(config, { simple: args.flags.has("simple-pdf") });
    console.log(`  pdf    done (${seconds(step)})`);
  }

  if (doEpub) {
    const step = performance.now();
    await buildEpub(chapters, parts, config, {
      renderChapter: (chapter) =>
        renderChapterMarkdown(chapter, config, {
          mathOutput: "mathml",
          target: "epub",
          assetBase: "",
          resolveImage: (src) =>
            resolveBuildImage(src, chapter, imageMap, config, "epub"),
        }),
    });
    console.log(`  epub   done (${seconds(step)})`);
  }

  console.log(`\nBuild complete in ${seconds(started)}. Output: ${config.distDir}/`);
} catch (error) {
  console.error("\nBuild failed:");
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exit(1);
}

function seconds(from: number): string {
  return `${((performance.now() - from) / 1000).toFixed(1)}s`;
}
