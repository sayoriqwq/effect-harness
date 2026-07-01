import type { PlatformError } from 'effect'
import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { assert, it } from '@effect/vitest'
import { Effect, FileSystem, Path, Schema, Stream } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

const currentFile = fileURLToPath(import.meta.url)
const effectRepositoryUrl = 'https://github.com/Effect-TS/effect-smol'
const effectPrefix = 'repos/effect'
const effectLlmDocument = 'repos/effect/LLMS.md'
const effectRoute = 'harness/effect-routes.md'
const tsgoRepositoryUrl = 'https://github.com/Effect-TS/tsgo'
const tsgoPrefix = 'repos/tsgo'
const tsgoLlmDocument = 'repos/tsgo/README.md'
const tsgoRoute = 'harness/tsgo-routes.md'
const defaultTsgoSplit = '9'.repeat(40)
const packageBaseline = {
  'effect': '4.0.0-beta.92',
  '@effect/platform-node': '4.0.0-beta.92',
  '@effect/vitest': '4.0.0-beta.92',
  '@effect/tsgo': '0.15.0',
  '@effect/language-service': '0.86.2',
  '@typescript/native-preview': '7.0.0-dev.20260630.1',
} as const

interface CommandResult {
  readonly status: number
  readonly stdout: string
  readonly stderr: string
}

const repoRoot = Effect.fnUntraced(function* () {
  const path = yield* Path.Path
  return path.resolve(path.dirname(currentFile), '..')
})

const runCommand = Effect.fnUntraced(function* (
  cwd: string,
  command: string,
  args: ReadonlyArray<string>,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  return yield* Effect.scoped(Effect.gen(function* () {
    const handle = yield* spawner.spawn(ChildProcess.make(command, args, {
      cwd,
      extendEnv: true,
    }))
    const [stdout, stderr, exitCode] = yield* Effect.all([
      Stream.mkString(Stream.decodeText(handle.stdout)),
      Stream.mkString(Stream.decodeText(handle.stderr)),
      handle.exitCode,
    ])
    return {
      status: Number(exitCode),
      stderr,
      stdout,
    } satisfies CommandResult
  }))
})

const git = Effect.fnUntraced(function* (root: string, args: ReadonlyArray<string>) {
  const result = yield* runCommand(root, 'git', args)
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
})

const initGit = Effect.fnUntraced(function* (root: string) {
  yield* git(root, ['init', '--initial-branch=main'])
  yield* git(root, ['config', 'user.email', 'effect-harness@example.invalid'])
  yield* git(root, ['config', 'user.name', 'Effect Harness Test'])
})

const commit = Effect.fnUntraced(function* (root: string, message: string) {
  yield* git(root, ['add', '.'])
  yield* git(root, ['commit', '-m', message])
})

const commitWithTrailer = Effect.fnUntraced(function* (root: string, split: string, prefix = effectPrefix) {
  yield* commit(root, `Add source entry\n\ngit-subtree-dir: ${prefix}\ngit-subtree-split: ${split}`)
})

const runSourceVerify = Effect.fnUntraced(function* (root: string) {
  const path = yield* Path.Path
  const rootPath = yield* repoRoot()
  const cliPath = path.join(rootPath, 'bin/effect-harness.ts')
  return yield* runCommand(rootPath, process.execPath, [cliPath, 'source-verify', '--harness', root])
})

interface SourceEntryContractOptions {
  readonly name: 'effect' | 'tsgo'
  readonly split: string
  readonly repositoryUrl: string
  readonly prefix: string
  readonly llmDocument: string
  readonly route: string
  readonly filesExclude: string
  readonly branch?: string | undefined
}

function sourceEntryContract(options: SourceEntryContractOptions) {
  const branch = options.branch ?? 'main'
  const contractPath = `repos/${options.name}.subtree.json`

  return {
    schemaVersion: 1,
    name: options.name,
    github: {
      repository: options.repositoryUrl,
      branch,
      ref: options.split,
    },
    local: {
      prefix: options.prefix,
    },
    mechanism: 'git-subtree',
    subtree: {
      split: options.split,
      trailer: `git-subtree-split: ${options.split}`,
    },
    anchor: {
      llmDocument: options.llmDocument,
    },
    commands: {
      update: `partita pin update --contract ${contractPath} --name ${options.name} --prefix ${options.prefix} --dry-run`,
      verify: `partita pin verify --contract ${contractPath} --name ${options.name} --prefix ${options.prefix}`,
    },
    agent: {
      route: options.route,
    },
    editorPolicy: {
      autoImportExclude: 'block',
      watcherExclude: 'recommended',
      searchExclude: 'recommended',
      filesExclude: options.filesExclude,
    },
    ownership: {
      mode: 'provider',
    },
    boundaries: {
      readOnly: true,
      importBlock: true,
    },
  }
}

