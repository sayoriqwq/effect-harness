import type { EffectSubtreeManifest } from './Model.ts'
import { Console, Effect, FileSystem } from 'effect'
import { ChildProcessSpawner } from 'effect/unstable/process'
import { readJson } from '../platform/Json.ts'
import { commandExitCode, commandLines, commandString } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'
import { decodeManifest, decodePackageJson, decodeProviderPackageBaseline } from './Model.ts'
import { moduleSources } from './ModuleSources.ts'

interface ExpectedSourcePin {
  readonly name: string
  readonly contractPath: string
  readonly repository: string
  readonly prefix: string
  readonly anchor: string
  readonly route: string
  readonly updateCommand: string
  readonly verifyCommand: string
  readonly filesExclude: string
}

const providerProfilePath = 'harness/provider/effect-harness.provider.json'

const expectedSourcePins: ReadonlyArray<ExpectedSourcePin> = [
  {
    name: 'effect',
    contractPath: 'repos/effect.subtree.json',
    repository: 'https://github.com/Effect-TS/effect-smol',
    prefix: 'repos/effect',
    anchor: 'repos/effect/LLMS.md',
    route: 'harness/effect-routes.md',
    updateCommand: 'partita pin update --contract repos/effect.subtree.json --name effect --prefix repos/effect --dry-run',
    verifyCommand: 'partita pin verify --contract repos/effect.subtree.json --name effect --prefix repos/effect',
    filesExclude: 'enabled',
  },
  {
    name: 'tsgo',
    contractPath: 'repos/tsgo.subtree.json',
    repository: 'https://github.com/Effect-TS/tsgo',
    prefix: 'repos/tsgo',
    anchor: 'repos/tsgo/README.md',
    route: 'harness/tsgo-routes.md',
    updateCommand: 'partita pin update --contract repos/tsgo.subtree.json --name tsgo --prefix repos/tsgo --dry-run',
    verifyCommand: 'partita pin verify --contract repos/tsgo.subtree.json --name tsgo --prefix repos/tsgo',
    filesExclude: 'disabled',
  },
]

function hasVendoredImport(file: string, text: string, manifest: EffectSubtreeManifest): boolean {
  return moduleSources(file, text).some(({ source }) => source.includes(manifest.local.prefix))
}

function isApplicationSource(file: string, manifest: EffectSubtreeManifest): boolean {
  const sourceRoot = file.startsWith('bin/')
    || file.startsWith('src/')
    || file.startsWith('tests/')
  const sourceExtension = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']
    .some(extension => file.endsWith(extension))

  return sourceRoot && sourceExtension && !file.startsWith(`${manifest.local.prefix}/`)
}

const hasGitHead = Effect.fnUntraced(function* (root: string) {
  const exitCode = yield* commandExitCode('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root })
  return exitCode === ChildProcessSpawner.ExitCode(0)
})

const latestSubtreeSplit = Effect.fnUntraced(function* (root: string, prefix: string) {
  const output = yield* commandString('git', [
    'log',
    '--format=%B%x1e',
    `--grep=git-subtree-dir: ${prefix}`,
  ], { cwd: root })

  for (const entry of output.split('\x1E')) {
    if (!entry.includes(`git-subtree-dir: ${prefix}`)) {
      continue
    }

    const match = entry.match(/git-subtree-split:\s*([0-9a-f]{40})/u)
    if (match !== null) {
      return match[1]!
    }
  }

  return undefined
})

const trackedFiles = Effect.fnUntraced(function* (root: string) {
  if (!(yield* hasGitHead(root))) {
    return []
  }
  return yield* commandLines('git', ['ls-files'], { cwd: root })
})

const assertNoVendoredImports = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  manifest: EffectSubtreeManifest,
) {
  const fs = yield* FileSystem.FileSystem
  const files = (yield* trackedFiles(root)).filter(file => isApplicationSource(file, manifest))

  for (const file of files) {
    const filePath = `${root}/${file}`
    if (!(yield* fs.exists(filePath))) {
      continue
    }

    const text = yield* fs.readFileString(filePath)
    if (hasVendoredImport(file, text, manifest)) {
      errors.push(`${file} imports from ${manifest.local.prefix}; use package dependencies instead.`)
    }
  }
})

