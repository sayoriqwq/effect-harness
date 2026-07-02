---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 定义 effect-harness 第二阶段的 Codex feedback loop 和统一 verify pipeline。
status: active
sources:
  - AGENTS.md
  - HARNESS.md
  - harness/index.md
  - harness/offcial-guide.md
  - harness/offcial-migrate.md
  - harness/source.md
  - harness/effect-routes.md
  - harness/tsgo.md
  - harness/tsgo-routes.md
  - harness/diagnostic-layers.md
  - src/harness/verify/Pipeline.ts
  - src/harness/verify/VerifyStage.ts
  - https://developers.openai.com/codex/learn/best-practices
  - https://developers.openai.com/codex/prompting
  - https://developers.openai.com/codex/guides/agents-md
updated: 2026-07-02
---

# Feedback Loop

## BASELINE

进入第二阶段 loop 前，当前仓库 MUST 已经满足干净基线。

```bash
pnpm verify
```

如果基线不为 0，MUST 先修复当前失败，再开始新的代码或文档修改。

`pnpm verify` 是唯一完成命令。`source:verify`、`effect:verify`、`typecheck`、`test`、`lint`
和 `knip` 只作为局部排错入口，不作为完成态替代命令。

`pnpm verify` 同时是 self-conformance gate。它证明 provider repository 符合自己的 exported
harness contract，但不生成 `.prelude/**` 或 Prelude target lifecycle state。

## ROUTE_TABLE

Codex 在本仓写 Effect 程序逻辑，或修改 source route、tsgo policy、provider profile、
verify pipeline、harness 边界时，MUST 按以下闭环执行：

1. 明确任务意图和涉及模块。
2. 从 `harness/index.md` 找到对应路线。
3. 按 `harness/effect-routes.md` 或 `harness/tsgo-routes.md` 读取 pinned source。
4. 做一轮最小修改。
5. 运行 `pnpm verify`。
6. 如果失败，按失败 stage 的 route 回到对应文档和 source 修复。
7. 重复到 `pnpm verify` 为 0。
8. review diff，确认没有绕过 strict policy。

MUST NOT 通过 suppress、override、恢复旧口径或从 `repos/**` import 来让 loop 变绿。

agent 默认从 `harness/index.md` 和 route tables 选择读取路径。这里不维护额外 task intake
分类，也不把任务强行归入单选 kind。

如果修改前判断和失败后的 stage route 冲突，MUST 服从 failed stage route。

## VERIFY_PIPELINE

`pnpm verify` 由 Effect pipeline 组织，入口是 `effect-harness verify --harness .`。

pipeline 采用 fail-fast。stage 按重要性排序，越接近真源和 harness contract 的检查越靠前。
失败输出 MUST 包含 code-defined stage tag、title、route、routeHint 和底层工具原始输出。

stage 真源是 `src/harness/verify/VerifyStage.ts`。本节只是 agent-readable projection。

| Stage | Route | Summary | Route Hint |
| --- | --- | --- | --- |
| `source-pins` | `harness/source.md` | Verify pinned GitHub subtree source entries. | Read the source-entry contract and fix Partita source pin drift. |
| `harness-contract` | `harness/index.md`、`harness/offcial-migrate.md`、`harness/feedback-loop.md` | Verify the provider repository contract and current harness baseline. | Read the harness index, migrate notes, and feedback loop contract before changing verifier behavior. |
| `tsgo-diagnostics` | `harness/tsgo.md`、`harness/tsgo-routes.md` | Run tsgo --noEmit and enforce zero Effect diagnostics. | Use the tsgo diagnostic output first; read the tsgo policy and routes only when the diagnostic is not enough. |
| `tests` | `harness/effect-routes.md` | Run the Effect test suite. | Read the Effect testing route and fix behavior through @effect/vitest patterns. |
| `lint` | `harness/diagnostic-layers.md`、`AGENTS.md`、`eslint.config.mjs` | Run ESLint with zero warnings. | Read the diagnostic layering contract, agent rules, and lint config, then fix repository boundary violations without duplicating tsgo semantics. |
| `knip` | `package.json` | Run knip and keep the package surface minimal. | Read package.json and source imports/exports, then remove unused package surface. |

## STAGE_SOURCE_PINS

失败时先读 `harness/source.md`。

这一 stage 验证 provider-internal source entries 仍然由 Partita GitHub subtree pin 管理。

常见修复方向：

- contract 中的 `github.ref`、`subtree.split` 和 git history trailer 必须一致。
- `repos/effect/` 和 `repos/tsgo/` 必须是 committed Git tree entries。
- anchor 和 agent route 必须存在。
- source prefix 不能变成 submodule 或 nested Git repository。

## STAGE_HARNESS_CONTRACT

失败时先读 `harness/index.md`、`harness/offcial-migrate.md` 和 `harness/feedback-loop.md`。

这一 stage 验证当前仓库仍处于新基线。

常见修复方向：

- provider profile 必须保留当前 package baseline、source identities 和 strict tsgo policy。
- provider repository 必须保持 self-conformance，不得 materialize `.prelude/**` 或 target
  provider namespace。
- legacy surfaces 不能恢复。
- 应用代码和测试代码不能 import `repos/effect` 或 `repos/tsgo`。
- CLI 必须使用 `effect/unstable/cli`，不能恢复 `@effect/cli`。
- 当前 service definition baseline 是 `Context.Service`。

## STAGE_TSGO_DIAGNOSTICS

失败时先读 `harness/tsgo.md` 和 `harness/tsgo-routes.md`。

这一 stage 是 Effect 语义 feedback 的主入口。

修复时 SHOULD 先用 diagnostic name 定位 `repos/tsgo/_packages/tsgo/src/metadata.json`，再按
`harness/tsgo-routes.md` 查具体 rule、fixture 或 quickfix 行为。

MUST 修复代码或 policy。MUST NOT 用普通源码 suppressions、local override 或放宽 rule map
绕过失败。

## STAGE_TESTS

失败时先读 `harness/effect-routes.md` 中 testing 路线。

本仓测试使用 `@effect/vitest`。Effect 程序测试 SHOULD 使用 `it.effect`、`it.live` 或 `layer`
组织，不用普通 `vitest` 入口替代。

## STAGE_LINT

失败时先读 `harness/diagnostic-layers.md`、`AGENTS.md` 和 `eslint.config.mjs`。

lint stage 要求 0 error 和 0 warning。

lint 规则用于补 tsgo 未覆盖的仓库边界，例如 import boundary、CLI baseline、测试入口和
harness syntax-level guardrails。Effect 类型语义、Schema 语义、Layer 语义和 Effect-native
API 偏好由 `tsgo-diagnostics` stage 负责。

## STAGE_KNIP

失败时先读 `package.json` 和相关 source exports/imports。

knip stage 用于保持 provider package surface 最小。修复时 SHOULD 优先删除不需要的 exports、
imports 或 package fields，而不是为了 silence knip 添加无意义引用。

## DONE

一次 loop 只有在以下条件同时满足时才完成：

- `pnpm verify` 通过。
- 失败过的 stage 已按对应 route 修复。
- 没有新增 suppress、override、legacy surface 或 `repos/**` import。
- diff 已 review，确认没有把第二阶段扩展成 Prelude target lifecycle 实现或 repo skill/hook/rules 建设。
