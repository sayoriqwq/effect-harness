import type { HarnessModuleContext } from '@sayoriqwq/prelude-contract'
import { expect, it } from '@effect/vitest'
import { decodeModulePlan } from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { harnessModule } from '../src/prelude.ts'

const missing = <Value>() => Effect.sync<Value | undefined>(() => undefined)

const context: HarnessModuleContext = {
  integration: { integrationId: 'effect', packageRoot: '.' },
  artifact: {
    packageName: '@sayoriqwq/effect-harness',
    packageVersion: '0.1.1',
    module: '@sayoriqwq/effect-harness/prelude',
    resolutionId: 'fixture',
  },
  host: { supportedProtocolVersions: [1], supportedFeatures: [...harnessModule.descriptor.requiredFeatures] },
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
    expect(plan.outputs).toHaveLength(6)
    expect(plan.outputs[0]).toMatchObject({ kind: 'ManagedTree', targetRoot: 'effect/managed' })
    expect(plan.outputs[1]).toMatchObject({
      blockId: 'effect-harness-routing',
      content: expect.stringContaining('effect/managed/docs/package-config.md'),
    })
    expect(plan.issues).toHaveLength(1)
    expect(plan.issues[0]?.guidance).toBe('prelude-assets/guidance/eslint.md')
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
