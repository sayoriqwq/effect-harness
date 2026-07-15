import type { Buffer } from 'node:buffer'

import { strict as assert } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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
import { Schema } from 'effect'

const harnessRoot = resolve(import.meta.dirname, '../..')
const infraRoot = resolve(harnessRoot, '..')
const partitaRoot = resolve(process.env.PARTITA_ROOT ?? join(infraRoot, 'partita'))
const preludeRoot = resolve(process.env.PRELUDE_ROOT ?? join(infraRoot, 'prelude'))
const phase = process.env.CROSS_REPO_PHASE
const requestedRunRoot = process.env.CROSS_REPO_ROOT
const keepTemp = process.env.CROSS_REPO_KEEP_TEMP === '1'
if (phase !== 'prepare' && phase !== 'apply')
  throw new Error(`CROSS_REPO_PHASE must be explicitly set to prepare or apply, got ${phase ?? 'missing'}`)
if (phase === 'apply' && requestedRunRoot === undefined)
  throw new Error('CROSS_REPO_ROOT is required for APPLY')
if (phase === 'apply' && process.env.CROSS_REPO_APPROVALS === undefined)
  throw new Error('CROSS_REPO_APPROVALS is required for APPLY')
const preserveWorkspace = keepTemp || phase === 'prepare' || phase === 'apply'
const runRoot = requestedRunRoot === undefined
  ? mkdtempSync(join(tmpdir(), 'effect-harness-cross-repo-'))
  : resolve(requestedRunRoot)
const packsRoot = join(runRoot, 'packs')
const packedInputsPath = join(runRoot, 'packed-inputs.prepare.json')
const harnessTempRoot = phase === 'prepare' ? mkdtempSync(join(harnessRoot, 'effect-harness-cross-repo-')) : undefined

try {
  assertRepository(partitaRoot, '@sayoriqwq/partita')
  assertRepository(preludeRoot, 'prelude-workspace')
  mkdirSync(packsRoot, { recursive: true })
  const packedInputs = phase === 'prepare'
    ? preparePackedInputs()
    : readPackedInputs()
  const { contractTarball, partitaTarball, harnessTarball, preludeTarball } = packedInputs
  const gitSentinel = installGitSentinel()
  const approvalEnvironment = process.env.CROSS_REPO_APPROVALS === undefined
    ? {}
    : { PRELUDE_GATE_APPROVALS: process.env.CROSS_REPO_APPROVALS }
  run('pnpm', ['acceptance:packed-effect'], {
    cwd: preludeRoot,
    env: {
      ...process.env,
      EFFECT_HARNESS_TARBALL: harnessTarball,
      PRELUDE_CONTRACT_TARBALL: contractTarball,
      PRELUDE_CLI_TARBALL: preludeTarball,
      PRELUDE_GATE_PHASE: phase,
      PRELUDE_GATE_ROOT: join(runRoot, 'targets'),
      ...approvalEnvironment,
      PATH: `${gitSentinel.bin}:${process.env.PATH ?? ''}`,
      PRELUDE_KEEP_TEMP: '1',
      TARGET_GIT_SENTINEL_LOG: gitSentinel.log,
    },
  })
  assert.equal(existsSync(gitSentinel.log), false, 'Target convergence must not invoke Git')
  if (phase === 'prepare')
    writeApprovalCommandEvidence()

  process.stdout.write([
    phase === 'prepare'
      ? 'Cross-repository packed acceptance PREPARE complete; awaiting exact approval.'
      : 'Cross-repository packed acceptance passed after exact approval.',
    `Phase: ${phase}`,
    `Workspace: ${runRoot}`,
    `Partita: ${partitaTarball}`,
    `Prelude Contract: ${contractTarball}`,
    `Effect Harness: ${harnessTarball}`,
    `Prelude: ${preludeTarball}`,
    '',
  ].join('\n'))
}
finally {
  if (preserveWorkspace && harnessTempRoot !== undefined && existsSync(harnessTempRoot))
    cpSync(harnessTempRoot, join(runRoot, 'publication-evidence'), { recursive: true })
  if (harnessTempRoot !== undefined)
    rmSync(harnessTempRoot, { recursive: true, force: true })
  if (preserveWorkspace)
    console.error(`Preserved cross-repository acceptance workspace: ${runRoot}`)
  else
    rmSync(runRoot, { recursive: true, force: true })
}

