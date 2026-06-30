---
name: effect-code
description: "Use in an Effect target repo when writing, reviewing, or debugging Effect v4 beta code against the linked effect-harness official pin. Covers Effect services, runtime entrypoints, tests, CLI/HTTP/process boundaries, @effect/tsgo diagnostics, and focused Effect subagent delegation. Not for updating effect-harness, changing the source pin, or writing generic TypeScript unrelated to Effect."
---

# Effect Code

Use this skill for target-local Effect code work against the linked `effect-harness`.

## Capability

Drive Effect implementation and review through the pinned official source, target runtime contract, and
patched diagnostics instead of memory, stale examples, or copied harness internals.

Pressure scenario: an agent imports from `repos/effect`, uses old v3 patterns, silences `@effect/tsgo`
with assertions, writes plain Vitest tests, or delegates Effect work without passing the target runtime
agent contract.

## Trigger

Use when the task touches Effect services, layers, runtime entrypoints, tests, CLI/HTTP/process
integration, `@effect/tsgo` diagnostics, or focused Effect review in this target repo.

Do not use for updating `effect-harness`, refreshing `repos/effect`, generic TypeScript cleanup, or target
business decisions that do not require Effect guidance.

## Soft Boundary

- Target repo instructions and current code shape come first.
- Official pinned source beats local memory.
- Delegate focused Effect implementation or review with `.codex/agents/effect-worker.md` when a subagent is useful.
- Keep target business logic in the target repo; only reusable harness gaps go to feedback.

## Hard Boundary

- Do not import from `__EFFECT_HARNESS_ROOT__/repos/effect`.
- Do not copy effect-harness maintainer skills into the target.
- Use installed packages: `effect`, `@effect/platform-node`, `@effect/vitest`.
- Use patched `tsgo --noEmit` as the primary Effect diagnostic loop.
- Use `assert` from `@effect/vitest`; do not use `expect`.

## Workflow

1. Read target instructions and existing code.
2. Read official/harness sources in this order:
   - `__EFFECT_HARNESS_ROOT__/repos/effect/LLMS.md`
   - `__EFFECT_HARNESS_ROOT__/repos/effect/ai-docs/src/`
   - `__EFFECT_HARNESS_ROOT__/repos/effect/migration/v3-to-v4.md`
   - `__EFFECT_HARNESS_ROOT__/harness/index.md`
   - `.prelude/providers/effect-harness/provider.json` for prelude-managed targets
   - `.effect-harness.json` only for standalone CLI compatibility
3. Use `Context.Service` for services on this baseline.
4. Treat `@effect/tsgo` suggestions as type-boundary work, not assertion cleanup.
5. Prefer `Schema.Finite`, explicit fallback return types, named result unions/helpers, `satisfies`,
   `Effect.satisfiesSuccessType`, or `Function.satisfies`.
6. Pass `Effect.fn` transforms as extra arguments to `Effect.fn(...)`; do not `.pipe(...)` transforms onto
   an `Effect.fn` declaration.
7. If delegating to an Effect subagent, give it `.codex/agents/effect-worker.md`, the target task, and the
   relevant files/tests; require it to report changed files and verification.

## Validation

Before reporting completion, run:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Report any reusable harness gap through `$effect-feedback`.
