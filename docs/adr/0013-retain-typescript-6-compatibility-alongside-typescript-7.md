# Retain TypeScript 6 compatibility alongside TypeScript 7

The accepted Baseline keeps the formal TypeScript 7 native compiler and the
TypeScript 6 compatibility package side by side. TypeScript 7 plus Effect-tsgo
is the primary compiler and Effect/TypeScript semantic authority. TypeScript 6
continues to supply the compiler API and compatibility required by the current
Effect Harness build, lint, test, and ecosystem tooling.

The Baseline therefore retains the established aliases and roles rather than
attempting a partial unification: `@typescript/native` resolves to the pinned
formal TypeScript 7 package, while `typescript` resolves to the pinned
`@typescript/typescript6` package and supplies `tsc6` and the JavaScript
compiler API. This is an intentional compatibility topology, not a preview
compiler path and not a second semantic authority. Effect-tsgo remains the
only authority for Effect-aware diagnostics when the TypeScript 7 compiler is
used.

Migration to a TypeScript-7-only Baseline requires explicit upstream support,
not merely the existence of a stable TypeScript 7 release. The migration may
be reconsidered only after TypeScript exposes the required stable compiler API
and every directly relied-on build, lint, declaration, and analysis tool
supports that API or has been deliberately replaced. A focused branch must
then prove source, tests, tooling, package emission, lint, packed consumption,
and Effect-tsgo activation before a successor ADR removes the TypeScript 6
compatibility role.

Target Adaptation may preserve additional Target-owned TypeScript 6 consumers
when a real repository requires them. Effect Harness does not promise or force
TypeScript-7-only Target topology before those compatibility conditions are
met.
