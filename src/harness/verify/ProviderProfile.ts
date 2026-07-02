import { Effect, FileSystem } from 'effect'
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
  if (values?.some(value => typeof value === 'string' && value.includes(text)) === true) {
    errors.push(`${source} must not include text containing ${text}.`)
  }
}

function assertRecordDoesNotContain(
  errors: Array<string>,
  record: Record<string, unknown> | undefined,
  key: string,
  source: string,
): void {
  if (record !== undefined && key in record) {
    errors.push(`${source} must not contain field ${key}.`)
  }
}

interface ExpectedManagedFile {
  readonly id: string
  readonly sourcePath: string
  readonly targetPath: string
}

const expectedSelfMaterializationForbiddenSurfaces = [
  '.prelude',
  '.prelude/providers',
  '.prelude/providers/effect-harness',
  '.prelude/providers/effect-harness/provider.json',
  '.prelude/providers/effect-harness/docs',
  '.prelude/providers/effect-harness/snippets',
] as const

function fileRecordById(
  files: ReadonlyArray<unknown> | undefined,
  id: string,
): Record<string, unknown> | undefined {
  return files?.find(file => isRecord(file) && file.id === id) as Record<string, unknown> | undefined
}

const assertManagedFileContribution = Effect.fnUntraced(function* (
  errors: Array<string>,
  harness: string,
  files: ReadonlyArray<unknown> | undefined,
  expected: ExpectedManagedFile,
  source: string,
) {
  const file = fileRecordById(files, expected.id)
  if (file === undefined) {
    errors.push(`${source}.files must include ${expected.id}.`)
    return
  }

  assertStringValue(errors, stringField(errors, file, 'sourcePath', `${source}.files[${expected.id}]`), expected.sourcePath, `${source}.files[${expected.id}].sourcePath`)
  assertStringValue(errors, stringField(errors, file, 'targetPath', `${source}.files[${expected.id}]`), expected.targetPath, `${source}.files[${expected.id}].targetPath`)
  assertStringValue(errors, stringField(errors, file, 'contentType', `${source}.files[${expected.id}]`), 'text/markdown', `${source}.files[${expected.id}].contentType`)
  assertBooleanValue(errors, booleanField(errors, file, 'managed', `${source}.files[${expected.id}]`), true, `${source}.files[${expected.id}].managed`)

  const fs = yield* FileSystem.FileSystem
  if (!(yield* fs.exists(`${harness}/${expected.sourcePath}`))) {
    errors.push(`${source}.files[${expected.id}].sourcePath does not exist: ${expected.sourcePath}.`)
  }
})

const assertManagedFileBundle = Effect.fnUntraced(function* (
  errors: Array<string>,
  harness: string,
  bundle: Record<string, unknown> | undefined,
  expectedBasePath: string,
  expectedFiles: ReadonlyArray<ExpectedManagedFile>,
  source: string,
) {
  if (bundle === undefined) {
    return
  }

  assertStringValue(errors, stringField(errors, bundle, 'mode', source), 'managed-files', `${source}.mode`)
  assertStringValue(errors, stringField(errors, bundle, 'targetBasePath', source), expectedBasePath, `${source}.targetBasePath`)

  const files = arrayField(errors, bundle, 'files', source)
  for (const expected of expectedFiles) {
    yield* assertManagedFileContribution(errors, harness, files, expected, source)
  }
})

const expectedPackageBaseline: Readonly<Record<string, string>> = {
  'effect': '4.0.0-beta.92',
  '@effect/platform-node': '4.0.0-beta.92',
  '@effect/vitest': '4.0.0-beta.92',
  '@effect/tsgo': '0.15.0',
  '@effect/language-service': '0.86.2',
  '@typescript/native-preview': '7.0.0-dev.20260630.1',
}

