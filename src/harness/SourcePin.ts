import type { EffectSubtreeManifest } from './Model.ts'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { ChildProcessSpawner } from 'effect/unstable/process'
import { readJson } from '../platform/Json.ts'
import { commandExitCode, commandLines, commandString } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'
import { decodeManifest, decodePackageJson } from './Model.ts'
import { moduleSources } from './ModuleSources.ts'

function hasVendoredImport(file: string, text: string, manifest: EffectSubtreeManifest): boolean {
  return moduleSources(file, text).some(({ source }) => source.includes(manifest.prefix))
}

function isApplicationSource(file: string, manifest: EffectSubtreeManifest): boolean {
  const sourceRoot = file.startsWith('bin/')
    || file.startsWith('src/')
    || file.startsWith('tests/')
  const sourceExtension = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']
    .some(extension => file.endsWith(extension))

  return sourceRoot && sourceExtension && !file.startsWith(`${manifest.prefix}/`)
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
      errors.push(`${file} imports from ${manifest.prefix}; use package dependencies instead.`)
    }
  }
})

const verifyPackageBaseline = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  manifest: EffectSubtreeManifest,
) {
  const fs = yield* FileSystem.FileSystem
  const packagePath = `${root}/package.json`
  if (!(yield* fs.exists(packagePath))) {
    return
  }

  const packageJson = yield* readJson(packagePath, decodePackageJson)
  const workspacePath = `${root}/pnpm-workspace.yaml`
  const workspaceText = (yield* fs.exists(workspacePath)) ? yield* fs.readFileString(workspacePath) : ''

  for (const [name, version] of Object.entries(manifest.packageBaseline)) {
    const directVersion = packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name]
    if (directVersion && directVersion !== version && directVersion !== 'catalog:') {
      errors.push(`${name} is ${directVersion} in package.json; expected ${version} or catalog:.`)
    }

    if (workspaceText.includes(`${name}:`) && !workspaceText.includes(`${name}: ${version}`)) {
      errors.push(`${name} catalog version does not match manifest baseline ${version}.`)
    }
  }
})

const treeEntry = Effect.fnUntraced(function* (root: string, file: string) {
  if (!(yield* hasGitHead(root))) {
    return undefined
  }
  return yield* commandString('git', ['ls-tree', 'HEAD', file], { cwd: root })
})

export const verifySourcePin = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const manifest = yield* readJson(`${root}/repos/effect.subtree.json`, decodeManifest)
  const errors: Array<string> = []
  const sourcePath = `${root}/${manifest.prefix}`

  if (!(yield* fs.exists(sourcePath))) {
    errors.push(`Missing pinned source directory: ${manifest.prefix}`)
  }
  else {
    const sourceStat = yield* fs.stat(sourcePath)
    if (sourceStat.type !== 'Directory') {
      errors.push(`${manifest.prefix} exists but is not a directory.`)
    }
  }

  const entry = yield* treeEntry(root, manifest.prefix)
  if (entry?.startsWith('160000 ')) {
    errors.push(`${manifest.prefix} is a gitlink submodule; expected a git subtree directory.`)
  }
  else if (entry && !entry.startsWith('040000 tree ')) {
    errors.push(`${manifest.prefix} is not recorded as a Git tree entry.`)
  }
  else if (!entry) {
    errors.push(`${manifest.prefix} is not recorded in HEAD; source pins must be committed Git tree entries.`)
  }

  if (!(yield* fs.exists(`${root}/${manifest.llmDocument}`))) {
    errors.push(`Missing Effect source-entry LLM anchor: ${manifest.llmDocument}`)
  }

  if (yield* hasGitHead(root)) {
    const split = yield* latestSubtreeSplit(root, manifest.prefix)
    if (!split) {
      errors.push(`Missing git subtree split for ${manifest.prefix}; manifest-only source pins are not accepted.`)
    }
    else if (split !== manifest.split) {
      errors.push(`Subtree split mismatch for ${manifest.prefix}: manifest expects ${manifest.split}, git history has ${split}`)
    }
  }
  else {
    errors.push('Missing Git HEAD; source pins must be verified from committed history.')
  }

  const gitmodules = `${root}/.gitmodules`
  if ((yield* fs.exists(gitmodules)) && (yield* fs.readFileString(gitmodules)).includes(manifest.prefix)) {
    errors.push(`${manifest.prefix} must be a git subtree, not a git submodule.`)
  }

  yield* assertNoVendoredImports(errors, root, manifest)
  yield* verifyPackageBaseline(errors, root, manifest)

  if (errors.length > 0) {
    yield* Console.error('Effect source subtree verification failed:')
    for (const error of errors) {
      yield* Console.error(`- ${error}`)
    }
    return yield* new HarnessError({ message: 'Effect source subtree verification failed.' })
  }

  yield* Console.log(`Effect source entry verified: ${manifest.prefix} @ git-subtree-split ${manifest.split}`)
})
