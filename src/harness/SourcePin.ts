import type { EffectSubtreeManifest, OfficialSnapshot } from './Model.ts'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { ChildProcessSpawner } from 'effect/unstable/process'
import { formatJson, readJson } from '../platform/Json.ts'
import { commandExitCode, commandLines, commandString } from '../platform/Process.ts'
import { HarnessError } from './Errors.ts'
import { decodeManifest, decodePackageJson, packageTargets } from './Model.ts'
import { moduleSources } from './ModuleSources.ts'
import { resolveOfficialSnapshot } from './Status.ts'

export interface UpdateSourcePinOptions {
  readonly harness: string
  readonly snapshot?: string | undefined
  readonly dryRun: boolean
}

const baselineProjectionFiles = [
  'AGENTS.md',
  'README.md',
  'docs/effect-patterns/index.md',
  'docs/effect-patterns/effect-v4-source-reference.md',
  'docs/effect-official-harness-inventory.md',
  'tests/effect-target-init.test.ts',
  'tests/effect-target-verify.test.ts',
] as const

function hasVendoredImport(file: string, text: string, manifest: EffectSubtreeManifest): boolean {
  return moduleSources(file, text).some(({ source }) => source.includes(manifest.prefix))
}

function isApplicationSource(file: string, manifest: EffectSubtreeManifest): boolean {
  const sourceRoot = file.startsWith('bin/')
    || file.startsWith('src/')
    || file.startsWith('scripts/')
    || file.startsWith('tests/')
    || file.startsWith('apps/')
    || file.startsWith('libs/')
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function regexLiteralVersion(value: string): string {
  return value.replaceAll('.', '\\.')
}

function replaceRequiredLine(text: string, pattern: RegExp, replacement: (indent: string) => string, label: string): string {
  let matched = false
  const next = text.replace(pattern, (_line, indent: string) => {
    matched = true
    return replacement(indent)
  })
  if (!matched) {
    throw new HarnessError({ message: `Cannot update pnpm-workspace.yaml; missing ${label}.` })
  }
  return next
}

function yamlKey(name: string): string {
  return name.startsWith('@') ? `'${name}'` : name
}

function replaceYamlScalar(text: string, key: string, value: string): string {
  return replaceRequiredLine(
    text,
    new RegExp(`^(\\s*${escapeRegex(yamlKey(key))}:\\s*).*$`, 'mu'),
    indent => `${indent}${value}`,
    `${key} scalar`,
  )
}

function replaceTrustPolicyExclude(text: string, name: string, version: string): string {
  return replaceRequiredLine(
    text,
    new RegExp(`^(\\s*-\\s*)'?${escapeRegex(name)}@[^'\\n]+?'?$`, 'mu'),
    indent => `${indent}${name.startsWith('@') ? `'${name}@${version}'` : `${name}@${version}`}`,
    `${name} trustPolicyExclude entry`,
  )
}

function updateWorkspaceProjection(text: string, baseline: Readonly<Record<string, string>>): string {
  let next = text

  next = replaceTrustPolicyExclude(next, '@effect/platform-node', baseline['@effect/platform-node']!)
  next = replaceTrustPolicyExclude(next, '@effect/platform-node-shared', baseline['@effect/platform-node']!)
  next = replaceTrustPolicyExclude(next, '@effect/vitest', baseline['@effect/vitest']!)
  next = replaceTrustPolicyExclude(next, 'effect', baseline.effect!)

  next = replaceYamlScalar(next, '@effect/platform-node-shared', baseline['@effect/platform-node']!)
  for (const { name } of packageTargets) {
    next = replaceYamlScalar(next, name, baseline[name]!)
  }

  return next
}

function updateTextProjection(text: string, current: EffectSubtreeManifest, nextManifest: EffectSubtreeManifest): string {
  let next = text.replaceAll(current.split, nextManifest.split)

  for (const [name, version] of Object.entries(current.packageBaseline)) {
    const nextVersion = nextManifest.packageBaseline[name]
    if (!nextVersion || version === nextVersion) {
      continue
    }
    next = next
      .replaceAll(`${name}@${version}`, `${name}@${nextVersion}`)
      .replaceAll(regexLiteralVersion(version), regexLiteralVersion(nextVersion))
      .replaceAll(version, nextVersion)
  }

  return next
}

function nextPackageBaseline(
  manifest: EffectSubtreeManifest,
  official: OfficialSnapshot,
): Effect.Effect<Record<string, string>, HarnessError> {
  const baseline: Record<string, string> = { ...manifest.packageBaseline }
  for (const { name, tag } of packageTargets) {
    const version = official.packages?.[name]
    if (!version) {
      return Effect.fail(new HarnessError({ message: `Official snapshot is missing ${name} (${tag}).` }))
    }
    baseline[name] = version
  }
  return Effect.succeed(baseline)
}

const assertCleanWorktree = Effect.fnUntraced(function* (root: string) {
  const status = yield* commandString('git', ['status', '--porcelain'], { cwd: root })
  if (status.length > 0) {
    yield* Console.error('Refusing to update the Effect source pin with a dirty working tree:')
    yield* Console.error(status)
    return yield* new HarnessError({ message: 'Dirty worktree.' })
  }
})

const syncOfficialSource = Effect.fnUntraced(function* (
  root: string,
  manifest: EffectSubtreeManifest,
  sourceHead: string,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  yield* Effect.scoped(Effect.gen(function* () {
    const checkout = yield* fs.makeTempDirectoryScoped({ prefix: 'effect-harness-source-' })
    yield* commandString('git', ['init', '--initial-branch=main'], { cwd: checkout })
    yield* commandString('git', ['fetch', '--depth=1', manifest.repository, manifest.branch], { cwd: checkout })
    yield* commandString('git', ['checkout', '--detach', sourceHead], { cwd: checkout })

    const target = path.join(root, manifest.prefix)
    yield* fs.remove(target, { recursive: true, force: true })
    yield* fs.makeDirectory(target, { recursive: true })

    for (const entry of yield* fs.readDirectory(checkout)) {
      if (entry === '.git') {
        continue
      }
      yield* fs.copy(path.join(checkout, entry), path.join(target, entry), { overwrite: true })
    }
  }))
})

const writeSourceUpdateProjection = Effect.fnUntraced(function* (
  root: string,
  current: EffectSubtreeManifest,
  nextManifest: EffectSubtreeManifest,
  options: { readonly dryRun: boolean },
  changes: Array<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const manifestPath = path.join(root, 'repos/effect.subtree.json')
  const nextManifestText = formatJson(nextManifest)
  if ((yield* fs.readFileString(manifestPath)) !== nextManifestText) {
    changes.push(`update ${manifestPath}`)
    if (!options.dryRun) {
      yield* fs.writeFileString(manifestPath, nextManifestText)
    }
  }

  const workspacePath = path.join(root, 'pnpm-workspace.yaml')
  const workspaceText = yield* fs.readFileString(workspacePath)
  const nextWorkspaceText = updateWorkspaceProjection(workspaceText, nextManifest.packageBaseline)
  if (workspaceText !== nextWorkspaceText) {
    changes.push(`update ${workspacePath}`)
    if (!options.dryRun) {
      yield* fs.writeFileString(workspacePath, nextWorkspaceText)
    }
  }

  for (const file of baselineProjectionFiles) {
    const filePath = path.join(root, file)
    const exists = yield* fs.exists(filePath)
    if (!exists) {
      continue
    }
    const text = yield* fs.readFileString(filePath)
    const nextText = updateTextProjection(text, current, nextManifest)
    if (text === nextText) {
      continue
    }
    changes.push(`update ${filePath}`)
    if (!options.dryRun) {
      yield* fs.writeFileString(filePath, nextText)
    }
  }
})

const treeEntry = Effect.fnUntraced(function* (root: string, file: string) {
  if (!(yield* hasGitHead(root))) {
    return undefined
  }
  return yield* commandString('git', ['ls-tree', 'HEAD', file], { cwd: root })
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
    const exists = yield* fs.exists(filePath)
    if (!exists) {
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
  const packageExists = yield* fs.exists(packagePath)
  if (!packageExists) {
    return
  }

  const packageJson = yield* readJson(packagePath, decodePackageJson)
  const workspacePath = `${root}/pnpm-workspace.yaml`
  const workspaceExists = yield* fs.exists(workspacePath)
  const workspaceText = workspaceExists ? yield* fs.readFileString(workspacePath) : ''

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

export const verifySourcePin = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const manifestPath = `${root}/repos/effect.subtree.json`
  const manifest = yield* readJson(manifestPath, decodeManifest)
  const errors: Array<string> = []
  const warnings: Array<string> = []
  const sourcePath = `${root}/${manifest.prefix}`

  if (!(yield* fs.exists(sourcePath))) {
    errors.push(`Missing vendored source directory: ${manifest.prefix}`)
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
    warnings.push(`${manifest.prefix} is verified from the working tree because this repo has no HEAD commit yet.`)
  }

  if (!(yield* fs.exists(`${root}/${manifest.llmDocument}`))) {
    errors.push(`Missing Effect LLM document: ${manifest.llmDocument}`)
  }

  if (yield* hasGitHead(root)) {
    const split = yield* latestSubtreeSplit(root, manifest.prefix)
    if (!split) {
      warnings.push(`No git subtree split found for ${manifest.prefix}; manifest split ${manifest.split} is the active source pin.`)
    }
    else if (split !== manifest.split) {
      errors.push(`Subtree split mismatch for ${manifest.prefix}: manifest expects ${manifest.split}, git history has ${split}`)
    }
  }
  else {
    warnings.push(`No Git history yet; manifest split ${manifest.split} is the active source pin.`)
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

  for (const warning of warnings) {
    yield* Console.warn(`Effect source subtree warning: ${warning}`)
  }

  yield* Console.log(`Effect source subtree verified: ${manifest.prefix} @ git-subtree-split ${manifest.split}`)
})

export const updateSourcePin = Effect.fnUntraced(function* (options: UpdateSourcePinOptions) {
  const path = yield* Path.Path
  const manifestPath = path.join(options.harness, 'repos/effect.subtree.json')
  const manifest = yield* readJson(manifestPath, decodeManifest)
  const official = yield* resolveOfficialSnapshot(manifest, options.snapshot)
  const sourceHead = official.sourceHead
  if (!sourceHead) {
    return yield* new HarnessError({ message: 'Official snapshot is missing sourceHead.' })
  }

  const packageBaseline = yield* nextPackageBaseline(manifest, official)
  const nextManifest: EffectSubtreeManifest = {
    ...manifest,
    split: sourceHead,
    packageBaseline,
  }
  const changes: Array<string> = []

  yield* assertCleanWorktree(options.harness)
  if (manifest.split !== sourceHead) {
    changes.push(`sync ${path.join(options.harness, manifest.prefix)} from ${manifest.repository} ${sourceHead}`)
    if (!options.dryRun) {
      yield* syncOfficialSource(options.harness, manifest, sourceHead)
    }
  }

  yield* writeSourceUpdateProjection(options.harness, manifest, nextManifest, options, changes)

  if (changes.length === 0) {
    yield* Console.log(`Effect source pin already current: ${manifest.prefix} @ ${manifest.split}`)
    return
  }

  for (const change of changes) {
    yield* Console.log(`${options.dryRun ? 'Would ' : ''}${change}`)
  }
  yield* Console.log(`${options.dryRun ? 'Dry run complete' : 'Effect source pin updated'}: ${manifest.split} -> ${sourceHead}`)
  yield* Console.log('Run pnpm install, pnpm verify, and pnpm effect:status before committing the update.')
})
