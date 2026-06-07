---
name: effect-target-contract
description: Maintain the target-repo contract for effect-harness itself. Use inside this repo when changing the TS CLI init command, target verifier, target runtime, or AGENTS route fragment. Not for updating the official Effect pin, collecting practice feedback, or writing application Effect code.
---

# Effect Target Contract

这个 skill 只服务本仓库维护者。它的职责是维护目标仓库 contract：
`effect-harness init` 产物、target verifier、`runtime/codex/` 和 AGENTS route fragment
要彼此一致。

它不是用户 runtime，也不是 target repo 应安装的 skill。

## Boundary

| Task | Use |
| --- | --- |
| 修改 `effect-harness init`、target verifier、目标仓库 runtime、AGENTS route | this skill |
| 更新 `repos/effect`、package baseline、lockfile、baseline docs | `.codex/skills/effect-pin-update/` |
| 判断真实项目踩坑是否进入 harness feedback | `.codex/skills/effect-feedback-maintainer/` |
| 编写 Effect application code | `repos/effect/LLMS.md` 和 `repos/effect/ai-docs/src/` |
| 设计业务 example 或目标项目形态 | target repo，不在这里 |

## Workflow

1. 读 harness contract，而不是本地教程：
   `README.md`、`docs/effect-patterns/index.md`、
   `docs/effect-official-harness-inventory.md`、`docs/harness-exposure.md`、
   `docs/target-agent-guide.md`、`docs/harness-feedback/index.md`、`repos/effect.subtree.json`。
2. 修改目标仓库接入面时，同时检查：
   - `bin/effect-harness.ts`
   - `src/cli/`
   - `src/harness/`
   - `src/platform/`
   - `runtime/codex/`
   - `docs/target-agent-guide.md`
   - `README.md`
   - `tests/*.test.ts`
3. 如果 init 产物变化，更新 tests 覆盖临时 target。
4. 如果 verifier contract 变化，更新 target verifier tests。
5. 验证：`pnpm test`、`pnpm verify`、`pnpm effect:status`。

## Rules

- 优先使用 official capability。`@effect/tsgo` 或 upstream Effect 已提供的能力，只 expose/route。
- 不运行 `pnpm effect:update`。source pin 更新属于 `.codex/skills/effect-pin-update/`。
- 不把官方 guide 已覆盖的主题写成本地 Effect tutorial。
- 不把 target 的业务 example、项目形态或分发细节带进本 repo。
- 不把本仓库 `.codex/skills/` 投递给 target repo；target 只接收 `runtime/codex/`。
- 不默认提升 upstream maintainer-only facilities：`repos/effect/AGENTS.md`、
  `repos/effect/.agents/skills/*`、`repos/effect/.specs/*`、package-specific machinery。
- 不给 target 添加本地 dispatcher scripts；只暴露 direct verifier contracts。