const verifyPackageBaseline = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  packageBaseline: Readonly<Record<string, string>>,
) {
  const fs = yield* FileSystem.FileSystem
  const packagePath = `${root}/package.json`
  if (!(yield* fs.exists(packagePath))) {
    return
  }

  const packageJson = yield* readJson(packagePath, decodePackageJson)
  const workspacePath = `${root}/pnpm-workspace.yaml`
  const workspaceText = (yield* fs.exists(workspacePath)) ? yield* fs.readFileString(workspacePath) : ''

  for (const [name, version] of Object.entries(packageBaseline)) {
    const directVersion = packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name]
    if (directVersion !== undefined && directVersion.length > 0 && directVersion !== version && directVersion !== 'catalog:') {
      errors.push(`${name} is ${directVersion} in package.json; expected ${version} or catalog:.`)
    }

    if (workspaceText.includes(`${name}:`) && !workspaceText.includes(`${name}: ${version}`)) {
      errors.push(`${name} catalog version does not match provider profile baseline ${version}.`)
    }
  }
})

const treeEntry = Effect.fnUntraced(function* (root: string, file: string) {
  if (!(yield* hasGitHead(root))) {
    return undefined
  }
  return yield* commandString('git', ['ls-tree', 'HEAD', file], { cwd: root })
})

function assertStringValue(errors: Array<string>, actual: string, expected: string, source: string): void {
  if (actual !== expected) {
    errors.push(`${source} is ${actual}; expected ${expected}.`)
  }
}

function assertBooleanValue(errors: Array<string>, actual: boolean, expected: boolean, source: string): void {
  if (actual !== expected) {
    errors.push(`${source} is ${String(actual)}; expected ${String(expected)}.`)
  }
}

function assertGitHubSubtreeContract(
  errors: Array<string>,
  manifest: EffectSubtreeManifest,
  expected: ExpectedSourcePin,
): void {
  assertStringValue(errors, manifest.name, expected.name, `${expected.contractPath}.name`)
  assertStringValue(errors, manifest.github.repository, expected.repository, `${expected.contractPath}.github.repository`)
  assertStringValue(errors, manifest.github.branch, 'main', `${expected.contractPath}.github.branch`)
  assertStringValue(errors, manifest.local.prefix, expected.prefix, `${expected.contractPath}.local.prefix`)
  assertStringValue(errors, manifest.mechanism, 'git-subtree', `${expected.contractPath}.mechanism`)
  assertStringValue(errors, manifest.anchor.llmDocument, expected.anchor, `${expected.contractPath}.anchor.llmDocument`)
  assertStringValue(errors, manifest.agent.route, expected.route, `${expected.contractPath}.agent.route`)
  assertStringValue(errors, manifest.commands.update, expected.updateCommand, `${expected.contractPath}.commands.update`)
  assertStringValue(errors, manifest.commands.verify, expected.verifyCommand, `${expected.contractPath}.commands.verify`)
  assertStringValue(errors, manifest.editorPolicy.autoImportExclude, 'block', `${expected.contractPath}.editorPolicy.autoImportExclude`)
  assertStringValue(errors, manifest.editorPolicy.watcherExclude, 'recommended', `${expected.contractPath}.editorPolicy.watcherExclude`)
  assertStringValue(errors, manifest.editorPolicy.searchExclude, 'recommended', `${expected.contractPath}.editorPolicy.searchExclude`)
  assertStringValue(errors, manifest.editorPolicy.filesExclude, expected.filesExclude, `${expected.contractPath}.editorPolicy.filesExclude`)
  assertStringValue(errors, manifest.ownership.mode, 'provider', `${expected.contractPath}.ownership.mode`)
  assertBooleanValue(errors, manifest.boundaries.readOnly, true, `${expected.contractPath}.boundaries.readOnly`)
  assertBooleanValue(errors, manifest.boundaries.importBlock, true, `${expected.contractPath}.boundaries.importBlock`)
  assertStringValue(errors, manifest.subtree.split, manifest.github.ref, `${expected.contractPath}.subtree.split`)
  assertStringValue(errors, manifest.subtree.trailer, `git-subtree-split: ${manifest.subtree.split}`, `${expected.contractPath}.subtree.trailer`)

  if (!/^[0-9a-f]{40}$/u.test(manifest.subtree.split)) {
    errors.push(`${expected.contractPath}.subtree.split must be a 40-character lowercase git commit SHA.`)
  }

  if (!manifest.github.repository.startsWith('https://github.com/')) {
    errors.push(`${expected.contractPath}.github.repository must be a GitHub HTTPS URL.`)
  }
}

