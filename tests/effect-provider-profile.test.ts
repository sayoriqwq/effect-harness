import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function record(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object')
  assert.notEqual(value, null)
  assert.equal(Array.isArray(value), false)
  return value as Record<string, unknown>
}

function languageServicePlugin(plugins: ReadonlyArray<unknown>): Record<string, unknown> {
  const plugin = plugins.find(value => record(value).name === '@effect/language-service')
  assert.notEqual(plugin, undefined)
  return record(plugin)
}

it.effect('provider profile exposes Effect source pin as provider-internal source entry', () => Effect.sync(() => {
  const profile = readJson(join(repoRoot, 'harness/provider/effect-harness.provider.json'))
  const sourceContract = readJson(join(repoRoot, 'repos/effect.subtree.json'))
  const providerRecord = record(profile.providerRecord)
  const requiredFields = providerRecord.requiredFields as ReadonlyArray<unknown>
  assert.ok(requiredFields.includes('artifact.sourceIdentity'))

  const profiles = record(profile.profiles)
  const codexProfile = record(profiles['codex-effect-v4'])
  assert.equal(codexProfile.sourceEntry, 'effect-official-source')

  const sourceEntries = record(profile.sourceEntries)
  const sourceEntry = record(sourceEntries['effect-official-source'])
  const contract = record(sourceEntry.contract)
  const subtree = record(sourceContract.subtree)
  assert.equal(sourceEntry.kind, 'provider-internal-github-subtree')
  assert.equal(contract.path, 'repos/effect.subtree.json')
  assert.equal(contract.owner, 'partita')
  assert.equal(contract.format, 'github-subtree')
  assert.equal(subtree.split, 'e11cccc7d5fe631abccc7d6e3bd296938de0fa2e')
  assert.equal('repository' in sourceEntry, false)
  assert.equal('branch' in sourceEntry, false)
  assert.equal('prefix' in sourceEntry, false)
  assert.equal('anchor' in sourceEntry, false)
  assert.equal('llmDocument' in sourceEntry, false)
  assert.equal('agentRoute' in sourceEntry, false)

  const sourceBoundary = record(codexProfile.sourceBoundary)
  assert.equal(sourceBoundary.providerRepoInternal, true)
  assert.equal(sourceBoundary.targetDelivery, 'identity-only')
  assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('repos/effect'))
  assert.ok((sourceBoundary.allowedTargetSourceIdentity as ReadonlyArray<unknown>).includes('artifact.sourceIdentity.contractPath'))
  assert.equal('officialSource' in codexProfile, false)
}))

it.effect('provider profile and repository tsconfig use the current effect-tsgo plugin shape', () => Effect.sync(() => {
  const profile = readJson(join(repoRoot, 'harness/provider/effect-harness.provider.json'))
  const tsconfig = readJson(join(repoRoot, 'tsconfig.json'))
  const codexProfile = record(record(profile.profiles)['codex-effect-v4'])
  const packageBaseline = record(codexProfile.packageBaseline)
  assert.equal(packageBaseline.effect, '4.0.0-beta.92')
  assert.equal(packageBaseline['@effect/platform-node'], '4.0.0-beta.92')
  assert.equal(packageBaseline['@effect/vitest'], '4.0.0-beta.92')
  assert.equal(packageBaseline['@effect/tsgo'], '0.15.0')
  assert.equal(packageBaseline['@effect/language-service'], '0.86.2')
  assert.equal(packageBaseline['@typescript/native-preview'], '7.0.0-dev.20260630.1')

  const contributions = record(codexProfile.contributions)
  const packageJson = record(contributions.packageJson)
  const scripts = record(packageJson.scripts)
  assert.equal(record(scripts.prepare).defaultCommand, 'effect-tsgo patch')
  assert.equal(record(scripts.typecheck).defaultCommand, 'tsgo --noEmit')

  const providerTsconfig = record(contributions.tsconfig)
  const providerCompilerOptions = record(providerTsconfig.compilerOptions)
  const providerPlugin = languageServicePlugin(providerCompilerOptions.plugins as ReadonlyArray<unknown>)
  assert.equal('options' in providerPlugin, false)
  assert.equal(providerPlugin.diagnostics, true)
  assert.equal(record(providerPlugin.diagnosticSeverity).floatingEffect, 'error')
  assert.equal(providerPlugin.ignoreEffectWarningsInTscExitCode, false)
  assert.equal(providerPlugin.ignoreEffectErrorsInTscExitCode, false)

  const compilerOptions = record(tsconfig.compilerOptions)
  const plugin = languageServicePlugin(compilerOptions.plugins as ReadonlyArray<unknown>)
  assert.equal('options' in plugin, false)
  assert.equal(plugin.diagnostics, true)
  assert.equal(record(plugin.diagnosticSeverity).floatingEffect, 'error')
  assert.equal(plugin.ignoreEffectWarningsInTscExitCode, false)
  assert.equal(plugin.ignoreEffectErrorsInTscExitCode, false)
}))

