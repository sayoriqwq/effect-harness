# Prelude First-Party Provider

这份文档定义 `effect-harness` 在 prelude maintain provider 架构里的语义边界。

`effect-harness` 是 provider artifact 来源。prelude 可以重实现 target 安装和维护逻辑；
本仓库稳定提供 provider profile、Effect source-entry identity、Effect v4 package baseline、
verifier/status 语义、guardrails、runtime asset contract 和 feedback route。

## Provider Identity

- provider id: `effect-harness`
- provider schema version: `1`
- provider record contract version: `1`
- provider version: `0.1.0`
- default profile: `codex-effect-v4`
- long-lived target state: `.prelude/providers/effect-harness/provider.json`

prelude 生成和维护 `.prelude/providers/effect-harness/provider.json`。该 record 记录安装
profile、resolved options、artifact identity、provider source identity、applied contribution keys、
managed surfaces 和 drift 状态。

本仓库的 `.effect-harness.json` 只属于 standalone CLI / dogfood compatibility，不是 prelude 的
长期 source of truth。

Compatibility command:

```bash
effect-harness verify --target .
effect-harness verify --target . --provider-record .prelude/providers/effect-harness/provider.json
```

`verify --target .` first reads `.prelude/manifest.json`, finds `maintainProviders[]` with
`id === "effect-harness"`, then reads that entry's `recordPath`. `--provider-record` is an explicit
compatibility override. Only when neither prelude path exists does the verifier fall back to the legacy
`.effect-harness.json` standalone manifest.

## Source Entry Boundary

`harness/provider/effect-harness.provider.json` exposes `sourceEntries.effect-official-source`.
That entry is the provider repo's internal Effect source pin:

- repository: `https://github.com/Effect-TS/effect-smol.git`
- branch: `main`
- prefix: `repos/effect`
- anchor: `repos/effect.subtree.json#split`
- route: `harness/source.md`
- official LLM document: `repos/effect/LLMS.md`

This source entry is an agent reference and provider build input, not a target dependency. prelude records
provider artifact/source identity in the provider record, for example under `artifact.sourceIdentity`, but
it does not materialize or maintain `repos/effect` in a target repo unless a future provider contract
explicitly declares that as a managed surface.

## Provider Record Shape

prelude-generated provider records must contain at least:

- `schemaVersion`
- `id`
- `contractVersion`
- `providerVersion`
- `profile`
- `artifact`
- `artifact.sourceIdentity`
- `projectedContext`
- `options.runtime`
- `runtime`
- `surfaces`
- `verificationRecordId`

`options` is the generic provider options object at the prelude core boundary. `effect-harness` parses only
its own options after `id`, `profile`, and `contractVersion` match: current runtime, Effect v4 baseline,
language-service/floatingEffect, package scopes, and editor policy.

`runtime` is generic provider runtime metadata. The current record contains command strings, route strings,
and provider-owned runtime file paths.

`surfaces` is the verifier-owned description of managed target surface. It is an array of
`LifecycleSurfaceRecord` entries. The CLI verifier executes these records directly:

- `structuredPointer` entries validate `package.json` and `tsconfig.json` JSON pointers against snapshots.
- `ownedFile` entries validate provider-owned runtime files against their base content.
- `managedBlock` entries validate the `AGENTS.md` managed block against its snapshot.

## Profile Semantics

选择 `codex-effect-v4` 等于选择这组稳定语义：

- runtime: `codex`
- source entry: `effect-official-source`
- Effect baseline: Effect v4 beta package set from `repos/effect.subtree.json.packageBaseline`
- diagnostics: patched `tsgo --noEmit` plus `@effect/language-service`
- `floatingEffect`: `error`
- official guide: `repos/effect/LLMS.md`
- service baseline: `Context.Service`
- CLI modules: `effect/unstable/cli/Command` and `effect/unstable/cli/Flag`
- Node entrypoint/runtime: `@effect/platform-node/NodeRuntime` and `NodeServices`
- target feedback intake: `.codex/effect-feedback/` with `.codex/effect-feedback/.gitkeep`

