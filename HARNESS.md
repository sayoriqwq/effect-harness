# Effect Harness Artifact

Effect Harness is a published Prelude Harness Artifact for Effect v4 beta.
It exposes the exact `./prelude` ESM export with named `harnessModule` and a
composable `./eslint` flat-config export.

The module creates a read-only plan containing:

- one complete Integration-scoped `managed/**` ManagedTree;
- verified, reference-only pinned source snapshots under sibling `repos/**`;
- a bounded Control Root agent-routing block.

`feedback/**` remains target-owned and is never an Output. Pinned repositories
are delivered offline from deterministic canonical archives stored as ordinary
Artifact files and carry immutable source provenance; Target
agents may inspect them but application and test code must not import them.
Target adaptation is performed by the delivered managed skill,
which reads immutable managed Baseline and canonical policy data, observes the
real repository, proposes and obtains authorization for Target-owned package,
lockfile, TypeScript, activation, lint, editor, and verification changes, proves
actual tool behavior, and hands control back to the Target.

## Reference publication authority

The [Prelude Contract package](https://github.com/yume-infra/prelude/blob/main/packages/harness-contract/README.md#canonical-tree-archive-protocol)
is the single normative owner of canonical archive framing, logical tree digest,
safety limits, canonicality, and compatibility. [Partita](https://github.com/sayoriqwq/partita#pins)
is the producer that verifies Git-index-authoritative Source Pins and publishes
archive/provenance pairs through that Contract.

Effect Harness is the composer. `Baseline.ts` selects the concrete Effect and
tsgo Source Pin identities; `SourcePins.ts` binds each Partita publication to
its Integration Workspace locator, routing, and `referenceOnly` Target meaning.
Artifact packaging includes those already-published ordinary files and does not
inspect or reinterpret Source Pin trees. [Prelude](https://github.com/yume-infra/prelude/blob/main/docs/v2-harness-convergence-contract.md#pinned-reference-trees)
is the consumer and only Target mutation host: it validates offline, reports
Reference Drift, applies complete-tree replacement after exact approval, and
leaves sibling `feedback/**` untouched.

The retired provider profile, discovery protocol, provider record, and
target-maintenance compatibility surface are absent. Prelude is the mutation
host and decides how a valid plan is applied.

## Source of truth

- `src/prelude.ts`: Module descriptor and read-only plan.
- `src/harness/Baseline.ts`: accepted package versions, roles, Target
  requirement semantics, and Source Pin identities.
- `src/harness/Policy.ts`: canonical complete Effect language-service policy
  plus semantic-equivalent self and managed-data projections.
- `tsconfig.effect.json`: checked-in, verified self projection consumed by the
  root `tsconfig.json`; ordinary typechecking never imports `dist`.
- `src/harness/EslintPolicy.ts`: the two canonical pinned-reference import
  boundaries, consumed unchanged by the public Target and repository self
  adapters; only their delivery and surrounding composition differ.
- `src/harness/SourcePins.ts`: derived immutable pinned-reference declarations.
- `artifact-assets/effect/reference-archives/*.{pta,json}`: Partita-published
  Effect and tsgo publications with generic provenance consumed by the Module.
- `tsdown.config.ts`: package bundling without Source Pin inspection or archive
  composition.
- `src/eslint.ts`: stable, composable public adapter over the canonical minimal
  ESLint policy; root `eslint.config.mjs` consumes the same policy directly from
  source. Target owners choose every other lint rule.
- `artifact-assets/effect/managed/**`: complete Target documentation, immutable
  Baseline and canonical policy data, and the delivered Control Handoff skill.
- `repos/effect/**`, `repos/tsgo/**`, and their subtree contracts: repository
  Source Pin inputs excluded from the published Artifact.

`src/harness/Baseline.ts` is the only source definition of accepted package
versions. The root manifest, pnpm catalog, and managed guidance are checked-in
projections verified against it because those formats cannot import TypeScript
source.

## Verification

The hard gate builds and packs the Artifact, typechecks the complete source,
test, and tooling project graph, runs every test under `tests/**` (including
packed distribution acceptance and policy conformance), then runs lint and
unused-code analysis. Production source uses the patched native compiler with
the canonical Effect policy. Repository test and tooling infrastructure uses
the accepted TypeScript 6 compatibility compiler so Node fixture, process, and
packaging orchestration remains strictly typechecked without being mistaken for
Target Effect application code. Immediately after build, verification rejects
any byte drift in the four tracked Effect/tsgo Source Pin publication files;
unrelated worktree changes are outside that scoped cleanliness check.

```bash
pnpm verify
```

The release-level cross-repository Gate verifies every participating repository,
then packs Prelude Contract, Partita, Effect Harness, and Prelude before
exercising the complete publication and Target convergence chain. It uses the
real bounded tsgo Source Pin, publishes it twice through the packed Partita CLI,
compares those bytes with the packed Harness, and runs Prelude against isolated
Targets with Git replaced by a failing sentinel. The Gate also proves
archive-drift repair and preservation of Target-owned feedback through
Prelude's packed Effect acceptance.

The sibling repositories default to `../partita` and `../prelude`; CI or a
release workspace may select explicit checkouts with `PARTITA_ROOT` and
`PRELUDE_ROOT`.
The npm publish workflow checks out immutable Partita `0.2.2` and the Prelude
Control Handoff Gate commit carrying Prelude `0.4.0`/Contract `0.2.2`, installs
all three repositories, and runs this Gate before its single publish step. It
fails closed when either fixed commit is unavailable or the package version
already exists on npm, so ordering mistakes and reruns cannot silently publish.
Set `CROSS_REPO_KEEP_TEMP=1` to preserve tarballs, publication evidence, and
isolated Targets after a failure.

```bash
pnpm acceptance:cross-repo
```

For focused implementation loops, use the stable project boundaries or pass a
test path without weakening the final gate:

```bash
pnpm typecheck:source
pnpm typecheck:tests
pnpm typecheck:tooling
pnpm test:focused -- tests/prelude-module.test.ts
```
