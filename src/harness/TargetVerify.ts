import type { EffectSubtreeManifest, PackageJson } from './Model.ts'
import { isAbsolute as isAbsoluteFilePath, relative as relativePath, resolve as resolvePath } from 'node:path'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { readJson, readJsonLike } from '../platform/Json.ts'
import { HarnessError } from './Errors.ts'
import { targetGuardrailIncludes, verifyGuardrails } from './Guardrails.ts'
import { decodeManifest, decodePackageJson, decodeTsConfig, packageTargets } from './Model.ts'
import { catalogVersion } from './PnpmWorkspace.ts'
import { verifySourcePin } from './SourcePin.ts'
import { assertEffectVitestTests } from './TestContract.ts'

const agentsStart = '<!-- effect-harness:start -->'
const agentsEnd = '<!-- effect-harness:end -->'
const localHarnessDispatcherCommandPattern = /\bscripts\/effect-harness(?:-[\w-]+)?\.(?:cjs|cts|js|mjs|mts|ts)\b/u
const localHarnessDispatcherFilePattern = /^effect-harness(?:-[\w-]+)?\.(?:cjs|cts|js|mjs|mts|ts)$/u

export interface TargetVerifyOptions {
  readonly target: string
  readonly harness: string
  readonly providerRecord?: string | undefined
}

interface TargetHarnessManifest {
  readonly schemaVersion: number
  readonly harnessRoot: string
  readonly commands: {
    readonly status: string
    readonly verify: string
    readonly init: string
  }
  readonly routes: {
    readonly harness: string
    readonly agentContract: string
    readonly targetContract: string
    readonly officialGuide: string
  }
  readonly source: {
    readonly repository: string
    readonly branch: string
    readonly split: string
  }
  readonly packageBaseline: Readonly<Record<string, string>>
}

interface PreludeManifest {
  readonly maintainProviders: ReadonlyArray<{
    readonly id: string
    readonly recordPath: string
  }>
}

interface LifecycleSurfaceRecord {
  readonly id: string
  readonly owner: string
  readonly lifecycle: string
  readonly kind: 'ownedFile' | 'structuredPointer' | 'managedBlock'
  readonly path: string
  readonly pointer?: string | undefined
  readonly startMarker?: string | undefined
  readonly endMarker?: string | undefined
  readonly base?: string | undefined
  readonly snapshot?: string | undefined
}

interface EffectProviderRecord {
  readonly schemaVersion: number
  readonly id: string
  readonly contractVersion: string
  readonly providerVersion: string
  readonly profile: string
  readonly artifact: {
    readonly id: string
    readonly version: string
    readonly [key: string]: unknown
  }
  readonly projectedContext: Record<string, unknown>
  readonly options: Record<string, unknown>
  readonly runtime: {
    readonly commands: Record<string, string>
    readonly routes: Record<string, string>
    readonly files: ReadonlyArray<string>
    readonly [key: string]: unknown
  }
  readonly surfaces: ReadonlyArray<LifecycleSurfaceRecord>
  readonly verificationRecordId: string
}

const providerId = 'effect-harness'
const providerProfile = 'codex-effect-v4'
const supportedProviderContractVersion = '1'
const supportedProviderVersion = '0.1.0'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function decodeStringField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<string, HarnessError> {
  const value = record[key]
  return typeof value === 'string'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain string field: ${key}` }))
}

function decodeStringRecord(record: Record<string, unknown>, key: string, source: string): Effect.Effect<Record<string, string>, HarnessError> {
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

function decodeNumberField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<number, HarnessError> {
  const value = record[key]
  return typeof value === 'number'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain number field: ${key}` }))
}

