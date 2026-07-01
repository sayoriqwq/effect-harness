import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { assert, it } from '@effect/vitest'
import { Effect, FileSystem, Path, Schema } from 'effect'

const currentFile = fileURLToPath(import.meta.url)

const repoRoot = Effect.fnUntraced(function* () {
  const path = yield* Path.Path
  return path.resolve(path.dirname(currentFile), '..')
})

const readJson = Effect.fnUntraced(function* (relativePath: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* repoRoot()
  const text = yield* fs.readFileString(path.join(root, relativePath))
  return yield* Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(text)
})

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

it.layer(NodeServices.layer)((it) => {
  it.effect('provider profile exposes provider-internal source entries', () => Effect.gen(function* () {
    const profile = record(yield* readJson('harness/provider/effect-harness.provider.json'))
    const effectContract = record(yield* readJson('repos/effect.subtree.json'))
    const tsgoContract = record(yield* readJson('repos/tsgo.subtree.json'))
    const providerRecord = record(profile.providerRecord)
    const requiredFields = providerRecord.requiredFields as ReadonlyArray<unknown>
    assert.ok(requiredFields.includes('artifact.sourceIdentity'))
    assert.ok(requiredFields.includes('artifact.sourceIdentities'))

    const profiles = record(profile.profiles)
    const codexProfile = record(profiles['codex-effect-v4'])
    assert.equal(codexProfile.sourceEntry, 'effect-official-source')
    assert.ok((codexProfile.sourceEntries as ReadonlyArray<unknown>).includes('tsgo-official-source'))

    const sourceEntries = record(profile.sourceEntries)
    const effectSourceEntry = record(sourceEntries['effect-official-source'])
    const effectEntryContract = record(effectSourceEntry.contract)
    assert.equal(effectSourceEntry.kind, 'provider-internal-github-subtree')
    assert.equal(effectEntryContract.path, 'repos/effect.subtree.json')
    assert.equal(record(effectContract.subtree).split, 'e11cccc7d5fe631abccc7d6e3bd296938de0fa2e')
    assert.equal('repository' in effectSourceEntry, false)
    assert.equal('branch' in effectSourceEntry, false)
    assert.equal('prefix' in effectSourceEntry, false)
    assert.equal('anchor' in effectSourceEntry, false)
    assert.equal('llmDocument' in effectSourceEntry, false)
    assert.equal('agentRoute' in effectSourceEntry, false)

    const tsgoSourceEntry = record(sourceEntries['tsgo-official-source'])
    const tsgoEntryContract = record(tsgoSourceEntry.contract)
    assert.equal(tsgoSourceEntry.kind, 'provider-internal-github-subtree')
    assert.equal(tsgoEntryContract.path, 'repos/tsgo.subtree.json')
    assert.equal(record(tsgoContract.subtree).split, '43ed476270fb3cf78fe7afac2086d67340ca0486')

    const sourceBoundary = record(codexProfile.sourceBoundary)
    assert.equal(sourceBoundary.providerRepoInternal, true)
    assert.equal(sourceBoundary.targetDelivery, 'identity-only')
    assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('repos/effect'))
    assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('repos/tsgo'))
    assert.ok((sourceBoundary.allowedTargetSourceIdentity as ReadonlyArray<unknown>).includes('artifact.sourceIdentities[].contractPath'))
    assert.equal('officialSource' in codexProfile, false)
  }))

  it.effect('provider profile and repository tsconfig use strict tsgo policy', () => Effect.gen(function* () {
    const profile = record(yield* readJson('harness/provider/effect-harness.provider.json'))
    const tsconfig = record(yield* readJson('tsconfig.json'))
    const codexProfile = record(record(profile.profiles)['codex-effect-v4'])
    const packageBaseline = record(codexProfile.packageBaseline)
    assert.equal(packageBaseline.effect, '4.0.0-beta.92')
    assert.equal(packageBaseline['@effect/platform-node'], '4.0.0-beta.92')
    assert.equal(packageBaseline['@effect/vitest'], '4.0.0-beta.92')
    assert.equal(packageBaseline['@effect/tsgo'], '0.15.0')
    assert.equal(packageBaseline['@effect/language-service'], '0.86.2')
    assert.equal(packageBaseline['@typescript/native-preview'], '7.0.0-dev.20260630.1')

    const tsgoPolicy = record(codexProfile.tsgoPolicy)
    assert.equal(tsgoPolicy.mode, 'strict-v4')
    assert.equal(tsgoPolicy.sourceEntry, 'tsgo-official-source')
    assert.equal(record(tsgoPolicy.ruleMapSource).ruleCount, 76)

    const contributions = record(codexProfile.contributions)
    const packageJson = record(contributions.packageJson)
    const scripts = record(packageJson.scripts)
    assert.equal(record(scripts.prepare).defaultCommand, 'effect-tsgo patch')
    assert.equal(record(scripts.typecheck).defaultCommand, 'tsgo --noEmit')

    const providerTsconfig = record(contributions.tsconfig)
    const providerCompilerOptions = record(providerTsconfig.compilerOptions)
    const providerPlugin = languageServicePlugin(providerCompilerOptions.plugins as ReadonlyArray<unknown>)
    assert.equal('options' in providerPlugin, false)
    assert.equal('overrides' in providerPlugin, false)
    assert.equal(providerPlugin.diagnostics, true)
    assert.equal(providerPlugin.includeSuggestionsInTsc, true)
    assert.equal(providerPlugin.ignoreEffectSuggestionsInTscExitCode, false)
    assert.equal(providerPlugin.ignoreEffectWarningsInTscExitCode, false)
    assert.equal(providerPlugin.ignoreEffectErrorsInTscExitCode, false)
    assert.equal(record(providerPlugin.diagnosticSeverity).floatingEffect, 'error')
    assert.equal(record(providerPlugin.diagnosticSeverity).asyncFunction, 'warning')
    assert.equal(record(providerPlugin.diagnosticSeverity).catchToOrElseSucceed, 'suggestion')

    const compilerOptions = record(tsconfig.compilerOptions)
    const plugin = languageServicePlugin(compilerOptions.plugins as ReadonlyArray<unknown>)
    assert.deepStrictEqual(plugin, providerPlugin)
  }))

  it.effect('provider profile declares target managed surfaces and editor policy options', () => Effect.gen(function* () {
    const profile = record(yield* readJson('harness/provider/effect-harness.provider.json'))
    const codexProfile = record(record(profile.profiles)['codex-effect-v4'])

    const managedSurfaces = record(codexProfile.managedSurfaces)
    const targetReceives = managedSurfaces.targetReceives as ReadonlyArray<string>
    assert.ok(targetReceives.some(surface => surface.includes('provider record')))
    assert.ok(targetReceives.some(surface => surface.includes('package.json')))
    assert.ok(targetReceives.some(surface => surface.includes('tsconfig.json')))
    assert.ok(targetReceives.some(surface => surface.includes('documentation bundle')))
    assert.equal(targetReceives.some(surface => surface.includes('AGENTS.md managed block')), false)
    assert.equal(targetReceives.some(surface => surface.includes('runtime assets')), false)
    assert.equal(targetReceives.some(surface => surface.includes('feedback')), false)

    const targetDoesNotReceive = managedSurfaces.targetDoesNotReceive as ReadonlyArray<string>
    assert.ok(targetDoesNotReceive.includes('provider repo internal source pin repos/effect'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal subtree contract repos/effect.subtree.json'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal source pin repos/tsgo'))
    assert.ok(targetDoesNotReceive.includes('provider repo internal subtree contract repos/tsgo.subtree.json'))
    assert.ok(targetDoesNotReceive.includes('effect-harness runtime assets under .codex'))
    assert.ok(targetDoesNotReceive.includes('.effect-harness.json standalone manifest'))

    const contributions = record(codexProfile.contributions)
    assert.equal('codexAssets' in contributions, false)
    assert.equal('runtimeAssets' in contributions, false)
    assert.equal('agentsBlock' in contributions, false)

    const documentationBundle = record(contributions.documentationBundle)
    assert.equal(documentationBundle.targetRoot, '.prelude/providers/effect-harness/docs')
    assert.equal(documentationBundle.mode, 'copy-provider-documents')
    const documents = documentationBundle.documents as ReadonlyArray<unknown>
    assert.ok(documents.some(document => record(document).sourcePath === 'HARNESS.md'))
    assert.ok(documents.some(document => record(document).sourcePath === 'harness/provider/index.md'))
    assert.ok(documents.some(document => record(document).sourcePath === 'harness/tsgo.md'))

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
})
