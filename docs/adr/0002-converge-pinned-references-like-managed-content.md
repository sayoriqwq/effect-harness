# Converge pinned references like managed content

Pinned Reference Trees are official provenance repositories owned by Effect
Harness, so Prelude treats their Target contents with the same convergence
semantics as managed content. A Plan exposes Reference Drift, and an approved
apply atomically replaces the tree instead of merging, preserving, or blocking
on Target-side edits. Target-authored notes and evidence belong in feedback;
this deliberately trades editable source copies for a deterministic,
version-aligned reference baseline.
