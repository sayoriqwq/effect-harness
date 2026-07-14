# Tsgo source route

Use the delivered `repos/tsgo/**` tree only for diagnostic, configuration, and
upgrade questions. Start at `repos/tsgo/README.md`.

| Intent | Read next |
| --- | --- |
| Diagnostic inventory and defaults | `repos/tsgo/_packages/tsgo/src/metadata.json` |
| Setup and config mutation | `repos/tsgo/_packages/tsgo/src/setup/` |
| Rule execution | `repos/tsgo/internal/rules/` and the corresponding rule implementation |
| Quick fixes | `repos/tsgo/internal/fixables/` and Effect test baselines |
| Suppression directives | `repos/tsgo/internal/directives/` |
| Layer graph or key behavior | `repos/tsgo/internal/layergraph/` or `internal/keybuilder/` |
| Native backend integration | `repos/tsgo/etscore/`, `etslshooks/`, and `internal/effectconfigraw/` |

Metadata is the inventory; implementation and fixtures establish behavior.
The upstream `typescript-go` gitlink is intentionally not followed or
materialized. Never run a Target-local pin or independently update this
snapshot.
