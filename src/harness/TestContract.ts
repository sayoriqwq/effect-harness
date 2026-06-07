import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { moduleSources } from './ModuleSources.ts'

const testFilePattern = /\.test\.(?:ts|tsx|mts|cts|js|mjs|cjs)$/u

export interface EffectVitestOptions {
  readonly requireEffectApi?: boolean
}

const collectSourceFiles = Effect.fnUntraced(function* (root: string, directories: ReadonlyArray<string>) {
  const fs = yield* FileSystem.FileSystem
  const files: Array<string> = []

  for (const directory of directories) {
    const source = `${root}/${directory}`
    const exists = yield* fs.exists(source)
    if (!exists) {
      continue
    }

    const entries = yield* fs.readDirectory(source, { recursive: true })
    for (const entry of entries) {
      const file = `${source}/${entry}`
      const stat = yield* fs.stat(file)
      if (stat.type !== 'Directory' && testFilePattern.test(file)) {
        files.push(file)
      }
    }
  }

  return files
})

export const assertEffectVitestTests = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  directories: ReadonlyArray<string>,
  options: EffectVitestOptions = {},
) {
  const fs = yield* FileSystem.FileSystem
  const files = yield* collectSourceFiles(root, directories)

  for (const file of files) {
    const text = yield* fs.readFileString(file)
    const sources = moduleSources(file, text).map(source => source.source)

    if (sources.includes('node:test')) {
      errors.push(`${file} imports from node:test; import describe, it, assert, or expect from @effect/vitest.`)
    }

    if (sources.includes('vitest')) {
      errors.push(`${file} imports from vitest; import describe, it, assert, or expect from @effect/vitest.`)
    }

    if (!sources.includes('@effect/vitest')) {
      errors.push(`${file} does not import from @effect/vitest.`)
    }

    if (options.requireEffectApi === true && !/\bit\.(?:effect|live)\b/u.test(text) && !/\blayer\s*\(/u.test(text)) {
      errors.push(`${file} must use it.effect, it.live, or layer from @effect/vitest.`)
    }
  }
})