const verifyOneSourcePin = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  expected: ExpectedSourcePin,
) {
  const fs = yield* FileSystem.FileSystem
  const manifest = yield* readJson(`${root}/${expected.contractPath}`, decodeManifest)
  const sourcePath = `${root}/${manifest.local.prefix}`
  assertGitHubSubtreeContract(errors, manifest, expected)

  if (!(yield* fs.exists(sourcePath))) {
    errors.push(`Missing pinned source directory: ${manifest.local.prefix}`)
  }
  else {
    const sourceStat = yield* fs.stat(sourcePath)
    if (sourceStat.type !== 'Directory') {
      errors.push(`${manifest.local.prefix} exists but is not a directory.`)
    }
  }

  const entry = yield* treeEntry(root, manifest.local.prefix)
  if (entry !== undefined && entry.startsWith('160000 ')) {
    errors.push(`${manifest.local.prefix} is a gitlink submodule; expected a git subtree directory.`)
  }
  else if (entry !== undefined && entry.length > 0 && !entry.startsWith('040000 tree ')) {
    errors.push(`${manifest.local.prefix} is not recorded as a Git tree entry.`)
  }
  else if (entry === undefined || entry.length === 0) {
    errors.push(`${manifest.local.prefix} is not recorded in HEAD; source pins must be committed Git tree entries.`)
  }

  if (!(yield* fs.exists(`${root}/${manifest.anchor.llmDocument}`))) {
    errors.push(`Missing source-entry LLM anchor: ${manifest.anchor.llmDocument}`)
  }

  if (!(yield* fs.exists(`${root}/${manifest.agent.route}`))) {
    errors.push(`Missing source-entry agent route: ${manifest.agent.route}`)
  }

  if (yield* hasGitHead(root)) {
    const split = yield* latestSubtreeSplit(root, manifest.local.prefix)
    if (split === undefined) {
      errors.push(`Missing git subtree split for ${manifest.local.prefix}; contract-only source pins are not accepted.`)
    }
    else if (split !== manifest.subtree.split) {
      errors.push(`Subtree split mismatch for ${manifest.local.prefix}: contract expects ${manifest.subtree.split}, git history has ${split}`)
    }
  }
  else {
    errors.push('Missing Git HEAD; source pins must be verified from committed history.')
  }

  const gitmodules = `${root}/.gitmodules`
  if ((yield* fs.exists(gitmodules)) && (yield* fs.readFileString(gitmodules)).includes(manifest.local.prefix)) {
    errors.push(`${manifest.local.prefix} must be a git subtree, not a git submodule.`)
  }

  yield* assertNoVendoredImports(errors, root, manifest)
})

export const verifySourcePin = Effect.fnUntraced(function* (root: string) {
  const errors: Array<string> = []
  const pins = expectedSourcePins

  for (const expected of pins) {
    yield* verifyOneSourcePin(errors, root, expected)
  }

  const packageBaseline = yield* readJson(`${root}/${providerProfilePath}`, decodeProviderPackageBaseline)
  yield* verifyPackageBaseline(errors, root, packageBaseline)

  if (errors.length > 0) {
    yield* Console.error('Source subtree verification failed:')
    for (const error of errors) {
      yield* Console.error(`- ${error}`)
    }
    return yield* new HarnessError({ message: 'Source subtree verification failed.' })
  }

  for (const expected of pins) {
    const manifest = yield* readJson(`${root}/${expected.contractPath}`, decodeManifest)
    yield* Console.log(`Source entry verified: ${manifest.local.prefix} @ git-subtree-split ${manifest.subtree.split}`)
  }
})
