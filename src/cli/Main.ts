import process from 'node:process'
import { Console, Effect, Path, Schema } from 'effect'
import * as Command from 'effect/unstable/cli/Command'
import * as Flag from 'effect/unstable/cli/Flag'
import { discoverProvider } from '../harness/ProviderDiscovery.ts'

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
    const { verifyProviderRepository } = yield* Effect.promise(() => import('../harness/verify/ProviderRepository.ts'))
    yield* verifyProviderRepository(harness)
  })).pipe(
    Command.withDescription('Check the Effect harness provider repository'),
  )

  const providerDiscover = Command.make('provider-discover', {
    harness,
  }, Effect.fnUntraced(function* ({ harness }) {
    const discovery = yield* discoverProvider(harness)
    const discoveryText = yield* Schema.encodeUnknownEffect(Schema.UnknownFromJsonString)(discovery)
    yield* Console.log(discoveryText)
  })).pipe(
    Command.withDescription('Print the machine-readable provider discovery envelope'),
  )

  const sourceVerify = Command.make('source-verify', {
    harness,
  }, Effect.fnUntraced(function* ({ harness }) {
    const { verifySourcePin } = yield* Effect.promise(() => import('../harness/SourcePin.ts'))
    yield* verifySourcePin(harness)
  })).pipe(
    Command.withDescription('Check the pinned official Effect and tsgo source subtrees'),
  )

  const verify = Command.make('verify', {
    harness,
  }, Effect.fnUntraced(function* ({ harness }) {
    const { verifyPipeline } = yield* Effect.promise(() => import('../harness/verify/Pipeline.ts'))
    yield* verifyPipeline(harness)
  })).pipe(
    Command.withDescription('Run the full Effect harness verification pipeline'),
  )

  return Command.make('effect-harness').pipe(
    Command.withDescription('Effect v4 beta provider CLI'),
    Command.withSubcommands([verify, providerVerify, providerDiscover, sourceVerify]),
  )
}

export function runCli(config: CliConfig) {
  return makeCli(config).pipe(
    Command.run({ version: config.version }),
  )
}
