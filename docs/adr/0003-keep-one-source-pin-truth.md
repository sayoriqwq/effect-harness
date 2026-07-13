# Keep one Source Pin truth

Effect Harness maintains each upstream GitHub repository as a Source Pin using
the pin workflow, a git-subtree prefix, and its sibling subtree contract. The
Artifact build derives immutable source and revision provenance from that
contract, verifies the materialized prefix, and computes the snapshot tree
digest. Prelude only delivers the resulting Pinned Reference Tree offline; it
does not fetch Git, run pin commands in the Target, inject subtree metadata, or
create another update authority. This preserves one provenance truth while
separating Harness source maintenance from Target convergence.
