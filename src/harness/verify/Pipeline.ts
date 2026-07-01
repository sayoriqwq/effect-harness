import type { FileSystem, PlatformError } from 'effect'
import type { ChildProcessSpawner } from 'effect/unstable/process'
import type { HarnessError, ProcessError } from '../Errors.ts'
import type { VerifyStageSpec, VerifyStageTag } from './VerifyStage.ts'
import { Console, Effect, Result } from 'effect'
import { commandString } from '../../platform/Process.ts'
import { errorMessage } from '../Errors.ts'
import { verifyHarnessContract } from './ProviderRepository.ts'
import { stageSpecByTag, VerifyStageFailed } from './VerifyStage.ts'

type VerifyError = HarnessError | PlatformError.PlatformError | ProcessError
type VerifyServices = ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem

interface VerifyStage {
  readonly spec: VerifyStageSpec
  readonly run: Effect.Effect<void, VerifyError, VerifyServices>
}

function toVoid<E, R>(effect: Effect.Effect<unknown, E, R>): Effect.Effect<void, E, R> {
  return Effect.map(effect, () => undefined)
}

function sourcePins(harness: string): VerifyStage {
  return {
    spec: stageSpecByTag('source-pins'),
    run: toVoid(commandString('pnpm', ['source:verify'], { cwd: harness })),
  }
}

function harnessContract(harness: string): VerifyStage {
  return {
    spec: stageSpecByTag('harness-contract'),
    run: toVoid(verifyHarnessContract(harness)),
  }
}

function commandStage(
  tag: VerifyStageTag,
  args: ReadonlyArray<string>,
  harness: string,
): VerifyStage {
  return {
    spec: stageSpecByTag(tag),
    run: toVoid(commandString('pnpm', args, { cwd: harness })),
  }
}

const runStage = Effect.fnUntraced(function* (stage: VerifyStage) {
  yield* Console.log(`verify stage: ${stage.spec.tag}`)
  const result = yield* Effect.result(stage.run)

  if (Result.isFailure(result)) {
    return yield* new VerifyStageFailed({
      causeMessage: errorMessage(result.failure),
      routeHint: stage.spec.routeHint,
      routes: [...stage.spec.routes],
      stageTag: stage.spec.tag,
      stageTitle: stage.spec.title,
    })
  }

  yield* Console.log(`verify stage passed: ${stage.spec.tag}`)
})

export const verifyPipeline = Effect.fnUntraced(function* (harness: string) {
  const stages: ReadonlyArray<VerifyStage> = [
    sourcePins(harness),
    harnessContract(harness),
    commandStage('tsgo-diagnostics', ['typecheck'], harness),
    commandStage('tests', ['test'], harness),
    commandStage('lint', ['lint', '--max-warnings', '0'], harness),
    commandStage('knip', ['knip'], harness),
  ]

  for (const stage of stages) {
    yield* runStage(stage)
  }

  yield* Console.log('verify pipeline passed.')
})
