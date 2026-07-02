import type { ProviderDiscovery } from '../src/harness/ProviderDiscovery.ts'
import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { assert, it } from '@effect/vitest'
import { Effect, FileSystem, Path, Schema, Stream } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
import { discoverProvider } from '../src/harness/ProviderDiscovery.ts'

const currentFile = fileURLToPath(import.meta.url)

const repoRoot = Effect.fnUntraced(function* () {
  const path = yield* Path.Path
  return path.resolve(path.dirname(currentFile), '..')
})

function record(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object')
  assert.notEqual(value, null)
  assert.equal(Array.isArray(value), false)
  return value as Record<string, unknown>
}

interface CommandResult {
  readonly status: number
  readonly stdout: string
  readonly stderr: string
}

const runCommand = Effect.fnUntraced(function* (
  cwd: string,
  command: string,
  args: ReadonlyArray<string>,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  return yield* Effect.scoped(Effect.gen(function* () {
    const handle = yield* spawner.spawn(ChildProcess.make(command, args, {
      cwd,
      extendEnv: true,
    }))
    const [stdout, stderr, exitCode] = yield* Effect.all([
      Stream.mkString(Stream.decodeText(handle.stdout)),
      Stream.mkString(Stream.decodeText(handle.stderr)),
      handle.exitCode,
    ])
    return {
      status: Number(exitCode),
      stderr,
      stdout,
    } satisfies CommandResult
  }))
})

function withTempDir<A, E, R>(
  run: (directory: string) => Effect.Effect<A, E, R>,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const directory = yield* Effect.acquireRelease(
      fs.makeTempDirectory({ prefix: 'effect-harness-provider-discovery-' }),
      tempDirectory => fs.remove(tempDirectory, { force: true, recursive: true }).pipe(
        Effect.catch(() => Effect.void),
      ),
    )
    return yield* run(directory)
  }).pipe(Effect.scoped)
}

const packedTarball = Effect.fnUntraced(function* (directory: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const entries = yield* fs.readDirectory(directory)
  const tarballs = entries.filter(entry => entry.endsWith('.tgz'))
  assert.equal(tarballs.length, 1)
  return path.join(directory, tarballs[0]!)
})

const packageVersion = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const packageText = yield* fs.readFileString(path.join(root, 'package.json'))
  const packageJson = record(yield* Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(packageText))
  assert.equal(typeof packageJson.version, 'string')
  return packageJson.version
})

