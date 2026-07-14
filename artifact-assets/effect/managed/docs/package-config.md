# Package, TypeScript, and ESLint configuration

Run [adapt-effect-target](../skills/adapt-effect-target/SKILL.md) when selecting
package roots or repairing TypeScript inheritance. The Harness declares the
complete named language-service item at each approved root; the skill decides
which roots actually author Effect and how secondary projects inherit it.

Dependencies are resolved before Apply. Review exact manifest and workspace
lock changes, then replan. Apply performs only the approved frozen install and
must not resolve a range again.

## ESLint composition

Executable ESLint configuration is Target-owned. Compose the stable export:

```js
import antfu from '@antfu/eslint-config'
import effectHarness from '@sayoriqwq/effect-harness/eslint'

export default antfu().append(...effectHarness)
```

Antfu v9 returns a `FlatConfigComposer`; do not spread `antfu()` into an array.
ESLint owns syntax and repository boundaries, while tsgo owns Effect semantics.
