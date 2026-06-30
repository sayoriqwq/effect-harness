import { isRecord } from './JsonFields.ts'

function unescapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/gu, '/').replace(/~0/gu, '~')
}

export function valueAtJsonPointer(value: unknown, pointer: string): unknown {
  if (pointer === '') {
    return value
  }
  if (!pointer.startsWith('/')) {
    return undefined
  }
  let current = value
  for (const rawSegment of pointer.slice(1).split('/')) {
    const segment = unescapeJsonPointerSegment(rawSegment)
    if (Array.isArray(current)) {
      const index = Number(segment)
      current = Number.isInteger(index) ? current[index] : undefined
      continue
    }
    if (isRecord(current)) {
      current = current[segment]
      continue
    }
    return undefined
  }
  return current
}

export function decodeSnapshot(snapshot: string): unknown {
  try {
    return JSON.parse(snapshot) as unknown
  }
  catch {
    return snapshot
  }
}

export function sameJsonValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
