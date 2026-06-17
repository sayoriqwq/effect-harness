# Effect v4 Source Reference

本仓库把上游 Effect v4 beta source pin 在 `repos/effect/`，让 agent 可以直接查看真实源码、
测试、示例和 LLM guide，不需要依赖 `node_modules` 或额外 clone。

## Contract

- `repos/effect/` 是只读 managed copy，来自 `Effect-TS/effect-smol`。
- `repos/effect/LLMS.md` 是上游 LLM coding guide。
- `repos/effect.subtree.json` 记录 repository、branch、prefix、split、LLM document path 和 package baseline。
- `pnpm effect:verify` 检查 source 是否存在、是否误用 gitlink/submodule、LLM doc 是否存在、
  package baseline 是否一致，以及应用代码是否 import 了 pinned source。
  Git history 必须包含与 manifest split 对齐的 subtree trailer；manifest-only source pin 不通过验证。
- `pnpm effect:status` 对比当前 pin、官方 npm dist-tags 和上游 source branch。
- `pnpm effect:update` 是显式更新入口，会同步 source copy、manifest、workspace baseline
  和 baseline docs/tests。

当前选中的 split：

```text
95545bdc334f4cd27a14f3308e68114e5bed92f2
```

## How To Use It

source tree 只作为参考材料使用：

- 写非平凡 Effect code 前先读 `repos/effect/LLMS.md`
- 查 API definition 时读 `repos/effect/packages/effect/src/`
- 查用法示例时读 `repos/effect/packages/effect/test/` 和 `repos/effect/ai-docs/src/`
- 用 patched `tsgo --noEmit` 验证目标代码

Do not import from `repos/effect` in application or test code.

## Update Discipline

更新 source pin 是基础设施变更。先运行：

```bash
pnpm effect:status
```

只有准备好评审 source pin 与 package baseline 更新时，才从 clean worktree 运行
`pnpm effect:update`。这个命令会同步 `repos/effect/`、`repos/effect.subtree.json`、
`pnpm-workspace.yaml` 和 baseline projection 文件。更新后：

1. 运行 `pnpm install`。
2. 评审 source pin、package baseline 和 docs/tests diff。
3. 提交带 `git-subtree-dir` / `git-subtree-split` trailer 的 source pin commit。
4. 运行 `pnpm verify`。
5. 运行 `pnpm effect:status`，确认 official status current。
6. 如果 init 或 runtime contract 变化，用独立目标仓库验证 target contract。
