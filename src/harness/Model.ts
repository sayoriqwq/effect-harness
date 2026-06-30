import * as Effect from 'effect/Effect'
import { HarnessError } from './Errors.ts'

const effectSourceEntryKind = 'source-entry'
const effectSourceEntryMechanism = 'git-subtree'
const effectSourceEntryName = 'effect'
const effectSourceEntryCommands = {
  update: 'pnpm effect:update',
  verify: 'pnpm effect:verify',
} as const

type EffectSourceEntryScope = 'application' | 'test'

interface EffectSourceEntryContract {
  readonly upstream: {
    readonly repository: string
    readonly branch: string
  }
  readonly local: {
    readonly prefix: string
  }
  readonly pin: {
    readonly split: string
  }
  readonly anchor: {
    readonly llmDocument: string
  }
  readonly mode: {
    readonly readOnly: true
    readonly referenceOnly: true
  }
  readonly commands: {
    readonly update: typeof effectSourceEntryCommands.update
    readonly verify: typeof effectSourceEntryCommands.verify
  }
  readonly agent: {
    readonly route: string
  }
  readonly importBlock: {
    readonly enabled: true
    readonly prefix: string
    readonly appliesTo: ReadonlyArray<EffectSourceEntryScope>
  }
}

export interface EffectSubtreeManifest {
  readonly name: typeof effectSourceEntryName
  readonly kind: typeof effectSourceEntryKind
  readonly mechanism: typeof effectSourceEntryMechanism
  readonly repository: string
  readonly branch: string
  readonly prefix: string
  readonly split: string
  readonly llmDocument: string
  readonly sourceEntry: EffectSourceEntryContract
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

function recordField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<Record<string, unknown>, HarnessError> {
  const value = record[key]
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain object field: ${key}` }))
}

function stringField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<string, HarnessError> {
  const value = record[key]
  return typeof value === 'string'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain string field: ${key}` }))
}

function literalStringField<const A extends string>(
  record: Record<string, unknown>,
  key: string,
  expected: A,
  source: string,
): Effect.Effect<A, HarnessError> {
  return Effect.gen(function* () {
    const value = yield* stringField(record, key, source)
    if (value !== expected) {
      return yield* new HarnessError({ message: `${source}.${key} must be ${expected}; got ${value}` })
    }
    return expected
  })
}

