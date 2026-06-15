import { HarnessError } from './Errors.ts'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function yamlKey(name: string): string {
  return name.startsWith('@') ? `'${name}'` : name
}

export function catalogVersion(text: string, name: string): string | undefined {
  const match = text.match(new RegExp(`^\\s*${escapeRegex(yamlKey(name))}:\\s*([^\\s#]+).*$`, 'mu'))
  return match?.[1]
}

export function replaceCatalogVersion(text: string, name: string, version: string): string {
  let matched = false
  const next = text.replace(
    new RegExp(`^(\\s*${escapeRegex(yamlKey(name))}:\\s*).*$`, 'mu'),
    (_line, prefix: string) => {
      matched = true
      return `${prefix}${version}`
    },
  )

  if (!matched) {
    throw new HarnessError({ message: `Cannot update pnpm-workspace.yaml; missing catalog entry for ${name}.` })
  }

  return next
}
