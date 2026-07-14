import type { Buffer } from 'node:buffer'

import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'

const harnessRoot = resolve(import.meta.dirname, '../..')
const infraRoot = resolve(harnessRoot, '..')
const partitaRoot = resolve(process.env.PARTITA_ROOT ?? join(infraRoot, 'partita'))
const preludeRoot = resolve(process.env.PRELUDE_ROOT ?? join(infraRoot, 'prelude'))
const keepTemp = process.env.CROSS_REPO_KEEP_TEMP === '1'
const runRoot = mkdtempSync(join(tmpdir(), 'effect-harness-cross-repo-'))
const packsRoot = join(runRoot, 'packs')
const harnessTempRoot = mkdtempSync(join(harnessRoot, 'effect-harness-cross-repo-'))
const publicationRoot = join(harnessTempRoot, 'publication')

try {
  assertRepository(partitaRoot, '@sayoriqwq/partita')
  assertRepository(preludeRoot, 'prelude-workspace')
  mkdirSync(packsRoot, { recursive: true })
  mkdirSync(publicationRoot, { recursive: true })
  verifyRepositories()

  const contractTarball = pack(join(preludeRoot, 'packages/harness-contract'), packsRoot)
  const partitaTarball = pack(partitaRoot, packsRoot)
  const partita = installPackedPartita(partitaTarball, contractTarball)

  publishFixture(partita, 'first')
  publishFixture(partita, 'second')
  assertPublicationDeterminism()

  const harnessTarball = pack(harnessRoot, packsRoot)
  assertHarnessArtifact(harnessTarball)

  const preludeTarball = pack(join(preludeRoot, 'apps/cli'), packsRoot)
  const gitSentinel = installGitSentinel()
  run('pnpm', ['acceptance:packed-effect'], {
    cwd: preludeRoot,
    env: {
      ...process.env,
      EFFECT_HARNESS_TARBALL: harnessTarball,
      PRELUDE_CONTRACT_TARBALL: contractTarball,
      PRELUDE_CLI_TARBALL: preludeTarball,
      PATH: `${gitSentinel.bin}:${process.env.PATH ?? ''}`,
      ...(keepTemp
        ? {
            PRELUDE_GATE_ROOT: join(runRoot, 'targets'),
            PRELUDE_KEEP_TEMP: '1',
          }
        : {}),
      TARGET_GIT_SENTINEL_LOG: gitSentinel.log,
    },
  })
  assert.equal(existsSync(gitSentinel.log), false, 'Target convergence must not invoke Git')

  process.stdout.write([
    'Cross-repository packed acceptance passed.',
    `Partita: ${partitaTarball}`,
    `Prelude Contract: ${contractTarball}`,
    `Effect Harness: ${harnessTarball}`,
    `Prelude: ${preludeTarball}`,
    '',
  ].join('\n'))
}
finally {
  if (keepTemp && existsSync(harnessTempRoot))
    cpSync(harnessTempRoot, join(runRoot, 'publication-evidence'), { recursive: true })
  rmSync(harnessTempRoot, { recursive: true, force: true })
  if (keepTemp)
    console.error(`Preserved cross-repository acceptance workspace: ${runRoot}`)
  else
    rmSync(runRoot, { recursive: true, force: true })
}

function verifyRepositories(): void {
  run('pnpm', ['verify'], { cwd: partitaRoot })
  run('pnpm', ['verify'], { cwd: preludeRoot })
  run('pnpm', ['verify'], { cwd: harnessRoot })
}

function assertRepository(root: string, expectedName: string): void {
  const manifestPath = join(root, 'package.json')
  assert.equal(existsSync(manifestPath), true, `Missing repository manifest: ${manifestPath}`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly name?: string }
  assert.equal(manifest.name, expectedName, `Unexpected package at ${root}`)
}

function pack(packageRoot: string, destination: string): string {
  const before = new Set(readdirSync(destination))
  run('pnpm', ['pack', '--pack-destination', destination], { cwd: packageRoot })
  const created = readdirSync(destination).filter(entry => entry.endsWith('.tgz') && !before.has(entry))
  assert.equal(created.length, 1, `Expected one tarball from ${packageRoot}`)
  return join(destination, created[0]!)
}

