---
status: superseded by ADR-0007
---

# Express effective policy as Plan Conformance

Effective TypeScript and language-service policy is represented as a
plain-data Conformance computed by the existing Harness Module planning seam,
not as an ArtifactCommandCheck, private executable, new Module check entry, or
Prelude domain rule. Effect Harness resolves the approved Target configuration
through read-only observations and returns expected-policy, observed-policy,
and observation-closure digests with structured evidence. An unsatisfied
Conformance may coexist with pending Harness Outputs, but it blocks Target
command Checks and completion; apply is followed by a fresh plan that must make
the Conformance satisfied. Existing no-shell target command Checks continue to
prove typecheck, lint, and repository verification. This keeps Effect semantics
local to Effect Harness and avoids creating a hidden executable Interface.
