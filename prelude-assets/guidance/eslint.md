# Compose Effect Harness ESLint guardrails

`eslint.config.mjs` remains target-owned executable configuration. Add the
stable Artifact export to its existing flat-config composition:

```js
import effectHarnessEslintConfig from '@sayoriqwq/effect-harness/eslint'

export default [
  ...effectHarnessEslintConfig,
]
```

Preserve target-specific config and rerun `prelude plan` after the user has
approved the target-owned patch.
