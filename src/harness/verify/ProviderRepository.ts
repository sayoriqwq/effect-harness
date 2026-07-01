import { Console, Effect, FileSystem } from 'effect'
import { HarnessError } from '../Errors.ts'
import { verifyGuardrails } from '../Guardrails.ts'
import { verifySourcePin } from '../SourcePin.ts'
import { verifyProviderProfileContract } from './ProviderProfile.ts'
import { verifyTsgoBaseline } from './Tsgo.ts'

const removedProviderPaths = [
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
  for (const path of removedProviderPaths) {
    if (yield* fs.exists(`${harness}/${path}`)) {
      errors.push(`${path} does not belong to the current provider baseline.`)
    }
  }
})

export const verifyProviderRepository = Effect.fnUntraced(function* (harness: string) {
  const errors: Array<string> = []

  yield* verifySourcePin(harness)
  yield* verifyProviderProfileContract(errors, harness)
  yield* verifyTsgoBaseline(errors, harness)
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
