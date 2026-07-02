import { Console, Effect, FileSystem } from 'effect'
import { readJson } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { verifyGuardrails } from '../Guardrails.ts'
import { verifySourcePin } from '../SourcePin.ts'
import { isRecord } from './JsonFields.ts'
import { verifyProviderProfileContract } from './ProviderProfile.ts'
import { verifyTsgoBaseline } from './Tsgo.ts'
import { requiredFeedbackLoopKeywords, verifyStageSpecs } from './VerifyStage.ts'

const removedProviderPaths = [
  '.codex',
  '.effect-harness.json',
  'guide',
  'harness/default-capabilities.md',
  'harness/exposure.md',
  'harness/feedback',
  'harness/official-inventory.md',
  'harness/provider',
  'harness/runtime',
  'harness/target-agent-contract.md',
] as const

function decodeJsonRecord(value: unknown, source: string): Effect.Effect<Record<string, unknown>, HarnessError> {
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must be a JSON object` }))
}

const readForbiddenSelfMaterializationSurfaces = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const providerProfile = yield* readJson(`${harness}/provider/effect-harness.provider.json`, decodeJsonRecord)
  const selfConformance = providerProfile.selfConformance
  if (!isRecord(selfConformance)) {
    errors.push('provider profile.selfConformance must be an object.')
    return []
  }

  const forbiddenSurfaces = selfConformance.forbiddenProviderRepositorySurfaces
  if (!Array.isArray(forbiddenSurfaces)) {
    errors.push('provider profile.selfConformance.forbiddenProviderRepositorySurfaces must be an array.')
    return []
  }

  const strings: Array<string> = []
  for (const surface of forbiddenSurfaces) {
    if (typeof surface === 'string') {
      strings.push(surface)
    }
    else {
      errors.push('provider profile.selfConformance.forbiddenProviderRepositorySurfaces must contain only strings.')
    }
  }
  return strings
})

const assertNoLegacyProviderState = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem
  for (const path of removedProviderPaths) {
    if (yield* fs.exists(`${harness}/${path}`)) {
      errors.push(`${path} does not belong to the current provider baseline.`)
    }
  }
})

const assertNoSelfMaterializedTargetState = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem
  const forbiddenSurfaces = yield* readForbiddenSelfMaterializationSurfaces(errors, harness)
  for (const surface of forbiddenSurfaces) {
    if (yield* fs.exists(`${harness}/${surface}`)) {
      errors.push(`${surface} is a Prelude target surface; effect-harness self-conformance must not materialize target lifecycle state.`)
    }
  }
})

const assertFeedbackLoopDocument = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem
  const feedbackLoopPath = `${harness}/harness/feedback-loop.md`
  const agentsPath = `${harness}/AGENTS.md`
  const packageJsonPath = `${harness}/package.json`

  if (!(yield* fs.exists(feedbackLoopPath))) {
    errors.push('harness/feedback-loop.md must exist.')
    return
  }

  const feedbackLoopText = yield* fs.readFileString(feedbackLoopPath)
  for (const keyword of requiredFeedbackLoopKeywords) {
    if (!feedbackLoopText.includes(keyword)) {
      errors.push(`harness/feedback-loop.md must contain ${keyword}.`)
    }
  }
  for (const spec of verifyStageSpecs) {
    if (!feedbackLoopText.includes(spec.tag)) {
      errors.push(`harness/feedback-loop.md must document verify stage ${spec.tag}.`)
    }
    if (!feedbackLoopText.includes(spec.summary)) {
      errors.push(`harness/feedback-loop.md must include summary for ${spec.tag}.`)
    }
    if (!feedbackLoopText.includes(spec.routeHint)) {
      errors.push(`harness/feedback-loop.md must include route hint for ${spec.tag}.`)
    }
    for (const route of spec.routes) {
      if (!feedbackLoopText.includes(route)) {
        errors.push(`harness/feedback-loop.md must include route ${route} for ${spec.tag}.`)
      }
    }
  }

  const agentsText = yield* fs.readFileString(agentsPath)
  if (!agentsText.includes('harness/feedback-loop.md')) {
    errors.push('AGENTS.md must route Codex through harness/feedback-loop.md.')
  }

  const packageJsonText = yield* fs.readFileString(packageJsonPath)
  if (!packageJsonText.includes('"verify": "node bin/effect-harness.ts verify --harness ."')) {
    errors.push('package.json scripts.verify must call effect-harness verify --harness .')
  }
})

export const verifyHarnessContract = Effect.fnUntraced(function* (harness: string) {
  const errors: Array<string> = []

  yield* verifyProviderProfileContract(errors, harness)
  yield* verifyTsgoBaseline(errors, harness)
  yield* assertNoLegacyProviderState(errors, harness)
  yield* assertNoSelfMaterializedTargetState(errors, harness)
  yield* assertFeedbackLoopDocument(errors, harness)
  yield* verifyGuardrails({
    root: harness,
    includes: ['bin', 'src', 'tests'],
  })

  if (errors.length > 0) {
    return yield* new HarnessError({ message: `Effect provider verification failed:\n- ${errors.join('\n- ')}` })
  }

  yield* Console.log('Effect provider repository verified.')
})

export const verifyProviderRepository = Effect.fnUntraced(function* (harness: string) {
  yield* verifySourcePin(harness)
  yield* verifyHarnessContract(harness)
})
