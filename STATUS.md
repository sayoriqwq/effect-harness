---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 记录 effect-harness 干净基线起始状态和 strict tsgo 迁移计划。
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
- [x] tsgo 内置 `effect-native` preset，可作为 strict policy 的参考来源。
- [x] tsgo setup CLI 会修改 `package.json`、`tsconfig.json` 和 VSCode settings。
- [x] effect-harness 不应复制 tsgo setup CLI，provider profile 只声明 Prelude 可以维护的 target projection。

## Confirmed Tsgo Policy

- [x] 本仓和 provider target 默认都采用 strict tsgo policy。
- [x] strict tsgo policy 的最终目标是 `0 Effect diagnostics`。
- [x] `error`、`warning`、`suggestion` 和 `message` 都必须参与 hard gate。
- [x] strict rule map 只覆盖 `supportedEffect` 包含 `v4` 的规则。
- [x] v4 支持且官方默认 `off` 的 `correctness` 规则提升为 `error`。
- [x] `effectNative` 规则全部提升为 `warning`，并作为 provider 默认强制。
- [x] `antipattern` 和 `style` 中官方默认 `off` 的 v4 规则提升为 `warning`。
- [x] 官方默认为 `suggestion` 的规则保持 `suggestion`，由 exit-code hard gate 保证严格性。
- [x] strict v4 rule map 必须显式写入本仓 `tsconfig.json` 和 provider profile。
- [x] provider 只保留单一 strict profile，不提供 relaxed 或 compatibility profile。
- [x] target 接入 strict profile 后，普通源码应修复 diagnostics，不通过降级 profile 放行。
- [x] `@typescript/native-preview` 是 provider 默认 native TypeScript backend。
- [x] `typescript >= 7` 只作为 tsgo 可识别的替代 backend，不作为当前默认投影。
- [x] `includeSuggestionsInTsc` 必须固定为 `true`。
- [x] `ignoreEffectSuggestionsInTscExitCode` 必须固定为 `false`。
- [x] `ignoreEffectWarningsInTscExitCode` 必须固定为 `false`。
- [x] `ignoreEffectErrorsInTscExitCode` 必须固定为 `false`。
- [x] `diagnosticSeverity` 必须是显式 object，不能是 `null`。
- [x] `overrides` 默认不生成，普通代码不得用它降低 strict policy。
- [x] 仅 generated code、fixture、vendored source 等明确 scope 可以申请 `overrides` 例外。
- [x] `src/**` 和普通测试代码禁止使用 `@effect-diagnostics ...:off` 或 `@effect-diagnostics-next-line ...:off`。
- [x] Effect import style 跟随官方用户文档，使用 `barrelImportPackages: ["effect"]` 和 `topLevelNamedReexports: "follow"`。
- [x] 本仓自身也应迁移到官方用户文档的 barrel named import 风格。
- [x] `effectFn` 保持官方默认 `["span"]`。
- [x] `keyPatterns` 显式配置 `service`、`error` 和 `custom`，全部使用 `default` pattern，并设置 `skipLeadingPath: ["src/"]`。
- [x] `extendedKeyDetection` 固定为 `true`。
- [x] `layerGraphFollowDepth` 固定为 `1`。
- [x] `noExternal` 固定为 `true`。
- [x] 需要 Mermaid 图时，由 harness 维护本地可读文档或 artifact，而不是依赖外部 Mermaid 链接。
- [x] `inlays` 固定为 `true`。
- [x] `allowedDuplicatedPackages` 固定为空数组。
- [x] `pipeableMinArgCount` 保持官方默认 `2`。

## Tsgo Source Plan

- [x] 后续需要把 `Effect-TS/tsgo` 作为第二个 provider-internal GitHub subtree pin 引入本仓。
- [x] `repos/tsgo` pin ref 必须绑定当前 `@effect/tsgo` package baseline 对应的 tag 或 commit。
- [x] `repos/tsgo` 不投影到 target 项目。
- [x] target 只接收 provider profile 中的 `@effect/tsgo` baseline 和 plugin policy。
- [x] `harness/tsgo-routes.md` 使用与 `harness/effect-routes.md` 一致的 table 结构。
- [x] `harness/tsgo-routes.md` 按 agent 意图决策读取路径，而不是按文件夹树罗列。
- [x] tsgo route table 应宽覆盖 metadata、rules、fixtures、LSP、auto-import、setup、patch、schema、hooks 和 tests。
- [x] 运行校验读取当前安装的 `node_modules/@effect/tsgo` package metadata。
- [x] policy 对照读取 `harness/tsgo.md` 的稳定关键词区块。
- [x] source route 对照读取 `repos/tsgo.subtree.json` 和 `harness/tsgo-routes.md`。
- [x] verifier 不依赖桌面 `/Users/sayori/Desktop/tsgo`。

## Tsgo Migration Plan