function decodeRecordField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<Record<string, unknown>, HarnessError> {
  const value = record[key]
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain object field: ${key}` }))
}

function decodeStringArrayField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<ReadonlyArray<string>, HarnessError> {
  const value = record[key]
  if (!Array.isArray(value)) {
    return Effect.fail(new HarnessError({ message: `${source} must contain array field: ${key}` }))
  }
  const result: Array<string> = []
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'string') {
      return Effect.fail(new HarnessError({ message: `${source}.${key}[${index}] must be a string` }))
    }
    result.push(entry)
  }
  return Effect.succeed(result)
}

function optionalStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function decodeSurface(value: unknown, source: string): Effect.Effect<LifecycleSurfaceRecord, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }
    const kind = yield* decodeStringField(value, 'kind', source)
    if (kind !== 'ownedFile' && kind !== 'structuredPointer' && kind !== 'managedBlock') {
      return yield* new HarnessError({ message: `${source}.kind must be ownedFile, structuredPointer, or managedBlock` })
    }

    return {
      id: yield* decodeStringField(value, 'id', source),
      owner: yield* decodeStringField(value, 'owner', source),
      lifecycle: yield* decodeStringField(value, 'lifecycle', source),
      kind,
      path: yield* decodeStringField(value, 'path', source),
      pointer: optionalStringField(value, 'pointer'),
      startMarker: optionalStringField(value, 'startMarker'),
      endMarker: optionalStringField(value, 'endMarker'),
      base: optionalStringField(value, 'base'),
      snapshot: optionalStringField(value, 'snapshot'),
    }
  })
}

function decodePreludeManifest(value: unknown, source: string): Effect.Effect<PreludeManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const maintainProviders = value.maintainProviders
    if (!Array.isArray(maintainProviders)) {
      return yield* new HarnessError({ message: `${source} must contain array field: maintainProviders` })
    }

    const providers: Array<{ readonly id: string, readonly recordPath: string }> = []
    for (const [index, provider] of maintainProviders.entries()) {
      if (!isRecord(provider)) {
        return yield* new HarnessError({ message: `${source}.maintainProviders[${index}] must be a JSON object` })
      }
      providers.push({
        id: yield* decodeStringField(provider, 'id', `${source}.maintainProviders[${index}]`),
        recordPath: yield* decodeStringField(provider, 'recordPath', `${source}.maintainProviders[${index}]`),
      })
    }

    return { maintainProviders: providers }
  })
}

function decodeEffectProviderRecord(value: unknown, source: string): Effect.Effect<EffectProviderRecord, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const options = yield* decodeRecordField(value, 'options', source)
    const runtimeValue = yield* decodeRecordField(value, 'runtime', source)
    const artifactValue = yield* decodeRecordField(value, 'artifact', source)
    const surfacesValue = value.surfaces
    if (!Array.isArray(surfacesValue)) {
      return yield* new HarnessError({ message: `${source} must contain array field: surfaces` })
    }

    const surfaces: Array<LifecycleSurfaceRecord> = []
    for (const [index, surface] of surfacesValue.entries()) {
      surfaces.push(yield* decodeSurface(surface, `${source}.surfaces[${index}]`))
    }

    return {
      schemaVersion: yield* decodeNumberField(value, 'schemaVersion', source),
      id: yield* decodeStringField(value, 'id', source),
      contractVersion: yield* decodeStringField(value, 'contractVersion', source),
      providerVersion: yield* decodeStringField(value, 'providerVersion', source),
      profile: yield* decodeStringField(value, 'profile', source),
      artifact: {
        ...artifactValue,
        id: yield* decodeStringField(artifactValue, 'id', `${source}.artifact`),
        version: yield* decodeStringField(artifactValue, 'version', `${source}.artifact`),
      },
      projectedContext: yield* decodeRecordField(value, 'projectedContext', source),
      options,
      runtime: {
        ...runtimeValue,
        commands: yield* decodeStringRecord(runtimeValue, 'commands', `${source}.runtime`),
        routes: yield* decodeStringRecord(runtimeValue, 'routes', `${source}.runtime`),
        files: yield* decodeStringArrayField(runtimeValue, 'files', `${source}.runtime`),
      },
      surfaces,
      verificationRecordId: yield* decodeStringField(value, 'verificationRecordId', source),
    }
  })
}

function decodeTargetHarnessManifest(value: unknown, source: string): Effect.Effect<TargetHarnessManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const sourceValue = value.source
    if (!isRecord(sourceValue)) {
      return yield* new HarnessError({ message: `${source} must contain object field: source` })
    }
    const commandsValue = value.commands
    if (!isRecord(commandsValue)) {
      return yield* new HarnessError({ message: `${source} must contain object field: commands` })
    }
    const routesValue = value.routes
    if (!isRecord(routesValue)) {
      return yield* new HarnessError({ message: `${source} must contain object field: routes` })
    }

    return {
      schemaVersion: yield* decodeNumberField(value, 'schemaVersion', source),
      harnessRoot: yield* decodeStringField(value, 'harnessRoot', source),
      commands: {
        status: yield* decodeStringField(commandsValue, 'status', `${source}.commands`),
        verify: yield* decodeStringField(commandsValue, 'verify', `${source}.commands`),
        init: yield* decodeStringField(commandsValue, 'init', `${source}.commands`),
      },
      routes: {
        harness: yield* decodeStringField(routesValue, 'harness', `${source}.routes`),
        agentContract: yield* decodeStringField(routesValue, 'agentContract', `${source}.routes`),
        targetContract: yield* decodeStringField(routesValue, 'targetContract', `${source}.routes`),
        officialGuide: yield* decodeStringField(routesValue, 'officialGuide', `${source}.routes`),
      },
      source: {
        repository: yield* decodeStringField(sourceValue, 'repository', `${source}.source`),
        branch: yield* decodeStringField(sourceValue, 'branch', `${source}.source`),
        split: yield* decodeStringField(sourceValue, 'split', `${source}.source`),
      },
      packageBaseline: yield* decodeStringRecord(value, 'packageBaseline', source),
    }
  })
}

function dependencyVersion(packageJson: PackageJson, name: string): string | undefined {
  return packageJson.dependencies?.[name]
    ?? packageJson.devDependencies?.[name]
    ?? packageJson.peerDependencies?.[name]
    ?? packageJson.optionalDependencies?.[name]
}

function assertDependency(errors: Array<string>, packageJson: PackageJson, name: string, expected: string | undefined): void {
  if (!expected) {
    errors.push(`Missing package baseline for ${name} in repos/effect.subtree.json.`)
    return
  }

  const version = dependencyVersion(packageJson, name)
  if (!version) {
    errors.push(`Missing dependency ${name}.`)
    return
  }

  if (version !== expected && version !== 'catalog:') {
    errors.push(`${name} is ${version}; expected ${expected} or catalog:.`)
  }
}

function catalogDependencyNames(packageJson: PackageJson): ReadonlyArray<string> {
  return packageTargets
    .map(packageTarget => packageTarget.name)
    .filter(name => dependencyVersion(packageJson, name) === 'catalog:')
}

const assertPnpmCatalog = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  packageJson: PackageJson,
  baseline: Readonly<Record<string, string>>,
) {
  const names = catalogDependencyNames(packageJson)
  if (names.length === 0) {
    return
  }

  const fs = yield* FileSystem.FileSystem
  const workspacePath = `${root}/pnpm-workspace.yaml`
  if (!(yield* fs.exists(workspacePath))) {
    errors.push('package.json uses catalog: for Effect baseline packages, but pnpm-workspace.yaml is missing.')
    return
  }

  const text = yield* fs.readFileString(workspacePath)
  for (const name of names) {
    const expected = baseline[name]
    const actual = catalogVersion(text, name)
    if (actual === undefined) {
      errors.push(`pnpm-workspace.yaml catalog is missing ${name}; package.json uses catalog:.`)
    }
    else if (actual !== expected) {
      errors.push(`pnpm-workspace.yaml catalog ${name} is ${actual}; expected ${expected}.`)
    }
  }
})

function assertScript(errors: Array<string>, packageJson: PackageJson, name: string): void {
  if (!packageJson.scripts?.[name]) {
    errors.push(`Missing package script: ${name}.`)
  }
}

const expectedCliPaths = Effect.fnUntraced(function* (harness: string) {
  const fs = yield* FileSystem.FileSystem
  const builtCliPath = `${harness}/dist/bin/effect-harness.js`
  const sourceCliPath = `${harness}/bin/effect-harness.ts`
  const paths: Array<string> = []
  if (yield* fs.exists(builtCliPath)) {
    paths.push(builtCliPath)
  }
  if (yield* fs.exists(sourceCliPath)) {
    paths.push(sourceCliPath)
  }
  return paths
})

function expectedHarnessCommands(cliPath: string, harness: string): TargetHarnessManifest['commands'] {
  return {
    status: `node "${cliPath}" status`,
    verify: `node "${cliPath}" verify --target .`,
    init: `node "${cliPath}" init --target . --harness "${harness}"`,
  }
}

function expectedHarnessCommandSets(cliPaths: ReadonlyArray<string>, harness: string): ReadonlyArray<TargetHarnessManifest['commands']> {
  return cliPaths.map(cliPath => expectedHarnessCommands(cliPath, harness))
}

function commandSetMatches(
  commands: Pick<TargetHarnessManifest['commands'], 'status' | 'verify'>,
  expected: TargetHarnessManifest['commands'],
): boolean {
  return commands.status === expected.status && commands.verify === expected.verify
}

function fullCommandSetMatches(
  commands: TargetHarnessManifest['commands'],
  expected: TargetHarnessManifest['commands'],
): boolean {
  return commands.status === expected.status && commands.verify === expected.verify && commands.init === expected.init
}

function commandSetSummary(commands: TargetHarnessManifest['commands']): string {
  return `${commands.status}; ${commands.verify}; ${commands.init}`
}

function assertHarnessScripts(
  errors: Array<string>,
  packageJson: PackageJson,
  expectedCommandSets: ReadonlyArray<TargetHarnessManifest['commands']>,
): void {
  const commands = {
    status: packageJson.scripts?.['effect:status'] ?? '',
    verify: packageJson.scripts?.['effect:verify'] ?? '',
  }
  if (!expectedCommandSets.some(expected => commandSetMatches(commands, expected))) {
    errors.push(`package scripts effect:status/effect:verify are ${commands.status}; ${commands.verify}; expected one harness CLI entry: ${expectedCommandSets.map(commandSetSummary).join(' OR ')}. Run effect-harness init.`)
  }
}

function assertTypecheckScript(errors: Array<string>, packageJson: PackageJson): void {
  const typecheck = packageJson.scripts?.typecheck
  if (!typecheck) {
    errors.push('Missing package script: typecheck.')
    return
  }

  if (!/\btsgo\s+--noEmit\b/u.test(typecheck)) {
    errors.push('typecheck must run the @effect/tsgo-patched tsgo --noEmit as the primary Effect diagnostic path.')
  }

  if (/\beffect-tsgo\s+--noEmit\b/u.test(typecheck)) {
    errors.push('effect-tsgo is the setup/patch manager; typecheck must use the patched tsgo --noEmit binary.')
  }
}

function assertVerifyScript(errors: Array<string>, packageJson: PackageJson): void {
  const verify = packageJson.scripts?.verify
  if (!verify) {
    errors.push('Missing package script: verify.')
    return
  }

  if (!/\bpnpm\s+effect:verify\b/u.test(verify)) {
    errors.push('verify must run pnpm effect:verify.')
  }
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith('/')
}

function targetPath(root: string, path: string): string {
  return isAbsolutePath(path) ? path : `${root}/${path}`
}

function providerSurfacePath(errors: Array<string>, root: string, surface: LifecycleSurfaceRecord): string | undefined {
  if (surface.path.trim() === '') {
    errors.push(`provider surface ${surface.id} path must be target-root-relative.`)
    return undefined
  }
  if (isAbsoluteFilePath(surface.path)) {
    errors.push(`provider surface ${surface.id} path must be target-root-relative; got absolute path ${surface.path}.`)
    return undefined
  }
  if (surface.path.split('/').includes('..')) {
    errors.push(`provider surface ${surface.id} path must not contain .. segments: ${surface.path}.`)
    return undefined
  }

  const rootPath = resolvePath(root)
  const resolved = resolvePath(rootPath, surface.path)
  const relative = relativePath(rootPath, resolved)
  if (relative === '..' || relative.startsWith('../') || relative.startsWith('..\\') || isAbsoluteFilePath(relative)) {
    errors.push(`provider surface ${surface.id} path escapes target root: ${surface.path}.`)
    return undefined
  }
  return resolved
}

const resolveProviderRecordPath = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  explicitPath: string | undefined,
) {
  const fs = yield* FileSystem.FileSystem
  if (explicitPath !== undefined) {
    if (!(yield* fs.exists(explicitPath))) {
      errors.push(`Missing provider record: ${explicitPath}`)
      return undefined
    }
    return explicitPath
  }

  const preludeManifestPath = `${root}/.prelude/manifest.json`
  if (!(yield* fs.exists(preludeManifestPath))) {
    return undefined
  }

  const preludeManifest = yield* readJson(preludeManifestPath, decodePreludeManifest)
  const provider = preludeManifest.maintainProviders.find(provider => provider.id === providerId)
  if (!provider) {
    errors.push(`.prelude/manifest.json maintainProviders must include id "${providerId}".`)
    return undefined
  }

  const recordPath = targetPath(root, provider.recordPath)
  if (!(yield* fs.exists(recordPath))) {
    errors.push(`Missing provider record: ${provider.recordPath}`)
    return undefined
  }
  return recordPath
})

const assertNoLocalHarnessDispatcher = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  packageJson: PackageJson,
) {
  const fs = yield* FileSystem.FileSystem
  const scriptEntries = Object.entries(packageJson.scripts ?? {})
  const dispatcherScript = scriptEntries.find(([, command]) =>
    localHarnessDispatcherCommandPattern.test(command),
  )

  if (dispatcherScript) {
    errors.push(`package script ${dispatcherScript[0]} uses a local effect-harness dispatcher; use effect-harness init output instead.`)
  }

  const scriptsRoot = `${root}/scripts`
  if (!(yield* fs.exists(scriptsRoot))) {
    return
  }

  const entries = yield* fs.readDirectory(scriptsRoot)
  for (const entry of entries) {
    if (localHarnessDispatcherFilePattern.test(entry)) {
      errors.push(`Target repo must not include scripts/${entry}; distribution belongs to effect-harness init.`)
    }
  }
})

function hasFloatingEffectError(plugin: Record<string, unknown>): boolean {
  const options = plugin.options
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    return false
  }

  const diagnosticSeverity = (options as Record<string, unknown>).diagnosticSeverity
  if (typeof diagnosticSeverity !== 'object' || diagnosticSeverity === null || Array.isArray(diagnosticSeverity)) {
    return false
  }

  return (diagnosticSeverity as Record<string, unknown>).floatingEffect === 'error'
}

const assertTsgoConfig = Effect.fnUntraced(function* (errors: Array<string>, root: string) {
  const fs = yield* FileSystem.FileSystem
  const tsconfigPath = `${root}/tsconfig.json`
  const exists = yield* fs.exists(tsconfigPath)
  if (!exists) {
    errors.push('Missing tsconfig.json.')
    return
  }

  const tsconfig = yield* readJsonLike(tsconfigPath, decodeTsConfig)
  const plugins = tsconfig.compilerOptions?.plugins ?? []
  const effectPlugin = plugins.find(plugin => plugin.name === '@effect/language-service')
  if (!effectPlugin) {
    errors.push('tsconfig.json must configure the @effect/language-service plugin for @effect/tsgo.')
    return
  }

  if (!hasFloatingEffectError(effectPlugin)) {
    errors.push('@effect/tsgo plugin config must treat floatingEffect as error for runtime source.')
  }
})

const assertRequiredPath = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  path: string,
  kind: 'directory' | 'file',
) {
  const fs = yield* FileSystem.FileSystem
  const targetPath = `${root}/${path}`
  if (!(yield* fs.exists(targetPath))) {
    errors.push(`Missing ${kind}: ${path}. Run effect-harness init.`)
    return
  }

  const stat = yield* fs.stat(targetPath)
  if (kind === 'directory' && stat.type !== 'Directory') {
    errors.push(`${path} must be a directory.`)
  }
  if (kind === 'file' && stat.type === 'Directory') {
    errors.push(`${path} must be a file.`)
  }
})

function assertEqualField(errors: Array<string>, field: string, actual: string, expected: string): void {
  if (actual !== expected) {
    errors.push(`.effect-harness.json ${field} is ${actual}; expected ${expected}. Run effect-harness init.`)
  }
}

function assertEqualNumberField(errors: Array<string>, field: string, actual: number, expected: number): void {
  if (actual !== expected) {
    errors.push(`.effect-harness.json ${field} is ${actual}; expected ${expected}. Run effect-harness init.`)
  }
}

function assertProviderField(errors: Array<string>, field: string, actual: string | number, expected: string | number): void {
  if (actual !== expected) {
    errors.push(`provider record ${field} is ${actual}; expected ${expected}.`)
  }
}

function recordString(value: Record<string, unknown> | undefined, key: string): string | undefined {
  const entry = value?.[key]
  return typeof entry === 'string' ? entry : undefined
}

function unescapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/gu, '/').replace(/~0/gu, '~')
}

function valueAtJsonPointer(value: unknown, pointer: string): unknown {
  if (pointer === '') {
    return value
  }
  if (!pointer.startsWith('/')) {
    return undefined
  }
  let current = value
  for (const rawSegment of pointer.slice(1).split('/')) {
    const segment = unescapeJsonPointerSegment(rawSegment)
    if (Array.isArray(current)) {
      const index = Number(segment)
      current = Number.isInteger(index) ? current[index] : undefined
      continue
    }
    if (isRecord(current)) {
      current = current[segment]
      continue
    }
    return undefined
  }
  return current
}

function decodeSnapshot(snapshot: string): unknown {
  try {
    return JSON.parse(snapshot) as unknown
  }
  catch {
    return snapshot
  }
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function jsonDecoderForPath(path: string) {
  return path.endsWith('package.json')
    ? decodePackageJson
    : path.endsWith('tsconfig.json')
      ? decodeTsConfig
      : undefined
}

function packagePointerName(pointer: string): string | undefined {
  const match = pointer.match(/^\/(?:dependencies|devDependencies|peerDependencies|optionalDependencies)\/(.+)$/u)
  return match?.[1]?.replace(/~1/gu, '/').replace(/~0/gu, '~')
}

function assertProviderBaselinePointer(
  errors: Array<string>,
  surface: LifecycleSurfaceRecord,
  expected: string | undefined,
  actual: unknown,
): void {
  const name = surface.pointer === undefined ? undefined : packagePointerName(surface.pointer)
  if (name === undefined || expected === undefined) {
    return
  }
  if (actual !== expected && actual !== 'catalog:') {
    errors.push(`${surface.path} pointer ${surface.pointer} is ${actual ?? 'missing'}; expected ${expected} or catalog:.`)
  }
}

const assertHarnessManifest = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  harness: string,
  manifest: EffectSubtreeManifest,
  packageJson: PackageJson,
  expectedCommandSets: ReadonlyArray<TargetHarnessManifest['commands']>,
) {
  const manifestPath = `${root}/.effect-harness.json`
  yield* assertRequiredPath(errors, root, '.effect-harness.json', 'file')
  if (errors.some(error => error.includes('.effect-harness.json'))) {
    return
  }

  const targetManifest = yield* readJson(manifestPath, decodeTargetHarnessManifest)

  assertEqualNumberField(errors, 'schemaVersion', targetManifest.schemaVersion, 1)
  assertEqualField(errors, 'harnessRoot', targetManifest.harnessRoot, harness)
  assertEqualField(errors, 'commands.status', targetManifest.commands.status, packageJson.scripts?.['effect:status'] ?? '')
  assertEqualField(errors, 'commands.verify', targetManifest.commands.verify, packageJson.scripts?.['effect:verify'] ?? '')
  if (!expectedCommandSets.some(expected => fullCommandSetMatches(targetManifest.commands, expected))) {
    errors.push(`.effect-harness.json commands do not match a valid harness CLI entry; expected one of: ${expectedCommandSets.map(commandSetSummary).join(' OR ')}. Run effect-harness init.`)
  }
  assertEqualField(errors, 'routes.harness', targetManifest.routes.harness, `${harness}/HARNESS.md`)
  assertEqualField(errors, 'routes.agentContract', targetManifest.routes.agentContract, `${harness}/harness/index.md`)
  assertEqualField(errors, 'routes.targetContract', targetManifest.routes.targetContract, `${harness}/harness/target-agent-contract.md`)
  assertEqualField(errors, 'routes.officialGuide', targetManifest.routes.officialGuide, `${harness}/${manifest.llmDocument}`)
  assertEqualField(errors, 'source.repository', targetManifest.source.repository, manifest.repository)
  assertEqualField(errors, 'source.branch', targetManifest.source.branch, manifest.branch)
  assertEqualField(errors, 'source.split', targetManifest.source.split, manifest.split)

  for (const [name, version] of Object.entries(manifest.packageBaseline)) {
    const actual = targetManifest.packageBaseline[name]
    if (actual !== version) {
      errors.push(`.effect-harness.json packageBaseline.${name} is ${actual ?? 'missing'}; expected ${version}. Run effect-harness init.`)
    }
  }
})

function assertProviderRecordFields(errors: Array<string>, record: EffectProviderRecord): void {
  assertProviderField(errors, 'schemaVersion', record.schemaVersion, 1)
  assertProviderField(errors, 'id', record.id, providerId)
  assertProviderField(errors, 'artifact.id', record.artifact.id, providerId)
  assertProviderField(errors, 'contractVersion', record.contractVersion, supportedProviderContractVersion)
  assertProviderField(errors, 'providerVersion', record.providerVersion, supportedProviderVersion)
  assertProviderField(errors, 'artifact.version', record.artifact.version, supportedProviderVersion)
  assertProviderField(errors, 'providerVersion', record.providerVersion, record.artifact.version)
  assertProviderField(errors, 'profile', record.profile, providerProfile)
  const runtime = recordString(record.options, 'runtime')
  if (runtime !== 'codex') {
    errors.push(`provider record options.runtime is ${runtime ?? 'missing'}; expected codex for ${providerProfile}.`)
  }

  if (!record.verificationRecordId.trim()) {
    errors.push('provider record verificationRecordId must be non-empty.')
  }
}

const assertAgentsRoute = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  harness: string,
  surface?: LifecycleSurfaceRecord | undefined,
) {
  const fs = yield* FileSystem.FileSystem
  const file = surface?.path ?? 'AGENTS.md'
  const startMarker = surface?.startMarker ?? agentsStart
  const endMarker = surface?.endMarker ?? agentsEnd
  const agentsPath = surface === undefined
    ? targetPath(root, file)
    : providerSurfacePath(errors, root, surface)
  if (agentsPath === undefined) {
    return
  }
  if (!(yield* fs.exists(agentsPath))) {
    errors.push(`Missing file: ${file}.`)
    return
  }

  const text = yield* fs.readFileString(agentsPath)
  const escapedStart = startMarker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const escapedEnd = endMarker.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const match = text.match(new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`, 'u'))
  if (!match) {
    errors.push(`${file} must include the managed effect-harness route block.`)
    return
  }

  const surfaceBlock = surface?.snapshot ?? surface?.base
  const expected = surfaceBlock !== undefined
    ? surfaceBlock.trimEnd()
    : `${startMarker}\n${(yield* fs.readFileString(`${harness}/harness/runtime/codex/AGENTS.fragment.md`))
      .replaceAll('__EFFECT_HARNESS_ROOT__', harness)
      .trim()}\n${endMarker}`
  if (match[0] !== expected) {
    errors.push(`${file} managed effect-harness route block does not match provider record.`)
  }
})

