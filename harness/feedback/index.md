# Harness Feedback

这是 Effect harness 的 practice-to-contract feedback contract，给 agent 和维护者执行判断时读取。
人类理解默认补充能力时读 `guide/default-capabilities.md`。

Feedback 可以来自外部 target projects，也可以来自本仓库自己的 CLI/runtime/verifier dogfood。
它不改写 Effect API 语义；Effect API 教学、业务示例、项目形态和 release ritual 不进入这里。
官方 source 已覆盖的内容直接 route 到 pinned source。

## Intake Rule

新增 feedback item 前，先使用 target runtime 的 `.codex/skills/effect-feedback/` 或本仓库
`.codex/skills/effect-feedback-maintainer/` 做判断。只有同时满足这些条件才写入：

- target project 或本仓库 self dogfood 给出了 recurring Effect practice failure 的具体证据
- `repos/effect/LLMS.md`, `repos/effect/ai-docs/src/`, `repos/effect/migration/v3-to-v4.md`,
  pinned source 和 `@effect/tsgo` diagnostics 没有解释或捕获它
- 问题是 business-neutral，并能跨 Effect targets 复用
- landing 是 harness route、target runtime contract、guardrail、verifier 或 skill update

不要添加 upstream maintainer-only workflow、project-specific product examples、local machine
paths、downstream project shape details 或 generic Effect API tutorials。

## Intake Entry Format

这是本仓库的 feedback 记录格式，不是官方 Effect 格式。它只用于判断一个 practice failure
是否应该进入 harness contract。

```markdown
## <short issue name>

- Evidence:
- Official coverage check:
- Missing harness contract:
- Proposed landing:
- Verifier or guardrail:
- Status:
```

## Default Harness Capabilities

这一节记录已经由 harness 默认提供的补充能力。它们来自 practice feedback，但已经落成
runtime、guardrail、verifier 或 repo-local skill，不再只是待判断 intake。

### Assertion-based tsgo suggestion cleanup

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
