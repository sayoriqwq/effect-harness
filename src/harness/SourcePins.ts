import type { PinnedReferenceTree } from '@sayoriqwq/prelude-contract'
import { CANONICAL_TREE_ARCHIVE_FORMAT } from '@sayoriqwq/prelude-contract'

import effectPinPublication from '../../prelude-assets/effect/reference-archives/effect.json' with { type: 'json' }

/**
 * Immutable declarations derived from the Source Pin publications.
 *
 * Partita publishes Effect's archive and generic provenance. Effect Harness
 * adds only its concrete Target delivery policy. tsgo remains on the legacy
 * local archive path until its own migration ticket.
 */
export const pinnedReferenceOutputs = [
  {
    kind: 'PinnedReferenceTree',
    id: 'effect.reference.effect',
    archive: {
      path: 'prelude-assets/effect/reference-archives/effect.pta',
      format: CANONICAL_TREE_ARCHIVE_FORMAT,
    },
    locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
    provenance: effectPinPublication.provenance,
    referenceOnly: true,
  },
  {
    kind: 'PinnedReferenceTree',
    id: 'effect.reference.tsgo',
    archive: {
      path: 'dist/reference-archives/tsgo.pta',
      format: 'prelude-canonical-tree-archive-v1',
    },
    locator: { root: 'IntegrationWorkspace', path: 'repos/tsgo' },
    provenance: {
      sourceUrl: 'https://github.com/Effect-TS/tsgo',
      revision: 'f0d48a67515048d277feb2c184c41cd7cffa51a4',
      treeDigest: 'f76adab084de0de584e0a565679b3afca2b48674a28e36c7dd6398846fd2bd9d',
    },
    referenceOnly: true,
  },
] as const satisfies ReadonlyArray<PinnedReferenceTree>
