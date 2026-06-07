import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: [
      'docs/**',
      'repos/**',
      'node_modules/**',
      '.turbo/**',
      '**/.turbo/**',
      '**/dist/**',
    ],
  },
  {
    name: 'effect-harness/source',
    files: ['bin/**/*.ts', 'src/**/*.ts', 'tests/**/*.{js,mjs,ts}'],
    rules: {
      'antfu/no-top-level-await': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'node:test',
              message: 'Use @effect/vitest for this Effect harness test suite.',
            },
            {
              name: 'vitest',
              message: 'Use @effect/vitest for this Effect harness test suite.',
            },
            {
              name: '@effect/cli',
              message: 'Use effect/unstable/cli for Effect v4 beta.',
            },
          ],
          patterns: [
            {
              group: ['@effect/cli/*'],
              message: 'Use effect/unstable/cli for Effect v4 beta.',
            },
            {
              group: ['repos/effect/**', '**/repos/effect/**'],
              message: 'repos/effect is read-only reference material; import installed packages instead.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[object.name="Context"][property.name="Tag"]',
          message: 'Use Context.Service for v4 beta service definitions.',
        },
        {
          selector: 'MemberExpression[object.name="Effect"][property.name=/^(asVoid|catchAllCause|ignore|serviceOption)$/]',
          message: 'This Effect member is banned by the harness guardrails; use the Effect-native safer pattern.',
        },
      ],
      'test/no-import-node-test': 'off',
    },
  },
  {
    name: 'effect-harness/effect-vitest-tests',
    files: ['tests/**/*.test.{js,mjs,ts}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'MemberExpression[object.name="Context"][property.name="Tag"]',
          message: 'Use Context.Service for v4 beta service definitions.',
        },
        {
          selector: 'MemberExpression[object.name="Effect"][property.name=/^(asVoid|catchAllCause|ignore|serviceOption)$/]',
          message: 'This Effect member is banned by the harness guardrails; use the Effect-native safer pattern.',
        },
        {
          selector: 'CallExpression[callee.name="it"]',
          message: 'Use it.effect, it.live, or layer from @effect/vitest for Effect harness tests.',
        },
      ],
    },
  },
)
