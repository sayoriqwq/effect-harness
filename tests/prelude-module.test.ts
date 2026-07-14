import type { HarnessModuleContext } from '@sayoriqwq/prelude-contract'
import { expect, it } from '@effect/vitest'
import { decodeModulePlan } from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

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

it.effect('plans only stable Harness-owned Outputs through the public Module Interface', () =>
  Effect.gen(function* () {
    const plan = yield* harnessModule.plan(context)

    expect(decodeModulePlan(structuredClone(plan))).toEqual(plan)
    expect(harnessModule.descriptor.protocolVersion).toBe(2)
    expect(plan).toMatchObject({ requirements: [], checks: [], issues: [] })
    expect(plan.outputs).toEqual([
      expect.objectContaining({
        kind: 'ManagedTree',
        id: 'effect.managed',
        locator: { root: 'IntegrationWorkspace', path: 'managed' },
      }),
      expect.objectContaining({
        kind: 'ManagedBlock',
        id: 'effect.agent-routing',
        blockId: 'effect-harness-routing',
        locator: { root: 'ControlRoot', path: 'AGENTS.md' },
        content: expect.stringContaining('.prelude/'),
      }),
      expect.objectContaining({
        kind: 'PinnedReferenceTree',
        id: 'effect.reference.effect',
        locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
        referenceOnly: true,
      }),
      expect.objectContaining({
        kind: 'PinnedReferenceTree',
        id: 'effect.reference.tsgo',
        locator: { root: 'IntegrationWorkspace', path: 'repos/tsgo' },
        referenceOnly: true,
      }),
    ])
  }))

it.effect('does not inspect or plan Target-specific topology or executable configuration', () =>
  Effect.gen(function* () {
    let targetReadCount = 0
    const plan = yield* harnessModule.plan({
      ...context,
      integration: {
        ...context.integration,
        packageRoots: ['apps/api', 'packages/effect-runtime'],
      },
      target: {
        readBytes: () => Effect.sync(() => {
          targetReadCount += 1
          return undefined
        }),
        readText: () => Effect.sync(() => {
          targetReadCount += 1
          return 'export default []'
        }),
        readDirectory: () => Effect.sync(() => {
          targetReadCount += 1
          return []
        }),
        readPackageManifest: () => Effect.sync(() => {
          targetReadCount += 1
          return { dependencies: { effect: '0.0.0' } }
        }),
      },
    })

    expect(targetReadCount).toBe(0)
    expect(plan.outputs).toHaveLength(4)
    expect(plan.outputs.some(output => output.kind === 'JsonKeyedItem' || output.kind === 'JsonValue')).toBe(false)
    expect(plan).toMatchObject({ requirements: [], checks: [], issues: [] })
  }))
