import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, it } from '@effect/vitest'
import { decodeCanonicalTreeArchive, SYMBOLIC_LINK_MODE } from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { pinnedReferenceOutputs } from '../src/harness/SourcePins.ts'

const repositoryRoot = resolve(import.meta.dirname, '..')

it.effect('consumes both Partita publications with Harness delivery policy', () => Effect.sync(() => {
  const publicationRoot = resolve(repositoryRoot, 'prelude-assets/effect/reference-archives')
  const pins = [
    { name: 'effect', id: 'effect.reference.effect', targetPath: 'repos/effect' },
    { name: 'tsgo', id: 'effect.reference.tsgo', targetPath: 'repos/tsgo' },
  ] as const

  for (const pin of pins) {
    const publication = JSON.parse(readFileSync(resolve(publicationRoot, `${pin.name}.json`), 'utf8')) as {
      readonly schemaVersion: number
      readonly name: string
      readonly archive: { readonly format: string }
      readonly provenance: { readonly sourceUrl: string, readonly revision: string, readonly treeDigest: string }
    }
    const archive = decodeCanonicalTreeArchive(readFileSync(resolve(publicationRoot, `${pin.name}.pta`)))
    const output = pinnedReferenceOutputs.find(candidate => candidate.id === pin.id)

    expect(publication).toMatchObject({
      schemaVersion: 1,
      name: pin.name,
      archive: { format: 'prelude-canonical-tree-archive-v1' },
    })
    expect(publication).not.toHaveProperty('locator')
    expect(publication).not.toHaveProperty('route')
    expect(publication).not.toHaveProperty('anchor')
    expect(publication).not.toHaveProperty('referenceOnly')
    expect(archive.treeDigest).toBe(publication.provenance.treeDigest)
    expect(output).toEqual({
      kind: 'PinnedReferenceTree',
      id: pin.id,
      archive: {
        path: `prelude-assets/effect/reference-archives/${pin.name}.pta`,
        format: publication.archive.format,
      },
      locator: { root: 'IntegrationWorkspace', path: pin.targetPath },
      provenance: publication.provenance,
      referenceOnly: true,
    })

    expect(archive.entries
      .filter(entry => entry.kind === 'symbolicLink')
      .every(entry => entry.mode === SYMBOLIC_LINK_MODE)).toBe(true)
    if (pin.name === 'tsgo') {
      expect(archive.entries.some(entry => entry.path === '.gitmodules' && entry.kind === 'file')).toBe(true)
      expect(archive.entries.some(entry => entry.path === 'typescript-go' || entry.path.startsWith('typescript-go/'))).toBe(false)
    }
  }
}))
