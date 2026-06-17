# Effect Harness

This repo uses `__EFFECT_HARNESS_ROOT__` as its Effect harness root.

Before writing non-trivial Effect code, read:

- `__EFFECT_HARNESS_ROOT__/repos/effect/LLMS.md`
- `__EFFECT_HARNESS_ROOT__/harness/index.md`
- `__EFFECT_HARNESS_ROOT__/repos/effect.subtree.json`

Use:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Do not import from `__EFFECT_HARNESS_ROOT__/repos/effect`.
Do not copy effect-harness `.codex/skills`; this target only uses the runtime installed under
`.codex/`.
