# STYLE.md — Writing & Markup Guide for `manuscript/`

This guide governs everything written in `manuscript/`. It has two audiences:

- **You, the author** — what you may write, how, and how to leave commands for the
  scribe (the AI conversion agent).
- **The scribe** — the rules it must follow when converting a manuscript into LaTeX
  (which then produces the PDF and the website).

The chain is: **manuscript → scribe → LaTeX → (PDF, website HTML)**. Artifacts, links,
and URLs are all declared *here, in the manuscript* and *authored in LaTeX* — they are
never hand-built into the HTML. The website is generated from the LaTeX, so anything
written correctly in LaTeX appears correctly on the site.

---

## 1. The author's marks — commands to the scribe

You write the manuscript as a human, roughly, and leave **marks** where you want the
scribe to do something specific. A mark is a line starting with `%%` (invisible in
every Markdown renderer, so it never pollutes previews). The scribe obeys marks
literally, like the original writer's own hand: **marks override this guide.**

| Mark | Meaning |
| --- | --- |
| `%% scribe: <instruction>` | A command. "Add this line", "expand this into two paragraphs", "put this before the example", "rewrite this section as prose". |
| `%% add: <text>` | Insert this text **verbatim**, in your voice, at this exact position. |
| `%% add begin` … `%% add end` | The multi-line form. Everything between the fences is inserted verbatim. |
| `%% artifact: <id> \| <caption>` | Declare an interactive artifact at this position (§9). The following indented block describes what it shows and how it behaves. |
| `%% link: <text> -> <target>` | Insert a link/mention (§10). Targets: `chapter:slug`, `chapter:slug#anchor`, `pin:ch-NN-…`, or a full `https://` URL. |
| `%% qr: <pin-id>` | Force a printed QR code (in the PDF) pointing at that element. Artifacts get one automatically. |
| `%% ask: <question>` | The scribe must stop and ask you this before converting further. Never guessed around. |
| `%% todo: <note>` | Becomes a visible `\todo{…}` marker in LaTeX so it cannot be silently lost. |

Rules the scribe follows (enforced by `AGENTS.md`):

- Marks are **removed from the output**; their *effect* appears instead.
- `%% add:` text is copied **exactly** — no grammar fixes, no rewording. It is your
  sentence, not the scribe's.
- Any mark the scribe cannot fully satisfy becomes a `\todo{}` marker in the LaTeX and
  is listed in the final report. Nothing is dropped silently.
- `%% ask:` halts conversion until you answer.

### Examples

```markdown
Now the main idea: pull the minimum in constant time.

%% scribe: expand this next paragraph — I sketched it, you make it flow, but keep my
%% scribe: two-buckets metaphor exactly.

Two buckets: one for small values, one for large.

%% add: This is the trick I wish someone had shown me before my first contest.

%% artifact: ds-heap-push | A binary heap absorbing values one by one.
    Show a binary tree of 7 nodes. Insert values from a fixed array [5, 3, 8, 1]
    one at a time with a "step" control; highlight the sift-up path in ochre.
    Reader can also click a node to see its array index.

%% link: the recurrence we proved earlier -> pin:ch-02-eq-4
%% link: [CP-Algorithms on heaps](https://cp-algorithms.com) -> https://cp-algorithms.com/data_structures/heaps/
```

---

## 2. Voice — how the book sounds

- **Intuition before formality.** Say what problem an idea solves and *why*, before
  Big-$O$ proofs or implementation detail.
- **First person plural.** "We sort the array", "we can do better". Direct address is
  welcome: "Notice that…", "Let's see what happens when…".
- **The scribe is your pen, not your co-author.** It polishes grammar and flow; it does
  not replace your metaphors, mental models, or ordering with generic textbook prose.
  Where the manuscript is rough, it writes *as you* would after a good night's sleep —
  not as an encyclopedia.
- **Concrete anchors.** Pair abstract bounds with reality: "For $n = 10^5$, an
  $O(n^2)$ approach does about $10^{10}$ operations — well over the 1-second limit."
- **One idea per paragraph.** If a paragraph needs an "and also…", it is two
  paragraphs.

## 3. Paragraphs and flow

- 2–5 sentences per paragraph. Longer only for a continuous derivation.
- The first paragraph after any heading, figure, equation, note, or code block is
  short — it re-grounds the reader.
- Use prose for reasoning and connected ideas; use a list only for genuinely
  enumerable things (steps of a protocol, properties of a structure). Never write a
  paragraph as a bullet list disguised with periods.
