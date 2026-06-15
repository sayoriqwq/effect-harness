import type { EffectSubtreeManifest, PackageJson } from './Model.ts'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { formatJson, readJson, readJsonLike } from '../platform/Json.ts'
import { copyRuntimeDirectory, ensureDirectory, writeManagedFile } from '../platform/ManagedFiles.ts'
import { HarnessError } from './Errors.ts'
import { decodeManifest, decodePackageJson, decodeTsConfig } from './Model.ts'

const agentsStart = '<!-- effect-harness:start -->'
const agentsEnd = '<!-- effect-harness:end -->'
const legacyHarnessScriptPattern = /\bscripts\/effect-harness(?:-verify)?\.(?:mjs|ts)\b|\beffect-source-subtree\.(?:mjs|ts)\b/u
const legacyHarnessScriptFiles = [
  'scripts/effect-harness.mjs',
  'scripts/effect-harness.ts',
  'scripts/effect-harness-verify.mjs',
  'scripts/effect-harness-verify.ts',
  'scripts/effect-source-subtree.mjs',
  'scripts/effect-source-subtree.ts',
] as const

export interface InitOptions {
  readonly target: string
  readonly harness: string
  readonly dryRun: boolean
}

function removeDependency(packageJson: PackageJson, name: string): void {
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const) {
    if (packageJson[section]?.[name]) {
      delete packageJson[section][name]
    }
  }
}

function setDependency(packageJson: PackageJson, section: 'dependencies' | 'devDependencies', name: string, version: string | undefined): void {
  if (version === undefined) {
    return
  }
  removeDependency(packageJson, name)
  packageJson[section] ??= {}
  packageJson[section][name] = version
}

