import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, it } from '@effect/vitest'
import { decodeCanonicalTreeArchive, SYMBOLIC_LINK_MODE } from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { pinnedReferenceOutputs } from '../src/harness/SourcePins.ts'
import { buildReferenceArchives } from '../tsdown.config.ts'

const repositoryRoot = resolve(import.meta.dirname, '..')

it.effect('consumes the Partita-published Effect pin with Harness delivery policy', () => Effect.sync(() => {
  const publicationRoot = resolve(repositoryRoot, 'prelude-assets/effect/reference-archives')
  const publication = JSON.parse(readFileSync(resolve(publicationRoot, 'effect.json'), 'utf8')) as {
    readonly schemaVersion: number
    readonly name: string
    readonly archive: { readonly format: string }
    readonly provenance: { readonly sourceUrl: string, readonly revision: string, readonly treeDigest: string }
  }
  const archive = decodeCanonicalTreeArchive(readFileSync(resolve(publicationRoot, 'effect.pta')))
  const output = pinnedReferenceOutputs.find(candidate => candidate.id === 'effect.reference.effect')

  expect(publication).toMatchObject({
    schemaVersion: 1,
    name: 'effect',
    archive: { format: 'prelude-canonical-tree-archive-v1' },
  })
  expect(publication).not.toHaveProperty('locator')
  expect(publication).not.toHaveProperty('route')
  expect(publication).not.toHaveProperty('anchor')
  expect(publication).not.toHaveProperty('referenceOnly')
  expect(archive.treeDigest).toBe(publication.provenance.treeDigest)
  expect(output).toEqual({
    kind: 'PinnedReferenceTree',
    id: 'effect.reference.effect',
    archive: {
      path: 'prelude-assets/effect/reference-archives/effect.pta',
      format: publication.archive.format,
    },
    locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
    provenance: publication.provenance,
    referenceOnly: true,
  })
}))

it.effect('keeps tsgo on the local archive path during the Effect expand phase', () => Effect.sync(() => {
  const archives = buildReferenceArchives({ root: repositoryRoot, write: false })

  expect(archives).toHaveLength(1)
  for (const archive of archives) {
    expect(archive.name).toBe('tsgo')
    const output = pinnedReferenceOutputs.find(candidate => candidate.archive.path === archive.archivePath)
    expect(output, `missing PinnedReferenceTree declaration for ${archive.name}`).toBeDefined()
    expect(output).toMatchObject({
      archive: { path: archive.archivePath, format: archive.format },
      provenance: {
        sourceUrl: archive.sourceUrl,
        revision: archive.revision,
        treeDigest: archive.treeDigest,
      },
      referenceOnly: true,
    })

    const decoded = decodeCanonicalTreeArchive(archive.bytes)
    expect(decoded.treeDigest).toBe(archive.treeDigest)
    expect(decoded.entries
      .filter(entry => entry.kind === 'symbolicLink')
      .every(entry => entry.mode === SYMBOLIC_LINK_MODE)).toBe(true)
    expect(decoded.entries.some(entry => entry.path === '.gitmodules' && entry.kind === 'file')).toBe(true)
    expect(decoded.entries.some(entry => entry.path === 'typescript-go' || entry.path.startsWith('typescript-go/'))).toBe(false)
  }
}))
