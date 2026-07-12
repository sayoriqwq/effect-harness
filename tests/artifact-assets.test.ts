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
}))
