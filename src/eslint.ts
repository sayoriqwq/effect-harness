import type { Linter } from 'eslint'

import {
  effectHarnessEslintPlugin,
  effectTestEslintPolicy,
  sharedEffectEslintPolicy,
} from './harness/EslintPolicy.ts'

/**
 * Composable Effect guardrails for a target-owned ESLint flat config.
 *
 * Targets import this value from `@sayoriqwq/effect-harness/eslint`; Prelude
 * intentionally never rewrites executable config files.
 */
const effectHarnessEslintConfig: Linter.Config[] = [
  {
    name: 'effect-harness/guardrails',
    plugins: {
      'effect-harness': effectHarnessEslintPlugin,
    },
    rules: {
      ...sharedEffectEslintPolicy.rules,
      'no-restricted-imports': [
        'error',
        sharedEffectEslintPolicy.restrictedImports,
      ],
      'no-restricted-syntax': [
        'error',
        ...sharedEffectEslintPolicy.restrictedSyntax,
      ],
    },
  },
  {
    name: 'effect-harness/tests',
    files: ['tests/**/*.test.{js,mjs,ts}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          ...sharedEffectEslintPolicy.restrictedImports.paths,
          ...effectTestEslintPolicy.restrictedImportPaths,
        ],
        patterns: sharedEffectEslintPolicy.restrictedImports.patterns,
      }],
      'no-restricted-syntax': [
        'error',
        ...sharedEffectEslintPolicy.restrictedSyntax,
        ...effectTestEslintPolicy.restrictedSyntax,
      ],
    },
  },
]

export default effectHarnessEslintConfig
