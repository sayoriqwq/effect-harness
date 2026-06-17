---
name: effect-feedback-maintainer
description: Maintain effect-harness feedback intake from real target projects or harness self dogfood. Use inside this repo when reviewing an Effect practice issue, checking official pinned guidance coverage, and deciding whether to add a reusable feedback entry to harness/feedback/index.md. Not a target runtime skill.
---

# Effect Feedback Maintainer

这个 skill 只服务本仓库维护者。目标不是写 Effect 教程，而是判断某个 target project
或本仓库 self dogfood 的踩坑是否应该进入 `effect-harness` 的 feedback layer。

## Workflow

1. 先读 practice evidence：target/self 报错、diff、test、日志、命令输出或 agent 失败记录。
2. 再查官方 pin：
   `repos/effect/LLMS.md`、`repos/effect/ai-docs/src/`、
   `repos/effect/migration/v3-to-v4.md`、`repos/effect/` source、`@effect/tsgo` diagnostics。
3. 如果官方已经讲清楚，结论是 route，不新增 feedback。
4. 如果官方没有覆盖，判断它能否变成 business-neutral 的 harness contract。
5. 只把可复用的问题写进 `harness/feedback/index.md`，并给出 landing：
   docs route、target runtime contract、guardrail、verifier 或 skill update。
6. 如果只是下游业务命令、产品语义、local path、release ritual 或项目生成细节，拒绝进入本仓库。

## Local Entry

每次反馈只产出一个最小条目。这是本仓库格式，不是官方 Effect 格式：

```markdown
## <issue>

- Evidence:
- Official coverage check:
- Missing harness contract:
- Proposed landing:
- Verifier or guardrail:
- Status:
```

## Rules

- 官方 source 是 Effect 语义 single source of truth；feedback 只能提升 harness contract。
- 不复制 `repos/effect/AGENTS.md`、`repos/effect/.agents/skills/*`、`repos/effect/.specs/*`
  这类 upstream maintainer-only workflow。
- 不把 target project 的业务示例搬进 `effect-harness`。
- 能用 verifier 表达的约束，不写成口头建议。
