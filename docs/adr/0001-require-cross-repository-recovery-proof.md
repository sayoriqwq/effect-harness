# Require cross-repository proof for the recovery gate

Effect Harness recovery and Prelude protocol support may be developed in
parallel, but neither a Harness-only green build nor an unreleased Contract
proposal completes the Integrated Recovery Gate. The gate closes, and a new
baseline may be declared, only after both repositories are repaired and a
cross-repository acceptance path proves that Prelude can deliver the recovered
capability without information loss. This prevents publishing another
internally complete Artifact whose actual Target projection remains shallow.
