# Setup Guide

这份 guide 给刚接入 `effect-harness` 的人读。它解释 prelude provider 或 standalone init
之后发生了什么，以及遇到缺口时应该去哪里补信息。

## Prelude Provider 做什么

prelude-managed target 使用 provider profile：

- `harness/provider/effect-harness.provider.json`
- `.prelude/providers/effect-harness/provider.json`

prelude 负责 create/maintain、drift detection、组合多个 harness，以及记录 provider state。
`effect-harness` 负责提供稳定 profile、assets 和 verify/status 语义。

默认 profile 会贡献：

- `package.json` scripts/dependencies/devDependencies keys
- `tsconfig.json` 的 `@effect/language-service` plugin
- `.codex/skills/effect-code/`
- `.codex/skills/effect-feedback/`
- `.codex/agents/effect-worker.md`
- `AGENTS.md` 里的 managed harness block
- `.codex/effect-feedback/`

## Standalone Init 做什么

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
`.effect-harness.json` 记录 harness root、可执行 commands、route、source pin 和 package baseline，
只用于 standalone CLI compatibility。prelude-managed target 的长期状态在
`.prelude/providers/effect-harness/provider.json`。
需要派出 focused Effect subagent 时，使用 `.codex/agents/effect-worker.md`。

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
- `harness/provider/index.md`
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
