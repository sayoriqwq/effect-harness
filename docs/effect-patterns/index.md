# Effect Harness Routes

这是 effect-harness 的本地 route table，不是 Effect 教程。

本仓库维护三类稳定合约：

1. **Official Pin Routes**：把 agent 路由到 pin 住的官方 Effect guide、source 和 diagnostics。
2. **Target Contract**：用 `effect-harness init`、target runtime、guardrails 和 verifier 固化目标仓库接入面。
3. **Harness Feedback**：只接收官方 guide 没覆盖、且能沉淀为通用 harness contract 的项目实践反馈。

人工判断写在 route table；确定性约束放进 TS CLI、guardrails 或 verifier。目标仓库不需要本地
dispatcher。

## Current Pin

上游 Effect v4 beta source 以 managed copy 保存在 `repos/effect/`：

```text
95545bdc334f4cd27a14f3308e68114e5bed92f2
```

Baseline：

- `effect@4.0.0-beta.83`
- `@effect/platform-node@4.0.0-beta.83`
- `@effect/vitest@4.0.0-beta.83`
- `@effect/tsgo@0.14.4`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260615.1`

命令：

```bash
pnpm effect:status
pnpm effect:verify
```

## Official Pin Routes

| Need | Authoritative source | Local action |
| --- | --- | --- |
| 一般 Effect application code | `repos/effect/LLMS.md` | 路由到官方 guide。 |
| guide 背后的 examples | `repos/effect/ai-docs/src/` | 需要上下文时读取 source examples。 |
| services、layers、errors、resources、schedules、fibers、state、streams、runtime entrypoints | `repos/effect/LLMS.md`、`repos/effect/ai-docs/src/` | 使用官方教学；本地只维护 route、runtime 和 verifier contract。 |
| HTTP、CLI、child processes、Node runtime、AI modules、cluster | `repos/effect/LLMS.md`、`repos/effect/ai-docs/src/` | 路由到官方 docs；target examples 由目标仓库负责。 |
| v3-to-v4 migration | `repos/effect/migration/v3-to-v4.md` | 改 import 或 API 前使用官方 migration map。 |
| API definition lookup | `repos/effect/packages/effect/src/`、`repos/effect/packages/` | source 只读参考；application code 只 import installed packages。 |
| Testing | `repos/effect/LLMS.md`、`repos/effect/ai-docs/src/09_testing/`、reference-only `repos/effect/.patterns/testing.md` | 测试文件从 `@effect/vitest` import；Effect-native tests 使用 `it.effect`、`it.live` 或 `layer(...)`。 |
| `@effect/tsgo` setup 和 diagnostics | official `@effect/tsgo`、patched `tsgo --noEmit`、target `tsconfig.json` | 保留直接 setup/patch/typecheck 路径；suggestion cleanup 用类型边界表达，guardrails 拒绝 assertion 消音。 |
| Source pin 和 drift | `repos/effect.subtree.json`、`pnpm effect:status`、`pnpm effect:verify` | 本地 harness contract；更新 pin 必须显式验证。 |
| Harness exposure | `docs/harness-exposure.md` | 只暴露 docs、skills、runtime、verifier contracts。 |
| 项目实践反馈 | `docs/harness-feedback/index.md`、target `.codex/skills/effect-feedback/` | 先做官方覆盖检查，再决定是否写入 feedback。 |

## Harness Feedback Gate

只有同时满足这些条件才添加 feedback：

1. target project 有具体 Effect practice failure。
2. `repos/effect/LLMS.md`、`repos/effect/ai-docs/src/`、migration docs、source 和
   `@effect/tsgo` diagnostics 都没有覆盖这个 failure。
3. 问题是 business-neutral，并且能跨 Effect targets 复用。
4. landing 可以写成 docs route、target runtime contract、guardrail、verifier 或 skill update。

不要把 project-specific commands、product examples、project shape、release ritual 或 upstream
Effect maintainer workflow 放进 feedback layer。

## Local Scope

本地 docs 只维护 harness contract。Effect concept、API usage 和 tutorial material 由 pinned
official source 承担；本地 note 如果只是复述官方概念，直接路由到 official pin source。

## Do Not Promote

这些 upstream 文件可用于研究，但不是默认 downstream guidance：

- `repos/effect/AGENTS.md`
- `repos/effect/.agents/skills/*`
- `repos/effect/.specs/*`
- package-specific docgen, release, and validation machinery

它们服务 Effect repo 自身。只有单独证明它们能成为 target-project harness contract 时，才允许提升。

## Import Boundary

application 和 test code 只从 installed dependencies import：

```ts
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
```

禁止从 `repos/effect/` import。subtree 是只读 source material，不是 application dependency。