const assertProviderSurfaces = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  record: EffectProviderRecord,
  baseline: Readonly<Record<string, string>>,
) {
  const fs = yield* FileSystem.FileSystem
  const owner = `provider:${providerId}`
  const providerSurfaces = record.surfaces.filter(surface => surface.owner === owner)
  if (providerSurfaces.length === 0) {
    errors.push(`provider record surfaces must include entries owned by ${owner}.`)
  }

  let sawCodexAsset = false
  let sawAgentsBlock = false
  let sawPackagePointer = false
  const baselineSurfaceNames = new Set<string>()
  const baselinePackageFiles = new Map<string, PackageJson>()

  for (const surface of providerSurfaces) {
    if (surface.lifecycle !== 'managed') {
      errors.push(`provider surface ${surface.id} lifecycle is ${surface.lifecycle}; expected managed.`)
      continue
    }

    const path = providerSurfacePath(errors, root, surface)
    if (path === undefined) {
      continue
    }

    if (surface.kind === 'structuredPointer') {
      const snapshot = surface.snapshot ?? surface.base
      if (surface.pointer === undefined || snapshot === undefined) {
        errors.push(`provider structured pointer ${surface.id} must include pointer and snapshot/base.`)
        continue
      }
      let rootValue: unknown
      if (surface.path.endsWith('package.json')) {
        const packageJson = yield* readJsonLike(path, decodePackageJson)
        rootValue = packageJson
        baselinePackageFiles.set(surface.path, packageJson)
      }
      else if (surface.path.endsWith('tsconfig.json')) {
        rootValue = yield* readJsonLike(path, decodeTsConfig)
      }
      else if (jsonDecoderForPath(surface.path) === undefined) {
        errors.push(`provider structured pointer ${surface.id} uses unsupported JSON path ${surface.path}.`)
        continue
      }
      const actual = valueAtJsonPointer(rootValue, surface.pointer)
      const expected = decodeSnapshot(snapshot)
      if (!sameJsonValue(actual, expected)) {
        errors.push(`${surface.path} pointer ${surface.pointer} does not match provider record snapshot.`)
      }
      if (surface.path.endsWith('package.json') && surface.pointer !== undefined) {
        const name = packagePointerName(surface.pointer)
        if (name !== undefined && baseline[name] !== undefined) {
          baselineSurfaceNames.add(name)
          assertProviderBaselinePointer(errors, surface, baseline[name], actual)
          sawPackagePointer = true
        }
      }
      continue
    }

    if (surface.kind === 'ownedFile') {
      if (!(yield* fs.exists(path))) {
        errors.push(`Missing file: ${surface.path}.`)
        continue
      }
      const stat = yield* fs.stat(path)
      if (stat.type === 'Directory') {
        errors.push(`${surface.path} must be a file.`)
        continue
      }
      if (surface.base !== undefined) {
        const actual = yield* fs.readFileString(path)
        if (actual !== surface.base) {
          errors.push(`${surface.path} does not match provider record base.`)
        }
      }
      sawCodexAsset = sawCodexAsset || surface.path.startsWith('.codex/')
      continue
    }

    if (surface.kind === 'managedBlock') {
      yield* assertAgentsRoute(errors, root, '', surface)
      sawAgentsBlock = true
      continue
    }
  }

  if (!sawCodexAsset) {
    errors.push('provider record surfaces must include owned .codex runtime assets.')
  }
  if (!sawAgentsBlock) {
    errors.push('provider record surfaces must include an AGENTS.md managed block.')
  }
  if (!sawPackagePointer) {
    errors.push('provider record surfaces must include Effect baseline package structured pointers.')
  }

  for (const packageTarget of packageTargets) {
    if (!baselineSurfaceNames.has(packageTarget.name)) {
      errors.push(`provider record surfaces must include baseline package pointer: ${packageTarget.name}.`)
    }
  }

  for (const [path, packageJson] of baselinePackageFiles) {
    if (dependencyVersion(packageJson, '@effect/cli')) {
      errors.push(`${path} must not depend on @effect/cli for this baseline.`)
    }
    yield* assertPnpmCatalog(errors, root, packageJson, baseline)
  }
})

