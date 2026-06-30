import * as Effect from 'effect/Effect'
import { readJson } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { isRecord } from './JsonFields.ts'

function decodeJsonRecord(value: unknown, source: string): Effect.Effect<Record<string, unknown>, HarnessError> {
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be a JSON object` }))
}

function recordField(
  errors: Array<string>,
  record: Record<string, unknown> | undefined,
  key: string,
  source: string,
): Record<string, unknown> | undefined {
  if (record === undefined) {
    return undefined
  }
  const value = record[key]
  if (!isRecord(value)) {
    errors.push(`${source}.${key} must be an object.`)
    return undefined
  }
  return value
}

function stringField(
  errors: Array<string>,
  record: Record<string, unknown> | undefined,
  key: string,
  source: string,
): string | undefined {
  if (record === undefined) {
    return undefined
  }
  const value = record[key]
  if (typeof value !== 'string') {
    errors.push(`${source}.${key} must be a string.`)
    return undefined
  }
  return value
}

function booleanField(
  errors: Array<string>,
  record: Record<string, unknown> | undefined,
  key: string,
  source: string,
): boolean | undefined {
  if (record === undefined) {
    return undefined
  }
  const value = record[key]
  if (typeof value !== 'boolean') {
    errors.push(`${source}.${key} must be a boolean.`)
    return undefined
  }
  return value
}

function arrayField(
  errors: Array<string>,
  record: Record<string, unknown> | undefined,
  key: string,
  source: string,
): ReadonlyArray<unknown> | undefined {
  if (record === undefined) {
    return undefined
  }
  const value = record[key]
  if (!Array.isArray(value)) {
    errors.push(`${source}.${key} must be an array.`)
    return undefined
  }
  return value
}

function assertStringValue(errors: Array<string>, actual: string | undefined, expected: string, source: string): void {
  if (actual !== undefined && actual !== expected) {
    errors.push(`${source} is ${actual}; expected ${expected}.`)
  }
}

function assertBooleanValue(errors: Array<string>, actual: boolean | undefined, expected: boolean, source: string): void {
  if (actual !== undefined && actual !== expected) {
    errors.push(`${source} is ${String(actual)}; expected ${String(expected)}.`)
  }
}

function assertArrayContainsString(
  errors: Array<string>,
  values: ReadonlyArray<unknown> | undefined,
  expected: string,
  source: string,
): void {
  if (values !== undefined && !values.includes(expected)) {
    errors.push(`${source} must include ${expected}.`)
  }
}

function assertArrayDoesNotContainText(
  errors: Array<string>,
  values: ReadonlyArray<unknown> | undefined,
  text: string,
  source: string,
): void {
  if (values?.some(value => typeof value === 'string' && value.includes(text))) {
    errors.push(`${source} must not include legacy text containing ${text}.`)
  }
}

function assertRecordDoesNotContain(
  errors: Array<string>,
  record: Record<string, unknown> | undefined,
  key: string,
  source: string,
): void {
  if (record !== undefined && key in record) {
    errors.push(`${source} must not contain legacy field ${key}.`)
  }
}

function assertPackageBaseline(
  errors: Array<string>,
  manifestBaseline: Record<string, unknown> | undefined,
  profileBaseline: Record<string, unknown> | undefined,
): void {
  if (manifestBaseline === undefined || profileBaseline === undefined) {
    return
  }

  for (const [name, expected] of Object.entries(manifestBaseline)) {
    if (typeof expected !== 'string') {
      errors.push(`repos/effect.subtree.json.packageBaseline.${name} must be a string.`)
      continue
    }
    const actual = profileBaseline[name]
    if (actual !== expected) {
      errors.push(`provider profile packageBaseline.${name} is ${String(actual ?? 'missing')}; expected ${expected}.`)
    }
  }
}

function assertEditorPolicy(errors: Array<string>, options: Record<string, unknown> | undefined): void {
  const editorPolicy = recordField(errors, options, 'editorPolicy', 'profile.options')
  const autoImport = recordField(errors, editorPolicy, 'autoImportExclude', 'profile.options.editorPolicy')
  assertBooleanValue(errors, booleanField(errors, autoImport, 'default', 'profile.options.editorPolicy.autoImportExclude'), true, 'profile.options.editorPolicy.autoImportExclude.default')

  const vscodeAutoImport = recordField(errors, autoImport, 'vscode', 'profile.options.editorPolicy.autoImportExclude')
  assertArrayContainsString(errors, arrayField(errors, vscodeAutoImport, 'typescript.preferences.autoImportFileExcludePatterns', 'profile.options.editorPolicy.autoImportExclude.vscode'), 'repos/**', 'profile.options.editorPolicy.autoImportExclude.vscode.typescript.preferences.autoImportFileExcludePatterns')
  assertArrayContainsString(errors, arrayField(errors, vscodeAutoImport, 'javascript.preferences.autoImportFileExcludePatterns', 'profile.options.editorPolicy.autoImportExclude.vscode'), 'repos/**', 'profile.options.editorPolicy.autoImportExclude.vscode.javascript.preferences.autoImportFileExcludePatterns')

  const zedAutoImport = recordField(errors, autoImport, 'zed', 'profile.options.editorPolicy.autoImportExclude')
  assertStringValue(errors, stringField(errors, zedAutoImport, 'settingsPath', 'profile.options.editorPolicy.autoImportExclude.zed'), '.zed/settings.json', 'profile.options.editorPolicy.autoImportExclude.zed.settingsPath')
  if (recordField(errors, zedAutoImport, 'lsp', 'profile.options.editorPolicy.autoImportExclude.zed') === undefined) {
    errors.push('profile.options.editorPolicy.autoImportExclude.zed must use a Zed-specific lsp settings shape.')
  }

  const watchExclude = recordField(errors, editorPolicy, 'watchExclude', 'profile.options.editorPolicy')
  assertStringValue(errors, stringField(errors, watchExclude, 'default', 'profile.options.editorPolicy.watchExclude'), 'recommended', 'profile.options.editorPolicy.watchExclude.default')
  assertBooleanValue(errors, booleanField(errors, watchExclude, 'requiresConfiguration', 'profile.options.editorPolicy.watchExclude'), true, 'profile.options.editorPolicy.watchExclude.requiresConfiguration')
  const vscodeWatch = recordField(errors, watchExclude, 'vscode', 'profile.options.editorPolicy.watchExclude')
  const vscodeWatcherExclude = recordField(errors, vscodeWatch, 'files.watcherExclude', 'profile.options.editorPolicy.watchExclude.vscode')
  assertBooleanValue(errors, booleanField(errors, vscodeWatcherExclude, 'repos/**', 'profile.options.editorPolicy.watchExclude.vscode.files.watcherExclude'), true, 'profile.options.editorPolicy.watchExclude.vscode.files.watcherExclude["repos/**"]')
  const zedWatch = recordField(errors, watchExclude, 'zed', 'profile.options.editorPolicy.watchExclude')
  assertStringValue(errors, stringField(errors, zedWatch, 'setting', 'profile.options.editorPolicy.watchExclude.zed'), 'file_scan_exclusions', 'profile.options.editorPolicy.watchExclude.zed.setting')
  assertBooleanValue(errors, booleanField(errors, zedWatch, 'requiresExplicitOptIn', 'profile.options.editorPolicy.watchExclude.zed'), true, 'profile.options.editorPolicy.watchExclude.zed.requiresExplicitOptIn')
  assertArrayContainsString(errors, arrayField(errors, zedWatch, 'patterns', 'profile.options.editorPolicy.watchExclude.zed'), 'repos/**', 'profile.options.editorPolicy.watchExclude.zed.patterns')

  const filesExclude = recordField(errors, editorPolicy, 'filesExclude', 'profile.options.editorPolicy')
  assertStringValue(errors, stringField(errors, filesExclude, 'default', 'profile.options.editorPolicy.filesExclude'), 'preference', 'profile.options.editorPolicy.filesExclude.default')
  assertBooleanValue(errors, booleanField(errors, filesExclude, 'requiresExplicitOptIn', 'profile.options.editorPolicy.filesExclude'), true, 'profile.options.editorPolicy.filesExclude.requiresExplicitOptIn')
}

export const verifyProviderProfileContract = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const providerProfile = yield* readJson(`${harness}/harness/provider/effect-harness.provider.json`, decodeJsonRecord)
  const sourceManifest = yield* readJson(`${harness}/repos/effect.subtree.json`, decodeJsonRecord)

  const provider = recordField(errors, providerProfile, 'provider', 'provider profile')
  assertStringValue(errors, stringField(errors, provider, 'id', 'provider profile.provider'), 'effect-harness', 'provider profile.provider.id')
  assertStringValue(errors, stringField(errors, provider, 'defaultProfile', 'provider profile.provider'), 'codex-effect-v4', 'provider profile.provider.defaultProfile')

  const sourceEntries = recordField(errors, providerProfile, 'sourceEntries', 'provider profile')
  const profiles = recordField(errors, providerProfile, 'profiles', 'provider profile')
  const profile = recordField(errors, profiles, 'codex-effect-v4', 'provider profile.profiles')
  const sourceEntryId = stringField(errors, profile, 'sourceEntry', 'provider profile.profiles.codex-effect-v4')
  assertStringValue(errors, sourceEntryId, 'effect-official-source', 'provider profile.profiles.codex-effect-v4.sourceEntry')

  const sourceEntry = sourceEntryId === undefined
    ? undefined
    : recordField(errors, sourceEntries, sourceEntryId, 'provider profile.sourceEntries')
  assertStringValue(errors, stringField(errors, sourceEntry, 'kind', 'provider profile.sourceEntries.effect-official-source'), 'provider-internal-source-entry', 'provider profile.sourceEntries.effect-official-source.kind')
  assertStringValue(errors, stringField(errors, sourceEntry, 'prefix', 'provider profile.sourceEntries.effect-official-source'), 'repos/effect', 'provider profile.sourceEntries.effect-official-source.prefix')
  assertStringValue(errors, stringField(errors, sourceEntry, 'llmDocument', 'provider profile.sourceEntries.effect-official-source'), 'repos/effect/LLMS.md', 'provider profile.sourceEntries.effect-official-source.llmDocument')
  assertStringValue(errors, stringField(errors, sourceEntry, 'agentRoute', 'provider profile.sourceEntries.effect-official-source'), 'harness/effect-routes.md', 'provider profile.sourceEntries.effect-official-source.agentRoute')

  const anchor = recordField(errors, sourceEntry, 'anchor', 'provider profile.sourceEntries.effect-official-source')
  assertStringValue(errors, stringField(errors, anchor, 'manifest', 'provider profile.sourceEntries.effect-official-source.anchor'), 'repos/effect.subtree.json', 'provider profile.sourceEntries.effect-official-source.anchor.manifest')
  assertStringValue(errors, stringField(errors, anchor, 'field', 'provider profile.sourceEntries.effect-official-source.anchor'), 'split', 'provider profile.sourceEntries.effect-official-source.anchor.field')
  assertStringValue(errors, stringField(errors, anchor, 'value', 'provider profile.sourceEntries.effect-official-source.anchor'), stringField(errors, sourceManifest, 'split', 'repos/effect.subtree.json') ?? '', 'provider profile.sourceEntries.effect-official-source.anchor.value')

  const providerRecord = recordField(errors, providerProfile, 'providerRecord', 'provider profile')
  const sourceDelivery = recordField(errors, providerRecord, 'sourceDelivery', 'provider profile.providerRecord')
  assertStringValue(errors, stringField(errors, sourceDelivery, 'mode', 'provider profile.providerRecord.sourceDelivery'), 'artifact-identity-only', 'provider profile.providerRecord.sourceDelivery.mode')
  assertArrayContainsString(errors, arrayField(errors, providerRecord, 'requiredFields', 'provider profile.providerRecord'), 'artifact.sourceIdentity', 'provider profile.providerRecord.requiredFields')

  const sourceBoundary = recordField(errors, profile, 'sourceBoundary', 'provider profile.profiles.codex-effect-v4')
  assertBooleanValue(errors, booleanField(errors, sourceBoundary, 'providerRepoInternal', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), true, 'provider profile.profiles.codex-effect-v4.sourceBoundary.providerRepoInternal')
  assertStringValue(errors, stringField(errors, sourceBoundary, 'targetDelivery', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'identity-only', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetDelivery')
  assertArrayContainsString(errors, arrayField(errors, sourceBoundary, 'targetMustNotReceive', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'repos/effect', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetMustNotReceive')

  const options = recordField(errors, profile, 'options', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, options, 'runtime', 'provider profile.profiles.codex-effect-v4.options')
  assertEditorPolicy(errors, options)

  assertPackageBaseline(errors, recordField(errors, sourceManifest, 'packageBaseline', 'repos/effect.subtree.json'), recordField(errors, profile, 'packageBaseline', 'provider profile.profiles.codex-effect-v4'))

  const managedSurfaces = recordField(errors, profile, 'managedSurfaces', 'provider profile.profiles.codex-effect-v4')
  const targetReceives = arrayField(errors, managedSurfaces, 'targetReceives', 'provider profile.profiles.codex-effect-v4.managedSurfaces')
  assertArrayContainsString(errors, targetReceives, 'provider record at .prelude/providers/effect-harness/provider.json', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, 'runtime assets', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, 'AGENTS.md managed block', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, 'feedback', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, '.effect-harness.json', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')

  assertRecordDoesNotContain(errors, profile, 'state', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, profile, 'officialSource', 'provider profile.profiles.codex-effect-v4')
  const contributions = recordField(errors, profile, 'contributions', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, contributions, 'runtimeAssets', 'provider profile.profiles.codex-effect-v4.contributions')
  assertRecordDoesNotContain(errors, contributions, 'agentsBlock', 'provider profile.profiles.codex-effect-v4.contributions')
  assertRecordDoesNotContain(errors, contributions, 'codexAssets', 'provider profile.profiles.codex-effect-v4.contributions')
})
