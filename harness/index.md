---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 组织 effect-harness harness 层与 provider 层的文档入口。
status: active
sources: []
updated: 2026-07-01
---

# Harness Index

本仓文档按 harness 层和 provider 层组织。阅读时先判断当前工作是在维护本仓自己，
还是在定义交给 Prelude 集成的 provider contract。

## Documents

| 文档 | 职责 | 不承载 |
| --- | --- | --- |
| `harness/offcial-guide.md` | 维护 Effect 官方 `Coding with LLMs` 小节的当前源口径、官方链接和官方段落。 | 本仓实践、迁移顺序、本机集成、provider profile、verifier 和 Prelude target surfaces。 |
| `harness/offcial-migrate.md` | 描述官方三阶段建议在本仓的迁移状态、实现取舍、harness/provider 分层和集成判断。 | 官方原文镜像、通用 GitHub pin 流程和目标项目生命周期实现。 |
| `harness/feedback-loop.md` | 定义第二阶段 Codex feedback loop、统一 verify pipeline、stage route 和完成条件。 | Provider target materialization、repo skill/hook/rules 建设和通用 Partita pin 流程。 |
| `harness/source.md` | 描述本仓 provider-internal source entries、subtree pin 和 source boundary。 | 通用 Partita pin 设计和 Prelude target maintain 逻辑。 |
| `harness/effect-routes.md` | 给 agent 提供读取 `repos/effect/` 的路线表。 | 目标项目 runtime assets 和 provider record materialization。 |
| `harness/tsgo.md` | 记录 strict tsgo ADR、policy、rule map、exception 边界和 upgrade loop。 | Effect API 使用路线、通用 pin workflow 和 Prelude target lifecycle。 |
| `harness/tsgo-routes.md` | 给 agent 提供读取 `repos/tsgo/` 的路线表。 | strict policy 决策和 provider target projection。 |
| `harness/provider/index.md` | 描述 Prelude 消费 effect-harness provider profile 的方式。 | 本仓 source route 的完整内容和通用 pin workflow。 |

## Harness

这一层回答“`effect-harness` 本仓自己怎么运转”。

| 意图 | 先读 | 真源 | 验证 |
| --- | --- | --- | --- |
| 理解官方三阶段路线 | `harness/offcial-guide.md` | Effect 官方 Introduction / Coding with LLMs | 不适用 |
| 执行第二阶段 feedback loop | `harness/feedback-loop.md` | `src/harness/verify/Pipeline.ts`、`harness/effect-routes.md`、`harness/tsgo-routes.md` | `pnpm verify` |
| 理解第一阶段 source access 实现 | `harness/offcial-migrate.md` | `repos/effect.subtree.json`、`harness/source.md`、`harness/effect-routes.md`、provider profile | `pnpm verify` |
| 理解第三阶段 LSP/tsgo 实现 | `harness/offcial-migrate.md`、`harness/tsgo.md` | `repos/tsgo.subtree.json`、`repos/tsgo/_packages/tsgo/src/metadata.json`、`tsconfig.json`、provider profile | `pnpm verify` |
| 查看 source entry 契约 | `harness/source.md` | `repos/effect.subtree.json`、`repos/tsgo.subtree.json` | `pnpm verify` |
| 按 agent 意图读取 Effect 源码 | `harness/effect-routes.md` | `repos/effect/LLMS.md`、`repos/effect/packages/**`、`repos/effect/ai-docs/src/**` | `pnpm verify` |
| 按 agent 意图读取 tsgo 源码 | `harness/tsgo-routes.md` | `repos/tsgo/README.md`、`repos/tsgo/_packages/tsgo/src/**`、`repos/tsgo/internal/**`、`repos/tsgo/etscore/**` | `pnpm verify` |
| 更新 source entries | `harness/source.md` | Partita GitHub subtree contracts、上游 Effect/tsgo repos | `pnpm source:update`、`pnpm verify`、subtree trailers |
| 验证本仓边界 | `HARNESS.md` | `src/harness/**`、provider profile、source contract | `pnpm verify` |

## Provider

这一层回答“Prelude 集成 effect-harness 时应该消费什么”。本仓只声明 provider profile；
实际生成、drift 和维护由 Prelude 执行。

| Prelude 消费内容 | 来源 | 由谁维护 | 目标项目是否接收源码 |
| --- | --- | --- | --- |
| provider profile | `harness/provider/index.md`、`harness/provider/effect-harness.provider.json` | effect-harness | 否 |
| provider record 与 source identities | `harness/provider/effect-harness.provider.json` | Prelude | 否 |
| Effect package 基线 | provider profile | Prelude | 否 |
| `tsgo --noEmit` 诊断路径 | provider profile、`harness/tsgo.md` | Prelude | 否 |
| strict `@effect/language-service` policy | provider profile、`harness/tsgo.md` | Prelude | 否 |
| 源码阅读路线 | `harness/effect-routes.md` | effect-harness | 仅 provider 仓内部使用 |
| tsgo 源码阅读路线 | `harness/tsgo-routes.md` | effect-harness | 仅 provider 仓内部使用 |

## 边界

- Partita 负责 GitHub subtree pin 流程；effect-harness 不自建第二套 pin CLI。
- effect-harness 负责 Effect/tsgo 源入口实例、路线、基线、provider profile 和本仓验证。
- Prelude 负责消费 provider profile，并在目标项目中维护 provider record、落地生成、drift、verify
  和 maintain。
- 业务代码和测试代码禁止从 `repos/effect` 或 `repos/tsgo` import。
- 本仓不再分发 Codex skills 或目标 runtime 资产。
- `.effect-harness.json`、effect-harness `.codex` 资产、反馈入口、effect-harness
  `AGENTS.md` 管理块不属于当前 target surfaces。
