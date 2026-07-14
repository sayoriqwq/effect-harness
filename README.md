# Effect Harness

Effect Harness publishes a Prelude Harness Module for Effect v4 beta targets.

```ts
import effectHarnessEslintConfig from '@sayoriqwq/effect-harness/eslint'
import { harnessModule } from '@sayoriqwq/effect-harness/prelude'
```

The ESLint export contributes only two composable boundaries: application code
must not import delivered `repos/effect/**` or `repos/tsgo/**` reference trees.
tsgo is the sole authority for Effect and TypeScript semantics; Target owners
choose all other ESLint rules in their own flat config.

`harnessModule` plans a complete Integration-scoped managed knowledge tree,
reference-only pinned source diagnostics, and a bounded Control Root routing
block. Planning is read-only; Prelude owns convergence of those stable
Harness-owned assets.

Integration `feedback/**` is target-owned and never planned as an Output.
Pinned Effect and tsgo sources are delivered offline from canonical archive
files in the Artifact with immutable provenance; they are agent references,
never application dependencies. The delivered Target Adaptation skill reads
immutable managed Baseline and canonical policy data, observes repository-specific
topology, obtains authorization before changing Target-owned package, lockfile,
TypeScript, activation, lint, editor, or verification state, proves actual
Effect-tsgo behavior, then hands ongoing ownership back to that Target.

The reference publication authority chain is [Prelude Contract's normative
archive protocol](https://github.com/yume-infra/prelude/blob/main/packages/harness-contract/README.md#canonical-tree-archive-protocol)
→ [Partita production](https://github.com/sayoriqwq/partita#pins) → Effect
Harness composition → [Prelude validation and
materialization](https://github.com/yume-infra/prelude/blob/main/docs/v2-harness-convergence-contract.md#pinned-reference-trees).
