import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')
const defaultRepository = 'https://example.invalid/effect-smol.git'
const defaultPrefix = 'repos/effect'
const defaultLlmDocument = 'repos/effect/LLMS.md'

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

function sourceEntryManifest(options: {
  readonly split: string
  readonly repository?: string | undefined
  readonly branch?: string | undefined
  readonly prefix?: string | undefined
  readonly llmDocument?: string | undefined
  readonly packageBaseline?: Record<string, string> | undefined
}) {
  const repository = options.repository ?? defaultRepository
  const branch = options.branch ?? 'main'
  const prefix = options.prefix ?? defaultPrefix
  const llmDocument = options.llmDocument ?? defaultLlmDocument

  return {
    name: 'effect',
    kind: 'source-entry',
    mechanism: 'git-subtree',
    repository,
    branch,
    prefix,
    split: options.split,
    llmDocument,
    sourceEntry: {
      upstream: {
        repository,
        branch,
      },
      local: {
        prefix,
      },
      pin: {
        split: options.split,
      },
      anchor: {
        llmDocument,
      },
      mode: {
        readOnly: true,
        referenceOnly: true,
      },
      commands: {
        update: 'pnpm effect:update',
        verify: 'pnpm effect:verify',
      },
      agent: {
        route: llmDocument,
      },
      importBlock: {
        enabled: true,
        prefix,
        appliesTo: ['application', 'test'],
      },
    },
    packageBaseline: options.packageBaseline ?? {},
  }
}

function writeManifest(root: string, manifest: unknown) {
  mkdirSync(join(root, 'repos'), { recursive: true })
  writeFileSync(join(root, 'repos/effect.subtree.json'), `${JSON.stringify(manifest, null, 2)}\n`)
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
    writeManifest(root, sourceEntryManifest({ split: splitOnMain }))
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

it.effect('source subtree verifier rejects legacy manifests without a source-entry contract', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'c'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeManifest(root, {
      name: 'effect',
      repository: defaultRepository,
      branch: 'main',
      prefix: defaultPrefix,
      split,
      llmDocument: defaultLlmDocument,
      packageBaseline: {},
    })
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /must contain object field: sourceEntry/u)
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
    writeManifest(root, sourceEntryManifest({ split }))
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
    writeManifest(root, sourceEntryManifest({ split }))
    writeFileSync(join(root, '.gitmodules'), `[submodule "effect"]\n\tpath = ${defaultPrefix}\n\turl = ${defaultRepository}\n`)
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

it.effect('source subtree verifier rejects a manifest pin when history has no subtree trailer', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'f'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeManifest(root, sourceEntryManifest({ split }))
    commit(root, 'Import pinned source without subtree trailer')

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /Missing git subtree split for repos\/effect; manifest-only source pins are not accepted/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects a manifest split that does not match the subtree trailer', () => Effect.sync(() => {
  const root = tempDir()
  const manifestSplit = '1'.repeat(40)
  const trailerSplit = '2'.repeat(40)

  try {
    initGit(root)
    writePinnedSource(root)
    writeManifest(root, sourceEntryManifest({ split: manifestSplit }))
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
    writeManifest(root, sourceEntryManifest({ split }))
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
    writeManifest(root, sourceEntryManifest({ split }))
    mkdirSync(join(root, 'tests'), { recursive: true })
    writeFileSync(join(root, 'tests/imports-source.ts'), 'import { Effect } from "../repos/effect/packages/effect/src/Effect.ts"\n')
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /tests\/imports-source\.ts imports from repos\/effect/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier rejects inconsistent source-entry pin metadata', () => Effect.sync(() => {
  const root = tempDir()
  const split = '5'.repeat(40)
  const manifest = sourceEntryManifest({ split })

  try {
    initGit(root)
    writePinnedSource(root)
    manifest.sourceEntry.pin.split = '6'.repeat(40)
    writeManifest(root, manifest)
    commitWithTrailer(root, split)

    const result = runSourceVerify(root)

    assert.notEqual(result.status, 0, result.stdout)
    assert.match(result.stderr, /source-entry metadata mismatch: sourceEntry\.pin\.split/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
