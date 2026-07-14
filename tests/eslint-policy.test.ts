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

it.effect('contains only the two pinned-reference import boundaries', () => Effect.sync(() => {
  expect(sharedEffectEslintPolicy).toEqual({
    restrictedImports: {
      patterns: [
        {
          group: ['repos/effect/**', '**/repos/effect/**'],
          message: 'Import installed packages, never pinned Effect reference trees.',
        },
        {
          group: ['repos/tsgo/**', '**/repos/tsgo/**'],
          message: 'Use tsgo through its installed package, never its pinned reference tree.',
        },
      ],
    },
  })
}))

it.effect('preserves both boundaries through Target, self, and test-file composition', () =>
  Effect.promise(async () => {
    const target = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const self = new ESLint({ cwd: artifactRoot })
    const source = [
      'import effectSource from \'../repos/effect/packages/effect/src/Effect.ts\'',
      'import tsgoSource from \'repos/tsgo/internal/rules/index.ts\'',
      'export { effectSource, tsgoSource }',
      '',
    ].join('\n')

    for (const filePath of ['src/shared.js', 'tests/shared.test.js']) {
      const [targetResult] = await target.lintText(source, { filePath })
      const [selfResult] = await self.lintText(source, { filePath })
      const targetRestrictions = targetResult?.messages.filter(message => message.ruleId === 'no-restricted-imports')
      const selfRestrictions = selfResult?.messages.filter(message => message.ruleId === 'no-restricted-imports')

      expect(targetRestrictions).toHaveLength(2)
      expect(selfRestrictions).toEqual(targetRestrictions)
    }
  }), 20_000)

it.effect('leaves Effect semantics, packages, and test style to tsgo and Target policy', () =>
  Effect.promise(async () => {
    const target = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const self = new ESLint({ cwd: artifactRoot })
    const source = [
      'import { test } from \'node:test\'',
      'import { Command } from \'@effect/cli\'',
      'import { describe, it } from \'vitest\'',
      'export const legacy = Context.Tag',
      'export const cause = Effect.catchAllCause',
      'export const service = Effect.serviceOption',
      'export const options = { disableValidation: true }',
      'export { Command, describe, it, test }',
      '',
    ].join('\n')

    const [targetResult] = await target.lintText(source, { filePath: 'tests/user-policy.test.js' })
    const [selfResult] = await self.lintText(source, { filePath: 'tests/user-policy.test.js' })
    const harnessRule = (ruleId: string | null) =>
      ruleId === 'no-restricted-imports'
      || ruleId === 'no-restricted-syntax'
      || ruleId?.startsWith('effect-harness/') === true

    expect(targetResult?.messages.filter(message => harnessRule(message.ruleId))).toEqual([])
    expect(selfResult?.messages.filter(message => harnessRule(message.ruleId))).toEqual([])
  }), 20_000)
