import { readdirSync } from 'node:fs'
import { relative, resolve } from 'node:path'

import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import * as TypeScript from 'typescript'

const root = resolve(import.meta.dirname, '..')

it.effect('typechecks every file inside stable source, test, and tooling boundaries', () => Effect.sync(() => {
  const boundaries = [
    { config: 'tsconfig.build.json', files: filesUnder('src') },
    { config: 'tsconfig.tests.json', files: filesUnder('tests') },
    {
      config: 'tsconfig.tooling.json',
      files: rootConfigFiles(),
    },
  ] as const

  for (const boundary of boundaries) {
    const projectFiles = parsedProjectFiles(boundary.config)
    for (const file of boundary.files) {
      expect(projectFiles, `${file} is outside ${boundary.config}`).toContain(file)
    }
  }
}))

it.effect('runs the complete graph and keeps focused entry points', () => Effect.sync(() => {
  const manifest = TypeScript.sys.readFile(resolve(root, 'package.json'))
  if (manifest === undefined)
    throw new Error('package.json is absent')

  const { scripts } = JSON.parse(manifest) as { scripts: Readonly<Record<string, string>> }

  expect(scripts).toMatchObject({
    'acceptance:cross-repo': 'node --experimental-strip-types tests/acceptance/cross-repo.ts',
    'test': 'vitest run',
    'test:focused': 'vitest run',
    'typecheck': 'pnpm typecheck:source && pnpm typecheck:tests && pnpm typecheck:tooling',
    'typecheck:source': 'tsc --noEmit -p tsconfig.build.json',
    'typecheck:tests': 'tsc6 --noEmit -p tsconfig.tests.json',
    'typecheck:tooling': 'tsc6 --noEmit -p tsconfig.tooling.json',
    'source-pins:check-clean': 'git diff --exit-code HEAD -- artifact-assets/effect/reference-archives/effect.pta artifact-assets/effect/reference-archives/effect.json artifact-assets/effect/reference-archives/tsgo.pta artifact-assets/effect/reference-archives/tsgo.json',
    'verify': 'pnpm build && pnpm source-pins:check-clean && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0 && pnpm knip',
  })

  const vitestConfig = TypeScript.sys.readFile(resolve(root, 'vitest.config.ts'))
  expect(vitestConfig).toContain('include: [\'tests/**/*.test.ts\']')

  const tests = filesUnder('tests').filter(file => file.endsWith('.test.ts'))
  expect(tests).toEqual(expect.arrayContaining([
    'tests/accepted-baseline.test.ts',
    'tests/baseline-conformance.test.ts',
    'tests/eslint-policy.test.ts',
    'tests/packed-package.test.ts',
  ]))
}))

function parsedProjectFiles(configName: string): ReadonlyArray<string> {
  const configPath = resolve(root, configName)
  const result = TypeScript.readConfigFile(configPath, TypeScript.sys.readFile)
  if (result.error !== undefined)
    throw new Error(TypeScript.flattenDiagnosticMessageText(result.error.messageText, '\n'))

  return TypeScript.parseJsonConfigFileContent(result.config, TypeScript.sys, root, undefined, configPath)
    .fileNames
    .map(file => relative(root, file))
}

function filesUnder(directory: string): ReadonlyArray<string> {
  const absolute = resolve(root, directory)
  if (TypeScript.sys.directoryExists(absolute) === false)
    return []

  return readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
    .map(entry => relative(root, resolve(entry.parentPath, entry.name)))
    .sort()
}

function rootConfigFiles(): ReadonlyArray<string> {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.config.ts'))
    .map(entry => entry.name)
    .sort()
}
