---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 effect-harness 如何按官方 Coding with LLMs 三阶段建议完成当前迁移。
status: active
sources:
  - harness/offcial-guide.md
  - harness/source.md
  - harness/effect-routes.md
  - harness/tsgo.md
  - harness/tsgo-routes.md
  - harness/provider/effect-harness.provider.json
  - repos/effect.subtree.json
  - repos/tsgo.subtree.json
  - repos/effect/LLMS.md
  - repos/tsgo/README.md
  - https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/
  - https://github.com/mikearnaldi/accountability
  - https://github.com/Effect-TS/tsgo
updated: 2026-07-01
---

# Official Migrate

## Scope

官方 guide 在本仓被拆成三块推进：

1. 让 agent 读取真实 Effect source。
2. 参考项目级工程化反馈回路。
3. 接入 Effect Language Service / tsgo，让 diagnostics 成为 hard gate。

当前已经完成第一阶段、第二阶段的本仓 harness feedback loop、以及第三阶段。

第二阶段不照抄 `mikearnaldi/accountability` 的业务、前端架构或旧 Effect 写法。本仓只迁移工程化
理念：Codex 需要稳定入口、读取路线、可执行 hard gate 和失败后的回路。

## Layering

Harness 层维护 provider 仓内部事实：

- `repos/effect/` 和 `repos/effect.subtree.json`
- `repos/tsgo/` 和 `repos/tsgo.subtree.json`
- `harness/effect-routes.md`
- `harness/tsgo.md`
- `harness/tsgo-routes.md`
- `src/harness/**` verifier

Provider 层把这些事实投影为 Prelude 可消费的 profile：

- package baseline
- source identities
- `effect-tsgo patch`
- `tsgo --noEmit`
- strict `@effect/language-service` plugin policy
- target 不接收 provider-internal source trees 的边界

Prelude 负责目标项目 lifecycle、provider record、drift、verify 和 maintain。

## Stage 1

第一阶段对应官方文章的 source access 工作流。

本仓通过 Partita GitHub subtree pin，把 Effect v4 beta 官方 source 固定到 `repos/effect/`。

`repos/effect.subtree.json` 记录上游 repo、branch/ref、local prefix、split、anchor、agent route、
editor policy、ownership 和 read-only/import block。

`repos/effect/LLMS.md` 是 agent 写 Effect 程序逻辑前的 LLM anchor。

`harness/effect-routes.md` 按 agent 意图组织读取路线，覆盖 API surface、tests、ai-docs、CLI、
Node runtime、services、Schema、HTTP、AI、SQL、Cluster/RPC/Workflow 等路径。

`src/harness/SourcePin.ts` 和 `src/harness/Guardrails.ts` 把以下边界变成 hard check：

- source prefix 必须存在。
- source prefix 必须是 committed Git tree entry，不能是 gitlink/submodule。
- git history 必须有匹配 contract split 的 subtree trailer。
- anchor 和 route 必须存在。
- 应用代码和测试代码禁止从 source prefix import。
- provider 仓 source pin 不投影到目标项目。

## Stage 2

第二阶段当前聚焦 `effect-harness` 本仓 harness，不处理 Prelude target 集成。

本仓把 Codex feedback loop 固定为：

1. 进入 loop 前运行 `pnpm verify`，确认当前基线为 0。
2. 按任务意图读取 `harness/index.md`、`harness/effect-routes.md` 和 `harness/tsgo-routes.md`。
3. 做一轮最小修改。
4. 运行 `pnpm verify`。
5. 如果失败，按 verify stage 输出的 route 回到对应文档和 pinned source 修复。
6. 重复到 `pnpm verify` 为 0。
7. review diff，确认没有 suppress、override、`repos/**` import 或旧口径恢复。

`pnpm verify` 由 Effect pipeline 组织，入口是 `effect-harness verify --harness .`。

