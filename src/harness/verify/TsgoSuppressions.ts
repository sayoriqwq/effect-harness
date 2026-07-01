import { Effect, FileSystem } from 'effect'
import { commandLines } from '../../platform/Process.ts'

const suppressionPattern = /(?:\/\/|\/\*)\s*@effect-diagnostics(?:-next-line)?\s+\S+:off/u
const sourceExtensions = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'] as const

function isOrdinarySource(file: string): boolean {
  return (
    file.startsWith('bin/')
    || file.startsWith('src/')
    || file.startsWith('tests/')
  ) && sourceExtensions.some(extension => file.endsWith(extension))
}

export const assertNoEffectDiagnosticSuppressions = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
) {
  const fs = yield* FileSystem.FileSystem
  const files = yield* commandLines('git', ['ls-files'], { cwd: root })

  for (const file of files.filter(isOrdinarySource)) {
    const path = `${root}/${file}`
    if (!(yield* fs.exists(path))) {
      continue
    }

    const text = yield* fs.readFileString(path)
    if (suppressionPattern.test(text)) {
      errors.push(`${file} must not disable Effect diagnostics with @effect-diagnostics ...:off.`)
    }
  }
})
