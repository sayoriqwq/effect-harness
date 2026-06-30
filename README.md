# Effect Harness

`effect-harness` 是给 TypeScript / Effect v4 beta 项目使用的 Effect 语义、资产和验证
harness。它可以通过 prelude first-party maintain provider 接入，也保留本仓库 CLI 作为
standalone/dogfood wrapper。

它维护目标项目共享的工程合约：

- provider-internal pinned official Effect source entry
- package baseline
- prelude first-party provider profile and managed surfaces
- standalone `effect-harness init` 投递的 target runtime
- guardrails 和 verifier
- 可以提升为通用 harness contract 的 practice feedback

它不提供业务 runtime API、产品示例、目标项目形态或 release ritual。

## Current Baseline

当前 Effect package baseline 以 [repos/effect.subtree.json](./repos/effect.subtree.json) 为准。

应用代码和测试代码必须从安装依赖 import Effect API，不能从 `repos/effect/` import。

## Routes

- [HARNESS.md](./HARNESS.md)：仓库层级总 route。
- [guide/](./guide/)：给人读的 setup 和 feedback guide。
- [harness/](./harness/)：给 agent 读的 contract、source-entry policy、managed surfaces、feedback 和 target setup rules。
- [harness/provider/](./harness/provider/)：prelude first-party maintain provider profile、source identity、资产清单和组合边界。
- [repos/effect/LLMS.md](./repos/effect/LLMS.md)：pinned official Effect coding guide。
- [repos/effect.subtree.json](./repos/effect.subtree.json)：source pin 和 package baseline manifest。

## Prelude Provider

prelude 正式接入时读取 [harness/provider/effect-harness.provider.json](./harness/provider/effect-harness.provider.json)。
长期 target state 由 prelude 写入：

```text
.prelude/providers/effect-harness/provider.json
```

`.effect-harness.json` 只保留给 standalone CLI / dogfood compatibility，不再是长期
source of truth。

`effect-harness verify --target .` 会优先通过 `.prelude/manifest.json` 的 `maintainProviders`
找到 `effect-harness` provider record。兼容期也可以显式传
`--provider-record .prelude/providers/effect-harness/provider.json`。

默认 profile 是 `codex-effect-v4`：Codex runtime、Effect v4 beta baseline、provider-internal
`effect-official-source` identity、patched `tsgo --noEmit`、`@effect/language-service`、
`floatingEffect=error`、managed `AGENTS.md` block、provider `surfaces[]`、editor policy options
和 verify/status workflow 语义。

## Target Setup

prelude-managed target 应由 prelude create/maintain 写入 key-level contributions 和 provider
state。本仓库 CLI 仍可用于 standalone/dogfood。使用 CLI 时本地先 build 并 link：

```bash
pnpm build
pnpm link --global
```

然后在目标仓库运行：

```bash
effect-harness init
pnpm install
pnpm effect:status
pnpm effect:verify
pnpm verify
```

`effect-harness init` 会写入 target-local scripts、`.effect-harness.json`、`tsconfig.json`
plugin、`AGENTS.md` route block，以及 standalone compatibility runtime assets。
这条路径不是 prelude formal provider state。

人类 setup 说明读 [guide/setup.md](./guide/setup.md)。agent setup 和审查规则读
[harness/target-agent-contract.md](./harness/target-agent-contract.md)。

## Commands

```bash
pnpm install
pnpm effect:status
pnpm effect:verify
pnpm verify
```

`pnpm effect:status` 报告 official npm/source drift；上游发布新 beta 不会让日常 verify
自动失败。

`pnpm effect:verify` 检查 committed Effect source pin、provider profile contract、harness
guardrails 和测试 contract。

`pnpm verify` 运行 self-verify、typecheck、tests、lint 和 knip。

Partita 拥有 external source-entry semantics。`effect-harness` self-verify 验证
provider profile/source-entry contract；target runtime assets 是 provider-owned surfaces，
不是外部投影生成物。prelude target 接收 provider record `surfaces[]` 声明的 runtime assets，
不接收 provider repo 内部的 `repos/effect` source pin 本体。

## Source Pin

official source pin 是 provider repo 内部 source entry，materialized at `repos/effect/`。完整更新规则见
[harness/source.md](./harness/source.md)。

检查当前状态：

```bash
pnpm effect:status
```

更新 source pin 时按 [harness/source.md](./harness/source.md) 执行。

## Publish

`pnpm publish:npm` 运行 `effect-harness publish`。这是本仓库自己的 npm 发包流程，用于
分发 `effect-harness` CLI；它不定义、不投递 target repo 的 publish 或 release ritual。

发布流程会验证仓库，以 Effect finalizer 保护的临时 package version 生成 tarball，然后调用
npm publish。dry-run 也必须恢复 `package.json`，不能留下临时 version。

常用参数：

- `--version`
- `--tag` / `--npm-tag`
- `--dry-run`
- `--provenance`

GitHub workflow 是 `.github/workflows/publish-npm.yml`，只支持 manual `workflow_dispatch`。
真实发布需要配置其中一种 npm authentication：

- GitHub secret `NPM_TOKEN`
- npm Trusted Publisher：owner `sayoriqwq`，repo `effect-harness`，workflow filename
  `publish-npm.yml`，allowed action `npm publish`

npm 包名是 `@sayoriqwq/effect-harness`，bin name 保持 `effect-harness`。tarball 会包含
`repos/effect/`；这是有意的 package exposure，用于随 CLI 分发 pinned official Effect
source/reference、`repos/effect/LLMS.md` route 和 `repos/effect.subtree.json` baseline，而不是
无意打包上游工作树。target repo 不接收本仓 publish 流程；prelude-managed target 通过 provider
profile 接收 runtime assets，standalone target 可以继续通过 `effect-harness init` 接收 runtime。
