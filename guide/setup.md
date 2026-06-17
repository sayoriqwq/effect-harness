# Setup Guide

这份 guide 给刚接入 `effect-harness` 的人读。它解释 init 之后发生了什么，以及遇到缺口时
应该去哪里补信息。

## Init 做什么

在目标仓库运行：

```bash
effect-harness init
pnpm install
pnpm effect:status
pnpm effect:verify
pnpm verify
```

`effect-harness init` 会写入：

- `.effect-harness.json`
- `package.json` scripts：`effect:status`、`effect:verify`
- `tsconfig.json` 的 `@effect/language-service` plugin
- `.codex/skills/effect-code/`
- `.codex/skills/effect-feedback/`
- `.codex/agents/effect-worker.md`
- `AGENTS.md` 里的 harness route

这些是 target runtime。目标仓库不需要复制本仓库的 `.codex/skills/`。

## 从哪里补信息

Effect API、pattern、testing 和 migration 先读官方 source：

- `repos/effect/LLMS.md`
- `repos/effect/ai-docs/src/`
- `repos/effect/migration/v3-to-v4.md`
- patched `tsgo --noEmit`

想理解 harness 默认提供了哪些补充保护，读：

- [Default Harness Capabilities](./default-capabilities.md)

agent 执行任务时读 harness contract：

- `harness/index.md`
- `harness/exposure.md`
- `harness/feedback/index.md`
- `harness/target-agent-contract.md`

## 如何反馈回来

如果目标仓库遇到 recurring Effect practice failure：

1. 先检查官方 source 是否已经覆盖。
2. 如果官方 source 已覆盖，直接 route 回官方 source。
3. 如果没有覆盖，并且问题 business-neutral、可复用，用 target 的
   `.codex/skills/effect-feedback/` 记录到 `.codex/effect-feedback/`。
4. 维护者再判断是否提升到 `effect-harness/harness/feedback/`。

能提升的反馈必须落成 guide、runtime、guardrail、verifier 或 repo-local skill。业务示例、
产品语义、release ritual 和项目形态不进入 harness。
