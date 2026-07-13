# Diagnostic ownership

Each feedback layer has one job:

- tsgo owns TypeScript and Effect semantics, including error/context/layer
  channels, generators, Schema behavior, v4 API drift, and Effect-native fixes.
- tests own behavioral regression.
- ESLint owns import boundaries, package conventions, Effect test entries, and
  syntax-only repository rules that tsgo does not represent.
- Harness verification owns policy equality, source provenance, route
  reachability, suppression rejection, and packed Artifact completeness.

If tsgo and ESLint prescribe conflicting Effect code, keep the verified tsgo
behavior and narrow ESLint. `Effect.ignore` is intentionally permitted because
the current tsgo policy can recommend it.