- Lead-ins to lists get a colon and a bold lead-in only when the list is a named set
  of rules (see §5).
- Do not open consecutive paragraphs with the same word. Vary sentence length; if
  every sentence is 25 words, the reader drowns.

## 4. Structure

- Frontmatter carries the chapter identity (`title`, `slug`, `part`, `order`,
  `number`, `kind`, `status`, `summary`) — see `manuscript/_TEMPLATE/index.md`.
- `##` for sections, `###` for subsections. **Never `#`** — the chapter title comes
  from the frontmatter.
- Headings are short and noun-like ("Two pointers", not "Now let us talk about the
  two pointers technique"). The scribe never invents or renames headings unless a
  `%% scribe:` mark says so.
- Every chapter: at least one worked example and at least one exercise (an `::: example`
  titled "Exercise N"). A chapter that states a theorem owes the reader a proof or an
  honest "proof sketch".

## 5. Emphasis — bold and italic

Bold and italic are **structural signals, not decoration**. This section is the usage
policy; the values (sizes, weights, families) live in `design/FONTS.md`.

**Bold — use for:**

- The run-in label of a note (**Theorem.**, **Warning.**) — generated by the scribe;
  you never type it.
- A term at its point of definition, once per chapter, when it is the subject of the
  sentence: a **max-heap** is a heap whose parent dominates its children.

**Do not bold:** whole sentences, headings, code, "important" reminders.

**Italic — use for:**

- Emphasis of a single word for contrast: *not* the minimum — the *second* minimum.
- Book and paper titles; foreign phrases on first use (*a priori*).
- The chapter `summary` (frontmatter).

**Do not italicize:** long passages, code, headings, warnings. Italic is a signal,
not a texture. If two ideas in one sentence both need bold + italic, rewrite.

## 6. Callouts — the seven notes, and when *not* to use them

Notes render with a run-in bold label and **no box, background, or icon**. They are
part of the editorial voice.

| Note | Use when | Do **not** use when |
| --- | --- | --- |
| `::: definition` | Introducing a term or formal object, once per term | The term is already defined (link back instead) |
| `::: theorem` | A claim that is proved or justified in the chapter | It is a hunch — use `note` |
| `::: example` | A worked case, or an exercise | It is merely an illustration of prose — integrate it |
| `::: note` | Context that is useful but skippable | The text belongs in the argument |
| `::: tip` | A practical shortcut, contest habit, or heuristic | It is required understanding — that is body text |
| `::: warning` | A pitfall that costs WA/RE/TLE (overflow, off-by-one, bounds) | It is generic advice ("think carefully") |
| `::: complexity` | Stating time/memory costs of the thing just built | Complexity is already visible in surrounding prose |

Discipline:

- **Density:** roughly one note per 2–3 pages of prose. If a draft has five `::: tip`
  blocks in a row, most of them are body text wearing a costume — promote them back
  into paragraphs (or ask via `%% ask:`).
- **No nesting.** A note never contains another note, display math gets its own line
  outside the note, code goes in code blocks not notes.
- **No bold/italic inside theorem and definition bodies** — the scribe sets the body
  in italic already.
- Every note earns its label: if removing the note loses nothing the reader needed,
  it should not exist.
- Syntax: `::: definition Prefix sums` … `:::` — the text after the name is an
  optional custom title.

## 7. Mathematics

- Inline math `$…$` for symbols inside sentences: $O(n\log n)$, $a_i$, $n \le 10^5$.
- Display math `$$…$$` on its own lines for anything that must be read as an object:
  derivations, recurrences, numbered identities. Display equations are numbered
  automatically — never type equation numbers.
- Multiline derivations use `$$ \begin{aligned} … \end{aligned} $$`. One aligned
  environment per logical step-group; don't dump a page of algebra in one block.
- Macros from `book.config.ts` are available (`\bigO`, `\dp`, `\dist`, `\argmax`, …).
  Use them; do not re-spell `\mathcal{O}`.
- Never put display math in a table cell, code block, or note. Inline math inside a
  note's single-line body is fine.

## 8. Code

- Always fence with a language: ```` ```cpp ````, `python`, `bash`, `json`, `md`.
- Keep lines ≤ 88 characters; prefer ≤ 42 so code sits inside a print column. Beyond
  42, the scribe widens the block automatically; beyond 88, rewrite it.
- Comments mark the important line; they do not narrate every line.
- Modern, concise C++ (C++11/17): `std::vector`, `std::pair`, brief names. Code must
  be self-contained enough to compile.
- No pseudocode mixed with real code in the same block. Pseudocode is prose + math,
  or a `text` fence, clearly chosen.

## 9. Artifacts — interactive visuals

An **artifact** is an interactive component that lives on the website (animated data
structure, step-through, draggable graph). The PDF cannot run it — so the PDF shows a
**static fallback image plus an "Interactive companion" note and a QR code** pointing
at the exact element on the site.

**You never write artifacts for the web directly.** You declare them with a mark, and
they are authored in LaTeX; the website is generated from that LaTeX:

```markdown
%% artifact: prefix-sum-grid | Prefix sums built step by step.
    Show a 1×8 array and its prefix-sum row filling in left to right.
    A "step" control advances one cell; the current cell is ochre, the
    accumulated sum pulses. Below, the same thing as a running pointer
    on a number line. Must read correctly in grayscale.
```

Rules:

- `id` is lowercase-kebab, stable, and descriptive — it becomes part of the
  pinpoint URL (`?p=ch-03-art-prefix-sum-grid`).
- The indented description must be **concrete**: what the reader sees initially, what
  interaction exists, what colors/states mean. This text is the component
  specification; vague descriptions get bounced back via `%% ask:`.
- If you already have a static image for the fallback, say so:
  `%% artifact: <id> | <caption>` then `fallback: figures/prefix-sum-static.png` as
  the first line of the description. Otherwise the scribe plans the fallback from the
  description and flags it as `\todo{artifact fallback: …}`.
- The scribe emits a LaTeX `artifact` environment and **nothing else**: no HTML, no
  JavaScript, no component files. Component registration is a separate task and
  `bun run check` fails loudly if an artifact id has no registered component — that
  failure is a to-do, not something the scribe patches over.
- One artifact per idea. If a chapter needs five artifacts, most of those ideas
  should be figures.

## 10. Links, URLs, and pinpoint references

The site deep-links to any display equation, note, figure, or artifact via stable ids
(`ch-03-eq-4`, `ch-03-note-2`, `ch-03-art-prefix-sum-grid` — ARCHITECTURE.md §9).

- **To another chapter:** `[prefix sums](chapter:dummy)` — rendered as a proper
  cross-reference in print and a link on the site.
- **To a place inside a chapter:** `[who this book is for](chapter:preface#who-this-book-is-for)`.
- **To a pinpoint (equation, note, artifact, figure):** a `%% link` mark with a
  `pin:` target — `%% link: the recurrence we proved -> pin:ch-02-eq-4`. In LaTeX this
  becomes `\pinref`; on the web, a normal URL the reader can hover-pin and copy.
- **External URLs:** ordinary Markdown links are fine. Mentions of "visit this page"
  in print should use a `%% link` mark too, so the scribe can decide whether a QR is
  warranted (`%% qr:` forces one).
- Do not type raw pinpoint ids by hand in prose ("see ch-03-eq-4"); always route
  through a link or a `pin:` mark. Ids are derived from numbering, and numbering is
  the build's job, not yours.
- Every link earns its destination: link the *first* mention of a thing, not every
  mention.

## 11. Footnotes

- `Text.[^label]` and `[^label]: The note.` — for short asides, attributions, and
  citations that would be noise in the body.
- Footnotes are numbered automatically per chapter. Do not put anything essential in
  a footnote: if skipping it loses the thread, it is body text.

## 12. Figures and images

- Store images in the chapter's `figures/`. Reference relatively:
  `![Alt text.](figures/tree.svg "Caption.")` — the title becomes the caption.
- Prefer SVG for diagrams and anything with text; PNG/JPEG only for photos,
  screenshots, textures.
- Alt text describes the *content*, not the file ("A binary heap after three
  inserts", not "heap picture").
- `tikz` fences for diagrams better expressed as code — always with `caption` and
  `alt`.
- Every figure must be legible in grayscale and must not rely on color alone.
- Rough sketches and photos of whiteboards are welcome *as source material* — the
  scribe turns them into TikZ or a cleaner figure, but only when a `%% scribe:` mark
  asks for that conversion. Unmarked sketches are left alone.

## 13. Status and the scribe's authority

- `status: draft` / `review` → the scribe may (re)generate this chapter's LaTeX.
- `status: final` → the scribe refuses to overwrite the LaTeX without an explicit
  regeneration instruction from you.
- The scribe never edits `manuscript/`. If it believes the manuscript itself is wrong
  (contradiction, broken math), it reports the location and asks — the manuscript is
  yours.
