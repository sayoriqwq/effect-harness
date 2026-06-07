# Harness Exposure Boundary

这个仓库是 Effect harness repo，不是下游项目生成器。

本仓库对外暴露的内容只有稳定 harness contract：

- pin 官方 Effect source 和 package baseline
- 对比官方 drift
- 路由 agent 到官方 Effect guide
- 投递 target runtime、skills 和 AGENTS route
- 提供 guardrails 和 verifier
- 接收可复用的 target practice feedback

业务示例、项目形态、产品命令和本地分发细节属于目标仓库。本仓库只保留通用 harness contract。

## Target Entry

目标仓库入口是：

```bash
effect-harness init
```

本地开发时，先在本仓库执行一次：

```bash
pnpm link --global
```

目标仓库不需要理解本仓库内部目录。`effect-harness init` 负责写入 target runtime、scripts、
`AGENTS.md` route、`.effect-harness.json` 和 `tsconfig.json` plugin。

| Facility | 目标仓库用法 | 本仓库职责 |
| --- | --- | --- |
| Init CLI | `effect-harness init` | 投递目标仓库 `.codex` runtime、AGENTS route、scripts、tsconfig plugin |
| Official guide route | 目标仓库 `.codex/skills/effect-code` 读取 `repos/effect/LLMS.md` | 保持 source pin 和 route table |
| Target verifier | 目标仓库 `pnpm effect:verify` | 验证通用 target contract |
| Guardrails | 目标仓库 `pnpm effect:verify` 内部调用 | 捕获过时或危险 Effect pattern |
| Official status | 目标仓库 `pnpm effect:status` | 报告 pin 与官方最新状态 |
| Feedback runtime | 目标仓库 `.codex/skills/effect-feedback` | 记录可回传 feedback |

[Target Agent Guide](./target-agent-guide.md) 是人工合并和审查 init 产物的参考。主机制是 CLI。

## Official Inputs

优先使用官方来源：

- `repos/effect/LLMS.md`：Effect application coding 的 authoritative guide。
- `repos/effect/ai-docs/src/`：`LLMS.md` 背后的 source examples。
- `repos/effect/migration/v3-to-v4.md`：v3-to-v4 migration map。
- `@effect/tsgo`：官方 LSP / TypeScript-Go diagnostics、setup/patch 路径。

不要默认暴露 upstream maintainer-only facilities：
`repos/effect/AGENTS.md`、`repos/effect/.agents/skills/*`、`repos/effect/.specs/*`、以及
package-specific docgen/release/validation machinery。

## Local Harness Inventory

- `repos/effect.subtree.json`：source pin 和 package baseline manifest。
- `bin/effect-harness.ts`：目标仓库使用的 TS CLI。
- `src/cli/`：Effect native command layer。
- `src/harness/`：source pin、official status、AST guardrails、target verifier、init contract。
- `src/platform/`：JSON、file writes、child process boundary。
- `eslint.config.mjs`：本仓库快速 lint feedback，覆盖直接 banned import / member access。
- `.codex/skills/`：本仓库维护用 skills，不投递给目标仓库。
- `runtime/codex/`：投递给目标仓库的 Codex runtime。
- `docs/effect-patterns/`：官方 route index 和本地 contract 入口。
- `docs/target-agent-guide.md`：人工合并和审查 init 产物的 guide。
- `docs/harness-feedback/`：feedback intake。
- `docs/effect-official-harness-inventory.md`：pin 住的官方 LLM/harness 信息盘点。

## Exposure Routes

| Route | 本仓库职责 | 是否投递给 target |
| --- | --- | --- |
| `AGENTS.md` guidance | 声明 source precedence、hard boundaries、validation commands | 通过 init 写入片段 |
| Skills | 保存本仓库维护 workflow，并提供目标仓库 runtime skill 模板 | 目标仓库只接收 `runtime/codex` |
| Target scripts | 写入短维护命令：`effect:status`、`effect:verify` | 是 |
| Harness feedback | 捕获官方 docs 覆盖不到的 target-practice gaps | target 先写本地反馈条目 |
| Effect worker descriptor | 提供 target Effect worker 描述 | 是 |

## Runtime Boundaries

| Runtime | Role | Exposed to target |
| --- | --- | --- |
| `.codex/skills/effect-target-contract/` | maintain init output, verifier, target runtime | no |
| `.codex/skills/effect-feedback-maintainer/` | maintain harness feedback intake | no |
| `.codex/skills/effect-pin-update/` | update official pin and baseline | no |
| `runtime/codex/skills/effect-code/` | target Effect coding/review skill | yes |
| `runtime/codex/skills/effect-feedback/` | target feedback capture skill | yes |
| `runtime/codex/agents/effect-worker.md` | target Effect worker descriptor | yes |

## Promotion Gate

新增 exposure route 前必须回答：

1. 官方 Effect 或 `@effect/tsgo` 是否已经提供能力？
2. 哪个 pinned upstream artifact 能证明？
3. 它是 authoritative guide、reference-only，还是 upstream maintainer-only machinery？
4. 这是 reusable harness contract，还是业务项目自己的项目形态或示例问题？
5. drift 时哪个 verifier 会失败？

只有通过这个边界的内容才进入本仓库。业务项目自己的生成逻辑和示例不放在这里。
