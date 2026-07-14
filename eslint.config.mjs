import antfu from '@antfu/eslint-config'
import { sharedEffectEslintPolicy } from './src/harness/EslintPolicy.ts'

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
    files: ['bin/**/*.{js,mjs,ts}', 'src/**/*.{js,mjs,ts}', 'tests/**/*.{js,mjs,ts}'],
    rules: {
      'antfu/no-top-level-await': 'off',
      'no-restricted-imports': [
        'error',
        sharedEffectEslintPolicy.restrictedImports,
      ],
      'test/no-import-node-test': 'off',
    },
  },
)
