# Source identity and provenance

The Integration receives two Harness-owned Pinned Reference Trees:

- Effect source at `repos/effect/**`, entered through `repos/effect/LLMS.md`.
- tsgo source at `repos/tsgo/**`, entered through `repos/tsgo/README.md`.

Each Plan binds the upstream source URL, immutable revision, and SHA-256 tree
digest derived from the Harness Source Pin. Prelude verifies the canonical
archive and materializes the pinned repository's reference surface without Git
or network access. Upstream gitlinks remain opaque boundaries: their
`.gitmodules` declaration is available for context, but Harness does not follow
or independently pin the referenced repository.

Target edits inside a reference tree are **Reference Drift**. A subsequent
approved Apply replaces the entire tree; it does not merge or preserve those
edits. Put Target notes in sibling `feedback/**`, never in `repos/**`.
