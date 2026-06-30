# Prelude First-Party Provider

这份文档定义 `effect-harness` 在 prelude maintain provider 架构里的语义边界。

`effect-harness` 不再要求 target 把它当成外部黑盒命令保护，也不要求自己掌控 target
写入边界。prelude 可以重实现安装和维护逻辑；本仓库稳定提供的是 provider profile、
assets、官方 Effect source pin、verifier/status 语义和可复用 feedback route。

## Provider Identity

- provider id: `effect-harness`
- provider schema version: `1`
- provider record contract version: `1`
- provider version: `0.1.0`
- default profile: `codex-effect-v4`
- long-lived target state: `.prelude/providers/effect-harness/provider.json`

`.prelude/providers/effect-harness/provider.json` 由 prelude 生成和维护，记录安装 profile、
resolved options、asset checksums、applied contribution keys、source pin 和 drift 状态。
本仓库的 `.effect-harness.json` 只属于 standalone CLI / dogfood compatibility，不是新的长期
source of truth。

Compatibility command:

```bash
effect-harness verify --target .
effect-harness verify --target . --provider-record .prelude/providers/effect-harness/provider.json
```

`verify --target .` first reads `.prelude/manifest.json`, finds `maintainProviders[]` with
`id === "effect-harness"`, then reads that entry's `recordPath`. `--provider-record` is an explicit
compatibility override. Only when neither prelude path exists does the verifier fall back to the legacy
`.effect-harness.json` standalone manifest.

## Provider Record Shape

prelude-generated provider records must contain at least:

- `schemaVersion`
- `id`
- `contractVersion`
- `providerVersion`
- `profile`
- `artifact`
- `projectedContext`
- `options.runtime`
- `runtime`
- `surfaces`
- `verificationRecordId`

`options` is a generic provider options object at the prelude core boundary. `effect-harness` only parses
its own options after `id`, `profile`, and `contractVersion` match, including current `options.runtime`,
Effect v4 package baseline, language-service/floatingEffect, and package scopes.

`runtime` is generic provider runtime metadata. The current record contains command strings, route strings,
and managed runtime file paths.

`surfaces` is the verifier-owned description of managed target surface. It is an array of
`LifecycleSurfaceRecord` entries. The CLI verifier executes these records directly:

- `structuredPointer` entries validate `package.json` and `tsconfig.json` JSON pointers against snapshots.
- `ownedFile` entries validate managed `.codex` runtime files against their base content.
- `managedBlock` entries validate the `AGENTS.md` managed block against its snapshot.

## Profile Semantics

选择 `codex-effect-v4` 等于选择这组稳定语义：

- runtime: `codex`
- Effect baseline: Effect v4 beta package set from `repos/effect.subtree.json.packageBaseline`
- diagnostics: patched `tsgo --noEmit` plus `@effect/language-service`
- `floatingEffect`: `error`
- official guide: `repos/effect/LLMS.md`
- service baseline: `Context.Service`
- CLI modules: `effect/unstable/cli/Command` and `effect/unstable/cli/Flag`
- Node entrypoint/runtime: `@effect/platform-node/NodeRuntime` and `NodeServices`
- target feedback intake: `.codex/effect-feedback/`

Official Effect semantics always come from the pinned official source:

- `repos/effect/LLMS.md`
- `repos/effect/ai-docs/src/`
- `repos/effect/migration/v3-to-v4.md`
- `repos/effect/`
- patched `@effect/tsgo` diagnostics

If this provider profile disagrees with those sources, update the provider profile and harness
guardrails. Do not invent target-local Effect rules in prelude.

## Contribution Surfaces

The provider must compose with other harnesses. It contributes keys and managed blocks, never whole
shared files.

| Surface | Contribution boundary |
| --- | --- |
| `package.json` | scripts/dependencies/devDependencies keys declared by the profile. |
| `pnpm-workspace.yaml` | catalog entries only when target already uses `catalog:` for baseline packages. |
| `tsconfig.json` | one `compilerOptions.plugins` entry named `@effect/language-service`. |
| `AGENTS.md` | only the `<!-- effect-harness:start -->` managed block. |
| `.codex/skills/` | Provider-owned files declared by `surfaces[]`; current prelude projection uses `.codex/skills/effect-code/**` and `.codex/skills/effect-feedback/**`. |
| `.codex/agents/` | Provider-owned files declared by `surfaces[]`; current prelude projection uses `.codex/agents/effect-worker.md`. |
| provider state | `.prelude/providers/effect-harness/**`. |

prelude owns conflict detection and final writes. `effect-harness` owns the meaning of the contributed
keys and assets.

## Stable Assets

The current stable asset source is `harness/runtime/codex/`, indexed by
`harness/provider/effect-harness.provider.json`.

prelude should install the assets declared by provider `surfaces[]`. Current prelude projection:

- `harness/runtime/codex/skills/effect-code/SKILL.md` ->
  `.codex/skills/effect-code/SKILL.md`
- `harness/runtime/codex/skills/effect-feedback/SKILL.md` ->
  `.codex/skills/effect-feedback/SKILL.md`
- `harness/runtime/codex/agents/effect-worker.md` ->
  `.codex/agents/effect-worker.md`
- `harness/runtime/codex/AGENTS.fragment.md` -> `AGENTS.md` managed block

## Status And Verify

`status` answers drift questions:

- Is the pinned official source present?
- Does `repos/effect.subtree.json.packageBaseline` match installed target package declarations?
- Is the target provider state using the current provider/profile version?
- Are official npm/source pins newer than the harness baseline?

`verify` answers target conformance questions:

- Are package contributions present at key level?
- Is `tsgo --noEmit` the primary Effect diagnostic path?
- Is `@effect/language-service` configured with `floatingEffect=error`?
- Is the `AGENTS.md` managed block current?
- Are provider assets present under the effect-harness namespace and checksum-current?
- Do guardrails reject known recurring Effect practice failures?

prelude may implement these checks directly or call the standalone CLI as dogfood, but prelude's formal
provider state remains `.prelude/providers/effect-harness/provider.json`. The CLI verifier consumes that
record; it does not require `.effect-harness.json` for prelude-managed targets.

## Migration Steps

1. Treat `harness/provider/effect-harness.provider.json` as the prelude input contract.
2. Generate `.prelude/providers/effect-harness/provider.json` in targets and stop creating new
   `.effect-harness.json` state for prelude-managed installs.
3. Install Codex assets according to provider `surfaces[]` owned file records.
4. Keep `AGENTS.md` edits inside the `effect-harness` managed block.
5. Port target verifier checks from `.effect-harness.json` to provider state.
6. After prelude owns create/maintain, reduce `effect-harness init` to a standalone wrapper around the
   same provider profile.
