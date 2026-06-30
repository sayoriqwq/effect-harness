import * as Effect from 'effect/Effect'
import { HarnessError } from './Errors.ts'

export interface EffectSubtreeManifest {
  readonly name: 'effect'
  readonly kind: 'source-entry'
  readonly mechanism: 'git-subtree'
  readonly repository: string
  readonly branch: string
  readonly prefix: string
  readonly split: string
  readonly llmDocument: string
  readonly packageBaseline: Readonly<Record<string, string>>
}

export interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  readonly [key: string]: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

export function decodeManifest(value: unknown, source: string): Effect.Effect<EffectSubtreeManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    return {
      name: yield* literalStringField(value, 'name', 'effect', source),
      kind: yield* literalStringField(value, 'kind', 'source-entry', source),
      mechanism: yield* literalStringField(value, 'mechanism', 'git-subtree', source),
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
    const dependencies = yield* optionalStringRecordField(value, 'dependencies', source)
    const devDependencies = yield* optionalStringRecordField(value, 'devDependencies', source)
    const peerDependencies = yield* optionalStringRecordField(value, 'peerDependencies', source)
    const optionalDependencies = yield* optionalStringRecordField(value, 'optionalDependencies', source)

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
