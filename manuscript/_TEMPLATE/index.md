---
title: "Chapter Title"
runningTitle: "Short Running Head"   # optional; used in the print running head
slug: chapter-slug
part: Foundations
partOrder: 2
order: 1
number: 1
kind: chapter
layout: two-column
topics:
  - topic-one
  - topic-two
summary: "One or two sentences that explain what this chapter covers and why it matters."
status: draft
---

Open with the problem this chapter solves. Keep the first paragraph short. Define notation before using it, and prefer a concrete example over an abstract description.

## First section

Inline mathematics uses single dollars: $O(n \log n)$. Display mathematics uses double dollars and is numbered per chapter:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}.
$$

Use `##` for sections and `###` for subsections. `##` sections are numbered 1, 2, 3 automatically; `###` headings are unnumbered. Do not add a top-level `#` heading; the chapter title is generated from the frontmatter.

::: definition Prefix sums
The prefix-sum array of $a$ is the array $p$ with $p_i = a_0 + \dots + a_i$.
:::

::: theorem Range sums
After $\bigO(n)$ preprocessing, any range sum can be answered in $\bigO(1)$ time.
:::

::: example A worked example
Show the idea on a small input before generalizing.
:::

::: complexity
Time: $O(n \log n)$.

Memory: $O(n)$.
:::

Notes are part of the running text: they have a run-in label and no box, background, or icon. Theorem and definition bodies are italic. Use a Markdown footnote for a short aside or citation:[^note]

[^note]: The footnote appears at the bottom of the page in print and becomes an endnote in EPUB.

## Code

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    vector<int> a = {3, 1, 4, 1, 5};
    sort(a.begin(), a.end());
    for (int x : a) cout << x << ' ';
    cout << '\n';
}
```

## Figures

Use a normal Markdown image for SVG or raster figures. Figures default to one column:

```md
![Alt text that describes the figure.](figures/example.svg "Optional caption.")
```

Use a `tikz` fence for diagrams that are easier to express in TikZ:

````md
```tikz caption="Caption for the diagram." alt="Accessible description."
\begin{tikzpicture}
  \draw (0,0) -- (2,1);
\end{tikzpicture}
```
````

Chapters use a two-column body by default. Wrap wide material in a `::: wide`
block when it needs the full page width:

```md
::: wide
![A wide diagram.](figures/wide.svg "Caption.")
:::
```

Use `::: wide page` when the block should also start and end on its own page:

```md
::: wide page
![A full-page diagram.](figures/full-page.svg "Caption.")
:::
```

Tables and code blocks span both columns automatically. Set `layout: single-column`
in the frontmatter when most of the chapter is wide (large diagrams, big tables,
or long code lines).

## Cross-references

Link to another chapter with the `chapter:` scheme:

```md
See [the preface](chapter:preface) or [a specific section](chapter:preface#who-this-book-is-for).
```

## Exercises

::: example Exercise 1
State a small problem that uses the technique from this chapter.
:::

<!--
Back matter uses a separate chapter:

---
title: "References"
slug: references
part: Back Matter
partOrder: 99
order: 1
kind: references
status: draft
---

Reference entries go here. A references chapter is single-column, unnumbered,
and included in the table of contents.
-->
