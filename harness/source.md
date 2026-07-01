# Effect v4 源入口

本仓库把上游 Effect v4 beta 源码 pin 在 `repos/effect/`，让 agent 可以直接查看真实源码、
测试、示例和 LLM guide，不需要依赖 `node_modules` 或额外 clone。

这是 provider 仓内部的 GitHub subtree 源入口。目标项目不接收也不维护 `repos/effect`、
`repos/effect.subtree.json` 或 provider 仓的 `repos/effect/LLMS.md` 本体。

## 契约

- `repos/effect/` 是只读 managed copy，来自 `Effect-TS/effect-smol`。
- `repos/effect/LLMS.md` 是上游 LLM coding guide。
- `repos/effect.subtree.json` 是 Partita 管理的 GitHub subtree pin 契约，记录 GitHub repo、
  branch/ref、本地 prefix、split、LLM 文档路径、agent route、editor policy 和边界。
- package 基线不放在 subtree 契约里；它由 `harness/provider/effect-harness.provider.json` 持有。
- `harness/provider/effect-harness.provider.json` 把这份源入口暴露为
  `sourceEntries.effect-official-source`，供 Prelude provider identity 使用。
- `pnpm effect:verify` 检查 source 是否存在、是否误用 gitlink/submodule、LLM doc 是否存在、
  provider package 基线是否一致，以及应用代码是否 import 了 pinned source。
  Git history 必须包含与 contract split 对齐的 subtree trailer；只改 contract 的源入口 pin 不通过验证。
- `pnpm source:status`、`pnpm source:update`、`pnpm source:verify` 借用 Partita GitHub subtree CLI。

当前选中的 split：

```text
3475ee6c2bda6b05c6d7a12ce30c8bb840b5b1a6
```

## 使用方式

源码树只作为参考材料使用：

- 写非平凡 Effect code 前先读 `repos/effect/LLMS.md`
- 查 API definition 时读 `repos/effect/packages/effect/src/`
- 查用法示例时读 `repos/effect/packages/effect/test/` 和 `repos/effect/ai-docs/src/`
- 用 `tsgo --noEmit` 验证目标代码

应用代码和测试代码禁止从 `repos/effect` import。

## Prelude 边界

`effect-harness` 负责这份源入口实例。Prelude 负责目标项目生命周期。两者之间的桥是 provider
profile：

- provider profile 引用 subtree contract，并暴露 package 基线。
- provider record 可以保存 artifact/source identity，用于 drift 与审计。
- 目标项目 managed surfaces 是 package、script 和 `tsconfig.json` 指针。
- 目标项目 managed surfaces 不包含 provider 仓内部源入口 pin 本体。
- 目标项目 managed surfaces 不包含 effect-harness runtime 资产、反馈入口或
  effect-harness 管理的 `AGENTS.md` block。

这份源入口的 editor policy 是 provider profile 的 options 数据。`repos/**` 的 auto-import exclude
是默认硬边界；watch/search exclude 是推荐项，需要按编辑器显式配置；文件隐藏是用户偏好，不作为默认。
VSCode 和 Zed 的 setting shape 在 provider profile 中分别记录。

## 更新纪律

更新源入口 pin 是基础设施变更。先运行：

```bash
pnpm source:status
```

只有准备好评审源入口 pin 与 package 基线更新时，才从干净工作区走 Partita GitHub subtree 流程和
显式 git subtree 更新。更新后：

1. 运行 `pnpm install`。
2. 评审源入口 pin、package 基线和 route/profile diff。
3. 提交带 `git-subtree-dir` / `git-subtree-split` trailer 的源入口 pin commit。
4. 运行 `pnpm verify`。
5. 运行 `pnpm source:verify`。
