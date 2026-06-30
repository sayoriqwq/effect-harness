# Harness Index

Current route table:

| Intent | Read | Authority | Verify |
| --- | --- | --- | --- |
| Understand the approved source-entry plan | `harness/offcial-guide.md` | official guide brief | n/a |
| Inspect the Effect source pin | `harness/source.md` | `repos/effect.subtree.json`, `repos/effect/LLMS.md` | `pnpm effect:verify` |
| Update the Effect source pin | `harness/source.md` | upstream Effect repo and npm dist-tags | `pnpm verify`, subtree trailers |
| Inspect Prelude provider shape | `harness/provider/index.md` | `harness/provider/effect-harness.provider.json` | `pnpm effect:verify` |
| Verify a target repo baseline | CLI `verify --target` | package baseline, tsgo config, guardrails | target `pnpm effect:verify` |

Boundaries:

- Application and test code must not import from `repos/effect`.
- This repo no longer distributes Codex skills or target runtime assets.
- `.effect-harness.json`, old effect-harness `.codex` assets, feedback intake, and effect-harness
  `AGENTS.md` managed blocks are legacy state and should be removed from targets.
- Prelude owns target lifecycle. effect-harness only exposes provider identity, source identity, package
  baseline, and verifier expectations.
- Partita owns the generic source-entry pin workflow.
