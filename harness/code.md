---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 effect-harness 仓内 TypeScript 代码的职责和非职责。
status: active
sources:
  - src/cli/Main.ts
  - src/harness/SourcePin.ts
  - src/harness/verify/Pipeline.ts
  - src/harness/verify/ProviderProfile.ts
  - src/harness/verify/ProviderRepository.ts
  - src/harness/verify/Tsgo.ts
  - tests/effect-provider-profile.test.ts
  - tests/effect-source-subtree.test.ts
updated: 2026-07-02
---

# Code Surface

## Boundary

`src/` 和 `bin/` 不是 target runtime，也不是业务 Effect application。

这些代码服务 effect-harness 本仓验证、provider profile hard gate、source pin hard gate 和 CLI
package entrypoint。

## CLI

`bin/effect-harness.ts` 是 npm package 的 executable entry。

`src/cli/Main.ts` 暴露三个命令：

| Command | Purpose |
| --- | --- |
| `verify --harness <path>` | 运行完整 provider repository verify pipeline。 |
| `provider-verify --harness <path>` | 验证 provider repository contract 和 source pin。 |
| `source-verify --harness <path>` | 验证 Effect/tsgo source pin contract。 |

CLI 使用 `effect/unstable/cli`，不使用旧 `@effect/cli`。

## Verify

`src/harness/verify/Pipeline.ts` 定义 `pnpm verify` 的 stage 顺序。

`src/harness/verify/VerifyStage.ts` 定义 stage metadata、route 和 failure message。`harness/feedback-loop.md`
必须跟它保持一致。

`src/harness/verify/ProviderRepository.ts` 验证当前仓库没有恢复 legacy provider surface，并把 provider
profile、tsgo policy、source pin 和 import boundary 串起来。

`src/harness/verify/ProviderProfile.ts` 验证 provider profile 的 contract，包括 package baseline、
source identity、managed surfaces、docs bundle 和 snippets。

## Source

`src/harness/SourcePin.ts` 验证 `repos/effect.subtree.json` 和 `repos/tsgo.subtree.json`：

- source prefix 必须存在。
- source prefix 必须是 committed Git tree entry。
- Git history 必须包含匹配 split 的 subtree trailer。
- anchor 和 route 必须存在。
- 应用代码和测试代码不能 import provider-internal source tree。
- package baseline 不能和 provider profile 漂移。

## Tsgo

`src/harness/verify/Tsgo.ts`、`TsgoPolicy.ts`、`TsgoMetadata.ts` 和 `TsgoSuppressions.ts` 维护 strict
tsgo policy：

- `tsconfig.json` 与 provider profile 的 `@effect/language-service` plugin 必须一致。
- metadata 派生出的 v4 rule map 必须和本仓 strict policy 一致。
- 普通源码不能使用 Effect diagnostic suppress 注释绕过 gate。
- `effect-tsgo --version` 和 `tsgo --version` 必须匹配当前 baseline。

## Tests

`tests/effect-provider-profile.test.ts` 约束 provider profile shape。

`tests/effect-source-subtree.test.ts` 约束 source pin verifier 的 failure cases。

这些测试是 harness contract regression tests，不是 target 项目的模板测试。
