import { Effect, FileSystem } from 'effect'
import { readJson } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { isRecord } from './JsonFields.ts'
import {
  expectedPackageBaseline,
  expectedPrepareCommand,
  expectedTypecheckCommand,
  strictDiagnosticGate,
  strictDiagnosticSeverity,
} from './TsgoPolicy.ts'
import { verifyStageSpecs } from './VerifyStage.ts'

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

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function assertJsonValue(errors: Array<string>, actual: unknown, expected: unknown, source: string): void {
  if (stableJson(actual) !== stableJson(expected)) {
    errors.push(`${source} does not match the expected provider contract value.`)
  }
}

interface ExpectedManagedFile {
  readonly id: string
  readonly requiredKeywords?: ReadonlyArray<string>
  readonly sourcePath: string
  readonly targetPath: string
  readonly targetUsage?: string
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

const forbiddenTargetLocalSourceClaims = [
  'target SHOULD receive `repos/',
  'target MUST receive `repos/',
  'target 应该接收 `repos/',
  'target 必须接收 `repos/',
] as const

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
  if (expected.targetUsage !== undefined) {
    assertStringValue(errors, stringField(errors, file, 'targetUsage', `${source}.files[${expected.id}]`), expected.targetUsage, `${source}.files[${expected.id}].targetUsage`)
  }

  const fs = yield* FileSystem.FileSystem
  const path = `${harness}/${expected.sourcePath}`
  if (!(yield* fs.exists(path))) {
    errors.push(`${source}.files[${expected.id}].sourcePath does not exist: ${expected.sourcePath}.`)
    return
  }

  const text = yield* fs.readFileString(path)
  for (const keyword of expected.requiredKeywords ?? []) {
    if (!text.includes(keyword)) {
      errors.push(`${expected.sourcePath} must contain managed docs topic ${keyword}.`)
    }
  }
  for (const phrase of forbiddenTargetLocalSourceClaims) {
    if (text.includes(phrase)) {
      errors.push(`${expected.sourcePath} must not describe provider-internal repos as target-local content.`)
    }
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

type PackageName = keyof typeof expectedPackageBaseline
type PackageField = 'dependencies' | 'devDependencies'

interface ExpectedPackageGroup {
  readonly field: PackageField
  readonly packageNames: ReadonlyArray<PackageName>
}

const expectedPackageGroups = {
  runtime: {
    field: 'dependencies',
    packageNames: ['effect', '@effect/platform-node'],
  },
  testing: {
    field: 'devDependencies',
    packageNames: ['@effect/vitest', 'vitest'],
  },
  diagnostics: {
    field: 'devDependencies',
    packageNames: ['@effect/tsgo', '@effect/language-service'],
  },
  nativeBackend: {
    field: 'devDependencies',
    packageNames: ['@typescript/native-preview'],
  },
  linting: {
    field: 'devDependencies',
    packageNames: ['@antfu/eslint-config', 'eslint'],
  },
} as const satisfies Readonly<Record<string, ExpectedPackageGroup>>

const expectedLintCommand = 'pnpm lint --max-warnings 0'
const expectedLintScript = 'eslint'
const expectedTestCommand = 'pnpm test'
const expectedTestScript = 'vitest run'
const expectedVerifyCommand = 'pnpm verify'
const expectedVerifyScript = 'node bin/effect-harness.ts verify --harness .'

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

function assertSourceEntryEditorPolicy(
  errors: Array<string>,
  sourceContract: Record<string, unknown>,
  sourceEntryId: string,
  filesExclude: 'disabled' | 'enabled',
): void {
  const editorPolicy = recordField(errors, sourceContract, 'editorPolicy', `${sourceEntryId} source contract`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'autoImportExclude', `${sourceEntryId} source contract.editorPolicy`), 'block', `${sourceEntryId} source contract.editorPolicy.autoImportExclude`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'watcherExclude', `${sourceEntryId} source contract.editorPolicy`), 'recommended', `${sourceEntryId} source contract.editorPolicy.watcherExclude`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'searchExclude', `${sourceEntryId} source contract.editorPolicy`), 'recommended', `${sourceEntryId} source contract.editorPolicy.searchExclude`)
  assertStringValue(errors, stringField(errors, editorPolicy, 'filesExclude', `${sourceEntryId} source contract.editorPolicy`), filesExclude, `${sourceEntryId} source contract.editorPolicy.filesExclude`)
}

