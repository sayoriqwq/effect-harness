# Effect Harness

`effect-harness` 是 Effect v4 beta 的 Prelude provider profile（提供者档案）与源入口路线包。

当前设计分成两层：

1. Harness 层：描述 `effect-harness` 本仓自己怎么运转。
2. Provider 层：描述本仓交给 Prelude 集成 effect-harness 的内容。

通用外部仓库 pin 流程由 Partita 负责；本仓只承载 Effect 这一份源入口实例、Effect 基线、
读取路线和 Prelude provider profile。

## Harness 层

这一层只服务 `effect-harness` 自身的维护：

- `harness/offcial-guide.md`：仓内 guide 唯一真源。
- `harness/offcial-migrate.md`：官方第一阶段 source access 的本仓实现说明。
- `repos/effect/`：已 pin 的官方 Effect 源码，只供 agent 读取参考。
- `repos/effect.subtree.json`：Partita 管理的 GitHub subtree pin 契约，是 Effect 源入口唯一真源。
- `harness/effect-routes.md`：agent 读取 `repos/effect/` 的路线表。
- `src/`：本仓最小验证器，只验证 provider 仓自身边界。

## Provider 层

这一层不是本仓直接散落脚本来维护目标项目，而是给 Prelude 提供结构化 provider profile：

- provider profile：声明 Prelude 应该消费的 target surfaces。
- provider record：记录接入的 `effect-harness` profile、artifact 与 source identity。
- package 基线：维护 `effect`、`@effect/platform-node`、`@effect/tsgo`、
  `@effect/language-service` 等版本约束。
- `tsconfig.json` 指针：维护 `@effect/language-service` 插件和 `floatingEffect: error`。
- 诊断路径：目标项目以 `tsgo --noEmit` 作为主要 Effect 诊断路径。

目标项目不接收 `repos/effect/`、`repos/effect.subtree.json`、旧 `.codex/skills`、目标 runtime
模板、反馈入口、`.effect-harness.json` 或 effect-harness 管理的 `AGENTS.md` 管理块。

## 职责边界

- Partita：通用外部源入口 pin/status/update/verify。
- effect-harness：Effect 源入口实例、路线表、baseline、provider profile、本仓验证。
- Prelude：消费 provider profile，并维护目标项目生命周期、provider record、目标项目落地生成、
  drift/verify/maintain。

## 验证命令

```bash
pnpm install
pnpm effect:verify
pnpm verify
```

`pnpm effect:verify` 只验证本 provider 仓自身：源入口 pin、Partita GitHub subtree 契约、
provider profile 和 import 边界。

更新 Effect 源入口前先读 [harness/source.md](./harness/source.md)。agent 需要读取 pinned
Effect 源码时先读 [harness/effect-routes.md](./harness/effect-routes.md)。
