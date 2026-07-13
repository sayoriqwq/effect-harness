import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { effectLanguageServicePlugin } from '../src/harness/Policy.ts'

const root = resolve(import.meta.dirname, '..')

it.effect('keeps the installed package graph on the accepted TS7 Effect baseline', () => Effect.sync(() => {
  expect(packageIdentity('effect')).toEqual({ name: 'effect', version: '4.0.0-beta.97' })
  expect(packageIdentity('@effect/platform-node')).toEqual({ name: '@effect/platform-node', version: '4.0.0-beta.97' })
  expect(packageIdentity('@effect/vitest')).toEqual({ name: '@effect/vitest', version: '4.0.0-beta.97' })
  expect(packageIdentity('@effect/tsgo')).toEqual({ name: '@effect/tsgo', version: '0.19.0' })
  expect(packageIdentity('typescript')).toEqual({ name: '@typescript/typescript6', version: '6.0.2' })
  expect(packageIdentity('@typescript/native')).toEqual({ name: 'typescript', version: '7.0.2' })
}))

it.effect('keeps self configuration equal to the exported canonical policy', () => Effect.sync(() => {
  const config = readJson('tsconfig.json') as {
    compilerOptions: { plugins: ReadonlyArray<{ name?: string }> }
  }
  const plugin = config.compilerOptions.plugins.find(candidate =>
    candidate.name === '@effect/language-service')

  expect(plugin).toEqual(effectLanguageServicePlugin)
}))

it.effect('covers every Effect v4 rule exposed by the pinned tsgo metadata', () => Effect.sync(() => {
  const metadata = readJson('repos/tsgo/_packages/tsgo/src/metadata.json') as {
    rules: ReadonlyArray<{
      name: string
      group: string
      defaultSeverity: string
      supportedEffect: ReadonlyArray<string>
    }>
  }
  const observed = Object.fromEntries(metadata.rules
    .filter(rule => rule.supportedEffect.includes('v4'))
    .map(rule => [rule.name, strictSeverity(rule)] as const)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0))

  expect(effectLanguageServicePlugin.diagnosticSeverity).toEqual(observed)
}))

function packageIdentity(packageName: string): { readonly name: string, readonly version: string } {
  const packageJson = readJson(`node_modules/${packageName}/package.json`) as {
    name: string
    version: string
  }
  return { name: packageJson.name, version: packageJson.version }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
}

function strictSeverity(rule: { readonly group: string, readonly defaultSeverity: string }): string {
  if (rule.group === 'correctness' && rule.defaultSeverity === 'off')
    return 'error'
  if (rule.group === 'effectNative')
    return 'warning'
  if ((rule.group === 'antipattern' || rule.group === 'style') && rule.defaultSeverity === 'off')
    return 'warning'
  return rule.defaultSeverity
}
