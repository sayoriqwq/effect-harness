import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'

it.effect('packs only the supported Artifact surface', () => Effect.sync(() => {
  const root = process.cwd()
  const packDirectory = mkdtempSync(join(tmpdir(), 'effect-harness-pack-'))

  try {
    run('pnpm', ['pack', '--pack-destination', packDirectory], root)
    const tarballs = readdirSync(packDirectory).filter(path => path.endsWith('.tgz'))
    expect(tarballs).toHaveLength(1)
    const tarball = join(packDirectory, tarballs[0] ?? '')
    const entries = new Set(run('tar', ['-tf', tarball], root).split('\n').filter(Boolean))
    const packageJson = JSON.parse(run('tar', ['-xOf', tarball, 'package/package.json'], root))
    const prelude = run('tar', ['-xOf', tarball, 'package/dist/prelude.js'], root)

    expect(Object.keys(packageJson.exports)).toEqual(['./prelude', './eslint'])
    expect(packageJson.dependencies?.['@sayoriqwq/prelude-contract']).toBe('0.2.0')
    expect(packageJson.dependencies?.['@effect/platform-node']).toBeUndefined()
    for (const path of [
      'package/dist/prelude.js',
      'package/dist/prelude.d.ts',
      'package/dist/eslint.js',
      'package/dist/eslint.d.ts',
      'package/prelude-assets/effect/reference-archives/effect.pta',
      'package/prelude-assets/effect/reference-archives/effect.json',
      'package/dist/reference-archives/tsgo.pta',
      'package/prelude-assets/effect/managed/skills/adapt-effect-target/SKILL.md',
      'package/repos/effect/LLMS.md',
      'package/repos/tsgo/README.md',
      'package/repos/effect.subtree.json',
      'package/repos/tsgo.subtree.json',
    ]) {
      expect(entries.has(path), `packed Artifact is missing ${path}`).toBe(true)
    }

    expect([...entries].every(path => !path.startsWith('package/vendor/'))).toBe(true)
    expect([...entries].every(path => !path.startsWith('package/scripts/'))).toBe(true)
    expect([...entries].every(path => !path.startsWith('package/prelude-assets/guidance/'))).toBe(true)
    expect([...entries].every(path => path !== 'package/dist/index.js' && path !== 'package/dist/index.d.ts')).toBe(true)
    expect([...entries].every(path => path !== 'package/repos/tsgo/typescript-go' && !path.startsWith('package/repos/tsgo/typescript-go/'))).toBe(true)
    expect(prelude).toContain('archive:')
    expect(prelude).not.toContain('closure:')
  }
  finally {
    rmSync(packDirectory, { recursive: true, force: true })
  }
}), 120_000)

function run(command: string, arguments_: ReadonlyArray<string>, cwd: string): string {
  const result = spawnSync(command, arguments_, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
  })
  if (result.status !== 0)
    throw new Error(`${command} ${arguments_.join(' ')} failed:\n${result.stderr || result.stdout}`)
  return result.stdout.trim()
}
