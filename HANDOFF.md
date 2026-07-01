---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 在上下文压缩后恢复 effect-harness 第三阶段 strict tsgo 迁移完成态。
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
  - harness/tsgo.md
  - harness/tsgo-routes.md
  - harness/provider/effect-harness.provider.json
  - repos/effect.subtree.json
  - repos/tsgo.subtree.json
  - repos/effect/LLMS.md
  - repos/tsgo/README.md
updated: 2026-07-01
---

# Handoff

## Current

本仓已经完成第三阶段 strict tsgo 迁移。

压缩后先读 `STATUS.md`、`harness/index.md`、`harness/tsgo.md` 和 `harness/source.md`。

`STATUS.md` 是当前完成态 checklist。不能把旧计划态、旧 `.codex/skills`、target runtime 模板、
feedback intake、`.effect-harness.json` 或 target dispatcher scripts 恢复回来。

## Boundary

本仓是 Effect v4 beta 的 Prelude provider profile 与 source route package。

Partita 负责通用 GitHub subtree pin workflow。

Prelude 负责 target lifecycle、provider record、drift、verify 和 maintain。

effect-harness 负责：

- provider-internal Effect source entry
- provider-internal tsgo source entry
- source routes
- strict tsgo ADR/policy
- provider profile
- provider 仓自身 verifier

## Source Entries

当前 source entries：

| Name | Contract | Prefix | Route | Split |
| --- | --- | --- | --- | --- |
| `effect` | `repos/effect.subtree.json` | `repos/effect` | `harness/effect-routes.md` | `e11cccc7d5fe631abccc7d6e3bd296938de0fa2e` |
| `tsgo` | `repos/tsgo.subtree.json` | `repos/tsgo` | `harness/tsgo-routes.md` | `43ed476270fb3cf78fe7afac2086d67340ca0486` |

source trees 只给 provider 仓内部读取，不投影到 target 项目。

应用代码和测试代码禁止从 `repos/effect` 或 `repos/tsgo` import。

## Baseline

当前 package baseline：

- `effect@4.0.0-beta.92`
- `@effect/platform-node@4.0.0-beta.92`
- `@effect/vitest@4.0.0-beta.92`
- `@effect/tsgo@0.15.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260630.1`

`effect-tsgo patch` 是 setup/patch 命令。

`tsgo --noEmit` 是 typecheck 和 Effect diagnostics 主入口。

## Strict Policy

`harness/tsgo.md` 是 strict tsgo ADR/policy。

当前 policy 覆盖 `@effect/tsgo@0.15.0` metadata 中所有 76 条 v4 rules。

hard gate 要求 0 error、0 warning、0 suggestion、0 message。

warning、suggestion 和 message 不通过降级绕过。

provider 默认不生成 `overrides`。

普通源码和普通测试禁止 `@effect-diagnostics ...:off` suppressions。

## Upgrade

升级 `@effect/tsgo` 或 pinned `repos/tsgo` 时：

1. 读取新旧 `repos/tsgo/_packages/tsgo/src/metadata.json`。
2. 对照 `harness/tsgo.md`。
3. 只是字段、版本或 commit 迁移时，直接迁移。
4. 规则语义改变时，block 让用户 decide。
5. 新增 v4 rule 或新增影响 provider projection 的 capability 时，block 让用户 decide。
6. 用户确认后，先更新 `harness/tsgo.md`。
7. 再更新 provider profile、`tsconfig.json` 和 verifier。

## Provider

provider profile 已声明：

- `effect-official-source`
- `tsgo-official-source`
- `tsgoPolicy`
- strict `@effect/language-service` plugin projection
- package/script/tsconfig/provider record/source identity target surfaces

target 项目不接收 `repos/effect` 或 `repos/tsgo` 本体。

target provider record 应记录 Effect source identity 和 tsgo source identity。

## Verify

完成态验证命令：

```bash
pnpm source:verify
pnpm effect:verify
pnpm verify
```

`pnpm verify` 包含 provider repository verifier、`tsgo --noEmit`、tests、eslint 和 knip。

提交前必须确认 `STATUS.md` 没有未完成 checkbox。