- [ ] 使用 Partita pin 流程 materialize `repos/tsgo` 和 `repos/tsgo.subtree.json`。
- [ ] 新增 `harness/tsgo-routes.md`，按 agent 意图提供 tsgo source route。
- [ ] 新增 `harness/tsgo.md`，记录 ADR、policy、rule map、upgrade loop、exceptions 和 verifier contract。
- [ ] `harness/tsgo.md` 必须包含可检索的稳定关键词区块。
- [ ] Provider profile 应新增明确的 `tsgoPolicy` block。
- [ ] `tsgoPolicy` block 应表达 `mode`、`effectVersion`、`nativeBackend`、`diagnosticGate`、`ruleMapSource` 和 `sourceEntry`。
- [ ] Provider profile 应新增 `tsgo-official-source`，与 `effect-official-source` 并列。
- [ ] Provider projection 应生成 strict `@effect/language-service` plugin config。
- [ ] Provider projection 应继续只生成 `prepare: effect-tsgo patch` 和 `typecheck: tsgo --noEmit`。
- [ ] Provider projection 不应生成 target dispatcher scripts。
- [ ] Verifier 应检查 strict rule map 覆盖当前 `@effect/tsgo` metadata 中所有 v4 支持规则。
- [ ] Verifier 应检查新增 v4 规则必须先进入 `harness/tsgo.md` 的决策区块。
- [ ] Verifier 应检查 `diagnosticSeverity` 是显式 strict v4 rule map。
- [ ] Verifier 应检查 `includeSuggestionsInTsc` 是 `true`。
- [ ] Verifier 应检查 `ignoreEffectSuggestionsInTscExitCode`、`ignoreEffectWarningsInTscExitCode` 和 `ignoreEffectErrorsInTscExitCode` 都是 `false`。
- [ ] Verifier 应检查普通源码和普通测试代码没有 Effect diagnostic suppress 注释。
- [ ] Verifier 应检查降低 strict policy 的 `overrides` 被拒绝。
- [ ] Verifier 应检查 provider profile 与根 `tsconfig.json` 的 plugin policy 一致。
- [ ] Verifier 应检查目标 package baseline 使用同一套 `effect` beta、`@effect/tsgo` 和 native backend 版本。
- [ ] 本仓代码按 strict diagnostics 逐项迁移到官方用户文档 import style 和 Effect-native 写法。
- [ ] `pnpm verify` 必须通过，且最终效果是 `0 Effect diagnostics`。

## Upgrade Loop

- [x] API 或 metadata 变更后，先对照 `harness/tsgo.md` 的 ADR/policy。
- [x] 如果只是字段或版本迁移，可以直接迁移。
- [x] 如果语义发生改变，必须 block 并要求用户 decide。
- [x] 如果新增规则或能力，必须 block 并要求用户 decide 是否引入。
- [x] 用户决策后必须更新 `harness/tsgo.md`，再更新 provider profile、`tsconfig.json` 和 verifier。

## Completion Definition

- [ ] `repos/tsgo/` 和 `repos/tsgo.subtree.json` 已 pin。
- [ ] `harness/tsgo.md` 记录 ADR/policy。
- [ ] `harness/tsgo-routes.md` 按 agent 意图提供 route。
- [ ] Provider profile 有 `tsgoPolicy` 和 `tsgo-official-source`。
- [ ] `tsconfig.json` 和 provider projection 都使用显式 strict v4 rule map。
- [ ] Verifier 检查 rule map 覆盖所有 v4 rules。
- [ ] Verifier 检查 `0 Effect diagnostics` hard gate 的关键配置。
- [ ] Verifier 检查普通源码没有 suppress。
- [ ] `pnpm verify` 通过。
- [ ] `STATUS.md` 更新完成项和 Prelude follow-up。

## Prelude Follow-Up

- [ ] effect-harness 完成本仓迁移后，应通知 Prelude 同步 provider interface。
- [ ] Prelude provider record 需要支持双 source identity。
- [ ] target provider record 应记录 Effect source identity 和 tsgo source identity。
- [ ] target 不接收 `repos/effect` 或 `repos/tsgo` 本体。

## Next

- [ ] 查询 `@effect/tsgo@0.15.0` 对应 GitHub tag 或 commit。
- [ ] 使用 Partita pin 流程计划 `repos/tsgo` subtree contract。
- [ ] 设计 `harness/tsgo.md` 稳定关键词区块。
- [ ] 设计 `harness/tsgo-routes.md` route table。
- [ ] 把 `tsgoPolicy` 落入 provider profile。
- [ ] 拆分或补充 `src/harness/verify/Tsgo.ts`，让 verifier 检查 strict policy。
- [ ] 更新 `harness/offcial-migrate.md` 中第三阶段的实现章节。
- [ ] 运行 `pnpm verify`。
- [ ] 提交每一轮已完成的干净增量。
