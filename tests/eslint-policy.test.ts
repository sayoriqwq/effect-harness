import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ESLint } from 'eslint'

import effectHarnessEslintConfig from '../src/eslint.ts'
import { sharedEffectEslintPolicy } from '../src/harness/EslintPolicy.ts'

const artifactRoot = fileURLToPath(new URL('..', import.meta.url))

it.effect('self-hosts the canonical policy directly from source', () => Effect.sync(() => {
  const rootConfig = readFileSync(new URL('../eslint.config.mjs', import.meta.url), 'utf8')

  expect(rootConfig).toContain('./src/harness/EslintPolicy.ts')
  expect(rootConfig).not.toMatch(/from\s+['"][^'"]*dist/gu)
}))

it.effect('applies canonical shared Effect guardrails in Target and self adapters', () =>
  Effect.promise(async () => {
    const target = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const self = new ESLint({ cwd: artifactRoot })
    const source = 'export const legacy = Context.Tag\n'

    const [targetResult] = await target.lintText(source, { filePath: 'tests/shared.test.js' })
    const [selfResult] = await self.lintText(source, { filePath: 'tests/shared.test.js' })
    const targetRestrictions = targetResult?.messages.filter(message => message.ruleId === 'no-restricted-syntax')
    const selfRestrictions = selfResult?.messages.filter(message => message.ruleId === 'no-restricted-syntax')

    expect(targetRestrictions).toHaveLength(1)
    expect(selfRestrictions).toEqual(targetRestrictions)
    expect(sharedEffectEslintPolicy.restrictedSyntax).toHaveLength(2)
  }))

it.effect('scopes canonical Effect test imports identically in Target and self adapters', () =>
  Effect.promise(async () => {
    const target = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const self = new ESLint({ cwd: artifactRoot })
    const source = 'import { describe } from \'vitest\'\nexport { describe }\n'

    for (const filePath of ['tests/helper.js', 'tests/helper.test.js']) {
      const [targetResult] = await target.lintText(source, { filePath })
      const [selfResult] = await self.lintText(source, { filePath })
      const targetRestrictions = targetResult?.messages.filter(message => message.ruleId === 'no-restricted-imports')
      const selfRestrictions = selfResult?.messages.filter(message => message.ruleId === 'no-restricted-imports')

      expect(selfRestrictions).toEqual(targetRestrictions)
      expect(targetRestrictions).toHaveLength(filePath.endsWith('.test.js') ? 1 : 0)
    }
  }))

it.effect('allows Effect.ignore in Target and self adapters under tsgo authority', () =>
  Effect.promise(async () => {
    const target = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const self = new ESLint({ cwd: artifactRoot })
    const source = 'export const ignored = Effect.ignore\n'

    const [targetResult] = await target.lintText(source, { filePath: 'tests/ignore.test.js' })
    const [selfResult] = await self.lintText(source, { filePath: 'tests/ignore.test.js' })

    expect(targetResult?.messages.filter(message => message.ruleId === 'no-restricted-syntax')).toEqual([])
    expect(selfResult?.messages.filter(message => message.ruleId === 'no-restricted-syntax')).toEqual([])
    expect(sharedEffectEslintPolicy.restrictedSyntax.every(rule => !rule.selector.includes('ignore'))).toBe(true)
  }))

it.effect('rejects disabled Schema validation identically in Target and self adapters', () =>
  Effect.promise(async () => {
    const target = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const self = new ESLint({ cwd: artifactRoot })
    const source = 'export const options = { disableValidation: true }\n'

    const [targetResult] = await target.lintText(source, { filePath: 'tests/schema.test.js' })
    const [selfResult] = await self.lintText(source, { filePath: 'tests/schema.test.js' })

    const targetRestrictions = targetResult?.messages.filter(message => message.ruleId === 'effect-harness/no-disable-validation')
    const selfRestrictions = selfResult?.messages.filter(message => message.ruleId === 'effect-harness/no-disable-validation')

    expect(targetRestrictions).toHaveLength(1)
    expect(selfRestrictions).toEqual(targetRestrictions)
    expect(sharedEffectEslintPolicy.rules).toEqual({
      'effect-harness/no-disable-validation': 'error',
    })
  }))
