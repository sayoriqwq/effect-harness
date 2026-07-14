# Effect diagnostics

The patched native TypeScript backend and the complete language-service policy
are the primary semantic feedback loop. Error, warning, suggestion, and message
severity all matter to completion.

## Repair order

1. Read the diagnostic name, location, and suggested change.
2. Fix the code or configuration without lowering policy.
3. When semantics are unclear, find the rule in
   `repos/tsgo/_packages/tsgo/src/metadata.json`.
4. Follow [tsgo-source.md](./tsgo-source.md) to its implementation, quick fix,
   and fixture.
5. Re-run the Target's real typecheck path that failed.

Fix diagnostics without weakening the canonical policy. Preserve existing
Target-owned suppression decisions unless an audit was requested. Never add a
suppression merely to make verification green; a new exception requires the
smallest practical scope, an explained diagnostic and alternative, explicit
authorization, and durable Target-owned rationale. tsgo owns suppression
semantics and remains the sole Effect/TypeScript semantic authority; Harness
ESLint only protects the two delivered pinned-reference import boundaries.
