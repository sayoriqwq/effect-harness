import type { HarnessModuleContext } from '@sayoriqwq/prelude-contract'
import { expect, it } from '@effect/vitest'
import { decodeModulePlan } from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { effectTsgoTargetProjection } from '../src/harness/Policy.ts'
import { harnessModule } from '../src/prelude.ts'

const missing = <Value>() => Effect.sync<Value | undefined>(() => undefined)

const context: HarnessModuleContext = {
  integration: { integrationId: 'effect', packageRoots: ['.'] },
  artifact: {
    packageName: '@sayoriqwq/effect-harness',
    packageVersion: '0.2.0',
    module: '@sayoriqwq/effect-harness/prelude',
    resolutionId: 'fixture',
  },
  host: { supportedProtocolVersions: [2], supportedFeatures: [...harnessModule.descriptor.requiredFeatures] },
  artifactAssets: {
    readBytes: () => missing<Uint8Array>(),
    readText: () => missing<string>(),
    readDirectory: () => missing<ReadonlyArray<never>>(),
  },
  target: {
    readBytes: () => missing<Uint8Array>(),
    readText: () => missing<string>(),
    readDirectory: () => missing<ReadonlyArray<never>>(),
    readPackageManifest: () => missing<Record<string, never>>(),
  },
}

it.effect('plans a schema-valid read-only Effect target transition', () =>
  Effect.gen(function* () {
    const plan = yield* harnessModule.plan(context)
    expect(decodeModulePlan(structuredClone(plan))).toEqual(plan)
    expect(harnessModule.descriptor.protocolVersion).toBe(2)
    expect(plan.outputs).toHaveLength(8)
    expect(plan.outputs[0]).toMatchObject({
      kind: 'ManagedTree',
      locator: { root: 'IntegrationWorkspace', path: 'managed' },
    })
    expect(plan.outputs.filter(output => output.kind === 'PinnedReferenceTree')).toEqual([
      expect.objectContaining({
        id: 'effect.reference.effect',
        locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
        referenceOnly: true,
      }),
      expect.objectContaining({
        id: 'effect.reference.tsgo',
        locator: { root: 'IntegrationWorkspace', path: 'repos/tsgo' },
        referenceOnly: true,
      }),
    ])
    expect(plan.outputs[1]).toMatchObject({
      blockId: 'effect-harness-routing',
      locator: { root: 'ControlRoot', path: 'AGENTS.md' },
      content: expect.stringContaining('.prelude/'),
    })
    expect(plan.issues).toHaveLength(1)
    expect(plan.issues[0]?.guidance).toBe('artifact-assets/effect/managed/docs/package-config.md')
  }))

it.effect('shares Integration Outputs while planning policy per selected package root', () =>
  Effect.gen(function* () {
    const packageRoots = ['apps/api', 'packages/effect-runtime'] as const
    const plan = yield* harnessModule.plan({
      ...context,
      integration: { ...context.integration, packageRoots: [...packageRoots] },
    })

    expect(plan.outputs.filter(output => output.kind === 'ManagedTree')).toHaveLength(1)
    expect(plan.outputs.filter(output => output.kind === 'PinnedReferenceTree')).toHaveLength(2)
    expect(plan.outputs.filter(output => output.kind === 'JsonKeyedItem')).toEqual(
      packageRoots.map(packageRoot => expect.objectContaining({
        locator: { root: 'PackageRoot', packageRoot, path: 'tsconfig.json' },
      })),
    )
    expect(new Set(plan.requirements.map(requirement => requirement.packageRoot))).toEqual(new Set(packageRoots))
    expect(new Set(plan.checks.map(check => check.packageRoot))).toEqual(new Set(packageRoots))
    expect(plan.outputs.some(output =>
      output.locator.root === 'IntegrationWorkspace'
      && (output.locator.path === 'feedback' || output.locator.path.startsWith('feedback/')),
    )).toBe(false)
  }))

it.effect('preserves peer-based library package semantics in Requirements', () =>
  Effect.gen(function* () {
    const packageRoot = 'packages/contracts'
    const plan = yield* harnessModule.plan({
      ...context,
      integration: { ...context.integration, packageRoots: [packageRoot] },
      target: {
        ...context.target,
        readPackageManifest: () => Effect.succeed({
          peerDependencies: { effect: '4.0.0-beta.97' },
          devDependencies: { effect: '4.0.0-beta.97' },
        }),
      },
    })

    expect(plan.requirements).toContainEqual(expect.objectContaining({
      packageRoot,
      packageName: 'effect',
      section: 'devDependencies',
    }))
    expect(plan.requirements.some(requirement => requirement.packageName === '@effect/platform-node')).toBe(false)
  }))

