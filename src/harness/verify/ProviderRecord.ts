import type { PackageJson } from '../Model.ts'
import type { EffectProviderRecord, LifecycleSurfaceRecord } from './ProviderTypes.ts'
import { isAbsolute as isAbsoluteFilePath, relative as relativePath, resolve as resolvePath } from 'node:path'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { readJsonLike } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { decodePackageJson, decodeTsConfig, packageTargets } from '../Model.ts'
import {
  decodeNumberField,
  decodeOptionalRecordField,
  decodeRecordField,
  decodeStringArrayField,
  decodeStringField,
  isRecord,
  optionalStringField,
} from './JsonFields.ts'
import { decodeSnapshot, sameJsonValue, valueAtJsonPointer } from './JsonPointer.ts'
import { assertNoLegacyProviderSurface } from './LegacyState.ts'
import { assertPnpmCatalog, dependencyVersion, packagePointerName } from './PackageBaseline.ts'
import {

  providerId,
  providerProfile,
  supportedProviderContractVersion,
  supportedProviderVersion,
} from './ProviderTypes.ts'

export function decodeEffectProviderRecord(value: unknown, source: string): Effect.Effect<EffectProviderRecord, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const artifactValue = yield* decodeRecordField(value, 'artifact', source)
    const runtimeValue = yield* decodeOptionalRecordField(value, 'runtime', source)
    const runtimeFiles = runtimeValue === undefined || runtimeValue.files === undefined
      ? undefined
      : yield* decodeStringArrayField(runtimeValue, 'files', `${source}.runtime`)
    const surfacesValue = value.surfaces
    if (!Array.isArray(surfacesValue)) {
      return yield* new HarnessError({ message: `${source} must contain array field: surfaces` })
    }

    const surfaces: Array<LifecycleSurfaceRecord> = []
    for (const [index, surface] of surfacesValue.entries()) {
      surfaces.push(yield* decodeSurface(surface, `${source}.surfaces[${index}]`))
    }

    return {
      schemaVersion: yield* decodeNumberField(value, 'schemaVersion', source),
      id: yield* decodeStringField(value, 'id', source),
      contractVersion: yield* decodeStringField(value, 'contractVersion', source),
      providerVersion: yield* decodeStringField(value, 'providerVersion', source),
      profile: yield* decodeStringField(value, 'profile', source),
      artifact: {
        ...artifactValue,
        id: yield* decodeStringField(artifactValue, 'id', `${source}.artifact`),
        version: yield* decodeStringField(artifactValue, 'version', `${source}.artifact`),
        sourceIdentity: artifactValue.sourceIdentity,
      },
      projectedContext: yield* decodeRecordField(value, 'projectedContext', source),
      options: yield* decodeRecordField(value, 'options', source),
      runtime: runtimeValue === undefined ? undefined : { files: runtimeFiles },
      surfaces,
      verificationRecordId: yield* decodeStringField(value, 'verificationRecordId', source),
    }
  })
}

function decodeSurface(value: unknown, source: string): Effect.Effect<LifecycleSurfaceRecord, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }
    const kind = yield* decodeStringField(value, 'kind', source)
    if (kind !== 'ownedFile' && kind !== 'structuredPointer' && kind !== 'managedBlock') {
      return yield* new HarnessError({ message: `${source}.kind must be ownedFile, structuredPointer, or managedBlock` })
    }

    return {
      id: yield* decodeStringField(value, 'id', source),
      owner: yield* decodeStringField(value, 'owner', source),
      lifecycle: yield* decodeStringField(value, 'lifecycle', source),
      kind,
      path: yield* decodeStringField(value, 'path', source),
      pointer: optionalStringField(value, 'pointer'),
      base: optionalStringField(value, 'base'),
      snapshot: optionalStringField(value, 'snapshot'),
    }
  })
}

function providerSurfacePath(errors: Array<string>, root: string, surface: LifecycleSurfaceRecord): string | undefined {
  if (surface.path.trim() === '') {
    errors.push(`provider surface ${surface.id} path must be target-root-relative.`)
    return undefined
  }
  if (isAbsoluteFilePath(surface.path)) {
    errors.push(`provider surface ${surface.id} path must be target-root-relative; got absolute path ${surface.path}.`)
    return undefined
  }
  if (surface.path.split('/').includes('..')) {
    errors.push(`provider surface ${surface.id} path must not contain .. segments: ${surface.path}.`)
    return undefined
  }

  const rootPath = resolvePath(root)
  const resolved = resolvePath(rootPath, surface.path)
  const relative = relativePath(rootPath, resolved)
  if (relative === '..' || relative.startsWith('../') || relative.startsWith('..\\') || isAbsoluteFilePath(relative)) {
    errors.push(`provider surface ${surface.id} path escapes target root: ${surface.path}.`)
    return undefined
  }
  return resolved
}

function assertProviderField(errors: Array<string>, field: string, actual: string | number, expected: string | number): void {
  if (actual !== expected) {
    errors.push(`provider record ${field} is ${actual}; expected ${expected}.`)
  }
}

