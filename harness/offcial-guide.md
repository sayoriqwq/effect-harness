---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 维护 Effect 官方 Introduction 中 Coding with LLMs 小节的当前源口径。
status: active
sources:
  - https://effect.website/docs/getting-started/introduction/
  - https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/
  - https://github.com/mikearnaldi/accountability
  - https://github.com/Effect-TS/tsgo
updated: 2026-07-01
---

# Official Guide

## Source

官方来源是 Effect 文档
[Getting Started / Introduction](https://effect.website/docs/getting-started/introduction/)
中的 `Coding with LLMs` 小节。

## Source Access

> [!quote] Official excerpt
> The following article describe how to use Effect with LLMs: https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/

官方入口是
[The One Weird Git Trick That Makes Coding Agents More Effect-ive](https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/)。

源口径是：agent 应该能读取 Effect 真实源码作为上下文。

## Feedback Loop

> [!quote] Official excerpt
> When using LLMs it is also very important to optimize the feedback loop to be as tight as possible, that can include writing custom linting rules to fit your style preferences and patterns, an example of a repository optimized for agentic coding can be found at: https://github.com/mikearnaldi/accountability

官方入口是 [mikearnaldi/accountability](https://github.com/mikearnaldi/accountability)。

源口径是：项目可以用自定义 lint rules、风格约束和 patterns 压短 agent 反馈回路。

## LSP

> [!quote] Official excerpt
> A key part of optimizing the feedback loop (and the developer experience in general when using Effect) is to use the Effect LSP plugin, we advise using the latest “tsgo” implementation of it that can be found at: https://github.com/Effect-TS/tsgo

官方入口是 [Effect-TS/tsgo](https://github.com/Effect-TS/tsgo)。

源口径是：项目应该使用 Effect LSP plugin，并关注当前 `tsgo` 实现。
