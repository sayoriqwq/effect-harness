import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-craft-skills-'))
}

function git(root: string, args: ReadonlyArray<string>) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function runCli(args: ReadonlyArray<string>) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function writeManifest(harness: string) {
  mkdirSync(join(harness, 'repos'), { recursive: true })
  writeFileSync(join(harness, 'repos/craft-skills.manifest.json'), `${JSON.stringify({
    name: 'craft-skills',
    source: {
      owner: 'Craft',
      repository: 'https://example.invalid/craft.git',
      repoPath: '../craft',
      ref: 'initial',
    },
    mechanism: {
      syncCommand: 'node bin/effect-harness.ts craft-skills sync --harness .',
      verifyCommand: 'node bin/effect-harness.ts craft-skills check --harness .',
      check: 'Compare each target projection byte-for-byte with the pinned Craft git blob and its sha256.',
    },
    projections: [
      {
        skill: 'pin',
        sourceFile: 'skills/pin/SKILL.md',
        targetFile: '.codex/skills/pin/SKILL.md',
        sha256: '',
      },
      {
        skill: 'setup-effect-area',
        sourceFile: 'skills/setup-effect-area/SKILL.md',
        targetFile: '.codex/skills/setup-effect-area/SKILL.md',
        sha256: '',
      },
    ],
  }, null, 2)}\n`)
}

function makeCraftRepo(root: string) {
  const craft = join(root, 'craft')
  mkdirSync(join(craft, 'skills/pin'), { recursive: true })
  mkdirSync(join(craft, 'skills/setup-effect-area'), { recursive: true })
  git(craft, ['init', '--initial-branch=main'])
  git(craft, ['config', 'user.email', 'effect-harness@example.invalid'])
  git(craft, ['config', 'user.name', 'Effect Harness Test'])
  writeFileSync(join(craft, 'skills/pin/SKILL.md'), '# Pin\n\nCraft source pin skill.\n')
  writeFileSync(join(craft, 'skills/setup-effect-area/SKILL.md'), '# Setup Effect Area\n\nCraft source setup skill.\n')
  git(craft, ['add', '.'])
  git(craft, ['commit', '-m', 'Add Craft skills'])
  return craft
}

it.effect('craft-skills sync projects Craft skill sources and records checksums', () => Effect.sync(() => {
  const root = tempDir()
  const harness = join(root, 'harness')
  mkdirSync(harness)

  try {
    makeCraftRepo(root)
    writeManifest(harness)

    const sync = runCli(['craft-skills', 'sync', '--harness', harness])
    assert.equal(sync.status, 0, sync.stderr)
    assert.match(sync.stdout, /Craft skill projections synced/u)

    const manifest = JSON.parse(readFileSync(join(harness, 'repos/craft-skills.manifest.json'), 'utf8')) as {
      readonly source: { readonly ref: string }
      readonly projections: ReadonlyArray<{ readonly sha256: string }>
    }
    assert.match(manifest.source.ref, /^[a-f0-9]{40}$/u)
    assert.match(manifest.projections[0]!.sha256, /^[a-f0-9]{64}$/u)
    assert.equal(readFileSync(join(harness, '.codex/skills/pin/SKILL.md'), 'utf8'), '# Pin\n\nCraft source pin skill.\n')

    const check = runCli(['craft-skills', 'check', '--harness', harness])
    assert.equal(check.status, 0, check.stderr)
    assert.match(check.stdout, /Craft skill projections verified: 2 files/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('craft-skills check rejects stale managed projections', () => Effect.sync(() => {
  const root = tempDir()
  const harness = join(root, 'harness')
  mkdirSync(harness)

  try {
    makeCraftRepo(root)
    writeManifest(harness)

    const sync = runCli(['craft-skills', 'sync', '--harness', harness])
    assert.equal(sync.status, 0, sync.stderr)

    writeFileSync(join(harness, '.codex/skills/pin/SKILL.md'), '# stale\n')

    const check = runCli(['craft-skills', 'check', '--harness', harness])
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /\.codex\/skills\/pin\/SKILL\.md does not match Craft source/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
