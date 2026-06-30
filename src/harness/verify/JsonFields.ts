import * as Effect from 'effect/Effect'
import { HarnessError } from '../Errors.ts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function decodeStringField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<string, HarnessError> {
  const value = record[key]
  return typeof value === 'string'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain string field: ${key}` }))
}

export function decodeNumberField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<number, HarnessError> {
  const value = record[key]
  return typeof value === 'number'
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain number field: ${key}` }))
}

export function decodeRecordField(record: Record<string, unknown>, key: string, source: string): Effect.Effect<Record<string, unknown>, HarnessError> {
  const value = record[key]
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source} must contain object field: ${key}` }))
}

export function decodeOptionalRecordField(
  record: Record<string, unknown>,
  key: string,
  source: string,
): Effect.Effect<Record<string, unknown> | undefined, HarnessError> {
  const value = record[key]
  if (value === undefined) {
    return Effect.sync((): Record<string, unknown> | undefined => undefined)
  }
  return isRecord(value)
    ? Effect.succeed(value)
    : Effect.fail(new HarnessError({ message: `${source}.${key} must be an object when present` }))
}

export function decodeStringArrayField(
  record: Record<string, unknown>,
  key: string,
  source: string,
): Effect.Effect<ReadonlyArray<string>, HarnessError> {
  const value = record[key]
  if (!Array.isArray(value)) {
    return Effect.fail(new HarnessError({ message: `${source} must contain array field: ${key}` }))
  }
  const result: Array<string> = []
  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'string') {
      return Effect.fail(new HarnessError({ message: `${source}.${key}[${index}] must be a string` }))
    }
    result.push(entry)
  }
  return Effect.succeed(result)
}

export function optionalStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}
