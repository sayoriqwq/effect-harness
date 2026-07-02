---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 target 接入 effect-harness 后 editor policy contribution 的层级和边界。
status: active
sources:
  - provider/effect-harness.provider.json
  - harness/source.md
  - repos/effect.subtree.json
  - repos/tsgo.subtree.json
updated: 2026-07-02
---

# Editor Policy

## Boundary

editor policy 服务于 provider-internal source identity。

target SHOULD 接收 editor settings contribution，但 target MUST NOT 接收 provider source tree 本体。

`repos/**` 表示 provider artifact 内的 pinned source reference，不表示 target root 需要维护同名目录。

## Levels

auto-import exclusion 是 hard boundary。target editor SHOULD 排除 provider-internal source references，避免
应用代码从 pinned source tree 自动 import。

watch exclusion 是 recommended policy。target 可以按编辑器能力关闭 provider-internal source reference 的
file watching。

search exclusion 是 recommended policy。target 可以按编辑器能力关闭 provider-internal source reference 的
default search。

file visibility 是 preference。provider profile 只表达建议，不要求 target 隐藏所有 source identity。

## VSCode

VSCode projection SHOULD 设置 TypeScript 和 JavaScript auto-import exclude patterns。

VSCode projection SHOULD 设置 watcher 与 search exclusion。

VSCode projection MAY 设置 file visibility preference。

Effect source identity 当前 file visibility preference 是 enabled。

tsgo source identity 当前 file visibility preference 是 disabled。

## Zed

Zed projection SHOULD 使用 Zed 的 LSP settings shape 表达 auto-import exclusion。

Zed projection MAY 使用 file scan exclusions 表达 watch、search 或 visibility preference。
