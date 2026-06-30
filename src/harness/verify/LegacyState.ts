import type { PackageJson } from '../Model.ts'
import type { LifecycleSurfaceRecord } from './ProviderTypes.ts'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { legacyAgentsEnd, legacyAgentsStart, legacyRuntimePaths } from './ProviderTypes.ts'

const localHarnessDispatcherCommandPattern = /\bscripts\/effect-harness(?:-[\w-]+)?\.(?:cjs|cts|js|mjs|mts|ts)\b/u
const localHarnessDispatcherFilePattern = /^effect-harness(?:-[\w-]+)?\.(?:cjs|cts|js|mjs|mts|ts)$/u

export const assertNoLocalHarnessDispatcher = Effect.fnUntraced(function* (
  errors: Array<string>,
  root: string,
  packageJson: PackageJson,
) {
  const fs = yield* FileSystem.FileSystem
  const scriptEntries = Object.entries(packageJson.scripts ?? {})
  const dispatcherScript = scriptEntries.find(([, command]) =>
    localHarnessDispatcherCommandPattern.test(command),
  )

  if (dispatcherScript) {
    errors.push(`package script ${dispatcherScript[0]} uses a local effect-harness dispatcher; use the published effect-harness CLI or Prelude provider record instead.`)
  }

  const scriptsRoot = `${root}/scripts`
  if (!(yield* fs.exists(scriptsRoot))) {
    return
  }

  const entries = yield* fs.readDirectory(scriptsRoot)
  for (const entry of entries) {
    if (localHarnessDispatcherFilePattern.test(entry)) {
      errors.push(`Target repo must not include scripts/${entry}; effect-harness does not support target-local dispatchers.`)
    }
  }
})

export const assertNoLegacyRuntimeState = Effect.fnUntraced(function* (errors: Array<string>, root: string) {
  const fs = yield* FileSystem.FileSystem
  for (const legacyPath of legacyRuntimePaths) {
    if (yield* fs.exists(`${root}/${legacyPath}`)) {
      errors.push(`${legacyPath} is legacy effect-harness target state; remove it for the source-entry baseline.`)
    }
  }

  const agentsPath = `${root}/AGENTS.md`
  if (!(yield* fs.exists(agentsPath))) {
    return
  }
  const agents = yield* fs.readFileString(agentsPath)
  if (agents.includes(legacyAgentsStart) || agents.includes(legacyAgentsEnd)) {
    errors.push('AGENTS.md contains a legacy effect-harness managed block; remove the block.')
  }
})

export function assertNoLegacyProviderSurface(errors: Array<string>, surface: LifecycleSurfaceRecord): void {
  if (surface.kind === 'managedBlock') {
    errors.push(`provider surface ${surface.id} is a legacy managed block; effect-harness no longer owns target AGENTS.md blocks.`)
  }
  if (surface.path === '.effect-harness.json') {
    errors.push(`provider surface ${surface.id} targets legacy .effect-harness.json state.`)
  }
  if (surface.path.startsWith('.codex/')) {
    errors.push(`provider surface ${surface.id} targets legacy effect-harness .codex runtime state.`)
  }
  if (surface.path === 'AGENTS.md') {
    errors.push(`provider surface ${surface.id} targets legacy effect-harness AGENTS.md state.`)
  }
}
