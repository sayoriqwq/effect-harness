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
| `harness/source.md` | 描述本仓 Effect source entry、subtree pin 和 source boundary。 | 通用 Partita pin 设计和 Prelude target maintain 逻辑。 |
| `harness/effect-routes.md` | 给 agent 提供读取 `repos/effect/` 的路线表。 | 目标项目 runtime assets 和 provider record materialization。 |
| `harness/provider/index.md` | 描述 Prelude 消费 effect-harness provider profile 的方式。 | 本仓 source route 的完整内容和通用 pin workflow。 |

## Harness

这一层回答“`effect-harness` 本仓自己怎么运转”。

| 意图 | 先读 | 真源 | 验证 |
| --- | --- | --- | --- |
| 理解官方三阶段路线 | `harness/offcial-guide.md` | Effect 官方 Introduction / Coding with LLMs | 不适用 |
| 理解第一阶段 source access 实现 | `harness/offcial-migrate.md` | `repos/effect.subtree.json`、`harness/source.md`、`harness/effect-routes.md`、provider profile | `pnpm effect:verify`、`pnpm verify` |
| 理解第三阶段 LSP/tsgo 实现 | `harness/offcial-migrate.md` | `tsconfig.json`、provider profile、`@effect/tsgo` npm latest | `pnpm effect:verify`、`pnpm verify` |
| 查看 Effect 源入口契约 | `harness/source.md` | `repos/effect.subtree.json`、`repos/effect/LLMS.md` | `pnpm source:verify`、`pnpm effect:verify` |
| 按 agent 意图读取 Effect 源码 | `harness/effect-routes.md` | `repos/effect/LLMS.md`、`repos/effect/packages/**`、`repos/effect/ai-docs/src/**` | `pnpm effect:verify` |
| 更新 Effect 源入口 | `harness/source.md` | Partita GitHub subtree contract、上游 Effect repo | `pnpm source:update`、`pnpm verify`、subtree trailers |
| 验证本仓边界 | `HARNESS.md` | `src/harness/**`、provider profile、source contract | `pnpm effect:verify`、`pnpm verify` |

## Provider

这一层回答“Prelude 集成 effect-harness 时应该消费什么”。本仓只声明 provider profile；
实际生成、drift 和维护由 Prelude 执行。

| Prelude 消费内容 | 来源 | 由谁维护 | 目标项目是否接收源码 |
| --- | --- | --- | --- |
| provider profile | `harness/provider/index.md`、`harness/provider/effect-harness.provider.json` | effect-harness | 否 |
| provider record 与 source identity | `harness/provider/effect-harness.provider.json` | Prelude | 否 |
| Effect package 基线 | provider profile | Prelude | 否 |
| `tsgo --noEmit` 诊断路径 | provider profile | Prelude | 否 |
| `@effect/language-service` 与 `floatingEffect: error` | provider profile | Prelude | 否 |
| 源码阅读路线 | `harness/effect-routes.md` | effect-harness | 仅 provider 仓内部使用 |

## 边界

- Partita 负责 GitHub subtree pin 流程；effect-harness 不自建第二套 pin CLI。
- effect-harness 负责 Effect 源入口实例、路线、基线、provider profile 和本仓验证。
- Prelude 负责消费 provider profile，并在目标项目中维护 provider record、落地生成、drift、verify
  和 maintain。
- 业务代码和测试代码禁止从 `repos/effect` import。
- 本仓不再分发 Codex skills 或目标 runtime 资产。
- `.effect-harness.json`、effect-harness `.codex` 资产、反馈入口、effect-harness
  `AGENTS.md` 管理块不属于当前 target surfaces。
