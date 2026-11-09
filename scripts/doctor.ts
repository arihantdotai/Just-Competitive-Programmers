import { stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import config from "../book.config";
import { discoverChapters } from "./lib/chapters";
import { fileExists, formatBytes } from "./lib/util";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
  required: boolean;
}

const checks: Check[] = [];

async function checkFile(
  name: string,
  file: string,
  required = true,
): Promise<void> {
  const exists = await fileExists(file);
  checks.push({
    name,
    ok: exists,
    detail: exists ? path.relative(process.cwd(), file) : `missing: ${file}`,
    required,
  });
}

async function checkDirectory(
  name: string,
  directory: string,
  required = true,
): Promise<void> {
  const exists = await stat(directory)
    .then((entry) => entry.isDirectory())
    .catch(() => false);

  checks.push({
    name,
    ok: exists,
    detail: exists ? path.relative(process.cwd(), directory) : `missing: ${directory}`,
    required,
  });
}

function checkCommand(name: string, command: string, required = false): void {
  const found = Bun.which(command);
  checks.push({
    name,
    ok: Boolean(found),
    detail: found ?? `not on PATH (${command})`,
    required,
  });
}

checks.push({
  name: "Bun",
  ok: true,
  detail: `${Bun.version} (${process.platform}/${process.arch})`,
  required: true,
});

await checkFile("package.json", path.resolve("package.json"));
await checkDirectory("node_modules", path.resolve("node_modules"));
await checkFile("book.config.ts", path.resolve("book.config.ts"));

await checkFile("DM Sans (web)", path.join(config.designDir, "fonts", "DMSans-Regular.woff2"));
await checkFile(
  "Funnel Display (web)",
  path.join(config.designDir, "fonts", "FunnelDisplay-Regular.woff2"),
);
await checkFile(
  "Fira Code (web)",
  path.join(config.designDir, "fonts", "FiraCode-Regular.woff2"),
);
await checkFile("DM Sans (EPUB)", path.join(config.designDir, "fonts", "DMSans.ttf"));
await checkFile(
  "Funnel Display (EPUB)",
  path.join(config.designDir, "fonts", "FunnelDisplay.ttf"),
);
await checkFile("Fira Code (EPUB)", path.join(config.designDir, "fonts", "FiraCode.ttf"));

await checkFile(
  "KaTeX stylesheet",
  path.resolve("node_modules/katex/dist/katex.min.css"),
);
await checkFile(
  "Paged.js polyfill",
  path.resolve("node_modules/pagedjs/dist/paged.polyfill.js"),
);

const browserPath = chromium.executablePath();
const browserInstalled = await fileExists(browserPath);
checks.push({
  name: "Chromium (Playwright)",
  ok: browserInstalled,
  detail: browserInstalled
    ? browserPath
    : "not installed; run `bunx playwright install chromium`",
  required: config.outputs.pdf,
});

checkCommand("latex (optional TikZ backend)", "latex");
checkCommand("pdflatex (optional TikZ backend)", "pdflatex");
checkCommand("dvisvgm (optional TikZ backend)", "dvisvgm");

try {
  const { chapters, parts } = await discoverChapters(config);
  checks.push({
    name: "Manuscript",
    ok: chapters.length > 0,
    detail: `${chapters.length} chapter${chapters.length === 1 ? "" : "s"}, ${
      parts.length
    } part${parts.length === 1 ? "" : "s"}`,
    required: true,
  });
} catch (error) {
  checks.push({
    name: "Manuscript",
    ok: false,
    detail: error instanceof Error ? error.message : String(error),
    required: true,
  });
}

const outputs = ["book.html", "book.pdf", "book.epub"];
for (const output of outputs) {
  const file = path.join(config.distDir, output);
  const exists = await fileExists(file);
  checks.push({
    name: `Output ${output}`,
    ok: exists,
    detail: exists
      ? formatBytes((await Bun.file(file).stat()).size)
      : "not built yet",
    required: false,
  });
}

console.log("Book toolchain\n");
for (const check of checks) {
  const mark = check.ok ? "✓" : check.required ? "✗" : "·";
  console.log(`  ${mark} ${check.name.padEnd(30)} ${check.detail}`);
}

const failed = checks.filter((check) => check.required && !check.ok);

console.log("");
console.log(
  `Page size: ${config.page.width} × ${config.page.height} (${config.page.size})`,
);
console.log(`Outputs: ${config.distDir}/`);

if (failed.length > 0) {
  console.log("");
  console.log(`${failed.length} required check(s) failed.`);
  process.exit(1);
}

console.log("\nAll required checks passed.");
