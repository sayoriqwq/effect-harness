import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { commandString, runStreaming } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'

interface PackageJsonLike {
  readonly name?: string
}

export interface PublishEventConfig {
  readonly version?: string | undefined
  readonly npmTag?: string | undefined
  readonly dryRun?: boolean | undefined
  readonly provenance?: boolean | undefined
}

export interface PublishOptions {
  readonly harness: string
  readonly version?: string | undefined
  readonly npmTag?: string | undefined
  readonly dryRun?: boolean | undefined
  readonly provenance?: boolean | undefined
  readonly packDestination?: string | undefined
}

export interface PublishConfig {
  readonly harness: string
  readonly packageName: string
  readonly version: string
  readonly npmTag: string
  readonly dryRun: boolean
  readonly provenance: boolean
  readonly packDestination: string
  readonly packageJsonText: string
}

const semverPattern = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\dA-Za-z.-]+)?(?:\+[\dA-Za-z.-]+)?$/u
const distTagPattern = /^\w[\w.-]*$/u

const parseBooleanValue = Effect.fnUntraced(function* (value: unknown) {
  if (value === true || value === false) {
    return value
  }

  if (typeof value !== 'string') {
    return yield* new HarnessError({ message: `Invalid boolean value: ${String(value)}` })
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') {
    return true
  }

  if (normalized === 'false' || normalized === '0') {
    return false
  }

  return yield* new HarnessError({ message: `Invalid boolean value: ${value}` })
})

const parseVersion = Effect.fnUntraced(function* (rawVersion: string | undefined) {
  if (!rawVersion) {
    return yield* new HarnessError({
      message: 'A publish version is required. Pass --version, set PUBLISH_VERSION, or run from the publish workflow.',
    })
  }

  const version = String(rawVersion).trim().replace(/^v/iu, '')
  if (!semverPattern.test(version)) {
    return yield* new HarnessError({ message: `Invalid semver version: ${rawVersion}` })
  }

  return version
})

const parsePackageJson = Effect.fnUntraced(function* (text: string, source: string) {
  const parsed = yield* Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: error => new HarnessError({ cause: error, message: `Cannot parse ${source}.` }),
  })

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return yield* new HarnessError({ message: `${source} must be an object.` })
  }

  return parsed as PackageJsonLike
})

const parsePackOutput = Effect.fnUntraced(function* (output: string) {
  const trimmed = output.trim()
  if (!trimmed) {
    return yield* new HarnessError({ message: 'pnpm pack did not return JSON output.' })
  }

  const candidates = jsonPayloadCandidates(trimmed)
  for (const index of candidates) {
    const parsed = yield* Effect.try({
      try: () => JSON.parse(trimmed.slice(index)),
      catch: () => undefined,
    })

    if (parsed !== undefined) {
      return parsed
    }
  }

  return yield* new HarnessError({ message: `Could not parse pnpm pack JSON output:\n${output}` })
})

export const readWorkflowPublishConfig = Effect.fnUntraced(function* (environment: NodeJS.ProcessEnv) {
  const eventName = environment.GITHUB_EVENT_NAME
  const eventPath = environment.GITHUB_EVENT_PATH
  if (!eventName || !eventPath) {
    return {}
  }

  const fs = yield* FileSystem.FileSystem
  if (!(yield* fs.exists(eventPath))) {
    return {}
  }

  const eventText = yield* fs.readFileString(eventPath)
  const event = yield* Effect.try({
    try: () => JSON.parse(eventText) as Record<string, unknown>,
    catch: error => new HarnessError({ cause: error, message: `Cannot parse ${eventPath}: ${errorMessage(error)}` }),
  })

  if (eventName === 'workflow_dispatch') {
    return {
      version: parseStringField(event, ['inputs', 'version']),
      npmTag: parseStringField(event, ['inputs', 'npm_tag']),
      dryRun: yield* parseBooleanField(event, ['inputs', 'dry_run']),
      provenance: yield* parseBooleanField(event, ['inputs', 'provenance']),
    }
  }

  if (eventName === 'release') {
    const release = parseObjectField(event, ['release'])
    if (release) {
      return {
        version: parseStringValue(release.tag_name),
        npmTag: release.prerelease ? 'next' : 'latest',
      }
    }
  }

  return {}
})

export const resolvePublishConfig = Effect.fnUntraced(function* (
  options: PublishOptions,
  environment: NodeJS.ProcessEnv,
  eventConfig: PublishEventConfig,
) {
  const rawVersion = options.version
    ?? parseOptionalString(environment.PUBLISH_VERSION)
    ?? eventConfig.version
  const version = yield* parseVersion(rawVersion)
  const npmTag = options.npmTag ?? parseOptionalString(environment.NPM_TAG) ?? eventConfig.npmTag ?? 'latest'
  const dryRun = options.dryRun
    ?? (yield* parseBooleanEnv(environment.DRY_RUN))
    ?? eventConfig.dryRun
    ?? false
  const provenance = options.provenance
    ?? (yield* parseBooleanEnv(environment.NPM_PROVENANCE))
    ?? eventConfig.provenance
    ?? environment.GITHUB_ACTIONS === 'true'
  const packDestination = options.packDestination ?? environment.PUBLISH_PACK_DIR ?? (yield* defaultPackDestination(environment.RUNNER_TEMP))

  if (!distTagPattern.test(npmTag)) {
    return yield* new HarnessError({ message: `Invalid npm dist-tag: ${npmTag}` })
  }

  const fs = yield* FileSystem.FileSystem
  const packageJsonPath = `${options.harness}/package.json`
  const packageJsonText = yield* fs.readFileString(packageJsonPath)
  const packageJson = yield* parsePackageJson(packageJsonText, packageJsonPath)
  const packageName = packageJson.name ?? 'effect-harness'

  return {
    harness: options.harness,
    packageName,
    packageJsonText,
    npmTag,
    dryRun,
    packDestination,
    provenance,
    version,
  }
})

