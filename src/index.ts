import type {
  ProviderDiscovery,
  ProviderDiscoveryFailure,
  ProviderDiscoveryFailureInput,
} from './harness/ProviderDiscovery.ts'
import { fileURLToPath } from 'node:url'
import * as NodeServices from '@effect/platform-node/NodeServices'
import { Effect, Layer } from 'effect'
import {
  classifyProviderDiscoveryFailure,
  discoverProvider,
  resolvePackageArtifactRoot,
} from './harness/ProviderDiscovery.ts'

export type {
  ProviderDiscovery,
  ProviderDiscoveryFailure,
  ProviderDiscoveryFailureInput,
}

export {
  classifyProviderDiscoveryFailure,
  discoverProvider,
  resolvePackageArtifactRoot,
}

export interface DiscoverProviderArtifactOptions {
  readonly artifactRoot?: string
}

export function discoverProviderArtifact(
  options: DiscoverProviderArtifactOptions = {},
): Promise<ProviderDiscovery> {
  const artifactRoot = options.artifactRoot ?? resolvePackageArtifactRoot(fileURLToPath(import.meta.url))
  return runWithNodeServices(discoverProvider(artifactRoot))
}

function runWithNodeServices<A, E>(
  effect: Effect.Effect<A, E, NodeServices.NodeServices>,
): Promise<A> {
  return Effect.runPromise(Effect.scoped(Effect.gen(function* () {
    const context = yield* Layer.build(NodeServices.layer)
    return yield* Effect.promise(() => Effect.runPromiseWith(context)(effect))
  })))
}
