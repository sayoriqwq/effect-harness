# Harness Feedback

这是来自真实 target projects 的 Effect harness feedback 入口。

Feedback 只补 harness 缺口；Effect API 教学、业务示例、项目形态和 release ritual 不进入这里。
官方 guide 覆盖的内容直接 route 到 pinned source。

## Intake Rule

新增 feedback item 前，先使用 target runtime 的 `.codex/skills/effect-feedback/` 或本仓库
`.codex/skills/effect-feedback-maintainer/` 做判断。只有同时满足这些条件才写入：

- target project 给出了 recurring Effect practice failure 的具体证据
- `repos/effect/LLMS.md`, `repos/effect/ai-docs/src/`, `repos/effect/migration/v3-to-v4.md`,
  vendored source 和 `@effect/tsgo` diagnostics 没有解释或捕获它
- 问题是 business-neutral，并能跨 Effect targets 复用
- landing 是 harness route、target runtime contract、guardrail、verifier 或 skill update

不要添加 upstream maintainer-only workflow、project-specific product examples、local machine
paths、downstream project shape details 或 generic Effect API tutorials。

## Entry Format

这是本仓库的 feedback 记录格式，不是官方 Effect 格式。它只用于判断一个真实项目问题是否应该
进入 harness contract。

```markdown
## <short issue name>

- Evidence:
- Official coverage check:
- Missing harness contract:
- Proposed landing:
- Verifier or guardrail:
- Status:
```

## Assertion-based tsgo suggestion cleanup

- Evidence: A target update produced non-blocking `@effect/tsgo` suggestions. The first cleanup used
  `Effect.orElseSucceed(() => [] as ...)`, `Effect.succeed(null as ...)`, and
  `{ ok: false as const }` result wrappers instead of declaring the type boundary.
- Official coverage check: The pinned Effect source shows typed `orElseSucceed` fallbacks,
  `Effect.fn(...)` transform arguments, and `satisfies` helpers, but it does not give target agents
  a harness-level rule for avoiding assertion-based suggestion cleanup.
- Missing harness contract: Target agents need to distinguish soft review guidance from hard verifier
  failures when a tsgo suggestion can be silenced with `as`.
- Proposed landing: Add target skill guidance for type-boundary fixes and an AST guardrail for the
  recurring assertion-silencing shapes.
- Verifier or guardrail: `effect-harness guardrails` rejects assertion fallback cleanup in
  `Effect.orElseSucceed`, asserted values lifted directly by `Effect.succeed`, and ad-hoc
  `ok: true/false as const` result wrappers.
- Status: Landed.
