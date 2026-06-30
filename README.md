# Effect Harness

`effect-harness` is a small Effect v4 beta source-entry and baseline verifier.

The generic external-repository pin workflow belongs to Partita. This repository only carries the
Effect-specific instance:

- `harness/offcial-guide.md`: the only in-repo guide authority copied from the official guide brief.
- `repos/effect/`: pinned official Effect source, read-only for agents.
- `repos/effect.subtree.json`: source-entry manifest and package baseline.
- `harness/effect-routes.md`: agent route table for reading the pinned Effect source.
- `harness/provider/effect-harness.provider.json`: minimal Prelude provider profile.
- `src/`: CLI status/update/verify/publish implementation.

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
pnpm effect:status
pnpm effect:verify
pnpm verify
```

`pnpm effect:status` checks official npm dist-tags and the upstream source branch.

`pnpm effect:verify` checks the committed source-entry pin, provider profile, guardrails, and legacy
provider-state absence.

`effect-harness verify --target <repo>` is a baseline verifier for target repositories. It accepts
Prelude provider records, but it blocks legacy target state such as `.effect-harness.json`, old
effect-harness `.codex` runtime assets, and old effect-harness `AGENTS.md` managed blocks.

## Source Pin

Read [harness/source.md](./harness/source.md) before changing `repos/effect/` or
`repos/effect.subtree.json`. Read [harness/effect-routes.md](./harness/effect-routes.md) when an
agent needs to use the pinned Effect source as reference material. The update command is explicit:

```bash
pnpm effect:update
```

After a source update, commit with matching `git-subtree-dir` and `git-subtree-split` trailers and
run `pnpm verify`.

## Publish

`pnpm publish:npm` runs `effect-harness publish`. This is this repository's npm package publishing
flow; it does not define target repository release rituals.

The publish flow verifies the repository, temporarily writes the package version under an Effect
finalizer, creates the tarball, and calls npm publish. Dry runs must also restore `package.json`.

Common parameters:

- `--version`
- `--tag` / `--npm-tag`
- `--dry-run`
- `--provenance`

GitHub workflow is `.github/workflows/publish-npm.yml` and only supports manual
`workflow_dispatch`. Real publishing needs one npm authentication path:

- GitHub secret `NPM_TOKEN`
- npm Trusted Publisher: owner `sayoriqwq`, repo `effect-harness`, workflow filename
  `publish-npm.yml`, allowed action `npm publish`

npm package name is `@sayoriqwq/effect-harness`; bin name remains `effect-harness`. The tarball
intentionally includes `repos/effect/` so the CLI package carries the pinned official source,
`repos/effect/LLMS.md`, and `repos/effect.subtree.json`.