function ensureScript(packageJson: PackageJson, name: string, command: string): void {
  packageJson.scripts ??= {}
  packageJson.scripts[name] = command
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function invokesPackageScript(command: string, name: string): boolean {
  return new RegExp(`^pnpm\\s+(?:run\\s+)?${escapeRegex(name)}(?:\\s|$)`, 'u').test(command.trim())
}

function removeLegacyHarnessScripts(packageJson: PackageJson): void {
  packageJson.scripts ??= {}
  const removedScripts: Array<string> = []

  for (const [name, command] of Object.entries(packageJson.scripts)) {
    if (legacyHarnessScriptPattern.test(command)) {
      delete packageJson.scripts[name]
      removedScripts.push(name)
    }
  }

  const verify = packageJson.scripts.verify
  if (!verify) {
    return
  }

  const verifyParts = verify
    .split(/\s*&&\s*/u)
    .map(part => part.trim())
    .filter(part =>
      part.length > 0
      && !legacyHarnessScriptPattern.test(part)
      && !removedScripts.some(name => invokesPackageScript(part, name)),
    )

  if (verifyParts.length === 0) {
    delete packageJson.scripts.verify
  }
  else {
    packageJson.scripts.verify = verifyParts.join(' && ')
  }
}

function appendEffectVerify(packageJson: PackageJson): void {
  packageJson.scripts ??= {}
  const verify = packageJson.scripts.verify
  if (!verify) {
    const parts = ['typecheck', 'test', 'lint']
      .filter(name => packageJson.scripts?.[name])
      .map(name => `pnpm ${name}`)
    parts.push('pnpm effect:verify')
    packageJson.scripts.verify = parts.join(' && ')
    return
  }

  if (!/\bpnpm\s+effect:verify\b/u.test(verify)) {
    packageJson.scripts.verify = `${verify} && pnpm effect:verify`
  }
}

const updatePackageJson = Effect.fnUntraced(function* (
  target: string,
  harness: string,
  manifest: EffectSubtreeManifest,
  options: { readonly dryRun: boolean },
  changes: Array<string>,
) {
  const path = yield* Path.Path
  const fs = yield* FileSystem.FileSystem
  const packagePath = path.join(target, 'package.json')
  const exists = yield* fs.exists(packagePath)
  if (!exists) {
    return yield* new HarnessError({ message: `Missing target package.json: ${packagePath}` })
  }

  const packageJson = yield* readJson(packagePath, decodePackageJson)
  const baseline = manifest.packageBaseline

  removeLegacyHarnessScripts(packageJson)
  setDependency(packageJson, 'dependencies', 'effect', baseline.effect)
  setDependency(packageJson, 'dependencies', '@effect/platform-node', baseline['@effect/platform-node'])
  setDependency(packageJson, 'devDependencies', '@effect/vitest', baseline['@effect/vitest'])
  setDependency(packageJson, 'devDependencies', '@effect/tsgo', baseline['@effect/tsgo'])
  setDependency(packageJson, 'devDependencies', '@effect/language-service', baseline['@effect/language-service'])
  setDependency(packageJson, 'devDependencies', '@typescript/native-preview', baseline['@typescript/native-preview'])

  const binPath = path.join(harness, 'bin/effect-harness.ts')
  ensureScript(packageJson, 'effect:status', `node "${binPath}" status --harness "${harness}"`)
  ensureScript(packageJson, 'effect:verify', `node "${binPath}" verify --target . --harness "${harness}"`)

  packageJson.scripts ??= {}
  const previousTypecheck = packageJson.scripts?.typecheck
  if (previousTypecheck && !/\btsgo\s+--noEmit\b/u.test(previousTypecheck) && !packageJson.scripts?.['typecheck:tsc']) {
    packageJson.scripts['typecheck:tsc'] = previousTypecheck
  }
  ensureScript(packageJson, 'typecheck', 'tsgo --noEmit')
  appendEffectVerify(packageJson)

  yield* writeManagedFile(packagePath, formatJson(packageJson), options, changes)
})

const updateTsconfig = Effect.fnUntraced(function* (
  target: string,
  options: { readonly dryRun: boolean },
  changes: Array<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const tsconfigPath = path.join(target, 'tsconfig.json')
  const exists = yield* fs.exists(tsconfigPath)
  const tsconfig = exists ? yield* readJsonLike(tsconfigPath, decodeTsConfig) : {}
  tsconfig.compilerOptions ??= {}
  tsconfig.compilerOptions.plugins ??= []

  const plugins = tsconfig.compilerOptions.plugins
  const existing = plugins.find(plugin => plugin.name === '@effect/language-service')
  const effectPlugin: Record<string, unknown> = existing ?? { name: '@effect/language-service' }
  const optionsRecord = typeof effectPlugin.options === 'object' && effectPlugin.options !== null && !Array.isArray(effectPlugin.options)
    ? effectPlugin.options as Record<string, unknown>
    : {}
  const diagnosticSeverity = typeof optionsRecord.diagnosticSeverity === 'object' && optionsRecord.diagnosticSeverity !== null && !Array.isArray(optionsRecord.diagnosticSeverity)
    ? optionsRecord.diagnosticSeverity as Record<string, unknown>
    : {}

  diagnosticSeverity.floatingEffect = 'error'
  optionsRecord.diagnosticSeverity = diagnosticSeverity
  effectPlugin.options = optionsRecord

  if (!existing) {
    plugins.push(effectPlugin)
  }

  yield* writeManagedFile(tsconfigPath, formatJson(tsconfig), options, changes)
})

const removeLegacyHarnessScriptFiles = Effect.fnUntraced(function* (
  target: string,
  options: { readonly dryRun: boolean },
  changes: Array<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  for (const file of legacyHarnessScriptFiles) {
    const targetPath = path.join(target, file)
    if (!(yield* fs.exists(targetPath))) {
      continue
    }
    changes.push(`remove ${targetPath}`)
    if (!options.dryRun) {
      yield* fs.remove(targetPath)
    }
  }
})

const updateAgents = Effect.fnUntraced(function* (
  target: string,
  harness: string,
  runtimeRoot: string,
  options: { readonly dryRun: boolean },
  changes: Array<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const fragmentPath = path.join(runtimeRoot, 'AGENTS.fragment.md')
  const fragment = (yield* fs.readFileString(fragmentPath))
    .replaceAll('__EFFECT_HARNESS_ROOT__', harness)
    .trim()
  const managed = `${agentsStart}\n${fragment}\n${agentsEnd}`
  const agentsPath = path.join(target, 'AGENTS.md')
  const exists = yield* fs.exists(agentsPath)
  const current = exists ? yield* fs.readFileString(agentsPath) : ''

  const next = current.includes(agentsStart) && current.includes(agentsEnd)
    ? current.replace(new RegExp(`${agentsStart}[\\s\\S]*?${agentsEnd}`, 'u'), managed)
    : `${current.trimEnd()}${current.trim() ? '\n\n' : ''}${managed}\n`

  yield* writeManagedFile(agentsPath, next, options, changes)
})

const writeHarnessManifest = Effect.fnUntraced(function* (
  target: string,
  harness: string,
  manifest: EffectSubtreeManifest,
  options: { readonly dryRun: boolean },
  changes: Array<string>,
) {
  const path = yield* Path.Path
  yield* writeManagedFile(path.join(target, '.effect-harness.json'), formatJson({
    harnessRoot: harness,
    source: {
      repository: manifest.repository,
      branch: manifest.branch,
      split: manifest.split,
    },
    packageBaseline: manifest.packageBaseline,
  }), options, changes)
})

export const initializeTarget = Effect.fnUntraced(function* (options: InitOptions) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const manifestPath = path.join(options.harness, 'repos/effect.subtree.json')
  const runtimeRoot = path.join(options.harness, 'runtime/codex')

  if (!(yield* fs.exists(manifestPath))) {
    return yield* new HarnessError({ message: `Missing harness manifest: ${manifestPath}` })
  }
  if (!(yield* fs.exists(options.target))) {
    return yield* new HarnessError({ message: `Missing target directory: ${options.target}` })
  }

  const manifest = yield* readJson(manifestPath, decodeManifest)
  const changes: Array<string> = []
  const writeOptions = { dryRun: options.dryRun }
  const replacements = {
    __EFFECT_HARNESS_ROOT__: options.harness,
  }

  yield* updatePackageJson(options.target, options.harness, manifest, writeOptions, changes)
  yield* updateTsconfig(options.target, writeOptions, changes)
  yield* removeLegacyHarnessScriptFiles(options.target, writeOptions, changes)
  yield* ensureDirectory(path.join(options.target, '.codex'), writeOptions, changes)
  yield* copyRuntimeDirectory(path.join(runtimeRoot, 'skills'), path.join(options.target, '.codex/skills'), replacements, writeOptions, changes)
  yield* copyRuntimeDirectory(path.join(runtimeRoot, 'agents'), path.join(options.target, '.codex/agents'), replacements, writeOptions, changes)
  yield* ensureDirectory(path.join(options.target, '.codex/effect-feedback'), writeOptions, changes)
  yield* updateAgents(options.target, options.harness, runtimeRoot, writeOptions, changes)
  yield* writeHarnessManifest(options.target, options.harness, manifest, writeOptions, changes)

  if (changes.length === 0) {
    yield* Console.log(`Effect harness already initialized for ${options.target}`)
    return
  }

  for (const change of changes) {
    yield* Console.log(`${options.dryRun ? 'Would ' : ''}${change}`)
  }
  yield* Console.log(`${options.dryRun ? 'Dry run complete' : 'Effect harness initialized'}: ${options.target}`)
})
