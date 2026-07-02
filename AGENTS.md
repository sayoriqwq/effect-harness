# Agent 启动规则

本仓是 Effect v4 beta 的 provider profile、源入口路线包与 target-facing 模板包，并以 CLI
utility package 发布。这里有两层语境：

- Harness 层：维护 `effect-harness` 本仓自己的源入口、路线、基线和验证。
- Provider 层：声明任意 target 接入 effect-harness 时应消费的 provider profile、source identity、
  package 基线、诊断入口、docs bundle 和 snippets。

在本仓写 Effect 程序逻辑，或修改 source route、tsgo policy、provider profile、verify
pipeline、harness 边界前，先读：

- `HARNESS.md`
- `README.md`
- `harness/index.md`
- `harness/feedback-loop.md`
- `harness/code.md`
- `harness/offcial-guide.md`
- `harness/offcial-migrate.md`
- `harness/source.md`
- `harness/effect-routes.md`
- `harness/tsgo.md`
- `harness/tsgo-routes.md`
- `provider/index.md`
- `provider/effect-harness.provider.json`
- `provider/docs/index.md`
- `repos/effect/LLMS.md`
- `repos/effect.subtree.json`
- `repos/tsgo/README.md`
- `repos/tsgo.subtree.json`

基线：

- `effect@4.0.0-beta.92`
- `@effect/platform-node@4.0.0-beta.92`
- `@effect/vitest@4.0.0-beta.92`
- `@effect/tsgo@0.15.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260630.1`

当前 v4 beta 模式：

- CLI 模块：`effect/unstable/cli/Command` 和 `effect/unstable/cli/Flag`
- Node runtime：`@effect/platform-node/NodeRuntime`
- Node services：`@effect/platform-node/NodeServices`
- Service 定义：`Context.Service`
- 入口：`NodeRuntime.runMain`

硬边界：

- 应用代码和测试代码禁止从 `repos/effect` 或 `repos/tsgo` import。
- 不依赖 `@effect/cli`；使用 `effect/unstable/cli`。
- 当前基线不新增 `Context.Tag` service definition。
- 不新增目标项目本地 dispatcher scripts。
- 不恢复仓内 `.codex/skills`、目标 runtime 模板、反馈入口、
  `.effect-harness.json` 或 effect-harness 管理的 `AGENTS.md` blocks。
- Partita 负责通用源入口 pin 流程；本仓只负责 Effect/tsgo 源入口实例、路线、基线、strict
  tsgo policy、provider profile、docs bundle 和 snippets。
- Provider docs bundle 和 snippets 是 contributions，必须受 `provider/effect-harness.provider.json`
  管理。
- 本仓采用 self-conformance，只验证自身符合 provider contract；禁止生成 `.prelude/**` 或
  `.prelude/providers/effect-harness/**` target lifecycle surface。
- Prelude 负责 target lifecycle；本仓不直接实现目标项目 maintain 系统。

验证：

```bash
pnpm verify
```

官方真源优先级：

- 通用源入口 pin 流程走 Partita：`pnpm source:status`、`pnpm source:update`、
  `pnpm source:verify`。
- Effect 诊断主路径是 `tsgo --noEmit`，并由 `effect-tsgo patch` 准备 Effect TypeScript-Go backend。
  当前 hard gate 要求 0 error、0 warning、0 suggestion、0 message。
- 如果本仓 harness 文档与 `harness/offcial-guide.md`、`repos/effect/LLMS.md`、
  `repos/effect/`、`repos/tsgo/` 或 `@effect/tsgo` diagnostics 冲突，服从官方真源并更新最小
  provider route。
