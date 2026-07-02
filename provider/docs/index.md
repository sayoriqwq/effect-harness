---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 定义 effect-harness provider 投递给 target 的 docs bundle 文件清单和边界。
status: active
sources:
  - provider/effect-harness.provider.json
  - provider/docs/effect-code.md
  - provider/docs/diagnostics.md
  - provider/docs/discovery.md
  - provider/docs/editor-policy.md
  - provider/docs/managed-surfaces.md
  - provider/docs/package-config.md
  - provider/docs/quality-policy.md
  - provider/docs/source-identity.md
updated: 2026-07-02
---

# Docs Bundle

`provider/docs/**` 是 provider-managed target docs bundle 的 source。Prelude materialization
应该把这些文件投递到 `.prelude/providers/effect-harness/docs/**`。

## Files

| Source | Target | Purpose |
| --- | --- | --- |
| `provider/docs/effect-code.md` | `.prelude/providers/effect-harness/docs/effect-code.md` | 说明 target 内 Effect 代码的编码基线。 |
| `provider/docs/diagnostics.md` | `.prelude/providers/effect-harness/docs/diagnostics.md` | 说明 target 内 strict tsgo diagnostic gate。 |
| `provider/docs/discovery.md` | `.prelude/providers/effect-harness/docs/discovery.md` | 说明 Prelude 如何通过 provider discovery 消费 package artifact。 |
| `provider/docs/editor-policy.md` | `.prelude/providers/effect-harness/docs/editor-policy.md` | 说明 target 内 editor policy 的 hard、recommended 和 preference 层级。 |
| `provider/docs/managed-surfaces.md` | `.prelude/providers/effect-harness/docs/managed-surfaces.md` | 说明 target 内受管 surface、artifact-only reference 和 feedback loop 边界。 |
| `provider/docs/package-config.md` | `.prelude/providers/effect-harness/docs/package-config.md` | 说明 target 内 package baseline、script baseline 和 `tsconfig.json` projection。 |
| `provider/docs/quality-policy.md` | `.prelude/providers/effect-harness/docs/quality-policy.md` | 说明 target 内 lint、test 和 verify policy。 |
| `provider/docs/source-identity.md` | `.prelude/providers/effect-harness/docs/source-identity.md` | 说明 provider-internal source pin 如何以 identity 形式出现在 target record 中。 |

## Boundary

docs bundle MUST 面向 target 使用者说明受管能力。

docs bundle MUST NOT 要求 target 拥有 `repos/effect/`、`repos/tsgo/`、subtree contracts、Codex
runtime 资产、feedback intake、`.effect-harness.json` 或 effect-harness 管理的 `AGENTS.md`
block。

docs bundle SHOULD 只引用 target 可见 surface：provider record、package baseline、`tsconfig.json`
projection、diagnostic scripts、docs bundle 和 snippets。
