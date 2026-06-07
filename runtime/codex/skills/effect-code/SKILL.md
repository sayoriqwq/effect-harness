---
name: effect-code
description: Write, review, and debug Effect v4 beta code in this target repository using the linked effect-harness official pin. Use when implementing Effect services, runtime entrypoints, tests, CLI/HTTP/process boundaries, @effect/tsgo diagnostics, or reviewing Effect code. Not for updating the harness source pin or changing effect-harness itself.
---

# Effect Code

Use this skill for Effect code in this target repo.

## Source Order

1. Target repo instructions and existing code.
2. `__EFFECT_HARNESS_ROOT__/repos/effect/LLMS.md`.
3. `__EFFECT_HARNESS_ROOT__/repos/effect/ai-docs/src/` for examples.
4. `__EFFECT_HARNESS_ROOT__/repos/effect/migration/v3-to-v4.md` for migration.
5. `__EFFECT_HARNESS_ROOT__/docs/effect-patterns/index.md` for harness routes and boundaries.
6. Patched `tsgo --noEmit` diagnostics.

## Rules

- Do not import from `__EFFECT_HARNESS_ROOT__/repos/effect`.
- Prefer official pinned guidance over local memory.
- Use installed packages: `effect`, `@effect/platform-node`, `@effect/vitest`.
- Use `Context.Service` for services on this baseline.
- Use patched `tsgo --noEmit` as the primary Effect diagnostic loop.
- Use `assert` from `@effect/vitest`; do not use `expect`.

## Verification

Run these before reporting completion:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```