function effectSourceEntryContract(options: {
  readonly split: string
  readonly repositoryUrl?: string | undefined
  readonly branch?: string | undefined
  readonly prefix?: string | undefined
  readonly llmDocument?: string | undefined
}) {
  return sourceEntryContract({
    branch: options.branch,
    filesExclude: 'enabled',
    llmDocument: options.llmDocument ?? effectLlmDocument,
    name: 'effect',
    prefix: options.prefix ?? effectPrefix,
    repositoryUrl: options.repositoryUrl ?? effectRepositoryUrl,
    route: effectRoute,
    split: options.split,
  })
}

function tsgoSourceEntryContract(split: string) {
  return sourceEntryContract({
    filesExclude: 'disabled',
    llmDocument: tsgoLlmDocument,
    name: 'tsgo',
    prefix: tsgoPrefix,
    repositoryUrl: tsgoRepositoryUrl,
    route: tsgoRoute,
    split,
  })
}

const writeProviderProfile = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const profileText = yield* Schema.encodeUnknownEffect(Schema.UnknownFromJsonString)({
    profiles: {
      'codex-effect-v4': {
        packageBaseline,
      },
    },
  })
  yield* fs.makeDirectory(path.join(root, 'harness/provider'), { recursive: true })
  yield* fs.writeFileString(path.join(root, 'harness/provider/effect-harness.provider.json'), `${profileText}\n`)
})

const writeSourceContract = Effect.fnUntraced(function* (
  root: string,
  contractPath: string,
  routePath: string,
  contract: unknown,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const contractText = yield* Schema.encodeUnknownEffect(Schema.UnknownFromJsonString)(contract)
  yield* fs.makeDirectory(path.join(root, 'repos'), { recursive: true })
  yield* fs.makeDirectory(path.join(root, 'harness'), { recursive: true })
  yield* fs.writeFileString(path.join(root, contractPath), `${contractText}\n`)
  yield* fs.writeFileString(path.join(root, routePath), '# Source routes\n')
})

const writeEffectContract = Effect.fnUntraced(function* (root: string, contract: unknown) {
  yield* writeSourceContract(root, 'repos/effect.subtree.json', effectRoute, contract)
})

const writeTsgoContract = Effect.fnUntraced(function* (root: string, contract: unknown) {
  yield* writeSourceContract(root, 'repos/tsgo.subtree.json', tsgoRoute, contract)
})

const writePinnedEffectSource = Effect.fnUntraced(function* (root: string, llms = '# Effect\n') {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  yield* fs.makeDirectory(path.join(root, effectPrefix), { recursive: true })
  yield* fs.writeFileString(path.join(root, effectLlmDocument), llms)
})

const writePinnedTsgoSource = Effect.fnUntraced(function* (root: string, readme = '# Tsgo\n') {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  yield* fs.makeDirectory(path.join(root, tsgoPrefix), { recursive: true })
  yield* fs.writeFileString(path.join(root, tsgoLlmDocument), readme)
})

const writeValidTsgoSourceEntry = Effect.fnUntraced(function* (root: string, split = defaultTsgoSplit) {
  yield* writePinnedTsgoSource(root)
  yield* writeTsgoContract(root, tsgoSourceEntryContract(split))
  yield* commitWithTrailer(root, split, tsgoPrefix)
})

function withTempDir<A, E, R>(
  run: (root: string) => Effect.Effect<A, E, R>,
): Effect.Effect<A, E | PlatformError.PlatformError, R | FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const root = yield* Effect.acquireRelease(
      fs.makeTempDirectory({ prefix: 'effect-harness-subtree-' }),
      directory => fs.remove(directory, { recursive: true, force: true }).pipe(
        Effect.catch(() => Effect.void),
      ),
    )
    return yield* run(root)
  }).pipe(Effect.scoped)
}

