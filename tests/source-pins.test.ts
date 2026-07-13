import { resolve } from 'node:path'

import { expect, it } from '@effect/vitest'
import { decodeCanonicalTreeArchive, SYMBOLIC_LINK_MODE } from '@sayoriqwq/prelude-contract'
import { Effect } from 'effect'

import { pinnedReferenceOutputs } from '../src/harness/SourcePins.ts'
import { buildReferenceArchives } from '../tsdown.config.ts'

const repositoryRoot = resolve(import.meta.dirname, '..')

it.effect('derives one-layer Pinned Reference Trees from the Source Pin contracts', () => Effect.sync(() => {
  const archives = buildReferenceArchives({ root: repositoryRoot, write: false })

  expect(archives).toHaveLength(pinnedReferenceOutputs.length)
  for (const archive of archives) {
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
    if (archive.name === 'tsgo') {
      expect(decoded.entries.some(entry => entry.path === '.gitmodules' && entry.kind === 'file')).toBe(true)
      expect(decoded.entries.some(entry => entry.path === 'typescript-go' || entry.path.startsWith('typescript-go/'))).toBe(false)
    }
  }
}))
