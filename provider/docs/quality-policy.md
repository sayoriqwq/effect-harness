---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 target 接入 effect-harness 后 lint、test 与 verify policy 的受管口径。
status: active
sources:
  - provider/effect-harness.provider.json
  - harness/diagnostic-layers.md
  - harness/feedback-loop.md
  - harness/effect-routes.md
updated: 2026-07-02
---

# Quality Policy

## Lint

lint policy 负责 repository boundary 和 syntax-level guardrails。

target 的 lint entry 由 provider package contribution 暴露为 `pnpm lint`，底层脚本是 `eslint`。
需要 hard gate 时，verification policy 使用 `pnpm lint --max-warnings 0`。

lint policy SHOULD block provider-internal source imports、`@effect/cli` imports、普通 `vitest` imports、
`node:test` imports、`Context.Tag` service definitions、指定 Effect member，以及关闭 Schema validation
的写法。

lint policy MUST NOT 替代 tsgo diagnostics。Effect semantic diagnostics、type requirement diagnostics 和
strict rule severity map 由 tsgo policy 负责。

## Tests

test policy 使用 `@effect/vitest`。

target 的 test entry 由 provider package contribution 暴露为 `pnpm test`，底层脚本是
`vitest run`。

Effect tests SHOULD 使用 `it.effect`、`it.live` 或 layer 组织。

target SHOULD 保留 provider record 中声明的 test entry pattern，并通过 package script 执行测试。

## Verification

`pnpm verify` 是 completion gate。

verification policy 描述 local diagnostic commands 和 stage semantics，但不实现 Prelude target lifecycle。

Prelude 仍负责 target materialization、provider record maintain、drift handling 和 target-level verify
orchestration。target 的总 `pnpm verify` MAY include build、knip 或 release gates；effect-harness
必须至少把 `pnpm typecheck`、`pnpm test` 和 `pnpm lint --max-warnings 0` 组合进 target verify。

## Stages

source-pins stage 负责 source identity 与 pinned upstream source contract。

harness-contract stage 负责 provider contract 与 self-conformance。

tsgo-diagnostics stage 负责 Effect semantic diagnostics。

tests stage 负责 behavior regression。

lint stage 负责 repository boundary 和 syntax-level guardrails。

knip stage 负责 package surface hygiene。
