# Package and TypeScript configuration

Direct requirements cover the Effect runtime, Node platform, Effect Vitest,
tsgo, language service, native TypeScript backend, ESLint, Antfu config, and
Vitest. The named language-service plugin is structurally merged by its name.

## Antfu v9 ESLint composition

`@antfu/eslint-config` v9 returns a `FlatConfigComposer`, not an iterable
array. Compose the stable Effect Harness export through `append`:

```js
import antfu from '@antfu/eslint-config'
import effectHarness from '@sayoriqwq/effect-harness/eslint'

export default antfu().append(...effectHarness)
```

Do not use `export default [...antfu(), ...effectHarness]`; it fails before
ESLint can lint because the Antfu composer is not iterable.
