# Keep one Source Pin truth

Status: accepted successor architecture, implemented by [GitHub issue
#13](https://github.com/sayoriqwq/effect-harness/issues/13).

The original decision correctly required one provenance truth and prohibited
Target-side Git maintenance, but it assigned generic Source Pin maintenance and
publication to Effect Harness. The accepted successor architecture separates
those responsibilities:

- Partita owns generic Source Pin planning, verification, deterministic archive
  publication, and ordinary provenance metadata.
- Effect Harness selects the concrete Effect and tsgo pins and owns their
  Baseline identity, Target locators, routes, and reference-only delivery
  semantics.
- Prelude Contract owns the canonical archive codec and wire contract.
- Prelude remains the only Target convergence and mutation host.

Issues [#14](https://github.com/sayoriqwq/effect-harness/issues/14) through
[#22](https://github.com/sayoriqwq/effect-harness/issues/22) completed this
transition in dependency order. The normative wire protocol is documented by
[Prelude Contract](https://github.com/yume-infra/prelude/blob/main/packages/harness-contract/README.md#canonical-tree-archive-protocol),
the [Partita producer](https://github.com/sayoriqwq/partita#pins) documents
publication, this Harness documents composition in [`HARNESS.md`](../../HARNESS.md),
and [Prelude](https://github.com/yume-infra/prelude/blob/main/docs/v2-harness-convergence-contract.md#pinned-reference-trees)
documents consumption.

## Historical decision

Effect Harness maintains each selected upstream GitHub repository as a Source
Pin using the pin workflow, a git-subtree prefix, and its sibling subtree
contract. Partita verifies that materialized prefix against the Git index and
contract revision, then publishes the canonical archive and provenance through
Prelude Contract. Effect Harness composes those ordinary publication files with
concrete Target policy; it does not compute a second digest or scan the pin at
runtime. Prelude delivers the resulting Pinned Reference Tree offline; it does
not fetch Git, run pin commands in the Target, inject subtree metadata, or
create another update authority. This preserves one provenance truth while
separating Source Pin production, Harness composition, and Target convergence.
