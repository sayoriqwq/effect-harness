# Effect Harness 路线

本仓不是通用 pin 框架，也不是目标项目的第二套 maintain 系统。当前职责是维护 Effect/tsgo
源入口实例、读取路线、Effect 基线、strict tsgo policy 和 Prelude provider profile。

## 两层结构

| 层级 | 目的 | 本仓负责什么 | 不负责什么 |
| --- | --- | --- | --- |
| Harness 层 | 指导 `effect-harness` 本仓自己怎么运转 | 官方 guide、第一阶段实现说明、Effect/tsgo 源入口实例、路线表、strict policy、最小验证器 | 通用 pin 实现、目标项目落地生成 |
| Provider 层 | 让 Prelude 知道如何集成 effect-harness | 通过 provider profile 声明目标项目应接收的基线、诊断入口与 source identities | 直接写目标 runtime、`.codex`、`.effect-harness.json`、目标 `AGENTS.md` 管理块 |

## 真源

- `harness/offcial-guide.md`：仓内 guide 唯一真源。
- `harness/offcial-migrate.md`：官方 source access 与 LSP/tsgo 阶段的 harness/provider 实现说明。
- `harness/feedback-loop.md`：第二阶段 Codex feedback loop 和统一 verify pipeline。
- `repos/effect.subtree.json`：Partita 管理的 GitHub subtree pin 契约，是 Effect 源入口唯一真源。
- `repos/tsgo.subtree.json`：Partita 管理的 GitHub subtree pin 契约，是 tsgo 源入口真源。
- `repos/effect/LLMS.md`：pinned 上游 Effect LLM guide。
- `harness/effect-routes.md`：agent 读取 `repos/effect/` 的路线表。
- `harness/tsgo.md`：strict tsgo ADR、policy、rule map 和 upgrade loop。
- `harness/tsgo-routes.md`：agent 读取 `repos/tsgo/` 的路线表。
- `harness/provider/effect-harness.provider.json`：Prelude provider profile，也是 package 基线真源。

## 职责分配

- Partita 负责通用源入口 pin 流程。
- effect-harness 负责 Effect/tsgo 具体源入口实例和 provider profile。
- Prelude 负责消费 provider profile，并维护目标项目的 provider record、drift、verify 和 maintain。

## 已移除表面

新基线不包含仓内 Codex skills、目标 runtime 模板、反馈入口、目标
`AGENTS.md` 管理块，也不保留 `.effect-harness.json` 独立状态。

## 验证

```bash
pnpm verify
```

完成态只认 `pnpm verify`。该命令由 Effect pipeline 组织，按 `source-pins`、
`harness-contract`、`tsgo-diagnostics`、`tests`、`lint`、`knip` 顺序 fail-fast 执行。
`pnpm source:status`、`pnpm source:update` 和局部 verify scripts 只作为排错入口。

目标项目由 Prelude provider maintain/verify；effect-harness 不直接向目标项目投影 runtime 资产。
