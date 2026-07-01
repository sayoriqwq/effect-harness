import type { TsgoDiagnosticSeverity } from './TsgoPolicy.ts'
import { Effect } from 'effect'
import { readJson } from '../../platform/Json.ts'
import { HarnessError } from '../Errors.ts'
import { isRecord } from './JsonFields.ts'

interface TsgoRuleMetadata {
  readonly name: string
  readonly group: string
  readonly defaultSeverity: string
  readonly supportedEffect: ReadonlyArray<string>
}

function decodeTsgoMetadata(value: unknown, source: string) {
  if (!isRecord(value) || !Array.isArray(value.rules)) {
    return Effect.fail(new HarnessError({ message: `${source} must contain a rules array.` }))
  }

  const rules: Array<TsgoRuleMetadata> = []
  for (const [index, rule] of value.rules.entries()) {
    if (!isRecord(rule)) {
      return Effect.fail(new HarnessError({ message: `${source}.rules[${index}] must be an object.` }))
    }
    if (
      typeof rule.name !== 'string'
      || typeof rule.group !== 'string'
      || typeof rule.defaultSeverity !== 'string'
      || !Array.isArray(rule.supportedEffect)
      || rule.supportedEffect.some(effect => typeof effect !== 'string')
    ) {
      return Effect.fail(new HarnessError({ message: `${source}.rules[${index}] has an invalid rule shape.` }))
    }

    rules.push({
      defaultSeverity: rule.defaultSeverity,
      group: rule.group,
      name: rule.name,
      supportedEffect: rule.supportedEffect as ReadonlyArray<string>,
    })
  }

  return Effect.succeed({ rules })
}

function strictSeverity(rule: TsgoRuleMetadata): TsgoDiagnosticSeverity {
  if (rule.group === 'correctness' && rule.defaultSeverity === 'off') {
    return 'error'
  }
  if (rule.group === 'effectNative') {
    return 'warning'
  }
  if ((rule.group === 'antipattern' || rule.group === 'style') && rule.defaultSeverity === 'off') {
    return 'warning'
  }
  return rule.defaultSeverity as TsgoDiagnosticSeverity
}

export const readTsgoStrictRuleMap = Effect.fnUntraced(function* (root: string) {
  const metadata = yield* readJson(`${root}/repos/tsgo/_packages/tsgo/src/metadata.json`, decodeTsgoMetadata)
  const entries = metadata.rules
    .filter(rule => rule.supportedEffect.includes('v4'))
    .map(rule => [rule.name, strictSeverity(rule)] as const)
    .sort(([left], [right]) => left.localeCompare(right))

  return Object.fromEntries(entries) as Readonly<Record<string, TsgoDiagnosticSeverity>>
})
