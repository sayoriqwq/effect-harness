#!/usr/bin/env node

import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import { runCli } from '../src/cli/Main.ts'
import { errorMessage } from '../src/harness/Errors.ts'

const harnessRoot = dirname(dirname(fileURLToPath(import.meta.url)))

runCli({
  harnessRoot,
  version: '0.0.0',
}).pipe(
  Effect.catchTag(['HarnessError', 'ProcessError'], error =>
    Console.error(errorMessage(error)).pipe(
      Effect.andThen(Effect.sync(() => {
        process.exitCode = 1
      })),
    )),
  NodeRuntime.runMain,
)