it.layer(NodeServices.layer)((it) => {
  it.effect('provider discovery exposes a Prelude-readable provider envelope', () => Effect.gen(function* () {
    const root = yield* repoRoot()
    const discovery: ProviderDiscovery = yield* discoverProvider(root)
    const expectedPackageVersion = yield* packageVersion(root)

    assert.equal(discovery.schemaVersion, 1)
    assert.equal(discovery.artifactRoot, root)
    assert.equal(discovery.provider.id, 'effect-harness')
    assert.equal(discovery.provider.contractVersion, '1')
    assert.equal(discovery.provider.providerVersion, '0.1.0')
    assert.equal(discovery.provider.defaultProfile, 'codex-effect-v4')
    assert.equal(discovery.selectedProfile, 'codex-effect-v4')

    assert.equal(discovery.discovery.mode, 'provider-discovery')
    assert.equal(discovery.discovery.consumer, 'prelude')
    assert.equal(discovery.discovery.profileSource, 'provider/effect-harness.provider.json')
    assert.equal(discovery.discovery.targetLifecycleOwner, 'prelude')

    assert.equal(discovery.packageLocator.packageName, '@sayoriqwq/effect-harness')
    assert.equal(discovery.packageLocator.packageVersion, expectedPackageVersion)
    assert.equal(discovery.packageLocator.binName, 'effect-harness')
    assert.equal(discovery.packageLocator.binPath, 'dist/bin/effect-harness.js')
    assert.equal(discovery.packageLocator.discoveryCommand, 'npx --yes @sayoriqwq/effect-harness provider-discover')
    assert.ok(discovery.packageLocator.packageFiles.includes('provider'))
    assert.ok(discovery.packageLocator.packageFiles.includes('repos'))

    assert.equal(record(discovery.deliveryModes.internalHarness).mode, 'internal-harness')
    assert.equal(record(discovery.internalHarnessSurfaces).mode, 'internal-harness')

    assert.ok(discovery.targetManagedSurfaces.targetReceives.some(surface => surface.includes('docs bundle')))
    assert.ok(discovery.targetManagedSurfaces.targetDoesNotReceive.some(surface => surface.includes('repos/effect')))
    assert.equal(discovery.targetManagedSurfaces.documentationBundle.targetBasePath, '.prelude/providers/effect-harness/docs')
    assert.equal(discovery.targetManagedSurfaces.snippets.targetBasePath, '.prelude/providers/effect-harness/snippets')
    assert.ok(discovery.targetManagedSurfaces.documentationBundle.files.some(file => file.sourcePath === 'provider/docs/discovery.md'))
    assert.ok(discovery.targetManagedSurfaces.snippets.files.some(file => file.sourcePath === 'provider/snippets/agents.md'))

    const contributions = discovery.targetManagedSurfaces.contributions
    assert.equal(record(contributions.packageJson).mode, 'structured-merge')
    assert.equal(record(contributions.tsconfig).mode, 'structured-merge')
    assert.equal(record(contributions.editorPolicy).mode, 'structured-merge')
    assert.equal(record(contributions.lintGuardrails).mode, 'command-policy')
    assert.equal(record(contributions.testPolicy).mode, 'command-policy')
    assert.equal(record(contributions.verificationPolicy).mode, 'pipeline-policy')

    assert.equal(discovery.artifactOnlyReferences.mode, 'provider-artifact-reference')
    assert.equal(discovery.artifactOnlyReferences.targetDelivery, 'identity-only')
    assert.equal(record(discovery.artifactOnlyReferences.references)['effect-source-tree'], record(discovery.sourceIdentities.artifactReferences)['effect-source-tree'])
    assert.equal(record(record(discovery.artifactOnlyReferences.references)['effect-source-tree']).targetDelivery, 'artifact-only')
    assert.equal(record(record(discovery.artifactOnlyReferences.references)['tsgo-route-doc']).path, 'harness/tsgo-routes.md')

    assert.equal(discovery.sourceIdentities.defaultSourceEntry, 'effect-official-source')
    assert.ok(discovery.sourceIdentities.sourceEntries.includes('tsgo-official-source'))
    assert.equal(discovery.sourceIdentities.sourceBoundary.targetDelivery, 'identity-only')
    assert.ok(discovery.sourceIdentities.sourceBoundary.targetMustNotReceive.includes('repos/tsgo'))
  }))

  it.effect('packed package provider-discover runs in a clean npx install', () => withTempDir(directory => Effect.gen(function* () {
    const root = yield* repoRoot()
    const pack = yield* runCommand(root, 'pnpm', ['pack', '--pack-destination', directory])
    assert.equal(pack.status, 0, pack.stderr)

    const tarball = yield* packedTarball(directory)
    const discoveryResult = yield* runCommand(directory, 'npx', [
      '--yes',
      '--package',
      tarball,
      'effect-harness',
      'provider-discover',
    ])

    assert.equal(discoveryResult.status, 0, discoveryResult.stderr)
    assert.equal(discoveryResult.stderr.includes('Cannot find package'), false)

    const discovery = record(
      yield* Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(discoveryResult.stdout.trim()),
    )
    assert.equal(record(discovery.provider).id, 'effect-harness')
    assert.equal(record(discovery.packageLocator).packageName, '@sayoriqwq/effect-harness')
    assert.equal(record(discovery.discovery).mode, 'provider-discovery')
  })), 60_000)
})
