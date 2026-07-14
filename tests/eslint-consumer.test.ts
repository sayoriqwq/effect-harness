import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ESLint } from 'eslint'

import effectHarnessEslintConfig from '../src/eslint.ts'

it.effect('does not contradict the supported Effect.ignore tsgo rewrite', () =>
  Effect.promise(async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const [result] = await eslint.lintText(
      'import { Effect } from \'effect\'\nexport const ignored = Effect.ignore\n',
      { filePath: 'src/ignore.js' },
    )

    expect(result?.messages).toEqual([])
  }))
