import * as Effect from 'effect/Effect'
import * as Result from 'effect/Result'
import { readJson } from '../../platform/Json.ts'
import { commandString } from '../../platform/Process.ts'
import { errorMessage, HarnessError } from '../Errors.ts'
import { isRecord } from './JsonFields.ts'

const expectedEffectTsgoVersion = '0.15.0'
const expectedPrepareCommand = 'effect-tsgo patch'
const expectedTypecheckCommand = 'tsgo --noEmit'

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

function assertBooleanNotTrue(
  errors: Array<string>,
  actual: unknown,
  source: string,
): void {
  if (actual === true) {
    errors.push(`${source} must not be true in the new tsgo baseline.`)
  }
  else if (actual !== undefined && typeof actual !== 'boolean') {
    errors.push(`${source} must be a boolean when present.`)
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

  if (plugin.diagnostics !== undefined && plugin.diagnostics !== true) {
    errors.push(`${source}.diagnostics must be true when present.`)
  }

  if (plugin.diagnosticSeverity === null) {
    errors.push(`${source}.diagnosticSeverity must not be null.`)
  }
  else if (!isRecord(plugin.diagnosticSeverity)) {
    errors.push(`${source}.diagnosticSeverity must be an object.`)
  }
  else {
    assertStringValue(
      errors,
      plugin.diagnosticSeverity.floatingEffect,
      'error',
      `${source}.diagnosticSeverity.floatingEffect`,
    )
  }

  assertBooleanNotTrue(errors, plugin.ignoreEffectWarningsInTscExitCode, `${source}.ignoreEffectWarningsInTscExitCode`)
  assertBooleanNotTrue(errors, plugin.ignoreEffectErrorsInTscExitCode, `${source}.ignoreEffectErrorsInTscExitCode`)
}

function assertTsconfig(errors: Array<string>, tsconfig: Record<string, unknown>, source: string): void {
  const compilerOptions = recordField(errors, tsconfig, 'compilerOptions', source)
  const plugins = arrayField(errors, compilerOptions, 'plugins', `${source}.compilerOptions`)
  assertLanguageServicePlugin(errors, findLanguageServicePlugin(errors, plugins, `${source}.compilerOptions.plugins`), `${source}.compilerOptions.plugins[@effect/language-service]`)
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
}

function assertPackageTypecheckScript(errors: Array<string>, packageJson: Record<string, unknown>): void {
  const scripts = stringRecordField(errors, packageJson, 'scripts', 'package.json')
  assertStringValue(errors, scripts?.prepare, expectedPrepareCommand, 'package.json.scripts.prepare')
  assertStringValue(errors, scripts?.typecheck, expectedTypecheckCommand, 'package.json.scripts.typecheck')
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
  const tsconfig = yield* readJson(`${harness}/tsconfig.json`, decodeJsonRecord)
  const providerProfile = yield* readJson(`${harness}/harness/provider/effect-harness.provider.json`, decodeJsonRecord)
  const packageJson = yield* readJson(`${harness}/package.json`, decodeJsonRecord)

  assertTsconfig(errors, tsconfig, 'tsconfig.json')
  assertProviderTsgoContribution(errors, providerProfile)
  assertPackageTypecheckScript(errors, packageJson)
  yield* verifyEffectTsgoBinary(errors, harness)
})
