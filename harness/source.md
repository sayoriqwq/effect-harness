---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 描述 effect-harness provider-internal source entries 与 source boundary。
status: active
sources:
  - repos/effect.subtree.json
  - repos/tsgo.subtree.json
  - harness/effect-routes.md
  - harness/tsgo-routes.md
  - provider/effect-harness.provider.json
updated: 2026-07-01
---

# Source Entries

## Contract

本仓有两棵 provider-internal GitHub subtree source entries：

| Name | Contract | Prefix | Anchor | Route | Split |
| --- | --- | --- | --- | --- | --- |
| `effect` | `repos/effect.subtree.json` | `repos/effect` | `repos/effect/LLMS.md` | `harness/effect-routes.md` | `e11cccc7d5fe631abccc7d6e3bd296938de0fa2e` |
| `tsgo` | `repos/tsgo.subtree.json` | `repos/tsgo` | `repos/tsgo/README.md` | `harness/tsgo-routes.md` | `43ed476270fb3cf78fe7afac2086d67340ca0486` |

两份 contract 都采用 Partita GitHub subtree pin shape：

- `github.repository` 必须是 GitHub HTTPS URL。
- `mechanism` 固定为 `git-subtree`。
- `local.prefix` 是 provider 仓内部只读 source prefix。
- `subtree.split` 必须等于 `github.ref`。
- `subtree.trailer` 必须记录同一个 split。
- `ownership.mode` 固定为 `provider`。
- `boundaries.readOnly` 和 `boundaries.importBlock` 都是 `true`。

## Boundary

source entries 只给 agent 和本仓 verifier 读取，不投影到目标项目。

目标项目可以接收 provider record 里的 source identity，但不接收 `repos/effect/`、`repos/tsgo/`
或 subtree contract 本体。

本仓应用代码和测试代码禁止从 `repos/effect` 或 `repos/tsgo` import。

## Editor

source entry 的 editor policy 是 contract 和 provider profile 的数据。

`repos/**` auto-import exclude 是默认硬边界。

watch/search exclude 是推荐项，需要按编辑器显式配置。

files exclude 是用户偏好。Effect source entry 当前记录为 `enabled`，tsgo source entry 当前记录为
`disabled`，因为 tsgo route/policy 迁移期间需要保持 source tree 可见。

VSCode 和 Zed setting shape 分开记录。

## Commands

通用 source pin 流程由 Partita 提供：

```bash
pnpm source:status
pnpm source:update
pnpm source:verify
```

Partita 已发布为 `@sayoriqwq/partita@0.1.0`，bin 为 `partita`，source pin 子命令面是
`partita pin plan/status/verify/add/update`。本仓 `source:*` scripts 和 provider-facing command
strings 直接走 npm 包入口：

```bash
npx --yes @sayoriqwq/partita pin status --name effect --prefix repos/effect --contract repos/effect.subtree.json
npx --yes @sayoriqwq/partita pin update --name effect --prefix repos/effect --contract repos/effect.subtree.json --dry-run
npx --yes @sayoriqwq/partita pin verify --name effect --prefix repos/effect --contract repos/effect.subtree.json
```

`source:update` 当前仍是 dry-run 更新计划。真实 source pin 更新必须提交包含
`git-subtree-dir` / `git-subtree-split` trailer 的 commit。

完成态验证入口是：

```bash
pnpm verify
```

`pnpm verify` 的 `source-pins` stage 会调用 Partita pin verifier。`harness-contract` stage 会继续
检查 source prefix、Git tree entry、subtree trailer、anchor、route、provider profile、
package baseline 和 import boundary。
