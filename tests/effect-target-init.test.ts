import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-init-'))
}

function runCli(args: ReadonlyArray<string>, cwd = repoRoot) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as {
    readonly compilerOptions: {
      readonly plugins: ReadonlyArray<{
        readonly name: string
        readonly options: {
          readonly diagnosticSeverity: {
            readonly floatingEffect: string
          }
        }
      }>
    }
    readonly dependencies: Record<string, string>
    readonly devDependencies: Record<string, string>
    readonly scripts: Record<string, string>
  }
}

function makeTarget(root: string) {
  const target = join(root, 'target')
  mkdirSync(target)
  writeFileSync(join(target, 'package.json'), JSON.stringify({
    name: 'effect-consumer-target',
    type: 'module',
    scripts: {
      build: 'echo build',
      lint: 'echo lint',
      test: 'echo test',
      typecheck: 'tsc --noEmit',
      verify: 'pnpm build && pnpm typecheck && pnpm test && pnpm lint',
    },
  }, null, 2))
  writeFileSync(join(target, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      strict: true,
    },
  }, null, 2))
  writeFileSync(join(target, 'AGENTS.md'), '# Target Agents\n')
  return target
}

it.effect('effect-harness init installs consumer runtime and target contract', () => Effect.sync(() => {
  const root = tempDir()
  const target = makeTarget(root)

  try {
    const result = runCli(['init', '--target', target, '--harness', repoRoot])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Effect harness initialized/u)

    const packageJson = readJson(join(target, 'package.json'))
    assert.equal(packageJson.dependencies.effect, '4.0.0-beta.83')
    assert.equal(packageJson.dependencies['@effect/platform-node'], '4.0.0-beta.83')
    assert.equal(packageJson.devDependencies['@effect/vitest'], '4.0.0-beta.83')
    assert.equal(packageJson.devDependencies['@effect/tsgo'], '0.14.4')
    assert.equal(packageJson.devDependencies['@effect/language-service'], '0.86.2')
    assert.equal(packageJson.devDependencies['@typescript/native-preview'], '7.0.0-dev.20260615.1')
    assert.equal(packageJson.scripts.typecheck, 'tsgo --noEmit')
    assert.equal(packageJson.scripts['typecheck:tsc'], 'tsc --noEmit')
    assert.match(packageJson.scripts['effect:status']!, /effect-harness\.ts" status/u)
    assert.match(packageJson.scripts['effect:verify']!, /effect-harness\.ts" verify/u)
    assert.match(packageJson.scripts.verify!, /pnpm effect:verify/u)

    const tsconfig = readJson(join(target, 'tsconfig.json'))
    const effectPlugin = tsconfig.compilerOptions.plugins.find(plugin => plugin.name === '@effect/language-service')
    assert.ok(effectPlugin)
    assert.equal(effectPlugin.options.diagnosticSeverity.floatingEffect, 'error')

    assert.equal(existsSync(join(target, '.codex/skills/effect-code/SKILL.md')), true)
    assert.equal(existsSync(join(target, '.codex/skills/effect-feedback/SKILL.md')), true)
    assert.equal(existsSync(join(target, '.codex/agents/effect-worker.md')), true)
    assert.equal(existsSync(join(target, '.codex/effect-feedback')), true)
    assert.equal(existsSync(join(target, '.effect-harness.json')), true)
    assert.match(readFileSync(join(target, 'AGENTS.md'), 'utf8'), /effect-harness:start/u)

    const verify = runCli(['verify', '--target', target, '--harness', repoRoot])
    assert.equal(verify.status, 0, verify.stderr)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('effect-harness init preserves target catalog dependencies and updates catalog versions', () => Effect.sync(() => {
  const root = tempDir()
  const target = makeTarget(root)

  try {
    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    packageJson.dependencies = {
      '@effect/platform-node': 'catalog:',
      'effect': 'catalog:',
    }
    packageJson.devDependencies = {
      '@effect/language-service': 'catalog:',
      '@effect/tsgo': 'catalog:',
      '@effect/vitest': 'catalog:',
      '@typescript/native-preview': 'catalog:',
    }
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    writeFileSync(join(target, 'pnpm-workspace.yaml'), [
      'packages:',
      '  - apps/*',
      '',
      'catalog:',
      '  effect: 4.0.0-beta.0',
      '  \'@effect/platform-node\': 4.0.0-beta.0',
      '  \'@effect/vitest\': 4.0.0-beta.0',
      '  \'@effect/tsgo\': 0.1.0',
      '  \'@effect/language-service\': 0.1.0',
      '  \'@typescript/native-preview\': 7.0.0-dev.0',
      '',
    ].join('\n'))

    const result = runCli(['init', '--target', target, '--harness', repoRoot])
    assert.equal(result.status, 0, result.stderr)

    const updatedPackageJson = readJson(packageJsonPath)
    assert.equal(updatedPackageJson.dependencies.effect, 'catalog:')
    assert.equal(updatedPackageJson.dependencies['@effect/platform-node'], 'catalog:')
    assert.equal(updatedPackageJson.devDependencies['@effect/vitest'], 'catalog:')
    assert.equal(updatedPackageJson.devDependencies['@effect/tsgo'], 'catalog:')
    assert.equal(updatedPackageJson.devDependencies['@effect/language-service'], 'catalog:')
    assert.equal(updatedPackageJson.devDependencies['@typescript/native-preview'], 'catalog:')

    const workspace = readFileSync(join(target, 'pnpm-workspace.yaml'), 'utf8')
    assert.match(workspace, /effect: 4\.0\.0-beta\.83/u)
    assert.match(workspace, /'@effect\/platform-node': 4\.0\.0-beta\.83/u)
    assert.match(workspace, /'@effect\/vitest': 4\.0\.0-beta\.83/u)
    assert.match(workspace, /'@effect\/tsgo': 0\.14\.4/u)
    assert.match(workspace, /'@effect\/language-service': 0\.86\.2/u)
    assert.match(workspace, /'@typescript\/native-preview': 7\.0\.0-dev\.20260615\.1/u)

    const verify = runCli(['verify', '--target', target, '--harness', repoRoot])
    assert.equal(verify.status, 0, verify.stderr)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('effect-harness init preserves an existing patched tsgo typecheck script', () => Effect.sync(() => {
  const root = tempDir()
  const target = makeTarget(root)

  try {
    const packageJsonPath = join(target, 'package.json')
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>
    }
    packageJson.scripts.typecheck = 'tsgo --noEmit --project apps/cli/tsconfig.json'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

    const result = runCli(['init', '--target', target, '--harness', repoRoot])
    assert.equal(result.status, 0, result.stderr)

    const updatedPackageJson = readJson(packageJsonPath)
    assert.equal(updatedPackageJson.scripts.typecheck, 'tsgo --noEmit --project apps/cli/tsconfig.json')
    assert.equal(updatedPackageJson.scripts['typecheck:tsc'], undefined)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('effect-harness init removes legacy local harness wrapper scripts', () => Effect.sync(() => {
  const root = tempDir()
  const target = makeTarget(root)

  try {
    const packageJsonPath = join(target, 'package.json')
    const packageJson = readJson(packageJsonPath)
    packageJson.scripts['effect:harness:verify'] = 'node scripts/effect-harness-verify.mjs verify'
    packageJson.scripts['effect:source:update'] = 'node scripts/effect-harness-verify.mjs update-source'
    packageJson.scripts['effect:source:verify'] = 'node scripts/effect-harness-verify.mjs source'
    packageJson.scripts.verify = 'pnpm effect:harness:verify && pnpm build && pnpm typecheck && pnpm test && pnpm lint'
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
    mkdirSync(join(target, 'scripts'))
    writeFileSync(join(target, 'scripts/effect-harness-verify.mjs'), '#!/usr/bin/env node\n')

    const result = runCli(['init', '--target', target, '--harness', repoRoot])
    assert.equal(result.status, 0, result.stderr)

    const updatedPackageJson = readJson(packageJsonPath)
    assert.equal(updatedPackageJson.scripts['effect:harness:verify'], undefined)
    assert.equal(updatedPackageJson.scripts['effect:source:update'], undefined)
    assert.equal(updatedPackageJson.scripts['effect:source:verify'], undefined)
    assert.equal(/effect:harness:verify/u.test(updatedPackageJson.scripts.verify!), false)
    assert.match(updatedPackageJson.scripts.verify!, /pnpm effect:verify/u)
    assert.equal(existsSync(join(target, 'scripts/effect-harness-verify.mjs')), false)

    const verify = runCli(['verify', '--target', target, '--harness', repoRoot])
    assert.equal(verify.status, 0, verify.stderr)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('effect-harness init dry-run does not write target files', () => Effect.sync(() => {
  const root = tempDir()
  const target = makeTarget(root)

  try {
    const result = runCli(['init', '--target', target, '--harness', repoRoot, '--dry-run'])
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Dry run complete/u)
    assert.equal(existsSync(join(target, '.codex/skills/effect-code/SKILL.md')), false)
    assert.equal(existsSync(join(target, '.effect-harness.json')), false)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
