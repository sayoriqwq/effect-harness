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
