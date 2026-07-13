import type { PinnedReferenceTree } from '@sayoriqwq/prelude-contract'

/**
 * Immutable declarations derived from the Source Pin contracts.
 *
 * Verification rebuilds each archive and digest with the Contract's canonical
 * framing. Planning only returns these plain declarations and never scans the
 * Artifact.
 */
export const pinnedReferenceOutputs = [
  {
    kind: 'PinnedReferenceTree',
    id: 'effect.reference.effect',
    archive: {
      path: 'dist/reference-archives/effect.pta',
      format: 'prelude-canonical-tree-archive-v1',
    },
    locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
    provenance: {
      sourceUrl: 'https://github.com/Effect-TS/effect-smol',
      revision: 'f643dbb265093065dc0a61ca6133693dc2401678',
      treeDigest: 'd797515e8ecb2e164deef65b6b7abde6445201ce9d1e9e584f39d634c2469e95',
    },
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