function assertProviderRecordFields(errors: Array<string>, record: EffectProviderRecord): void {
  assertProviderField(errors, 'schemaVersion', record.schemaVersion, 1)
  assertProviderField(errors, 'id', record.id, providerId)
  assertProviderField(errors, 'artifact.id', record.artifact.id, providerId)
  assertProviderField(errors, 'contractVersion', record.contractVersion, supportedProviderContractVersion)
  assertProviderField(errors, 'providerVersion', record.providerVersion, supportedProviderVersion)
  assertProviderField(errors, 'artifact.version', record.artifact.version, supportedProviderVersion)
  assertProviderField(errors, 'providerVersion', record.providerVersion, record.artifact.version)
  assertProviderField(errors, 'profile', record.profile, providerProfile)

  if (record.artifact.sourceIdentity === undefined) {
    errors.push('provider record artifact.sourceIdentity is required for the Effect source-entry identity.')
  }
  if ('runtime' in record.options) {
    errors.push('provider record options.runtime is legacy; the new effect-harness profile does not project a target runtime.')
  }
  if ((record.runtime?.files?.length ?? 0) > 0) {
    errors.push('provider record runtime.files is legacy; effect-harness no longer owns target .codex runtime assets.')
  }
  if (!record.verificationRecordId.trim()) {
    errors.push('provider record verificationRecordId must be non-empty.')
  }
}

function assertProviderBaselinePointer(
  errors: Array<string>,
  surface: LifecycleSurfaceRecord,
  expected: string | undefined,
  actual: unknown,
): void {
  const name = surface.pointer === undefined ? undefined : packagePointerName(surface.pointer)
  if (name === undefined || expected === undefined) {
    return
  }
  if (actual !== expected && actual !== 'catalog:') {
    errors.push(`${surface.path} pointer ${surface.pointer} is ${actual ?? 'missing'}; expected ${expected} or catalog:.`)
  }
}

const assertProviderSurfaces = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  record: EffectProviderRecord,
  baseline: Readonly<Record<string, string>>,
) {
  const fs = yield* FileSystem.FileSystem
  const owner = `provider:${providerId}`
  const providerSurfaces = record.surfaces.filter(surface => surface.owner === owner)
  if (providerSurfaces.length === 0) {
    errors.push(`provider record surfaces must include entries owned by ${owner}.`)
  }

  let sawPackagePointer = false
  const baselineSurfaceNames = new Set<string>()
  const baselinePackageFiles = new Map<string, PackageJson>()

  for (const surface of providerSurfaces) {
    assertNoLegacyProviderSurface(errors, surface)

    if (surface.lifecycle !== 'managed') {
      errors.push(`provider surface ${surface.id} lifecycle is ${surface.lifecycle}; expected managed.`)
      continue
    }
    if (surface.kind !== 'structuredPointer') {
      continue
    }

    const path = providerSurfacePath(errors, root, surface)
    if (path === undefined) {
      continue
    }
    if (!(yield* fs.exists(path))) {
      errors.push(`Missing file: ${surface.path}.`)
      continue
    }

    const snapshot = surface.snapshot ?? surface.base
    if (surface.pointer === undefined || snapshot === undefined) {
      errors.push(`provider structured pointer ${surface.id} must include pointer and snapshot/base.`)
      continue
    }

    let rootValue: unknown
    if (surface.path.endsWith('package.json')) {
      const packageJson = yield* readJsonLike(path, decodePackageJson)
      rootValue = packageJson
      baselinePackageFiles.set(surface.path, packageJson)
    }
    else if (surface.path.endsWith('tsconfig.json')) {
      rootValue = yield* readJsonLike(path, decodeTsConfig)
    }
    else {
      errors.push(`provider structured pointer ${surface.id} uses unsupported JSON path ${surface.path}.`)
      continue
    }

    const actual = valueAtJsonPointer(rootValue, surface.pointer)
    const expected = decodeSnapshot(snapshot)
    if (!sameJsonValue(actual, expected)) {
      errors.push(`${surface.path} pointer ${surface.pointer} does not match provider record snapshot.`)
    }

    if (surface.path.endsWith('package.json')) {
      const name = packagePointerName(surface.pointer)
      if (name !== undefined && baseline[name] !== undefined) {
        baselineSurfaceNames.add(name)
        assertProviderBaselinePointer(errors, surface, baseline[name], actual)
        sawPackagePointer = true
      }
    }
  }

  if (!sawPackagePointer) {
    errors.push('provider record surfaces must include Effect baseline package structured pointers.')
  }

  for (const packageTarget of packageTargets) {
    if (!baselineSurfaceNames.has(packageTarget.name)) {
      errors.push(`provider record surfaces must include baseline package pointer: ${packageTarget.name}.`)
    }
  }

  for (const [path, packageJson] of baselinePackageFiles) {
    if (dependencyVersion(packageJson, '@effect/cli')) {
      errors.push(`${path} must not depend on @effect/cli for this baseline.`)
    }
    yield* assertPnpmCatalog(errors, root, packageJson, baseline)
  }
})

export const assertProviderRecordContract = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  record: EffectProviderRecord,
  baseline: Readonly<Record<string, string>>,
) {
  assertProviderRecordFields(errors, record)
  yield* assertProviderSurfaces(errors, root, record, baseline)
})
