import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assert, it } from '@effect/vitest'
import * as Effect from 'effect/Effect'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(repoRoot, 'bin/effect-harness.ts')

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'effect-harness-guardrails-'))
}

function runGuardrails(root: string) {
  return spawnSync(
    process.execPath,
    [cliPath, 'guardrails', '--target', root],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  )
}

it.effect('guardrails catch aliased Context.Tag and Effect members', () => Effect.sync(() => {
  const root = tempDir()
  const sourceRoot = join(root, 'src')
  mkdirSync(sourceRoot)
  writeFileSync(join(sourceRoot, 'bad.ts'), [
    'import { Tag as ContextTag } from "effect/Context"',
    'import { Effect as Fx } from "effect"',
    '',
    'export class Bad extends ContextTag<Bad>()("Bad") {}',
    'export const ignored = Fx.ignore',
    '',
  ].join('\n'))

  try {
    const result = runGuardrails(root)

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Use Context\.Service/u)
    assert.match(result.stderr, /Do not ignore Effect failures silently/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('guardrails catch namespace aliases and silent error swallowing', () => Effect.sync(() => {
  const root = tempDir()
  const sourceRoot = join(root, 'src')
  mkdirSync(sourceRoot)
  writeFileSync(join(sourceRoot, 'bad.ts'), [
    'import * as EffectLib from "effect"',
    '',
    'export class Bad extends EffectLib.Context.Tag<Bad>()("Bad") {}',
    'export const swallowed = EffectLib.Effect.catchAll(() => EffectLib.Effect.void)',
    '',
  ].join('\n'))

  try {
    const result = runGuardrails(root)

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Use Context\.Service/u)
    assert.match(result.stderr, /Do not silently swallow Effect errors/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('guardrails catch data-first Effect catch handlers that silently swallow errors', () => Effect.sync(() => {
  const root = tempDir()
  const sourceRoot = join(root, 'src')
  mkdirSync(sourceRoot)
  writeFileSync(join(sourceRoot, 'bad.ts'), [
    'import * as Effect from "effect/Effect"',
    '',
    'declare const program: Effect.Effect<string, Error>',
    'export const swallowedAll = Effect.catchAll(program, () => Effect.void)',
    'export const swallowedTag = Effect.catchTag(program, "KnownError", () => Effect.void)',
    '',
  ].join('\n'))

  try {
    const result = runGuardrails(root)

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Do not silently swallow Effect errors/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('guardrails catch assertion-based tsgo suggestion cleanup', () => Effect.sync(() => {
  const root = tempDir()
  const sourceRoot = join(root, 'src')
  mkdirSync(sourceRoot)
  writeFileSync(join(sourceRoot, 'bad.ts'), [
    'import * as Effect from "effect/Effect"',
    '',
    'declare const program: Effect.Effect<ReadonlyArray<string>, Error>',
    'export const fallback = program.pipe(Effect.orElseSucceed(() => [] as ReadonlyArray<string>))',
    'export const lifted = Effect.succeed(null as string | null)',
    'export const decoded = Effect.orElseSucceed(Effect.fail("bad"), () => ({ ok: false as const }))',
    '',
  ].join('\n'))

  try {
    const result = runGuardrails(root)

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Do not silence @effect\/tsgo fallback diagnostics with assertions/u)
    assert.match(result.stderr, /Do not wrap asserted values in Effect\.succeed/u)
    assert.match(result.stderr, /Do not force result discriminants with `as const`/u)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))

it.effect('guardrails catch forbidden imports without matching plain strings', () => Effect.sync(() => {
  const root = tempDir()
  const sourceRoot = join(root, 'src')
  mkdirSync(sourceRoot)
  writeFileSync(join(sourceRoot, 'bad.ts'), [
    'const harmless = "import { Effect } from \\"repos/effect/packages/effect/src/Effect.ts\\""',
    'export const text = "Context.Tag and Effect.ignore are only mentioned here"',
    'export const dynamic = import("../repos/effect/packages/effect/src/Effect.ts")',
    'export const unsupportedCli = require("@effect/cli")',
    '',
  ].join('\n'))

  try {
    const result = runGuardrails(root)

    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Do not import from repos\/effect/u)
    assert.match(result.stderr, /@effect\/cli is not supported/u)
    assert.isFalse(/Use Context\.Service/u.test(result.stderr))
    assert.isFalse(/Do not ignore Effect failures silently/u.test(result.stderr))
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}))
