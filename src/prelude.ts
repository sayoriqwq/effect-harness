import type { ModulePlan } from '@sayoriqwq/prelude-contract'
import {
  defineHarnessModule,
  MODULE_PROTOCOL_V2,
  PRELUDE_V2_SUPPORTED_FEATURES,
} from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { pinnedReferenceOutputs } from './harness/SourcePins.ts'

const routingBlock = `## Effect Harness\n\nFor Effect application, test, package, TypeScript, editor, or lint changes, read the current Effect integration's \`.prelude/**/managed/docs/index.md\` first. Use \`.prelude/**/managed/skills/adapt-effect-target/SKILL.md\` when package selection or target-owned TypeScript topology needs adaptation. Keep \`.prelude/**/feedback/**\` target-owned. Treat \`.prelude/**/repos/**\` as read-only source diagnostics: consult it when installed declarations and managed guidance are insufficient, but never import or edit it.\n`

const stableHarnessOutputs = [
  {
    kind: 'ManagedTree',
    id: 'effect.managed',
    sourceRoot: 'artifact-assets/effect/managed',
    locator: { root: 'IntegrationWorkspace', path: 'managed' },
  },
  {
    kind: 'ManagedBlock',
    id: 'effect.agent-routing',
    locator: { root: 'ControlRoot', path: 'AGENTS.md' },
    blockId: 'effect-harness-routing',
    content: routingBlock,
  },
  ...pinnedReferenceOutputs,
] as const satisfies ModulePlan['outputs']

/**
 * Read-only Effect Harness Module.
 *
 * Prelude converges only stable Harness-owned assets. Repository-specific
 * package, TypeScript, editor, lint, activation, and verification adaptation
 * begins after delivery through the managed Target Adaptation skill.
 */
export const harnessModule = defineHarnessModule({
  descriptor: {
    harnessId: 'effect-harness',
    protocolVersion: MODULE_PROTOCOL_V2,
    requiredFeatures: PRELUDE_V2_SUPPORTED_FEATURES,
  },
  plan: () => Effect.succeed({
    outputs: stableHarnessOutputs,
    requirements: [],
    checks: [],
    issues: [],
  }),
})
