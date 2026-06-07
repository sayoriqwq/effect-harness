import * as Effect from 'effect/Effect'
import { HarnessError } from './Errors.ts'

export interface EffectSubtreeManifest {
  readonly name?: string | undefined
  readonly repository: string
  readonly branch: string
  readonly prefix: string
  readonly split: string
  readonly llmDocument: string
  readonly packageBaseline: Readonly<Record<string, string>>
}

export interface OfficialSnapshot {
  readonly packages?: Readonly<Record<string, string>> | undefined
  readonly sourceHead?: string | undefined
}

export interface PackageJson {
  readonly name?: string
  readonly type?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  readonly [key: string]: unknown
}

export interface TsConfig {
  compilerOptions?: {
    plugins?: Array<Record<string, unknown>>
    readonly [key: string]: unknown
  }
  readonly [key: string]: unknown
}

export interface ManagedWriteOptions {
  readonly dryRun: boolean
}

export interface PackageTarget {
  readonly name: string
  readonly tag: string
}

export const packageTargets: ReadonlyArray<PackageTarget> = [
  { name: 'effect', tag: 'beta' },
  { name: '@effect/platform-node', tag: 'beta' },
  { name: '@effect/vitest', tag: 'beta' },
  { name: '@effect/tsgo', tag: 'latest' },
  { name: '@effect/language-service', tag: 'latest' },
  { name: '@typescript/native-preview', tag: 'latest' },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<string, HarnessError> {
  const value = record[key]
  return typeof value === 'string'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain string field: ${key}` }))
}

function optionalStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function stringRecordField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<Record<string, string>, HarnessError> {
  const value = record[key]
  if (!isRecord(value)) {
    return Effect.fail(new HarnessError({ message: `${source} must contain object field: ${key}` }))
  }

  const result: Record<string, string> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== 'string') {
      return Effect.fail(new HarnessError({ message: `${source}.${key}.${entryKey} must be a string` }))
    }
    result[entryKey] = entryValue
  }
  return Effect.succeed(result)
}

function optionalStringRecordField(
  record: Record<string, unknown>,
  key: string,
  source: string,
): Effect.Effect<Record<string, string> | undefined, HarnessError> {
  const value = record[key]
  if (value === undefined) {
    return Effect.sync((): Record<string, string> | undefined => undefined)
  }
  if (!isRecord(value)) {
    return Effect.fail(new HarnessError({ message: `${source}.${key} must be an object when present` }))
  }

  const result: Record<string, string> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (typeof entryValue !== 'string') {
      return Effect.fail(new HarnessError({ message: `${source}.${key}.${entryKey} must be a string` }))
    }
    result[entryKey] = entryValue
  }
  return Effect.succeed(result)
}

function optionalRecordField(
  record: Record<string, unknown>,
  key: string,
  source: string,
): Effect.Effect<Record<string, unknown> | undefined, HarnessError> {
  const value = record[key]
  if (value === undefined) {
    return Effect.sync((): Record<string, unknown> | undefined => undefined)
  }
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source}.${key} must be an object when present` }))
}

function optionalPluginArrayField(
  record: Record<string, unknown>,
  key: string,
  source: string,
): Effect.Effect<Array<Record<string, unknown>> | undefined, HarnessError> {
  const value = record[key]
  if (value === undefined) {
    return Effect.sync((): Array<Record<string, unknown>> | undefined => undefined)
  }
  if (!Array.isArray(value)) {
    return Effect.fail(new HarnessError({ message: `${source}.${key} must be an array when present` }))
  }

  const result: Array<Record<string, unknown>> = []
  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      return Effect.fail(new HarnessError({ message: `${source}.${key}[${index}] must be an object` }))
    }
    result.push(entry)
  }
  return Effect.succeed(result)
}

export function decodeManifest(value: unknown, source: string): Effect.Effect<EffectSubtreeManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    return {
      name: optionalStringField(value, 'name'),
      repository: yield* stringField(value, 'repository', source),
      branch: yield* stringField(value, 'branch', source),
      prefix: yield* stringField(value, 'prefix', source),
      split: yield* stringField(value, 'split', source),
      llmDocument: yield* stringField(value, 'llmDocument', source),
      packageBaseline: yield* stringRecordField(value, 'packageBaseline', source),
    }
  })
}

export function decodePackageJson(value: unknown, source: string): Effect.Effect<PackageJson, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const packageJson: PackageJson = { ...value }
    const scripts = yield* optionalStringRecordField(value, 'scripts', source)
    const dependencies = yield* optionalStringRecordField(value, 'dependencies', source)
    const devDependencies = yield* optionalStringRecordField(value, 'devDependencies', source)
    const peerDependencies = yield* optionalStringRecordField(value, 'peerDependencies', source)
    const optionalDependencies = yield* optionalStringRecordField(value, 'optionalDependencies', source)

    if (scripts !== undefined) {
      packageJson.scripts = scripts
    }
    if (dependencies !== undefined) {
      packageJson.dependencies = dependencies
    }
    if (devDependencies !== undefined) {
      packageJson.devDependencies = devDependencies
    }
    if (peerDependencies !== undefined) {
      packageJson.peerDependencies = peerDependencies
    }
    if (optionalDependencies !== undefined) {
      packageJson.optionalDependencies = optionalDependencies
    }

    return packageJson
  })
}

export function decodeTsConfig(value: unknown, source: string): Effect.Effect<TsConfig, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const tsconfig: TsConfig = { ...value }
    const compilerOptions = yield* optionalRecordField(value, 'compilerOptions', source)
    if (compilerOptions !== undefined) {
      const plugins = yield* optionalPluginArrayField(compilerOptions, 'plugins', `${source}.compilerOptions`)
      tsconfig.compilerOptions = { ...compilerOptions }
      if (plugins !== undefined) {
        tsconfig.compilerOptions.plugins = plugins
      }
    }
    return tsconfig
  })
}

export function decodeOfficialSnapshot(value: unknown, source: string): Effect.Effect<OfficialSnapshot, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const packages = value.packages
    if (packages !== undefined && !isRecord(packages)) {
      return yield* new HarnessError({ message: `${source}.packages must be an object when present` })
    }

    if (packages !== undefined) {
      for (const [name, version] of Object.entries(packages)) {
        if (typeof version !== 'string') {
          return yield* new HarnessError({ message: `${source}.packages.${name} must be a string` })
        }
      }
    }

    const sourceHead = value.sourceHead
    if (sourceHead !== undefined && typeof sourceHead !== 'string') {
      return yield* new HarnessError({ message: `${source}.sourceHead must be a string when present` })
    }

    return {
      packages: packages as Record<string, string> | undefined,
      sourceHead,
    }
  })
}
