# Keep one Source Pin truth

Status: superseded in part by [GitHub issue #13](https://github.com/sayoriqwq/effect-harness/issues/13).

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
[#22](https://github.com/sayoriqwq/effect-harness/issues/22) implement this
transition in dependency order. Until the owning ticket migrates a surface, the
current repository files remain migration inputs rather than a second
authority.

## Historical decision

Effect Harness maintains each upstream GitHub repository as a Source Pin using
the pin workflow, a git-subtree prefix, and its sibling subtree contract. The
Artifact build derives immutable source and revision provenance from that
contract, verifies the materialized prefix, and computes the snapshot tree
digest. Prelude only delivers the resulting Pinned Reference Tree offline; it
does not fetch Git, run pin commands in the Target, inject subtree metadata, or
create another update authority. This preserves one provenance truth while
separating Harness source maintenance from Target convergence.
