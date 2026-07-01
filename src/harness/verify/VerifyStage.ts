import { Data, Schema } from 'effect'

export interface VerifyStageSpec {
  readonly tag: VerifyStageTag
  readonly title: string
  readonly routes: ReadonlyArray<string>
  readonly summary: string
  readonly routeHint: string
}

const VerifyStageTagSchema = Schema.Literals([
  'source-pins',
  'harness-contract',
  'tsgo-diagnostics',
  'tests',
  'lint',
  'knip',
] as const)

export type VerifyStageTag = typeof VerifyStageTagSchema.Type
const isVerifyStageTag = Schema.is(VerifyStageTagSchema)

export const verifyStageSpecs = [
  {
    tag: 'source-pins',
    title: 'Source Pins',
    routes: ['harness/source.md'],
    summary: 'Verify pinned GitHub subtree source entries.',
    routeHint: 'Read the source-entry contract and fix Partita source pin drift.',
  },
  {
    tag: 'harness-contract',
    title: 'Harness Contract',
    routes: ['harness/index.md', 'harness/offcial-migrate.md', 'harness/feedback-loop.md'],
    summary: 'Verify the provider repository contract and current harness baseline.',
    routeHint: 'Read the harness index, migrate notes, and feedback loop contract before changing verifier behavior.',
  },
  {
    tag: 'tsgo-diagnostics',
    title: 'Tsgo Diagnostics',
    routes: ['harness/tsgo.md', 'harness/tsgo-routes.md'],
    summary: 'Run tsgo --noEmit and enforce zero Effect diagnostics.',
    routeHint: 'Use the tsgo diagnostic output first; read the tsgo policy and routes only when the diagnostic is not enough.',
  },
  {
    tag: 'tests',
    title: 'Tests',
    routes: ['harness/effect-routes.md'],
    summary: 'Run the Effect test suite.',
    routeHint: 'Read the Effect testing route and fix behavior through @effect/vitest patterns.',
  },
  {
    tag: 'lint',
    title: 'Lint',
    routes: ['harness/diagnostic-layers.md', 'AGENTS.md', 'eslint.config.mjs'],
    summary: 'Run ESLint with zero warnings.',
    routeHint: 'Read the diagnostic layering contract, agent rules, and lint config, then fix repository boundary violations without duplicating tsgo semantics.',
  },
  {
    tag: 'knip',
    title: 'Knip',
    routes: ['package.json'],
    summary: 'Run knip and keep the package surface minimal.',
    routeHint: 'Read package.json and source imports/exports, then remove unused package surface.',
  },
] as const satisfies ReadonlyArray<VerifyStageSpec>

export const requiredFeedbackLoopKeywords = [
  'BASELINE',
  'ROUTE_TABLE',
  'VERIFY_PIPELINE',
  ...verifyStageSpecs.map(spec => stageKeyword(spec.tag)),
  'DONE',
] as const

export class VerifyStageFailed extends Data.TaggedError('@sayoriqwq/effect-harness/harness/verify/VerifyStage/VerifyStageFailed')<{
  readonly causeMessage: string
  readonly routeHint: string
  readonly routes: ReadonlyArray<string>
  readonly stageTag: VerifyStageTag
  readonly stageTitle: string
}> {
  override get message(): string {
    return [
      `verify failed at ${this.stageTag} (${this.stageTitle})`,
      '',
      'route:',
      ...this.routes.map(route => `- ${route}`),
      '',
      'next:',
      this.routeHint,
      '',
      'cause:',
      this.causeMessage,
    ].join('\n')
  }
}

function stageKeyword(tag: VerifyStageTag): string {
  return `STAGE_${tag.replaceAll('-', '_').toUpperCase()}`
}

export function stageSpecByTag(tag: VerifyStageTag): VerifyStageSpec {
  const verifiedTag = isVerifyStageTag(tag) ? tag : 'source-pins'
  return verifyStageSpecs.find(spec => spec.tag === verifiedTag)!
}
