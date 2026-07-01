import { Effect, String as Str, Stream } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
import { ProcessError } from '../harness/Errors.ts'

type CommandOptions = ChildProcess.CommandOptions

export const commandExitCode = Effect.fnUntraced(function* (
  command: string,
  args: ReadonlyArray<string>,
  options?: CommandOptions,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  return yield* spawner.exitCode(ChildProcess.make(command, args, options))
})

export const commandString = Effect.fnUntraced(function* (
  command: string,
  args: ReadonlyArray<string>,
  options?: CommandOptions,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  return yield* Effect.scoped(Effect.gen(function* () {
    const handle = yield* spawner.spawn(ChildProcess.make(command, args, options))
    const [stdout, stderr] = yield* Effect.all([
      Stream.mkString(Stream.decodeText(handle.stdout)),
      Stream.mkString(Stream.decodeText(handle.stderr)),
    ])
    const exitCode = yield* handle.exitCode
    if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
      return yield* new ProcessError({
        args,
        command,
        ...(options?.cwd !== undefined ? { cwd: options.cwd } : {}),
        exitCode: Number(exitCode),
        message: `${command} ${args.join(' ')} failed with exit code ${exitCode}`,
        stderr,
        stdout,
      })
    }
    return Str.trim(stdout)
  }))
})

export const commandLines = Effect.fnUntraced(function* (
  command: string,
  args: ReadonlyArray<string>,
  options?: CommandOptions,
) {
  const output = yield* commandString(command, args, options)
  return output.length === 0 ? [] : output.split('\n')
})
