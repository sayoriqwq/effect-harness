import antfu from '@antfu/eslint-config'
import {
  effectHarnessEslintPlugin,
  effectTestEslintPolicy,
  sharedEffectEslintPolicy,
} from './src/harness/EslintPolicy.ts'

export default antfu(
  {
    ignores: [
      'docs/**',
      'fixture/**',
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
    plugins: {
      'effect-harness': effectHarnessEslintPlugin,
    },
    rules: {
      'antfu/no-top-level-await': 'off',
      ...sharedEffectEslintPolicy.rules,
      'no-restricted-imports': [
        'error',
        {
          paths: sharedEffectEslintPolicy.restrictedImports.paths,
          patterns: sharedEffectEslintPolicy.restrictedImports.patterns,
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...sharedEffectEslintPolicy.restrictedSyntax,
      ],
      'test/no-import-node-test': 'off',
    },
  },
  {
    name: 'effect-harness/effect-vitest-tests',
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
)