Official Effect semantics always come from the pinned official source and official guide:

- `harness/offcial-guide.md`
- `repos/effect/LLMS.md`
- `repos/effect/ai-docs/src/`
- `repos/effect/migration/v3-to-v4.md`
- `repos/effect/`
- patched `@effect/tsgo` diagnostics

If this provider profile disagrees with those sources, update the provider profile and harness guardrails.
Do not invent target-local Effect rules in prelude.

## Managed Surfaces

The provider must compose with other harnesses. It contributes keys and managed blocks, never whole shared
files.

| Surface | Contribution boundary |
| --- | --- |
| provider state | `.prelude/providers/effect-harness/provider.json` and related provider metadata. |
| `package.json` | dependencies/devDependencies/script keys declared by the profile. |
| `pnpm-workspace.yaml` | catalog entries only when target already uses `catalog:` for baseline packages. |
| `tsconfig.json` | one `compilerOptions.plugins` entry named `@effect/language-service`. |
| `AGENTS.md` | only the `<!-- effect-harness:start -->` managed block. |
| runtime assets | provider-owned files declared by provider record `surfaces[]`. |
| feedback intake | `.codex/effect-feedback/` with `.codex/effect-feedback/.gitkeep`. |

Target repos receive provider record, managed block, package/tsconfig/script pointers, runtime assets, and
feedback intake. They do not receive the provider repo's internal Effect source pin body:

- no `repos/effect`
- no `repos/effect.subtree.json`
- no provider repo `repos/effect/LLMS.md` copy
- no effect-harness repo-local maintainer `.codex/skills`

prelude owns conflict detection and final writes. `effect-harness` owns the meaning of the contributed keys,
assets, source identity, and verification semantics.

## Editor Policy

Editor policy is profile/options data, not a hidden side effect.

- auto-import exclude is default for source-entry paths such as `repos/**`.
- watch/search exclude is recommended and must be configured per editor.
- file hiding is a user preference and requires explicit opt-in.
- VSCode and Zed use separate shapes.

VSCode can represent the three policy groups separately:

- `typescript.preferences.autoImportFileExcludePatterns`
- `javascript.preferences.autoImportFileExcludePatterns`
- `files.watcherExclude`
- `search.exclude`
- `files.exclude`

Zed's `file_scan_exclusions` is a shared scan/search/project-tree setting. Applying it for watch or search
also hides the source entry from the project tree, so the provider profile marks those Zed settings as
requiring explicit opt-in.

## Status And Verify

`status` answers drift questions:

- Is the provider-internal source entry present and current?
- Does `repos/effect.subtree.json.packageBaseline` match installed target package declarations?
- Is the target provider state using the current provider/profile version?
- Does the provider record include artifact/source identity?
- Are official npm/source pins newer than the harness baseline?

`verify` answers target conformance questions:

- Are package contributions present at key level?
- Is `tsgo --noEmit` the primary Effect diagnostic path?
- Is `@effect/language-service` configured with `floatingEffect=error`?
- Is the `AGENTS.md` managed block current?
- Are provider runtime assets present under provider-owned surfaces and checksum-current?
- Do guardrails reject known recurring Effect practice failures?

prelude may implement these checks directly or call the standalone CLI as dogfood, but prelude's formal
provider state remains `.prelude/providers/effect-harness/provider.json`. The CLI verifier consumes that
record; it does not require `.effect-harness.json` for prelude-managed targets.

## Maintain Rules

1. Treat `harness/provider/effect-harness.provider.json` as the prelude input contract.
2. Generate `.prelude/providers/effect-harness/provider.json` in targets; `.effect-harness.json` remains
   standalone CLI compatibility only.
3. Record provider artifact/source identity, not the provider repo's internal `repos/effect` body.
4. Install runtime assets only according to provider `surfaces[]` owned file records.
5. Keep `AGENTS.md` edits inside the `effect-harness` managed block.
6. Keep source-entry/pin management provider-internal or in Partita's generic source-entry workflow.
7. Keep `effect-harness init` as a standalone wrapper around the same provider/runtime contract.
