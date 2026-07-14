# Effect code and test baseline

Use installed `effect`, `@effect/platform-node`, and `@effect/vitest` packages.
Never import the delivered `repos/**` reference trees.

| Role | Package | Accepted range | Presence | Default section | Peer fallback |
| --- | --- | --- | --- | --- | --- |
| `runtime` | `effect` | `4.0.0-beta.97` | `required` | `dependencies` | `devDependencies` |
| `optional-platform` | `@effect/platform-node` | `4.0.0-beta.97` | `declared-or-manifest-unavailable` | `dependencies` | `devDependencies` |
| `effect-test-integration` | `@effect/vitest` | `4.0.0-beta.97` | `required` | `devDependencies` | `devDependencies` |
| `effect-compiler-patch` | `@effect/tsgo` | `0.19.0` | `required` | `devDependencies` | `devDependencies` |
| `typescript-api` | `typescript` | `npm:@typescript/typescript6@6.0.2` | `required` | `devDependencies` | `devDependencies` |
| `native-compiler` | `@typescript/native` | `npm:typescript@7.0.2` | `required` | `devDependencies` | `devDependencies` |

For peer-only libraries, the peer fallback provides local verification without
changing the published runtime role. The optional platform follows the same
fallback when declared only as a peer. Target adaptation owns package selection
and placement; it does not change these accepted versions or roles.

## Working rules

- Model services with the current Effect v4 service APIs and compose their
  implementations through Layers.
- Keep typed failures and service requirements visible; do not erase them to
  make a signature easier.
- Use Effect resource and Scope operators instead of ad hoc cleanup.
- Use `NodeRuntime.runMain` for Node entry points.
- Let tsgo own type-aware Effect idioms and quick fixes. Harness ESLint does not
  duplicate them with syntax-only rules; Target owners choose any additional
  package, test, syntax, or style lint policy.

For an unfamiliar API or behavior, follow [effect-source.md](./effect-source.md)
instead of guessing from memory.
