# Effect Harness routes

This is the entry point for Effect application, test, package, TypeScript,
editor, lint, or diagnostic work in this Integration.

## Start here

- First integration, upgrade, package selection, or tsconfig placement:
  [adapt-effect-target](../skills/adapt-effect-target/SKILL.md).
- Effect implementation or tests: [effect-code.md](./effect-code.md), then
  [effect-source.md](./effect-source.md) when concrete source evidence helps.
- TypeScript or Effect diagnostics: [diagnostics.md](./diagnostics.md), then
  [tsgo-source.md](./tsgo-source.md) for rule implementation evidence.
- Package, tsconfig, or ESLint composition: [package-config.md](./package-config.md).
- Editor indexing and auto-imports: [editor-policy.md](./editor-policy.md).
- Completion and failure routing: [feedback-loop.md](./feedback-loop.md) and
  [quality-policy.md](./quality-policy.md).
- Ownership or drift: [managed-surfaces.md](./managed-surfaces.md) and
  [source-identity.md](./source-identity.md).

## Evidence order

Use this order: the failing diagnostic or Check, managed policy, the delivered
Effect source, then the delivered tsgo source for diagnostic internals. Do not
scan large reference trees before the managed route identifies the relevant
package, module, rule, or fixture.

Target code imports installed packages only. The sibling `repos/**` trees are
read-only evidence and `feedback/**` is Target-owned.