const assertProviderRecordContract = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  record: EffectProviderRecord,
  baseline: Readonly<Record<string, string>>,
) {
  assertProviderRecordFields(errors, record)
  yield* assertProviderSurfaces(errors, root, record, baseline)
})

const assertRuntimeDirectory = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  harness: string,
  runtimeRoot: string,
  directory: 'skills' | 'agents',
) {
  const fs = yield* FileSystem.FileSystem
  const sourceRoot = `${runtimeRoot}/${directory}`
  const targetRoot = `${root}/.codex/${directory}`
  const entries = yield* fs.readDirectory(sourceRoot, { recursive: true })
  const expectedFiles = new Set<string>()
  const managedDirectories = new Set<string>()

  for (const entry of entries) {
    const sourcePath = `${sourceRoot}/${entry}`
    const sourceStat = yield* fs.stat(sourcePath)
    if (sourceStat.type === 'Directory') {
      if (directory === 'skills' && !entry.includes('/')) {
        managedDirectories.add(entry)
      }
      continue
    }

    expectedFiles.add(entry)
    const targetPath = `${targetRoot}/${entry}`
    const targetRelative = `.codex/${directory}/${entry}`
    if (!(yield* fs.exists(targetPath))) {
      errors.push(`Missing file: ${targetRelative}. Run effect-harness init.`)
      continue
    }

    const targetStat = yield* fs.stat(targetPath)
    if (targetStat.type === 'Directory') {
      errors.push(`${targetRelative} must be a file.`)
      continue
    }

    const expected = (yield* fs.readFileString(sourcePath))
      .replaceAll('__EFFECT_HARNESS_ROOT__', harness)
    const actual = yield* fs.readFileString(targetPath)
    if (actual !== expected) {
      errors.push(`${targetRelative} does not match the effect-harness runtime template. Run effect-harness init.`)
    }
  }

  for (const managedDirectory of managedDirectories) {
    const targetManagedRoot = `${targetRoot}/${managedDirectory}`
    if (!(yield* fs.exists(targetManagedRoot))) {
      continue
    }

    const targetEntries = yield* fs.readDirectory(targetManagedRoot, { recursive: true })
    for (const targetEntry of targetEntries) {
      const relative = `${managedDirectory}/${targetEntry}`
      const targetStat = yield* fs.stat(`${targetRoot}/${relative}`)
      if (targetStat.type === 'Directory' || expectedFiles.has(relative)) {
        continue
      }

      errors.push(`.codex/${directory}/${relative} is not managed by effect-harness runtime. Keep custom files outside managed effect-harness skill directories.`)
    }
  }
})

