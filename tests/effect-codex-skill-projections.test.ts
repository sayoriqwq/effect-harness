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
  return mkdtempSync(join(tmpdir(), 'effect-harness-codex-skill-projections-'))
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
  writeFileSync(join(harness, 'repos/codex-skill-projections.manifest.json'), `${JSON.stringify({
    name: 'codex-skill-projections',
    source: {
      owner: 'Partita',
      repository: 'https://example.invalid/partita.git',
      repoPath: '../skill-source',
      ref: 'initial',
    },
    mechanism: {
      syncCommand: 'node bin/effect-harness.ts codex-skill-projections sync --harness .',
      verifyCommand: 'node bin/effect-harness.ts codex-skill-projections check --harness .',
      check: 'Compare each target projection byte-for-byte with the pinned Codex skill source git blob and its sha256.',
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

function makeSkillSourceRepo(root: string) {
  const sourceRepo = join(root, 'skill-source')
  mkdirSync(join(sourceRepo, 'skills/pin'), { recursive: true })
  mkdirSync(join(sourceRepo, 'skills/setup-effect-area'), { recursive: true })
  git(sourceRepo, ['init', '--initial-branch=main'])
  git(sourceRepo, ['config', 'user.email', 'effect-harness@example.invalid'])
  git(sourceRepo, ['config', 'user.name', 'Effect Harness Test'])
  writeFileSync(join(sourceRepo, 'skills/pin/SKILL.md'), '# Pin\n\nCodex source pin skill.\n')
  writeFileSync(join(sourceRepo, 'skills/setup-effect-area/SKILL.md'), '# Setup Effect Area\n\nCodex source setup skill.\n')
  git(sourceRepo, ['add', '.'])
  git(sourceRepo, ['commit', '-m', 'Add Codex skills'])
  return sourceRepo
}

it.effect('codex-skill-projections sync projects Codex skill sources and records checksums', () => Effect.sync(() => {
  const root = tempDir()
  const harness = join(root, 'harness')
  mkdirSync(harness)

  try {
    makeSkillSourceRepo(root)
    writeManifest(harness)

    const sync = runCli(['codex-skill-projections', 'sync', '--harness', harness])
    assert.equal(sync.status, 0, sync.stderr)
    assert.match(sync.stdout, /Codex skill projections synced/u)

    const manifest = JSON.parse(readFileSync(join(harness, 'repos/codex-skill-projections.manifest.json'), 'utf8')) as {
      readonly source: { readonly ref: string }
      readonly projections: ReadonlyArray<{ readonly sha256: string }>
    }
    assert.match(manifest.source.ref, /^[a-f0-9]{40}$/u)
    assert.match(manifest.projections[0]!.sha256, /^[a-f0-9]{64}$/u)
    assert.equal(readFileSync(join(harness, '.codex/skills/pin/SKILL.md'), 'utf8'), '# Pin\n\nCodex source pin skill.\n')

    const check = runCli(['codex-skill-projections', 'check', '--harness', harness])
    assert.equal(check.status, 0, check.stderr)
    assert.match(check.stdout, /Codex skill projections verified: 2 files/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('codex-skill-projections check rejects stale managed projections', () => Effect.sync(() => {
  const root = tempDir()
  const harness = join(root, 'harness')
  mkdirSync(harness)

  try {
    makeSkillSourceRepo(root)
    writeManifest(harness)

    const sync = runCli(['codex-skill-projections', 'sync', '--harness', harness])
    assert.equal(sync.status, 0, sync.stderr)

    writeFileSync(join(harness, '.codex/skills/pin/SKILL.md'), '# stale\n')

    const check = runCli(['codex-skill-projections', 'check', '--harness', harness])
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /\.codex\/skills\/pin\/SKILL\.md does not match Codex skill source/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
