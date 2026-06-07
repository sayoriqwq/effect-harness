import * as Data from 'effect/Data'

export class HarnessError extends Data.TaggedError('HarnessError')<{
  readonly message: string
  readonly cause?: unknown
}> {}

export class ProcessError extends Data.TaggedError('ProcessError')<{
  readonly args: ReadonlyArray<string>
  readonly command: string
  readonly exitCode?: number
  readonly message: string
  readonly stderr: string
  readonly stdout: string
  readonly cause?: unknown
  readonly cwd?: string
}> {}

export function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && '_tag' in error && error._tag === 'ProcessError') {
    const processError = error as ProcessError
    const lines = [processError.message]
    if (processError.stderr.trim().length > 0) {
      lines.push(`stderr:\n${processError.stderr.trim()}`)
    }
    if (processError.stdout.trim().length > 0) {
      lines.push(`stdout:\n${processError.stdout.trim()}`)
    }
    return lines.join('\n')
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { readonly message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }
  return String(error)
}
