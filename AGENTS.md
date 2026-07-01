# Agent 启动规则

本仓是 Effect v4 beta 的 Prelude provider profile 与源入口路线包，并以 CLI utility package
发布。这里有两层语境：

- 本仓建设层：维护 `effect-harness` 自身的源入口、路线、基线和 provider profile。
- 目标 harness 层：由 Prelude 在接入项目中生成和维护，持续约束目标项目。

在本仓或目标项目写非平凡 Effect 代码前，先读：

- `HARNESS.md`
- `README.md`
- `harness/index.md`
- `harness/offcial-guide.md`
- `harness/source.md`
- `harness/effect-routes.md`
- `repos/effect/LLMS.md`
- `repos/effect.subtree.json`

基线：

- `effect@4.0.0-beta.90`
- `@effect/platform-node@4.0.0-beta.90`
- `@effect/vitest@4.0.0-beta.90`
- `@effect/tsgo@0.14.6`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260624.1`

当前 v4 beta 模式：

- CLI 模块：`effect/unstable/cli/Command` 和 `effect/unstable/cli/Flag`
- Node runtime：`@effect/platform-node/NodeRuntime`
- Node services：`@effect/platform-node/NodeServices`
- Service 定义：`Context.Service`
- 入口：`NodeRuntime.runMain`

硬边界：

- 应用代码和测试代码禁止从 `repos/effect` import。
- 不依赖 `@effect/cli`；使用 `effect/unstable/cli`。
- 当前基线不新增 `Context.Tag` service definition。
- 不新增目标项目本地 dispatcher scripts。
- 不恢复仓内 `.codex/skills`、目标 runtime 模板、反馈入口、
  `.effect-harness.json` 或 effect-harness 管理的 `AGENTS.md` blocks；这些都是旧表面。
- Partita 负责通用源入口 pin 流程；本仓只负责 Effect 源入口实例、路线、基线和 provider
  profile。
- Prelude 负责目标项目生命周期；本仓不直接实现目标项目 maintain 系统。

验证：

```bash
pnpm effect:verify
pnpm verify
```

官方真源优先级：

- 通用源入口 pin 流程走 Partita：`pnpm source:status`、`pnpm source:update`、
  `pnpm source:verify`。
- Effect 诊断主路径是 patched `tsgo --noEmit`。`effect-tsgo` 是 setup/patch manager，不是
  `--noEmit` typecheck binary。
- 如果本仓 harness 文档与 `harness/offcial-guide.md`、`repos/effect/LLMS.md`、
  `repos/effect/` 或 `@effect/tsgo` diagnostics 冲突，服从官方真源并更新最小 provider route。
