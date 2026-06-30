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

it.effect('provider profile exposes Effect source pin as provider-internal source entry', () => Effect.sync(() => {
  const profile = readJson(join(repoRoot, 'harness/provider/effect-harness.provider.json'))
  const sourceManifest = readJson(join(repoRoot, 'repos/effect.subtree.json'))
  const providerRecord = record(profile.providerRecord)
  const requiredFields = providerRecord.requiredFields as ReadonlyArray<unknown>
  assert.ok(requiredFields.includes('artifact.sourceIdentity'))

  const profiles = record(profile.profiles)
  const codexProfile = record(profiles['codex-effect-v4'])
  assert.equal(codexProfile.sourceEntry, 'effect-official-source')

  const sourceEntries = record(profile.sourceEntries)
  const sourceEntry = record(sourceEntries['effect-official-source'])
  const anchor = record(sourceEntry.anchor)
  assert.equal(sourceEntry.kind, 'provider-internal-source-entry')
  assert.equal(sourceEntry.prefix, 'repos/effect')
  assert.equal(anchor.manifest, 'repos/effect.subtree.json')
  assert.equal(anchor.field, 'split')
  assert.equal(anchor.value, sourceManifest.split)

  const sourceBoundary = record(codexProfile.sourceBoundary)
  assert.equal(sourceBoundary.providerRepoInternal, true)
  assert.equal(sourceBoundary.targetDelivery, 'identity-only')
  assert.ok((sourceBoundary.targetMustNotReceive as ReadonlyArray<unknown>).includes('repos/effect'))
  assert.ok((sourceBoundary.allowedTargetSourceIdentity as ReadonlyArray<unknown>).includes('artifact.sourceIdentity.anchor'))
  assert.equal('officialSource' in codexProfile, false)
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
