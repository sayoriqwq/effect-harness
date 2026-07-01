import * as Effect from 'effect/Effect'
import { HarnessError } from './Errors.ts'

export interface EffectSubtreeManifest {
  readonly schemaVersion: 1
  readonly name: 'effect'
  readonly kind: 'github-subtree'
  readonly github: {
    readonly repository: string
    readonly url: string
    readonly branch: string
    readonly ref: string
  }
  readonly local: {
    readonly prefix: string
  }
  readonly subtree: {
    readonly split: string
    readonly trailer: string
  }
  readonly anchor: {
    readonly llmDocument: string
  }
  readonly agent: {
    readonly route: string
  }
  readonly commands: {
    readonly status: string
    readonly update: string
    readonly verify: string
  }
  readonly editorPolicy: {
    readonly autoImportExclude: string
    readonly watcherExclude: string
    readonly searchExclude: string
    readonly filesExclude: string
  }
  readonly ownership: {
    readonly mode: string
  }
  readonly boundaries: {
    readonly readOnly: boolean
    readonly importBlock: boolean
  }
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

function numberField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<number, HarnessError> {
  const value = record[key]
  return typeof value === 'number'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain number field: ${key}` }))
}

function booleanField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<boolean, HarnessError> {
  const value = record[key]
  return typeof value === 'boolean'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain boolean field: ${key}` }))
}

function recordField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<Record<string, unknown>, HarnessError> {
  const value = record[key]
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain object field: ${key}` }))
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

function literalNumberField<const A extends number>(
  record: Record<string, unknown>,
  key: string,
  expected: A,
  source: string,
): Effect.Effect<A, HarnessError> {
  return Effect.gen(function* () {
    const value = yield* numberField(record, key, source)
    if (value !== expected) {
      return yield* new HarnessError({ message: `${source}.${key} must be ${expected}; got ${String(value)}` })
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

    const github = yield* recordField(value, 'github', source)
    const local = yield* recordField(value, 'local', source)
    const subtree = yield* recordField(value, 'subtree', source)
    const anchor = yield* recordField(value, 'anchor', source)
    const agent = yield* recordField(value, 'agent', source)
    const commands = yield* recordField(value, 'commands', source)
    const editorPolicy = yield* recordField(value, 'editorPolicy', source)
    const ownership = yield* recordField(value, 'ownership', source)
    const boundaries = yield* recordField(value, 'boundaries', source)

    return {
      schemaVersion: yield* literalNumberField(value, 'schemaVersion', 1, source),
      name: yield* literalStringField(value, 'name', 'effect', source),
      kind: yield* literalStringField(value, 'kind', 'github-subtree', source),
      github: {
        repository: yield* stringField(github, 'repository', `${source}.github`),
        url: yield* stringField(github, 'url', `${source}.github`),
        branch: yield* stringField(github, 'branch', `${source}.github`),
        ref: yield* stringField(github, 'ref', `${source}.github`),
      },
      local: {
        prefix: yield* stringField(local, 'prefix', `${source}.local`),
      },
      subtree: {
        split: yield* stringField(subtree, 'split', `${source}.subtree`),
        trailer: yield* stringField(subtree, 'trailer', `${source}.subtree`),
      },
      anchor: {
        llmDocument: yield* stringField(anchor, 'llmDocument', `${source}.anchor`),
      },
      agent: {
        route: yield* stringField(agent, 'route', `${source}.agent`),
      },
      commands: {
        status: yield* stringField(commands, 'status', `${source}.commands`),
        update: yield* stringField(commands, 'update', `${source}.commands`),
        verify: yield* stringField(commands, 'verify', `${source}.commands`),
      },
      editorPolicy: {
        autoImportExclude: yield* stringField(editorPolicy, 'autoImportExclude', `${source}.editorPolicy`),
        watcherExclude: yield* stringField(editorPolicy, 'watcherExclude', `${source}.editorPolicy`),
        searchExclude: yield* stringField(editorPolicy, 'searchExclude', `${source}.editorPolicy`),
        filesExclude: yield* stringField(editorPolicy, 'filesExclude', `${source}.editorPolicy`),
      },
      ownership: {
        mode: yield* stringField(ownership, 'mode', `${source}.ownership`),
      },
      boundaries: {
        readOnly: yield* booleanField(boundaries, 'readOnly', `${source}.boundaries`),
        importBlock: yield* booleanField(boundaries, 'importBlock', `${source}.boundaries`),
      },
    }
  })
}

export function decodeProviderPackageBaseline(value: unknown, source: string): Effect.Effect<Record<string, string>, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const profiles = yield* recordField(value, 'profiles', source)
    const profile = yield* recordField(profiles, 'codex-effect-v4', `${source}.profiles`)
    return yield* stringRecordField(profile, 'packageBaseline', `${source}.profiles.codex-effect-v4`)
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
