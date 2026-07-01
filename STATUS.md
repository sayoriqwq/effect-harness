---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 记录 effect-harness 当前干净基线、source entries 和 strict tsgo 第三阶段迁移完成状态。
status: active
sources:
  - HANDOFF.md
  - AGENTS.md
  - HARNESS.md
  - README.md
  - harness/index.md
  - harness/offcial-migrate.md
  - harness/source.md
  - harness/effect-routes.md
  - harness/tsgo.md
  - harness/tsgo-routes.md
  - harness/provider/effect-harness.provider.json
  - repos/effect.subtree.json
  - repos/tsgo.subtree.json
  - repos/effect/LLMS.md
  - repos/tsgo/README.md
updated: 2026-07-01
---

# Status

## Baseline

- [x] `effect-harness` 保持为 Effect v4 beta 的 Prelude provider profile 与 source route package。
- [x] 本仓只维护 provider-internal source entries、routes、baseline、strict tsgo policy、provider profile 和 verifier。
- [x] 第二阶段当前只建设本仓 Codex feedback loop，暂不处理 Prelude target 集成。
- [x] Partita 负责通用 GitHub subtree pin workflow。
- [x] Prelude 负责 target lifecycle、provider record、drift、verify 和 maintain。
- [x] 旧 `.codex/skills`、target runtime 模板、feedback intake、`.effect-harness.json`、target dispatcher scripts 和 managed `AGENTS.md` block 未恢复。

## Source Entries

- [x] Effect source entry 已固定为 `repos/effect.subtree.json` 和 `repos/effect/`。
- [x] Effect source route 已固定为 `harness/effect-routes.md`。
- [x] tsgo source entry 已固定为 `repos/tsgo.subtree.json` 和 `repos/tsgo/`。
- [x] tsgo source route 已固定为 `harness/tsgo-routes.md`。
- [x] `repos/tsgo` pin commit 是 `43ed476270fb3cf78fe7afac2086d67340ca0486`，对应 `@effect/tsgo@0.15.0`。
- [x] source entries 只在 provider 仓内部读取，目标项目只接收 source identities。
- [x] 应用代码和测试代码禁止从 `repos/effect` 或 `repos/tsgo` import。

## Toolchain

- [x] `effect@4.0.0-beta.92`
- [x] `@effect/platform-node@4.0.0-beta.92`
- [x] `@effect/vitest@4.0.0-beta.92`
- [x] `@effect/tsgo@0.15.0`
- [x] `@effect/language-service@0.86.2`
- [x] `@typescript/native-preview@7.0.0-dev.20260630.1`
- [x] `effect-tsgo patch` 是 setup/patch 命令。
- [x] `tsgo --noEmit` 是 typecheck 和 Effect diagnostics 主入口。

## Strict Tsgo Policy

- [x] `harness/tsgo.md` 已记录 ADR、policy、rule map、exception boundary 和 upgrade loop。
- [x] strict rule map 覆盖当前 `@effect/tsgo@0.15.0` metadata 中所有 76 条 v4 rules。
- [x] `includeSuggestionsInTsc` 固定为 `true`。
- [x] `ignoreEffectSuggestionsInTscExitCode` 固定为 `false`。
- [x] `ignoreEffectWarningsInTscExitCode` 固定为 `false`。
- [x] `ignoreEffectErrorsInTscExitCode` 固定为 `false`。
- [x] warning、suggestion 和 message 都参与 hard gate。
- [x] `diagnosticSeverity` 是显式 object，不允许 `null`。
- [x] provider 只保留 `strict-v4` profile，不提供 relaxed 或 compatibility profile。
- [x] provider 默认不生成 `overrides`。
- [x] 普通源码和普通测试禁止 `@effect-diagnostics ...:off` suppressions。

## Provider

- [x] provider profile 已声明 `effect-official-source` 和 `tsgo-official-source`。
- [x] provider profile 已声明 `sourceEntries` 和 target source identity 边界。
- [x] provider profile 已声明 `tsgoPolicy`。
- [x] provider projection 已声明 strict `@effect/language-service` plugin config。
- [x] provider projection 只生成 package/script/tsconfig/provider record/source identity surfaces。
- [x] provider projection 不生成 target dispatcher scripts。
- [x] provider projection 不投影 `repos/effect` 或 `repos/tsgo` 本体。

## Verifier

- [x] verifier 检查 source prefix、Git tree entry、subtree trailer、anchor 和 route。
- [x] verifier 检查 provider profile 与根 `tsconfig.json` 的 strict plugin policy 一致。
- [x] verifier 检查 `repos/tsgo` metadata 派生 rule map 与 committed strict policy 一致。
- [x] verifier 检查 `harness/tsgo.md` 的稳定 keyword 和 rule name。
- [x] verifier 检查 `effect-tsgo --version` 与 `tsgo --version`。
- [x] verifier 检查普通源码没有 Effect diagnostic suppress 注释。
- [x] verifier 检查应用代码和测试代码没有 source prefix imports。

## Docs

- [x] `harness/index.md` 已集中描述文档职责和阅读路线。
- [x] `harness/feedback-loop.md` 已投影第二阶段 Codex feedback loop 和 code-defined verify pipeline。
- [x] `harness/source.md` 已改为双 source entry 口径。
- [x] `harness/offcial-migrate.md` 已记录第一阶段和第三阶段完成态。
- [x] `harness/provider/index.md` 已记录 Prelude provider profile 消费边界。
- [x] `README.md`、`HARNESS.md` 和 `AGENTS.md` 已同步 strict tsgo 和 dual source entry 口径。
- [x] `HANDOFF.md` 已同步压缩后恢复口径。

## Upgrade Loop

- [x] API 或 metadata 变更后，先对照 `harness/tsgo.md` 的 ADR/policy。
- [x] 如果只是字段、版本或 commit 迁移，可以直接迁移。
- [x] 如果规则语义发生改变，必须 block 并要求用户 decide。
- [x] 如果新增 v4 rule 或新增影响 provider projection 的 capability，必须 block 并要求用户 decide。
- [x] 用户决策后先更新 `harness/tsgo.md`，再更新 provider profile、`tsconfig.json` 和 verifier。

## Verification

- [x] `pnpm verify` 是唯一完成态验证命令。
- [x] `pnpm verify` 由 Effect pipeline 组织。
- [x] verify stage 真源是 `src/harness/verify/VerifyStage.ts`。
- [x] verify pipeline 采用 fail-fast。
- [x] verify pipeline stage 固定为 `source-pins`、`harness-contract`、`tsgo-diagnostics`、`tests`、`lint`、`knip`。
- [x] verify pipeline 失败输出包含 stage tag、title、route、routeHint 和底层工具原始输出。
- [x] `harness-contract` stage 检查 `harness/feedback-loop.md` 覆盖 code-defined keywords、stage tags、routes、summary 和 routeHint。
- [x] 最终目标是 `tsgo --noEmit` 输出 0 error、0 warning、0 suggestion、0 message。
