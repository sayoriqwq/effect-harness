import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ESLint } from 'eslint'

import effectHarnessEslintConfig from '../src/eslint.ts'

it.effect('publishes only the two pinned-reference boundaries', () =>
  Effect.promise(async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const [allowed] = await eslint.lintText(
      'export const options = { disableValidation: true }; export const legacy = Effect.catchAllCause\n',
      { filePath: 'src/target-policy.js' },
    )
    const [blocked] = await eslint.lintText(
      'import effectSource from \'repos/effect/src/Effect.ts\'; import tsgoSource from \'../repos/tsgo/internal/rules/index.ts\'; export { effectSource, tsgoSource }\n',
      { filePath: 'src/reference-imports.js' },
    )

    expect(allowed?.messages).toEqual([])
    expect(blocked?.messages.filter(message => message.ruleId === 'no-restricted-imports')).toHaveLength(2)
  }))
