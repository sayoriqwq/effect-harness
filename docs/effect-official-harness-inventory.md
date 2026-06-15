# Effect Official Harness Inventory

这份文档记录 pin 住的 Effect source 中哪些文件可以作为 coding agents 和 LLM-assisted
Effect development 的依据。

Pinned source：

```text
repos/effect @ 95545bdc334f4cd27a14f3308e68114e5bed92f2
```

## Role

pin 住的 Effect repository 是本仓库的 primary authoring source。Effect API、patterns、
examples、testing guidance 和 migration map 都先从 upstream source 取得；本地 docs 只维护
route、target contract、verifier 和 feedback gate。

本地 harness 负责：

- pinning 和 drift detection
- target verification
- target project guardrails
- AGENTS、skills、runtime 和 CLI exposure route
- 官方 docs 与本地 target constraints 冲突时的处理规则

## Promotion Boundary

harness 在向 downstream 暴露 upstream material 前，必须先分类：

| Class | Upstream surface | Decision |
| --- | --- | --- |
| Authoritative guide | `repos/effect/LLMS.md` | Effect application coding guidance 的 single source of truth。 |
| Authoritative guide | `repos/effect/ai-docs/src/` | 需要 examples 或 context 时读取。 |
| Authoritative guide | `repos/effect/migration/v3-to-v4.md` | v3-to-v4 import/API migration 的 source of truth。 |
| Reference only | `repos/effect/.patterns/effect.md` | 只在 narrow pitfalls 适用于 downstream app code 时参考。 |
| Reference only | `repos/effect/.patterns/testing.md` | 解决 testing 冲突；target verifier 应体现相关规则。 |
| Reference only | `repos/effect/packages/effect/MCP.md` | 只在维护 Effect worker、MCP route 或 tool server 时使用。 |
| Reference only | `repos/effect/package.json` 和 `tsconfig*.json` | 理解官方 `tsgo` 和 validation setup，不复制 repo-maintenance scripts。 |
| Do not promote | `repos/effect/AGENTS.md` | 官方 repo operating policy，不是 downstream coding guide。 |
| Do not promote | `repos/effect/.agents/skills/*` | Effect maintainer skills，不默认安装或暴露给 target projects。 |
| Do not promote | `repos/effect/.specs/*` | Effect maintainer feature specs，不是通用 harness guidance。 |
| Do not promote | package-specific docgen 和 validation configs | 内部 publishing/docs machinery，不是 downstream defaults。 |

不属于 authoritative guide 的文件，不应在没有单独决策时复制、安装或暴露给 target projects。

## Upstream Surfaces

| Surface | Role | Harness implication |
| --- | --- | --- |
| `repos/effect/LLMS.md` | 从 `ai-docs/src` 生成的 LLM coding guide，覆盖 services、errors、resources、runtime、testing、HTTP、CLI、AI、cluster 等。 | 第一 Effect coding reference；本地 docs 只 route，不替代。 |
| `repos/effect/ai-docs/src/` | `LLMS.md` 的 source examples。 | 当 `LLMS.md` 太压缩时读取。 |
| `repos/effect/migration/v3-to-v4.md` | migration-agent import/API rename map。 | 适配 v3 code 时优先使用。 |
| `repos/effect/.patterns/effect.md` | narrow pitfalls：`Effect.gen`、terminal `return yield*`、`Context.Service` 等。 | reference only；只把 target-relevant pitfalls 转为 guardrails。 |
| `repos/effect/.patterns/testing.md` | testing rules：`it.effect`、pure test、禁止 `Effect.runSync`、优先 `assert` from `@effect/vitest`、`TestClock`。 | reference only；verifier 跟随官方。 |
| `repos/effect/packages/effect/MCP.md` | Effect-native MCP server guide。 | 只服务 MCP/worker route 维护。 |
| `repos/effect/package.json` 和 `tsconfig*.json` | 官方 validation scripts 与 `@effect/language-service` / `tsgo` setup。 | 确认 `tsgo` diagnostic path；target 可以更严格。 |

## Coverage

对 application-style Effect code，upstream coverage 包含：

- coding style：`Effect.gen`、`Effect.fn`、terminal `return yield*`、tagged errors
- service style：`Context.Service`、`Layer.effect`、`Layer.unwrap`、`Layer.provideMerge`
- runtime entrypoints：`NodeRuntime.runMain`、`Layer.launch`、`NodeServices.layer`
- testing：`@effect/vitest`、`it.effect`、`TestClock`、shared layers
- integration：`ManagedRuntime`、bridge code、child processes
- operational concerns：schedules、retries、logging、tracing、Otlp modules
- boundaries：HTTP client/server、CLI、streams、AI modules、cluster entities
- migration：v3-to-v4 import 和 symbol maps

修改 Effect repo 自身的 agent workflow 不属于默认 downstream harness surface：

- `AGENTS.md` 里的 local workflow 和 validation matrix
- package-specific validation commands
- JSDoc skill 和 custom JSDoc linting
- scratchpad extraction
- `.specs/` 下的 complex feature specs

## Conflict Policy

pin 住的 repo 有一些 context-specific differences，harness 不能压平：

1. `LLMS.md` recommends `Effect.fn("name")` for user-facing Effect functions, while
   `.patterns/effect.md` and `AGENTS.md` prefer `Effect.fnUntraced` for reusable library
   implementations. Local target projects should default to `LLMS.md` application guidance unless
   they are writing hot-path library internals.
2. `packages/vitest/README.md` contains examples with `expect`, but upstream `AGENTS.md`,
   `.patterns/testing.md`, and `ai-docs/src/09_testing/*` prefer `assert` from `@effect/vitest`.
   harness 的 verifier 应跟随后者。
3. The upstream repo config intentionally suppresses some `@effect/language-service` diagnostics
   from failing `tsgo` exits because it is the Effect library repo. Target projects can be stricter;
   the current target runtime contract treats floating Effect diagnostics as errors.
4. Upstream skills are designed for maintaining Effect itself. They should be referenced or adapted
   deliberately, not copied into downstream projects as if they were universal.

## Local Harness Contract

- coding agents 首先读取 `repos/effect/LLMS.md`
- 用 `repos/effect/ai-docs/src/` 和 `repos/effect/migration/v3-to-v4.md` 做 supporting official source
- 不默认暴露 `repos/effect/AGENTS.md`、`repos/effect/.agents/skills/`、`repos/effect/.specs/`
- local docs 保持短、明确，聚焦 target-project contracts
- upstream docs 无法 enforce 的本地 target constraints 进入 verifier
- 面向用户的 examples 和业务项目形态不进入本仓库
- 本仓库只暴露 contracts，不做业务分发实现
