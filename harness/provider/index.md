# Prelude Provider Profile

本目录暴露给 Prelude 使用的最小 provider profile。它只描述 effect-harness 能给目标项目带来的
约束面，不直接实现目标项目 maintain。

当前真源：

- `harness/provider/effect-harness.provider.json`
- `repos/effect.subtree.json`
- `repos/effect/LLMS.md`
- `harness/offcial-guide.md`

## 两层对应

第一层是本仓建设层：effect-harness 维护 Effect 源入口实例、路线、provider profile 和 Effect
package 基线。

第二层是目标 harness 层：Prelude 读取 provider profile，在目标项目中维护 provider record、
package 基线、`tsconfig.json` language-service plugin 和诊断脚本。

Partita 负责 GitHub subtree pin 语义和 `repos/effect.subtree.json`；effect-harness 不复制这套
能力。Prelude 负责目标项目生命周期；effect-harness 不投影 Codex runtime 资产、反馈入口、目标
`AGENTS.md` blocks 或 `.effect-harness.json` state。

## 目标项目接收面

当前 provider target surfaces 只保留结构化指针：

- `package.json` dependencies and scripts
- `tsconfig.json` language-service plugin

目标项目可以接收 provider record 中的 source identity，但不接收 `repos/effect/` 本体。仍保留旧
`.codex` runtime files、effect-harness `AGENTS.md` 管理块或 `.effect-harness.json` state 的
provider records 都是旧状态，应按新 profile 重新生成。

## 编辑器策略

profile 把 source-entry editor policy 记录为数据。`repos/**` 的 auto-import exclusion 是默认硬边界。
watch/search exclusion 需要显式编辑器配置。文件隐藏是偏好项，不是默认项。VSCode 和 Zed 的配置
shape 分开记录。
