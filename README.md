# Effect Harness

`effect-harness` is a small Effect v4 beta provider profile and source route package.

The generic external-repository pin workflow belongs to Partita. This repository only carries the
Effect-specific instance:

- `harness/offcial-guide.md`: the only in-repo guide authority copied from the official guide brief.
- `repos/effect/`: pinned official Effect source, read-only for agents.
- `repos/effect.subtree.json`: source-entry manifest and package baseline.
- `.partita/source-entries.json`: Partita-owned generic source-entry contract.
- `harness/effect-routes.md`: agent route table for reading the pinned Effect source.
- `harness/provider/effect-harness.provider.json`: minimal Prelude provider profile.
- `src/`: minimal provider/source verifier implementation.

There is no target runtime projection in this baseline. The old `.codex/skills`, target runtime
templates, feedback intake, `AGENTS.md` managed block, and `.effect-harness.json` standalone manifest
surfaces are intentionally gone.

## Baseline

The package baseline is defined only by [repos/effect.subtree.json](./repos/effect.subtree.json).
Application and test code must import Effect APIs from installed packages, never from
`repos/effect/`.

## Commands

```bash
pnpm install
pnpm effect:verify
pnpm verify
```

`pnpm effect:verify` checks the committed source-entry pin, Partita source contract, provider
profile, and provider repository import boundaries.

## Source Pin

Read [harness/source.md](./harness/source.md) before changing `repos/effect/` or
`repos/effect.subtree.json`. Read [harness/effect-routes.md](./harness/effect-routes.md) when an
agent needs to use the pinned Effect source as reference material.

```bash
pnpm source:status
pnpm source:update
pnpm source:verify
```

Those commands delegate generic pin status/update/verify to Partita. If the source pin changes,
commit with matching `git-subtree-dir` and `git-subtree-split` trailers and run `pnpm verify`.