function verifyRepositories(): void {
  run('pnpm', ['verify:code'], { cwd: partitaRoot })
  if (phase === 'prepare') {
    const partitaAggregate = runAllowingExpectedFailure('pnpm', ['verify'], { cwd: partitaRoot })
    assert.notEqual(partitaAggregate.status, 0, 'Partita aggregate verify should remain red while Integration is unconverged')
    assert.match(`${partitaAggregate.stdout}\n${partitaAggregate.stderr}`, /Integration drift/u)
  }
  else {
    run('pnpm', ['verify'], { cwd: partitaRoot })
  }
  run('pnpm', ['verify'], { cwd: preludeRoot })
  run('pnpm', ['verify'], { cwd: harnessRoot })
}

interface PackedInputs {
  readonly contractTarball: string
  readonly partitaTarball: string
  readonly harnessTarball: string
  readonly preludeTarball: string
}

const PackedArtifactSchema = Schema.Struct({
  path: Schema.String,
  sha256: Schema.String,
})

const PackedInputsEvidenceSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  phase: Schema.Literal('PREPARE'),
  runRoot: Schema.String,
  artifacts: Schema.Struct({
    contractTarball: PackedArtifactSchema,
    partitaTarball: PackedArtifactSchema,
    harnessTarball: PackedArtifactSchema,
    preludeTarball: PackedArtifactSchema,
  }),
})

const PreparedTargetEvidenceSchema = Schema.Struct({
  planHash: Schema.String,
  targetRoot: Schema.String,
  observedStateBinding: Schema.Struct({ executionHash: Schema.String }),
  commands: Schema.Array(Schema.Unknown),
})

const decodePackedInputsEvidence = Schema.decodeUnknownSync(PackedInputsEvidenceSchema, {
  errors: 'all',
  onExcessProperty: 'error',
})

const decodePreparedTargetEvidence = Schema.decodeUnknownSync(PreparedTargetEvidenceSchema, {
  errors: 'all',
  onExcessProperty: 'preserve',
})

function preparePackedInputs(): PackedInputs {
  assert.notEqual(harnessTempRoot, undefined)
  const publicationRoot = join(harnessTempRoot!, 'publication')
  mkdirSync(publicationRoot, { recursive: true })
  verifyRepositories()

  const contractTarball = pack(join(preludeRoot, 'packages/harness-contract'), packsRoot)
  const partitaTarball = pack(partitaRoot, packsRoot)
  const partita = installPackedPartita(partitaTarball, contractTarball)
  publishFixture(partita, publicationRoot, 'first')
  publishFixture(partita, publicationRoot, 'second')
  assertPublicationDeterminism(publicationRoot)

  const harnessTarball = pack(harnessRoot, packsRoot)
  assertHarnessArtifact(harnessTarball, publicationRoot)
  const preludeTarball = pack(join(preludeRoot, 'apps/cli'), packsRoot)
  const inputs = { contractTarball, partitaTarball, harnessTarball, preludeTarball }
  writeFileSync(packedInputsPath, `${JSON.stringify({
    schemaVersion: 1,
    phase: 'PREPARE',
    runRoot,
    artifacts: Object.fromEntries(Object.entries(inputs).map(([name, path]) => [name, { path, sha256: sha256(path) }])),
  }, null, 2)}\n`)
  return inputs
}

function readPackedInputs(): PackedInputs {
  const evidence = decodePackedInputsEvidence(JSON.parse(readFileSync(packedInputsPath, 'utf8')))
  assert.equal(evidence.runRoot, runRoot)
  const readArtifact = (name: keyof PackedInputs): string => {
    const artifact = evidence.artifacts[name]
    const path = resolve(artifact.path)
    assert.equal(path.startsWith(`${packsRoot}/`), true, `Packed ${name} escapes the approved workspace`)
    assert.equal(existsSync(path), true, `Packed ${name} is missing`)
    assert.equal(sha256(path), artifact.sha256, `Packed ${name} changed after PREPARE`)
    return path
  }
  return {
    contractTarball: readArtifact('contractTarball'),
    partitaTarball: readArtifact('partitaTarball'),
    harnessTarball: readArtifact('harnessTarball'),
    preludeTarball: readArtifact('preludeTarball'),
  }
}

