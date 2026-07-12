# Effect Harness Artifact

Effect Harness is a published Prelude Harness Artifact for Effect v4 beta.
It exposes the exact `./prelude` ESM export with named `harnessModule` and a
composable `./eslint` flat-config export.

The module creates a read-only plan containing:

- one complete `effect/managed/**` ManagedTree sourced from Artifact assets;
- a bounded root agent-routing block;
- TypeScript and editor structured configuration;
- direct package requirements, target checks, and blocking integration Issues.

`effect/feedback/**` remains target-owned. Effect and tsgo pinned repositories
remain Artifact-internal source diagnostics; normal targets do not receive or
depend on those checkouts.

The retired provider profile, discovery protocol, provider record, and
target-maintenance compatibility surface are absent. Prelude is the mutation
host and decides how a valid plan is applied.

## Source of truth

- `src/prelude.ts`: Module descriptor and read-only plan.
- `src/eslint.ts`: stable, composable ESLint config API.
- `prelude-assets/effect/managed/**`: complete target documentation bundle.
- `prelude-assets/guidance/eslint.md`: repair guidance for the ESLint Issue.
- `repos/effect/**`, `repos/tsgo/**`, their subtree contracts, and
  `diagnostics/**`: read-only source diagnostics shipped inside the Artifact,
  never normal target outputs.

## Verification

```bash
pnpm verify
```
