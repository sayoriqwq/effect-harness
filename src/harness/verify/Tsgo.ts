import { Effect, FileSystem, Result } from 'effect'
import { readJson } from '../../platform/Json.ts'
import { commandString } from '../../platform/Process.ts'
import { errorMessage, HarnessError } from '../Errors.ts'
import { isRecord } from './JsonFields.ts'
import { readTsgoStrictRuleMap } from './TsgoMetadata.ts'
import {
  expectedEffectTsgoVersion,
  expectedPackageBaseline,
  expectedPrepareCommand,
  expectedTypecheckCommand,
  requiredTsgoPolicyKeywords,
  strictDiagnosticGate,
  strictDiagnosticSeverity,
  strictLanguageServicePlugin,
} from './TsgoPolicy.ts'
import { assertNoEffectDiagnosticSuppressions } from './TsgoSuppressions.ts'

function decodeJsonRecord(value: unknown, source: string) {
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

function stringRecordField(
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

function assertStringValue(
  errors: Array<string>,
  actual: unknown,
  expected: string,
  source: string,
): void {
  if (actual !== expected) {
    errors.push(`${source} is ${String(actual ?? 'missing')}; expected ${expected}.`)
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

function assertDeepEqual(errors: Array<string>, actual: unknown, expected: unknown, source: string): void {
  if (stableJson(actual) !== stableJson(expected)) {
    errors.push(`${source} does not match the strict tsgo policy.`)
  }
}

function findLanguageServicePlugin(
  errors: Array<string>,
  plugins: ReadonlyArray<unknown> | undefined,
  source: string,
): Record<string, unknown> | undefined {
  if (plugins === undefined) {
    return undefined
  }

  for (const plugin of plugins) {
    if (isRecord(plugin) && plugin.name === '@effect/language-service') {
      return plugin
    }
  }

  errors.push(`${source} must include @effect/language-service plugin.`)
  return undefined
}

function assertLanguageServicePlugin(
  errors: Array<string>,
  plugin: Record<string, unknown> | undefined,
  source: string,
): void {
  if (plugin === undefined) {
    return
  }

  if ('options' in plugin) {
    errors.push(`${source} must use the current @effect/language-service plugin shape.`)
  }
  if ('overrides' in plugin) {
    errors.push(`${source}.overrides must not lower the strict tsgo policy.`)
  }
  if (plugin.diagnosticSeverity === null) {
    errors.push(`${source}.diagnosticSeverity must not be null.`)
    return
  }

  assertDeepEqual(errors, plugin, strictLanguageServicePlugin, source)
}

function assertTsconfig(errors: Array<string>, tsconfig: Record<string, unknown>, source: string): void {
  const compilerOptions = recordField(errors, tsconfig, 'compilerOptions', source)
  const plugins = arrayField(errors, compilerOptions, 'plugins', `${source}.compilerOptions`)
  assertLanguageServicePlugin(
    errors,
    findLanguageServicePlugin(errors, plugins, `${source}.compilerOptions.plugins`),
    `${source}.compilerOptions.plugins[@effect/language-service]`,
  )
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

function assertProviderTsgoPolicy(errors: Array<string>, codexProfile: Record<string, unknown> | undefined): void {
  const tsgoPolicy = recordField(errors, codexProfile, 'tsgoPolicy', 'provider profile.profiles.codex-effect-v4')
  assertStringValue(errors, tsgoPolicy?.mode, 'strict-v4', 'provider profile tsgoPolicy.mode')
  assertStringValue(errors, tsgoPolicy?.effectVersion, expectedPackageBaseline.effect, 'provider profile tsgoPolicy.effectVersion')
  assertStringValue(errors, tsgoPolicy?.tsgoVersion, expectedPackageBaseline['@effect/tsgo'], 'provider profile tsgoPolicy.tsgoVersion')
  assertStringValue(errors, tsgoPolicy?.languageServiceVersion, expectedPackageBaseline['@effect/language-service'], 'provider profile tsgoPolicy.languageServiceVersion')
  assertStringValue(errors, tsgoPolicy?.sourceEntry, 'tsgo-official-source', 'provider profile tsgoPolicy.sourceEntry')

  const nativeBackend = recordField(errors, tsgoPolicy, 'nativeBackend', 'provider profile tsgoPolicy')
  assertStringValue(errors, nativeBackend?.package, '@typescript/native-preview', 'provider profile tsgoPolicy.nativeBackend.package')
  assertStringValue(errors, nativeBackend?.version, expectedPackageBaseline['@typescript/native-preview'], 'provider profile tsgoPolicy.nativeBackend.version')

  const diagnosticGate = recordField(errors, tsgoPolicy, 'diagnosticGate', 'provider profile tsgoPolicy')
  assertDeepEqual(errors, diagnosticGate, strictDiagnosticGate, 'provider profile tsgoPolicy.diagnosticGate')

  const ruleMapSource = recordField(errors, tsgoPolicy, 'ruleMapSource', 'provider profile tsgoPolicy')
  assertStringValue(errors, ruleMapSource?.metadata, 'repos/tsgo/_packages/tsgo/src/metadata.json', 'provider profile tsgoPolicy.ruleMapSource.metadata')
  assertStringValue(errors, ruleMapSource?.policy, 'harness/tsgo.md', 'provider profile tsgoPolicy.ruleMapSource.policy')
  assertStringValue(errors, ruleMapSource?.supportedEffect, 'v4', 'provider profile tsgoPolicy.ruleMapSource.supportedEffect')
  if (ruleMapSource?.ruleCount !== Object.keys(strictDiagnosticSeverity).length) {
    errors.push(`provider profile tsgoPolicy.ruleMapSource.ruleCount is ${String(ruleMapSource?.ruleCount ?? 'missing')}; expected ${Object.keys(strictDiagnosticSeverity).length}.`)
  }

  assertDeepEqual(
    errors,
    recordField(errors, tsgoPolicy, 'diagnosticSeverity', 'provider profile tsgoPolicy'),
    strictDiagnosticSeverity,
    'provider profile tsgoPolicy.diagnosticSeverity',
  )
  assertDeepEqual(
    errors,
    recordField(errors, tsgoPolicy, 'languageServicePlugin', 'provider profile tsgoPolicy'),
    strictLanguageServicePlugin,
    'provider profile tsgoPolicy.languageServicePlugin',
  )
}

function assertProviderTsgoContribution(errors: Array<string>, profile: Record<string, unknown>): void {
  const profiles = recordField(errors, profile, 'profiles', 'provider profile')
  const codexProfile = recordField(errors, profiles, 'codex-effect-v4', 'provider profile.profiles')
  const contributions = recordField(errors, codexProfile, 'contributions', 'provider profile.profiles.codex-effect-v4')
  const packageJson = recordField(errors, contributions, 'packageJson', 'provider profile.profiles.codex-effect-v4.contributions')
  const scripts = recordField(errors, packageJson, 'scripts', 'provider profile.profiles.codex-effect-v4.contributions.packageJson')
  const prepare = recordField(errors, scripts, 'prepare', 'provider profile.profiles.codex-effect-v4.contributions.packageJson.scripts')
  const typecheck = recordField(errors, scripts, 'typecheck', 'provider profile.profiles.codex-effect-v4.contributions.packageJson.scripts')
  assertStringValue(errors, prepare?.defaultCommand, expectedPrepareCommand, 'provider profile contributions packageJson.scripts.prepare.defaultCommand')
  assertStringValue(errors, typecheck?.defaultCommand, expectedTypecheckCommand, 'provider profile contributions packageJson.scripts.typecheck.defaultCommand')

  const tsconfig = recordField(errors, contributions, 'tsconfig', 'provider profile.profiles.codex-effect-v4.contributions')
  const compilerOptions = recordField(errors, tsconfig, 'compilerOptions', 'provider profile contributions tsconfig')
  const plugins = arrayField(errors, compilerOptions, 'plugins', 'provider profile contributions tsconfig.compilerOptions')
  assertLanguageServicePlugin(
    errors,
    findLanguageServicePlugin(errors, plugins, 'provider profile contributions tsconfig.compilerOptions.plugins'),
    'provider profile contributions tsconfig.compilerOptions.plugins[@effect/language-service]',
  )
  assertProviderTsgoPolicy(errors, codexProfile)
  assertPackageBaseline(errors, recordField(errors, codexProfile, 'packageBaseline', 'provider profile.profiles.codex-effect-v4'))
}

function assertPackageTypecheckScript(errors: Array<string>, packageJson: Record<string, unknown>): void {
  const scripts = stringRecordField(errors, packageJson, 'scripts', 'package.json')
  assertStringValue(errors, scripts?.prepare, expectedPrepareCommand, 'package.json.scripts.prepare')
  assertStringValue(errors, scripts?.typecheck, expectedTypecheckCommand, 'package.json.scripts.typecheck')
}

function assertStrictRuleMap(errors: Array<string>, metadataRuleMap: Readonly<Record<string, string>>): void {
  assertDeepEqual(errors, metadataRuleMap, strictDiagnosticSeverity, 'repos/tsgo metadata derived strict rule map')
}

function assertTsgoPolicyDocument(errors: Array<string>, text: string): void {
  for (const keyword of requiredTsgoPolicyKeywords) {
    if (!text.includes(keyword)) {
      errors.push(`harness/tsgo.md must contain policy keyword ${keyword}.`)
    }
  }
  for (const ruleName of Object.keys(strictDiagnosticSeverity)) {
    if (!text.includes(ruleName)) {
      errors.push(`harness/tsgo.md POLICY_RULE_MAP must record ${ruleName}.`)
    }
  }
}

const verifyEffectTsgoBinary = Effect.fnUntraced(function* (errors: Array<string>, root: string) {
  const result = yield* Effect.result(commandString('pnpm', ['exec', 'effect-tsgo', '--version'], { cwd: root }))

  if (Result.isFailure(result)) {
    errors.push(`effect-tsgo --version failed: ${errorMessage(result.failure)}`)
    return
  }

  if (!result.success.includes(expectedEffectTsgoVersion)) {
    errors.push(`effect-tsgo version output is ${result.success}; expected ${expectedEffectTsgoVersion}.`)
  }

  const tsgoResult = yield* Effect.result(commandString('pnpm', ['exec', 'tsgo', '--version'], { cwd: root }))

  if (Result.isFailure(tsgoResult)) {
    errors.push(`tsgo --version failed: ${errorMessage(tsgoResult.failure)}`)
    return
  }

  if (!tsgoResult.success.includes(`effect-tsgo.${expectedEffectTsgoVersion}`)) {
    errors.push(`tsgo version output is ${tsgoResult.success}; expected Effect TypeScript-Go ${expectedEffectTsgoVersion}.`)
  }
})

export const verifyTsgoBaseline = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem
  const tsconfig = yield* readJson(`${harness}/tsconfig.json`, decodeJsonRecord)
  const providerProfile = yield* readJson(`${harness}/provider/effect-harness.provider.json`, decodeJsonRecord)
  const packageJson = yield* readJson(`${harness}/package.json`, decodeJsonRecord)
  const tsgoPolicyText = yield* fs.readFileString(`${harness}/harness/tsgo.md`)
  const metadataRuleMap = yield* readTsgoStrictRuleMap(harness)

  assertTsconfig(errors, tsconfig, 'tsconfig.json')
  assertProviderTsgoContribution(errors, providerProfile)
  assertPackageTypecheckScript(errors, packageJson)
  assertStrictRuleMap(errors, metadataRuleMap)
  assertTsgoPolicyDocument(errors, tsgoPolicyText)
  yield* assertNoEffectDiagnosticSuppressions(errors, harness)
  yield* verifyEffectTsgoBinary(errors, harness)
})
