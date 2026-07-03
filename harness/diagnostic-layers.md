---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 定义 tsgo diagnostics、ESLint 和 harness guardrails 的分层职责。
status: active
sources:
  - harness/feedback-loop.md
  - harness/tsgo.md
  - harness/tsgo-routes.md
  - src/harness/verify/Pipeline.ts
  - src/harness/verify/VerifyStage.ts
  - src/harness/verify/TsgoPolicy.ts
  - src/harness/Guardrails.ts
  - eslint.config.mjs
updated: 2026-07-01
---

# Diagnostic Layers

## CONTRACT

`pnpm verify` 的分层真源是 `src/harness/verify/Pipeline.ts`。pipeline 按
`source-pins`、`harness-contract`、`tsgo-diagnostics`、`tests`、`lint`、`knip`
顺序 fail-fast 执行。

分层原则是每一层只负责自己的事情：

- `tsgo-diagnostics` 负责 TypeScript + Effect 语义诊断。
- `tests` 负责行为回归。
- `lint` 负责仓库边界、导入制度、测试入口和本地 syntax-level guardrails。
- `knip` 负责 package surface 最小化。

如果 `tsgo-diagnostics` 和 `lint` 对同一段 Effect 写法给出冲突要求，MUST 服从 tsgo，并收窄
ESLint。ESLint 不应该禁止 tsgo quickfix 或 suggestion 推荐的 Effect API。

## TSGO_OWNS

`tsgo --noEmit` 是 Effect 语义 feedback 的主入口。本仓 strict profile 覆盖 pinned
`repos/tsgo/_packages/tsgo/src/metadata.json` 中所有支持 v4 的 rule，并让 error、warning、
suggestion 都参与 exit-code hard gate。

tsgo owns：

- Effect error/context/layer channels，例如 missing error、missing context、missing layer。
- Effect generator、`yield*`、`Effect.fn`、`Effect.gen` 和 pipe 语义。
- Effect-native API 偏好，例如 Clock、Random、Config、HttpClient、Schema JSON、typed errors。
- Schema class、Schema number、Schema tagged shape 和 constructor 语义。
- v4 API drift、deterministic keys、service/error/custom key policy。
- type-aware Effect unsafe assertions and leaking requirements。

这些规则不要在 ESLint 中重新实现。需要改变 Effect 语义约束时，先更新 `harness/tsgo.md`、
`src/harness/verify/TsgoPolicy.ts` 和 provider profile。

## ESLINT_OWNS

ESLint 是 lint stage 的入口。它只负责不需要 tsgo 类型语义、但必须快速阻断的仓库制度：

- import boundary：应用代码和测试代码不能从 `repos/effect` 或 `repos/tsgo` import。
- package baseline：不使用 `@effect/cli`，CLI 代码使用 `effect/unstable/cli`。
- test entry：本仓测试使用 `@effect/vitest`，不使用 `node:test` 或从 `vitest` 导入普通测试入口。
- harness baseline：当前 service definition baseline 不新增 `Context.Tag` service definition。
- syntax-level bans：只有当 tsgo 没有对应 rule，且规则是本仓制度时才放进 ESLint。例如
  `{ disableValidation: true }` 禁令属于 lint 层。

ESLint MUST NOT own general Effect idioms that tsgo already owns。尤其不要禁止 `Effect.asVoid`：
当前 tsgo 的 `effectMapVoid` rule 会建议使用该 API。

## GUARDRAILS_OWN

`harness-contract` stage 里的 guardrails 是最后的仓库契约检查，不替代 ESLint。

Guardrails owns：

- provider-internal source pins 不能进入应用或测试 import。
- legacy provider surfaces 不能恢复。
- provider profile、source identity、package baseline 和 strict tsgo policy 不能漂移。
- 普通源码不能用 Effect diagnostic suppressions 关闭 strict policy。

当某个规则既需要编辑器即时反馈、又属于仓库硬边界时，可以同时存在于 ESLint 和
`harness-contract`。这种重复只用于提高反馈速度，不用于重新解释 Effect 语义。

## UPDATE_LOOP

新增或调整规则时按以下判断：

1. 如果规则依赖 Effect 类型、error/context/layer channel、Schema 语义或 Effect-native API，
   放进 tsgo policy，不放进 ESLint。
2. 如果规则是 import、文件、测试入口、package baseline 或 provider boundary，放进 ESLint 或
   harness guardrails。
3. 如果规则是 package surface，放进 knip stage。
4. 如果发现 ESLint 与 tsgo 冲突，删除或收窄 ESLint 规则。
5. 更新 `src/harness/verify/VerifyStage.ts` 的 route 后，同步更新 `harness/feedback-loop.md`。
