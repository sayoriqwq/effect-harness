import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')
const defaultRepository = 'Effect-TS/effect-smol'
const defaultRepositoryUrl = 'https://github.com/Effect-TS/effect-smol.git'
const defaultPrefix = 'repos/effect'
const defaultLlmDocument = 'repos/effect/LLMS.md'
const defaultRoute = 'harness/effect-routes.md'

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-subtree-'))
}

function git(root: string, args: ReadonlyArray<string>) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function initGit(root: string) {
  git(root, ['init', '--initial-branch=main'])
  git(root, ['config', 'user.email', 'effect-harness@example.invalid'])
  git(root, ['config', 'user.name', 'Effect Harness Test'])
}

function commit(root: string, message: string) {
  git(root, ['add', '.'])
  git(root, ['commit', '-m', message])
}

function commitWithTrailer(root: string, split: string) {
  commit(root, `Add source entry\n\ngit-subtree-dir: ${defaultPrefix}\ngit-subtree-split: ${split}`)
}

function runSourceVerify(root: string) {
  return spawnSync(
    process.execPath,
    [cliPath, 'source-verify', '--harness', root],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  )
}

function sourceEntryContract(options: {
  readonly split: string
  readonly repository?: string | undefined
  readonly repositoryUrl?: string | undefined
  readonly branch?: string | undefined
  readonly prefix?: string | undefined
  readonly llmDocument?: string | undefined
}) {
  const repository = options.repository ?? defaultRepository
  const repositoryUrl = options.repositoryUrl ?? defaultRepositoryUrl
  const branch = options.branch ?? 'main'
  const prefix = options.prefix ?? defaultPrefix
  const llmDocument = options.llmDocument ?? defaultLlmDocument

  return {
    schemaVersion: 1,
    name: 'effect',
    kind: 'github-subtree',
    github: {
      repository,
      url: repositoryUrl,
      branch,
      ref: options.split,
    },
    local: {
      prefix,
    },
    subtree: {
      split: options.split,
      trailer: `git-subtree-split: ${options.split}`,
    },
    anchor: {
      llmDocument,
    },
    agent: {
      route: defaultRoute,
    },
    commands: {
      status: 'partita source status --contract repos/effect.subtree.json --name effect',
      update: 'partita source update --contract repos/effect.subtree.json --name effect --dry-run',
      verify: 'partita source verify --contract repos/effect.subtree.json --name effect',
    },
    editorPolicy: {
      autoImportExclude: 'block',
      watcherExclude: 'recommended',
      searchExclude: 'recommended',
      filesExclude: 'enabled',
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

function writeContract(root: string, contract: unknown) {
  mkdirSync(join(root, 'repos'), { recursive: true })
  mkdirSync(join(root, 'harness'), { recursive: true })
  writeFileSync(join(root, 'repos/effect.subtree.json'), `${JSON.stringify(contract, null, 2)}\n`)
  writeFileSync(join(root, defaultRoute), '# Effect routes\n')
}

function writePinnedSource(root: string, llms = '# Effect\n') {
  mkdirSync(join(root, defaultPrefix), { recursive: true })
  writeFileSync(join(root, defaultLlmDocument), llms)
}

it.effect('source subtree verifier reads the split from the current HEAD history only', () => Effect.sync(() => {
  const root = tempDir()
  const splitOnMain = 'a'.repeat(40)
  const splitOnOtherBranch = 'b'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeContract(root, sourceEntryContract({ split: splitOnMain }))
    commitWithTrailer(root, splitOnMain)

    git(root, ['switch', '-c', 'other'])
    writeFileSync(join(root, 'other.txt'), 'other branch only\n')
    commitWithTrailer(root, splitOnOtherBranch)
    git(root, ['switch', 'main'])

    const result = runSourceVerify(root)

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, new RegExp(splitOnMain, 'u'))
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier accepts the single GitHub subtree contract', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'c'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeContract(root, sourceEntryContract({ split }))
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect source entry verified/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects a missing source directory', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'd'.repeat(40)

  try {
    initGit(root)
    writeContract(root, sourceEntryContract({ split }))
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing pinned source directory: repos\/effect/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects a gitlink submodule source entry', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'e'.repeat(40)

  try {
    initGit(root)
    writeContract(root, sourceEntryContract({ split }))
    writeFileSync(join(root, '.gitmodules'), `[submodule "effect"]\n\tpath = ${defaultPrefix}\n\turl = ${defaultRepositoryUrl}\n`)
    git(root, ['add', 'repos/effect.subtree.json', '.gitmodules'])
    git(root, ['update-index', '--add', '--cacheinfo', `160000,${split},${defaultPrefix}`])
    git(root, ['commit', '-m', `Add gitlink\n\ngit-subtree-dir: ${defaultPrefix}\ngit-subtree-split: ${split}`])
    writePinnedSource(root)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /repos\/effect is a gitlink submodule/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects a contract pin when history has no subtree trailer', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'f'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeContract(root, sourceEntryContract({ split }))
    commit(root, 'Import pinned source without subtree trailer')

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing git subtree split for repos\/effect; contract-only source pins are not accepted/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects a contract split that does not match the subtree trailer', () => Effect.sync(() => {
  const root = tempDir()
  const contractSplit = '1'.repeat(40)
  const trailerSplit = '2'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeContract(root, sourceEntryContract({ split: contractSplit }))
    commitWithTrailer(root, trailerSplit)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Subtree split mismatch for repos\/effect/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects a missing LLMS anchor document', () => Effect.sync(() => {
  const root = tempDir()
  const split = '3'.repeat(40)

  try {
    initGit(root)
    mkdirSync(join(root, defaultPrefix), { recursive: true })
    writeContract(root, sourceEntryContract({ split }))
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing Effect source-entry LLM anchor: repos\/effect\/LLMS\.md/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects application imports from the source prefix', () => Effect.sync(() => {
  const root = tempDir()
  const split = '4'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeContract(root, sourceEntryContract({ split }))
    mkdirSync(join(root, 'tests'), { recursive: true })
    writeFileSync(join(root, 'tests/imports-source.ts'), 'import { Effect } from "../repos/' + 'effect/packages/effect/src/Effect.ts"\n')
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /tests\/imports-source\.ts imports from repos\/effect/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
