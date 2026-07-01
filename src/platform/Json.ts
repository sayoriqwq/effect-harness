import type { PlatformError } from 'effect'
import { Effect, FileSystem, Schema } from 'effect'
import { errorMessage, HarnessError } from '../harness/Errors.ts'

function parseJson<A>(text: string, source: string, decode: (value: unknown, source: string) => Effect.Effect<A, HarnessError>): Effect.Effect<A, HarnessError> {
  return Effect.gen(function* () {
    const value = yield* Schema.decodeUnknownEffect(Schema.UnknownFromJsonString)(text).pipe(
      Effect.mapError(error => new HarnessError({ cause: error, message: `Cannot parse JSON at ${source}: ${errorMessage(error)}` })),
    )
    return yield* decode(value, source)
  })
}

export function readJson<A>(
  source: string,
  decode: (value: unknown, source: string) => Effect.Effect<A, HarnessError>,
): Effect.Effect<A, HarnessError | PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const text = yield* fs.readFileString(source)
    return yield* parseJson(text, source, decode)
  })
}
