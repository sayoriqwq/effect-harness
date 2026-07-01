---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 固化 Effect 官方 Introduction 中 Coding with LLMs 的三段 harness 建设路线。
status: active
sources:
  - https://effect.website/docs/getting-started/introduction/
  - https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/
updated: 2026-07-01
---

# Official Guide

## Source

本文件来源于 Effect 官方文档
[Getting Started / Introduction](https://effect.website/docs/getting-started/introduction/)
中的 `Coding with LLMs` 小节。

本文件不是完整搬运官方文档。它把官方小节里的三段建议整理成本仓 harness 建设路线。

当本文件和官方页面冲突时，MUST 以官方页面为准，并更新本文件和对应实现文档。

## Source Access

> [!quote] Official excerpt
> The following article describe how to use Effect with LLMs:

第一段建议 agent 在写 Effect 时直接读取真实 Effect 源码，而不是只依赖人工文档、搜索结果、
`node_modules` 或临时猜测。

对应入口是 [官方文章](https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/)。

本仓第一阶段已经实现这一块。实现文档是
[harness/offcial-migrate.md](./offcial-migrate.md)。

当前第一阶段的 harness 判断是：Effect 源码必须作为本仓内部的只读 source route 存在，
由本仓验证 source pin、route 和 import boundary。

当前第一阶段的 provider 判断是：Prelude 只接收 provider profile 中声明的 source identity、
Effect package baseline 和 target surfaces，不接收 `repos/effect/` 本体。

## Feedback Loop

> [!quote] Official excerpt
> optimize the feedback loop to be as tight as possible

第二段建议把 agent 的反馈回路压短，包括按项目风格和模式编写自定义 lint rules，
并以 agentic coding repository 作为参考。

官方给出的参考仓库是
[mikearnaldi/accountability](https://github.com/mikearnaldi/accountability)。

本仓尚未实现这一阶段。后续实现时，MUST 明确哪些反馈属于 provider profile，
哪些反馈属于 Prelude target maintain，哪些反馈只属于本仓开发验证。

第二阶段 MUST NOT 恢复旧的目标 runtime 模板、反馈入口、`.effect-harness.json`
或 effect-harness 管理的 `AGENTS.md` block。

## LSP

> [!quote] Official excerpt
> use the Effect LSP plugin

第三段建议使用 Effect LSP plugin，并优先采用当前最新的 `tsgo` 实现。

官方给出的实现入口是 [Effect-TS/tsgo](https://github.com/Effect-TS/tsgo)。

本仓当前只保留了这一阶段的基线指针：provider profile 声明目标项目应使用
`@effect/language-service`、`floatingEffect: error` 和 `tsgo --noEmit`。

本仓尚未展开 LSP 与 `tsgo` 能力探索。后续实现时，MUST 以 `@effect/tsgo`
diagnostics 和 Effect 官方 LSP 行为为准，不应该把 `effect-tsgo` setup/patch manager
误当作 `--noEmit` typecheck binary。
