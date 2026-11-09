import path from "node:path";
import { select } from "@inquirer/prompts";
import { createServer } from "vite";
import config from "../book.config";
import { chapterLabel, discoverChapters } from "./lib/chapters";
import { parseArgs } from "./lib/util";

const args = parseArgs();
const wantsAll = args.flags.has("all");
let chapterSlug = args.options.get("chapter") ?? args.positional[0];

const { chapters } = await discoverChapters(config);
const selectable = chapters.filter(
  (chapter) => chapter.kind !== "title" && chapter.kind !== "copyright",
);

if (selectable.length === 0) {
  console.error(`No chapters found in ${config.manuscriptDir}/.`);
  process.exit(1);
}

if (!wantsAll && !chapterSlug) {
  chapterSlug = await select({
    message: "Which chapter do you want to preview?",
    choices: selectable.map((chapter) => {
      const label = chapterLabel(chapter);
      return {
        name: `${label ? `${label} — ` : ""}${chapter.title}`,
        value: chapter.slug,
        description: chapter.summary || chapter.relPath,
      };
    }),
  });
}

if (chapterSlug && !chapters.some((chapter) => chapter.slug === chapterSlug)) {
  console.error(`Unknown chapter "${chapterSlug}". Available chapters:`);
  for (const chapter of selectable) {
    console.error(`  ${chapter.slug.padEnd(28)} ${chapter.title}`);
  }
  process.exit(1);
}

process.env.BOOK_CHAPTER = chapterSlug ?? "";
if (wantsAll) process.env.BOOK_ALL = "1";

const server = await createServer({
  configFile: path.resolve(process.cwd(), "vite.config.ts"),
});

await server.listen();

const selected = chapters.find((chapter) => chapter.slug === chapterSlug);
console.log("");
console.log(
  wantsAll
    ? "Previewing the whole book."
    : `Previewing: ${selected ? selected.title : chapterSlug}`,
);
server.printUrls();
console.log("");

let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  await server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
