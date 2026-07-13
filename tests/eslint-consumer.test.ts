import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { ESLint } from 'eslint'

import effectHarnessEslintConfig from '../src/eslint.ts'

const artifactRoot = fileURLToPath(new URL('..', import.meta.url))

it.effect('executes an Antfu v9 consumer config with the packaged ESLint export', () =>
  Effect.promise(async () => {
    const consumer = await mkdtemp(join(tmpdir(), 'effect-harness-eslint-consumer-'))
    try {
      const effectHarnessLink = join(consumer, 'node_modules/@sayoriqwq/effect-harness')
      const antfuLink = join(consumer, 'node_modules/@antfu')
      await mkdir(dirname(effectHarnessLink), { recursive: true })
      await mkdir(dirname(antfuLink), { recursive: true })
      await symlink(artifactRoot, effectHarnessLink, 'dir')
      await symlink(join(artifactRoot, 'node_modules/@antfu'), antfuLink, 'dir')
      await writeFile(join(consumer, 'package.json'), '{"type":"module"}\n')
      await writeFile(join(consumer, 'eslint.config.mjs'), [
        'import antfu from \'@antfu/eslint-config\'',
        'import effectHarness from \'@sayoriqwq/effect-harness/eslint\'',
        'export default antfu().append(...effectHarness)',
        '',
      ].join('\n'))
      await writeFile(join(consumer, 'example.js'), 'export const answer = 42\n')

      const results = await new ESLint({ cwd: consumer }).lintFiles(['example.js'])
      expect(results.flatMap(result => result.messages)).toEqual([])
    }
    finally {
      await rm(consumer, { force: true, recursive: true })
    }
  }))

it.effect('does not contradict the supported Effect.ignore tsgo rewrite', () =>
  Effect.promise(async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [...effectHarnessEslintConfig],
    })
    const [result] = await eslint.lintText(
      'import { Effect } from \'effect\'\nexport const ignored = Effect.ignore\n',
      { filePath: 'src/ignore.js' },
    )

    expect(result?.messages).toEqual([])
  }))
