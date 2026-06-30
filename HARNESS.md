# Effect Harness Route

本仓当前只有一个职责：维护 pinned official Effect source-entry 的 provider profile、agent route
表和最小可验证 baseline。

## 真源

- `harness/offcial-guide.md` 是仓内 guide 唯一真源。
- `repos/effect.subtree.json` 是 source-entry 与 package-baseline manifest。
- `.partita/source-entries.json` 是 Partita 管理的 generic source-entry contract。
- `repos/effect/LLMS.md` 是 pinned 上游 Effect LLM guide。
- `harness/effect-routes.md` 是 agent 读取 `repos/effect/` 的路线表。
- `harness/provider/effect-harness.provider.json` 是最小 Prelude provider profile。

Partita 负责通用 source-entry pin workflow。本仓只拥有 Effect 这个具体实例。

## 已移除表面

新 baseline 不包含 repo-local Codex skills、target runtime templates、feedback intake、target
`AGENTS.md` managed block，也不保留 `.effect-harness.json` standalone state。旧文件可以从 git
history 查，但不是当前真源。

## 验证

```bash
pnpm effect:verify
pnpm verify
```

`pnpm effect:verify` 只验证 provider 仓自身。`pnpm source:status`、`pnpm source:update`、
`pnpm source:verify` 借用 Partita source-entry CLI。Target repository 由 Prelude provider
maintain/verify；effect-harness 不向 target 投影 runtime assets。