function writeApprovalCommandEvidence(): void {
  const approvals = Object.fromEntries(['single', 'monorepo'].map((name) => {
    const evidence = decodePreparedTargetEvidence(JSON.parse(readFileSync(join(runRoot, 'targets', `${name}.prepare.json`), 'utf8')))
    assert.match(evidence.planHash, /^[a-f0-9]{64}$/u)
    assert.equal(evidence.targetRoot, join(runRoot, 'targets', name))
    assert.equal(evidence.observedStateBinding.executionHash, evidence.planHash)
    return [name, {
      planHash: evidence.planHash,
      targetRoot: evidence.targetRoot,
      observedStateBinding: evidence.observedStateBinding,
      commands: evidence.commands,
      authorizationScope: 'exact initial Plan plus enumerated synthetic mutations inside this disposable Target only',
      syntheticLifecycle: [
        'managed complete-tree drift and repair',
        'packed Artifact upgrade and repair',
        'PinnedReferenceTree missing, partial, and content drift repairs',
      ],
    }]
  }))
  writeFileSync(join(runRoot, 'cross-repo.apply.json'), `${JSON.stringify({
    schemaVersion: 1,
    phase: 'APPLY',
    cwd: harnessRoot,
    env: {
      CROSS_REPO_PHASE: 'apply',
      CROSS_REPO_ROOT: runRoot,
      CROSS_REPO_APPROVALS: JSON.stringify(approvals),
    },
    argv: ['pnpm', 'acceptance:cross-repo'],
  }, null, 2)}\n`)
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function assertRepository(root: string, expectedName: string): void {
  const manifestPath = join(root, 'package.json')
  assert.equal(existsSync(manifestPath), true, `Missing repository manifest: ${manifestPath}`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { readonly name?: string }
  assert.equal(manifest.name, expectedName, `Unexpected package at ${root}`)
}

function pack(packageRoot: string, destination: string): string {
  const before = new Set(readdirSync(destination))
  run('pnpm', ['--config.ignore-scripts=true', 'pack', '--pack-destination', destination], { cwd: packageRoot })
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
  writeFileSync(join(root, 'pnpm-workspace.yaml'), `overrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTarball}'\n  '@effect/platform-node@4.0.0-beta.92>@effect/platform-node-shared': '4.0.0-beta.97'\n  '@effect/platform-node@4.0.0-beta.97>@effect/platform-node-shared': '4.0.0-beta.97'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@4.0.0-beta.92\n  - effect@4.0.0-beta.97\n  - '@effect/platform-node@4.0.0-beta.92'\n  - '@effect/platform-node@4.0.0-beta.97'\n  - '@effect/platform-node-shared@4.0.0-beta.97'\n`)
  run('pnpm', [
    'install',
    '--ignore-scripts',
    '--reporter',
    'append-only',
    '--trust-policy-exclude',
    'effect@4.0.0-beta.97',
    '--trust-policy-exclude',
    '@effect/platform-node@4.0.0-beta.97',
    '--trust-policy-exclude',
    '@effect/platform-node-shared@4.0.0-beta.97',
  ], {
    cwd: root,
    env: { ...process.env, CI: '1' },
  })
  const cli = join(root, 'node_modules/.bin/partita')
  assert.equal(existsSync(cli), true, 'Packed Partita CLI was not installed')
  return cli
}

function publishFixture(partita: string, publicationRoot: string, outputName: string): void {
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

function assertPublicationDeterminism(publicationRoot: string): void {
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

function assertHarnessArtifact(tarball: string, publicationRoot: string): void {
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
  const skillPath = 'artifact-assets/effect/managed/skills/adapt-effect-target/SKILL.md'
  const skillBytes = runBytes('tar', ['-xOf', tarball, `package/${skillPath}`], { cwd: harnessRoot })
  assert.deepEqual(skillBytes, readFileSync(join(harnessRoot, skillPath)))
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

interface SpawnResult {
  readonly status: number | null
  readonly stdout: string
  readonly stderr: string
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

function runAllowingExpectedFailure(command: string, args: ReadonlyArray<string>, options: RunOptions): SpawnResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  process.stdout.write(result.stdout ?? '')
  process.stderr.write(result.stderr ?? '')
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
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