const assertRuntimeContract = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  harness: string,
  manifest: EffectSubtreeManifest,
  packageJson: PackageJson,
  expectedCommandSets: ReadonlyArray<TargetHarnessManifest['commands']>,
) {
  const runtimeRoot = `${harness}/harness/runtime/codex`
  yield* assertHarnessManifest(errors, root, harness, manifest, packageJson, expectedCommandSets)
  yield* assertRuntimeDirectory(errors, root, harness, runtimeRoot, 'skills')
  yield* assertRuntimeDirectory(errors, root, harness, runtimeRoot, 'agents')
  yield* assertRequiredPath(errors, root, '.codex/effect-feedback', 'directory')
  yield* assertAgentsRoute(errors, root, harness)
})

export const verifyTarget = Effect.fnUntraced(function* (options: TargetVerifyOptions) {
  const fs = yield* FileSystem.FileSystem
  const errors: Array<string> = []

  if (!(yield* fs.exists(options.target))) {
    errors.push(`Missing target root: ${options.target}`)
  }
  if (!(yield* fs.exists(options.harness))) {
    errors.push(`Missing harness root: ${options.harness}`)
  }

  if (errors.length === 0) {
    const manifest = yield* readJson(`${options.harness}/repos/effect.subtree.json`, decodeManifest)
    const packageJson = yield* readJson(`${options.target}/package.json`, decodePackageJson)
    const baseline = manifest.packageBaseline
    const providerRecordPath = yield* resolveProviderRecordPath(errors, options.target, options.providerRecord)
    const providerRecord = providerRecordPath === undefined
      ? undefined
      : yield* readJson(providerRecordPath, decodeEffectProviderRecord)

    if (providerRecord === undefined) {
      assertDependency(errors, packageJson, 'effect', baseline.effect)
      assertDependency(errors, packageJson, '@effect/platform-node', baseline['@effect/platform-node'])
      assertDependency(errors, packageJson, '@effect/vitest', baseline['@effect/vitest'])
      assertDependency(errors, packageJson, '@effect/tsgo', baseline['@effect/tsgo'])
      assertDependency(errors, packageJson, '@effect/language-service', baseline['@effect/language-service'])
      assertDependency(errors, packageJson, '@typescript/native-preview', baseline['@typescript/native-preview'])
      yield* assertPnpmCatalog(errors, options.target, packageJson, baseline)
    }

    if (dependencyVersion(packageJson, '@effect/cli')) {
      errors.push('Target must not depend on @effect/cli for this baseline.')
    }

    assertVerifyScript(errors, packageJson)
    if (providerRecord === undefined) {
      assertTypecheckScript(errors, packageJson)
    }

    for (const script of ['effect:status', 'effect:verify']) {
      assertScript(errors, packageJson, script)
    }

    const cliPaths = yield* expectedCliPaths(options.harness)
    const commandSets = expectedHarnessCommandSets(cliPaths, options.harness)
    if (providerRecordPath === undefined) {
      assertHarnessScripts(errors, packageJson, commandSets)
    }

    yield* assertNoLocalHarnessDispatcher(errors, options.target, packageJson)
    if (providerRecord === undefined) {
      yield* assertTsgoConfig(errors, options.target)
    }
    yield* assertEffectVitestTests(errors, options.target, ['src', 'tests'], { requireEffectApi: true })
    if (providerRecord !== undefined) {
      yield* assertProviderRecordContract(errors, options.target, providerRecord, baseline)
    }
    else {
      yield* assertRuntimeContract(errors, options.target, options.harness, manifest, packageJson, commandSets)
    }
  }

  if (errors.length > 0) {
    yield* Console.error('Effect target verification failed:')
    for (const error of errors) {
      yield* Console.error(`- ${error}`)
    }
    return yield* new HarnessError({ message: 'Effect target verification failed.' })
  }

  yield* verifySourcePin(options.harness)
  yield* verifyGuardrails({
    root: options.target,
    includes: targetGuardrailIncludes,
  })
  yield* Console.log(`Effect target verified against harness: ${options.target}`)
})
