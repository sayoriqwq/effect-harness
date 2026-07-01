import type { EffectSubtreeManifest } from './Model.ts'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { ChildProcessSpawner } from 'effect/unstable/process'
import { readJson } from '../platform/Json.ts'
import { commandExitCode, commandLines, commandString } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'
import { decodeManifest, decodePackageJson, decodeProviderPackageBaseline } from './Model.ts'
import { moduleSources } from './ModuleSources.ts'

const subtreeContractPath = 'repos/effect.subtree.json'
const providerProfilePath = 'harness/provider/effect-harness.provider.json'

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
    if (match) {
      return match[1]
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
    if (directVersion && directVersion !== version && directVersion !== 'catalog:') {
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

function assertGitHubSubtreeContract(errors: Array<string>, manifest: EffectSubtreeManifest): void {
  assertStringValue(errors, manifest.kind, 'github-subtree', `${subtreeContractPath}.kind`)
  assertStringValue(errors, manifest.github.repository, 'Effect-TS/effect-smol', `${subtreeContractPath}.github.repository`)
  assertStringValue(errors, manifest.github.url, 'https://github.com/Effect-TS/effect-smol.git', `${subtreeContractPath}.github.url`)
  assertStringValue(errors, manifest.github.branch, 'main', `${subtreeContractPath}.github.branch`)
  assertStringValue(errors, manifest.local.prefix, 'repos/effect', `${subtreeContractPath}.local.prefix`)
  assertStringValue(errors, manifest.anchor.llmDocument, 'repos/effect/LLMS.md', `${subtreeContractPath}.anchor.llmDocument`)
  assertStringValue(errors, manifest.agent.route, 'harness/effect-routes.md', `${subtreeContractPath}.agent.route`)
  assertStringValue(errors, manifest.commands.status, 'partita source status --contract repos/effect.subtree.json --name effect', `${subtreeContractPath}.commands.status`)
  assertStringValue(errors, manifest.commands.update, 'partita source update --contract repos/effect.subtree.json --name effect --dry-run', `${subtreeContractPath}.commands.update`)
  assertStringValue(errors, manifest.commands.verify, 'partita source verify --contract repos/effect.subtree.json --name effect', `${subtreeContractPath}.commands.verify`)
  assertStringValue(errors, manifest.editorPolicy.autoImportExclude, 'block', `${subtreeContractPath}.editorPolicy.autoImportExclude`)
  assertStringValue(errors, manifest.editorPolicy.watcherExclude, 'recommended', `${subtreeContractPath}.editorPolicy.watcherExclude`)
  assertStringValue(errors, manifest.editorPolicy.searchExclude, 'recommended', `${subtreeContractPath}.editorPolicy.searchExclude`)
  assertStringValue(errors, manifest.editorPolicy.filesExclude, 'enabled', `${subtreeContractPath}.editorPolicy.filesExclude`)
  assertStringValue(errors, manifest.ownership.mode, 'provider', `${subtreeContractPath}.ownership.mode`)
  assertBooleanValue(errors, manifest.boundaries.readOnly, true, `${subtreeContractPath}.boundaries.readOnly`)
  assertBooleanValue(errors, manifest.boundaries.importBlock, true, `${subtreeContractPath}.boundaries.importBlock`)
  assertStringValue(errors, manifest.subtree.split, manifest.github.ref, `${subtreeContractPath}.subtree.split`)
  assertStringValue(errors, manifest.subtree.trailer, `git-subtree-split: ${manifest.subtree.split}`, `${subtreeContractPath}.subtree.trailer`)

  if (!/^[0-9a-f]{40}$/u.test(manifest.subtree.split)) {
    errors.push(`${subtreeContractPath}.subtree.split must be a 40-character lowercase git commit SHA.`)
  }

  if (!manifest.github.url.startsWith('https://github.com/')) {
    errors.push(`${subtreeContractPath}.github.url must be a GitHub HTTPS URL.`)
  }
}

export const verifySourcePin = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const manifest = yield* readJson(`${root}/${subtreeContractPath}`, decodeManifest)
  const errors: Array<string> = []
  const sourcePath = `${root}/${manifest.local.prefix}`
  assertGitHubSubtreeContract(errors, manifest)

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
  if (entry?.startsWith('160000 ')) {
    errors.push(`${manifest.local.prefix} is a gitlink submodule; expected a git subtree directory.`)
  }
  else if (entry && !entry.startsWith('040000 tree ')) {
    errors.push(`${manifest.local.prefix} is not recorded as a Git tree entry.`)
  }
  else if (!entry) {
    errors.push(`${manifest.local.prefix} is not recorded in HEAD; source pins must be committed Git tree entries.`)
  }

  if (!(yield* fs.exists(`${root}/${manifest.anchor.llmDocument}`))) {
    errors.push(`Missing Effect source-entry LLM anchor: ${manifest.anchor.llmDocument}`)
  }

  if (yield* hasGitHead(root)) {
    const split = yield* latestSubtreeSplit(root, manifest.local.prefix)
    if (!split) {
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

  const profilePath = `${root}/${providerProfilePath}`
  if (yield* fs.exists(profilePath)) {
    const packageBaseline = yield* readJson(profilePath, decodeProviderPackageBaseline)
    yield* verifyPackageBaseline(errors, root, packageBaseline)
  }

  if (errors.length > 0) {
    yield* Console.error('Effect source subtree verification failed:')
    for (const error of errors) {
      yield* Console.error(`- ${error}`)
    }
    return yield* new HarnessError({ message: 'Effect source subtree verification failed.' })
  }

  yield* Console.log(`Effect source entry verified: ${manifest.local.prefix} @ git-subtree-split ${manifest.subtree.split}`)
})
