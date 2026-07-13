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
5. Re-run the package-scoped Check that failed.

Do not use Effect diagnostic suppression comments, local severity overrides, or
weaker compiler settings to make the gate green. When ESLint conflicts with a
supported tsgo rewrite, tsgo wins and the syntax rule must be narrowed.
