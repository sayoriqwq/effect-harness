import type { Linter } from 'eslint'

import { sharedEffectEslintPolicy } from './harness/EslintPolicy.ts'

/**
 * Composable pinned-reference boundaries for a target-owned ESLint flat config.
 *
 * Targets import this value from `@sayoriqwq/effect-harness/eslint`; Prelude
 * intentionally never rewrites executable config files.
 */
const effectHarnessEslintConfig: Linter.Config[] = [
  {
    name: 'effect-harness/guardrails',
    rules: {
      'no-restricted-imports': [
        'error',
        sharedEffectEslintPolicy.restrictedImports,
      ],
    },
  },
]

export default effectHarnessEslintConfig