verify stage 真源是 `src/harness/verify/VerifyStage.ts`。`harness/feedback-loop.md` 只是
agent-readable projection，并由 `harness-contract` stage 校验覆盖。

pipeline 采用 fail-fast，stage 顺序是：

| Stage | Route |
| --- | --- |
| `source-pins` | `harness/source.md` |
| `harness-contract` | `harness/index.md`、`harness/offcial-migrate.md`、`harness/feedback-loop.md` |
| `tsgo-diagnostics` | `harness/tsgo.md`、`harness/tsgo-routes.md` |
| `tests` | `harness/effect-routes.md` |
| `lint` | `harness/diagnostic-layers.md`、`AGENTS.md`、`eslint.config.mjs` |
| `knip` | `package.json` |

本阶段不引入：

- accounting 业务规则。
- React/TanStack 前端约束。
- 参考仓旧 Effect service 写法。
- 参考仓 language-service 配置。
- auto agent loop。
- repo skill。
- Codex hook。
- Codex rules。
- 目标 runtime 模板。
- feedback intake。
- `.effect-harness.json` standalone state。
- effect-harness 管理的目标 `AGENTS.md` block。

## Stage 3

第三阶段已经完成 strict tsgo 迁移。

当前基线：

- `@effect/tsgo@0.15.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260630.1`

本仓把 `Effect-TS/tsgo` pin 到 `repos/tsgo/`，commit 为
`43ed476270fb3cf78fe7afac2086d67340ca0486`。该 commit 绑定当前 `@effect/tsgo@0.15.0`
package baseline。

`harness/tsgo.md` 记录 strict policy、rule map、diagnostic gate、import style、overrides、
suppressions、key patterns、layer graph 和 upgrade loop。

`harness/tsgo-routes.md` 按 agent 意图组织读取路线，覆盖 metadata、rules、fixtures、LSP、
auto-import、setup、patch、schema/options、hooks 和 tests。

`tsconfig.json` 和 provider profile 使用同一份 strict `@effect/language-service` plugin policy。

`pnpm typecheck` 固定为：

```bash
tsgo --noEmit
```

`pnpm prepare` 固定为：

```bash
effect-tsgo patch
```

strict policy 要求 `tsgo --noEmit` 达到 0 error、0 warning、0 suggestion、0 message。warning
和 suggestion 也通过 exit-code hard gate 参与失败判定。

## Provider

`harness/provider/effect-harness.provider.json` 暴露两个 provider-internal source entries：

- `effect-official-source`
- `tsgo-official-source`

provider profile 对目标项目的交付是 identity-only。目标项目接收 provider record 中的 source
identity，不接收 `repos/effect/`、`repos/tsgo/` 或 subtree contract 本体。

Provider target surfaces 保持最小：

- `.prelude/providers/effect-harness/provider.json`
- `package.json` dependencies/devDependencies/script pointers
- `tsconfig.json` language-service plugin projection
- provider artifact/source identities

Provider 明确不交付：

- `.codex` runtime files
- effect-harness `AGENTS.md` managed block
- `.effect-harness.json`
- `.codex/effect-feedback`
- target dispatcher scripts
- relaxed/compatibility profile

## Verification

当前完成定义只认一个命令：

```bash
pnpm verify
```

`pnpm verify` 由 Effect pipeline 组织，按 `source-pins`、`harness-contract`、
`tsgo-diagnostics`、`tests`、`lint`、`knip` 顺序 fail-fast 执行。

`source-pins` stage 借用 Partita pin verifier。`harness-contract` stage 验证 source entries、
provider profile、strict tsgo policy、package baseline、rule map、diagnostic suppressions 和
import boundary。`tsgo-diagnostics` stage 运行 `tsgo --noEmit`，后续 stages 运行 tests、eslint
和 knip。

如果官方 guide、pinned source、tsgo metadata 或 provider profile 之间冲突，优先修正到官方真源
和 pinned source，再更新最小 provider route。
