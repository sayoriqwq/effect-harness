---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 effect-harness 如何在 harness 层与 provider 层实现官方 LLM source access 建议。
status: active
sources:
  - harness/offcial-guide.md
  - harness/source.md
  - harness/effect-routes.md
  - harness/provider/effect-harness.provider.json
  - repos/effect.subtree.json
  - repos/effect/LLMS.md
  - https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/
updated: 2026-07-01
---

# Official Migrate

## Scope

本文件说明 `harness/offcial-guide.md` 第一阶段在本仓的实现方式。

第一阶段只解决一个问题：agent 写 Effect 代码前，必须能读取本地 pinned Effect 真源，
并且不会把这份真源误当成应用代码或目标项目 runtime surface。

本文件分成两层：

- harness 层描述本仓库自己怎么运转。
- provider 层描述本仓交给 Prelude 集成 effect-harness 的内容。

本文件不定义通用 pin 流程。通用 GitHub subtree pin/status/update/verify 由 Partita 负责。

本文件不定义目标项目生命周期。目标项目 provider record、drift、verify 和 maintain 由 Prelude 负责。

## Layers

| 层级 | 读者 | 负责内容 | 主要文件 |
| --- | --- | --- | --- |
| Harness | 维护本仓的 agent 和人 | 本仓如何持有、读取、验证 Effect source。 | `repos/effect.subtree.json`、`repos/effect/`、`harness/source.md`、`harness/effect-routes.md`、`src/harness/**` |
| Provider | Prelude 和目标项目 maintain | 目标项目应该接收哪些 Effect baseline、诊断入口和 source identity。 | `harness/provider/effect-harness.provider.json`、`harness/provider/index.md` |

Harness 层可以读取 `repos/effect/` 本体。

Provider 层只能把 `repos/effect/` 表达为 identity 和 contract pointer。

Prelude 集成 effect-harness 时，MUST 读取 provider profile，而不是读取本仓 harness 文档来推断
target surfaces。

## Mapping

| 官方文章步骤 | Harness 实现 | Provider 输出 | 验证 |
| --- | --- | --- | --- |
| Stop Making Agents Guess | `repos/effect/` 提供真实 Effect 源码，`repos/effect/LLMS.md` 作为 LLM anchor。 | provider record 只保存 source identity。 | `pnpm effect:verify` 检查 anchor 和 import boundary。 |
| Source Code Available | `harness/effect-routes.md` 把源码、测试、ai-docs 和 package entry 整理成 agent route。 | target 不接收 route 本体，只接收 provider artifact identity。 | `pnpm effect:verify` 检查 route path。 |
| Git Subtree | `repos/effect.subtree.json` 声明 `kind: github-subtree`，`local.prefix: repos/effect`。 | provider profile 只引用 contract pointer。 | verifier 拒绝 gitlink、submodule 和 contract-only pin。 |
| Adding/Updating Subtree | `pnpm source:status`、`pnpm source:update`、`pnpm source:verify` 借用 Partita CLI。 | Prelude 不执行 source update。 | subtree commit 必须带 `git-subtree-split` trailer。 |
| Configuring Editor | subtree contract 记录 source editor policy。 | provider profile 声明 target editor policy options。 | provider verify 检查 auto-import block、watch/search 推荐和 files hide 偏好。 |
| Configuring Agent | `harness/source.md` 和 `harness/effect-routes.md` 明确只读参考、读取路线和禁止 import。 | provider profile 声明 target 不接收 runtime assets、feedback 和 managed `AGENTS.md` block。 | guardrails 扫描本仓应用/测试代码的 `repos/effect` import。 |
| Pattern Files | 当前阶段不生成零散 pattern files，先用 route table 指向上游 ai-docs、tests 和源码。 | provider profile 暂不声明 pattern file target surface。 | 后续 pattern 必须保持可验证来源。 |

## Harness

当前 source pin 的唯一契约是 `repos/effect.subtree.json`。

契约固定以下事实：

