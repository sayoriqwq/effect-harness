---
name: effect-feedback
description: "Use in an Effect target repo when a recurring Effect practice failure, @effect/tsgo gap, guardrail gap, verifier mismatch, or workaround may be reusable for effect-harness. Not for product-specific examples, generic Effect API tutorials, or issues already covered by the pinned official source."
---

# Effect Feedback

Use this skill to capture target-local evidence that may improve `effect-harness`.

## Capability

Separate reusable harness gaps from target business issues by checking pinned official source first, then
recording a local feedback item with enough evidence for a maintainer to promote or reject.

Pressure scenario: an agent upstreams a product-specific workaround, copies official docs into the harness,
or loses a real repeated target failure because it was never written as evidence.

## Trigger

Use when this target hits a recurring Effect pitfall, `@effect/tsgo` diagnostic gap, guardrail gap,
verifier mismatch, or local workaround that might apply across Effect targets.

Do not use when official source already explains the issue, when the issue is product-specific, or when the
task is ordinary Effect implementation.

## Soft Boundary

- Feedback starts as target-local evidence under `.codex/effect-feedback/`.
- Promotion to `effect-harness` requires maintainer judgment.
- Business examples, product semantics, release rituals, and target project shape stay in the target repo.

## Hard Boundary

- Check pinned official source before writing feedback.
- Do not bypass `repos/effect/LLMS.md`, `repos/effect/ai-docs/src/`, `repos/effect/migration/v3-to-v4.md`,
  `repos/effect/`, or patched `tsgo --noEmit`.
- Do not copy upstream maintainer-only workflow from `repos/effect/AGENTS.md`,
  `repos/effect/.agents/skills/*`, or `repos/effect/.specs/*`.

## Workflow

1. Record concrete evidence from this repo: error, diff, test, log, command output, or failed agent loop.
2. Check official pinned sources and diagnostics.
3. If official source covers it, route to that source and do not create feedback.
4. If the gap is reusable and business-neutral, write a local entry in `.codex/effect-feedback/`.
5. Ask the maintainer whether to upstream it to `__EFFECT_HARNESS_ROOT__/harness/feedback/index.md`.

## Local Entry

```markdown
## <issue>

- Evidence:
- Official coverage check:
- Missing harness contract:
- Proposed landing:
- Verifier or guardrail:
- Status:
```

## Validation

The entry must state the official coverage check and a proposed landing as route, runtime contract,
guardrail, verifier, or harness skill update.