function assertPackageBaseline(
  errors: Array<string>,
  profileBaseline: Record<string, unknown> | undefined,
): void {
  if (profileBaseline === undefined) {
    return
  }

  for (const [name, expected] of Object.entries(expectedPackageBaseline)) {
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

function assertDeliveryModes(errors: Array<string>, providerProfile: Record<string, unknown>): void {
  const deliveryModes = recordField(errors, providerProfile, 'deliveryModes', 'provider profile')
  const internalHarness = recordField(errors, deliveryModes, 'internalHarness', 'provider profile.deliveryModes')
  const artifactReference = recordField(errors, deliveryModes, 'providerArtifactReference', 'provider profile.deliveryModes')
  const exportedHarness = recordField(errors, deliveryModes, 'exportedHarness', 'provider profile.deliveryModes')

  assertStringValue(errors, stringField(errors, internalHarness, 'mode', 'provider profile.deliveryModes.internalHarness'), 'internal-harness', 'provider profile.deliveryModes.internalHarness.mode')
  assertStringValue(errors, stringField(errors, artifactReference, 'mode', 'provider profile.deliveryModes.providerArtifactReference'), 'provider-artifact-reference', 'provider profile.deliveryModes.providerArtifactReference.mode')
  assertStringValue(errors, stringField(errors, exportedHarness, 'mode', 'provider profile.deliveryModes.exportedHarness'), 'exported-harness', 'provider profile.deliveryModes.exportedHarness.mode')
}

function assertSelfConformanceContract(errors: Array<string>, providerProfile: Record<string, unknown>): void {
  const selfConformance = recordField(errors, providerProfile, 'selfConformance', 'provider profile')
  assertStringValue(errors, stringField(errors, selfConformance, 'mode', 'provider profile.selfConformance'), 'provider-repository', 'provider profile.selfConformance.mode')
  assertStringValue(errors, stringField(errors, selfConformance, 'conformsTo', 'provider profile.selfConformance'), 'exported-harness', 'provider profile.selfConformance.conformsTo')
  assertStringValue(errors, stringField(errors, selfConformance, 'completionGate', 'provider profile.selfConformance'), 'pnpm verify', 'provider profile.selfConformance.completionGate')
  assertBooleanValue(errors, booleanField(errors, selfConformance, 'selfMaterialization', 'provider profile.selfConformance'), false, 'provider profile.selfConformance.selfMaterialization')
  assertStringValue(errors, stringField(errors, selfConformance, 'lifecycleOwner', 'provider profile.selfConformance'), 'prelude', 'provider profile.selfConformance.lifecycleOwner')

  const forbiddenSurfaces = arrayField(errors, selfConformance, 'forbiddenProviderRepositorySurfaces', 'provider profile.selfConformance')
  for (const surface of expectedSelfMaterializationForbiddenSurfaces) {
    assertArrayContainsString(errors, forbiddenSurfaces, surface, 'provider profile.selfConformance.forbiddenProviderRepositorySurfaces')
  }
}

export const verifyProviderProfileContract = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const providerProfile = yield* readJson(`${harness}/provider/effect-harness.provider.json`, decodeJsonRecord)
  const effectContract = yield* readJson(`${harness}/repos/effect.subtree.json`, decodeJsonRecord)
  const tsgoContract = yield* readJson(`${harness}/repos/tsgo.subtree.json`, decodeJsonRecord)

  const provider = recordField(errors, providerProfile, 'provider', 'provider profile')
  assertStringValue(errors, stringField(errors, provider, 'id', 'provider profile.provider'), 'effect-harness', 'provider profile.provider.id')
  assertStringValue(errors, stringField(errors, provider, 'defaultProfile', 'provider profile.provider'), 'codex-effect-v4', 'provider profile.provider.defaultProfile')
  assertDeliveryModes(errors, providerProfile)
  assertSelfConformanceContract(errors, providerProfile)

  const sourceEntries = recordField(errors, providerProfile, 'sourceEntries', 'provider profile')
  const profiles = recordField(errors, providerProfile, 'profiles', 'provider profile')
  const profile = recordField(errors, profiles, 'codex-effect-v4', 'provider profile.profiles')
  const sourceEntryId = stringField(errors, profile, 'sourceEntry', 'provider profile.profiles.codex-effect-v4')
  assertStringValue(errors, sourceEntryId, 'effect-official-source', 'provider profile.profiles.codex-effect-v4.sourceEntry')

  assertProviderSourceEntry(errors, sourceEntries, {
    contractPath: 'repos/effect.subtree.json',
    id: 'effect-official-source',
    updateCommand: 'partita pin update --contract repos/effect.subtree.json --name effect --prefix repos/effect --dry-run',
    verifyCommand: 'partita pin verify --contract repos/effect.subtree.json --name effect --prefix repos/effect',
  })
  assertProviderSourceEntry(errors, sourceEntries, {
    contractPath: 'repos/tsgo.subtree.json',
    id: 'tsgo-official-source',
    updateCommand: 'partita pin update --contract repos/tsgo.subtree.json --name tsgo --prefix repos/tsgo --dry-run',
    verifyCommand: 'partita pin verify --contract repos/tsgo.subtree.json --name tsgo --prefix repos/tsgo',
  })
  assertPartitaSubtreeContract(errors, effectContract, {
    anchor: 'repos/effect/LLMS.md',
    contractPath: 'repos/effect.subtree.json',
    filesExclude: 'enabled',
    name: 'effect',
    prefix: 'repos/effect',
    repository: 'https://github.com/Effect-TS/effect-smol',
    route: 'harness/effect-routes.md',
    updateCommand: 'partita pin update --contract repos/effect.subtree.json --name effect --prefix repos/effect --dry-run',
    verifyCommand: 'partita pin verify --contract repos/effect.subtree.json --name effect --prefix repos/effect',
  })
  assertPartitaSubtreeContract(errors, tsgoContract, {
    anchor: 'repos/tsgo/README.md',
    contractPath: 'repos/tsgo.subtree.json',
    filesExclude: 'disabled',
    name: 'tsgo',
    prefix: 'repos/tsgo',
    repository: 'https://github.com/Effect-TS/tsgo',
    route: 'harness/tsgo-routes.md',
    updateCommand: 'partita pin update --contract repos/tsgo.subtree.json --name tsgo --prefix repos/tsgo --dry-run',
    verifyCommand: 'partita pin verify --contract repos/tsgo.subtree.json --name tsgo --prefix repos/tsgo',
  })

  const providerRecord = recordField(errors, providerProfile, 'providerRecord', 'provider profile')
  const sourceDelivery = recordField(errors, providerRecord, 'sourceDelivery', 'provider profile.providerRecord')
  assertStringValue(errors, stringField(errors, sourceDelivery, 'mode', 'provider profile.providerRecord.sourceDelivery'), 'artifact-identity-only', 'provider profile.providerRecord.sourceDelivery.mode')
  assertArrayContainsString(errors, arrayField(errors, providerRecord, 'requiredFields', 'provider profile.providerRecord'), 'artifact.sourceIdentity', 'provider profile.providerRecord.requiredFields')
  assertArrayContainsString(errors, arrayField(errors, providerRecord, 'requiredFields', 'provider profile.providerRecord'), 'artifact.sourceIdentities', 'provider profile.providerRecord.requiredFields')
  assertArrayContainsString(errors, arrayField(errors, providerRecord, 'requiredFields', 'provider profile.providerRecord'), 'surfaces.documentationBundle', 'provider profile.providerRecord.requiredFields')
  assertArrayContainsString(errors, arrayField(errors, providerRecord, 'requiredFields', 'provider profile.providerRecord'), 'surfaces.snippets', 'provider profile.providerRecord.requiredFields')

  const sourceBoundary = recordField(errors, profile, 'sourceBoundary', 'provider profile.profiles.codex-effect-v4')
  assertBooleanValue(errors, booleanField(errors, sourceBoundary, 'providerRepoInternal', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), true, 'provider profile.profiles.codex-effect-v4.sourceBoundary.providerRepoInternal')
  assertStringValue(errors, stringField(errors, sourceBoundary, 'targetDelivery', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'identity-only', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetDelivery')
  assertArrayContainsString(errors, arrayField(errors, sourceBoundary, 'targetMustNotReceive', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'repos/effect', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetMustNotReceive')
  assertArrayContainsString(errors, arrayField(errors, sourceBoundary, 'targetMustNotReceive', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'repos/tsgo', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetMustNotReceive')

  const options = recordField(errors, profile, 'options', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, options, 'runtime', 'provider profile.profiles.codex-effect-v4.options')
  assertEditorPolicy(errors, options)

  assertPackageBaseline(errors, recordField(errors, profile, 'packageBaseline', 'provider profile.profiles.codex-effect-v4'))

  const managedSurfaces = recordField(errors, profile, 'managedSurfaces', 'provider profile.profiles.codex-effect-v4')
  const targetReceives = arrayField(errors, managedSurfaces, 'targetReceives', 'provider profile.profiles.codex-effect-v4.managedSurfaces')
  assertArrayContainsString(errors, targetReceives, 'provider record at .prelude/providers/effect-harness/provider.json', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayContainsString(errors, targetReceives, 'provider-managed docs bundle at .prelude/providers/effect-harness/docs', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayContainsString(errors, targetReceives, 'provider-managed snippets at .prelude/providers/effect-harness/snippets', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
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

  yield* assertManagedFileBundle(
    errors,
    harness,
    recordField(errors, contributions, 'documentationBundle', 'provider profile.profiles.codex-effect-v4.contributions'),
    '.prelude/providers/effect-harness/docs',
    [
      {
        id: 'effect-code',
        sourcePath: 'provider/docs/effect-code.md',
        targetPath: 'effect-code.md',
      },
      {
        id: 'diagnostics',
        sourcePath: 'provider/docs/diagnostics.md',
        targetPath: 'diagnostics.md',
      },
      {
        id: 'source-identity',
        sourcePath: 'provider/docs/source-identity.md',
        targetPath: 'source-identity.md',
      },
    ],
    'provider profile.profiles.codex-effect-v4.contributions.documentationBundle',
  )
  yield* assertManagedFileBundle(
    errors,
    harness,
    recordField(errors, contributions, 'snippets', 'provider profile.profiles.codex-effect-v4.contributions'),
    '.prelude/providers/effect-harness/snippets',
    [
      {
        id: 'agents-effect-harness',
        sourcePath: 'provider/snippets/agents.md',
        targetPath: 'agents.md',
      },
    ],
    'provider profile.profiles.codex-effect-v4.contributions.snippets',
  )
})

interface ExpectedProviderSourceEntry {
  readonly id: string
  readonly contractPath: string
  readonly updateCommand: string
  readonly verifyCommand: string
}

function assertProviderSourceEntry(
  errors: Array<string>,
  sourceEntries: Record<string, unknown> | undefined,
  expected: ExpectedProviderSourceEntry,
): void {
  const sourceEntry = recordField(errors, sourceEntries, expected.id, 'provider profile.sourceEntries')
  assertStringValue(errors, stringField(errors, sourceEntry, 'kind', `provider profile.sourceEntries.${expected.id}`), 'provider-internal-github-subtree', `provider profile.sourceEntries.${expected.id}.kind`)
  const contract = recordField(errors, sourceEntry, 'contract', `provider profile.sourceEntries.${expected.id}`)
  assertStringValue(errors, stringField(errors, contract, 'path', `provider profile.sourceEntries.${expected.id}.contract`), expected.contractPath, `provider profile.sourceEntries.${expected.id}.contract.path`)
  assertStringValue(errors, stringField(errors, contract, 'owner', `provider profile.sourceEntries.${expected.id}.contract`), 'partita', `provider profile.sourceEntries.${expected.id}.contract.owner`)
  assertStringValue(errors, stringField(errors, contract, 'format', `provider profile.sourceEntries.${expected.id}.contract`), 'github-subtree', `provider profile.sourceEntries.${expected.id}.contract.format`)
  const commands = recordField(errors, sourceEntry, 'commands', `provider profile.sourceEntries.${expected.id}`)
  assertStringValue(errors, stringField(errors, commands, 'update', `provider profile.sourceEntries.${expected.id}.commands`), expected.updateCommand, `provider profile.sourceEntries.${expected.id}.commands.update`)
  assertStringValue(errors, stringField(errors, commands, 'verify', `provider profile.sourceEntries.${expected.id}.commands`), expected.verifyCommand, `provider profile.sourceEntries.${expected.id}.commands.verify`)
  assertRecordDoesNotContain(errors, commands, 'status', `provider profile.sourceEntries.${expected.id}.commands`)
  assertRecordDoesNotContain(errors, sourceEntry, 'repository', `provider profile.sourceEntries.${expected.id}`)
  assertRecordDoesNotContain(errors, sourceEntry, 'branch', `provider profile.sourceEntries.${expected.id}`)
  assertRecordDoesNotContain(errors, sourceEntry, 'prefix', `provider profile.sourceEntries.${expected.id}`)
  assertRecordDoesNotContain(errors, sourceEntry, 'anchor', `provider profile.sourceEntries.${expected.id}`)
  assertRecordDoesNotContain(errors, sourceEntry, 'llmDocument', `provider profile.sourceEntries.${expected.id}`)
  assertRecordDoesNotContain(errors, sourceEntry, 'agentRoute', `provider profile.sourceEntries.${expected.id}`)
}

interface ExpectedPartitaSubtreeContract {
  readonly anchor: string
  readonly contractPath: string
  readonly filesExclude: string
  readonly name: string
  readonly prefix: string
  readonly repository: string
  readonly route: string
  readonly updateCommand: string
  readonly verifyCommand: string
}

function assertPartitaSubtreeContract(
  errors: Array<string>,
  sourceContract: Record<string, unknown>,
  expected: ExpectedPartitaSubtreeContract,
): void {
  assertStringValue(errors, stringField(errors, sourceContract, 'name', expected.contractPath), expected.name, `${expected.contractPath}.name`)
  assertStringValue(errors, stringField(errors, sourceContract, 'mechanism', expected.contractPath), 'git-subtree', `${expected.contractPath}.mechanism`)

  const github = recordField(errors, sourceContract, 'github', expected.contractPath)
  const local = recordField(errors, sourceContract, 'local', expected.contractPath)
  const subtree = recordField(errors, sourceContract, 'subtree', expected.contractPath)
  const anchor = recordField(errors, sourceContract, 'anchor', expected.contractPath)
  const agent = recordField(errors, sourceContract, 'agent', expected.contractPath)
  const commands = recordField(errors, sourceContract, 'commands', expected.contractPath)
  const editorPolicy = recordField(errors, sourceContract, 'editorPolicy', expected.contractPath)
  const boundaries = recordField(errors, sourceContract, 'boundaries', expected.contractPath)
  const ownership = recordField(errors, sourceContract, 'ownership', expected.contractPath)

  const split = stringField(errors, subtree, 'split', `${expected.contractPath}.subtree`)
  assertStringValue(errors, stringField(errors, github, 'repository', `${expected.contractPath}.github`), expected.repository, `${expected.contractPath}.github.repository`)
  assertStringValue(errors, stringField(errors, github, 'branch', `${expected.contractPath}.github`), 'main', `${expected.contractPath}.github.branch`)
  assertStringValue(errors, stringField(errors, github, 'ref', `${expected.contractPath}.github`), split ?? '', `${expected.contractPath}.github.ref`)
  assertStringValue(errors, stringField(errors, local, 'prefix', `${expected.contractPath}.local`), expected.prefix, `${expected.contractPath}.local.prefix`)
  assertStringValue(errors, stringField(errors, subtree, 'trailer', `${expected.contractPath}.subtree`), `git-subtree-split: ${split ?? ''}`, `${expected.contractPath}.subtree.trailer`)
  assertStringValue(errors, stringField(errors, anchor, 'llmDocument', `${expected.contractPath}.anchor`), expected.anchor, `${expected.contractPath}.anchor.llmDocument`)
  assertStringValue(errors, stringField(errors, agent, 'route', `${expected.contractPath}.agent`), expected.route, `${expected.contractPath}.agent.route`)
  assertStringValue(errors, stringField(errors, commands, 'update', `${expected.contractPath}.commands`), expected.updateCommand, `${expected.contractPath}.commands.update`)
  assertStringValue(errors, stringField(errors, commands, 'verify', `${expected.contractPath}.commands`), expected.verifyCommand, `${expected.contractPath}.commands.verify`)
  assertRecordDoesNotContain(errors, commands, 'status', `${expected.contractPath}.commands`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'autoImportExclude', `${expected.contractPath}.editorPolicy`), 'block', `${expected.contractPath}.editorPolicy.autoImportExclude`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'watcherExclude', `${expected.contractPath}.editorPolicy`), 'recommended', `${expected.contractPath}.editorPolicy.watcherExclude`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'searchExclude', `${expected.contractPath}.editorPolicy`), 'recommended', `${expected.contractPath}.editorPolicy.searchExclude`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'filesExclude', `${expected.contractPath}.editorPolicy`), expected.filesExclude, `${expected.contractPath}.editorPolicy.filesExclude`)
  assertStringValue(errors, stringField(errors, ownership, 'mode', `${expected.contractPath}.ownership`), 'provider', `${expected.contractPath}.ownership.mode`)
  assertBooleanValue(errors, booleanField(errors, boundaries, 'readOnly', `${expected.contractPath}.boundaries`), true, `${expected.contractPath}.boundaries.readOnly`)
  assertBooleanValue(errors, booleanField(errors, boundaries, 'importBlock', `${expected.contractPath}.boundaries`), true, `${expected.contractPath}.boundaries.importBlock`)
}