- `name` 是 `effect`。
- `kind` 是 `github-subtree`。
- `github.repository` 是 `Effect-TS/effect-smol`。
- `github.ref` 和 `subtree.split` 是 `3475ee6c2bda6b05c6d7a12ce30c8bb840b5b1a6`。
- `local.prefix` 是 `repos/effect`。
- `anchor.llmDocument` 是 `repos/effect/LLMS.md`。
- `agent.route` 是 `harness/effect-routes.md`。
- `boundaries.readOnly` 和 `boundaries.importBlock` 都是 `true`。

官方文章里的命令示例使用 `Effect-TS/effect`。本仓 v4 beta 基线当前 pin 的仓库是
`Effect-TS/effect-smol`，以 `repos/effect.subtree.json` 为准。

`harness/effect-routes.md` 是 agent 读取 pinned source 的路线表。

agent 写非平凡 Effect 代码前，SHOULD 先读 `repos/effect/LLMS.md`。

agent 查 API definition 时，SHOULD 读 `repos/effect/packages/effect/src/` 和对应 package entry。

agent 查行为和用法时，SHOULD 读 `repos/effect/packages/effect/test/`、
`repos/effect/packages/*/test/` 和 `repos/effect/ai-docs/src/`。

agent 写目标项目代码时，MUST 从已安装 package import，MUST NOT 从 `repos/effect` import。

Harness 层的验证入口是：

```bash
pnpm effect:verify
pnpm verify
```

`pnpm effect:verify` 会检查 source pin、provider profile、route、LLM anchor、package baseline
和 import boundary。

`pnpm verify` 会继续运行 `tsgo --noEmit`、tests、eslint 和 knip。

## Provider

`harness/provider/effect-harness.provider.json` 把 source pin 暴露为 provider-internal source entry。

provider profile 只复制 contract pointer，不复制 repository、branch、prefix、anchor 或 route 字段。

provider profile 的 target delivery 是 `identity-only`。

目标项目可以接收 provider record 中的 source identity。

目标项目 MUST NOT 接收 `repos/effect/`、`repos/effect.subtree.json` 或 `repos/effect/LLMS.md` 本体。

Provider 层交给 Prelude 的 target surfaces 是：

- provider record at `.prelude/providers/effect-harness/provider.json`。
- `package.json` dependency and devDependency structured pointers。
- `package.json` script pointer for `tsgo --noEmit`。
- `tsconfig.json` `@effect/language-service` plugin pointer。
- artifact/source identity fields for audit and drift。

Provider 层明确不交给 Prelude 的 target surfaces 是：

- provider repo internal source pin `repos/effect`。
- provider repo internal subtree contract `repos/effect.subtree.json`。
- provider repo internal Effect LLMS route `repos/effect/LLMS.md`。
- effect-harness runtime assets under `.codex`。
- effect-harness managed `AGENTS.md` block。
- `.effect-harness.json` standalone manifest。
- `.codex/effect-feedback` feedback intake。

Prelude 应该把 provider profile 当作 target maintain 的 contract。

Prelude 不应该把 harness 层文档、source route 或 pinned source 本体投影到目标项目。

## Editor

editor policy 是 source pin 的配套边界，不是目标项目的隐藏脚本。

auto-import exclude 是默认硬边界，因为目标项目应用代码不应该从 `repos/**` 生成 import。

watch exclude 和 search exclude 是推荐项，因为不同编辑器和用户对性能、搜索范围有不同偏好。

files exclude 是偏好项，因为有的人希望完全隐藏 `repos/**`，有的人希望它保持可见但不参与搜索和 import。

VSCode 和 Zed 的 setting shape 必须分开记录，MUST NOT 把 VSCode setting 直接投影到 Zed。

## Verification

Partita 对接完成后，source pin 的专用验证入口是：

```bash
pnpm source:status
pnpm source:verify
```

如果 `pnpm source:verify` 和 `pnpm effect:verify` 对 source contract 的判断冲突，
MUST 先修正 Partita contract/verifier 对齐，再更新本仓最小 provider route。
