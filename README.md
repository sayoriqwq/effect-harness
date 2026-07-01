# Effect Harness

`effect-harness` 是 Effect v4 beta 的 provider profile（提供者档案）与源入口路线包。

当前设计分成两层：

1. Harness 层：描述 `effect-harness` 本仓自己怎么运转。
2. Provider 层：描述下一阶段交给 Prelude 消费的 effect-harness provider contract。

通用外部仓库 pin 流程由 Partita 负责；本仓只承载 Effect/tsgo 源入口实例、Effect 基线、
strict tsgo policy、读取路线和 provider profile。

当前阶段不接入 Prelude target materialization。先维护本仓与 `fixture/`：`fixture/` 是 gitignored
的本地标准输出项目，必须能独立安装、运行和验证，用来检验从空项目展开后的工程层级。

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
- `fixture/`：当前阶段的本地 fixture 展开，复制本仓后按 target 输出预期修剪；不纳入 git。

## Provider 层

这一层不是本仓直接散落脚本来维护目标项目，而是给下一阶段 Prelude 集成提供结构化
provider profile：

- provider profile：声明下一阶段 Prelude 应该消费的 target surfaces。
- provider record：记录接入的 `effect-harness` profile、artifact 与 source identity。
- package 基线：维护 `effect`、`@effect/platform-node`、`@effect/tsgo`、
  `@effect/language-service` 等版本约束。
- `tsconfig.json` 指针：维护 strict `@effect/language-service` 插件。
- docs bundle：维护目标项目可随 provider record 一起接收的 harness 文档上下文。
- 诊断路径：目标项目以 `tsgo --noEmit` 作为主要 Effect 诊断路径，warning 和 suggestion 也参与
  hard gate。

目标项目不接收 `repos/effect/`、`repos/tsgo/`、subtree contracts、`.codex/skills`、目标 runtime
模板、反馈入口、`.effect-harness.json` 或 effect-harness 管理的 `AGENTS.md` 管理块。

## 职责边界

- Partita：通用外部源入口 pin/status/update/verify。
- effect-harness：Effect/tsgo 源入口实例、路线表、baseline、provider profile、本仓验证。
- fixture：当前阶段先维护本地独立运行的标准输出项目。
- Prelude：下一阶段消费 provider profile，并维护目标项目生命周期、provider record、目标项目落地
  生成、drift/verify/maintain。

## 验证命令

```bash
pnpm install
pnpm verify
```

完成态只认 `pnpm verify`。该命令由 Effect pipeline 组织，按 `source-pins`、
`harness-contract`、`tsgo-diagnostics`、`tests`、`lint`、`knip` 顺序 fail-fast 执行。

写 Effect 程序逻辑，或修改 source route、tsgo policy、provider profile、verify pipeline、
harness 边界前，先读
[harness/feedback-loop.md](./harness/feedback-loop.md)。更新 source entries 前先读
[harness/source.md](./harness/source.md)。agent 需要读取 pinned Effect 源码时先读
[harness/effect-routes.md](./harness/effect-routes.md)。agent 需要调整 strict tsgo policy 或读取
tsgo source 时，先读 [harness/tsgo.md](./harness/tsgo.md) 和
[harness/tsgo-routes.md](./harness/tsgo-routes.md)。
