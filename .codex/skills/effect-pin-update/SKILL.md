---
name: effect-pin-update
description: Update the Effect harness source pin and package baseline. 适用于刷新 repos/effect、repos/effect.subtree.json、pnpm catalog/overrides、lockfile、baseline docs、TS CLI status/verify contract，或恢复本仓库里的 git subtree update failure。
---

# Effect Pin Update

只在 Effect harness repo 内使用这个 skill。official npm dist-tags 和 `Effect-TS/effect-smol`
是 source of truth；local docs、runtime contract 和 verifier 跟随它们。

## Workflow

1. 确认 repo 和 worktree：
   - run `git status --short --branch -uall`
   - run `pnpm effect:status`
   - 记录当前 `repos/effect.subtree.json` split 和 package baseline
2. 解析官方目标值：
   - `effect`、`@effect/platform-node`、`@effect/vitest`：npm `beta` dist-tag
   - `@effect/tsgo`、`@effect/language-service`、`@typescript/native-preview`：npm `latest` dist-tag
   - source split：`git ls-remote https://github.com/Effect-TS/effect-smol.git refs/heads/main`
3. 先尝试 harness update path：
   - run `pnpm effect:update`
   - 成功后继续 metadata sync
   - 如果失败并出现 `can't squash-merge: 'repos/effect' was never added`，使用 manual source sync path
4. Manual source sync path：
   - clone `https://github.com/Effect-TS/effect-smol.git` 到 temp directory
   - fetch 并 checkout 解析出的 source split
   - run `rsync -a --delete --exclude .git <temp-checkout>/ repos/effect/`
   - `repos/effect` 仍然只是 reference-only，不允许 application import
5. 同步 harness metadata：
   - 更新 `repos/effect.subtree.json` split 和 `packageBaseline`
   - 更新 `pnpm-workspace.yaml` catalog、`overrides.@effect/platform-node-shared`、`trustPolicyExclude`
   - 更新 `README.md`、`AGENTS.md`、`docs/effect-patterns/index.md` 的 baseline 和 split
   - 官方 guide surface 变化时，更新 `docs/effect-patterns/effect-v4-source-reference.md` 和
     `docs/effect-official-harness-inventory.md`
   - 更新断言 pinned version 的 tests；刻意模拟旧 baseline 的 drift cases 保留
6. 刷新 dependencies：
   - run `pnpm install`
   - pnpm 报 `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN` 时再 run `pnpm install`
7. Verify：
   - run `pnpm verify`
   - run `pnpm effect:status`，要求所有 row 都是 `current`

## Guardrails

- 不用 stale local docs 选择版本；先确认 live official tags。
- 不假设 `pnpm effect:update` 一定可用；这个 repo 可能缺 subtree trailers。
- 不自动 stage 或 commit，除非用户要求。
- `repos/effect/`、`repos/effect.subtree.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml` 和
  baseline docs 要一起保持可审核。
- beta API drift 破坏 target contract 时，先读更新后的 `repos/effect/LLMS.md` 和 source examples，
  再改 runtime contract、verifier 或 guardrails。
