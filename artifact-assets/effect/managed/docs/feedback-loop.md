# Feedback loop

Use one small change and one named failure route at a time:

1. Converge the stable Harness-owned managed, routing, and reference Outputs.
2. Enter [Control Handoff](../skills/adapt-effect-target/SKILL.md) and observe the
   actual Target before proposing adaptation.
3. Obtain authorization before any Target mutation.
4. Make the smallest approved Target-owned change.
5. Verify actual compiler activation and a representative unsuppressed
   diagnostic through the Target's real typecheck path.
6. Run the independent Integration gate and Effect code gate, report both exact
   commands and exit codes, then review the resulting diff and durable
   evidence. A root aggregate may report both gates, but a composed Harness
   Check must never call that aggregate when it invokes `prelude check`; use a
   leaf command to avoid re-entering the aggregate.

Stable Output convergence does not prove Target Adaptation. If installation,
activation, or a Target command fails, preserve the evidence and do not claim
completion or partial green. Discovery and verification remain read-only; no
automatic approval, apply, install, fix, migration, suppression, or CI change
is allowed.
