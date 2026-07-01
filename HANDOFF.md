---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 在上下文压缩后恢复 effect-harness strict tsgo 迁移的当前决策与执行口径。
status: active
sources:
  - STATUS.md
  - AGENTS.md
  - HARNESS.md
  - README.md
  - harness/index.md
  - harness/offcial-guide.md
  - harness/offcial-migrate.md
  - harness/source.md
  - harness/effect-routes.md
  - harness/provider/effect-harness.provider.json
  - repos/effect.subtree.json
  - repos/effect/LLMS.md
  - /Users/sayori/Desktop/tsgo/README.md
  - /Users/sayori/Desktop/tsgo/_packages/tsgo/src/metadata.json
  - /Users/sayori/Desktop/tsgo/etscore/options.go
  - /Users/sayori/Desktop/tsgo/internal/rulerunner/diagnostics.go
updated: 2026-07-01
---

# Handoff

## Current

本仓处于干净基线之后的 strict tsgo 迁移准备阶段。

压缩后必须先读 `STATUS.md` 和本文件。

当前未提交内容应包含：

- `STATUS.md` 的 strict tsgo 总体计划更新。
- `HANDOFF.md` 本文件。

最近已提交的基线提交包括：

- `0affa2f20 docs: add clean baseline status`
- `55c410a3d chore: update effect tsgo baseline`

当前分支在最后一次检查时是 `main...origin/main [ahead 8]`。

## Boundary

本仓是 Effect v4 beta 的 Prelude provider profile 与源入口路线包。

本仓有两层语境：

- 本仓建设层维护 source entry、route、baseline、provider profile 和 verifier。
- 目标 harness 层由 Prelude 在接入项目中生成和维护。

Partita 负责通用 GitHub subtree pin 流程。

Prelude 负责 target lifecycle、target materialization、drift 和 maintain。

effect-harness 不恢复以下表面：

- `.codex/skills`
- target runtime 模板
- feedback intake
- `.effect-harness.json`
- effect-harness 管理的 `AGENTS.md` block
- target dispatcher scripts
- relaxed 或 compatibility profile

应用代码和测试代码禁止从 `repos/effect` 或未来的 `repos/tsgo` import。

## Baseline

当前已落地第一阶段 source access。

当前已落地第三阶段基础 toolchain：

- `effect@4.0.0-beta.92`
- `@effect/platform-node@4.0.0-beta.92`
- `@effect/vitest@4.0.0-beta.92`
- `@effect/tsgo@0.15.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260630.1`

当前 typecheck 主路径是 `tsgo --noEmit`。

当前 setup/patch 命令是 `effect-tsgo patch`。

`effect-tsgo` 是 setup/patch CLI，不是 `--noEmit` typecheck binary。

## Source Entries

当前已存在 Effect source entry：

- `repos/effect/`
- `repos/effect.subtree.json`
- `harness/effect-routes.md`

后续必须增加 tsgo source entry：

- `repos/tsgo/`
- `repos/tsgo.subtree.json`
- `harness/tsgo-routes.md`

`repos/tsgo` 必须 pin `Effect-TS/tsgo`。

`repos/tsgo` pin ref 必须绑定当前 `@effect/tsgo` package baseline 对应的 tag 或 commit。

`repos/tsgo` 不投影到 target 项目。

target 只接收 provider profile 中的 `@effect/tsgo` baseline 和 plugin policy。

## Tsgo Policy

本仓和 provider target 默认都采用 strict tsgo policy。

strict tsgo policy 的最终目标是 `0 Effect diagnostics`。

`error`、`warning`、`suggestion` 和 `message` 都必须参与 hard gate。

strict rule map 只覆盖 `supportedEffect` 包含 `v4` 的规则。

strict v4 rule map 必须显式写入本仓 `tsconfig.json` 和 provider profile。

provider 只保留单一 strict profile。

target 接入 strict profile 后，普通源码应修复 diagnostics，不通过降级 profile 放行。

### Severity

v4 支持且官方默认 `off` 的 `correctness` 规则提升为 `error`。

`effectNative` 规则全部提升为 `warning`，并作为 provider 默认强制。

`antipattern` 和 `style` 中官方默认 `off` 的 v4 规则提升为 `warning`。

官方默认为 `suggestion` 的规则保持 `suggestion`。

严格性通过 CLI 输出和 exit-code hard gate 实现，不通过把所有规则改成 `error` 实现。

### Gate

以下字段必须固定：

```jsonc
{
  "includeSuggestionsInTsc": true,
  "ignoreEffectSuggestionsInTscExitCode": false,
  "ignoreEffectWarningsInTscExitCode": false,
  "ignoreEffectErrorsInTscExitCode": false
}
```

`diagnosticSeverity` 必须是显式 object。

`diagnosticSeverity: null` 必须被拒绝。

### Imports

Effect import style 跟随官方用户文档。

provider strict policy 使用：

```jsonc
{
  "barrelImportPackages": ["effect"],
  "topLevelNamedReexports": "follow"
}
```

本仓自身也应迁移到官方用户文档的 barrel named import 风格。

具体代码修复应由 strict tsgo diagnostics 驱动。

### Options

以下选项已确认：

