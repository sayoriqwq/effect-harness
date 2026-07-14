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
- `src/harness/Policy.ts`: canonical complete Effect language-service policy.
- `src/harness/SourcePins.ts`: derived immutable pinned-reference declarations.
- `prelude-assets/effect/reference-archives/effect.{pta,json}`: Partita-published
  Effect archive and generic provenance consumed by the Module.
- `tsdown.config.ts`: package build and legacy tsgo archive composition during
  the Effect-first publication transition.
- `src/eslint.ts`: stable, composable ESLint config API.
- `prelude-assets/effect/managed/**`: complete target documentation bundle.
- `repos/effect/**`, `repos/tsgo/**`, their subtree contracts, and
  `diagnostics/**`: Source Pin truth and read-only diagnostics shipped inside
  the Artifact.

The accepted package baseline is Effect `4.0.0-beta.97`, `@effect/tsgo`
`0.19.0`, the TypeScript 6 compatibility API package
`npm:@typescript/typescript6@6.0.2`, and the real native TypeScript 7 compiler
`npm:typescript@7.0.2` installed as `@typescript/native`.

## Verification

```bash
pnpm verify
```
