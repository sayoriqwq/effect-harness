# Diagnostic ownership

Each feedback layer has one job:

- tsgo owns TypeScript and Effect semantics, including error/context/layer
  channels, generators, Schema behavior, v4 API drift, and Effect-native fixes.
- tests own behavioral regression.
- Harness ESLint owns only two architectural import boundaries: application
  code must not import `repos/effect/**` or `repos/tsgo/**`.
- Target owners compose every other ESLint rule, including package, test,
  syntax, style, and project-specific policy.
- Harness verification owns policy equality, source provenance, route
  reachability, suppression rejection, and packed Artifact completeness.

The public Target adapter and Effect Harness's repository self adapter consume
the same two canonical boundaries; only delivery and surrounding configuration
differ. Harness ESLint does not express Effect API, Schema, test-entry, package
migration, semantic, or style rules. If tsgo does not yet express an Effect or
TypeScript constraint, the Harness leaves it unenforced until tsgo does; it does
not add a syntax-only substitute.
