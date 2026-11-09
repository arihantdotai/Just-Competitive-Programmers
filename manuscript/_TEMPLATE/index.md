---
title: "Chapter Title"
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

Inline mathematics uses single dollars: $O(n \log n)$. Display mathematics uses double dollars:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}.
$$

Use `##` for sections and `###` for subsections. Do not add a top-level `#` heading; the chapter title is generated from the frontmatter.

::: definition A definition
Definitions, theorems, examples, notes, tips, warnings, and complexity notes are written as callouts.
:::

::: theorem A theorem
State the claim precisely, then prove it or point to the proof.
:::

::: example A worked example
Show the idea on a small input before generalizing.
:::

::: complexity
Time: $O(n \log n)$.

Memory: $O(n)$.
:::

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

Use a normal Markdown image for SVG or raster figures:

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

Set `layout: single-column` in the frontmatter when most of the chapter is
wide (large diagrams, big tables, or long code lines).

## Cross-references

Link to another chapter with the `chapter:` scheme:

```md
See [the preface](chapter:preface) or [a specific section](chapter:preface#who-this-book-is-for).
```

## Exercises

::: example Exercise 1
State a small problem that uses the technique from this chapter.
:::
