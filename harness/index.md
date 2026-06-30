# Harness Index

本仓的当前职责很窄：维护一个 pinned Effect source-entry、一个 Effect v4 beta package baseline、
一个 Prelude provider profile，以及 target baseline verifier。

## 入口表

| 意图 | 先读 | 真源 | 验证 |
| --- | --- | --- | --- |
| 理解已批准的 source-entry 计划 | `harness/offcial-guide.md` | official guide brief | n/a |
| 查看 Effect source pin contract | `harness/source.md` | `repos/effect.subtree.json`、`repos/effect/LLMS.md` | `pnpm effect:verify` |
| 按 agent 意图读取 Effect 源码 | `harness/effect-routes.md` | `repos/effect/LLMS.md`、`repos/effect/packages/**`、`repos/effect/ai-docs/src/**` | `pnpm effect:verify` |
| 更新 Effect source pin | `harness/source.md` | upstream Effect repo 和 npm dist-tags | `pnpm verify`、subtree trailers |
| 查看 Prelude provider shape | `harness/provider/index.md` | `harness/provider/effect-harness.provider.json` | `pnpm effect:verify` |
| 验证 target repo baseline | CLI `verify --target` | package baseline、tsgo config、guardrails | target `pnpm effect:verify` |

## 边界

- 业务代码和测试代码禁止从 `repos/effect` import。
- 本仓不再分发 Codex skills 或 target runtime assets。
- `.effect-harness.json`、旧 effect-harness `.codex` assets、feedback intake、effect-harness
  `AGENTS.md` managed blocks 都是 legacy state，应从 target 中移除。
- Prelude 负责 target lifecycle。effect-harness 只暴露 provider identity、source identity、package
  baseline 和 verifier expectations。
- Partita 负责通用 source-entry pin workflow。
