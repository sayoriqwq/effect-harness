import { spawnSync } from 'node:child_process'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { managedBundlePaths } from './managed-bundle.ts'

it.effect('packs only the supported Artifact surface', () => Effect.sync(() => {
  const root = process.cwd()
  const packDirectory = mkdtempSync(join(tmpdir(), 'effect-harness-pack-'))

  try {
    run('pnpm', ['pack', '--pack-destination', packDirectory], root)
    const tarballs = readdirSync(packDirectory).filter(path => path.endsWith('.tgz'))
    expect(tarballs).toHaveLength(1)
    const tarball = join(packDirectory, tarballs[0] ?? '')
    const entries = new Set(run('tar', ['-tf', tarball], root).split('\n').filter(Boolean))
    const packageJson = JSON.parse(run('tar', ['-xOf', tarball, 'package/package.json'], root))
    const prelude = run('tar', ['-xOf', tarball, 'package/dist/prelude.js'], root)

    expect(Object.keys(packageJson.exports)).toEqual(['./prelude', './eslint'])
    expect(packageJson.dependencies?.['@sayoriqwq/prelude-contract']).toBe('0.2.0')
    expect(packageJson.dependencies?.['@effect/platform-node']).toBeUndefined()
    for (const path of [
      'package/dist/prelude.js',
      'package/dist/prelude.d.ts',
      'package/dist/eslint.js',
      'package/dist/eslint.d.ts',
      'package/artifact-assets/effect/reference-archives/effect.pta',
      'package/artifact-assets/effect/reference-archives/effect.json',
      'package/artifact-assets/effect/reference-archives/tsgo.pta',
      'package/artifact-assets/effect/reference-archives/tsgo.json',
      ...managedBundlePaths.map(path => `package/artifact-assets/effect/managed/${path}`),
    ]) {
      expect(entries.has(path), `packed Artifact is missing ${path}`).toBe(true)
    }

    expect(new Set([...entries].map(path => path.split('/')[1]))).toEqual(new Set([
      'README.md',
      'artifact-assets',
      'dist',
      'package.json',
    ]))
    expect([...entries].every(path => !path.startsWith('package/repos/'))).toBe(true)
    expect([...entries].every(path => !path.startsWith('package/diagnostics/'))).toBe(true)
    expect([...entries].every(path => !path.startsWith('package/prelude-assets/'))).toBe(true)
    expect([...entries].every(path => !path.endsWith('.subtree.json'))).toBe(true)
    expect([...entries].every(path => path !== 'package/dist/index.js' && path !== 'package/dist/index.d.ts')).toBe(true)
    expect(entries.has('package/dist/reference-archives/tsgo.pta')).toBe(false)
    expect(prelude).toContain('archive:')
    expect(prelude).not.toContain('closure:')

    const consumer = join(packDirectory, 'consumer')
    const scopeDirectory = join(consumer, 'node_modules/@sayoriqwq')
    const installedArtifact = join(scopeDirectory, 'effect-harness')
    mkdirSync(scopeDirectory, { recursive: true })
    run('tar', ['-xzf', tarball, '-C', scopeDirectory], root)
    renameSync(join(scopeDirectory, 'package'), installedArtifact)
    expect(lstatSync(installedArtifact).isSymbolicLink()).toBe(false)
    symlinkSync(join(root, 'node_modules/@antfu'), join(consumer, 'node_modules/@antfu'), 'dir')
    symlinkSync(
      join(root, 'node_modules/@sayoriqwq/prelude-contract'),
      join(scopeDirectory, 'prelude-contract'),
      'dir',
    )
    symlinkSync(join(root, 'node_modules/effect'), join(consumer, 'node_modules/effect'), 'dir')
    writeFileSync(join(consumer, 'package.json'), '{"type":"module"}\n')
    writeFileSync(join(consumer, 'prelude-consumer.mjs'), [
      'import * as publicModule from \'@sayoriqwq/effect-harness/prelude\'',
      'import { Effect } from \'effect\'',
      'let targetReadCount = 0',
      'const missing = () => Effect.succeed(undefined)',
      'const observed = () => Effect.sync(() => { targetReadCount += 1; return undefined })',
      'const plan = await Effect.runPromise(publicModule.harnessModule.plan({',
      '  integration: { integrationId: \'effect\', packageRoots: [\'apps/api\', \'packages/runtime\'] },',
      '  artifact: { packageName: \'@sayoriqwq/effect-harness\', packageVersion: \'fixture\', module: \'@sayoriqwq/effect-harness/prelude\', resolutionId: \'fixture\' },',
      '  host: { supportedProtocolVersions: [2], supportedFeatures: [...publicModule.harnessModule.descriptor.requiredFeatures] },',
      '  artifactAssets: { readBytes: missing, readText: missing, readDirectory: missing },',
      '  target: { readBytes: observed, readText: observed, readDirectory: observed, readPackageManifest: observed },',
      '}))',
      'console.log(JSON.stringify({',
      '  exports: Object.keys(publicModule),',
      '  targetReadCount,',
      '  outputs: plan.outputs.map(({ kind, id }) => ({ kind, id })),',
      '  requirements: plan.requirements, checks: plan.checks, issues: plan.issues,',
      '}))',
      '',
    ].join('\n'))
    const packedPrelude = JSON.parse(run('node', ['prelude-consumer.mjs'], consumer))
    expect(packedPrelude).toEqual({
      exports: ['harnessModule'],
      targetReadCount: 0,
      outputs: [
        { kind: 'ManagedTree', id: 'effect.managed' },
        { kind: 'ManagedBlock', id: 'effect.agent-routing' },
        { kind: 'PinnedReferenceTree', id: 'effect.reference.effect' },
        { kind: 'PinnedReferenceTree', id: 'effect.reference.tsgo' },
      ],
      requirements: [],
      checks: [],
      issues: [],
    })
    writeFileSync(join(consumer, 'eslint.config.mjs'), [
      'import antfu from \'@antfu/eslint-config\'',
      'import effectHarness from \'@sayoriqwq/effect-harness/eslint\'',
      'export default antfu().append(...effectHarness)',
      '',
    ].join('\n'))
    writeFileSync(join(consumer, 'safe.js'), 'export const answer = { disableValidation: true }\n')
    writeFileSync(join(consumer, 'reference-import.js'), 'import source from \'repos/effect/src/Effect.ts\'\nexport { source }\n')
    expect(run(join(root, 'node_modules/.bin/eslint'), ['safe.js'], consumer)).toBe('')
    expect(() => run(join(root, 'node_modules/.bin/eslint'), ['reference-import.js'], consumer)).toThrow(/no-restricted-imports/u)
  }
  finally {
    rmSync(packDirectory, { recursive: true, force: true })
  }
}), 120_000)

function run(command: string, arguments_: ReadonlyArray<string>, cwd: string): string {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  })
  if (result.status !== 0)
    throw new Error(`${command} ${arguments_.join(' ')} failed:\n${result.stderr || result.stdout}`)
  return result.stdout.trim()
}
