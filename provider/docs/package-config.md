---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 target 接入 effect-harness 后 package 与 TypeScript 配置的受管口径。
status: active
sources:
  - provider/effect-harness.provider.json
  - harness/tsgo.md
updated: 2026-07-02
---

# Package Config

## Package

target 的 runtime dependencies MUST 包含 `effect` 和 `@effect/platform-node`。

target 的 Effect testing dependency MUST 包含 `@effect/vitest`。

target 的 diagnostics dependencies MUST 包含 `@effect/tsgo` 和 `@effect/language-service`。

target 的 native backend dependency MUST 包含 `@typescript/native-preview`。

版本基线由 provider profile 管理。target 不应该用局部版本覆盖降低 Effect v4 beta、tsgo 或
language-service baseline。

## Scripts

target 的 native backend setup script SHOULD 指向：

```bash
effect-tsgo patch
```

target 的 primary diagnostics script SHOULD 指向：

```bash
tsgo --noEmit
```

这些 script 是 provider-managed 指针。Prelude materialization 和 maintain 应按 provider record
判断本地 drift。

## Tsconfig

target 的 `tsconfig.json` MUST 包含 `@effect/language-service` plugin。

plugin fields MUST 保持 provider profile 声明的 strict v4 policy。

`diagnosticSeverity` MUST 是 provider profile 投影出的显式 rule map。

target SHOULD 修复 diagnostics，而不是在 `tsconfig.json` 里添加 local override、关闭
`diagnosticSeverity` 或降低 diagnostic gate。
