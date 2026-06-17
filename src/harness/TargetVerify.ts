import type { EffectSubtreeManifest, PackageJson } from './Model.ts'
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
const agentsBlockPattern = /<!-- effect-harness:start -->[\s\S]*?<!-- effect-harness:end -->/u
const localHarnessDispatcherCommandPattern = /\bscripts\/effect-harness(?:-[\w-]+)?\.(?:cjs|cts|js|mjs|mts|ts)\b/u
const localHarnessDispatcherFilePattern = /^effect-harness(?:-[\w-]+)?\.(?:cjs|cts|js|mjs|mts|ts)$/u

export interface TargetVerifyOptions {
  readonly target: string
  readonly harness: string
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

const assertAgentsRoute = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  harness: string,
  runtimeRoot: string,
) {
  const fs = yield* FileSystem.FileSystem
  const agentsPath = `${root}/AGENTS.md`
  if (!(yield* fs.exists(agentsPath))) {
    errors.push('Missing file: AGENTS.md. Run effect-harness init.')
    return
  }

  const text = yield* fs.readFileString(agentsPath)
  const match = text.match(agentsBlockPattern)
  if (!match) {
    errors.push('AGENTS.md must include the managed effect-harness route block.')
    return
  }

  const fragment = (yield* fs.readFileString(`${runtimeRoot}/AGENTS.fragment.md`))
    .replaceAll('__EFFECT_HARNESS_ROOT__', harness)
    .trim()
  const expected = `${agentsStart}\n${fragment}\n${agentsEnd}`
  if (match[0] !== expected) {
    errors.push('AGENTS.md managed effect-harness route block does not match harness/runtime/codex/AGENTS.fragment.md. Run effect-harness init.')
  }
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
  yield* assertAgentsRoute(errors, root, harness, runtimeRoot)
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

    assertDependency(errors, packageJson, 'effect', baseline.effect)
    assertDependency(errors, packageJson, '@effect/platform-node', baseline['@effect/platform-node'])
    assertDependency(errors, packageJson, '@effect/vitest', baseline['@effect/vitest'])
    assertDependency(errors, packageJson, '@effect/tsgo', baseline['@effect/tsgo'])
    assertDependency(errors, packageJson, '@effect/language-service', baseline['@effect/language-service'])
    assertDependency(errors, packageJson, '@typescript/native-preview', baseline['@typescript/native-preview'])
    yield* assertPnpmCatalog(errors, options.target, packageJson, baseline)

    if (dependencyVersion(packageJson, '@effect/cli')) {
      errors.push('Target must not depend on @effect/cli for this baseline.')
    }

    assertTypecheckScript(errors, packageJson)
    assertVerifyScript(errors, packageJson)

    for (const script of ['effect:status', 'effect:verify']) {
      assertScript(errors, packageJson, script)
    }

    const cliPaths = yield* expectedCliPaths(options.harness)
    const commandSets = expectedHarnessCommandSets(cliPaths, options.harness)
    assertHarnessScripts(errors, packageJson, commandSets)

    yield* assertNoLocalHarnessDispatcher(errors, options.target, packageJson)
    yield* assertTsgoConfig(errors, options.target)
    yield* assertEffectVitestTests(errors, options.target, ['src', 'tests'], { requireEffectApi: true })
    yield* assertRuntimeContract(errors, options.target, options.harness, manifest, packageJson, commandSets)
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
