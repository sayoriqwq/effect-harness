# Effect 源码读取路线

本文件是 agent 读取 `repos/effect/` 的路线表。它不是通用 pin contract；通用外部真源接入由
Partita 负责。本仓只维护已经 pin 进来的 Effect 源入口实例，并把它整理成可读取、可核对、
可验证的参考入口。

## 读取边界

- `repos/effect/` 是 provider 仓内部只读参考源，目标仓库不接收这棵目录。
- 业务代码和测试代码只能从已安装 package import，禁止从 `repos/effect` import。
- `repos/effect/LLMS.md` 是上游 LLM guide，总是优先于零散猜测和 `node_modules`。
- 通用 source-entry status/update/verify 借用 Partita CLI：`pnpm source:status`、
  `pnpm source:update`、`pnpm source:verify`。

## 路线表

| Agent 意图 | 先读 | 深入核对 | 适用输出 | 注意 |
| --- | --- | --- | --- | --- |
| 判断当前源入口 pin 和 package 基线 | `.partita/source-entries.json`、`repos/effect.subtree.json` | `harness/provider/effect-harness.provider.json`、`pnpm-workspace.yaml` | 基线审计、provider drift 判断 | 本文档不声明最新状态；需要更新时走 Partita source 流程 |
| 理解本仓如何接入 Effect source | `harness/source.md` | `harness/provider/index.md`、`harness/offcial-guide.md` | source-entry 维护、更新计划 | 这里是 Effect 实例，不是 Partita 通用 pin |
| 开始写非平凡 Effect 代码 | `repos/effect/LLMS.md` | `repos/effect/ai-docs/src/index.md`、`repos/effect/.patterns/effect.md` | 代码方案、重构方案 | 先按上游 guide 建模，再查具体 API |
| 查公开 API surface | `repos/effect/packages/effect/package.json` | `repos/effect/packages/effect/src/index.ts`、对应 `src/<Module>.ts` | import 建议、API 使用 | 不要建议 import `internal/*` 或 `*/index` 禁止项 |
| 查核心 Effect 写法 | `repos/effect/ai-docs/src/01_effect/01_basics/` | `repos/effect/packages/effect/src/Effect.ts`、`repos/effect/packages/effect/test/Effect.test.ts` | `Effect.gen`、`Effect.fn` 代码 | 失败/中断的 terminal effect 使用 `return yield*` |
| 设计服务和 Layer | `repos/effect/ai-docs/src/01_effect/02_services/` | `repos/effect/packages/effect/src/Context.ts`、`Layer.ts`、`LayerMap.ts` | service contract、Layer 组合 | 当前 baseline 使用 `Context.Service`，不要新增 `Context.Tag` 服务定义 |
| 处理错误 | `repos/effect/ai-docs/src/01_effect/03_errors/` | `repos/effect/packages/effect/src/Schema.ts`、`Cause.ts`、`Effect.ts` | typed error、recovery 逻辑 | 优先 `Schema.TaggedErrorClass` 和 `Effect.catch*` |
| 管理资源和 Scope | `repos/effect/ai-docs/src/01_effect/04_resources/` | `repos/effect/packages/effect/src/Scope.ts`、`Resource.ts`、`Layer.ts` | acquire/release、background layer | 不要用 ad hoc try/finally 代替 Effect resource model |
| 写 Node 入口 | `repos/effect/ai-docs/src/01_effect/05_running/10_run-main.ts` | `repos/effect/packages/platform-node/src/NodeRuntime.ts`、`NodeServices.ts` | CLI/server entrypoint | Node 目标项目使用 `NodeRuntime.runMain` |
| 写 CLI | `repos/effect/ai-docs/src/70_cli/10_basics.ts` | `repos/effect/packages/effect/src/unstable/cli/Command.ts`、`Flag.ts`、`Argument.ts`、`Param.ts` | command/flag/argument 设计 | 使用 `effect/unstable/cli`，不要依赖 `@effect/cli` |
| 写 Effect 测试 | `repos/effect/ai-docs/src/09_testing/` | `repos/effect/packages/vitest/src/`、`repos/effect/.patterns/testing.md`、相关 `packages/*/test/` | `@effect/vitest` 测试 | 用 `it.effect` 和 `assert`，不要用 `Effect.runSync` 测 Effect 程序 |
| 查模块行为细节 | 对应 `repos/effect/packages/effect/test/<Module>.test.ts` | `repos/effect/packages/effect/typetest/` | 行为断言、类型边界 | 测试是行为参考，不是目标代码的 import 来源 |
| 写 Stream / Sink / Channel | `repos/effect/ai-docs/src/02_stream/` | `repos/effect/packages/effect/src/Stream.ts`、`Sink.ts`、`Channel.ts` 及测试 | stream pipeline | 先看 ai-docs，再按源码核对 operator 类型 |
| 写 Schedule / DateTime / 时间逻辑 | `repos/effect/ai-docs/src/06_schedule/`、`07_datetime/` | `Schedule.ts`、`Cron.ts`、`DateTime.ts`、对应测试 | retry/repeat、时间处理 | 时间相关测试使用 TestClock |
| 写 Schema / JSON / encoding | `repos/effect/packages/effect/src/Schema.ts` | `SchemaParser.ts`、`JsonSchema.ts`、`unstable/encoding/`、schema tests | schema、codec、JSON schema | 复杂 schema 先查测试和 representation 目录 |
| 写 HTTP client/server | `repos/effect/ai-docs/src/50_http-client/`、`51_http-server/` | `repos/effect/packages/effect/src/unstable/http/`、`unstable/httpapi/`、`repos/effect/packages/platform-node/test/` | HttpClient、HttpApi、server layer | Node server 结合 `@effect/platform-node` 路由 |
| 写 Node 平台集成 | `repos/effect/packages/platform-node/src/index.ts` | `NodeFileSystem.ts`、`NodeHttpClient.ts`、`NodeHttpServer.ts`、`NodeStream.ts`、对应 tests | filesystem/http/stream/socket 集成 | import 来自 `@effect/platform-node` package，不来自 pinned source |
| 写 observability | `repos/effect/ai-docs/src/08_observability/` | `repos/effect/packages/effect/src/unstable/observability/`、`repos/effect/packages/opentelemetry/` | logging、metrics、tracing | 新项目优先看 Otlp 示例；已有 OTel 集成再看 opentelemetry package |
| 写 child process | `repos/effect/ai-docs/src/60_child-process/` | `repos/effect/packages/effect/src/unstable/process/`、`repos/effect/packages/platform-node/src/NodeChildProcessSpawner.ts` | 子进程、pipeline | 需要 Node implementation 时提供 `NodeServices.layer` |
| 写 AI 功能 | `repos/effect/ai-docs/src/71_ai/` | `repos/effect/packages/effect/src/unstable/ai/`、`repos/effect/packages/ai/*/src/` | LanguageModel、Tool、Chat | 区分 core unstable AI API 和 provider package |
| 写 Cluster / RPC / Workflow | `repos/effect/ai-docs/src/80_cluster/` | `unstable/cluster/`、`unstable/rpc/`、`unstable/workflow/`、相关 tests | entity、RPC、workflow 设计 | 高级模块先按上游测试核对生命周期和 storage 需求 |
| 写 SQL / persistence | `repos/effect/packages/effect/src/unstable/sql/`、`unstable/persistence/` | `repos/effect/packages/sql/*/README.md`、`package.json`、tests | SQL client、migrator、persistence | 需要具体 driver 时读对应 `@effect/sql-*` package |
| 参考上游仓开发约束 | `repos/effect/AGENTS.md` | `repos/effect/.patterns/`、`repos/effect/ai-docs/README.md` | 修改 pinned upstream 或评审上游风格 | 这些约束服务上游 repo 语境；不能覆盖本仓 provider 边界 |

## 目标项目接收边界

接入 effect-harness 的目标项目应得到 Effect v4 beta 基线、`tsgo --noEmit` 诊断路径、
`@effect/language-service` floatingEffect 约束、以及 provider record 中的 source identity。目标项目
不应该得到 `repos/effect/` 本体、仓内 Codex skills、runtime 模板、反馈入口、`.effect-harness.json`
或 effect-harness 管理的 `AGENTS.md` 管理块。
