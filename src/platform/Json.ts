import type * as PlatformError from 'effect/PlatformError'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { errorMessage, HarnessError } from '../harness/Errors.ts'

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function stripJsonComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:\\])\/\/.*$/gmu, '$1')
}

export function parseJson<A>(text: string, source: string, decode: (value: unknown, source: string) => Effect.Effect<A, HarnessError>): Effect.Effect<A, HarnessError> {
  return Effect.gen(function* () {
    const value = yield* Effect.try({
      try: () => JSON.parse(text) as unknown,
      catch: error => new HarnessError({ cause: error, message: `Cannot parse JSON at ${source}: ${errorMessage(error)}` }),
    })
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

export function readJsonLike<A>(
  source: string,
  decode: (value: unknown, source: string) => Effect.Effect<A, HarnessError>,
): Effect.Effect<A, HarnessError | PlatformError.PlatformError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const text = yield* fs.readFileString(source)
    return yield* parseJson(stripJsonComments(text), source, decode)
  })
}