export const publishPackage = Effect.fnUntraced(function* (options: PublishOptions) {
  const eventConfig = yield* readWorkflowPublishConfig(process.env)
  const config = yield* resolvePublishConfig(options, process.env, eventConfig)

  if (!config.dryRun && !process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN) {
    return yield* new HarnessError({
      message: 'NODE_AUTH_TOKEN is required for non-dry-run publish. Configure it from the NPM_TOKEN secret.',
    })
  }

  const fs = yield* FileSystem.FileSystem
  const packageJsonPath = `${config.harness}/package.json`
  let shouldRestorePackageJson = false

  yield* Console.log(`Publishing ${config.packageName}@${config.version} with npm tag "${config.npmTag}".`)
  if (config.dryRun) {
    yield* Console.log('Dry run enabled; package will not be published.')
  }

  try {
    yield* runStreaming('pnpm', ['verify'], { cwd: config.harness })
    yield* fs.writeFileString(packageJsonPath, withVersion(config.packageJsonText, config.version))
    shouldRestorePackageJson = true
    yield* runStreaming('pnpm', ['build'], { cwd: config.harness })
    yield* ensureDirectory(config.packDestination)
    const tarball = yield* packNpm(config)
    yield* publishTarball(tarball, config)
  }
  finally {
    if (shouldRestorePackageJson) {
      yield* fs.writeFileString(packageJsonPath, config.packageJsonText)
    }
  }
})

function parseBooleanEnv(value: string | undefined): Effect.Effect<boolean | undefined, HarnessError> {
  const normalized = parseOptionalString(value)
  return normalized === undefined ? Effect.sync((): boolean | undefined => undefined) : parseBooleanValue(normalized)
}

function parseBooleanField(
  event: Record<string, unknown>,
  path: readonly string[],
): Effect.Effect<boolean | undefined, HarnessError> {
  const value = parsePath(event, path)
  return value === undefined ? Effect.sync((): boolean | undefined => undefined) : parseBooleanValue(value)
}

function parseStringField(event: Record<string, unknown>, path: readonly string[]) {
  const value = parsePath(event, path)
  return parseStringValue(value)
}

function parseOptionalString(value: string | undefined) {
  if (value === undefined) {
    return undefined
  }

  const normalized = value.trim()
  return normalized.length === 0 ? undefined : normalized
}

function parseStringValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parsePath(data: Record<string, unknown>, path: readonly string[]) {
  let current: unknown = data
  for (const segment of path) {
    if (current === undefined || current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function parseObjectField(value: Record<string, unknown>, path: readonly string[]) {
  const current = parsePath(value, path)
  if (current === undefined || current === null || typeof current !== 'object' || Array.isArray(current)) {
    return undefined
  }

  const candidate = current as {
    prerelease?: boolean
    tag_name?: unknown
  }
  return {
    prerelease: typeof candidate.prerelease === 'boolean' ? candidate.prerelease : false,
    tag_name: candidate.tag_name,
  }
}

function packNpm(config: PublishConfig) {
  return Effect.gen(function* () {
    const output = yield* commandString('pnpm', [
      'pack',
      '--pack-destination',
      config.packDestination,
      '--json',
    ], {
      cwd: config.harness,
      env: {
        ...process.env,
        npm_config_verify_deps_before_run: 'false',
      },
    })

    const parsed = yield* parsePackOutput(output)
    const candidate = Array.isArray(parsed) ? parsed[0] : parsed
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || typeof (candidate as { filename?: unknown }).filename !== 'string') {
      return yield* new HarnessError({
        message: `Could not find tarball filename in pnpm pack output:\n${output}`,
      })
    }

    const tarball = `${(candidate as { filename: string }).filename}`
    const path = join(config.packDestination, tarball)
    yield* Console.log(`Packed ${tarball}`)
    return path
  })
}

function publishTarball(tarball: string, config: PublishConfig) {
  const args = ['publish', tarball, '--access', 'public', '--tag', config.npmTag]
  if (config.provenance) {
    args.push('--provenance')
  }
  if (config.dryRun) {
    args.push('--dry-run')
  }

  return runStreaming('npm', args)
}

function jsonPayloadCandidates(input: string) {
  const indexes = [0]
  for (let index = 1; index < input.length; index += 1) {
    if (input[index] === '[' || input[index] === '{') {
      indexes.push(index)
    }
  }
  return indexes
}

function ensureDirectory(path: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    if (!(yield* fs.exists(path))) {
      yield* fs.makeDirectory(path, { recursive: true })
    }
  })
}

function defaultPackDestination(runnerTemp: string | undefined) {
  const root = runnerTemp ?? tmpdir()
  const stamp = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
  return Effect.succeed(join(root, `effect-harness-npm-pack-${stamp}`))
}

function withVersion(packageJsonText: string, version: string) {
  const packageJson = JSON.parse(packageJsonText) as Record<string, unknown>
  const nextPackageJson = { ...packageJson, version }
  return `${JSON.stringify(nextPackageJson, null, 2)}\n`
}

function errorMessage(error: unknown) {
  return typeof error === 'object' && error !== null && 'message' in error
    ? String((error as { message: string }).message)
    : String(error)
}
