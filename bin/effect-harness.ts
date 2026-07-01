#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as NodeRuntime from '@effect/platform-node/NodeRuntime'
import * as Effect from 'effect/Effect'
import { runCli } from '../src/cli/Main.ts'
import { errorMessage } from '../src/harness/Errors.ts'

const harnessRoot = resolveHarnessRoot(fileURLToPath(import.meta.url))
const packageVersion = readPackageVersion(join(harnessRoot, 'package.json'))

NodeRuntime.runMain(runCli({
  harnessRoot,
  version: packageVersion,
}).pipe(
  Effect.catchTag(['HarnessError', 'ProcessError'], error =>
    Effect.sync(() => {
      console.error(errorMessage(error))
      process.exitCode = 1
    })),
))

function resolveHarnessRoot(entrypoint: string) {
  const candidate = dirname(dirname(entrypoint))
  if (existsSync(join(candidate, 'repos/effect.subtree.json'))) {
    return candidate
  }

  const packageRoot = dirname(candidate)
  if (existsSync(join(packageRoot, 'repos/effect.subtree.json'))) {
    return packageRoot
  }

  return candidate
}

function readPackageVersion(packageJsonPath: string) {
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    return packageJson.version ?? '0.0.0'
  }
  catch {
    return '0.0.0'
  }
}
