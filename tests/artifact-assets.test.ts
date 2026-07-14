import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { managedBundlePaths } from './managed-bundle.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

it.effect('declares only coherent Artifact distribution roots', () => Effect.sync(() => {
  expect(packageJson.files).toEqual(['artifact-assets', 'dist'])
  expect(existsSync(`${root}diagnostics`)).toBe(false)
  expect(existsSync(`${root}prelude-assets`)).toBe(false)
}))

it.effect('ships the Target Adaptation skill in the managed bundle', () => Effect.sync(() => {
  const skillPath = `${root}artifact-assets/effect/managed/skills/adapt-effect-target/SKILL.md`
  expect(existsSync(skillPath)).toBe(true)
  expect(existsSync(`${root}artifact-assets/effect/managed/skills/adapt-effect-target/agents/openai.yaml`)).toBe(true)
  const skill = readFileSync(skillPath, 'utf8')
  expect(skill).toContain('../../data/baseline.json')
  expect(skill).toContain('../../data/tsgo-policy.json')
  expect(skill).toContain('authorization')
  expect(skill).toContain('Control Handoff')
  expect(skill).toContain('actual compiler')
  expect(skill).toContain('durable')
  expect(skill).toContain('Preserve existing suppression')
  expect(skill).toContain('Never add suppression merely to make verification pass')
}))

it.effect('ships complete managed routes to delivered Effect and tsgo evidence', () => Effect.sync(() => {
  const managedDocs = `${root}artifact-assets/effect/managed/docs/`
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

it.effect('preserves the complete managed Target bundle during the asset-root rename', () => Effect.sync(() => {
  for (const path of managedBundlePaths) {
    expect(existsSync(`${root}artifact-assets/effect/managed/${path}`), path).toBe(true)
  }
}))

it.effect('publishes exactly the Prelude and ESLint package interfaces', () => Effect.sync(() => {
  expect(Object.keys(packageJson.exports)).toEqual(['./prelude', './eslint'])
  expect(packageJson.main).toBeUndefined()
  expect(packageJson.types).toBeUndefined()
}))
