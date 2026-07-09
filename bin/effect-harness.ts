#!/usr/bin/env node

import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { Effect, Layer } from 'effect'
import { runCli } from '../src/cli/Main.ts'
import { errorMessage } from '../src/harness/Errors.ts'
import { resolvePackageArtifactRoot } from '../src/harness/ProviderDiscovery.ts'

const harnessRoot = resolvePackageArtifactRoot(fileURLToPath(import.meta.url))

NodeRuntime.runMain(runCli({
  harnessRoot,
  version: '0.0.0',
}).pipe(withNodeServices))

function withNodeServices<E>(
  effect: Effect.Effect<void, E, NodeServices.NodeServices>,
): Effect.Effect<void, never> {
  return Effect.scoped(Effect.gen(function* () {
    const context = yield* Layer.build(NodeServices.layer)
    return yield* Effect.promise(() => Effect.runPromiseWith(context)(effect.pipe(
      Effect.catch((error: unknown) =>
        Effect.andThen(
          Effect.logError(errorMessage(error)),
          Effect.sync(() => {
            process.exitCode = 1
          }),
        )),
    )))
  }))
}
