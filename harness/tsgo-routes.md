---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 给 agent 提供读取 pinned tsgo source 的路线表。
status: active
sources:
  - repos/tsgo.subtree.json
  - repos/tsgo/README.md
  - repos/tsgo/_packages/tsgo/src/metadata.json
  - repos/tsgo/_packages/tsgo/src/cli.ts
  - repos/tsgo/_packages/tsgo/src/setup/
  - repos/tsgo/etscore/
  - repos/tsgo/internal/
updated: 2026-07-01
---

# Tsgo Source Routes

## Boundary

`repos/tsgo/` 是 provider 仓内部只读参考源，目标项目不接收这棵目录。

应用代码和测试代码只能使用已安装 package 与 CLI，不从 `repos/tsgo` import。

当前 pin 的 `Effect-TS/tsgo` commit 是 `43ed476270fb3cf78fe7afac2086d67340ca0486`，
对应 `@effect/tsgo@0.15.0` package baseline。

## Routes

| Agent 意图 | 先读 | 深入核对 | 适用输出 | 注意 |
| --- | --- | --- | --- | --- |
| 判断 tsgo pin 和 package baseline | `repos/tsgo.subtree.json`、`provider/effect-harness.provider.json` | `repos/tsgo/package.json`、`repos/tsgo/_packages/tsgo/package.json` | source identity、provider drift 判断 | commit 必须绑定当前 `@effect/tsgo` package version |
| 理解 tsgo 在本仓的策略 | `harness/tsgo.md` | `tsconfig.json`、`src/harness/verify/TsgoPolicy.ts` | ADR、policy、verifier 修复 | policy 变化先改 ADR，再改 projection |
| 理解官方 wrapper 和安装流程 | `repos/tsgo/README.md` | `repos/tsgo/_packages/tsgo/src/cli.ts` | setup/patch 解释、用户指令 | `effect-tsgo patch` 不是 typecheck binary |
| 查 CLI 命令入口 | `repos/tsgo/_packages/tsgo/src/cli.ts` | `repos/tsgo/_packages/tsgo/src/setup/index.ts` | `setup`、`patch`、`unpatch`、`get-exe-path` 判断 | provider 只投影 `prepare` 和 `typecheck` 指针 |
| 查 plugin option shape | `repos/tsgo/_packages/tsgo/src/config.ts`、`repos/tsgo/etscore/options.go` | `repos/tsgo/etscore/options_schema_test.go`、`repos/tsgo/etscore/options_test.go` | `tsconfig.json` plugin 字段 | 字段是顶层 plugin fields，不放进嵌套 `options` |
| 查 diagnostic metadata | `repos/tsgo/_packages/tsgo/src/metadata.json` | `repos/tsgo/_packages/tsgo/src/presets.ts`、`repos/tsgo/_packages/tsgo/src/setup/rule-info.ts` | rule map、severity 决策 | 只采用 `supportedEffect` 包含 `v4` 的规则 |
| 查 diagnostics 执行路径 | `repos/tsgo/internal/rulerunner/diagnostics.go` | `repos/tsgo/internal/rules/metadata.go`、`repos/tsgo/internal/rule/` | 诊断生命周期、rule dispatch 判断 | 不根据 README 摘要推断 rule 行为 |
| 查具体 rule 行为 | `repos/tsgo/internal/rules/<rule>.go` | `repos/tsgo/internal/fixables/<rule>.go`、`repos/tsgo/internal/effecttest/` | 规则解释、修复建议 | 先看 metadata，再看实现和 fixture |
| 查 quickfix 能力 | `repos/tsgo/internal/fixables/` | `repos/tsgo/internal/effecttest/quickfix_runner.go`、`quickfix_baseline.go` | 自动修复判断 | quickfix 存在不代表 provider 可以放宽 policy |
| 查 refactor 能力 | `repos/tsgo/internal/refactors/` | `repos/tsgo/internal/effecttest/refactor_runner.go`、`refactor_baseline.go` | refactor route、编辑器能力 | refactor 属于 agent 可参考能力，不是 target 必装脚本 |
| 查 completions | `repos/tsgo/internal/completions/` | `repos/tsgo/internal/completion/`、completion tests | snippet、completion 行为 | completion 只影响编辑体验，不改变 hard gate |
| 查 auto-import 风格 | `repos/tsgo/internal/autoimportstyle/stylepolicy.go` | `repos/tsgo/internal/effecttest/autoimport_style_consistency_test.go` | import style 决策 | 本仓采用 official user docs 的 barrel named import |
| 查 diagnostic suppress 指令 | `repos/tsgo/internal/directives/parser.go` | `repos/tsgo/internal/directives/parser_test.go`、`repos/tsgo/internal/completions/effect_diagnostics_comment.go` | suppress 检测和拒绝策略 | 本仓普通源码不允许 `:off` suppress |
| 查 setup 修改逻辑 | `repos/tsgo/_packages/tsgo/src/setup/changes.ts` | `repos/tsgo/_packages/tsgo/src/setup/assessment.ts`、`target.ts` | package/tsconfig/editor projection 参考 | effect-harness 不复制 setup CLI，只声明 provider projection |
| 查 native backend patch | `repos/tsgo/_packages/tsgo/src/setup/consts.ts` | `repos/tsgo/etscore/version_generated.go`、`repos/tsgo/etscore/climode.go` | native backend 判断 | 当前默认 `@typescript/native-preview` |
| 查 language-server hooks | `repos/tsgo/etslshooks/` | `repos/tsgo/internal/effectconfigraw/hooks.go` | LSP 行为、document symbol、inlay hints | hooks 用于理解能力，不直接进 provider target |
| 查 layer graph | `repos/tsgo/internal/layergraph/` | `repos/tsgo/internal/layergraph/*_test.go` | Mermaid、Layer 图推断 | 本仓需要图时维护本地 artifact，不默认外链 Mermaid |
| 查 key builder | `repos/tsgo/internal/keybuilder/` | `repos/tsgo/internal/keybuilder/keybuilder_test.go` | deterministic key policy | provider 使用 service/error/custom default pattern |
| 查 type parser | `repos/tsgo/internal/typeparser/` | `repos/tsgo/internal/typeparser/*_test.go` | rule 误报、类型识别排查 | 先确认 parser 能力，再判断是否需要 ADR 变化 |
| 查 baselines 和 test harness | `repos/tsgo/internal/effecttest/` | `repos/tsgo/internal/effecttest/baseline.go`、`runner.go` | 回归排查、fixture 设计 | 本仓 verifier 不依赖 tsgo test harness |
| 查 bundled Effect 识别 | `repos/tsgo/internal/bundledeffect/effect.go` | `repos/tsgo/internal/pluginoptions/resolver.go` | package/version 识别 | provider package baseline 仍以本仓 profile 为准 |
| 升级 tsgo pin | `harness/tsgo.md`、`repos/tsgo.subtree.json` | 新旧 `repos/tsgo/_packages/tsgo/src/metadata.json` diff | upgrade plan、ADR 更新 | 新增 v4 rule 或语义变化必须让用户 decide |
