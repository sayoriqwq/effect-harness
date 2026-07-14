# Effect code and test baseline

Use installed `effect`, `@effect/platform-node`, and `@effect/vitest` packages.
Never import the delivered `repos/**` reference trees.

## Working rules

- Model services with the current Effect v4 service APIs and compose their
  implementations through Layers.
- Keep typed failures and service requirements visible; do not erase them to
  make a signature easier.
- Use Effect resource and Scope operators instead of ad hoc cleanup.
- Use `NodeRuntime.runMain` for Node entry points.
- Use `effect/unstable/cli`, not the retired `@effect/cli` package.
- Use `it.effect`, `it.live`, or `layer` from `@effect/vitest` for Effect tests.
- Let tsgo own type-aware Effect idioms and quick fixes. Do not duplicate or
  contradict them with syntax-only lint rules.

For an unfamiliar API or behavior, follow [effect-source.md](./effect-source.md)
instead of guessing from memory.
