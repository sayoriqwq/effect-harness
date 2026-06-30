# Harness 文档索引

本仓文档按两层组织。阅读时先判断当前工作属于哪一层，避免把 provider 仓自身维护和目标项目
maintain 混在一起。

## 第一层：本仓建设层

这一层回答“我们现在在 `effect-harness` 里做什么”。

| 意图 | 先读 | 真源 | 验证 |
| --- | --- | --- | --- |
| 理解已批准计划 | `harness/offcial-guide.md` | 官方 guide brief | 不适用 |
| 查看 Effect 源入口契约 | `harness/source.md` | `.partita/source-entries.json`、`repos/effect.subtree.json`、`repos/effect/LLMS.md` | `pnpm source:verify`、`pnpm effect:verify` |
| 按 agent 意图读取 Effect 源码 | `harness/effect-routes.md` | `repos/effect/LLMS.md`、`repos/effect/packages/**`、`repos/effect/ai-docs/src/**` | `pnpm effect:verify` |
| 更新 Effect 源入口 | `harness/source.md` | Partita source contract、上游 Effect repo | `pnpm source:update`、`pnpm verify`、subtree trailers |
| 查看本仓 provider profile | `harness/provider/index.md` | `harness/provider/effect-harness.provider.json` | `pnpm effect:verify` |

## 第二层：目标 Harness 层

这一层回答“目标项目接入后应持续得到什么约束”。本仓只声明 profile；实际生成、drift 和维护由
Prelude 执行。

| 目标项目能力 | 来源 | 由谁维护 | 目标项目是否接收源码 |
| --- | --- | --- | --- |
| provider record 与 source identity | `harness/provider/effect-harness.provider.json` | Prelude | 否 |
| Effect package 基线 | `repos/effect.subtree.json`、provider profile | Prelude | 否 |
| `tsgo --noEmit` 诊断路径 | provider profile | Prelude | 否 |
| `@effect/language-service` 与 `floatingEffect: error` | provider profile | Prelude | 否 |
| 源码阅读路线 | `harness/effect-routes.md` | effect-harness | 仅 provider 仓内部使用 |

## 边界

- Partita 负责通用源入口 pin 流程；effect-harness 不自建第二套 pin CLI。
- effect-harness 负责 Effect 源入口实例、路线、基线、provider profile 和本仓验证。
- Prelude 负责目标项目生命周期、provider record、落地生成、drift、verify 和 maintain。
- 业务代码和测试代码禁止从 `repos/effect` import。
- 本仓不再分发 Codex skills 或目标 runtime 资产。
- `.effect-harness.json`、旧 effect-harness `.codex` 资产、反馈入口、effect-harness
  `AGENTS.md` 管理块都是旧状态，应从目标项目中移除。
