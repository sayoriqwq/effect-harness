---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 组织 effect-harness harness 层文档入口，并路由到根级 provider contract。
status: active
sources: []
updated: 2026-07-02
---

# Harness Index

本仓文档按根级 `harness/` 和 `provider/` 拆分。`harness/` 维护本仓内部 source、route、
policy 和 verifier；`provider/` 维护 target 接入时消费的 contract、docs bundle 和 snippets。

本仓当前证明方式是 self-conformance。`pnpm verify` 验证 `effect-harness` 符合自己的
provider contract，但本仓不 self-materialize `.prelude/**` 或 Prelude target lifecycle surface。

## Documents

| 文档 | 职责 | 不承载 |
| --- | --- | --- |
| `harness/offcial-guide.md` | 维护 Effect 官方 `Coding with LLMs` 小节的当前源口径、官方链接和官方段落。 | 本仓实践、迁移顺序、本机集成、provider profile、verifier 和 Prelude target surfaces。 |
| `harness/offcial-migrate.md` | 描述官方三阶段建议在本仓的迁移状态、实现取舍、harness 与 provider 分层和集成判断。 | 官方原文镜像、通用 GitHub pin 流程和目标项目生命周期实现。 |
| `harness/feedback-loop.md` | 投影第二阶段 Codex feedback loop、code-defined verify stages、stage route 和完成条件。 | Provider target materialization、repo skill/hook/rules 建设和通用 Partita pin 流程。 |
| `harness/diagnostic-layers.md` | 定义 `tsgo-diagnostics`、`lint` 和 harness guardrails 的分层职责。 | strict tsgo rule map 本体、ESLint 规则实现和 package surface 维护。 |
| `harness/code.md` | 说明本仓 TypeScript code surface 的职责和非职责。 | target runtime、业务 Effect application 和 Prelude lifecycle 实现。 |
| `harness/source.md` | 描述本仓 provider-internal source entries、subtree pin 和 source boundary。 | 通用 Partita pin 设计和 Prelude target maintain 逻辑。 |
| `harness/effect-routes.md` | 给 agent 提供读取 `repos/effect/` 的路线表。 | 目标项目 runtime assets 和 provider record materialization。 |
| `harness/tsgo.md` | 记录 strict tsgo ADR、policy、rule map、exception 边界和 upgrade loop。 | Effect API 使用路线、通用 pin workflow 和 Prelude target lifecycle。 |
| `harness/tsgo-routes.md` | 给 agent 提供读取 `repos/tsgo/` 的路线表。 | strict policy 决策和 provider target projection。 |
| `provider/index.md` | 描述 target 消费 effect-harness provider profile、docs bundle 和 snippets 的方式。 | 本仓 source route 的完整内容和通用 pin workflow。 |

## Harness

这一层回答“`effect-harness` 本仓自己怎么运转”。

| 意图 | 先读 | 真源 | 验证 |
| --- | --- | --- | --- |
| 理解官方三阶段路线 | `harness/offcial-guide.md` | Effect 官方 Introduction / Coding with LLMs | 不适用 |
| 执行第二阶段 feedback loop | `harness/feedback-loop.md` | `src/harness/verify/VerifyStage.ts`、`src/harness/verify/Pipeline.ts`、`harness/effect-routes.md`、`harness/tsgo-routes.md` | `pnpm verify` |
| 理解第一阶段 source access 实现 | `harness/offcial-migrate.md` | `repos/effect.subtree.json`、`harness/source.md`、`harness/effect-routes.md`、provider profile | `pnpm verify` |
| 理解第三阶段 LSP/tsgo 实现 | `harness/offcial-migrate.md`、`harness/tsgo.md` | `repos/tsgo.subtree.json`、`repos/tsgo/_packages/tsgo/src/metadata.json`、`tsconfig.json`、provider profile | `pnpm verify` |
| 理解 diagnostics/lint 分层 | `harness/diagnostic-layers.md` | `src/harness/verify/Pipeline.ts`、`src/harness/verify/VerifyStage.ts`、`eslint.config.mjs`、`src/harness/verify/TsgoPolicy.ts` | `pnpm verify` |
| 理解仓内 TypeScript 代码用途 | `harness/code.md` | `bin/effect-harness.ts`、`src/harness/**`、`tests/*.test.ts` | `pnpm verify` |
| 查看 source entry 契约 | `harness/source.md` | `repos/effect.subtree.json`、`repos/tsgo.subtree.json` | `pnpm verify` |
| 按 agent 意图读取 Effect 源码 | `harness/effect-routes.md` | `repos/effect/LLMS.md`、`repos/effect/packages/**`、`repos/effect/ai-docs/src/**` | `pnpm verify` |
| 按 agent 意图读取 tsgo 源码 | `harness/tsgo-routes.md` | `repos/tsgo/README.md`、`repos/tsgo/_packages/tsgo/src/**`、`repos/tsgo/internal/**`、`repos/tsgo/etscore/**` | `pnpm verify` |
| 更新 source entries | `harness/source.md` | Partita GitHub subtree contracts、上游 Effect/tsgo repos | `pnpm source:update`、`pnpm verify`、subtree trailers |
| 验证本仓边界 | `HARNESS.md` | `src/harness/**`、provider profile、source contract | `pnpm verify` |

## Provider

这一层回答“target 接入 effect-harness 时应该消费什么”。本仓声明 provider profile 和受管模板；
实际生成、drift 和维护由 Prelude 执行。Prelude 本仓也可以作为 target 接入同一份 provider
contract。

| Prelude 消费内容 | 来源 | 由谁维护 | 目标项目是否接收源码 |
| --- | --- | --- | --- |
| provider profile、delivery modes 与 self-conformance contract | `provider/index.md`、`provider/effect-harness.provider.json` | effect-harness | 否 |
| provider record 与 source identities | `provider/effect-harness.provider.json` | Prelude | 否 |
| Effect package 基线 | provider profile | Prelude | 否 |
| `tsgo --noEmit` 诊断路径 | provider profile、`harness/tsgo.md` | Prelude | 否 |
| strict `@effect/language-service` policy | provider profile、`harness/tsgo.md` | Prelude | 否 |
| target docs bundle | `provider/docs/index.md`、provider profile | Prelude | 否 |
| target snippets | `provider/snippets/agents.md`、provider profile | Prelude | 否 |
| 源码阅读路线 | `harness/effect-routes.md` | effect-harness | 仅 provider 仓内部使用 |
| tsgo 源码阅读路线 | `harness/tsgo-routes.md` | effect-harness | 仅 provider 仓内部使用 |

## 边界

- Partita 负责 GitHub subtree pin 流程；effect-harness 不自建第二套 pin CLI。
- effect-harness 负责 Effect/tsgo 源入口实例、路线、基线、provider profile、docs bundle、
  snippets 和本仓验证。
- effect-harness 使用 self-conformance 验证 exported harness contract，不生成 target provider
  namespace。
- Prelude 负责消费 provider profile，并在目标项目中维护 provider record、落地生成、drift、verify
  和 maintain。
- 业务代码和测试代码禁止从 `repos/effect` 或 `repos/tsgo` import。
- 本仓不再分发 Codex skills 或目标 runtime 资产。
- `.effect-harness.json`、effect-harness `.codex` 资产、反馈入口、effect-harness
  `AGENTS.md` 管理块不属于当前 target surfaces。
