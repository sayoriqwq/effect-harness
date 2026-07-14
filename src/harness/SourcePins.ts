import type { PinnedReferenceTree } from '@sayoriqwq/prelude-contract'
import { CANONICAL_TREE_ARCHIVE_FORMAT } from '@sayoriqwq/prelude-contract'

import effectPinPublication from '../../artifact-assets/effect/reference-archives/effect.json' with { type: 'json' }
import tsgoPinPublication from '../../artifact-assets/effect/reference-archives/tsgo.json' with { type: 'json' }
import { acceptedEffectBaseline } from './Baseline.ts'

const effectPin = acceptedEffectBaseline.sourcePins.effect
const tsgoPin = acceptedEffectBaseline.sourcePins.tsgo

function verifiedProvenance(
  publication: typeof effectPinPublication | typeof tsgoPinPublication,
  identity: typeof effectPin | typeof tsgoPin,
) {
  if (
    publication.name !== identity.publicationName
    || publication.provenance.sourceUrl !== identity.sourceUrl
  ) {
    throw new Error(`Source Pin publication does not match accepted Baseline identity: ${identity.publicationName}`)
  }
  return publication.provenance
}

/**
 * Immutable declarations derived from the Source Pin publications.
 *
 * Partita publishes each archive and its generic provenance. Effect Harness
 * adds only its concrete pin identity and Target delivery policy.
 */
export const pinnedReferenceOutputs = [
  {
    kind: 'PinnedReferenceTree',
    id: effectPin.outputId,
    archive: {
      path: `artifact-assets/effect/reference-archives/${effectPin.publicationName}.pta`,
      format: CANONICAL_TREE_ARCHIVE_FORMAT,
    },
    locator: { root: 'IntegrationWorkspace', path: effectPin.targetPath },
    provenance: verifiedProvenance(effectPinPublication, effectPin),
    referenceOnly: true,
  },
  {
    kind: 'PinnedReferenceTree',
    id: tsgoPin.outputId,
    archive: {
      path: `artifact-assets/effect/reference-archives/${tsgoPin.publicationName}.pta`,
      format: CANONICAL_TREE_ARCHIVE_FORMAT,
    },
    locator: { root: 'IntegrationWorkspace', path: tsgoPin.targetPath },
    provenance: verifiedProvenance(tsgoPinPublication, tsgoPin),
    referenceOnly: true,
  },
] as const satisfies ReadonlyArray<PinnedReferenceTree>
