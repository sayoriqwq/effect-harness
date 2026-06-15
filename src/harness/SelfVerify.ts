import * as Effect from 'effect/Effect'
import { verifyCraftSkills } from './CraftSkills.ts'
import { HarnessError } from './Errors.ts'
import { verifyGuardrails } from './Guardrails.ts'
import { verifySourcePin } from './SourcePin.ts'
import { assertEffectVitestTests } from './TestContract.ts'

export const verifyHarness = Effect.fnUntraced(function* (harness: string) {
  const errors: Array<string> = []
  yield* verifySourcePin(harness)
  yield* verifyCraftSkills({ harness })
  yield* verifyGuardrails({
    root: harness,
    includes: ['bin', 'src', 'scripts', 'tests'],
  })
  yield* assertEffectVitestTests(errors, harness, ['tests'], { requireEffectApi: true })
  if (errors.length > 0) {
    return yield* new HarnessError({ message: `Effect harness self verification failed:\n- ${errors.join('\n- ')}` })
  }
})
