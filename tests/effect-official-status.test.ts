import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-official-status-'))
}

function runStatus(root: string, snapshot: string, extraArgs: ReadonlyArray<string> = []) {
  return spawnSync(
    process.execPath,
    [cliPath, 'status', '--harness', root, '--snapshot', snapshot, ...extraArgs],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  )
}

it.effect('official status reports package and source drift from a snapshot', () => Effect.sync(() => {
  const root = tempDir()

  try {
    mkdirSync(join(root, 'repos'))
    writeFileSync(join(root, 'repos/effect.subtree.json'), `${JSON.stringify({
      name: 'effect',
      repository: 'https://example.invalid/effect-smol.git',
      branch: 'main',
      prefix: 'repos/effect',
      split: 'a'.repeat(40),
      llmDocument: 'repos/effect/LLMS.md',
      packageBaseline: {
        'effect': '4.0.0-beta.83',
        '@effect/platform-node': '4.0.0-beta.83',
        '@effect/vitest': '4.0.0-beta.83',
        '@effect/tsgo': '0.14.4',
        '@effect/language-service': '0.86.2',
        '@typescript/native-preview': '7.0.0-dev.20260615.1',
      },
    }, null, 2)}\n`)

    const snapshotPath = join(root, 'official.json')
    writeFileSync(snapshotPath, `${JSON.stringify({
      packages: {
        'effect': '4.0.0-beta.99',
        '@effect/platform-node': '4.0.0-beta.99',
        '@effect/vitest': '4.0.0-beta.99',
        '@effect/tsgo': '0.15.0',
        '@effect/language-service': '0.90.0',
        '@typescript/native-preview': '7.0.0-dev.20260616.1',
      },
      sourceHead: 'b'.repeat(40),
    }, null, 2)}\n`)

    const result = runStatus(root, snapshotPath, ['--json', '--fail-on-outdated'])

    assert.equal(result.status, 1)
    const output = JSON.parse(result.stdout) as {
      readonly outdated: boolean
      readonly packages: ReadonlyArray<{ readonly name: string, readonly official: string | undefined }>
      readonly source: { readonly official: string | undefined }
    }
    assert.equal(output.outdated, true)
    const effectRow = output.packages.find(row => row.name === 'effect')
    assert.ok(effectRow)
    assert.equal(effectRow.official, '4.0.0-beta.99')
    assert.equal(output.source.official, 'b'.repeat(40))
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
