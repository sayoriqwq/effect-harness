import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-target-'))
}

function runCli(args: ReadonlyArray<string>) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function makeTarget(target: string) {
  mkdirSync(target)
  writeFileSync(join(target, 'package.json'), JSON.stringify({
    name: 'effect-consumer-target',
    type: 'module',
    scripts: {},
  }, null, 2))
  writeFileSync(join(target, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
    },
  }, null, 2))

  const init = runCli([
    'init',
    '--target',
    target,
    '--harness',
    repoRoot,
  ])
  assert.equal(init.status, 0, init.stderr)
}

it.effect('target verifier rejects caret ranges for pinned Effect baseline dependencies', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.dependencies.effect = '^4.0.0-beta.83'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /effect is \^4\.0\.0-beta\.83; expected 4\.0\.0-beta\.83 or catalog:/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale pnpm catalog entries for catalog dependencies', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.dependencies.effect = 'catalog:'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    writeFileSync(join(target, 'pnpm-workspace.yaml'), [
      'packages:',
      '  - apps/*',
      '',
      'catalog:',
      '  effect: 4.0.0-beta.0',
      '',
    ].join('\n'))

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /pnpm-workspace\.yaml catalog effect is 4\.0\.0-beta\.0; expected 4\.0\.0-beta\.83/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier scans monorepo app source directories with guardrails', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    const sourceRoot = join(target, 'apps/cli/src')
    mkdirSync(sourceRoot, { recursive: true })
    writeFileSync(join(sourceRoot, 'bad.ts'), [
      'import * as Effect from "effect/Effect"',
      '',
      'export const lifted = Effect.succeed(null as string | null)',
      '',
    ].join('\n'))

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Do not wrap asserted values in Effect\.succeed/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier accepts a target with harness contracts', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect target verified against harness/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale effect harness manifest content', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const manifestPath = join(target, '.effect-harness.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    manifest.source.split = 'stale-source-pin'
    manifest.packageBaseline.effect = '4.0.0-beta.0'
    manifest.commands.verify = 'effect-harness verify --target .'
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /\.effect-harness\.json source\.split is stale-source-pin/u)
    assert.match(result.stderr, /\.effect-harness\.json packageBaseline\.effect is 4\.0\.0-beta\.0/u)
    assert.match(result.stderr, /\.effect-harness\.json commands\.verify is effect-harness verify --target \.; expected/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects stale managed AGENTS and runtime files', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    writeFileSync(join(target, 'AGENTS.md'), [
      '<!-- effect-harness:start -->',
      '# stale route',
      '<!-- effect-harness:end -->',
      '',
    ].join('\n'))
    writeFileSync(join(target, '.codex/skills/effect-code/SKILL.md'), '# stale skill\n')
    writeFileSync(join(target, '.codex/skills/effect-code/extra.md'), '# extra managed content\n')

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /AGENTS\.md managed effect-harness route block does not match/u)
    assert.match(result.stderr, /\.codex\/skills\/effect-code\/SKILL\.md does not match/u)
    assert.match(result.stderr, /\.codex\/skills\/effect-code\/extra\.md is not managed/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects effect-tsgo as the typecheck command', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.scripts.typecheck = 'effect-tsgo --noEmit'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /effect-tsgo is the setup\/patch manager/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects plain @effect/vitest tests without Effect-native API', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const sourceRoot = join(target, 'src')
    mkdirSync(sourceRoot)
    writeFileSync(join(sourceRoot, 'plain.test.ts'), [
      'import { assert, it } from "@effect/vitest"',
      '',
      'it("uses plain vitest style", () => {',
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n'))

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /must use it\.effect, it\.live, or layer from @effect\/vitest/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects local effect harness dispatcher scripts', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)

    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    packageJson.scripts['effect:verify'] = 'node scripts/effect-harness-local.mjs verify'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    mkdirSync(join(target, 'scripts'))
    writeFileSync(join(target, 'scripts/effect-harness-local.mjs'), '#!/usr/bin/env node\n')

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /local effect-harness dispatcher/u)
    assert.match(result.stderr, /effect-harness init/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('target verifier rejects targets missing installed runtime files', () => Effect.sync(() => {
  const root = tempDir()
  const target = join(root, 'target')

  try {
    makeTarget(target)
    rmSync(join(target, '.codex'), { recursive: true, force: true })
    rmSync(join(target, '.effect-harness.json'), { force: true })

    const result = runCli([
      'verify',
      '--target',
      target,
      '--harness',
      repoRoot,
    ])

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Missing file: \.effect-harness\.json/u)
    assert.match(result.stderr, /Missing file: \.codex\/skills\/effect-code\/SKILL\.md/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
