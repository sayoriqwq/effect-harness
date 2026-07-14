# Effect source route

The delivered `repos/effect/**` tree is the official source snapshot matching
this Harness baseline. Start at `repos/effect/LLMS.md`.

| Intent | Read next |
| --- | --- |
| Public API surface | `repos/effect/packages/effect/src/index.ts`, then the module under `src/` |
| Services and Layers | `repos/effect/ai-docs/src/01_effect/03_services/`, `packages/effect/src/Context.ts`, `Layer.ts` |
| Typed errors | `repos/effect/ai-docs/src/01_effect/04_errors/`, then `Schema.ts`, `Cause.ts`, `Effect.ts` |
| Resources and Scope | `repos/effect/ai-docs/src/01_effect/05_resources/`, then `Scope.ts`, `Resource.ts`, `Layer.ts` |
| Node entry points | `repos/effect/ai-docs/src/01_effect/06_running/`, then `packages/platform-node/src/NodeRuntime.ts` |
| Effect tests | `repos/effect/ai-docs/src/09_testing/`, `packages/vitest/src/`, and the relevant upstream test |
| Stream or Channel | `repos/effect/ai-docs/src/03_stream/`, then `Stream.ts`, `Sink.ts`, or `Channel.ts` |
| Schema and encoding | `repos/effect/packages/effect/src/Schema.ts` and its upstream tests |
| HTTP or HttpApi | `repos/effect/ai-docs/src/50_http-client/` or `51_http-server/`, then `unstable/http*` |
| Node platform integration | `repos/effect/packages/platform-node/src/` and its tests |

Read documentation first, implementation second, and upstream tests for exact
behavior. The source snapshot is evidence, not an application dependency and
not a place for Target patches.
