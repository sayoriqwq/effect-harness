# Agent Bootstrap

This repo is the shared Effect v4 beta provider profile and source route package. It is published as
a CLI utility package.

Before writing non-trivial Effect code here or in a target project, read:

- `HARNESS.md`
- `README.md`
- `harness/index.md`
- `harness/offcial-guide.md`
- `harness/source.md`
- `harness/effect-routes.md`
- `.partita/source-entries.json`
- `repos/effect/LLMS.md`
- `repos/effect.subtree.json`

Baseline:

- `effect@4.0.0-beta.90`
- `@effect/platform-node@4.0.0-beta.90`
- `@effect/vitest@4.0.0-beta.90`
- `@effect/tsgo@0.14.6`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260624.1`

Current v4 beta patterns:

- CLI modules: `effect/unstable/cli/Command` and `effect/unstable/cli/Flag`
- Node runtime: `@effect/platform-node/NodeRuntime`
- Node services: `@effect/platform-node/NodeServices`
- Service definitions: `Context.Service`
- Entrypoints: `NodeRuntime.runMain`

Hard boundaries:

- Never import from `repos/effect` in application or test code.
- Do not depend on `@effect/cli`; use `effect/unstable/cli`.
- Do not introduce `Context.Tag` service definitions for this baseline.
- Do not add target-local dispatcher scripts.
- Do not restore repo-local `.codex/skills`, target runtime templates, feedback intake,
  `.effect-harness.json`, or effect-harness managed `AGENTS.md` blocks. Those are old surfaces.
- Partita owns the generic source-entry pin workflow; this repo owns only the Effect source-entry
  instance and baseline verifier.

Validation:

```bash
pnpm effect:verify
pnpm verify
```

Official source precedence:

- Use `pnpm source:status`, `pnpm source:update`, and `pnpm source:verify` for generic source-entry
  pin workflow through Partita.
- Use the `@effect/tsgo` patched `tsgo --noEmit` as the primary Effect diagnostic path.
  `effect-tsgo` is the setup/patch manager, not the `--noEmit` typecheck binary.
- If local harness docs disagree with `harness/offcial-guide.md`, `repos/effect/LLMS.md`,
  `repos/effect/`, or `@effect/tsgo` diagnostics, follow the official source and update the
  minimal provider routes.
