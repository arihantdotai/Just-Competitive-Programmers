import path from "node:path";
import config from "../book.config";
import { CALLOUT_NAMES } from "./lib/callouts";
import { discoverChapters } from "./lib/chapters";
import { isExternalUrl, parseArgs } from "./lib/util";

interface Finding {
  level: "error" | "warning";
  file: string;
  line: number;
  message: string;
}

const args = parseArgs();
const strict = args.flags.has("strict");
const findings: Finding[] = [];

const IMAGE_PATTERN =
  /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
const CHAPTER_LINK_PATTERN = /\]\(chapter:([^)\s#]+)(?:#[^)\s]*)?\)/g;
const CALLOUT_PATTERN = /^:::\s*([\w-]+)/gm;

try {
  const { chapters } = await discoverChapters(config);
  const slugs = new Set(chapters.map((chapter) => chapter.slug));
  const numbers = new Map<number, string>();

  console.log(
    `Linting ${chapters.length} chapter${chapters.length === 1 ? "" : "s"}...\n`,
  );

  for (const chapter of chapters) {
    const content = chapter.content;
    const rel = chapter.relPath;

    if (chapter.title.length > 90) {
      report("warning", rel, 1, `title is ${chapter.title.length} characters; consider shortening it`);
    }

    if (
      (chapter.kind === "chapter" || chapter.kind === "appendix") &&
      !chapter.summary
    ) {
      report("warning", rel, 1, "missing frontmatter `summary`");
    }

    if (
      (chapter.kind === "chapter" || chapter.kind === "appendix") &&
      chapter.topics.length === 0
    ) {
      report("warning", rel, 1, "missing frontmatter `topics`");
    }

    if (chapter.number !== undefined) {
      const previous = numbers.get(chapter.number);
      if (previous) {
        report(
          "error",
          rel,
          1,
          `duplicate chapter number ${chapter.number} (also used by ${previous})`,
        );
      } else {
        numbers.set(chapter.number, rel);
      }
    }

    if (chapter.status === "final" && /\b(?:TODO|FIXME|TBD)\b/.test(content)) {
      report("error", rel, 1, "status is `final` but the chapter contains TODO/FIXME/TBD");
    } else if (/\b(?:TODO|FIXME|TBD)\b/.test(content)) {
      const index = content.search(/\b(?:TODO|FIXME|TBD)\b/);
      report("warning", rel, lineOf(content, index), "unfinished marker found");
    }

    const h1 = content.match(/^#\s+/m);
    if (h1?.index !== undefined) {
      report(
        "warning",
        rel,
        lineOf(content, h1.index),
        "chapter content contains a top-level `#` heading; use `##` for sections (the chapter title is generated)",
      );
    }

    const dollarCount = (content.match(/\$\$/g) ?? []).length;
    if (dollarCount % 2 !== 0) {
      report("error", rel, 1, "unbalanced display math delimiters `$$`");
    }

    for (const match of content.matchAll(CALLOUT_PATTERN)) {
      const name = match[1];
      if (!CALLOUT_NAMES.includes(name)) {
        report(
          "warning",
          rel,
          lineOf(content, match.index ?? 0),
          `unknown callout \`:::${name}\` (known: ${CALLOUT_NAMES.join(", ")})`,
        );
      }
    }

    for (const match of content.matchAll(IMAGE_PATTERN)) {
      const raw = match[1];
      const src = raw.startsWith("<") && raw.endsWith(">") ? raw.slice(1, -1) : raw;
      if (isExternalUrl(src) || src.startsWith("file://")) continue;

      const sourceFile = src.startsWith("/")
        ? path.resolve(config.manuscriptDir, src.slice(1))
        : path.resolve(chapter.dir, src);

      if (!(await Bun.file(sourceFile).exists())) {
        report(
          "error",
          rel,
          lineOf(content, match.index ?? 0),
          `image not found: ${src}`,
        );
      }
    }

    for (const match of content.matchAll(CHAPTER_LINK_PATTERN)) {
      const slug = match[1];
      if (!slugs.has(slug)) {
        report(
          "error",
          rel,
          lineOf(content, match.index ?? 0),
          `link points to unknown chapter slug: ${slug}`,
        );
      }
    }
  }

  const errors = findings.filter((finding) => finding.level === "error");
  const warnings = findings.filter((finding) => finding.level === "warning");

  for (const finding of findings) {
    const label = finding.level === "error" ? "error  " : "warning";
    console.log(`${label} ${finding.file}:${finding.line}  ${finding.message}`);
  }

  console.log("");
  console.log(
    `${errors.length} error${errors.length === 1 ? "" : "s"}, ${
      warnings.length
    } warning${warnings.length === 1 ? "" : "s"}.`,
  );

  if (errors.length > 0 || (strict && warnings.length > 0)) {
    process.exit(1);
  }
} catch (error) {
  console.error(
    `Lint failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}

function report(
  level: Finding["level"],
  file: string,
  line: number,
  message: string,
): void {
  findings.push({ level, file, line, message });
}

function lineOf(content: string, index: number): number {
  if (index <= 0) return 1;
  return content.slice(0, index).split("\n").length;
}