it.effect('repairs peer-only Effect packages through devDependencies', () =>
  Effect.gen(function* () {
    const packageRoot = 'packages/runtime-contract'
    const plan = yield* harnessModule.plan({
      ...context,
      integration: { ...context.integration, packageRoots: [packageRoot] },
      target: {
        ...context.target,
        readPackageManifest: () => Effect.succeed({
          peerDependencies: {
            '@effect/platform-node': '4.0.0-beta.97',
            'effect': '4.0.0-beta.97',
          },
        }),
      },
    })

    expect(plan.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ packageRoot, packageName: 'effect', section: 'devDependencies' }),
      expect.objectContaining({ packageRoot, packageName: '@effect/platform-node', section: 'devDependencies' }),
    ]))
  }))

it.effect('projects the complete canonical language-service policy', () =>
  Effect.gen(function* () {
    const plan = yield* harnessModule.plan(context)
    const output = plan.outputs.find(candidate => candidate.kind === 'JsonKeyedItem')

    expect(output).toMatchObject({
      kind: 'JsonKeyedItem',
      item: {
        diagnosticSeverity: {
          catchToIgnore: 'suggestion',
          flatMapToMap: 'suggestion',
        },
      },
    })

    if (output?.kind !== 'JsonKeyedItem')
      throw new Error('Effect language-service policy Output is absent')

    expect(Object.keys(effectTsgoTargetProjection.languageServicePlugin.diagnosticSeverity)).toHaveLength(78)
    expect(output.item).toEqual(effectTsgoTargetProjection.languageServicePlugin)
  }))

function planWithEslintConfig(content: string | undefined) {
  return harnessModule.plan({
    ...context,
    target: { ...context.target, readText: () => Effect.succeed(content) },
  })
}

it.effect('accepts a canonical ESLint import and composition', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('import effectHarnessEslintConfig from \'@sayoriqwq/effect-harness/eslint\'\nexport default [...effectHarnessEslintConfig]')
    expect(plan.issues).toEqual([])
  }))

it.effect('accepts an aliased ESLint import and composition', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('import effectConfig from \'@sayoriqwq/effect-harness/eslint\'\nexport default [...effectConfig]')
    expect(plan.issues).toEqual([])
  }))

it.effect('blocks comments that name the package without importing its binding', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('// @sayoriqwq/effect-harness/eslint\nexport default [...effectHarnessEslintConfig]')
    expect(plan.issues).toHaveLength(1)
  }))

it.effect('blocks comment pseudo-code that looks like an import and composition', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('/*\nimport effectConfig from \'@sayoriqwq/effect-harness/eslint\'\nexport default [...effectConfig]\n*/\nexport default []')
    expect(plan.issues).toHaveLength(1)
  }))

it.effect('blocks string pseudo-code that looks like an import and composition', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('const example = "import effectConfig from \'@sayoriqwq/effect-harness/eslint\'; export default [...effectConfig]"\nexport default []')
    expect(plan.issues).toHaveLength(1)
  }))

it.effect('blocks an imported ESLint config that is not composed', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('import effectConfig from \'@sayoriqwq/effect-harness/eslint\'\nexport default []')
    expect(plan.issues).toHaveLength(1)
  }))

it.effect('blocks a composition that spreads a different binding', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('import effectConfig from \'@sayoriqwq/effect-harness/eslint\'\nconst otherConfig = []\nexport default [...otherConfig]')
    expect(plan.issues).toHaveLength(1)
  }))

it.effect('blocks the non-iterable Antfu v9 array-spread composition', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('import antfu from \'@antfu/eslint-config\'\nimport effectHarness from \'@sayoriqwq/effect-harness/eslint\'\nexport default [...antfu(), ...effectHarness]')
    expect(plan.issues).toHaveLength(1)
  }))

it.effect('accepts the executable Antfu v9 append composition', () =>
  Effect.gen(function* () {
    const plan = yield* planWithEslintConfig('import antfu from \'@antfu/eslint-config\'\nimport effectHarness from \'@sayoriqwq/effect-harness/eslint\'\nexport default antfu().append(...effectHarness)')
    expect(plan.issues).toEqual([])
  }))

it.effect('blocks absent and unrelated ESLint config', () =>
  Effect.gen(function* () {
    const absent = yield* planWithEslintConfig(undefined)
    const other = yield* planWithEslintConfig('export default []')
    expect(absent.issues).toHaveLength(1)
    expect(other.issues).toHaveLength(1)
  }))
