# Effect Harness Artifact

Effect Harness is a published Prelude Harness Artifact for Effect v4 beta.
It exposes the exact `./prelude` ESM export with named `harnessModule` and a
composable `./eslint` flat-config export.

The module creates a read-only plan containing:

- one complete Integration-scoped `managed/**` ManagedTree;
- verified, reference-only pinned source snapshots under sibling `repos/**`;
- a bounded Control Root agent-routing block;
- package-scoped TypeScript policy for every explicitly approved Package Root;
- Control Root editor exclusions, package requirements, target checks, and
  blocking integration Issues.

`feedback/**` remains target-owned and is never an Output. Pinned repositories
are delivered offline from deterministic canonical archives stored as ordinary
Artifact files and carry immutable source provenance; Target
agents may inspect them but application and test code must not import them.
Target adaptation is performed by the delivered managed skill,
which externalizes package selection and TypeScript topology into approved
Target configuration before handing control back to the Target.

The retired provider profile, discovery protocol, provider record, and
target-maintenance compatibility surface are absent. Prelude is the mutation
host and decides how a valid plan is applied.

## Source of truth

- `src/prelude.ts`: Module descriptor and read-only plan.
- `src/harness/Policy.ts`: canonical complete Effect language-service policy
  plus semantic-equivalent self and Target projections.
- `tsconfig.effect.json`: checked-in, verified self projection consumed by the
  root `tsconfig.json`; ordinary typechecking never imports `dist`.
- `src/harness/EslintPolicy.ts`: canonical Effect ESLint rules and plugin,
  consumed unchanged by the public Target and repository self adapters; only
  their delivery and composition differ.
- `src/harness/SourcePins.ts`: derived immutable pinned-reference declarations.
- `artifact-assets/effect/reference-archives/*.{pta,json}`: Partita-published
  Effect and tsgo archives with generic provenance consumed by the Module.
- `tsdown.config.ts`: package bundling without Source Pin inspection or archive
  composition.
- `src/eslint.ts`: stable, composable public adapter over the canonical ESLint
  policy; root `eslint.config.mjs` consumes the same policy directly from source.
- `artifact-assets/effect/managed/**`: complete target documentation bundle.
- `repos/effect/**`, `repos/tsgo/**`, and their subtree contracts: repository
  Source Pin inputs excluded from the published Artifact.

The accepted package baseline is Effect `4.0.0-beta.97`, `@effect/tsgo`
`0.19.0`, the TypeScript 6 compatibility API package
`npm:@typescript/typescript6@6.0.2`, and the real native TypeScript 7 compiler
`npm:typescript@7.0.2` installed as `@typescript/native`.

## Verification

```bash
pnpm verify
```
