import { Console, Effect, FileSystem } from 'effect'
import { HarnessError } from './Errors.ts'
import { moduleSources } from './ModuleSources.ts'

export interface GuardrailOptions {
  readonly root: string
  readonly includes: ReadonlyArray<string>
}

const sourceExtensions = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'] as const

function isSourceFile(file: string): boolean {
  return sourceExtensions.some(extension => file.endsWith(extension))
}

const collectSourceFiles = Effect.fnUntraced(function* (root: string, includes: ReadonlyArray<string>) {
  const fs = yield* FileSystem.FileSystem
  const files: Array<string> = []

  for (const include of includes) {
    const directory = `${root}/${include}`
    if (!(yield* fs.exists(directory))) {
      continue
    }

    for (const entry of yield* fs.readDirectory(directory, { recursive: true })) {
      const file = `${directory}/${entry}`
      const stat = yield* fs.stat(file)
      if (stat.type !== 'Directory' && isSourceFile(file)) {
        files.push(file)
      }
    }
  }

  return files
})

export const verifyGuardrails = Effect.fnUntraced(function* (options: GuardrailOptions) {
  const fs = yield* FileSystem.FileSystem
  const violations: Array<string> = []
  const files = yield* collectSourceFiles(options.root, options.includes)

  for (const file of files) {
    const text = yield* fs.readFileString(file)
    for (const { source } of moduleSources(file, text)) {
      if (source === '@effect/cli' || source.startsWith('@effect/cli/')) {
        violations.push(`${file} imports ${source}; use effect/unstable/cli for this baseline.`)
      }
      if (source.includes('repos/effect') || source.includes('repos/tsgo')) {
        violations.push(`${file} imports ${source}; repos source pins are read-only reference material.`)
      }
    }
  }

  if (violations.length > 0) {
    yield* Console.error('Effect provider guardrails failed:')
    for (const violation of violations) {
      yield* Console.error(`- ${violation}`)
    }
    return yield* new HarnessError({ message: 'Effect provider guardrails failed.' })
  }

  yield* Console.log(`Effect provider guardrails passed for ${files.length} files.`)
})
