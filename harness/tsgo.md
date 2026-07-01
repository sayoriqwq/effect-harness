---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 记录 effect-harness strict tsgo policy、ADR 决策和升级闭环。
status: active
sources:
  - repos/tsgo/README.md
  - repos/tsgo/_packages/tsgo/src/metadata.json
  - repos/tsgo/_packages/tsgo/src/setup/consts.ts
  - repos/tsgo/_packages/tsgo/src/setup/changes.ts
  - repos/tsgo/etscore/options.go
  - repos/tsgo/internal/rulerunner/diagnostics.go
  - harness/provider/effect-harness.provider.json
  - tsconfig.json
updated: 2026-07-01
---

# Tsgo Policy

## Decisions

当前第三阶段采用 strict tsgo policy。目标不是“只要没有 TypeScript error 就通过”，而是
`tsgo --noEmit` 对 Effect diagnostics 达到 0 error、0 warning、0 suggestion、0 message。

`effect-tsgo patch` 只负责准备 native backend。类型检查和 Effect 语义诊断入口固定为：

```bash
tsgo --noEmit
```

## POLICY_NATIVE_BACKEND

当前 native backend 固定为 `@typescript/native-preview@7.0.0-dev.20260630.1`。

`@effect/tsgo@0.15.0` 可以识别 `@typescript/native-preview`，也可以识别 `typescript >= 7`。
本仓 provider 默认只投影 `@typescript/native-preview`。

`effect-tsgo` 是 setup/patch CLI。`tsgo` 是被 patch 后执行 `--noEmit` 的诊断 binary。

`repos/tsgo` pin 到 `Effect-TS/tsgo` commit
`43ed476270fb3cf78fe7afac2086d67340ca0486`，该 commit 对应当前 `@effect/tsgo@0.15.0`
package baseline。

## POLICY_DIAGNOSTIC_GATE

provider strict profile 固定以下 gate：

```json
{
  "diagnostics": true,
  "includeSuggestionsInTsc": true,
  "ignoreEffectSuggestionsInTscExitCode": false,
  "ignoreEffectWarningsInTscExitCode": false,
  "ignoreEffectErrorsInTscExitCode": false
}
```

`diagnosticSeverity` MUST 是显式 object。`diagnosticSeverity: null` 表示关闭 Effect diagnostics，
在本仓和 provider projection 中都不允许。

## POLICY_RULE_MAP

strict rule map 只覆盖 `supportedEffect` 包含 `v4` 的规则。当前 `@effect/tsgo@0.15.0`
metadata 派生出 76 条 v4 规则。

v4 correctness 规则中官方默认 `off` 的规则提升为 `error`。

`effectNative` 规则全部提升为 `warning`。

`antipattern` 和 `style` 里官方默认 `off` 的 v4 规则提升为 `warning`。

官方默认为 `suggestion` 的规则保持 `suggestion`，由 diagnostic gate 让 suggestion 也参与
exit-code hard gate。

| Rule | Severity |
| --- | --- |
| `anyUnknownInErrorContext` | `error` |
| `asyncFunction` | `warning` |
| `catchAllToMapError` | `suggestion` |
| `catchToOrElseSucceed` | `suggestion` |
| `catchUnfailableEffect` | `suggestion` |
| `classSelfMismatch` | `error` |
| `cryptoRandomUUID` | `warning` |
| `cryptoRandomUUIDInEffect` | `warning` |
| `deterministicKeys` | `warning` |
| `duplicatePackage` | `warning` |
| `effectDoNotation` | `warning` |
| `effectFnIife` | `warning` |
| `effectFnImplicitAny` | `error` |
| `effectFnOpportunity` | `suggestion` |
| `effectGenUsesAdapter` | `warning` |
| `effectInFailure` | `warning` |
| `effectInVoidSuccess` | `warning` |
| `effectMapFlatten` | `suggestion` |
| `effectMapVoid` | `suggestion` |
| `effectSucceedWithVoid` | `suggestion` |
| `extendsNativeError` | `warning` |
| `floatingEffect` | `error` |
| `genericEffectServices` | `warning` |
| `globalConsole` | `warning` |
| `globalConsoleInEffect` | `warning` |
| `globalDate` | `warning` |
| `globalDateInEffect` | `warning` |
| `globalErrorInEffectCatch` | `warning` |
| `globalErrorInEffectFailure` | `warning` |
| `globalFetch` | `warning` |
| `globalFetchInEffect` | `warning` |
| `globalRandom` | `warning` |
| `globalRandomInEffect` | `warning` |
| `globalTimers` | `warning` |
| `globalTimersInEffect` | `warning` |
| `instanceOfSchema` | `warning` |
| `layerMergeAllWithDependencies` | `warning` |
| `lazyEffect` | `suggestion` |
| `lazyPromiseInEffectSync` | `warning` |
| `leakingRequirements` | `suggestion` |
| `missedPipeableOpportunity` | `warning` |
| `missingEffectContext` | `error` |
| `missingEffectError` | `error` |
| `missingLayerContext` | `error` |
| `missingReturnYieldStar` | `error` |
| `missingStarInYieldEffectGen` | `error` |
| `multipleCatchTag` | `suggestion` |
| `multipleEffectProvide` | `warning` |
| `nestedEffectGenYield` | `warning` |
| `newPromise` | `warning` |
| `newSchemaClass` | `warning` |
| `nodeBuiltinImport` | `warning` |
| `outdatedApi` | `warning` |
| `overriddenSchemaConstructor` | `error` |
| `preferSchemaOverJson` | `warning` |
| `processEnv` | `warning` |
| `processEnvInEffect` | `warning` |
| `redundantMapError` | `suggestion` |
| `redundantOrDie` | `suggestion` |
| `redundantSchemaTagIdentifier` | `suggestion` |
| `returnEffectInGen` | `suggestion` |
| `runEffectInsideEffect` | `suggestion` |
| `schemaNumber` | `suggestion` |
| `schemaStructWithTag` | `suggestion` |
| `serviceNotAsClass` | `warning` |
| `strictBooleanExpressions` | `warning` |
| `strictEffectProvide` | `warning` |
| `tryCatchInEffectGen` | `suggestion` |
| `unknownInEffectCatch` | `warning` |
| `unnecessaryArrowBlock` | `warning` |
| `unnecessaryEffectGen` | `suggestion` |
| `unnecessaryFailYieldableError` | `suggestion` |
| `unnecessaryPipe` | `suggestion` |
| `unnecessaryPipeChain` | `suggestion` |
| `unnecessaryTypeofType` | `suggestion` |
| `unsafeEffectTypeAssertion` | `warning` |

