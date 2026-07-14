import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { acceptedEffectBaseline } from '../src/harness/Baseline.ts'
import {
  canonicalEffectTsgoPolicy,
  effectTsgoSelfProjection,
  effectTsgoTargetProjection,
} from '../src/harness/Policy.ts'

const root = resolve(import.meta.dirname, '..')

it.effect('keeps the installed package graph on the accepted TS7 Effect baseline', () => Effect.sync(() => {
  for (const entry of Object.values(acceptedEffectBaseline.packages)) {
    expect(packageIdentity(entry.packageName)).toEqual(entry.installedIdentity)
  }
}))

it.effect('self-hosts the verified source projection through tsconfig inheritance', () => Effect.sync(() => {
  const config = readJson('tsconfig.json') as { extends?: string, compilerOptions?: { plugins?: unknown } }
  const checkedInProjection = readJson('tsconfig.effect.json')

  expect(config.extends).toBe('./tsconfig.effect.json')
  expect(config.compilerOptions?.plugins).toBeUndefined()
  expect(checkedInProjection).toEqual(effectTsgoSelfProjection)
  expect(effectTsgoSelfProjection.compilerOptions.plugins).toEqual([canonicalEffectTsgoPolicy])
}))

it.effect('keeps self and Target projections semantically identical', () => Effect.sync(() => {
  const [selfPlugin] = effectTsgoSelfProjection.compilerOptions.plugins

  expect(selfPlugin).toEqual(canonicalEffectTsgoPolicy)
  expect(effectTsgoTargetProjection.languageServicePlugin).toEqual(canonicalEffectTsgoPolicy)
  expect(selfPlugin).toEqual(effectTsgoTargetProjection.languageServicePlugin)
}))

it.effect('ships immutable managed data as exact projections of Harness-owned authority', () => Effect.sync(() => {
  expect(readJson('artifact-assets/effect/managed/data/baseline.json')).toEqual(acceptedEffectBaseline)
  expect(readJson('artifact-assets/effect/managed/data/tsgo-policy.json')).toEqual(canonicalEffectTsgoPolicy)
}))

it.effect('routes managed Target guidance to the canonical data projection', () => Effect.sync(() => {
  const guidance = readFileSync(resolve(root, 'artifact-assets/effect/managed/docs/package-config.md'), 'utf8')
  const managedPolicy = readJson('artifact-assets/effect/managed/data/tsgo-policy.json')

  expect(guidance).toContain('../data/tsgo-policy.json')
  expect(managedPolicy).toEqual(canonicalEffectTsgoPolicy)
  expect(effectTsgoTargetProjection.languageServicePlugin).toMatchObject({
    diagnostics: true,
    includeSuggestionsInTsc: true,
    ignoreEffectSuggestionsInTscExitCode: false,
    ignoreEffectWarningsInTscExitCode: false,
    ignoreEffectErrorsInTscExitCode: false,
  })
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

  expect(canonicalEffectTsgoPolicy.diagnosticSeverity).toEqual(observed)
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
