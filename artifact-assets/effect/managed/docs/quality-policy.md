# Quality and completion policy

An Integration is complete only after a fresh Plan is converged and every
declared package-scoped Check passes. The standard Checks are strict Effect
type checking, lint with zero warnings, and the Target's verification command.

Failure routes:

- Effect or TypeScript diagnostic: [diagnostics.md](./diagnostics.md).
- Test behavior: [effect-code.md](./effect-code.md) and
  [effect-source.md](./effect-source.md).
- ESLint conflict or composition: [diagnostic-layers.md](./diagnostic-layers.md)
  and [package-config.md](./package-config.md).
- Source provenance or route: [source-identity.md](./source-identity.md).
- Package selection or tsconfig landing: run the Target Adaptation skill.

Never replace a named stage with a weaker proxy command and never claim Gate
completion from schema validity alone.
