# Package, TypeScript, and ESLint configuration

Run [adapt-effect-target](../skills/adapt-effect-target/SKILL.md) when selecting
package roots or repairing TypeScript inheritance. The Harness declares the
complete named language-service item at each approved root; the skill decides
which roots actually author Effect and how secondary projects inherit it.
The projected item is the same canonical policy that Effect Harness verifies
for itself: diagnostics and tsc suggestions are enabled, every Effect
diagnostic severity is explicit, and no warning, suggestion, or error is
removed from the tsc exit code. Target placement and inheritance differ from
Harness self-hosting, but the policy values do not. Do not replace the item
with a partial plugin entry or local severity overrides.

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
Append the Harness export so later host or test overlays cannot replace its two
pinned-reference import boundaries. Those two boundaries are the complete
Harness-owned ESLint policy. tsgo owns Effect and TypeScript semantics; the
Target owns and customizes every other ESLint rule.
