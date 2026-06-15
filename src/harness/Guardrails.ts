import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { HarnessError } from './Errors.ts'
import { analyzeGuardrailFile } from './GuardrailRules.ts'

const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'])
const defaultExcludes = new Set(['.git', '.turbo', 'dist', 'node_modules', 'repos', 'docs'])
export const targetGuardrailIncludes = ['src', 'tests', 'scripts', 'apps', 'libs', 'packages'] as const

export interface GuardrailOptions {
  readonly root: string
  readonly includes: ReadonlyArray<string>
  readonly excludes?: ReadonlySet<string>
}

function extensionOf(file: string): string {
  const match = file.match(/\.[^.]+$/u)
  return match?.[0] ?? ''
}

function shouldSkip(file: string, excludes: ReadonlySet<string>): boolean {
  return file
    .split(/[\\/]/u)
    .some(segment => excludes.has(segment))
}

function shouldSkipGuardrailSource(file: string): boolean {
  return file.endsWith('/src/harness/GuardrailRules.ts')
    || file.endsWith('/tests/effect-guardrails.test.ts')
}

const collectFiles = Effect.fnUntraced(function* (options: GuardrailOptions) {
  const fs = yield* FileSystem.FileSystem
  const excludes = options.excludes ?? defaultExcludes
  const files: Array<string> = []

  for (const include of options.includes) {
    const source = `${options.root}/${include}`
    const exists = yield* fs.exists(source)
    if (!exists || shouldSkip(source, excludes) || shouldSkipGuardrailSource(source)) {
      continue
    }

    const stat = yield* fs.stat(source)
    if (stat.type === 'Directory') {
      const entries = yield* fs.readDirectory(source, { recursive: true })
      for (const entry of entries) {
        const file = `${source}/${entry}`
        if (shouldSkip(file, excludes) || shouldSkipGuardrailSource(file)) {
          continue
        }
        const fileStat = yield* fs.stat(file)
        if (fileStat.type !== 'Directory' && sourceExtensions.has(extensionOf(file))) {
          files.push(file)
        }
      }
    }
    else if (sourceExtensions.has(extensionOf(source))) {
      files.push(source)
    }
  }

  return files
})

export const verifyGuardrails = Effect.fnUntraced(function* (options: GuardrailOptions) {
  const fs = yield* FileSystem.FileSystem
  const files = yield* collectFiles(options)
  const violations = []

  for (const file of files) {
    const text = yield* fs.readFileString(file)
    violations.push(...analyzeGuardrailFile(file, text))
  }

  if (violations.length > 0) {
    yield* Console.error('Effect harness guardrails failed:')
    for (const violation of violations) {
      yield* Console.error(`- ${violation.file}:${violation.line}: ${violation.message}`)
    }
    return yield* new HarnessError({ message: 'Effect guardrails failed.' })
  }

  yield* Console.log(`Effect harness guardrails passed for ${files.length} files.`)
})
