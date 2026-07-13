import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

const root = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

it.effect('declares and retains Artifact-internal source diagnostics for packing', () => Effect.sync(() => {
  expect(packageJson.files).toEqual(expect.arrayContaining([
    'diagnostics',
    'repos/effect',
    'repos/tsgo',
    'repos/effect.subtree.json',
    'repos/tsgo.subtree.json',
  ]))
  expect(existsSync(`${root}repos/effect/LLMS.md`)).toBe(true)
  expect(existsSync(`${root}repos/tsgo/README.md`)).toBe(true)
  expect(existsSync(`${root}repos/effect.subtree.json`)).toBe(true)
  expect(existsSync(`${root}repos/tsgo.subtree.json`)).toBe(true)
  expect(existsSync(`${root}diagnostics/index.md`)).toBe(true)

  const diagnosticsIndex = readFileSync(`${root}diagnostics/index.md`, 'utf8')
  expect(diagnosticsIndex).toContain('Integration Workspace `managed/**`')
  expect(diagnosticsIndex).not.toContain('`effect/managed/**`')
}))

it.effect('ships the Target Adaptation skill in the managed bundle', () => Effect.sync(() => {
  const skillPath = `${root}prelude-assets/effect/managed/skills/adapt-effect-target/SKILL.md`
  expect(existsSync(skillPath)).toBe(true)
  expect(existsSync(`${root}prelude-assets/effect/managed/skills/adapt-effect-target/agents/openai.yaml`)).toBe(true)
  const skill = readFileSync(skillPath, 'utf8')
  expect(skill).toContain('`@effect-diagnostics` suppression directives')
  expect(skill).toContain('local `overrides` or lowered')
}))

it.effect('ships complete managed routes to delivered Effect and tsgo evidence', () => Effect.sync(() => {
  const managedDocs = `${root}prelude-assets/effect/managed/docs/`
  for (const route of [
    'diagnostic-layers.md',
    'effect-source.md',
    'feedback-loop.md',
    'tsgo-source.md',
  ]) {
    expect(existsSync(`${managedDocs}${route}`), route).toBe(true)
  }

  const index = readFileSync(`${managedDocs}index.md`, 'utf8')
  const sourceIdentity = readFileSync(`${managedDocs}source-identity.md`, 'utf8')
  expect(index).toContain('skills/adapt-effect-target/SKILL.md')
  expect(sourceIdentity).toContain('repos/effect/LLMS.md')
  expect(sourceIdentity).toContain('repos/tsgo/README.md')
  expect(sourceIdentity).toContain('Reference Drift')

  const effectSource = readFileSync(`${managedDocs}effect-source.md`, 'utf8')
  const deliveredRoutes = [...effectSource.matchAll(/`(repos\/effect\/[^`]+)`/gu)]
    .flatMap(match => match[1] === undefined ? [] : [match[1]])
    .filter(route => !route.includes('*'))
  expect(deliveredRoutes.length).toBeGreaterThan(0)
  for (const route of deliveredRoutes) {
    expect(existsSync(`${root}${route}`), `dangling managed route: ${route}`).toBe(true)
  }
}))

it.effect('publishes exactly the Prelude and ESLint package interfaces', () => Effect.sync(() => {
  expect(Object.keys(packageJson.exports)).toEqual(['./prelude', './eslint'])
  expect(packageJson.main).toBeUndefined()
  expect(packageJson.types).toBeUndefined()
}))
