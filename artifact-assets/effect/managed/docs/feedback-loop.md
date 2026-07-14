# Feedback loop

Use one small change and one named failure route at a time:

1. Converge the stable Harness-owned managed, routing, and reference Outputs.
2. Enter [Control Handoff](../skills/adapt-effect-target/SKILL.md) and observe the
   actual Target before proposing adaptation.
3. Obtain authorization before any Target mutation.
4. Make the smallest approved Target-owned change.
5. Verify actual compiler activation and a representative unsuppressed
   diagnostic through the Target's real typecheck path.
6. Run the Target's own checks and review the resulting diff and durable evidence.

Stable Output convergence does not prove Target Adaptation. If installation,
activation, or a Target command fails, preserve the evidence and do not claim
completion.
