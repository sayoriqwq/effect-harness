import type * as PlatformError from 'effect/PlatformError'
import type { ManagedWriteOptions } from '../harness/Model.ts'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'
import { HarnessError } from '../harness/Errors.ts'

export const ensureDirectory = Effect.fnUntraced(function* (
  targetPath: string,
  options: ManagedWriteOptions,
  changes: Array<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const exists = yield* fs.exists(targetPath)
  if (exists) {
    return
  }

  changes.push(`create directory ${targetPath}`)
  if (!options.dryRun) {
    yield* fs.makeDirectory(targetPath, { recursive: true })
  }
})

export const writeManagedFile = Effect.fnUntraced(function* (
  targetPath: string,
  content: string,
  options: ManagedWriteOptions,
  changes: Array<string>,
) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const exists = yield* fs.exists(targetPath)
  const current = exists ? yield* fs.readFileString(targetPath) : undefined
  if (current === content) {
    return
  }

  changes.push(`${exists ? 'update' : 'create'} ${targetPath}`)
  if (!options.dryRun) {
    yield* fs.makeDirectory(path.dirname(targetPath), { recursive: true })
    yield* fs.writeFileString(targetPath, content)
  }
})

function replaceTokens(text: string, replacements: Readonly<Record<string, string>>): string {
  let next = text
  for (const [key, value] of Object.entries(replacements)) {
    next = next.replaceAll(key, value)
  }
  return next
}

export function copyRuntimeDirectory(
  source: string,
  target: string,
  replacements: Readonly<Record<string, string>>,
  options: ManagedWriteOptions,
  changes: Array<string>,
): Effect.Effect<void, Error | PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const exists = yield* fs.exists(source)
    if (!exists) {
      return yield* new HarnessError({ message: `Missing runtime source: ${source}` })
    }

    const entries = yield* fs.readDirectory(source)
    for (const child of entries) {
      const sourcePath = path.join(source, child)
      const targetPath = path.join(target, child)
      const entry = yield* fs.stat(sourcePath)
      if (entry.type === 'Directory') {
        yield* copyRuntimeDirectory(sourcePath, targetPath, replacements, options, changes)
        continue
      }

      const content = replaceTokens(yield* fs.readFileString(sourcePath), replacements)
      yield* writeManagedFile(targetPath, content, options, changes)
    }
  })
}
