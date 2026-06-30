# Effect Harness

This target uses `__EFFECT_HARNESS_ROOT__` as its Effect harness root.

Before writing non-trivial Effect code, read:

- `__EFFECT_HARNESS_ROOT__/repos/effect/LLMS.md`
- `__EFFECT_HARNESS_ROOT__/harness/index.md`
- `__EFFECT_HARNESS_ROOT__/repos/effect.subtree.json`
- `.prelude/providers/effect-harness/provider.json` when this target is prelude-managed
- `.effect-harness.json` only for standalone CLI compatibility

Runtime assets installed by this harness:

- Use `.codex/skills/effect-code/SKILL.md` for Effect implementation and review.
- Use `.codex/skills/effect-feedback/SKILL.md` for reusable target feedback.
- Use `.codex/agents/effect-worker.md` when delegating focused Effect work.

Use:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Do not import from `__EFFECT_HARNESS_ROOT__/repos/effect`.
Do not copy effect-harness maintainer `.codex/skills`; this target only uses the runtime installed under `.codex/`.
