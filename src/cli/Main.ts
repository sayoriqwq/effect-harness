import process from 'node:process'
import { Effect, Path } from 'effect'
import * as Command from 'effect/unstable/cli/Command'
import * as Flag from 'effect/unstable/cli/Flag'
import { verifySourcePin } from '../harness/SourcePin.ts'
import { verifyPipeline } from '../harness/verify/Pipeline.ts'
import { verifyProviderRepository } from '../harness/verify/ProviderRepository.ts'

export interface CliConfig {
  readonly harnessRoot: string
  readonly version: string
}

const resolveFromCwd = Effect.fnUntraced(function* (value: string) {
  const path = yield* Path.Path
  return path.resolve(process.cwd(), value)
})

function harnessFlag(defaultRoot: string) {
  return Flag.path('harness').pipe(
    Flag.withDescription('Effect harness repository root'),
    Flag.withDefault(defaultRoot),
    Flag.mapEffect(resolveFromCwd),
  )
}

function makeCli(config: CliConfig) {
  const harness = harnessFlag(config.harnessRoot)

  const providerVerify = Command.make('provider-verify', {
    harness,
  }, Effect.fnUntraced(function* ({ harness }) {
    yield* verifyProviderRepository(harness)
  })).pipe(
    Command.withDescription('Check the Effect source-entry provider repository'),
  )

  const sourceVerify = Command.make('source-verify', {
    harness,
  }, Effect.fnUntraced(function* ({ harness }) {
    yield* verifySourcePin(harness)
  })).pipe(
    Command.withDescription('Check the pinned official Effect source subtree'),
  )

  const verify = Command.make('verify', {
    harness,
  }, Effect.fnUntraced(function* ({ harness }) {
    yield* verifyPipeline(harness)
  })).pipe(
    Command.withDescription('Run the full Effect harness verification pipeline'),
  )

  return Command.make('effect-harness').pipe(
    Command.withDescription('Effect v4 beta provider CLI'),
    Command.withSubcommands([verify, providerVerify, sourceVerify]),
  )
}

export function runCli(config: CliConfig) {
  return makeCli(config).pipe(
    Command.run({ version: config.version }),
  )
}
