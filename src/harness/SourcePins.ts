import type { PinnedReferenceTree } from '@sayoriqwq/prelude-contract'
import { CANONICAL_TREE_ARCHIVE_FORMAT } from '@sayoriqwq/prelude-contract'

import effectPinPublication from '../../prelude-assets/effect/reference-archives/effect.json' with { type: 'json' }
import tsgoPinPublication from '../../prelude-assets/effect/reference-archives/tsgo.json' with { type: 'json' }

/**
 * Immutable declarations derived from the Source Pin publications.
 *
 * Partita publishes each archive and its generic provenance. Effect Harness
 * adds only its concrete pin identity and Target delivery policy.
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
      path: 'prelude-assets/effect/reference-archives/tsgo.pta',
      format: CANONICAL_TREE_ARCHIVE_FORMAT,
    },
    locator: { root: 'IntegrationWorkspace', path: 'repos/tsgo' },
    provenance: tsgoPinPublication.provenance,
    referenceOnly: true,
  },
] as const satisfies ReadonlyArray<PinnedReferenceTree>
