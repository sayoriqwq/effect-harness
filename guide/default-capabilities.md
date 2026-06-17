# Default Harness Capabilities

这份 guide 给人读，用来理解 `effect-harness` 默认补充了哪些官方 source 之外的工程保护。
这些能力不是 Effect API 教程，也不是业务模板；它们来自 target/self practice feedback，
并且已经落到 runtime、guardrail、verifier 或 repo-local skill。

## 当前默认能力

### Assertion-based tsgo suggestion cleanup

`@effect/tsgo` suggestion 代表类型边界需要表达清楚。harness 默认要求优先用明确 return type、
命名 result union/helper、`satisfies`、`Effect.satisfiesSuccessType` 或
`Function.satisfies` 表达边界。

默认保护：

- target runtime 的 `effect-code` skill 会提示 agent 不要用 assertion 消音。
- `effect-harness guardrails` 会拒绝 recurring assertion cleanup shapes。
- `pnpm effect:verify` 和 `pnpm verify` 会执行这些 guardrails。

会被拒绝的典型形态：

- `Effect.orElseSucceed(() => [] as ...)`
- `Effect.succeed(null as ...)`
- ad-hoc `{ ok: true/false as const }` result wrappers

确实来自第三方 IO 或不可表达外部边界时，可以使用局部 assertion，但应该先在 Effect 外声明边界，
不要用 assertion 让 diagnostic 消失。

## 新增默认能力

新增默认能力前，先把 evidence 放进 `harness/feedback/index.md` 的 intake。
只有同时满足这些条件才提升：

- 官方 source 没有解释或捕获这个 practice failure。
- 问题 business-neutral，并能跨 Effect targets 复用。
- landing 是 guide、runtime、guardrail、verifier 或 repo-local skill。
- drift 时有明确验证命令会失败。
