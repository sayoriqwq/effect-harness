/**
 * Composable Effect guardrails for a target-owned ESLint flat config.
 *
 * Targets import this value from `@sayoriqwq/effect-harness/eslint`; Prelude
 * intentionally never rewrites executable config files.
 */
const effectHarnessEslintConfig = [
  {
    name: 'effect-harness/guardrails',
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'node:test', message: 'Use @effect/vitest for Effect test entries.' },
            { name: '@effect/cli', message: 'Use effect/unstable/cli for Effect v4 beta.' },
          ],
          patterns: [
            { group: ['@effect/cli/*'], message: 'Use effect/unstable/cli for Effect v4 beta.' },
            { group: ['repos/effect/**', '**/repos/effect/**'], message: 'Import installed packages, never pinned source trees.' },
            { group: ['repos/tsgo/**', '**/repos/tsgo/**'], message: 'Use tsgo through its installed package.' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'MemberExpression[object.name="Context"][property.name="Tag"]', message: 'Use Context.Service for Effect v4 services.' },
        { selector: 'MemberExpression[object.name="Effect"][property.name=/^(catchAllCause|serviceOption)$/]', message: 'Use the Effect-native safer pattern.' },
      ],
    },
  },
  {
    name: 'effect-harness/tests',
    files: ['tests/**/*.test.{js,mjs,ts}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: 'node:test', message: 'Use @effect/vitest.' }, { name: 'vitest', importNames: ['describe', 'it', 'test'], message: 'Use @effect/vitest Effect entries.' }] }],
      'no-restricted-syntax': ['error', { selector: 'CallExpression[callee.name="it"]', message: 'Use it.effect, it.live, or layer from @effect/vitest.' }],
    },
  },
] as const

export default effectHarnessEslintConfig
