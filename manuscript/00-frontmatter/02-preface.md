---
title: Preface
slug: preface
part: Front Matter
partOrder: 0
order: 2
kind: preface
topics:
  - overview
summary: "Why this handbook exists, who it is for, and how to get the most out of it."
status: draft
---

## Who this book is for

This handbook is for programmers who already know how to write code and want to get better at solving algorithmic problems under time pressure. It is not an introduction to programming. It assumes familiarity with variables, loops, functions, recursion, and basic data structures.

The chapters are short on purpose. Each one introduces a technique, shows the core idea, and then gets out of the way so you can practice. The goal is not to replace a textbook or a course. The goal is to give you a compact reference that you can revisit before a contest or an interview.

## How the book is organized

The material is divided into parts, and each part contains chapters that build on one another. A typical chapter follows the same shape:

1. A short statement of the problem.
2. The key idea, with the necessary definitions and proofs.
3. One or more worked examples.
4. Complexity analysis and implementation notes.
5. Exercises that ask you to extend or apply the idea.

You can read the book front to back, but it is also designed for browsing. If you already know a topic, skip to the exercises and see whether you can solve them without looking at the implementation notes.

## Conventions

Mathematics is typeset with KaTeX. Inline expressions look like $O(n \log n)$, and displayed equations are set on their own line:

$$
T(n) = 2T(n/2) + \Theta(n) = \Theta(n \log n).
$$

Code is written in modern C++ unless a chapter says otherwise. The examples use `#include <bits/stdc++.h>` and `using namespace std;` because that is the convention in competitive programming, not because it is a good idea in production code.

::: note Placeholders
The title, author, publisher, edition, and ISBN in this scaffold are placeholders. Replace them in `book.config.ts` and in the front-matter files before publishing.
:::

## A note on practice

Reading about an algorithm is not the same as being able to implement it. After each chapter, close the book and try to reproduce the main idea from memory. Then solve at least two problems that use it. If you get stuck, go back to the definition and the proof, not to the code. The code is the least interesting part.

The rest of the book is a sequence of tools. Learn what each tool is for, when it applies, and what it costs. That is enough to start.