## POLICY_IMPORT_STYLE

Effect import style 跟随官方用户文档。provider strict profile 固定：

```json
{
  "barrelImportPackages": ["effect"],
  "topLevelNamedReexports": "follow"
}
```

本仓代码优先使用 `import { Effect, FileSystem, Path } from "effect"` 这一类 top-level named
import。只有官方 package 仍要求不稳定子路径时，才使用 `effect/unstable/**`。

## POLICY_OVERRIDES

provider 默认不生成 `overrides`。

普通源码和普通测试不得使用 `overrides` 降低 strict policy。

generated code、fixture、vendored source 等明确 scope 可以在后续申请例外。例外不是默认 capability；
必须先更新本 ADR，再更新 provider profile、`tsconfig.json` 和 verifier。

## POLICY_SUPPRESSIONS

`src/**`、`bin/**` 和普通 `tests/**` 禁止使用 `@effect-diagnostics ...:off` 或
`@effect-diagnostics-next-line ...:off`。

诊断通过修代码解决，不通过注释关闭。

## POLICY_KEY_PATTERNS

provider strict profile 固定以下 key policy：

```json
{
  "keyPatterns": [
    { "target": "service", "pattern": "default", "skipLeadingPath": ["src/"] },
    { "target": "error", "pattern": "default", "skipLeadingPath": ["src/"] },
    { "target": "custom", "pattern": "default", "skipLeadingPath": ["src/"] }
  ],
  "extendedKeyDetection": true
}
```

## POLICY_LAYER_GRAPH

provider strict profile 固定：

```json
{
  "layerGraphFollowDepth": 1,
  "noExternal": true,
  "inlays": true,
  "allowedDuplicatedPackages": [],
  "pipeableMinArgCount": 2,
  "effectFn": ["span"]
}
```

需要 Mermaid 图时，由 harness 维护本地可读文档或 artifact。provider 默认不依赖外部 Mermaid 链接。

## POLICY_UPGRADE_LOOP

升级 `@effect/tsgo` 或 `@effect/language-service` 时，先读取 pinned `repos/tsgo` metadata。

如果只是字段、版本或 commit 迁移，可以按当前 policy 直接迁移。

如果规则语义发生改变，迁移必须 block，让用户 decide。

如果新增 v4 rule 或新增影响 provider projection 的 capability，迁移必须 block，让用户 decide
是否引入。用户确认后，先更新本 ADR，再更新 provider profile、`tsconfig.json` 和 verifier。

## VERIFIER_CONTRACT

`pnpm effect:verify` MUST 检查：

- `harness/tsgo.md` 包含所有稳定 policy keyword。
- `harness/tsgo.md` 包含当前 strict v4 rule map 的所有 rule name。
- `repos/tsgo/_packages/tsgo/src/metadata.json` 派生出的 v4 rule map 与
  `src/harness/verify/TsgoPolicy.ts` 一致。
- `tsconfig.json` 与 provider profile 的 `@effect/language-service` plugin policy 一致。
- provider profile 的 `tsgoPolicy` 指向 `tsgo-official-source`。
- `package.json` 使用 `effect-tsgo patch` 和 `tsgo --noEmit`。
- 普通源码没有 Effect diagnostic suppress 注释。
- `effect-tsgo --version` 与 `tsgo --version` 都能确认当前 `@effect/tsgo` baseline。
