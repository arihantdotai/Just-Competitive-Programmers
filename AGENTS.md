# AGENTS.md — Manuscript → LaTeX Conversion Contract

This is the operational contract for any agent converting `manuscript/` chapters into
`latex/` chapters. The design rationale lives in `ARCHITECTURE.md`; the writing rules
and the author-marks language live in `manuscript/STYLE.md`. Read all three before
converting anything.

**One chapter per invocation.** The agent writes exactly one file:
`latex/chapters/chNN-<slug>.tex`, plus at most one `\input` line in `latex/main.tex`
when the chapter is new.

---

## 1. Hard rules

1. **Never edit `manuscript/`.** The manuscript is the author's. If it looks wrong,
   report and ask.
2. **Author marks override everything.** `%%` marks in the manuscript are commands
   from the author (`STYLE.md` §1). Obey them literally; `%% add:` text is inserted
   verbatim; `%% ask:` halts for an answer. Marks override this contract and
   `STYLE.md` alike.
3. **Write as the author, not as yourself.** Smooth grammar and flow; never replace
   the author's metaphors, examples, ordering, or voice with generic prose.
4. **Everything is authored in LaTeX.** Artifacts, cross-references, pinpoint URLs,
   QRs — all emitted as LaTeX constructs. Never produce HTML, JavaScript, or
   component files; the website is generated from the LaTeX downstream. In
   particular, artifacts are LaTeX `artifact` environments — never hand-built HTML
   blocks.
5. **Chapter files are layout-free.** No geometry, no font commands, no manual
   numbering, no page breaks, no new macro definitions. Layout belongs to
   `latex/preamble.tex` (human-owned).
6. **Idempotent and scoped.** Regenerating a chapter overwrites only that chapter's
   `.tex`. Never touch other chapters, the preamble, or `book.config.ts`. A chapter
   with `status: final` in frontmatter is not overwritten without an explicit
   regeneration instruction.
7. **Unresolved work becomes `\todo{…}`, never silence.** Any mark, figure, or
   fallback that cannot be fully satisfied is left as a visible `\todo` and listed in
   the report.
8. **Verify by compiling.** After writing the `.tex`, compile the chapter with a
   scratch wrapper (`latexmk -lualatex`) and fix all errors you introduced. Do not
   report success on a chapter that does not compile.

---

## 2. Conversion table

| Manuscript construct | LaTeX target |
| --- | --- |
| Frontmatter `title`, `number` | `\chapter[<runningTitle or title>]{<title>}\label{chap:<slug>}` |
| Frontmatter `summary` | `\chaptersummary{…}` |
| Frontmatter `part` / order | nothing in the file — ordering comes from `main.tex` |
| `##`, `###` | `\section{}`, `\subsection{}` (auto-numbered) |
| `$…$`, `$$…$$` | verbatim; macros from `book.config.ts` are already in the preamble |
| Multiline math | `$$\begin{aligned}…\end{aligned}$$` |
| `::: definition/theorem/example/note/tip/warning/complexity [Title]` | matching environment `\begin{definition}[Title] … \end{definition}` |
| Footnotes `[^x]` | `\footnote{}` (or `\footnotemark`/`\footnotetext` across environments) |
| Code fences ```` ```cpp ```` | `listings`-based environment with JetBrains Mono; > 42-char lines → wide variant |
| `::: wide` / `::: wide page` | `widestuff` / `widestuff*` full-measure environments |
| `![alt](figures/x.png "caption")` | `\fig{<path>}{<caption>}` (label `fig:…` auto) — paths stay in `manuscript/**/figures/` via `\graphicspath` |
| ```tikz fences | native TikZ verbatim (packages per `book.config.ts`) |
| `[text](chapter:slug)` | `\chapref{slug}{text}` → `\hyperref[chap:slug]{text}` |
| `[text](chapter:slug#anchor)` | `\chapref` with subsection label `\hyperref[sec:slug:anchor]{text}` |
| `%% link: text -> pin:ch-NN-…` | `\pinref[slug]{id}{text}` (site: pinpoint URL; print: `\autoref`) |
| `%% link: text -> https://…` | `\href{url}{text}`; with `%% qr:` → `\urlqr{url}` companion block |
| `%% artifact: <id> \| <caption>` + description | `\begin{artifact}{<id>}{<caption>} <fallback> \end{artifact}`; label `art:<id>` |
| `%% qr: <pin-id>` | QR companion block for that element (artifacts get one by default) |
| `%% add: …` / `%% add begin…end` | verbatim text, author's voice untouched |
| `%% scribe: …` | the commanded effect, executed in the author's voice |
| `%% ask: …` / `%% todo: …` | stop-and-ask / `\todo{…}` |
| Plain `TODO`/`FIXME` in prose | `\todo{…}` |

Anything not in this table: do not invent a target. Propose it to the author, and
until agreed, keep the construct as a `\todo{}` with the original text quoted.

## 3. Workflow

1. **Read** the manuscript chapter, `manuscript/STYLE.md`, `design/DESIGN.md`
   (voice + typography sections), and this file.
2. **Scan marks first.** Collect all `%%` directives. If any `%% ask:` exists, ask
   before converting. If a `%% scribe:` command conflicts with the content around it,
   the mark wins.
3. **Convert** section by section, in manuscript order. Handle marks at their
   position: `%% add` inserts exactly, `%% artifact` emits the environment with a
   planned fallback, `%% link`/`%% qr` emit the LaTeX linking constructs.
4. **Clean**: no `%%` marks may survive into the `.tex`; every mark is either
   satisfied or converted into a `\todo{}`.
5. **Compile** the chapter standalone with a scratch wrapper in `.latex-cache/`;
   fix errors introduced by the conversion (not preamble errors — report those).
6. **Report**: what was generated, which marks were satisfied, which became
   `\todo{}`, missing artifact components (unregistered ids), missing fallback
   images, and any compile warnings that matter (overfull boxes beyond ~10pt,
   undefined references).

## 4. Artifact handling, precisely

- Emit `\begin{artifact}{<id>}{<caption>} … \end{artifact}` with, inside:
  the static fallback (`\includegraphics` if a fallback image exists, else a
  `\fbox`-style placeholder plus `\todo{artifact fallback}`), and nothing else.
- The artifact id must match the `%% artifact` mark exactly — it becomes the
  pinpoint URL fragment (`ch-NN-art-<id>`).
- Never emit `\begin{artifact}` without a `%% artifact` mark, and never emit HTML,
  `data-` attributes, `<script>`, or component code. Registration in
  `site/artifacts/registry.ts` is a separate engineering task; the agent only flags
  the missing id in its report.
- If the description block names an existing image as `fallback:`, wire that path in.

## 5. What the agent must not do

- Rewrite, reorder, or "improve" content beyond what marks command and `STYLE.md`
  permits (grammar, flow, precision).
- Invent facts, code, complexity bounds, or citations. Rough prose may be expanded
  only from what the manuscript itself contains; anything else → `%% ask` back to
  the author (as a question in the report, not an invented sentence).
- Edit `manuscript/`, `design/`, `site/`, `scripts/`, `book.config.ts`,
  `latex/main.tex` (beyond one `\input` line for a new chapter), or the preamble.
- Convert more than the requested chapter.
- Leave TODOs silent.
