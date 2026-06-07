import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

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

function commit(root: string, message: string) {
  git(root, ['add', '.'])
  git(root, ['commit', '-m', message])
}

it.effect('source subtree verifier reads the split from the current HEAD history only', () => Effect.sync(() => {
  const root = tempDir()
  const splitOnMain = 'a'.repeat(40)
  const splitOnOtherBranch = 'b'.repeat(40)

  try {
    git(root, ['init', '--initial-branch=main'])
    git(root, ['config', 'user.email', 'effect-harness@example.invalid'])
    git(root, ['config', 'user.name', 'Effect Harness Test'])

    mkdirSync(join(root, 'repos/effect'), { recursive: true })
    writeFileSync(join(root, 'repos/effect/LLMS.md'), '# Effect\n')
    writeFileSync(join(root, 'repos/effect.subtree.json'), `${JSON.stringify({
      name: 'effect',
      repository: 'https://example.invalid/effect.git',
      branch: 'main',
      prefix: 'repos/effect',
      split: splitOnMain,
      llmDocument: 'repos/effect/LLMS.md',
      packageBaseline: {},
    }, null, 2)}\n`)
    commit(root, `Add subtree\n\ngit-subtree-dir: repos/effect\ngit-subtree-split: ${splitOnMain}`)

    git(root, ['switch', '-c', 'other'])
    writeFileSync(join(root, 'other.txt'), 'other branch only\n')
    commit(root, `Other subtree split\n\ngit-subtree-dir: repos/effect\ngit-subtree-split: ${splitOnOtherBranch}`)
    git(root, ['switch', 'main'])

    const result = spawnSync(
      process.execPath,
      [cliPath, 'source-verify', '--harness', root],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    )

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, new RegExp(splitOnMain, 'u'))
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('source subtree verifier accepts a manifest pin when history has no subtree trailer', () => Effect.sync(() => {
  const root = tempDir()
  const split = 'c'.repeat(40)

  try {
    git(root, ['init', '--initial-branch=main'])
    git(root, ['config', 'user.email', 'effect-harness@example.invalid'])
    git(root, ['config', 'user.name', 'Effect Harness Test'])

    mkdirSync(join(root, 'repos/effect'), { recursive: true })
    writeFileSync(join(root, 'repos/effect/LLMS.md'), '# Effect\n')
    writeFileSync(join(root, 'repos/effect.subtree.json'), `${JSON.stringify({
      name: 'effect',
      repository: 'https://example.invalid/effect.git',
      branch: 'main',
      prefix: 'repos/effect',
      split,
      llmDocument: 'repos/effect/LLMS.md',
      packageBaseline: {},
    }, null, 2)}\n`)
    commit(root, 'Import vendored source without subtree trailer')

    const result = spawnSync(
      process.execPath,
      [cliPath, 'source-verify', '--harness', root],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    )

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stderr, /manifest split .* is the active source pin/u)
    assert.match(result.stdout, new RegExp(split, 'u'))
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
