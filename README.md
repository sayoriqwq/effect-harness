# Effect Harness

`effect-harness` 是 Effect v4 beta 的 provider profile、源入口路线包与 target-facing 模板包。

当前设计分成两层：

1. Harness 层：描述 `effect-harness` 本仓自己怎么运转。
2. Provider 层：描述任意 target 接入 effect-harness 时应该接收的受管能力。

本仓是自身 provider contract 的第一个 conforming repository。`pnpm verify` 证明
self-conformance，但本仓不会 self-materialize Prelude target surface。

通用外部仓库 pin 流程由 Partita 负责；本仓只承载 Effect/tsgo 源入口实例、Effect 基线、
strict tsgo policy、读取路线、provider profile、docs bundle 和 snippets。

## Harness 层

这一层只服务 `effect-harness` 自身的维护：

- `harness/offcial-guide.md`：仓内 guide 唯一真源。
- `harness/offcial-migrate.md`：官方 source access 与 LSP/tsgo 阶段的本仓实现说明。
- `harness/feedback-loop.md`：第二阶段 Codex feedback loop 和统一 verify pipeline。
- `harness/diagnostic-layers.md`：tsgo diagnostics、ESLint 和 harness guardrails 的分层职责。
- `repos/effect/`：已 pin 的官方 Effect 源码，只供 agent 读取参考。
- `repos/effect.subtree.json`：Partita 管理的 GitHub subtree pin 契约，是 Effect 源入口唯一真源。
- `harness/effect-routes.md`：agent 读取 `repos/effect/` 的路线表。
- `repos/tsgo/`：已 pin 的 `Effect-TS/tsgo` 源码，只供 agent 读取参考。
- `repos/tsgo.subtree.json`：Partita 管理的 GitHub subtree pin 契约，是 tsgo 源入口真源。
- `harness/tsgo.md`：strict tsgo ADR、policy、rule map 和 upgrade loop。
- `harness/tsgo-routes.md`：agent 读取 `repos/tsgo/` 的路线表。
- `src/`：本仓最小验证器，只验证 provider 仓自身边界。

## Provider 层

这一层不是本仓直接散落脚本来维护目标项目，而是提供结构化 provider profile 和 target-facing
模板：

- delivery modes：区分 internal harness、provider artifact reference 和 exported harness。
- self-conformance：声明本仓只验证自己符合 exported harness，不生成 `.prelude/**`。
- provider contract：`provider/effect-harness.provider.json` 声明 package/config contributions、
  docs bundle、snippets、source identity 和 self-conformance。
- provider profile：声明 target 应该接收的 managed surfaces。
- provider record：记录接入的 `effect-harness` profile、artifact 与 source identity。
- provider discovery：通过 `effect-harness provider-discover` 输出 machine-readable provider envelope。
- package 基线：维护 `effect`、`@effect/platform-node`、`@effect/tsgo`、
  `@effect/language-service` 等版本约束。
- `tsconfig.json` 指针：维护 strict `@effect/language-service` 插件。
- 诊断路径：目标项目以 `tsgo --noEmit` 作为主要 Effect 诊断路径，warning 和 suggestion 也参与
  hard gate。
- docs bundle：维护 target 可读的 Effect 编码、诊断和 source identity 文档。
- snippets：维护 target 可引用的 agent instruction snippet。

目标项目不接收 `repos/effect/`、`repos/tsgo/`、subtree contracts、`.codex/skills`、目标 runtime
模板、反馈入口、`.effect-harness.json` 或 effect-harness 管理的 `AGENTS.md` 管理块。

`effect-harness` 本仓也不接收 `.prelude/**`。这些路径只属于 Prelude 在真实 target 中的
materialization 和 maintain lifecycle。

## 职责边界

- Partita：通用外部源入口 pin/status/update/verify。
- effect-harness：Effect/tsgo 源入口实例、路线表、baseline、provider profile、受管模板、本仓验证。
- Prelude：消费 provider profile，并维护 target lifecycle、provider record、目标项目落地生成、
  drift/verify/maintain。

## 验证命令

```bash
pnpm install
pnpm verify
```

完成态只认 `pnpm verify`。该命令由 Effect pipeline 组织，按 `source-pins`、
`harness-contract`、`tsgo-diagnostics`、`tests`、`lint`、`knip` 顺序 fail-fast 执行。

写 Effect 程序逻辑，或修改 source route、tsgo policy、provider profile、verify pipeline、
harness 边界或 provider 边界前，先读
[harness/feedback-loop.md](./harness/feedback-loop.md)。更新 source entries 前先读
[harness/source.md](./harness/source.md)。agent 需要读取 pinned Effect 源码时先读
[harness/effect-routes.md](./harness/effect-routes.md)。agent 需要调整 strict tsgo policy 或读取
tsgo source 时，先读 [harness/tsgo.md](./harness/tsgo.md) 和
[harness/tsgo-routes.md](./harness/tsgo-routes.md)。修改 provider contribution、docs bundle 或
snippets 前先读 [provider/index.md](./provider/index.md)。
