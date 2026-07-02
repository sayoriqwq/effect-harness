---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明接入 effect-harness 后 target 内 Effect 代码应遵守的编码基线。
status: active
sources:
  - provider/effect-harness.provider.json
  - repos/effect/LLMS.md
updated: 2026-07-02
---

# Effect Code

## Baseline

target 接入 effect-harness 后，Effect 代码应以 provider profile 声明的 v4 beta package baseline
为准。

代码从已安装 package import。普通应用代码和测试代码 MUST NOT 从 provider-internal
`repos/effect` 或 `repos/tsgo` import。

## Patterns

Effect 程序 SHOULD 优先使用 `Effect.gen` 和 `Effect.fn` 组织可读流程。

Effect service definition 当前 SHOULD 使用 `Context.Service`。

Node 入口 SHOULD 使用 `NodeRuntime.runMain`。

Effect 测试 SHOULD 使用 `@effect/vitest` 的 `it.effect`、`it.live` 或 layer 组织。

CLI 代码 SHOULD 使用 `effect/unstable/cli`。target 不应引入旧的 `@effect/cli` 口径。

## Errors

错误建模 SHOULD 使用 Effect v4 baseline 下的 typed error pattern，例如
`Schema.TaggedErrorClass`。

在 `Effect.gen` 中抛出终止性 Effect 时，SHOULD 使用 `return yield*` 让 TypeScript 正确理解控制流。