function assertEditorPolicyContribution(
  errors: Array<string>,
  contributions: Record<string, unknown> | undefined,
  effectContract: Record<string, unknown>,
  tsgoContract: Record<string, unknown>,
  vscodeSettings: Record<string, unknown>,
): void {
  const editorPolicy = recordField(errors, contributions, 'editorPolicy', 'provider profile.profiles.codex-effect-v4.contributions')
  assertStringValue(errors, stringField(errors, editorPolicy, 'mode', 'provider profile editorPolicy contribution'), 'structured-merge', 'provider profile editorPolicy.mode')
  assertArrayContainsString(errors, arrayField(errors, editorPolicy, 'targetPaths', 'provider profile editorPolicy contribution'), '.vscode/settings.json', 'provider profile editorPolicy.targetPaths')
  assertArrayContainsString(errors, arrayField(errors, editorPolicy, 'targetPaths', 'provider profile editorPolicy contribution'), '.zed/settings.json', 'provider profile editorPolicy.targetPaths')

  const sourceIdentity = recordField(errors, editorPolicy, 'sourceIdentity', 'provider profile editorPolicy contribution')
  assertArrayContainsString(errors, arrayField(errors, sourceIdentity, 'providerInternalPatterns', 'provider profile editorPolicy.sourceIdentity'), 'repos/**', 'provider profile editorPolicy.sourceIdentity.providerInternalPatterns')
  assertBooleanValue(errors, booleanField(errors, sourceIdentity, 'targetReceivesSourceTrees', 'provider profile editorPolicy.sourceIdentity'), false, 'provider profile editorPolicy.sourceIdentity.targetReceivesSourceTrees')

  const policies = recordField(errors, editorPolicy, 'policies', 'provider profile editorPolicy contribution')
  const autoImport = recordField(errors, policies, 'autoImportExclude', 'provider profile editorPolicy.policies')
  assertStringValue(errors, stringField(errors, autoImport, 'level', 'provider profile editorPolicy.policies.autoImportExclude'), 'hard-boundary', 'provider profile editorPolicy.policies.autoImportExclude.level')
  assertStringValue(errors, stringField(errors, autoImport, 'sourceEntryContractField', 'provider profile editorPolicy.policies.autoImportExclude'), 'editorPolicy.autoImportExclude', 'provider profile editorPolicy.policies.autoImportExclude.sourceEntryContractField')
  assertStringValue(errors, stringField(errors, autoImport, 'expectedContractValue', 'provider profile editorPolicy.policies.autoImportExclude'), 'block', 'provider profile editorPolicy.policies.autoImportExclude.expectedContractValue')
  assertArrayContainsString(errors, arrayField(errors, autoImport, 'patterns', 'provider profile editorPolicy.policies.autoImportExclude'), 'repos/**', 'provider profile editorPolicy.policies.autoImportExclude.patterns')
  const vscodeAutoImport = recordField(errors, autoImport, 'vscode', 'provider profile editorPolicy.policies.autoImportExclude')
  assertArrayContainsString(errors, arrayField(errors, vscodeAutoImport, 'typescript.preferences.autoImportFileExcludePatterns', 'provider profile editorPolicy.policies.autoImportExclude.vscode'), 'repos/**', 'provider profile editorPolicy.policies.autoImportExclude.vscode.typescript.preferences.autoImportFileExcludePatterns')
  assertArrayContainsString(errors, arrayField(errors, vscodeAutoImport, 'javascript.preferences.autoImportFileExcludePatterns', 'provider profile editorPolicy.policies.autoImportExclude.vscode'), 'repos/**', 'provider profile editorPolicy.policies.autoImportExclude.vscode.javascript.preferences.autoImportFileExcludePatterns')
  const zedAutoImport = recordField(errors, autoImport, 'zed', 'provider profile editorPolicy.policies.autoImportExclude')
  assertStringValue(errors, stringField(errors, zedAutoImport, 'settingsPath', 'provider profile editorPolicy.policies.autoImportExclude.zed'), '.zed/settings.json', 'provider profile editorPolicy.policies.autoImportExclude.zed.settingsPath')
  if (recordField(errors, zedAutoImport, 'lsp', 'provider profile editorPolicy.policies.autoImportExclude.zed') === undefined) {
    errors.push('provider profile editorPolicy.policies.autoImportExclude.zed must use a Zed-specific lsp settings shape.')
  }

  const watchExclude = recordField(errors, policies, 'watchExclude', 'provider profile editorPolicy.policies')
  assertStringValue(errors, stringField(errors, watchExclude, 'level', 'provider profile editorPolicy.policies.watchExclude'), 'recommended', 'provider profile editorPolicy.policies.watchExclude.level')
  assertStringValue(errors, stringField(errors, watchExclude, 'sourceEntryContractField', 'provider profile editorPolicy.policies.watchExclude'), 'editorPolicy.watcherExclude', 'provider profile editorPolicy.policies.watchExclude.sourceEntryContractField')
  assertStringValue(errors, stringField(errors, watchExclude, 'expectedContractValue', 'provider profile editorPolicy.policies.watchExclude'), 'recommended', 'provider profile editorPolicy.policies.watchExclude.expectedContractValue')
  assertBooleanValue(errors, booleanField(errors, watchExclude, 'requiresConfiguration', 'provider profile editorPolicy.policies.watchExclude'), true, 'provider profile editorPolicy.policies.watchExclude.requiresConfiguration')
  assertArrayContainsString(errors, arrayField(errors, watchExclude, 'patterns', 'provider profile editorPolicy.policies.watchExclude'), 'repos/**', 'provider profile editorPolicy.policies.watchExclude.patterns')
  assertBooleanValue(errors, booleanField(errors, recordField(errors, recordField(errors, watchExclude, 'vscode', 'provider profile editorPolicy.policies.watchExclude'), 'files.watcherExclude', 'provider profile editorPolicy.policies.watchExclude.vscode'), 'repos/**', 'provider profile editorPolicy.policies.watchExclude.vscode.files.watcherExclude'), true, 'provider profile editorPolicy.policies.watchExclude.vscode.files.watcherExclude["repos/**"]')

  const searchExclude = recordField(errors, policies, 'searchExclude', 'provider profile editorPolicy.policies')
  assertStringValue(errors, stringField(errors, searchExclude, 'level', 'provider profile editorPolicy.policies.searchExclude'), 'recommended', 'provider profile editorPolicy.policies.searchExclude.level')
  assertStringValue(errors, stringField(errors, searchExclude, 'sourceEntryContractField', 'provider profile editorPolicy.policies.searchExclude'), 'editorPolicy.searchExclude', 'provider profile editorPolicy.policies.searchExclude.sourceEntryContractField')
  assertStringValue(errors, stringField(errors, searchExclude, 'expectedContractValue', 'provider profile editorPolicy.policies.searchExclude'), 'recommended', 'provider profile editorPolicy.policies.searchExclude.expectedContractValue')
  assertBooleanValue(errors, booleanField(errors, searchExclude, 'requiresConfiguration', 'provider profile editorPolicy.policies.searchExclude'), true, 'provider profile editorPolicy.policies.searchExclude.requiresConfiguration')
  assertArrayContainsString(errors, arrayField(errors, searchExclude, 'patterns', 'provider profile editorPolicy.policies.searchExclude'), 'repos/**', 'provider profile editorPolicy.policies.searchExclude.patterns')
  assertBooleanValue(errors, booleanField(errors, recordField(errors, recordField(errors, searchExclude, 'vscode', 'provider profile editorPolicy.policies.searchExclude'), 'search.exclude', 'provider profile editorPolicy.policies.searchExclude.vscode'), 'repos/**', 'provider profile editorPolicy.policies.searchExclude.vscode.search.exclude'), true, 'provider profile editorPolicy.policies.searchExclude.vscode.search.exclude["repos/**"]')

  const filesExclude = recordField(errors, policies, 'filesExclude', 'provider profile editorPolicy.policies')
  assertStringValue(errors, stringField(errors, filesExclude, 'level', 'provider profile editorPolicy.policies.filesExclude'), 'preference', 'provider profile editorPolicy.policies.filesExclude.level')
  assertStringValue(errors, stringField(errors, filesExclude, 'sourceEntryContractField', 'provider profile editorPolicy.policies.filesExclude'), 'editorPolicy.filesExclude', 'provider profile editorPolicy.policies.filesExclude.sourceEntryContractField')
  assertBooleanValue(errors, booleanField(errors, filesExclude, 'requiresExplicitOptIn', 'provider profile editorPolicy.policies.filesExclude'), true, 'provider profile editorPolicy.policies.filesExclude.requiresExplicitOptIn')
  const sourceEntryDefaults = recordField(errors, filesExclude, 'sourceEntryDefaults', 'provider profile editorPolicy.policies.filesExclude')
  assertStringValue(errors, stringField(errors, sourceEntryDefaults, 'effect-official-source', 'provider profile editorPolicy.policies.filesExclude.sourceEntryDefaults'), 'enabled', 'provider profile editorPolicy.policies.filesExclude.sourceEntryDefaults.effect-official-source')
  assertStringValue(errors, stringField(errors, sourceEntryDefaults, 'tsgo-official-source', 'provider profile editorPolicy.policies.filesExclude.sourceEntryDefaults'), 'disabled', 'provider profile editorPolicy.policies.filesExclude.sourceEntryDefaults.tsgo-official-source')
  const contributionFilesExclude = recordField(errors, recordField(errors, filesExclude, 'vscode', 'provider profile editorPolicy.policies.filesExclude'), 'files.exclude', 'provider profile editorPolicy.policies.filesExclude.vscode')
  assertBooleanValue(errors, booleanField(errors, contributionFilesExclude, 'repos/effect/**', 'provider profile editorPolicy.policies.filesExclude.vscode.files.exclude'), true, 'provider profile editorPolicy.policies.filesExclude.vscode.files.exclude["repos/effect/**"]')
  assertRecordDoesNotContain(errors, contributionFilesExclude, 'repos/tsgo/**', 'provider profile editorPolicy.policies.filesExclude.vscode.files.exclude')
  assertRecordDoesNotContain(errors, contributionFilesExclude, 'repos/**', 'provider profile editorPolicy.policies.filesExclude.vscode.files.exclude')

  assertArrayContainsString(errors, arrayField(errors, vscodeSettings, 'typescript.preferences.autoImportFileExcludePatterns', '.vscode/settings.json'), 'repos/**', '.vscode/settings.json.typescript.preferences.autoImportFileExcludePatterns')
  assertArrayContainsString(errors, arrayField(errors, vscodeSettings, 'javascript.preferences.autoImportFileExcludePatterns', '.vscode/settings.json'), 'repos/**', '.vscode/settings.json.javascript.preferences.autoImportFileExcludePatterns')
  assertBooleanValue(errors, booleanField(errors, recordField(errors, vscodeSettings, 'files.watcherExclude', '.vscode/settings.json'), 'repos/**', '.vscode/settings.json.files.watcherExclude'), true, '.vscode/settings.json.files.watcherExclude["repos/**"]')
  assertBooleanValue(errors, booleanField(errors, recordField(errors, vscodeSettings, 'search.exclude', '.vscode/settings.json'), 'repos/**', '.vscode/settings.json.search.exclude'), true, '.vscode/settings.json.search.exclude["repos/**"]')
  const vscodeFilesExclude = recordField(errors, vscodeSettings, 'files.exclude', '.vscode/settings.json')
  assertBooleanValue(errors, booleanField(errors, vscodeFilesExclude, 'repos/effect/**', '.vscode/settings.json.files.exclude'), true, '.vscode/settings.json.files.exclude["repos/effect/**"]')
  assertRecordDoesNotContain(errors, vscodeFilesExclude, 'repos/tsgo/**', '.vscode/settings.json.files.exclude')
  assertRecordDoesNotContain(errors, vscodeFilesExclude, 'repos/**', '.vscode/settings.json.files.exclude')

  assertSourceEntryEditorPolicy(errors, effectContract, 'effect-official-source', 'enabled')
  assertSourceEntryEditorPolicy(errors, tsgoContract, 'tsgo-official-source', 'disabled')
}

