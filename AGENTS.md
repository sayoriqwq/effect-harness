# Agent Bootstrap

This repo is the shared Effect v4 beta harness. It is published as a CLI utility package.

Before writing non-trivial Effect code here or in a target project, read:

- `README.md`
- `docs/effect-patterns/index.md`
- `repos/effect/LLMS.md`
- `repos/effect.subtree.json`

Baseline:

- `effect@4.0.0-beta.78`
- `@effect/platform-node@4.0.0-beta.78`
- `@effect/vitest@4.0.0-beta.78`
- `@effect/tsgo@0.14.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260606.1`

Current v4 beta patterns:

- CLI modules: `effect/unstable/cli/Command` and `effect/unstable/cli/Flag`
- Node runtime: `@effect/platform-node/NodeRuntime`
- Node services: `@effect/platform-node/NodeServices`
- Service definitions: `Context.Service`
- Entrypoints: `NodeRuntime.runMain`

Hard boundaries:

- Never import from `repos/effect` in application or test code.
- Do not use legacy `@effect/cli`.
- Do not introduce `Context.Tag` service definitions for this baseline.
- Keep target runtime business-neutral. Real project examples stay in target repos until they prove reusable.
- Do not add target-local dispatcher scripts. This repo exposes runtime, skills, docs, and verifier
  contracts only.

Validation:

```bash
pnpm effect:status
pnpm verify
```

Official source precedence:

- Check `pnpm effect:status` before changing the Effect source pin or package baseline.
- Use the `@effect/tsgo` patched `tsgo --noEmit` as the primary Effect diagnostic path.
  `effect-tsgo` is the setup/patch manager, not the `--noEmit` typecheck binary.
- If local harness docs disagree with official Effect docs, `repos/effect/LLMS.md`,
  `repos/effect/`, or `@effect/tsgo` diagnostics, follow the official source and update the
  harness docs/guardrails.
