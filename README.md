# Effect Harness

`effect-harness` 是一套给 TypeScript / Effect v4 beta 项目使用的本地 harness。

它不提供业务运行时 API，也不作为 npm 包发布。它集中维护 Effect 项目里需要机械保护的
工程合约：源码 pin、版本基线、官方 guide route、目标仓库 runtime、guardrails 和 verifier。

## 定位

这个仓库回答三个问题：

- 当前 Effect v4 beta 代码应该参考哪份真实源码？
- 一个目标项目应该如何接入 Effect 测试、effect-tsgo、CLI/runtime 入口和 guardrails？
- 当 Effect API 或本地实践发生变化时，哪些检查必须先失败，而不是靠人记住？

业务命令、领域模型、运行时编排和产品例子留在各自项目里。本仓库只提供可链接、可投递、
可验证的 harness contract。

## 当前基线

- `effect@4.0.0-beta.78`
- `@effect/platform-node@4.0.0-beta.78`
- `@effect/vitest@4.0.0-beta.78`
- `@effect/tsgo@0.14.0`
- `@effect/language-service@0.86.2`
- `@typescript/native-preview@7.0.0-dev.20260606.1`

目标项目应从安装依赖 import Effect API，不能从 `repos/effect/` import。

## 仓库内容

- `repos/effect/`：上游 Effect v4 beta 源码，只读参考。
- `repos/effect.subtree.json`：源码 pin manifest，记录仓库、分支、prefix、split 和基线。
- `bin/effect-harness.ts`：用户和目标仓库使用的 TS CLI 入口。
- `src/cli/`：Effect native CLI command 组装，使用 `effect/unstable/cli`。
- `src/harness/`：init、status、source pin、guardrails、target verify 的 typed harness logic。
- `src/platform/`：JSON、托管写入和 child process 边界。
- `docs/effect-patterns/`：官方 pin 路由表和本地约束入口。
- `docs/target-agent-guide.md`：给 agent 的目标仓库接入 guide。
- `docs/harness-feedback/`：项目实践反馈入口，只收纳官方 guide 覆盖不到的通用 harness 需求。
- `docs/harness-exposure.md`：harness 暴露边界。
- `docs/effect-official-harness-inventory.md`：pin 住的 Effect 仓库自带 LLM/harness 信息盘点。
- `.codex/skills/`：本仓库维护用 skills，不投递给目标仓库。
- `runtime/codex/`：`effect-harness init` 会投递到目标仓库的 Codex runtime。

## 用户使用

本地开发时先在本仓库注册一次 CLI：

```bash
pnpm link --global
```

然后在目标仓库里运行：

```bash
effect-harness init
pnpm install
pnpm effect:status
pnpm effect:verify
pnpm verify
```

`effect-harness init` 会写入目标仓库的 `.codex/` runtime、`AGENTS.md` route、
`.effect-harness.json`、`package.json` scripts 和 `tsconfig.json` plugin。

目标仓库不需要理解本仓库的内部 skills，只需要保留 init 写入的 runtime 和 scripts。

## Runtime 边界

| Surface | 用途 | 是否投递给 target |
| --- | --- | --- |
| `.codex/skills/effect-target-contract/` | 维护 init 产物、target verifier、目标仓库 runtime contract | 否 |
| `.codex/skills/effect-feedback-maintainer/` | 维护本仓库 feedback intake | 否 |
| `.codex/skills/effect-pin-update/` | 更新 `repos/effect`、baseline、lockfile、route docs | 否 |
| `runtime/codex/skills/effect-code/` | 目标仓库编写和审查 Effect code | 是 |
| `runtime/codex/skills/effect-feedback/` | 目标仓库记录可回传的实践反馈 | 是 |
| `runtime/codex/agents/effect-worker.md` | 目标仓库的 Effect worker 描述 | 是 |

## 常用命令

```bash
pnpm install
pnpm effect:status
pnpm effect:verify
pnpm verify
```

`pnpm effect:status` 会查询 npm dist-tags 和 `Effect-TS/effect-smol` 的远端
`main`，报告当前 pin 与官方最新 v4 beta / effect-tsgo 入口的差距。它默认只报告，不让日常
`pnpm verify` 因上游发布而漂移失败。

`pnpm effect:verify` 会检查 source pin，并对本仓库的 `bin/`、`src/`、`tests/`
运行 harness guardrails。它不生成 target project。

`pnpm verify` 会依次运行 self-verify、typecheck、script tests、lint 和 knip。

## Source Pin

上游源码来自 `Effect-TS/effect-smol`，以 squashed subtree 形式保存在 `repos/effect/`。

```bash
pnpm effect:verify
```

更新源码必须走显式命令：

```bash
pnpm effect:update
```

更新后要同步 `repos/effect.subtree.json` 里的 split，并重新跑 `pnpm verify`。
这个命令会走 `git subtree pull --squash`，因此会产生 subtree merge commit；只在准备
评审 source pin 更新时运行。

## 官方反馈环

目标项目应把 `@effect/tsgo` 作为官方 Effect LSP / TypeScript-Go setup 和 patch 入口：

```bash
pnpm exec effect-tsgo setup
pnpm exec effect-tsgo patch
pnpm typecheck
```

target contract 的主 typecheck 使用被 `@effect/tsgo` patch 后的 `tsgo --noEmit`。`effect-tsgo`
自身是 setup/patch 管理器，不接收 `--noEmit`。`tsc --noEmit` 只保留为对照命令。

如果本地文档、示例或 guardrails 与官方 Effect 文档、`repos/effect/LLMS.md`、
`repos/effect/` 源码或 `@effect/tsgo` 诊断冲突，以官方来源为准，再回头修正 harness。

## 维护与验证

本仓库不维护内部目标项目，也不在这里设计业务 example。harness 自身通过
TypeScript CLI、runtime contract 和 verifier 验证：

- 本仓库维护用 skills 放在 `.codex/skills/`，只服务于迭代 harness。
- 目标仓库 runtime 放在 `runtime/codex/`，由 `effect-harness init` 投递到目标仓库 `.codex/`。
- 目标仓库 contract 由 `effect-harness verify --target <repo> --harness <repo>` 检查。

业务项目可以把真实反馈带回 `effect-harness`，但业务语义不进入这个仓库。这里保留通用
Effect 控件，业务项目保留自己的命令、配置、例子和运行时规则。

边界说明见 [docs/harness-exposure.md](./docs/harness-exposure.md)。目标仓库接入入口是
`effect-harness init`；人工合并或审查 init 产物时使用
[docs/target-agent-guide.md](./docs/target-agent-guide.md)。
实践反馈入口见 [docs/harness-feedback/index.md](./docs/harness-feedback/index.md)；只有
官方 pin 里的 guide 不能覆盖、且能落成通用 harness 合约的反馈才进入这里。
