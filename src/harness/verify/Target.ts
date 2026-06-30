import type { PackageJson } from '../Model.ts'
import type { TargetVerifyOptions } from './ProviderTypes.ts'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { readJson } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { targetGuardrailIncludes, verifyGuardrails } from '../Guardrails.ts'
import { decodeManifest, decodePackageJson, packageTargets } from '../Model.ts'
import { verifySourcePin } from '../SourcePin.ts'
import { assertEffectVitestTests } from '../TestContract.ts'
import { assertNoLegacyRuntimeState, assertNoLocalHarnessDispatcher } from './LegacyState.ts'
import { assertDependency, assertPnpmCatalog, dependencyVersion } from './PackageBaseline.ts'
import { resolveProviderRecordPath } from './PreludeManifest.ts'
import { assertProviderRecordContract, decodeEffectProviderRecord } from './ProviderRecord.ts'
import { assertScript, assertTsgoConfig, assertTypecheckScript, assertVerifyScript } from './TsgoConfig.ts'

function assertRootPackageBaseline(
  errors: Array<string>,
  packageJson: PackageJson,
  baseline: Readonly<Record<string, string>>,
): void {
  for (const packageTarget of packageTargets) {
    assertDependency(errors, packageJson, packageTarget.name, baseline[packageTarget.name])
  }
}

export const verifyTarget = Effect.fnUntraced(function* (options: TargetVerifyOptions) {
  const fs = yield* FileSystem.FileSystem
  const errors: Array<string> = []

  if (!(yield* fs.exists(options.target))) {
    errors.push(`Missing target root: ${options.target}`)
  }
  if (!(yield* fs.exists(options.harness))) {
    errors.push(`Missing harness root: ${options.harness}`)
  }

  if (errors.length === 0) {
    const manifest = yield* readJson(`${options.harness}/repos/effect.subtree.json`, decodeManifest)
    const packageJson = yield* readJson(`${options.target}/package.json`, decodePackageJson)
    const baseline = manifest.packageBaseline
    const providerRecordPath = yield* resolveProviderRecordPath(errors, options.target, options.providerRecord)
    const providerRecord = providerRecordPath === undefined
      ? undefined
      : yield* readJson(providerRecordPath, decodeEffectProviderRecord)

    yield* assertNoLegacyRuntimeState(errors, options.target)

    if (providerRecord === undefined) {
      assertRootPackageBaseline(errors, packageJson, baseline)
      yield* assertPnpmCatalog(errors, options.target, packageJson, baseline)
      assertVerifyScript(errors, packageJson)
      assertTypecheckScript(errors, packageJson)
      yield* assertTsgoConfig(errors, options.target)
      for (const script of ['effect:status', 'effect:verify']) {
        assertScript(errors, packageJson, script)
      }
    }
    else {
      yield* assertProviderRecordContract(errors, options.target, providerRecord, baseline)
    }

    if (dependencyVersion(packageJson, '@effect/cli')) {
      errors.push('Target must not depend on @effect/cli for this baseline.')
    }

    yield* assertNoLocalHarnessDispatcher(errors, options.target, packageJson)
    yield* assertEffectVitestTests(errors, options.target, ['src', 'tests'], { requireEffectApi: true })
  }

  if (errors.length > 0) {
    yield* Console.error('Effect target verification failed:')
    for (const error of errors) {
      yield* Console.error(`- ${error}`)
    }
    return yield* new HarnessError({ message: 'Effect target verification failed.' })
  }

  yield* verifySourcePin(options.harness)
  yield* verifyGuardrails({
    root: options.target,
    includes: targetGuardrailIncludes,
  })
  yield* Console.log(`Effect target verified against harness: ${options.target}`)
})
