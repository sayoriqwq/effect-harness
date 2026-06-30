import * as Console from 'effect/Console'
import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { HarnessError } from '../Errors.ts'
import { verifyGuardrails } from '../Guardrails.ts'
import { verifySourcePin } from '../SourcePin.ts'
import { verifyProviderProfileContract } from './ProviderProfile.ts'

const legacyProviderPaths = [
  '.codex/skills',
  'guide',
  'harness/default-capabilities.md',
  'harness/exposure.md',
  'harness/feedback',
  'harness/official-inventory.md',
  'harness/runtime',
  'harness/target-agent-contract.md',
] as const

const assertNoLegacyProviderState = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem
  for (const path of legacyProviderPaths) {
    if (yield* fs.exists(`${harness}/${path}`)) {
      errors.push(`${path} is legacy provider state and must not exist in the new baseline.`)
    }
  }
})

export const verifyProviderRepository = Effect.fnUntraced(function* (harness: string) {
  const errors: Array<string> = []

  yield* verifySourcePin(harness)
  yield* verifyProviderProfileContract(errors, harness)
  yield* assertNoLegacyProviderState(errors, harness)
  yield* verifyGuardrails({
    root: harness,
    includes: ['bin', 'src', 'tests'],
  })

  if (errors.length > 0) {
    return yield* new HarnessError({ message: `Effect provider verification failed:\n- ${errors.join('\n- ')}` })
  }

  yield* Console.log('Effect provider repository verified.')
})
