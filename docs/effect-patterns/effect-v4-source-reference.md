# Effect v4 Source Reference

本仓库把上游 Effect v4 beta source pin 在 `repos/effect/`，让 agent 可以直接查看真实源码、
测试、示例和 LLM guide，不需要依赖 `node_modules` 或额外 clone。

## Contract

- `repos/effect/` 是只读 squashed subtree，来自 `Effect-TS/effect-smol`。
- `repos/effect/LLMS.md` 是上游 LLM coding guide。
- `repos/effect.subtree.json` 记录 repository、branch、prefix、split、LLM document path 和 package baseline。
- `pnpm effect:verify` 检查 source 是否存在、是否误用 gitlink/submodule、LLM doc 是否存在、
  package baseline 是否一致，以及应用代码是否 import 了 vendored source。
  如果 Git history 里有 subtree trailers，它会和 manifest split 对齐；如果没有 trailers，
  manifest split 就是当前 active source pin，验证时会打印 warning。
- `pnpm effect:status` 对比当前 pin、官方 npm dist-tags 和上游 source branch。
- `pnpm effect:update` 是显式更新入口。

当前选中的 split：

```text
09809f60f19ec98232f98b33e33e02ecb7e4fbd6
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

只有准备好处理 `git subtree pull --squash` 产生的 merge commit 时，才运行
`pnpm effect:update`。更新后：

1. 把新 split 写入 `repos/effect.subtree.json`。
2. 更新本文和 `docs/effect-patterns/index.md`。
3. 运行 `pnpm effect:verify`。
4. 如果 init 或 runtime contract 变化，用临时目标仓库验证 target contract。
