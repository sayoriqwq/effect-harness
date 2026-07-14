# Editor and compilation boundary

Delivered `.prelude/**/repos/**` source is searchable evidence, not application
source. Keep it out of TypeScript compilation, auto-import candidates, file
watching, and ordinary editor indexing.

The [adapt-effect-target skill](../skills/adapt-effect-target/SKILL.md) inspects
which editors the Target actually uses, the real tsconfig inheritance, and broad
include globs before proposing Target-owned exclusions or language-server
settings. Verify that editor tooling resolves the same patched TypeScript 7
backend as the command line. Do not create irrelevant editor state or assume one
repository-wide setting covers every project topology.
