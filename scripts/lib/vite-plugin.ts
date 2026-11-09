import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import config from "../../book.config";
import { resolveDevImage } from "./assets";
import { chapterLabel, discoverChapters } from "./chapters";
import { renderChapter } from "./markdown";
import type { Chapter, RenderResult } from "./types";
import { escapeAttr, escapeHtml } from "./util";

const MANUSCRIPT_PREFIX = "/__book/manuscript/";
const ASSET_PREFIX = "/assets/";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export function bookDevPlugin(): Plugin {
  let server: ViteDevServer | undefined;
  let chapters: Chapter[] = [];
  let fallbackSlug: string | undefined = process.env.BOOK_CHAPTER || undefined;
  const initialAll = process.env.BOOK_ALL === "1";

  async function refreshChapters(): Promise<void> {
    const discovered = await discoverChapters(config);
    chapters = discovered.chapters;

    if (!fallbackSlug || !chapters.some((chapter) => chapter.slug === fallbackSlug)) {
      const first =
        chapters.find((chapter) => chapter.kind === "chapter") ??
        chapters.find((chapter) => chapter.kind === "preface") ??
        chapters[0];
      fallbackSlug = first?.slug;
    }
  }

  async function renderPage(url: URL): Promise<string> {
    await refreshChapters();

    const requested = url.searchParams.get("chapter") ?? undefined;
    const allParam = url.searchParams.get("all");
    const showAll = allParam === "1" || (allParam === null && initialAll);
    const selected =
      chapters.find((chapter) => chapter.slug === requested) ??
      chapters.find((chapter) => chapter.slug === fallbackSlug) ??
      chapters[0];

    if (!selected) {
      return pageShell(
        "No chapters",
        `<main class="book"><p>No chapters found in <code>${escapeHtml(
          config.manuscriptDir,
        )}</code>.</p></main>`,
      );
    }

    const visible = showAll ? chapters : [selected];
    const sections: string[] = [];

    for (const chapter of visible) {
      sections.push(await renderChapterSection(chapter));
    }

    const picker = renderPicker(selected, showAll);
    const body = `<main class="book">${picker}${sections.join("\n")}</main>`;

    return pageShell(selected.title, body);
  }

  async function renderChapterSection(chapter: Chapter): Promise<string> {
    const result: RenderResult = await renderChapter(chapter, config, {
      mathOutput: "html",
      target: "html",
      assetBase: "",
      resolveImage: (src) => resolveDevImage(src, chapter, config),
    });

    const label = chapterLabel(chapter);
    const layoutClass = chapter.layout === "single-column" ? " book-chapter--single" : "";

    return `<section class="book-chapter${layoutClass}" id="ch-${escapeAttr(chapter.slug)}" data-chapter="${escapeAttr(
      chapter.slug,
    )}" data-layout="${escapeAttr(chapter.layout)}">
  <header class="book-chapter__header">
  ${label ? `<p class="chapter-label">${escapeHtml(label)}</p>` : ""}
  <h1 class="chapter-title">${escapeHtml(chapter.title)}</h1>
  ${
    chapter.summary
      ? `<p class="chapter-summary">${escapeHtml(chapter.summary)}</p>`
      : ""
  }
  </header>
  <div class="book-chapter__body">
${result.html}
  </div>
</section>`;
  }

  function renderPicker(selected: Chapter, showAll: boolean): string {
    const options = chapters
      .map((chapter) => {
        const label = chapterLabel(chapter);
        const suffix = label ? `${label} — ` : "";
        return `<option value="${escapeAttr(chapter.slug)}"${
          chapter.slug === selected.slug ? " selected" : ""
        }>${escapeHtml(`${suffix}${chapter.title}`)}</option>`;
      })
      .join("");

    return `<header class="devbar">
  <div class="devbar__group">
    <span class="devbar__brand">book dev</span>
    <label class="devbar__label" for="chapter-picker">Chapter</label>
    <select id="chapter-picker" class="devbar__select">${options}</select>
    <a class="devbar__link" href="${
      showAll ? `?chapter=${encodeURIComponent(selected.slug)}` : "?all=1"
    }">${showAll ? "Single chapter" : "All chapters"}</a>
  </div>
  <span class="devbar__hint">Edit Markdown and the page reloads automatically.</span>
</header>
<script>
  document.getElementById("chapter-picker")?.addEventListener("change", (event) => {
    const value = event.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set("chapter", value);
    url.searchParams.delete("all");
    window.location.assign(url);
  });
</script>`;
  }

  async function serveFile(
    res: import("node:http").ServerResponse,
    filePath: string,
  ): Promise<boolean> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) return false;

    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", CONTENT_TYPES[ext] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(Buffer.from(await file.arrayBuffer()));
    return true;
  }

  async function handleAsset(
    pathname: string,
    res: import("node:http").ServerResponse,
  ): Promise<boolean> {
    const relative = pathname.slice(ASSET_PREFIX.length);

    if (relative.startsWith("fonts/")) {
      const name = relative.slice("fonts/".length);
      const designFont = path.join(config.designDir, "fonts", name);
      if (await Bun.file(designFont).exists()) return serveFile(res, designFont);
      return serveFile(res, path.resolve("node_modules/katex/dist/fonts", name));
    }

    if (relative === "katex.min.css") {
      return serveFile(res, path.resolve("node_modules/katex/dist/katex.min.css"));
    }

    if (["tokens.css", "book.css", "print.css"].includes(relative)) {
      return serveFile(res, path.join(config.designDir, relative));
    }

    return false;
  }

  return {
    name: "book-dev",
    apply: "serve",
    configureServer(devServer) {
      server = devServer;

      devServer.watcher.add([
        path.resolve(config.manuscriptDir),
        path.resolve(config.designDir),
      ]);

      devServer.watcher.on("all", (event, file) => {
        if (!["add", "change", "unlink"].includes(event)) return;
        const normalized = file.split(path.sep).join("/");
        if (
          normalized.includes("/manuscript/") ||
          normalized.includes("/design/") ||
          normalized.endsWith("book.config.ts")
        ) {
          server?.ws.send({ type: "full-reload" });
        }
      });

      devServer.middlewares.use(async (req, res, next) => {
        try {
          const url = new URL(req.url ?? "/", "http://localhost");
          const pathname = decodeURIComponent(url.pathname);

          if (pathname === "/" || pathname === "/index.html") {
            const html = await renderPage(url);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(html);
            return;
          }

          if (pathname.startsWith(ASSET_PREFIX)) {
            if (await handleAsset(pathname, res)) return;
            next();
            return;
          }

          if (pathname.startsWith(MANUSCRIPT_PREFIX)) {
            const relative = pathname.slice(MANUSCRIPT_PREFIX.length);
            const root = path.resolve(config.manuscriptDir);
            const filePath = path.resolve(root, relative);

            if (filePath !== root && !filePath.startsWith(root + path.sep)) {
              res.statusCode = 403;
              res.end("Forbidden");
              return;
            }

            if (await serveFile(res, filePath)) return;
            res.statusCode = 404;
            res.end("Not found");
            return;
          }

          next();
        } catch (error) {
          const stack = error instanceof Error ? error.stack ?? error.message : String(error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(
            pageShell(
              "Render error",
              `<main class="book"><h1>Render error</h1><pre>${escapeHtml(
                stack,
              )}</pre></main>`,
            ),
          );
        }
      });
    },
  };
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/assets/katex.min.css">
  <link rel="stylesheet" href="/assets/tokens.css">
  <link rel="stylesheet" href="/assets/book.css">
  <link rel="stylesheet" href="/assets/print.css" media="print">
  <style>
    .devbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin: -48px -28px 2.5rem;
      padding: 0.6rem 1rem;
      background: rgba(255, 253, 248, 0.94);
      border-bottom: 1px solid var(--rule);
      backdrop-filter: blur(8px);
      font-family: var(--font-body);
      font-size: 0.82rem;
    }
    .devbar__group { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
    .devbar__brand {
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--accent);
    }
    .devbar__label { color: var(--ink-muted); }
    .devbar__select {
      max-width: 30rem;
      padding: 0.3rem 0.45rem;
      border: 1px solid var(--rule-strong);
      border-radius: 4px;
      background: var(--paper);
      color: var(--ink);
      font: inherit;
    }
    .devbar__link { color: var(--accent); }
    .devbar__hint { color: var(--ink-muted); }
    @media (max-width: 640px) { .devbar { margin: -28px -18px 2rem; } .devbar__hint { display: none; } }
  </style>
  <script type="module" src="/@vite/client"></script>
</head>
<body class="book">
${body}
</body>
</html>`;
}
