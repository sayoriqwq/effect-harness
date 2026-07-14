# Package, TypeScript, activation, and ESLint configuration

Run [adapt-effect-target](../skills/adapt-effect-target/SKILL.md) after Prelude
delivers the stable Harness-owned Outputs. The skill reads the immutable
[`../data/baseline.json`](../data/baseline.json) and
[`../data/tsgo-policy.json`](../data/tsgo-policy.json), observes the repository,
and proposes one reviewable Target-owned landing before mutation.

The proposal selects Effect-authoring package roots, one toolchain root and
Effect-tsgo activation owner, package-manager and lockfile changes, TypeScript 6
compatibility needs, the tsconfig inheritance landing for the complete canonical
policy, relevant editors, and actual verification commands. Folder names,
package presence, or a plugin item alone are not convergence evidence.

Formal TypeScript 7 is the primary compiler. Effect-tsgo running on that backend
is the sole Effect/TypeScript semantic authority. TypeScript 6 remains an
explicit compiler-API compatibility package where current tooling requires it.
After authorization, use the Target's own package manager and lifecycle, then
prove actual compiler identity, patch activation, and representative diagnostic
exit behavior.

## ESLint composition

Executable ESLint configuration is Target-owned. Adapt its established
composition framework to include the stable export:

```js
import antfu from '@antfu/eslint-config'
import effectHarness from '@sayoriqwq/effect-harness/eslint'

export default antfu().append(...effectHarness)
```

Antfu v9 returns a `FlatConfigComposer`; do not spread `antfu()` into an array.
Append the Harness export so later host or test overlays cannot replace its two
pinned-reference import boundaries. Those boundaries are the complete
Harness-owned ESLint policy. The Target owns every other lint rule.
