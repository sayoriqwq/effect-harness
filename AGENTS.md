# Effect Harness agent rules

This repository publishes an Effect v4 Prelude Harness Artifact. Its public
interfaces are exactly `@sayoriqwq/effect-harness/prelude` (named
`harnessModule`) and `@sayoriqwq/effect-harness/eslint`.

## Completed architecture baseline

[GitHub issue #13](https://github.com/sayoriqwq/effect-harness/issues/13) is the
completed target architecture. Issues #14 through #23 implemented and documented
it in dependency order. The released baseline is Partita 0.2.2, Prelude Contract
0.2.2, Effect Harness 0.3.0, and Prelude 0.4.0.

Partita owns generic Source Pin verification and publication; Effect Harness
owns the concrete Effect and tsgo pin selection plus Target delivery policy;
Prelude Contract owns the canonical archive wire contract; Prelude owns
convergence and mutation of active Harness-owned Outputs. After stable Output
delivery, the Effect Harness-delivered skill may mutate Target-owned surfaces
only through explicit Control Handoff authorization. Raw repositories and their
subtree contracts remain repository-only source-maintenance inputs. The npm
Artifact transports only their verified Partita publications alongside the
final managed bundle and public adapters.

Before changing module planning, read `HARNESS.md`, `README.md`,
`src/prelude.ts`, `src/eslint.ts`, and `artifact-assets/effect/managed/docs/`.

## Boundaries

- Planning is read-only and returns Contract plain data.
- `artifact-assets/effect/managed/**` is the complete Artifact-managed target
  bundle. Do not shorten, replace, or project pinned source diagnostics there.
- Integration Workspace `feedback/**` is target-owned and must never be
  planned as an Output.
- Pinned `repos/effect/**` and `repos/tsgo/**` plus their subtree contracts are
  source-maintenance inputs excluded from the npm package. The Module projects
  their Partita publications as reference-only `PinnedReferenceTree` Outputs;
  application and test code must not import any pinned tree.
- The retired provider profile, discovery API, provider record, and lifecycle
  surface are not supplied. Do not restore them.
- The Harness Module does not own Target mutation, package installation, or a
  target-local dispatcher. The delivered skill may adapt Target-owned surfaces
  only after explicit authorization.

## Baseline

- `effect@4.0.0-beta.97`
- `@effect/platform-node@4.0.0-beta.97`
- `@effect/vitest@4.0.0-beta.97`
- `@effect/tsgo@0.19.0`
- `typescript: npm:@typescript/typescript6@6.0.2`
- `@typescript/native: npm:typescript@7.0.2`

Verify with:

```bash
pnpm verify
```

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues; external pull requests are not a
triage request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The repository uses the default five-role triage vocabulary. See
`docs/agents/triage-labels.md`.

### Domain docs

The repository uses a single-context domain documentation layout. See
`docs/agents/domain.md`.
