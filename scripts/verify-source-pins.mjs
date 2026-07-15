import { execFileSync } from 'node:child_process'
import { deepEqual } from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const partita = resolve(root, 'node_modules/.bin/partita')
const pins = [
  { name: 'effect', prefix: 'repos/effect' },
  { name: 'tsgo', prefix: 'repos/tsgo' },
]

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit' })
}

for (const pin of pins) {
  run(partita, [
    'pin', 'verify',
    '--root', root,
    '--name', pin.name,
    '--prefix', pin.prefix,
    '--contract', `${pin.prefix}.subtree.json`,
  ], root)

  const temporaryRoot = mkdtempSync(join(tmpdir(), 'effect-harness-source-pins-'))
  try {
    const clone = join(temporaryRoot, 'repo')
    run('git', ['clone', '--local', '--no-hardlinks', '--no-checkout', root, clone], root)
    run('git', ['-C', clone, 'checkout', '--quiet', '--detach', 'HEAD'], root)

    const outputDirectory = join(clone, '.source-pin-verification')
    const archive = `.source-pin-verification/${pin.name}.pta`
    const provenance = `.source-pin-verification/${pin.name}.json`
    run(partita, [
      'pin', 'publish',
      '--root', clone,
      '--name', pin.name,
      '--prefix', pin.prefix,
      '--contract', `${pin.prefix}.subtree.json`,
      '--archive', archive,
      '--provenance', provenance,
    ], clone)

    const expectedArchive = resolve(root, `artifact-assets/effect/reference-archives/${pin.name}.pta`)
    const expectedProvenance = resolve(root, `artifact-assets/effect/reference-archives/${pin.name}.json`)
    const actualArchive = join(outputDirectory, `${pin.name}.pta`)
    const actualProvenance = join(outputDirectory, `${pin.name}.json`)
    try {
      deepEqual(readFileSync(actualArchive), readFileSync(expectedArchive))
    } catch {
      throw new Error(`Tracked ${pin.name} Source Pin archive is stale`)
    }
    try {
      deepEqual(readFileSync(actualProvenance), readFileSync(expectedProvenance))
    } catch {
      throw new Error(`Tracked ${pin.name} Source Pin provenance is stale`)
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

run('git', [
  'diff', '--exit-code', 'HEAD', '--',
  'artifact-assets/effect/reference-archives/effect.pta',
  'artifact-assets/effect/reference-archives/effect.json',
  'artifact-assets/effect/reference-archives/tsgo.pta',
  'artifact-assets/effect/reference-archives/tsgo.json',
], root)

console.log('Effect Harness Source Pin publications are current (read-only verification).')