function installPackedPartita(partitaTarball: string, contractTarball: string): string {
  const root = join(runRoot, 'partita-runner')
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'package.json'), `${JSON.stringify({
    name: 'packed-partita-runner',
    private: true,
    dependencies: {
      '@sayoriqwq/partita': `file:${partitaTarball}`,
    },
  }, null, 2)}\n`)
  writeFileSync(join(root, 'pnpm-workspace.yaml'), `overrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTarball}'\n  '@effect/platform-node@4.0.0-beta.92>@effect/platform-node-shared': '4.0.0-beta.97'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@4.0.0-beta.92\n  - '@effect/platform-node@4.0.0-beta.92'\n  - '@effect/platform-node-shared@4.0.0-beta.97'\n`)
  run('pnpm', ['install', '--ignore-scripts', '--reporter', 'append-only'], {
    cwd: root,
    env: { ...process.env, CI: '1' },
  })
  const cli = join(root, 'node_modules/.bin/partita')
  assert.equal(existsSync(cli), true, 'Packed Partita CLI was not installed')
  return cli
}

function publishFixture(partita: string, outputName: string): void {
  run(partita, ['pin', 'verify', '--root', harnessRoot, '--name', 'tsgo'], { cwd: harnessRoot })
  run(partita, [
    'pin',
    'publish',
    '--root',
    harnessRoot,
    '--name',
    'tsgo',
    '--archive',
    relativeToHarness(join(publicationRoot, `${outputName}.pta`)),
    '--provenance',
    relativeToHarness(join(publicationRoot, `${outputName}.json`)),
  ], { cwd: harnessRoot })
}

function assertPublicationDeterminism(): void {
  assert.deepEqual(
    readFileSync(join(publicationRoot, 'first.pta')),
    readFileSync(join(publicationRoot, 'second.pta')),
    'Partita archive publication must be byte-identical',
  )
  assert.deepEqual(
    readFileSync(join(publicationRoot, 'first.json')),
    readFileSync(join(publicationRoot, 'second.json')),
    'Partita provenance publication must be byte-identical',
  )
}