function assertEslintConfigContains(errors: Array<string>, eslintText: string, marker: string): void {
  if (!eslintText.includes(marker)) {
    errors.push(`eslint.config.mjs must contain ${marker}.`)
  }
}

function assertLintGuardrailsContribution(
  errors: Array<string>,
  contributions: Record<string, unknown> | undefined,
  packageManifest: Record<string, unknown>,
  eslintText: string,
): void {
  const lintGuardrails = recordField(errors, contributions, 'lintGuardrails', 'provider profile.profiles.codex-effect-v4.contributions')
  assertStringValue(errors, stringField(errors, lintGuardrails, 'mode', 'provider profile lintGuardrails contribution'), 'command-policy', 'provider profile lintGuardrails.mode')
  assertStringValue(errors, stringField(errors, lintGuardrails, 'stage', 'provider profile lintGuardrails contribution'), 'lint', 'provider profile lintGuardrails.stage')
  assertStringValue(errors, stringField(errors, lintGuardrails, 'command', 'provider profile lintGuardrails contribution'), expectedLintCommand, 'provider profile lintGuardrails.command')
  assertArrayContainsString(errors, arrayField(errors, lintGuardrails, 'configFiles', 'provider profile lintGuardrails contribution'), 'eslint.config.mjs', 'provider profile lintGuardrails.configFiles')

  const scripts = recordField(errors, packageManifest, 'scripts', 'package.json')
  assertStringValue(errors, stringField(errors, scripts, 'lint', 'package.json.scripts'), expectedLintScript, 'package.json.scripts.lint')

  const layers = recordField(errors, lintGuardrails, 'layers', 'provider profile lintGuardrails contribution')
  const owns = arrayField(errors, layers, 'owns', 'provider profile lintGuardrails.layers')
  assertArrayContainsString(errors, owns, 'repository import boundary', 'provider profile lintGuardrails.layers.owns')
  assertArrayContainsString(errors, owns, 'Effect v4 CLI import boundary', 'provider profile lintGuardrails.layers.owns')
  assertArrayContainsString(errors, owns, 'Effect test entry', 'provider profile lintGuardrails.layers.owns')
  assertArrayContainsString(errors, owns, 'syntax-level Effect guardrails', 'provider profile lintGuardrails.layers.owns')
  const doesNotOwn = arrayField(errors, layers, 'doesNotOwn', 'provider profile lintGuardrails.layers')
  assertArrayContainsString(errors, doesNotOwn, 'Effect semantic diagnostics', 'provider profile lintGuardrails.layers.doesNotOwn')
  assertArrayContainsString(errors, doesNotOwn, 'tsgo rule severity map', 'provider profile lintGuardrails.layers.doesNotOwn')

  const rules = recordField(errors, lintGuardrails, 'rules', 'provider profile lintGuardrails contribution')
  const restrictedImports = arrayField(errors, rules, 'restrictedImports', 'provider profile lintGuardrails.rules')
  for (const source of ['node:test', '@effect/cli', '@effect/cli/*', 'repos/effect/**', 'repos/tsgo/**']) {
    assertArrayContainsString(errors, restrictedImports, source, 'provider profile lintGuardrails.rules.restrictedImports')
    const eslintMarker = source.endsWith('/**')
      ? source.slice(0, -3)
      : source.endsWith('/*')
        ? source.slice(0, -2)
        : source
    assertEslintConfigContains(errors, eslintText, eslintMarker)
  }
  const restrictedVitestImports = arrayField(errors, rules, 'restrictedVitestImports', 'provider profile lintGuardrails.rules')
  for (const importName of ['describe', 'it', 'test']) {
    assertArrayContainsString(errors, restrictedVitestImports, importName, 'provider profile lintGuardrails.rules.restrictedVitestImports')
  }
  const allowedVitestImports = arrayField(errors, rules, 'allowedVitestImports', 'provider profile lintGuardrails.rules')
  for (const importName of ['vi', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll']) {
    assertArrayContainsString(errors, allowedVitestImports, importName, 'provider profile lintGuardrails.rules.allowedVitestImports')
  }
  assertEslintConfigContains(errors, eslintText, 'vitest')
  assertEslintConfigContains(errors, eslintText, 'importNames')

  const restrictedSyntax = arrayField(errors, rules, 'restrictedSyntax', 'provider profile lintGuardrails.rules')
  for (const syntax of ['Context.Tag', 'Effect.catchAllCause', 'Effect.ignore', 'Effect.serviceOption', '{ disableValidation: true }', 'plain it() in tests']) {
    assertArrayContainsString(errors, restrictedSyntax, syntax, 'provider profile lintGuardrails.rules.restrictedSyntax')
  }
  for (const marker of [
    'MemberExpression[object.name="Context"][property.name="Tag"]',
    'catchAllCause|ignore|serviceOption',
    'disableValidation',
    'CallExpression[callee.name="it"]',
  ]) {
    assertEslintConfigContains(errors, eslintText, marker)
  }
}

function assertTestPolicyContribution(
  errors: Array<string>,
  contributions: Record<string, unknown> | undefined,
): void {
  const testPolicy = recordField(errors, contributions, 'testPolicy', 'provider profile.profiles.codex-effect-v4.contributions')
  assertStringValue(errors, stringField(errors, testPolicy, 'mode', 'provider profile testPolicy contribution'), 'command-policy', 'provider profile testPolicy.mode')
  assertStringValue(errors, stringField(errors, testPolicy, 'stage', 'provider profile testPolicy contribution'), 'tests', 'provider profile testPolicy.stage')
  assertStringValue(errors, stringField(errors, testPolicy, 'command', 'provider profile testPolicy contribution'), expectedTestCommand, 'provider profile testPolicy.command')
  assertStringValue(errors, stringField(errors, testPolicy, 'packageScript', 'provider profile testPolicy contribution'), expectedTestScript, 'provider profile testPolicy.packageScript')
  assertStringValue(errors, stringField(errors, testPolicy, 'framework', 'provider profile testPolicy contribution'), '@effect/vitest', 'provider profile testPolicy.framework')
  assertArrayContainsString(errors, arrayField(errors, testPolicy, 'expectedEntries', 'provider profile testPolicy contribution'), 'tests/**/*.test.ts', 'provider profile testPolicy.expectedEntries')
  assertArrayContainsString(errors, arrayField(errors, testPolicy, 'effectEntrypoints', 'provider profile testPolicy contribution'), 'it.effect', 'provider profile testPolicy.effectEntrypoints')
  assertArrayContainsString(errors, arrayField(errors, testPolicy, 'effectEntrypoints', 'provider profile testPolicy contribution'), 'it.live', 'provider profile testPolicy.effectEntrypoints')
  assertArrayContainsString(errors, arrayField(errors, testPolicy, 'effectEntrypoints', 'provider profile testPolicy contribution'), 'layer', 'provider profile testPolicy.effectEntrypoints')
  assertArrayContainsString(errors, arrayField(errors, testPolicy, 'disallowedImports', 'provider profile testPolicy contribution'), 'node:test', 'provider profile testPolicy.disallowedImports')
  const disallowedVitestImports = arrayField(errors, testPolicy, 'disallowedVitestImports', 'provider profile testPolicy contribution')
  for (const importName of ['describe', 'it', 'test']) {
    assertArrayContainsString(errors, disallowedVitestImports, importName, 'provider profile testPolicy.disallowedVitestImports')
  }
}

function stageRecordByTag(
  stages: ReadonlyArray<unknown> | undefined,
  tag: string,
): Record<string, unknown> | undefined {
  return stages?.find(stage => isRecord(stage) && stage.tag === tag) as Record<string, unknown> | undefined
}

function assertVerificationPolicyContribution(
  errors: Array<string>,
  contributions: Record<string, unknown> | undefined,
  packageManifest: Record<string, unknown>,
): void {
  const verificationPolicy = recordField(errors, contributions, 'verificationPolicy', 'provider profile.profiles.codex-effect-v4.contributions')
  assertStringValue(errors, stringField(errors, verificationPolicy, 'mode', 'provider profile verificationPolicy contribution'), 'pipeline-policy', 'provider profile verificationPolicy.mode')
  assertStringValue(errors, stringField(errors, verificationPolicy, 'completionGate', 'provider profile verificationPolicy contribution'), expectedVerifyCommand, 'provider profile verificationPolicy.completionGate')
  assertStringValue(errors, stringField(errors, verificationPolicy, 'packageScript', 'provider profile verificationPolicy contribution'), expectedVerifyScript, 'provider profile verificationPolicy.packageScript')
  assertStringValue(errors, stringField(errors, verificationPolicy, 'lifecycleOwner', 'provider profile verificationPolicy contribution'), 'prelude', 'provider profile verificationPolicy.lifecycleOwner')

  const scripts = recordField(errors, packageManifest, 'scripts', 'package.json')
  assertStringValue(errors, stringField(errors, scripts, 'verify', 'package.json.scripts'), expectedVerifyScript, 'package.json.scripts.verify')

  const localCommands = recordField(errors, verificationPolicy, 'localCommands', 'provider profile verificationPolicy contribution')
  assertArrayContainsString(errors, arrayField(errors, localCommands, 'diagnostics', 'provider profile verificationPolicy.localCommands'), 'pnpm typecheck', 'provider profile verificationPolicy.localCommands.diagnostics')
  assertArrayContainsString(errors, arrayField(errors, localCommands, 'tests', 'provider profile verificationPolicy.localCommands'), expectedTestCommand, 'provider profile verificationPolicy.localCommands.tests')
  assertArrayContainsString(errors, arrayField(errors, localCommands, 'lint', 'provider profile verificationPolicy.localCommands'), expectedLintCommand, 'provider profile verificationPolicy.localCommands.lint')
  assertArrayContainsString(errors, arrayField(errors, localCommands, 'completion', 'provider profile verificationPolicy.localCommands'), expectedVerifyCommand, 'provider profile verificationPolicy.localCommands.completion')

  const stages = arrayField(errors, verificationPolicy, 'stages', 'provider profile verificationPolicy contribution')
  for (const spec of verifyStageSpecs) {
    const stage = stageRecordByTag(stages, spec.tag)
    if (stage === undefined) {
      errors.push(`provider profile verificationPolicy.stages must include ${spec.tag}.`)
      continue
    }
    assertStringValue(errors, stringField(errors, stage, 'summary', `provider profile verificationPolicy.stages[${spec.tag}]`), spec.summary, `provider profile verificationPolicy.stages[${spec.tag}].summary`)
  }
}

function assertPackageGroup(
  errors: Array<string>,
  dependencyGroups: Record<string, unknown> | undefined,
  groupName: string,
  expected: ExpectedPackageGroup,
): void {
  const group = recordField(errors, dependencyGroups, groupName, 'provider profile packageJson.dependencyGroups')
  assertStringValue(errors, stringField(errors, group, 'field', `provider profile packageJson.dependencyGroups.${groupName}`), expected.field, `provider profile packageJson.dependencyGroups.${groupName}.field`)
  const packages = recordField(errors, group, 'packages', `provider profile packageJson.dependencyGroups.${groupName}`)
  if (packages === undefined) {
    return
  }

  const expectedNames = new Set<string>(expected.packageNames)
  for (const name of Object.keys(packages)) {
    if (!expectedNames.has(name)) {
      errors.push(`provider profile packageJson.dependencyGroups.${groupName}.packages must not include ${name}.`)
    }
  }

  for (const name of expected.packageNames) {
    assertStringValue(
      errors,
      stringField(errors, packages, name, `provider profile packageJson.dependencyGroups.${groupName}.packages`),
      expectedPackageBaseline[name],
      `provider profile packageJson.dependencyGroups.${groupName}.packages.${name}`,
    )
  }
}

function assertWorkspaceCatalogEntry(
  errors: Array<string>,
  workspaceText: string,
  name: PackageName,
): void {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
  const escapedVersion = expectedPackageBaseline[name].replace(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`)
  const pattern = new RegExp(`(?:^|\\n)\\s*['"]?${escapedName}['"]?:\\s*${escapedVersion}(?:\\n|$)`, 'u')
  if (!pattern.test(workspaceText)) {
    errors.push(`pnpm-workspace.yaml catalog must pin ${name} to ${expectedPackageBaseline[name]}.`)
  }
}

function assertPackageGroupSelfConformance(
  errors: Array<string>,
  dependencyGroups: Record<string, unknown> | undefined,
  packageManifest: Record<string, unknown>,
  workspaceText: string,
  groupName: keyof typeof expectedPackageGroups,
  selfConformanceSpecifier: string,
): void {
  const expected = expectedPackageGroups[groupName]
  assertPackageGroup(errors, dependencyGroups, groupName, expected)

  const packageSection = recordField(errors, packageManifest, expected.field, 'package.json')
  for (const name of expected.packageNames) {
    assertStringValue(
      errors,
      stringField(errors, packageSection, name, `package.json.${expected.field}`),
      selfConformanceSpecifier,
      `package.json.${expected.field}.${name}`,
    )
    assertWorkspaceCatalogEntry(errors, workspaceText, name)
  }
}

function assertPackageScriptsContribution(
  errors: Array<string>,
  packageContribution: Record<string, unknown> | undefined,
  packageManifest: Record<string, unknown>,
): void {
  const contributionScripts = recordField(errors, packageContribution, 'scripts', 'provider profile packageJson contribution')
  const prepare = recordField(errors, contributionScripts, 'prepare', 'provider profile packageJson.scripts')
  const typecheck = recordField(errors, contributionScripts, 'typecheck', 'provider profile packageJson.scripts')
  const test = recordField(errors, contributionScripts, 'test', 'provider profile packageJson.scripts')
  const lint = recordField(errors, contributionScripts, 'lint', 'provider profile packageJson.scripts')
  assertStringValue(errors, stringField(errors, prepare, 'defaultCommand', 'provider profile packageJson.scripts.prepare'), expectedPrepareCommand, 'provider profile packageJson.scripts.prepare.defaultCommand')
  assertStringValue(errors, stringField(errors, typecheck, 'defaultCommand', 'provider profile packageJson.scripts.typecheck'), expectedTypecheckCommand, 'provider profile packageJson.scripts.typecheck.defaultCommand')
  assertStringValue(errors, stringField(errors, test, 'defaultCommand', 'provider profile packageJson.scripts.test'), expectedTestScript, 'provider profile packageJson.scripts.test.defaultCommand')
  assertStringValue(errors, stringField(errors, lint, 'defaultCommand', 'provider profile packageJson.scripts.lint'), expectedLintScript, 'provider profile packageJson.scripts.lint.defaultCommand')

  const manifestScripts = recordField(errors, packageManifest, 'scripts', 'package.json')
  assertStringValue(errors, stringField(errors, manifestScripts, 'prepare', 'package.json.scripts'), expectedPrepareCommand, 'package.json.scripts.prepare')
  assertStringValue(errors, stringField(errors, manifestScripts, 'typecheck', 'package.json.scripts'), expectedTypecheckCommand, 'package.json.scripts.typecheck')
  assertStringValue(errors, stringField(errors, manifestScripts, 'lint', 'package.json.scripts'), expectedLintScript, 'package.json.scripts.lint')
}

function assertPackageJsonContribution(
  errors: Array<string>,
  contributions: Record<string, unknown> | undefined,
  packageManifest: Record<string, unknown>,
  workspaceText: string,
): void {
  const packageJson = recordField(errors, contributions, 'packageJson', 'provider profile.profiles.codex-effect-v4.contributions')
  assertStringValue(errors, stringField(errors, packageJson, 'mode', 'provider profile packageJson contribution'), 'structured-merge', 'provider profile packageJson.mode')
  assertStringValue(errors, stringField(errors, packageJson, 'targetPath', 'provider profile packageJson contribution'), 'package.json', 'provider profile packageJson.targetPath')
  const selfConformanceSpecifier = stringField(errors, packageJson, 'selfConformanceSpecifier', 'provider profile packageJson contribution')
  assertStringValue(errors, selfConformanceSpecifier, 'catalog:', 'provider profile packageJson.selfConformanceSpecifier')
  assertRecordDoesNotContain(errors, packageJson, 'dependencies', 'provider profile packageJson contribution')
  assertRecordDoesNotContain(errors, packageJson, 'devDependencies', 'provider profile packageJson contribution')

  const dependencyGroups = recordField(errors, packageJson, 'dependencyGroups', 'provider profile packageJson contribution')
  assertPackageGroupSelfConformance(errors, dependencyGroups, packageManifest, workspaceText, 'runtime', selfConformanceSpecifier ?? '')
  assertPackageGroupSelfConformance(errors, dependencyGroups, packageManifest, workspaceText, 'testing', selfConformanceSpecifier ?? '')
  assertPackageGroupSelfConformance(errors, dependencyGroups, packageManifest, workspaceText, 'diagnostics', selfConformanceSpecifier ?? '')
  assertPackageGroupSelfConformance(errors, dependencyGroups, packageManifest, workspaceText, 'nativeBackend', selfConformanceSpecifier ?? '')
  assertPackageScriptsContribution(errors, packageJson, packageManifest)
}

function assertTsconfigContributionMetadata(errors: Array<string>, contributions: Record<string, unknown> | undefined): void {
  const tsconfig = recordField(errors, contributions, 'tsconfig', 'provider profile.profiles.codex-effect-v4.contributions')
  assertStringValue(errors, stringField(errors, tsconfig, 'mode', 'provider profile tsconfig contribution'), 'structured-merge', 'provider profile tsconfig.mode')
  assertStringValue(errors, stringField(errors, tsconfig, 'targetPath', 'provider profile tsconfig contribution'), 'tsconfig.json', 'provider profile tsconfig.targetPath')

  const tsgo = recordField(errors, tsconfig, 'tsgo', 'provider profile tsconfig contribution')
  assertStringValue(errors, stringField(errors, tsgo, 'diagnosticCommand', 'provider profile tsconfig.tsgo'), expectedTypecheckCommand, 'provider profile tsconfig.tsgo.diagnosticCommand')

  const nativeBackend = recordField(errors, tsgo, 'nativeBackend', 'provider profile tsconfig.tsgo')
  assertStringValue(errors, stringField(errors, nativeBackend, 'package', 'provider profile tsconfig.tsgo.nativeBackend'), '@typescript/native-preview', 'provider profile tsconfig.tsgo.nativeBackend.package')
  assertStringValue(errors, stringField(errors, nativeBackend, 'version', 'provider profile tsconfig.tsgo.nativeBackend'), expectedPackageBaseline['@typescript/native-preview'], 'provider profile tsconfig.tsgo.nativeBackend.version')
  assertStringValue(errors, stringField(errors, nativeBackend, 'setupCommand', 'provider profile tsconfig.tsgo.nativeBackend'), expectedPrepareCommand, 'provider profile tsconfig.tsgo.nativeBackend.setupCommand')

  assertJsonValue(errors, recordField(errors, tsgo, 'diagnosticGate', 'provider profile tsconfig.tsgo'), strictDiagnosticGate, 'provider profile tsconfig.tsgo.diagnosticGate')

  const ruleMapSource = recordField(errors, tsgo, 'ruleMapSource', 'provider profile tsconfig.tsgo')
  assertStringValue(errors, stringField(errors, ruleMapSource, 'metadata', 'provider profile tsconfig.tsgo.ruleMapSource'), 'repos/tsgo/_packages/tsgo/src/metadata.json', 'provider profile tsconfig.tsgo.ruleMapSource.metadata')
  assertStringValue(errors, stringField(errors, ruleMapSource, 'policy', 'provider profile tsconfig.tsgo.ruleMapSource'), 'harness/tsgo.md', 'provider profile tsconfig.tsgo.ruleMapSource.policy')
  assertStringValue(errors, stringField(errors, ruleMapSource, 'supportedEffect', 'provider profile tsconfig.tsgo.ruleMapSource'), 'v4', 'provider profile tsconfig.tsgo.ruleMapSource.supportedEffect')
  if (ruleMapSource?.ruleCount !== Object.keys(strictDiagnosticSeverity).length) {
    errors.push(`provider profile tsconfig.tsgo.ruleMapSource.ruleCount is ${String(ruleMapSource?.ruleCount ?? 'missing')}; expected ${Object.keys(strictDiagnosticSeverity).length}.`)
  }
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

interface ExpectedArtifactReference {
  readonly id: string
  readonly path: string
  readonly sourceEntry: string
}

function assertArtifactReference(
  errors: Array<string>,
  references: Record<string, unknown> | undefined,
  expected: ExpectedArtifactReference,
): void {
  const reference = recordField(errors, references, expected.id, 'provider profile.artifactReferences.references')
  assertStringValue(errors, stringField(errors, reference, 'sourceEntry', `provider profile.artifactReferences.references.${expected.id}`), expected.sourceEntry, `provider profile.artifactReferences.references.${expected.id}.sourceEntry`)
  assertStringValue(errors, stringField(errors, reference, 'path', `provider profile.artifactReferences.references.${expected.id}`), expected.path, `provider profile.artifactReferences.references.${expected.id}.path`)
  assertStringValue(errors, stringField(errors, reference, 'targetDelivery', `provider profile.artifactReferences.references.${expected.id}`), 'artifact-only', `provider profile.artifactReferences.references.${expected.id}.targetDelivery`)
}

function assertArtifactReferencesContract(
  errors: Array<string>,
  providerProfile: Record<string, unknown>,
  packageManifest: Record<string, unknown>,
): void {
  const artifactReferences = recordField(errors, providerProfile, 'artifactReferences', 'provider profile')
  assertStringValue(errors, stringField(errors, artifactReferences, 'mode', 'provider profile.artifactReferences'), 'provider-artifact-reference', 'provider profile.artifactReferences.mode')
  assertStringValue(errors, stringField(errors, artifactReferences, 'targetDelivery', 'provider profile.artifactReferences'), 'identity-only', 'provider profile.artifactReferences.targetDelivery')

  const packageFiles = arrayField(errors, packageManifest, 'files', 'package.json')
  const packageSurface = arrayField(errors, artifactReferences, 'packageSurface', 'provider profile.artifactReferences')
  for (const path of ['provider', 'harness', 'repos', 'repos/effect.subtree.json', 'repos/tsgo.subtree.json']) {
    assertArrayContainsString(errors, packageFiles, path, 'package.json.files')
    assertArrayContainsString(errors, packageSurface, path, 'provider profile.artifactReferences.packageSurface')
  }

  const references = recordField(errors, artifactReferences, 'references', 'provider profile.artifactReferences')
  assertArtifactReference(errors, references, {
    id: 'effect-source-tree',
    path: 'repos/effect',
    sourceEntry: 'effect-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'effect-source-contract',
    path: 'repos/effect.subtree.json',
    sourceEntry: 'effect-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'effect-anchor-doc',
    path: 'repos/effect/LLMS.md',
    sourceEntry: 'effect-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'effect-route-doc',
    path: 'harness/effect-routes.md',
    sourceEntry: 'effect-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'tsgo-source-tree',
    path: 'repos/tsgo',
    sourceEntry: 'tsgo-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'tsgo-source-contract',
    path: 'repos/tsgo.subtree.json',
    sourceEntry: 'tsgo-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'tsgo-anchor-doc',
    path: 'repos/tsgo/README.md',
    sourceEntry: 'tsgo-official-source',
  })
  assertArtifactReference(errors, references, {
    id: 'tsgo-route-doc',
    path: 'harness/tsgo-routes.md',
    sourceEntry: 'tsgo-official-source',
  })
}

export const verifyProviderProfileContract = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem
  const providerProfile = yield* readJson(`${harness}/provider/effect-harness.provider.json`, decodeJsonRecord)
  const effectContract = yield* readJson(`${harness}/repos/effect.subtree.json`, decodeJsonRecord)
  const tsgoContract = yield* readJson(`${harness}/repos/tsgo.subtree.json`, decodeJsonRecord)
  const packageManifest = yield* readJson(`${harness}/package.json`, decodeJsonRecord)
  const vscodeSettings = yield* readJson(`${harness}/.vscode/settings.json`, decodeJsonRecord)
  const eslintText = yield* fs.readFileString(`${harness}/eslint.config.mjs`)
  const workspaceText = yield* fs.readFileString(`${harness}/pnpm-workspace.yaml`)

  const provider = recordField(errors, providerProfile, 'provider', 'provider profile')
  assertStringValue(errors, stringField(errors, provider, 'id', 'provider profile.provider'), 'effect-harness', 'provider profile.provider.id')
  assertStringValue(errors, stringField(errors, provider, 'defaultProfile', 'provider profile.provider'), 'codex-effect-v4', 'provider profile.provider.defaultProfile')
  assertDeliveryModes(errors, providerProfile)
  assertSelfConformanceContract(errors, providerProfile)
  assertArtifactReferencesContract(errors, providerProfile, packageManifest)

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
  assertArrayContainsString(errors, arrayField(errors, sourceBoundary, 'targetMustNotReceive', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'harness/effect-routes.md', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetMustNotReceive')
  assertArrayContainsString(errors, arrayField(errors, sourceBoundary, 'targetMustNotReceive', 'provider profile.profiles.codex-effect-v4.sourceBoundary'), 'harness/tsgo-routes.md', 'provider profile.profiles.codex-effect-v4.sourceBoundary.targetMustNotReceive')

  const options = recordField(errors, profile, 'options', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, options, 'runtime', 'provider profile.profiles.codex-effect-v4.options')
  assertRecordDoesNotContain(errors, options, 'editorPolicy', 'provider profile.profiles.codex-effect-v4.options')

  assertPackageBaseline(errors, recordField(errors, profile, 'packageBaseline', 'provider profile.profiles.codex-effect-v4'))

  const managedSurfaces = recordField(errors, profile, 'managedSurfaces', 'provider profile.profiles.codex-effect-v4')
  const targetReceives = arrayField(errors, managedSurfaces, 'targetReceives', 'provider profile.profiles.codex-effect-v4.managedSurfaces')
  assertArrayContainsString(errors, targetReceives, 'provider record at .prelude/providers/effect-harness/provider.json', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayContainsString(errors, targetReceives, 'provider-managed docs bundle at .prelude/providers/effect-harness/docs', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayContainsString(errors, targetReceives, 'provider-managed snippets at .prelude/providers/effect-harness/snippets', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayContainsString(errors, targetReceives, 'editor policy structured pointer for target editor settings', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayContainsString(errors, targetReceives, 'lint, test, and verification policy records', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, 'runtime assets', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, 'AGENTS.md managed block', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, 'feedback', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  assertArrayDoesNotContainText(errors, targetReceives, '.effect-harness.json', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetReceives')
  const targetDoesNotReceive = arrayField(errors, managedSurfaces, 'targetDoesNotReceive', 'provider profile.profiles.codex-effect-v4.managedSurfaces')
  assertArrayContainsString(errors, targetDoesNotReceive, 'provider repo internal Effect route harness/effect-routes.md', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetDoesNotReceive')
  assertArrayContainsString(errors, targetDoesNotReceive, 'provider repo internal tsgo route harness/tsgo-routes.md', 'provider profile.profiles.codex-effect-v4.managedSurfaces.targetDoesNotReceive')

  assertRecordDoesNotContain(errors, profile, 'state', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, profile, 'officialSource', 'provider profile.profiles.codex-effect-v4')
  const contributions = recordField(errors, profile, 'contributions', 'provider profile.profiles.codex-effect-v4')
  assertRecordDoesNotContain(errors, contributions, 'runtimeAssets', 'provider profile.profiles.codex-effect-v4.contributions')
  assertRecordDoesNotContain(errors, contributions, 'agentsBlock', 'provider profile.profiles.codex-effect-v4.contributions')
  assertRecordDoesNotContain(errors, contributions, 'codexAssets', 'provider profile.profiles.codex-effect-v4.contributions')
  assertPackageJsonContribution(errors, contributions, packageManifest, workspaceText)
  assertTsconfigContributionMetadata(errors, contributions)
  assertEditorPolicyContribution(errors, contributions, effectContract, tsgoContract, vscodeSettings)
  assertLintGuardrailsContribution(errors, contributions, packageManifest, eslintText)
  assertTestPolicyContribution(errors, contributions)
  assertVerificationPolicyContribution(errors, contributions, packageManifest)

  yield* assertManagedFileBundle(
    errors,
    harness,
    recordField(errors, contributions, 'documentationBundle', 'provider profile.profiles.codex-effect-v4.contributions'),
    '.prelude/providers/effect-harness/docs',
    [
      {
        id: 'effect-code',
        requiredKeywords: ['Effect Code', '@effect/vitest', 'Context.Service', 'effect/unstable/cli'],
        sourcePath: 'provider/docs/effect-code.md',
        targetPath: 'effect-code.md',
      },
      {
        id: 'diagnostics',
        requiredKeywords: ['tsgo --noEmit', '@effect/language-service', 'diagnostic gate', 'drift'],
        sourcePath: 'provider/docs/diagnostics.md',
        targetPath: 'diagnostics.md',
      },
      {
        id: 'editor-policy',
        requiredKeywords: ['auto-import', 'watch exclusion', 'search exclusion', 'file visibility'],
        sourcePath: 'provider/docs/editor-policy.md',
        targetPath: 'editor-policy.md',
      },
      {
        id: 'managed-surfaces',
        requiredKeywords: ['Managed Surfaces', 'target-managed surfaces', 'Artifact-Only', 'Snippets', 'Feedback Loop', 'local drift'],
        sourcePath: 'provider/docs/managed-surfaces.md',
        targetPath: 'managed-surfaces.md',
      },
      {
        id: 'discovery',
        requiredKeywords: ['Provider Discovery', 'provider-discover', 'Prelude', 'target-managed surfaces', 'artifact-only', 'internal harness'],
        sourcePath: 'provider/docs/discovery.md',
        targetPath: 'discovery.md',
      },
      {
        id: 'package-config',
        requiredKeywords: ['Package', 'effect-tsgo patch', 'tsgo --noEmit', 'tsconfig.json'],
        sourcePath: 'provider/docs/package-config.md',
        targetPath: 'package-config.md',
      },
      {
        id: 'quality-policy',
        requiredKeywords: ['lint policy', 'test policy', 'verification policy', 'Prelude'],
        sourcePath: 'provider/docs/quality-policy.md',
        targetPath: 'quality-policy.md',
      },
      {
        id: 'source-identity',
        requiredKeywords: ['Source Identity', 'artifact-only', 'target delivery', 'source pin lifecycle', 'Partita', 'provider record'],
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
        requiredKeywords: ['Effect Harness Snippet', 'provider-managed source content', 'target `AGENTS.md` block'],
        sourcePath: 'provider/snippets/agents.md',
        targetPath: 'agents.md',
        targetUsage: 'manual-copy-or-include-only',
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
