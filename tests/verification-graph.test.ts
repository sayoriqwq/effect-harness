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
    'source-pins:verify': 'node scripts/verify-source-pins.mjs',
    'test': 'vitest run',
    'test:focused': 'vitest run',
    'typecheck': 'pnpm typecheck:source && pnpm typecheck:tests && pnpm typecheck:tooling',
    'typecheck:source': 'tsc --noEmit -p tsconfig.build.json',
    'typecheck:tests': 'tsc6 --noEmit -p tsconfig.tests.json',
    'typecheck:tooling': 'tsc6 --noEmit -p tsconfig.tooling.json',
    'build': 'pnpm source-pins:verify && tsdown --config tsdown.config.ts',
    'verify': 'pnpm build && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0 && pnpm knip',
  })

  for (const command of [scripts.build, scripts.verify]) {
    expect(command).not.toMatch(/publish|apply|install|prepare|fix|migrate|suppress|\bCI\b/u)
  }

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

it.effect('checks source-pin freshness through an isolated read-only publication route', () => Effect.sync(() => {
  const verifier = TypeScript.sys.readFile(resolve(root, 'scripts/verify-source-pins.mjs'))
  if (verifier === undefined)
    throw new Error('source-pin verifier is absent')

  expect(verifier).toContain("'pin', 'publish'")
  expect(verifier).toContain("run('git', ['clone'")
  expect(verifier).toContain('mkdtempSync')
  expect(verifier).toContain('finally')
  expect(verifier).toContain('deepEqual')
  expect(verifier).not.toContain('source-pins:publish')
}))

it.effect('does not report packed PREPARE as a false green acceptance', () => Effect.sync(() => {
  const acceptance = TypeScript.sys.readFile(resolve(root, 'tests/acceptance/cross-repo.ts'))
  if (acceptance === undefined)
    throw new Error('cross-repository acceptance runner is absent')

  expect(acceptance).toContain('CROSS_REPO_PHASE')
  expect(acceptance).toContain('CROSS_REPO_ROOT')
  expect(acceptance).toContain('CROSS_REPO_APPROVALS')
  expect(acceptance).toContain('PREPARE complete; awaiting exact approval.')
  expect(acceptance).toContain('passed after exact approval.')
  expect(acceptance).toContain('Partita aggregate verify should remain red while Integration is unconverged')
}))

it.effect('pins the released cross-repository Baseline and gates npm publish on packed acceptance', () => Effect.sync(() => {
  const workspace = TypeScript.sys.readFile(resolve(root, 'pnpm-workspace.yaml'))
  const workflow = TypeScript.sys.readFile(resolve(root, '.github/workflows/npm-publish.yml'))
  if (workspace === undefined || workflow === undefined)
    throw new Error('release Baseline inputs are absent')

  expect(workspace).toContain('\'@sayoriqwq/partita\': 0.2.2')
  expect(workspace).toContain('\'@sayoriqwq/prelude-contract\': 0.2.2')
  expect(workflow).toContain('repository: yume-infra/prelude')
  expect(workflow).toContain('ref: 071e317697684dd26922d79ee47cbd9d9878069a')
  expect(workflow).toContain('repository: sayoriqwq/partita')
  expect(workflow).toContain('ref: df7b400b5d4c2fc21175d450a589f153be401485')
  expect(workflow).toContain('npm view "$package_spec" version')
  expect(workflow).toContain('run: pnpm acceptance:cross-repo')
  expect(workflow.indexOf('run: pnpm acceptance:cross-repo')).toBeLessThan(workflow.indexOf('run: npm publish'))
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
