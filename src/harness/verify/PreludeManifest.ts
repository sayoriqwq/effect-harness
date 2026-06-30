import type { PreludeManifest } from './ProviderTypes.ts'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { readJson } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { decodeStringField, isRecord } from './JsonFields.ts'
import { providerId } from './ProviderTypes.ts'

function targetPath(root: string, path: string): string {
  return path.startsWith('/') ? path : `${root}/${path}`
}

function decodePreludeManifest(value: unknown, source: string): Effect.Effect<PreludeManifest, HarnessError> {
  return Effect.gen(function* () {
    if (!isRecord(value)) {
      return yield* new HarnessError({ message: `${source} must be a JSON object` })
    }

    const maintainProviders = value.maintainProviders
    if (!Array.isArray(maintainProviders)) {
      return yield* new HarnessError({ message: `${source} must contain array field: maintainProviders` })
    }

    const providers: Array<{ readonly id: string, readonly recordPath: string }> = []
    for (const [index, provider] of maintainProviders.entries()) {
      if (!isRecord(provider)) {
        return yield* new HarnessError({ message: `${source}.maintainProviders[${index}] must be a JSON object` })
      }
      providers.push({
        id: yield* decodeStringField(provider, 'id', `${source}.maintainProviders[${index}]`),
        recordPath: yield* decodeStringField(provider, 'recordPath', `${source}.maintainProviders[${index}]`),
      })
    }

    return { maintainProviders: providers }
  })
}

export const resolveProviderRecordPath = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  explicitPath: string | undefined,
) {
  const fs = yield* FileSystem.FileSystem
  if (explicitPath !== undefined) {
    if (!(yield* fs.exists(explicitPath))) {
      errors.push(`Missing provider record: ${explicitPath}`)
      return undefined
    }
    return explicitPath
  }

  const preludeManifestPath = `${root}/.prelude/manifest.json`
  if (!(yield* fs.exists(preludeManifestPath))) {
    return undefined
  }

  const preludeManifest = yield* readJson(preludeManifestPath, decodePreludeManifest)
  const provider = preludeManifest.maintainProviders.find(provider => provider.id === providerId)
  if (!provider) {
    errors.push(`.prelude/manifest.json maintainProviders must include id "${providerId}".`)
    return undefined
  }

  const recordPath = targetPath(root, provider.recordPath)
  if (!(yield* fs.exists(recordPath))) {
    errors.push(`Missing provider record: ${provider.recordPath}`)
    return undefined
  }
  return recordPath
})
