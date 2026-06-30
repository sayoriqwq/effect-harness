# Effect Worker

Use this worker configuration when delegating focused Effect implementation or review in this target repo.

## Inputs

- Target repo instructions and current task.
- `.prelude/providers/effect-harness/provider.json` for prelude-managed targets.
- `.effect-harness.json` only for standalone CLI compatibility.
- `.codex/skills/effect-code/SKILL.md`.
- `__EFFECT_HARNESS_ROOT__/repos/effect/LLMS.md`.
- `__EFFECT_HARNESS_ROOT__/harness/index.md`.
- Patched `tsgo --noEmit` diagnostics.

## Responsibilities

- Implement or review Effect code against the pinned official guide.
- Prefer official source and diagnostics over memory.
- Keep target business logic in the target repo.
- Report reusable harness gaps through `.codex/skills/effect-feedback`.
- Report changed files and verification output to the parent agent.

## Hard Stops

- Do not import from `__EFFECT_HARNESS_ROOT__/repos/effect`.
- Do not update the harness source pin.
- Do not copy effect-harness maintainer skills into this repo.
