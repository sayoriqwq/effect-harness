import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import {
  acceptedEffectBaseline,
  effectHarnessBaselineSelfProjection,
} from '../src/harness/Baseline.ts'
import { pinnedReferenceOutputs } from '../src/harness/SourcePins.ts'

const root = resolve(import.meta.dirname, '..')

it.effect('models package roles, peer fallback, and optional platform semantics', () => Effect.sync(() => {
  expect(acceptedEffectBaseline.typescriptTopology).toEqual({
    primaryCompiler: 'nativeTypescript',
    effectSemanticAuthority: 'tsgo',
    compilerApiCompatibility: 'typescript',
  })
  expect(Object.fromEntries(Object.entries(acceptedEffectBaseline.packages).map(([key, entry]) => [key, entry.role]))).toEqual({
    effect: 'runtime',
    platformNode: 'optional-platform',
    effectVitest: 'effect-test-integration',
    tsgo: 'effect-compiler-patch',
    typescript: 'typescript-api',
    nativeTypescript: 'native-compiler',
  })
  expect(acceptedEffectBaseline.packages.effect.target).toEqual({
    presence: 'required',
    defaultSection: 'dependencies',
    peerFallbackSection: 'devDependencies',
  })
  expect(acceptedEffectBaseline.packages.platformNode.target).toEqual({
    presence: 'declared-or-manifest-unavailable',
    defaultSection: 'dependencies',
    peerFallbackSection: 'devDependencies',
  })

  for (const packageKey of ['effectVitest', 'tsgo', 'typescript', 'nativeTypescript'] as const) {
    expect(acceptedEffectBaseline.packages[packageKey].target).toEqual({
      presence: 'required',
      defaultSection: 'devDependencies',
      peerFallbackSection: 'devDependencies',
    })
  }
}))

it.effect('verifies local manifest and catalog projections against the source baseline', () => Effect.sync(() => {
  const manifest = readJson('package.json') as {
    dependencies?: Readonly<Record<string, string>>
    devDependencies?: Readonly<Record<string, string>>
  }
  const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')

  for (const section of ['dependencies', 'devDependencies'] as const) {
    const oppositeSection = section === 'dependencies' ? 'devDependencies' : 'dependencies'
    for (const packageKey of effectHarnessBaselineSelfProjection[section]) {
      const entry = acceptedEffectBaseline.packages[packageKey]
      expect(manifest[section]?.[entry.packageName]).toBe('catalog:')
      expect(manifest[oppositeSection]?.[entry.packageName]).toBeUndefined()
    }
  }

  for (const entry of Object.values(acceptedEffectBaseline.packages)) {
    expect(workspace).toMatch(new RegExp(`^  ['"]?${escapeRegExp(entry.packageName)}['"]?: ${escapeRegExp(entry.range)}$`, 'm'))
  }

  const effectVersion = acceptedEffectBaseline.versions.effect
  const tsgoVersion = acceptedEffectBaseline.versions.tsgo
  const typescriptVersion = acceptedEffectBaseline.versions.typescript
  const nativeTypescriptVersion = acceptedEffectBaseline.versions.nativeTypescript
  const projectedVersionLines = workspace.split('\n').filter(line =>
    line.includes(effectVersion)
    || line.includes(tsgoVersion)
    || line.includes(`@${typescriptVersion}`)
    || line.includes(`@${nativeTypescriptVersion}`))

  expect(projectedVersionLines).toEqual([
    `  - '@effect/platform-node@${effectVersion}'`,
    `  - '@effect/platform-node-shared@${effectVersion}'`,
    `  - '@effect/vitest@${effectVersion}'`,
    `  - effect@${effectVersion}`,
    `  '@effect/platform-node-shared': ${effectVersion}`,
    `  '@effect/platform-node': ${effectVersion}`,
    `  '@effect/tsgo': ${tsgoVersion}`,
    `  '@effect/vitest': ${effectVersion}`,
    `  '@typescript/native': npm:typescript@${nativeTypescriptVersion}`,
    `  effect: ${effectVersion}`,
    `  typescript: npm:@typescript/typescript6@${typescriptVersion}`,
  ])
}))

it.effect('connects Effect and tsgo Source Pins to baseline package identities', () => Effect.sync(() => {
  for (const [pinKey, pin] of Object.entries(acceptedEffectBaseline.sourcePins)) {
    const output = pinnedReferenceOutputs.find(candidate => candidate.id === pin.outputId)

    expect(output?.locator).toEqual({ root: 'IntegrationWorkspace', path: pin.targetPath })
    expect(output?.provenance.sourceUrl).toBe(pin.sourceUrl)
    expect(Object.values(acceptedEffectBaseline.packages).filter(entry => entry.sourcePin === pinKey)).not.toHaveLength(0)
  }
}))

it.effect('keeps managed baseline guidance as a verified projection', () => Effect.sync(() => {
  const guidance = readFileSync(resolve(root, 'artifact-assets/effect/managed/docs/effect-code.md'), 'utf8')

  for (const entry of Object.values(acceptedEffectBaseline.packages)) {
    expect(guidance).toContain(
      `| \`${entry.role}\` | \`${entry.packageName}\` | \`${entry.range}\` | \`${entry.target.presence}\` | \`${entry.target.defaultSection}\` | \`${entry.target.peerFallbackSection}\` |`,
    )
  }
  expect(guidance).toContain('peer-only libraries')
  expect(guidance).toContain('optional platform')
}))

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
