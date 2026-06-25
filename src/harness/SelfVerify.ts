import * as Effect from 'effect/Effect'
import * as FileSystem from 'effect/FileSystem'
import { verifyCodexSkillProjections } from './CodexSkillProjections.ts'
import { HarnessError } from './Errors.ts'
import { verifyGuardrails } from './Guardrails.ts'
import { verifySourcePin } from './SourcePin.ts'
import { assertEffectVitestTests } from './TestContract.ts'

const runtimeSkillFiles = [
  'harness/runtime/codex/skills/effect-code/SKILL.md',
  'harness/runtime/codex/skills/effect-feedback/SKILL.md',
] as const

const requiredSkillSections = [
  '## Capability',
  '## Trigger',
  '## Soft Boundary',
  '## Hard Boundary',
  '## Workflow',
  '## Validation',
] as const

const verifyRuntimeSkillShape = Effect.fnUntraced(function* (errors: Array<string>, harness: string) {
  const fs = yield* FileSystem.FileSystem

  for (const file of runtimeSkillFiles) {
    const text = yield* fs.readFileString(`${harness}/${file}`)
    for (const section of requiredSkillSections) {
      if (!text.includes(section)) {
        errors.push(`${file} is missing Codex skill section: ${section}`)
      }
    }
    const unsupportedFields = frontmatterFields(text).filter(field => field !== 'name' && field !== 'description')
    if (unsupportedFields.length > 0) {
      errors.push(`${file} must use only Codex-supported skill frontmatter: name and description.`)
    }
  }

  const agentsFragment = yield* fs.readFileString(`${harness}/harness/runtime/codex/AGENTS.fragment.md`)
  if (!agentsFragment.includes('.codex/agents/effect-worker.md')) {
    errors.push('harness/runtime/codex/AGENTS.fragment.md must route Effect subagent work to .codex/agents/effect-worker.md')
  }

  const effectCodeSkill = yield* fs.readFileString(`${harness}/harness/runtime/codex/skills/effect-code/SKILL.md`)
  if (!effectCodeSkill.includes('.codex/agents/effect-worker.md')) {
    errors.push('effect-code runtime skill must instruct delegated Effect subagents to use .codex/agents/effect-worker.md')
  }
})

function frontmatterFields(text: string): ReadonlyArray<string> {
  const lines = text.split(/\r?\n/u)
  if (lines[0] !== '---') {
    return []
  }
  const end = lines.indexOf('---', 1)
  if (end === -1) {
    return []
  }
  return lines.slice(1, end).flatMap((line) => {
    const separator = line.indexOf(':')
    if (separator === -1) {
      return []
    }
    return [line.slice(0, separator).trim()]
  })
}

export const verifyHarness = Effect.fnUntraced(function* (harness: string) {
  const errors: Array<string> = []
  yield* verifySourcePin(harness)
  yield* verifyCodexSkillProjections({ harness })
  yield* verifyGuardrails({
    root: harness,
    includes: ['bin', 'src', 'scripts', 'tests'],
  })
  yield* assertEffectVitestTests(errors, harness, ['tests'], { requireEffectApi: true })
  yield* verifyRuntimeSkillShape(errors, harness)
  if (errors.length > 0) {
    return yield* new HarnessError({ message: `Effect harness self verification failed:\n- ${errors.join('\n- ')}` })
  }
})
