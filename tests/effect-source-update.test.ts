import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

const pinnedSplit = 'a'.repeat(40)
const newPackages = {
  'effect': '4.0.0-beta.99',
  '@effect/platform-node': '4.0.0-beta.99',
  '@effect/vitest': '4.0.0-beta.99',
  '@effect/tsgo': '0.15.0',
  '@effect/language-service': '0.90.0',
  '@typescript/native-preview': '7.0.0-dev.20260616.1',
}

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-update-'))
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

function writeText(root: string, path: string, text: string) {
  const target = join(root, path)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, text)
}

function makeGitRepo(root: string) {
  mkdirSync(root, { recursive: true })
  git(root, ['init', '--initial-branch=main'])
  git(root, ['config', 'user.email', 'effect-harness@example.invalid'])
  git(root, ['config', 'user.name', 'Effect Harness Test'])
}

function makeUpstream(root: string) {
  const upstream = join(root, 'upstream')
  makeGitRepo(upstream)
  writeText(upstream, 'LLMS.md', '# New Effect Guide\n')
  writeText(upstream, 'AGENTS.md', '# Agent Guide\n')
  symlinkSync('AGENTS.md', join(upstream, 'CLAUDE.md'))
  writeText(upstream, 'packages/effect/src/Effect.ts', 'export const newEffect = true\n')
  commit(upstream, 'New upstream source')
  return {
    repository: upstream,
    sourceHead: git(upstream, ['rev-parse', 'HEAD']),
  }
}

function makeWorkspaceYaml() {
  return `trustPolicyExclude:
  - '@effect/platform-node@4.0.0-beta.83'
  - '@effect/platform-node-shared@4.0.0-beta.83'
  - '@effect/vitest@4.0.0-beta.83'
  - effect@4.0.0-beta.83

packages: []

overrides:
  '@effect/platform-node-shared': 4.0.0-beta.83

catalog:
  '@effect/language-service': 0.86.2
  '@effect/platform-node': 4.0.0-beta.83
  '@effect/tsgo': 0.14.4
  '@effect/vitest': 4.0.0-beta.83
  '@typescript/native-preview': 7.0.0-dev.20260615.1
  effect: 4.0.0-beta.83
`
}

function makeHarness(root: string, repository: string) {
  const harness = join(root, 'harness')
  makeGitRepo(harness)

  writeText(harness, 'repos/effect/LLMS.md', '# Pinned Effect Guide\n')
  writeText(harness, 'repos/effect/removed.txt', 'removed source only\n')
  writeText(harness, 'repos/effect.subtree.json', `${JSON.stringify({
    name: 'effect',
    repository,
    branch: 'main',
    prefix: 'repos/effect',
    split: pinnedSplit,
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
  writeText(harness, 'pnpm-workspace.yaml', makeWorkspaceYaml())
  writeText(harness, 'AGENTS.md', '- `effect@4.0.0-beta.83`\n- `@effect/tsgo@0.14.4`\n')
  writeText(harness, 'HARNESS.md', 'root route\n')
  writeText(harness, 'README.md', '- `effect@4.0.0-beta.83`\n- `@typescript/native-preview@7.0.0-dev.20260615.1`\n')
  writeText(harness, 'harness/index.md', `${pinnedSplit}\n- \`effect@4.0.0-beta.83\`\n`)
  writeText(harness, 'harness/source.md', `${pinnedSplit}\n- \`@effect/tsgo@0.14.4\`\n`)
  writeText(harness, 'harness/official-inventory.md', `repos/effect @ ${pinnedSplit}\n`)
  writeText(harness, 'tests/effect-target-init.test.ts', `assert.equal(packageJson.dependencies.effect, '4.0.0-beta.83')\n`)
  writeText(harness, 'tests/effect-target-verify.test.ts', `assert.match(result.stderr, /expected 4\\.0\\.0-beta\\.83 or catalog:/u)\n`)
  commit(harness, 'Initial harness pin')

  return harness
}

it.effect('source update syncs official source and baseline projections from a snapshot', () => Effect.sync(() => {
  const root = tempDir()

  try {
    const upstream = makeUpstream(root)
    const harness = makeHarness(root, upstream.repository)
    const snapshotPath = join(root, 'official.json')
    writeFileSync(snapshotPath, `${JSON.stringify({
      packages: newPackages,
      sourceHead: upstream.sourceHead,
    }, null, 2)}\n`)

    const result = spawnSync(
      process.execPath,
      [cliPath, 'update-pin', '--harness', harness, '--snapshot', snapshotPath],
      {
        cwd: repoRoot,
        encoding: 'utf8',
      },
    )

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect source pin updated/u)

    const manifest = JSON.parse(readFileSync(join(harness, 'repos/effect.subtree.json'), 'utf8')) as {
      readonly split: string
      readonly packageBaseline: Record<string, string>
    }
    assert.equal(manifest.split, upstream.sourceHead)
    assert.equal(manifest.packageBaseline.effect, newPackages.effect)
    assert.equal(manifest.packageBaseline['@effect/tsgo'], newPackages['@effect/tsgo'])

    assert.equal(readFileSync(join(harness, 'repos/effect/LLMS.md'), 'utf8'), '# New Effect Guide\n')
    assert.equal(lstatSync(join(harness, 'repos/effect/CLAUDE.md')).isSymbolicLink(), true)
    assert.equal(readlinkSync(join(harness, 'repos/effect/CLAUDE.md')), 'AGENTS.md')
    assert.equal(existsSync(join(harness, 'repos/effect/removed.txt')), false)
    assert.equal(existsSync(join(harness, 'repos/effect/.git')), false)

    const workspace = readFileSync(join(harness, 'pnpm-workspace.yaml'), 'utf8')
    assert.match(workspace, /'@effect\/platform-node-shared@4\.0\.0-beta\.99'/u)
    assert.match(workspace, /'@effect\/platform-node-shared': 4\.0\.0-beta\.99/u)
    assert.match(workspace, /'@effect\/tsgo': 0\.15\.0/u)

    assert.match(readFileSync(join(harness, 'harness/index.md'), 'utf8'), new RegExp(upstream.sourceHead, 'u'))
    assert.match(readFileSync(join(harness, 'tests/effect-target-verify.test.ts'), 'utf8'), /expected 4\\\.0\\\.0-beta\\\.99/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
