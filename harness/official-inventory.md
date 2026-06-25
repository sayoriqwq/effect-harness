# Effect Official Harness Inventory

这份文档记录 pin 住的 Effect source 中哪些文件可以作为 coding agents 和 LLM-assisted
Effect development 的依据。

Pinned source：

```text
repos/effect @ 3475ee6c2bda6b05c6d7a12ce30c8bb840b5b1a6
```

## Role

pin 住的 Effect repository 是 Effect API、patterns、examples、testing guidance、
migration map 和 diagnostics 的唯一真源。本仓库不重写 Effect 语义；它把真源转成
可投递、可验证、可回流改进的 harness contract。

## Source Classification

harness 在向 target 暴露 upstream material 前，必须先分类：

| Class | Upstream surface | Decision |
| --- | --- | --- |
| Authoritative guide | `repos/effect/LLMS.md` | Effect application coding guidance 的 single source of truth。 |
| Authoritative guide | `repos/effect/ai-docs/src/` | 需要 examples 或 context 时读取。 |
| Authoritative guide | `repos/effect/migration/v3-to-v4.md` | v3-to-v4 import/API migration 的 source of truth。 |
| Reference only | `repos/effect/.patterns/effect.md` | 只在 narrow pitfalls 适用于 downstream app code 时参考。 |
| Reference only | `repos/effect/.patterns/testing.md` | 解决 testing 冲突；target verifier 应体现相关规则。 |
| Reference only | `repos/effect/packages/effect/MCP.md` | 只在维护 Effect worker、MCP route 或 tool server 时使用。 |
| Reference only | `repos/effect/package.json` 和 `tsconfig*.json` | 理解官方 `tsgo` 和 validation setup，不复制 repo-maintenance scripts。 |
| Maintainer-only | `repos/effect/AGENTS.md` | 官方 repo operating policy，不是 downstream coding guide。 |
| Do not promote | `repos/effect/.agents/skills/*` | Effect maintainer skills，不默认安装或暴露给 target projects。 |
| Do not promote | `repos/effect/.specs/*` | Effect maintainer feature specs，不是通用 harness guidance。 |
| Do not promote | package-specific docgen 和 validation configs | 内部 publishing/docs machinery，不是 downstream defaults。 |

不属于 authoritative guide 的文件，不应在没有 promotion decision 时复制、安装或暴露给
target projects。

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

## Promotion Boundary

这份 inventory 只分类 official source surface。是否提升 practice feedback，按
[exposure.md](./exposure.md) 和 [feedback/index.md](./feedback/index.md) 判断。

## Harness Contract

- coding agents 首先读取 `repos/effect/LLMS.md`。
- 用 `repos/effect/ai-docs/src/` 和 `repos/effect/migration/v3-to-v4.md` 做 supporting official source。
- 不默认暴露 `repos/effect/AGENTS.md`、`repos/effect/.agents/skills/`、`repos/effect/.specs/`。
- 本仓库自身和外部 target 都可以产生 reusable practice evidence。
- upstream docs 无法机械保护的 target constraints 进入 verifier 或 guardrail。
- 面向用户的 examples 和业务项目形态不进入本仓库。
- 本仓库只暴露 contracts，不做业务分发实现。
