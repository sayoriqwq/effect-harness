# Editor and compilation boundary

Delivered `.prelude/**/repos/**` source is searchable evidence, not application
source. Keep it out of TypeScript compilation, auto-import candidates, file
watching, and ordinary editor indexing.

Prelude can safely materialize declared structured editor settings. The
[adapt-effect-target skill](../skills/adapt-effect-target/SKILL.md) must inspect
the real tsconfig inheritance and broad include globs, then propose any
additional Target-owned exclusions. Do not assume one repository-wide setting
covers every editor or project topology.