function assertHarnessArtifact(tarball: string): void {
  const entries = new Set(runText('tar', ['-tf', tarball], { cwd: harnessRoot }).split('\n').filter(Boolean))
  const manifest = JSON.parse(runText('tar', ['-xOf', tarball, 'package/package.json'], { cwd: harnessRoot })) as {
    readonly exports: Readonly<Record<string, unknown>>
  }
  assert.deepEqual(Object.keys(manifest.exports), ['./prelude', './eslint'])
  for (const path of [
    'package/artifact-assets/effect/managed/data/baseline.json',
    'package/artifact-assets/effect/managed/data/tsgo-policy.json',
    'package/artifact-assets/effect/managed/skills/adapt-effect-target/SKILL.md',
    'package/artifact-assets/effect/managed/skills/adapt-effect-target/agents/openai.yaml',
  ]) {
    assert.equal(entries.has(path), true, `Packed Harness is missing ${path}`)
  }
  assert.equal(entries.has('package/artifact-assets/effect/managed/docs/index.md'), true)
  assert.equal(entries.has('package/artifact-assets/effect/reference-archives/effect.pta'), true)
  assert.equal(entries.has('package/artifact-assets/effect/reference-archives/effect.json'), true)
  assert.equal(entries.has('package/artifact-assets/effect/reference-archives/tsgo.pta'), true)
  assert.equal(entries.has('package/artifact-assets/effect/reference-archives/tsgo.json'), true)
  assert.equal([...entries].some(entry => entry.startsWith('package/repos/')), false)
  assert.equal([...entries].some(entry => entry.startsWith('package/diagnostics/')), false)
  const baselinePath = 'artifact-assets/effect/managed/data/baseline.json'
  const policyPath = 'artifact-assets/effect/managed/data/tsgo-policy.json'
  const baselineBytes = runBytes('tar', ['-xOf', tarball, `package/${baselinePath}`], { cwd: harnessRoot })
  const policyBytes = runBytes('tar', ['-xOf', tarball, `package/${policyPath}`], { cwd: harnessRoot })
  assert.deepEqual(baselineBytes, readFileSync(join(harnessRoot, baselinePath)))
  assert.deepEqual(policyBytes, readFileSync(join(harnessRoot, policyPath)))
  const baseline = JSON.parse(baselineBytes.toString()) as {
    readonly versions: Readonly<Record<string, string>>
    readonly typescriptTopology: Readonly<Record<string, string>>
  }
  assert.deepEqual(baseline.versions, {
    effect: '4.0.0-beta.97',
    tsgo: '0.19.0',
    typescript: '6.0.2',
    nativeTypescript: '7.0.2',
  })
  assert.deepEqual(baseline.typescriptTopology, {
    primaryCompiler: 'nativeTypescript',
    effectSemanticAuthority: 'tsgo',
    compilerApiCompatibility: 'typescript',
  })
  const policy = JSON.parse(policyBytes.toString()) as Readonly<Record<string, unknown>>
  assert.equal(policy.name, '@effect/language-service')
  assert.equal(policy.diagnostics, true)
  assert.equal(policy.includeSuggestionsInTsc, true)
  assert.equal(policy.ignoreEffectSuggestionsInTscExitCode, false)
  assert.equal(policy.ignoreEffectWarningsInTscExitCode, false)
  assert.equal(policy.ignoreEffectErrorsInTscExitCode, false)
  const skill = runText('tar', ['-xOf', tarball, 'package/artifact-assets/effect/managed/skills/adapt-effect-target/SKILL.md'], { cwd: harnessRoot })
  for (const phase of ['Observe', 'Propose', 'Authorize', 'Mutate', 'Verify', 'Hand back'])
    assert.equal(skill.includes(`**${phase}.**`), true, `Control Handoff skill is missing ${phase}`)
  assert.equal(skill.includes('one toolchain root and activation owner'), true)
  assert.equal(skill.includes('Never patch once per package in a monorepo'), true)
  assert.equal(skill.includes('Never add suppression merely to make verification pass'), true)
  assert.deepEqual(
    runBytes('tar', ['-xOf', tarball, 'package/artifact-assets/effect/reference-archives/tsgo.pta'], { cwd: harnessRoot }),
    readFileSync(join(publicationRoot, 'first.pta')),
    'Harness tarball must carry the archive published by packed Partita',
  )
  assert.deepEqual(
    runBytes('tar', ['-xOf', tarball, 'package/artifact-assets/effect/reference-archives/tsgo.json'], { cwd: harnessRoot }),
    readFileSync(join(publicationRoot, 'first.json')),
    'Harness tarball must carry the provenance published by packed Partita',
  )
}

function installGitSentinel(): { readonly bin: string, readonly log: string } {
  const bin = join(runRoot, 'target-bin')
  const log = join(runRoot, 'target-git-invocations.log')
  mkdirSync(bin, { recursive: true })
  const executable = join(bin, 'git')
  writeFileSync(executable, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$TARGET_GIT_SENTINEL_LOG"\nexit 97\n')
  chmodSync(executable, 0o755)
  return { bin, log }
}

function relativeToHarness(path: string): string {
  const prefix = `${harnessRoot}/`
  assert.equal(path.startsWith(prefix), true, `Path escapes Effect Harness: ${path}`)
  return path.slice(prefix.length)
}

interface RunOptions {
  readonly cwd: string
  readonly env?: NodeJS.ProcessEnv
}

function run(command: string, args: ReadonlyArray<string>, options: RunOptions): void {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? '')
    process.stderr.write(result.stderr ?? '')
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}`)
  }
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
}

function runText(command: string, args: ReadonlyArray<string>, options: RunOptions): string {
  const result = spawnSync(command, args, { cwd: options.cwd, encoding: 'utf8', env: options.env ?? process.env })
  assert.equal(result.status, 0, result.stderr || `${command} failed`)
  return result.stdout
}

function runBytes(command: string, args: ReadonlyArray<string>, options: RunOptions): Buffer {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    maxBuffer: 64 * 1024 * 1024,
  })
  assert.equal(result.status, 0, result.stderr.toString() || `${command} failed`)
  return result.stdout
}
