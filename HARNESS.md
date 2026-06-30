# Effect Harness Route

This repository has one current job: keep a pinned official Effect source entry and the matching
Effect v4 beta package baseline verifiable.

## Authority

- `harness/offcial-guide.md` is the only in-repo guide authority.
- `repos/effect.subtree.json` is the source-entry and package-baseline manifest.
- `repos/effect/LLMS.md` is the pinned upstream Effect LLM guide for implementation details.
- `harness/provider/effect-harness.provider.json` is the minimal Prelude provider profile.

Partita owns the generic source-entry pin workflow. This repository owns only the Effect instance.

## Removed Surfaces

The new baseline intentionally has no repo-local Codex skills, no target runtime templates, no
feedback intake, no target `AGENTS.md` managed block, and no `.effect-harness.json` standalone state.
Old files can be inspected from git history if needed, but they are not current authority.

## Verification

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Target repositories are verified as package/tsgo/guardrail consumers. Prelude may maintain target
state through its provider record; effect-harness does not project runtime assets into targets.
