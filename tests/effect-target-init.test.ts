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