function trueField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<true, HarnessError> {
  const value = record[key]
  return value === true
    ? Effect.succeed(true)
    : Effect.fail(new HarnessError({ message: `${source}.${key} must be true` }))
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

function sourceEntryScopeField(
  record: Record<string, unknown>,
  key: string,
  source: string,
): Effect.Effect<Array<EffectSourceEntryScope>, HarnessError> {
  return Effect.gen(function* () {
    const value = record[key]
    if (!Array.isArray(value)) {
      return yield* new HarnessError({ message: `${source}.${key} must be an array` })
    }

    const result: Array<EffectSourceEntryScope> = []
    for (const [index, entry] of value.entries()) {
      if (entry !== 'application' && entry !== 'test') {
        return yield* new HarnessError({ message: `${source}.${key}[${index}] must be application or test` })
      }
      result.push(entry)
    }

    for (const required of ['application', 'test'] as const) {
      if (!result.includes(required)) {
        return yield* new HarnessError({ message: `${source}.${key} must include ${required}` })
      }
    }

    return result
  })
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

function assertSameString(
  source: string,
  actualField: string,
  actual: string,
  expectedField: string,
  expected: string,
): Effect.Effect<void, HarnessError> {
  return actual === expected
    ? Effect.void
    : Effect.fail(new HarnessError({
        message: `${source} source-entry metadata mismatch: ${actualField} is ${actual}; expected ${expectedField} ${expected}`,
      }))
}

function decodeSourceEntry(
  value: Record<string, unknown>,
  source: string,
  expected: {
    readonly repository: string
    readonly branch: string
    readonly prefix: string
    readonly split: string
    readonly llmDocument: string
  },
): Effect.Effect<EffectSourceEntryContract, HarnessError> {
  return Effect.gen(function* () {
    const upstreamValue = yield* recordField(value, 'upstream', source)
    const localValue = yield* recordField(value, 'local', source)
    const pinValue = yield* recordField(value, 'pin', source)
    const anchorValue = yield* recordField(value, 'anchor', source)
    const modeValue = yield* recordField(value, 'mode', source)
    const commandsValue = yield* recordField(value, 'commands', source)
    const agentValue = yield* recordField(value, 'agent', source)
    const importBlockValue = yield* recordField(value, 'importBlock', source)

    const repository = yield* stringField(upstreamValue, 'repository', `${source}.upstream`)
    const branch = yield* stringField(upstreamValue, 'branch', `${source}.upstream`)
    const prefix = yield* stringField(localValue, 'prefix', `${source}.local`)
    const split = yield* stringField(pinValue, 'split', `${source}.pin`)
    const llmDocument = yield* stringField(anchorValue, 'llmDocument', `${source}.anchor`)
    const route = yield* stringField(agentValue, 'route', `${source}.agent`)
    const importPrefix = yield* stringField(importBlockValue, 'prefix', `${source}.importBlock`)
    const appliesTo = yield* sourceEntryScopeField(importBlockValue, 'appliesTo', `${source}.importBlock`)

    yield* assertSameString(source, 'sourceEntry.upstream.repository', repository, 'repository', expected.repository)
    yield* assertSameString(source, 'sourceEntry.upstream.branch', branch, 'branch', expected.branch)
    yield* assertSameString(source, 'sourceEntry.local.prefix', prefix, 'prefix', expected.prefix)
    yield* assertSameString(source, 'sourceEntry.pin.split', split, 'split', expected.split)
    yield* assertSameString(source, 'sourceEntry.anchor.llmDocument', llmDocument, 'llmDocument', expected.llmDocument)
    yield* assertSameString(source, 'sourceEntry.agent.route', route, 'llmDocument', expected.llmDocument)
    yield* assertSameString(source, 'sourceEntry.importBlock.prefix', importPrefix, 'prefix', expected.prefix)

    return {
      upstream: {
        repository,
        branch,
      },
      local: {
        prefix,
      },
      pin: {
        split,
      },
      anchor: {
        llmDocument,
      },
      mode: {
        readOnly: yield* trueField(modeValue, 'readOnly', `${source}.mode`),
        referenceOnly: yield* trueField(modeValue, 'referenceOnly', `${source}.mode`),
      },
      commands: {
        update: yield* literalStringField(commandsValue, 'update', effectSourceEntryCommands.update, `${source}.commands`),
        verify: yield* literalStringField(commandsValue, 'verify', effectSourceEntryCommands.verify, `${source}.commands`),
      },
      agent: {
        route,
      },
      importBlock: {
        enabled: yield* trueField(importBlockValue, 'enabled', `${source}.importBlock`),
        prefix: importPrefix,
        appliesTo,
      },
    }
  })
}

export function decodeManifest(value: unknown, source: string): Effect.Effect<EffectSubtreeManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const repository = yield* stringField(value, 'repository', source)
    const branch = yield* stringField(value, 'branch', source)
    const prefix = yield* stringField(value, 'prefix', source)
    const split = yield* stringField(value, 'split', source)
    const llmDocument = yield* stringField(value, 'llmDocument', source)
    const sourceEntryValue = yield* recordField(value, 'sourceEntry', source)

    return {
      name: yield* literalStringField(value, 'name', effectSourceEntryName, source),
      kind: yield* literalStringField(value, 'kind', effectSourceEntryKind, source),
      mechanism: yield* literalStringField(value, 'mechanism', effectSourceEntryMechanism, source),
      repository,
      branch,
      prefix,
      split,
      llmDocument,
      sourceEntry: yield* decodeSourceEntry(sourceEntryValue, `${source}.sourceEntry`, {
        branch,
        llmDocument,
        prefix,
        repository,
        split,
      }),
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
