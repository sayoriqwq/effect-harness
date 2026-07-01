---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 定义下一阶段 Prelude 集成 effect-harness 时应该消费的 provider profile 边界。
status: active
sources:
  - harness/provider/effect-harness.provider.json
  - harness/offcial-migrate.md
  - harness/tsgo.md
updated: 2026-07-01
---

# Next-stage Prelude Provider Profile

本目录暴露最小 provider profile。当前阶段只维护 profile 与本地 `fixture/`；Prelude target
materialization 推到下一阶段。profile 只描述 effect-harness 能给目标项目带来的约束面，不直接
实现目标项目 maintain。

当前真源：

- `harness/provider/effect-harness.provider.json`
- `repos/effect.subtree.json`
- `repos/tsgo.subtree.json`
- `repos/effect/LLMS.md`
- `repos/tsgo/README.md`
- `harness/offcial-guide.md`
- `harness/offcial-migrate.md`
- `harness/tsgo.md`

## 两层对应

第一层是 harness 层：effect-harness 维护本仓内部的 Effect/tsgo 源入口实例、路线、验证、
strict tsgo policy 和 Effect package 基线。

第二层是 provider 层：下一阶段 Prelude 读取 provider profile，在目标项目中维护 provider record、
package 基线、`tsconfig.json` language-service plugin、strict diagnostic gate 和 `tsgo --noEmit`
诊断脚本。

Partita 负责 GitHub subtree pin 语义和 source contract；effect-harness 不复制这套能力。当前阶段
先维护本地 `fixture/`，Prelude 目标项目生命周期集成推到下一阶段。effect-harness 不投影 Codex
runtime 资产、反馈入口、目标 `AGENTS.md` blocks 或 `.effect-harness.json` state。

## 目标项目接收面

当前 provider target surfaces 保留结构化指针和 provider docs bundle。

下一阶段 Prelude 应该接收：

- `package.json` dependencies and scripts
- `tsconfig.json` strict language-service plugin
- `.prelude/providers/effect-harness/provider.json` provider record
- provider artifact/source identities
- `.prelude/providers/effect-harness/docs` provider documentation bundle

下一阶段 Prelude 不应该接收：

- `repos/effect/` 本体
- `repos/tsgo/` 本体
- `repos/effect.subtree.json` 本体
- `repos/tsgo.subtree.json` 本体
- `repos/effect/LLMS.md` 本体
- `repos/tsgo/README.md` 本体
- `.codex` runtime files
- effect-harness `AGENTS.md` 管理块
- `.effect-harness.json` state
- `.codex/effect-feedback` feedback intake

目标项目可以接收 provider record 中的 Effect source identity、tsgo source identity 和 docs bundle，
但不接收 provider-internal source tree 本体。

docs bundle 是 harness 的必要输出，不是 runtime asset。composer SHOULD 按
`contributions.documentationBundle` 复制或解析文档，并保持目标路径和文档列表可审查。

包含 `.codex` runtime files、effect-harness `AGENTS.md` 管理块或 `.effect-harness.json`
state 的 provider records 应按当前 profile 重新生成。

## 编辑器策略

profile 把 source-entry editor policy 记录为数据。`repos/**` 的 auto-import exclusion 是默认硬边界。
watch/search exclusion 需要显式编辑器配置。文件隐藏是偏好项，不是默认项。VSCode 和 Zed 的配置
shape 分开记录。

## Tsgo policy

profile 把 `harness/tsgo.md` 的 strict policy 投影为 `tsgoPolicy` 和
`contributions.tsconfig.compilerOptions.plugins[]`。

当前 provider 只有 `strict-v4` profile，不提供 relaxed 或 compatibility profile。

目标项目接入后应修复 diagnostics，不通过 local override 降低 strict policy。

`includeSuggestionsInTsc` 固定为 `true`；`ignoreEffectSuggestionsInTscExitCode`、
`ignoreEffectWarningsInTscExitCode` 和 `ignoreEffectErrorsInTscExitCode` 固定为 `false`。