it.layer(NodeServices.layer)((it) => {
  it.effect('source subtree verifier reads the split from the current HEAD history only', () => withTempDir(root => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const splitOnMain = 'a'.repeat(40)
    const splitOnOtherBranch = 'b'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writePinnedEffectSource(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split: splitOnMain }))
    yield* commitWithTrailer(root, splitOnMain)
    yield* writeValidTsgoSourceEntry(root)

    yield* git(root, ['switch', '-c', 'other'])
    yield* fs.writeFileString(path.join(root, 'other.txt'), 'other branch only\n')
    yield* commitWithTrailer(root, splitOnOtherBranch)
    yield* git(root, ['switch', 'main'])

    const result = yield* runSourceVerify(root)

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, new RegExp(splitOnMain, 'u'))
  })))

  it.effect('source subtree verifier accepts the dual GitHub subtree contracts', () => withTempDir(root => Effect.gen(function* () {
    const effectSplit = 'c'.repeat(40)
    const tsgoSplit = '8'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writePinnedEffectSource(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split: effectSplit }))
    yield* commitWithTrailer(root, effectSplit)
    yield* writeValidTsgoSourceEntry(root, tsgoSplit)

    const result = yield* runSourceVerify(root)

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Source entry verified: repos\/effect/u)
    assert.match(result.stdout, /Source entry verified: repos\/tsgo/u)
  })))

  it.effect('source subtree verifier rejects a missing source directory', () => withTempDir(root => Effect.gen(function* () {
    const split = 'd'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split }))
    yield* commitWithTrailer(root, split)
    yield* writeValidTsgoSourceEntry(root)

    const result = yield* runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing pinned source directory: repos\/effect/u)
  })))

  it.effect('source subtree verifier rejects a gitlink submodule source entry', () => withTempDir(root => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const split = 'e'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split }))
    yield* fs.writeFileString(path.join(root, '.gitmodules'), `[submodule "effect"]\n\tpath = ${effectPrefix}\n\turl = ${effectRepositoryUrl}.git\n`)
    yield* git(root, ['add', 'repos/effect.subtree.json', '.gitmodules'])
    yield* git(root, ['update-index', '--add', '--cacheinfo', `160000,${split},${effectPrefix}`])
    yield* git(root, ['commit', '-m', `Add gitlink\n\ngit-subtree-dir: ${effectPrefix}\ngit-subtree-split: ${split}`])
    yield* writePinnedEffectSource(root)
    yield* writeValidTsgoSourceEntry(root)

    const result = yield* runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /repos\/effect is a gitlink submodule/u)
  })))

  it.effect('source subtree verifier rejects a contract pin when history has no subtree trailer', () => withTempDir(root => Effect.gen(function* () {
    const split = 'f'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writePinnedEffectSource(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split }))
    yield* commit(root, 'Import pinned source without subtree trailer')
    yield* writeValidTsgoSourceEntry(root)

    const result = yield* runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing git subtree split for repos\/effect; contract-only source pins are not accepted/u)
  })))

  it.effect('source subtree verifier rejects a contract split that does not match the subtree trailer', () => withTempDir(root => Effect.gen(function* () {
    const contractSplit = '1'.repeat(40)
    const trailerSplit = '2'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writePinnedEffectSource(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split: contractSplit }))
    yield* commitWithTrailer(root, trailerSplit)
    yield* writeValidTsgoSourceEntry(root)

    const result = yield* runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Subtree split mismatch for repos\/effect/u)
  })))

  it.effect('source subtree verifier rejects a missing LLMS anchor document', () => withTempDir(root => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const split = '3'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* fs.makeDirectory(path.join(root, effectPrefix), { recursive: true })
    yield* writeEffectContract(root, effectSourceEntryContract({ split }))
    yield* commitWithTrailer(root, split)
    yield* writeValidTsgoSourceEntry(root)

    const result = yield* runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing source-entry LLM anchor: repos\/effect\/LLMS\.md/u)
  })))

  it.effect('source subtree verifier rejects application imports from the source prefix', () => withTempDir(root => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const split = '4'.repeat(40)

    yield* initGit(root)
    yield* writeProviderProfile(root)
    yield* writePinnedEffectSource(root)
    yield* writeEffectContract(root, effectSourceEntryContract({ split }))
    yield* fs.makeDirectory(path.join(root, 'tests'), { recursive: true })
    yield* fs.writeFileString(path.join(root, 'tests/imports-source.ts'), 'import { Effect } from "../repos/' + 'effect/packages/effect/src/Effect.ts"\n')
    yield* commitWithTrailer(root, split)
    yield* writeValidTsgoSourceEntry(root)

    const result = yield* runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /tests\/imports-source\.ts imports from repos\/effect/u)
  })))
})
