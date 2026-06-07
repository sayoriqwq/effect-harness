#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Effect from 'effect/Effect'
import { runCli } from '../src/cli/Main.ts'
import { errorMessage } from '../src/harness/Errors.ts'

const harnessRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const packageVersion = readPackageVersion(new URL('../package.json', import.meta.url))

runCli({
  harnessRoot,
  version: packageVersion,
}).pipe(
  Effect.catchTag(['HarnessError', 'ProcessError'], error =>
    Effect.sync(() => {
      console.error(errorMessage(error))
      process.exitCode = 1
    })),
  NodeRuntime.runMain,
)

function readPackageVersion(packageJsonUrl: URL) {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8'))
    return packageJson.version ?? '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}
