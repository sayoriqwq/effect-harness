# Default Harness Capabilities

This is the agent-facing contract for default harness supplements. Human-readable explanation lives in
`guide/default-capabilities.md`.

## Assertion-based tsgo suggestion cleanup

Treat `@effect/tsgo` suggestions as type-boundary work, not assertion cleanup.

Preferred shapes:

- explicit return types
- named discriminated union helpers
- `satisfies`
- `Effect.satisfiesSuccessType`
- `Function.satisfies`
- `Schema.Finite` where applicable

Rejected recurring shapes:

- `Effect.orElseSucceed(() => [] as ...)`
- `Effect.succeed(null as ...)`
- ad-hoc `{ ok: true/false as const }` result wrappers

Landing surfaces:

- `harness/runtime/codex/skills/effect-code/SKILL.md`
- `src/harness/GuardrailRules.ts`
- `pnpm effect:verify`

Exceptions must be explicit third-party IO or external boundary assertions, declared outside the Effect
fallback or lifted value.