```jsonc
{
  "effectFn": ["span"],
  "keyPatterns": [
    { "target": "service", "pattern": "default", "skipLeadingPath": ["src/"] },
    { "target": "error", "pattern": "default", "skipLeadingPath": ["src/"] },
    { "target": "custom", "pattern": "default", "skipLeadingPath": ["src/"] }
  ],
  "extendedKeyDetection": true,
  "layerGraphFollowDepth": 1,
  "noExternal": true,
  "inlays": true,
  "allowedDuplicatedPackages": [],
  "pipeableMinArgCount": 2
}
```

需要 Mermaid 图时，由 harness 维护本地可读文档或 artifact。

provider 默认不依赖外部 Mermaid 链接。

### Overrides

`overrides` 默认不生成。

普通代码不得用 `overrides` 降低 strict policy。

仅 generated code、fixture、vendored source 等明确 scope 可以申请 `overrides` 例外。

`src/**` 和普通测试代码禁止使用 `@effect-diagnostics ...:off` 或
`@effect-diagnostics-next-line ...:off`。

## Provider

provider profile 必须新增 `tsgoPolicy` block。

`tsgoPolicy` block 至少表达：

- `mode`
- `effectVersion`
- `nativeBackend`
- `diagnosticGate`
- `ruleMapSource`
- `sourceEntry`

provider profile 必须新增 `tsgo-official-source`，与 `effect-official-source` 并列。

`contributions.tsconfig` 只是 `tsgoPolicy` 的 target projection 结果。

Prelude target provider record 后续需要记录双 source identity：

- Effect source identity。
- tsgo source identity。

target 不接收 `repos/effect` 或 `repos/tsgo` 本体。

Prelude provider interface 同步属于本仓迁移完成后的通知和对接流程。

## Routes

`harness/tsgo-routes.md` 必须使用与 `harness/effect-routes.md` 一致的 table 结构。

route table 按 agent 意图决策读取路径，不按文件夹树罗列。

tsgo route table 应宽覆盖以下能力面：

- metadata
- rules
- fixtures
- baselines
- LSP
- auto-import
- setup
- patch
- schema
- hooks
- tests

## ADR

必须新增 `harness/tsgo.md`。

`harness/tsgo.md` 是 strict tsgo policy 的 ADR/policy 入口。

`harness/tsgo.md` 必须包含可被 verifier 检索的稳定关键词区块。

建议关键词区块包括：

- `POLICY_NATIVE_BACKEND`
- `POLICY_DIAGNOSTIC_GATE`
- `POLICY_RULE_MAP`
- `POLICY_IMPORT_STYLE`
- `POLICY_OVERRIDES`
- `POLICY_SUPPRESSIONS`
- `POLICY_KEY_PATTERNS`
- `POLICY_LAYER_GRAPH`
- `POLICY_UPGRADE_LOOP`
- `VERIFIER_CONTRACT`

## Upgrade

升级闭环如下：

1. API 或 metadata 变更后，先对照 `harness/tsgo.md` 的 ADR/policy。
2. 如果只是字段或版本迁移，可以直接迁移。
3. 如果语义发生改变，必须 block 并要求用户 decide。
4. 如果新增规则或能力，必须 block 并要求用户 decide 是否引入。
5. 用户决策后必须更新 `harness/tsgo.md`。
6. 再更新 provider profile、`tsconfig.json` 和 verifier。

verifier 必须检查 strict rule map 覆盖当前 `@effect/tsgo` metadata 中所有 v4 支持规则。

新增 v4 规则未进入 `harness/tsgo.md` 决策区块时，`pnpm verify` 必须失败。

## Verify

当前验证命令是：

```bash
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false pnpm verify
```

当前 `pnpm verify` 已通过。

当前 `pnpm source:verify` 仍需要 Partita dist 与 Effect v4 runtime 对齐后恢复。

strict 迁移完成后，verifier 必须检查：

- `repos/tsgo.subtree.json` 和 `harness/tsgo-routes.md` 存在。
- `harness/tsgo.md` 稳定关键词区块存在。
- provider profile 与 `tsconfig.json` 的 strict plugin policy 一致。
- strict rule map 覆盖所有 v4 rules。
- `includeSuggestionsInTsc` 是 `true`。
- `ignoreEffectSuggestionsInTscExitCode` 是 `false`。
- `ignoreEffectWarningsInTscExitCode` 是 `false`。
- `ignoreEffectErrorsInTscExitCode` 是 `false`。
- 普通源码和普通测试代码没有 Effect diagnostic suppress 注释。
- 降低 strict policy 的 `overrides` 被拒绝。
- 最终 `tsgo --noEmit` 达到 `0 Effect diagnostics`。

## Next

下一步实施顺序是：

1. 提交当前 `STATUS.md` 和 `HANDOFF.md`。
2. 查询 `@effect/tsgo@0.15.0` 对应 GitHub tag 或 commit。
3. 使用 Partita pin 流程计划并 materialize `repos/tsgo` subtree。
4. 新增 `harness/tsgo-routes.md`。
5. 新增 `harness/tsgo.md`。
6. 更新 provider profile 的 `tsgoPolicy` 与 `tsgo-official-source`。
7. 更新 `tsconfig.json` 和 provider projection 的 strict plugin config。
8. 更新 `src/harness/verify/Tsgo.ts` 及相关 verifier 拆分。
9. 根据 strict diagnostics 修复本仓代码。
10. 更新 `harness/offcial-migrate.md` 第三阶段章节。
11. 运行 `pnpm verify`。
12. 提交干净增量。
