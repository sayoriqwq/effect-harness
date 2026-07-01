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
  - src/harness/verify/Pipeline.ts
  - https://developers.openai.com/codex/learn/best-practices
  - https://developers.openai.com/codex/prompting
  - https://developers.openai.com/codex/guides/agents-md
updated: 2026-07-01
---

# Feedback Loop

## Baseline

进入第二阶段 loop 前，当前仓库 MUST 已经满足干净基线。

```bash
pnpm verify
```

如果基线不为 0，MUST 先修复当前失败，再开始新的代码或文档修改。

`pnpm verify` 是唯一完成命令。`source:verify`、`effect:verify`、`typecheck`、`test`、`lint`
和 `knip` 只作为局部排错入口，不作为完成态替代命令。

## Loop

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

## Verify Pipeline

`pnpm verify` 由 Effect pipeline 组织，入口是 `effect-harness verify --harness .`。

pipeline 采用 fail-fast。stage 按重要性排序，越接近真源和 harness contract 的检查越靠前。
失败输出 MUST 包含稳定 stage 名和 route 提示。

| Stage | Route | 检查 |
| --- | --- | --- |
| `source-pins` | `harness/source.md` | Partita GitHub subtree contracts、source prefix、anchor、route、read-only/import boundary。 |
| `harness-contract` | `harness/index.md`、`harness/offcial-migrate.md` | provider 仓 contract、legacy surface 清理、strict tsgo policy、import guardrails。 |
| `tsgo-diagnostics` | `harness/tsgo.md`、`harness/tsgo-routes.md` | `tsgo --noEmit`，要求 0 error、0 warning、0 suggestion、0 message。 |
| `tests` | `harness/effect-routes.md` | `@effect/vitest` 测试。 |
| `lint` | `AGENTS.md`、`eslint.config.js` | ESLint，warning 数量必须为 0。 |
| `knip` | `package.json` | exports、imports 和 package surface 清理。 |

## source-pins

失败时先读 `harness/source.md`。

这一 stage 验证 provider-internal source entries 仍然由 Partita GitHub subtree pin 管理。

常见修复方向：

- contract 中的 `github.ref`、`subtree.split` 和 git history trailer 必须一致。
- `repos/effect/` 和 `repos/tsgo/` 必须是 committed Git tree entries。
- anchor 和 agent route 必须存在。
- source prefix 不能变成 submodule 或 nested Git repository。

## harness-contract

失败时先读 `harness/index.md` 和 `harness/offcial-migrate.md`。

这一 stage 验证当前仓库仍处于新基线。

常见修复方向：

- provider profile 必须保留当前 package baseline、source identities 和 strict tsgo policy。
- legacy surfaces 不能恢复。
- 应用代码和测试代码不能 import `repos/effect` 或 `repos/tsgo`。
- CLI 必须使用 `effect/unstable/cli`，不能恢复 `@effect/cli`。
- 当前 service definition baseline 是 `Context.Service`。

## tsgo-diagnostics

失败时先读 `harness/tsgo.md` 和 `harness/tsgo-routes.md`。

这一 stage 是 Effect 语义 feedback 的主入口。

修复时 SHOULD 先用 diagnostic name 定位 `repos/tsgo/_packages/tsgo/src/metadata.json`，再按
`harness/tsgo-routes.md` 查具体 rule、fixture 或 quickfix 行为。

MUST 修复代码或 policy。MUST NOT 用普通源码 suppressions、local override 或放宽 rule map
绕过失败。

## tests

失败时先读 `harness/effect-routes.md` 中 testing 路线。

本仓测试使用 `@effect/vitest`。Effect 程序测试 SHOULD 使用 `it.effect`、`it.live` 或 `layer`
组织，不用普通 `vitest` 入口替代。

## lint

失败时先读 `AGENTS.md` 和 `eslint.config.js`。

lint stage 要求 0 error 和 0 warning。

lint 规则用于补 tsgo 未覆盖的仓库边界，例如 import boundary、CLI baseline、测试入口和
Effect guardrails。

## knip

失败时先读 `package.json` 和相关 source exports/imports。

knip stage 用于保持 provider package surface 最小。修复时 SHOULD 优先删除不需要的 exports、
imports 或 package fields，而不是为了 silence knip 添加无意义引用。

## Done

一次 loop 只有在以下条件同时满足时才完成：

- `pnpm verify` 通过。
- 失败过的 stage 已按对应 route 修复。
- 没有新增 suppress、override、legacy surface 或 `repos/**` import。
- diff 已 review，确认没有把第二阶段扩展成 Prelude target 集成或 repo skill/hook/rules 建设。
