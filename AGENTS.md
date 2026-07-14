# Effect Harness agent rules

This repository publishes an Effect v4 Prelude Harness Artifact. Its public
interfaces are exactly `@sayoriqwq/effect-harness/prelude` (named
`harnessModule`) and `@sayoriqwq/effect-harness/eslint`.

## Active architecture transition

[GitHub issue #13](https://github.com/sayoriqwq/effect-harness/issues/13) is the
accepted target architecture. Issues #14 through #22 implement it in dependency
order. Partita owns generic Source Pin verification and publication; Effect
Harness owns the concrete Effect and tsgo pin selection plus Target delivery
policy; Prelude Contract owns the canonical archive wire contract; Prelude owns
Target convergence and mutation.

The raw repositories, root diagnostics, current asset-root name, duplicated
policy, and partial verification graph below describe migration inputs, not the
desired final publication surface. Keep their current safety boundaries until
the ticket that owns each migration changes them.

Before changing module planning, read `HARNESS.md`, `README.md`,
`src/prelude.ts`, `src/eslint.ts`, and `prelude-assets/effect/managed/docs/`.

## Boundaries

- Planning is read-only and returns Contract plain data.
- `prelude-assets/effect/managed/**` is the complete Artifact-managed target
  bundle. Do not shorten, replace, or project pinned source diagnostics there.
- Integration Workspace `feedback/**` is target-owned and must never be
  planned as an Output.
- Pinned `repos/effect/**` and `repos/tsgo/**`, their subtree contracts, and
  `diagnostics/**` are Artifact-internal source diagnostics shipped with the
  npm package. The Module may project verified snapshots as reference-only
  `PinnedReferenceTree` Outputs through canonical archive files; application
  and test code must not import any pinned tree.
- The retired provider profile, discovery API, provider record, and lifecycle
  surface are not supplied. Do not restore them.
- The Artifact does not own target mutation, package installation, or a
  target-local dispatcher.

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
