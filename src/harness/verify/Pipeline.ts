import type { FileSystem, PlatformError } from 'effect'
import type { ChildProcessSpawner } from 'effect/unstable/process'
import type { ProcessError } from '../Errors.ts'
import { Console, Effect, Result } from 'effect'
import { commandString } from '../../platform/Process.ts'
import { errorMessage, HarnessError } from '../Errors.ts'
import { verifyHarnessContract } from './ProviderRepository.ts'

type VerifyError = HarnessError | PlatformError.PlatformError | ProcessError
type VerifyServices = ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem

interface VerifyStage {
  readonly name: string
  readonly routes: ReadonlyArray<string>
  readonly run: Effect.Effect<void, VerifyError, VerifyServices>
}

function toVoid<E, R>(effect: Effect.Effect<unknown, E, R>): Effect.Effect<void, E, R> {
  return Effect.map(effect, () => undefined)
}

function sourcePins(harness: string): VerifyStage {
  return {
    name: 'source-pins',
    routes: ['harness/source.md'],
    run: toVoid(commandString('pnpm', ['source:verify'], { cwd: harness })),
  }
}

function harnessContract(harness: string): VerifyStage {
  return {
    name: 'harness-contract',
    routes: ['harness/index.md', 'harness/offcial-migrate.md'],
    run: toVoid(verifyHarnessContract(harness)),
  }
}

function commandStage(
  name: string,
  routes: ReadonlyArray<string>,
  args: ReadonlyArray<string>,
  harness: string,
): VerifyStage {
  return {
    name,
    routes,
    run: toVoid(commandString('pnpm', args, { cwd: harness })),
  }
}

function routeBlock(routes: ReadonlyArray<string>): string {
  return routes.map(route => `- ${route}`).join('\n')
}

const runStage = Effect.fnUntraced(function* (stage: VerifyStage) {
  yield* Console.log(`verify stage: ${stage.name}`)
  const result = yield* Effect.result(stage.run)

  if (Result.isFailure(result)) {
    return yield* new HarnessError({
      cause: result.failure,
      message: [
        `verify failed at ${stage.name}`,
        'route:',
        routeBlock(stage.routes),
        errorMessage(result.failure),
      ].join('\n'),
    })
  }

  yield* Console.log(`verify stage passed: ${stage.name}`)
})

export const verifyPipeline = Effect.fnUntraced(function* (harness: string) {
  const stages: ReadonlyArray<VerifyStage> = [
    sourcePins(harness),
    harnessContract(harness),
    commandStage('tsgo-diagnostics', ['harness/tsgo.md', 'harness/tsgo-routes.md'], ['typecheck'], harness),
    commandStage('tests', ['harness/effect-routes.md'], ['test'], harness),
    commandStage('lint', ['AGENTS.md', 'eslint.config.js'], ['lint', '--max-warnings', '0'], harness),
    commandStage('knip', ['package.json'], ['knip'], harness),
  ]

  for (const stage of stages) {
    yield* runStage(stage)
  }

  yield* Console.log('verify pipeline passed.')
})
