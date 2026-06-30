import process from 'node:process'
import * as NodeServices from '@effect/platform-node/NodeServices'
import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as Path from 'effect/Path'
import * as Command from 'effect/unstable/cli/Command'
import * as Flag from 'effect/unstable/cli/Flag'
import { targetGuardrailIncludes, verifyGuardrails } from '../harness/Guardrails.ts'
import { publishPackage } from '../harness/Publish.ts'
import { updateSourcePin, verifySourcePin } from '../harness/SourcePin.ts'
import { showStatus } from '../harness/Status.ts'
import { verifyProviderRepository } from '../harness/verify/ProviderRepository.ts'
import { verifyTarget } from '../harness/verify/Target.ts'

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

const targetFlag = Flag.path('target').pipe(
  Flag.withDescription('Target repository root'),
  Flag.withDefault(process.cwd()),
  Flag.mapEffect(resolveFromCwd),
)

const providerRecordFlag = Flag.path('provider-record').pipe(
  Flag.withDescription('Effect harness provider record path for prelude-managed targets'),
  Flag.optional,
  Flag.mapEffect(option => Option.match(option, {
    onNone: () => Effect.sync((): string | undefined => undefined),
    onSome: resolveFromCwd,
  })),
)

const dryRunFlag = Flag.boolean('dry-run').pipe(
  Flag.withDescription('Preview writes without changing files'),
)

const jsonFlag = Flag.boolean('json').pipe(
  Flag.withDescription('Print machine-readable JSON'),
)

const failOnOutdatedFlag = Flag.boolean('fail-on-outdated').pipe(
  Flag.withDescription('Exit non-zero when official Effect sources are newer than the pin'),
)

const versionFlag = Flag.string('version').pipe(
  Flag.withDescription('Publish version, supports 0.1.0 or v0.1.0'),
  Flag.optional,
)

const tagFlag = Flag.string('tag').pipe(
  Flag.withDescription('NPM dist-tag for publish'),
  Flag.optional,
)

const npmTagFlag = Flag.string('npm-tag').pipe(
  Flag.withDescription('Alias for --tag'),
  Flag.optional,
)

const packDestinationFlag = Flag.string('pack-destination').pipe(
  Flag.withDescription('Directory for pnpm pack artifacts'),
  Flag.optional,
)

const publishDryRunFlag = Flag.boolean('dry-run').pipe(
  Flag.withDescription('Prepare publish without uploading to npm'),
  Flag.optional,
)

const provenanceFlag = Flag.boolean('provenance').pipe(
  Flag.withDescription('Enable npm provenance metadata'),
  Flag.optional,
)

const snapshotFlag = Flag.file('snapshot').pipe(
  Flag.withDescription('Use a JSON snapshot instead of network package/source lookups'),
  Flag.optional,
  Flag.mapEffect(option => Option.match(option, {
    onNone: () => Effect.sync((): string | undefined => undefined),
    onSome: resolveFromCwd,
  })),
)

function makeCli(config: CliConfig) {
  const harness = harnessFlag(config.harnessRoot)

  const status = Command.make('status', {
    failOnOutdated: failOnOutdatedFlag,
    harness,
    json: jsonFlag,
    snapshot: snapshotFlag,
  }, Effect.fnUntraced(function* ({ failOnOutdated, harness, json, snapshot }) {
    yield* showStatus({ failOnOutdated, harness, json, snapshot })
  })).pipe(
    Command.withDescription('Compare the pinned Effect source and package baseline with official sources'),
  )

  const verify = Command.make('verify', {
    harness,
    providerRecord: providerRecordFlag,
    target: targetFlag,
  }, Effect.fnUntraced(function* ({ harness, providerRecord, target }) {
    yield* verifyTarget({ harness, providerRecord, target })
  })).pipe(
    Command.withDescription('Check a target repository against this harness contract'),
  )

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

  const guardrails = Command.make('guardrails', {
    target: targetFlag,
  }, Effect.fnUntraced(function* ({ target }) {
    yield* verifyGuardrails({
      root: target,
      includes: targetGuardrailIncludes,
    })
  })).pipe(
    Command.withDescription('Scan target source for Effect harness guardrail violations'),
  )

  const updatePin = Command.make('update-pin', {
    dryRun: dryRunFlag,
    harness,
    snapshot: snapshotFlag,
  }, Effect.fnUntraced(function* ({ dryRun, harness, snapshot }) {
    yield* updateSourcePin({
      dryRun,
      harness,
      snapshot,
    })
  })).pipe(
    Command.withDescription('Update the pinned official Effect source, manifest, workspace, and baseline docs'),
  )

  const publish = Command.make('publish', {
    harness,
    version: versionFlag,
    tag: tagFlag,
    npmTag: npmTagFlag,
    dryRun: publishDryRunFlag,
    provenance: provenanceFlag,
    packDestination: packDestinationFlag,
  }, Effect.fnUntraced(function* ({ harness, version, tag, npmTag, dryRun, provenance, packDestination }) {
    const resolvedTag = Option.getOrElse(npmTag, () => Option.getOrUndefined(tag) ?? 'latest')
    yield* publishPackage({
      harness,
      version: Option.getOrUndefined(version),
      npmTag: resolvedTag,
      dryRun: Option.getOrUndefined(dryRun),
      provenance: Option.getOrUndefined(provenance),
      packDestination: Option.getOrUndefined(packDestination),
    })
  })).pipe(
    Command.withDescription('Publish effect-harness as an npm package'),
  )

  return Command.make('effect-harness').pipe(
    Command.withDescription('Effect v4 beta harness CLI'),
    Command.withSubcommands([status, verify, providerVerify, sourceVerify, guardrails, updatePin, publish]),
  )
}

export function runCli(config: CliConfig) {
  return makeCli(config).pipe(
    Command.run({ version: config.version }),
    Effect.provide(NodeServices.layer),
  )
}
