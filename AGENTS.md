# Effect Harness agent rules

This repository publishes an Effect v4 Prelude Harness Artifact. Its public
interfaces are exactly `@sayoriqwq/effect-harness/prelude` (named
`harnessModule`) and `@sayoriqwq/effect-harness/eslint`.

Before changing module planning, read `HARNESS.md`, `README.md`,
`src/prelude.ts`, `src/eslint.ts`, and `prelude-assets/effect/managed/docs/`.

## Boundaries

- Planning is read-only and returns Contract plain data.
- `prelude-assets/effect/managed/**` is the complete Artifact-managed target
  bundle. Do not shorten, replace, or project pinned source diagnostics there.
- `effect/feedback/**` is target-owned and must never be planned as an Output.
- Pinned `repos/effect/**` and `repos/tsgo/**`, their subtree contracts, and
  `diagnostics/**` are Artifact-internal source diagnostics shipped with the
  npm package but never projected as Outputs. Application and test code must
  not import either tree.
- The retired provider profile, discovery API, provider record, and lifecycle
  surface are not supplied. Do not restore them.
- The Artifact does not own target mutation, package installation, or a
  target-local dispatcher.

## Baseline

- `effect@4.0.0-beta.92`
- `@effect/platform-node@4.0.0-beta.92`
- `@effect/vitest@4.0.0-beta.92`
- `@effect/tsgo@0.15.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260630.1`

Verify with:

```bash
pnpm verify
```
