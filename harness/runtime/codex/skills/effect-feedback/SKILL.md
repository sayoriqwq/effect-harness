---
name: effect-feedback
description: Capture reusable Effect practice feedback for the linked effect-harness. Use when this project hits a recurring Effect pitfall, @effect/tsgo gap, guardrail gap, verifier mismatch, or local workaround that the pinned official source does not already cover.
---

# Effect Feedback

Use this skill when this repo finds a reusable Effect practice issue.

## Workflow

1. Record concrete evidence from this repo: error, diff, test, log, command output, or failed agent loop.
2. Check official pinned sources:
   - `__EFFECT_HARNESS_ROOT__/repos/effect/LLMS.md`
   - `__EFFECT_HARNESS_ROOT__/repos/effect/ai-docs/src/`
   - `__EFFECT_HARNESS_ROOT__/repos/effect/migration/v3-to-v4.md`
   - `__EFFECT_HARNESS_ROOT__/repos/effect/`
   - patched `tsgo --noEmit`
3. If official source already covers it, route to the official source and do not create feedback.
4. If the gap is reusable and business-neutral, write a local feedback entry in this repo under
   `.codex/effect-feedback/`.
5. Ask the maintainer whether to upstream the entry to
   `__EFFECT_HARNESS_ROOT__/harness/feedback/index.md`.

## Local Entry

This is the target-local feedback format from effect-harness, not an official Effect format.
Promoted entries must land as a route, runtime contract, guardrail, verifier, or harness skill update.

```markdown
## <issue>

- Evidence:
- Official coverage check:
- Missing harness contract:
- Proposed landing:
- Verifier or guardrail:
- Status:
```

## Do Not

- Do not add product-specific examples to effect-harness.
- Do not copy upstream maintainer-only workflow from `repos/effect/AGENTS.md`,
  `repos/effect/.agents/skills/*`, or `repos/effect/.specs/*`.
- Do not bypass official pinned guidance.
