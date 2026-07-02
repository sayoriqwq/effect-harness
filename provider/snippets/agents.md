---
audience: agent
authors:
  - codex
reviewed_by: []
purpose: 提供 target 可引用的 effect-harness agent instruction snippet。
status: active
sources:
  - provider/effect-harness.provider.json
  - provider/docs/index.md
updated: 2026-07-02
---

# Effect Harness Snippet

## Snippet

```md
在本 target 编写 Effect 代码时，使用 effect-harness provider 维护的受管 surface。

- 修改 Effect 应用代码或测试代码前，先读 `.prelude/providers/effect-harness/docs/effect-code.md`。
- 修改 `package.json`、`tsconfig.json`、diagnostic scripts 或 Effect lint policy 前，先读 `.prelude/providers/effect-harness/docs/diagnostics.md`。
- 修改 provider record 或 source identity 字段前，先读 `.prelude/providers/effect-harness/docs/source-identity.md`。
- 从 `effect`、`@effect/platform-node` 和 `@effect/vitest` 等已安装 package import；不要从 provider-internal `repos/effect` 或 `repos/tsgo` import。
- 修改受管 Effect 代码或 provider-managed surfaces 后，运行 target verify command。
```

## Boundary

这个 snippet 是 provider-managed source content。

Prelude MAY 把它 materialize 到 `.prelude/providers/effect-harness/snippets/agents.md`。

effect-harness MUST NOT 直接管理 target `AGENTS.md` block。