it.effect('provider profile declares target managed surfaces and editor policy options', () => Effect.sync(() => {
  const profile = readJson(join(repoRoot, 'harness/provider/effect-harness.provider.json'))
  const codexProfile = record(record(profile.profiles)['codex-effect-v4'])

  const managedSurfaces = record(codexProfile.managedSurfaces)
  const targetReceives = managedSurfaces.targetReceives as ReadonlyArray<string>
  assert.ok(targetReceives.some(surface => surface.includes('provider record')))
  assert.ok(targetReceives.some(surface => surface.includes('package.json')))
  assert.ok(targetReceives.some(surface => surface.includes('tsconfig.json')))
  assert.equal(targetReceives.some(surface => surface.includes('AGENTS.md managed block')), false)
  assert.equal(targetReceives.some(surface => surface.includes('runtime assets')), false)
  assert.equal(targetReceives.some(surface => surface.includes('feedback')), false)

  const targetDoesNotReceive = managedSurfaces.targetDoesNotReceive as ReadonlyArray<string>
  assert.ok(targetDoesNotReceive.includes('provider repo internal source pin repos/effect'))
  assert.ok(targetDoesNotReceive.includes('provider repo internal subtree contract repos/effect.subtree.json'))
  assert.ok(targetDoesNotReceive.includes('effect-harness runtime assets under .codex'))
  assert.ok(targetDoesNotReceive.includes('.effect-harness.json standalone manifest'))

  const contributions = record(codexProfile.contributions)
  assert.equal('codexAssets' in contributions, false)
  assert.equal('runtimeAssets' in contributions, false)
  assert.equal('agentsBlock' in contributions, false)

  const editorPolicy = record(record(codexProfile.options).editorPolicy)
  const autoImportExclude = record(editorPolicy.autoImportExclude)
  assert.equal(autoImportExclude.default, true)
  const vscodeAutoImport = record(autoImportExclude.vscode)
  assert.ok((vscodeAutoImport['typescript.preferences.autoImportFileExcludePatterns'] as ReadonlyArray<unknown>).includes('repos/**'))
  assert.ok((vscodeAutoImport['javascript.preferences.autoImportFileExcludePatterns'] as ReadonlyArray<unknown>).includes('repos/**'))

  const watchExclude = record(editorPolicy.watchExclude)
  assert.equal(watchExclude.default, 'recommended')
  assert.equal(watchExclude.requiresConfiguration, true)
  const zedWatchExclude = record(watchExclude.zed)
  assert.equal(zedWatchExclude.setting, 'file_scan_exclusions')
  assert.equal(zedWatchExclude.requiresExplicitOptIn, true)

  const filesExclude = record(editorPolicy.filesExclude)
  assert.equal(filesExclude.default, 'preference')
  assert.equal(filesExclude.requiresExplicitOptIn, true)
  assert.equal(record(filesExclude.zed).setting, 'file_scan_exclusions')
}))
