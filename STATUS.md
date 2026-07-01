---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 记录 effect-harness 干净基线起始状态和 tsgo 引入计划。
status: active
sources:
  - HARNESS.md
  - README.md
  - harness/index.md
  - harness/offcial-migrate.md
  - harness/provider/effect-harness.provider.json
  - tsconfig.json
  - src/harness/verify/Tsgo.ts
  - /Users/sayori/Desktop/tsgo/README.md
  - /Users/sayori/Desktop/tsgo/_packages/tsgo/src/cli.ts
  - /Users/sayori/Desktop/tsgo/_packages/tsgo/src/setup/consts.ts
  - /Users/sayori/Desktop/tsgo/_packages/tsgo/src/metadata.json
  - /Users/sayori/Desktop/tsgo/etscore/options.go
  - /Users/sayori/Desktop/tsgo/internal/rulerunner/diagnostics.go
updated: 2026-07-01
---

# Status

## Baseline

当前状态是干净基线的起始。

- [x] `effect-harness` 只保留 Effect source entry、source route、baseline verifier 和 provider profile。
- [x] 通用 GitHub subtree pin 流程由 Partita 负责。
- [x] Prelude target lifecycle 由 Prelude 负责。
- [x] Effect 源入口固定为 `repos/effect.subtree.json` 和 `repos/effect/`。
- [x] Effect 源入口不会投影到目标项目。
- [x] provider profile 已声明 target package baseline、`effect-tsgo patch` 和 `tsgo --noEmit`。
- [x] 本仓已使用 `@effect/tsgo@0.15.0`、`@effect/language-service@0.86.2` 和 `@typescript/native-preview@7.0.0-dev.20260630.1`。
- [x] `pnpm verify` 已通过当前 provider repository 验证、`tsgo --noEmit`、tests、eslint 和 knip。
- [ ] `pnpm source:verify` 仍需要 Partita dist 与 Effect v4 runtime 对齐后恢复。

## Tsgo Findings

- [x] `/Users/sayori/Desktop/tsgo` 是 `Effect-TS/tsgo` 的本地 clone，当前工作树干净。
- [x] `@effect/tsgo` 是 Effect Language Service 对 TypeScript-Go 的包装和 patch 分发。
- [x] `effect-tsgo patch` 是 setup/patch 命令，不是 typecheck 命令。
- [x] `tsgo --noEmit` 是当前目标项目应使用的 Effect 语义诊断入口。
- [x] `effect-tsgo patch` 可以 patch `@typescript/native-preview`，也可以 patch `typescript >= 7` 的 native backend。
- [x] 当前 provider baseline 使用 `@typescript/native-preview`，不直接切到 `typescript >= 7`。
- [x] `@effect/language-service` 插件配置使用顶层字段，不使用嵌套 `options`。
- [x] 只要 plugin stanza 存在，缺省 diagnostic map 会使用 tsgo 规则默认 severity。
- [x] `diagnosticSeverity: null` 表示关闭 Effect diagnostics。
- [x] `diagnosticSeverity: {}` 表示显式使用规则默认 severity。
- [x] 当前本仓配置显式保留 `floatingEffect: "error"`，其他规则仍按 tsgo 默认 severity 运行。
- [x] tsgo 规则分组为 `correctness`、`antipattern`、`effectNative` 和 `style`。
- [x] tsgo 内置 `effect-native` preset，但它默认会增加目标项目噪音，第一阶段不应直接全量启用。
- [x] tsgo setup CLI 会修改 `package.json`、`tsconfig.json` 和 VSCode settings。
- [x] effect-harness 不应复制 tsgo setup CLI，provider profile 只声明 Prelude 可以维护的 target projection。

## Tsgo Plan

- [ ] Provider profile 应新增明确的 `effectTsgo` policy block。
- [ ] `effectTsgo` policy block 应表达 package baseline、native backend、patch command、typecheck command、plugin options 和 exit-code policy。
- [ ] Provider projection 应继续只生成 `prepare: effect-tsgo patch` 和 `typecheck: tsgo --noEmit`。
- [ ] Provider projection 不应生成 target dispatcher scripts。
- [ ] Verifier 应检查 `diagnosticSeverity` 不是 `null`。
- [ ] Verifier 应检查 `ignoreEffectWarningsInTscExitCode` 和 `ignoreEffectErrorsInTscExitCode` 不为 `true`。
- [ ] Verifier 应检查 provider profile 与根 `tsconfig.json` 的 plugin policy 一致。
- [ ] Verifier 应检查目标 package baseline 使用同一套 `effect` beta、`@effect/tsgo` 和 native backend 版本。
- [ ] 第一批默认 hard diagnostics 应以 tsgo 的 `correctness` 默认规则为主。
- [ ] `effect-native` preset 应先作为 provider option，而不是默认 target baseline。
- [ ] `style` 和 suggestion 类规则应保持为 editor aid 或 opt-in policy。
- [ ] `overrides` 只应在 generated code、fixture 或明确 target scope 中使用。
- [ ] `overrides` 不应作为绕过 provider baseline 的默认路径。
- [ ] tsgo source repo 暂不作为第二个 source pin 引入本仓。
- [ ] 如果后续需要稳定引用 tsgo internals，应通过 Partita GitHub subtree 新增 `repos/tsgo.subtree.json`。
- [ ] tsgo route 若被引入，应只服务本仓 agent 阅读，不投影到目标项目。

## Next

- [ ] 和用户确认 `effectTsgo` policy block 的字段 shape。
- [ ] 把确认后的 policy block 落入 provider profile。
- [ ] 拆分或补充 `src/harness/verify/Tsgo.ts`，让 verifier 检查 policy block。
- [ ] 更新 `harness/offcial-migrate.md` 中第三阶段的实现章节。
- [ ] 运行 `pnpm verify`。
- [ ] 提交每一轮已完成的干净增量。
