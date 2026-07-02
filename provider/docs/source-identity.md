---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 target 如何接收 effect-harness provider-internal source pin 的 identity。
status: active
sources:
  - provider/effect-harness.provider.json
  - harness/source.md
  - repos/effect.subtree.json
  - repos/tsgo.subtree.json
updated: 2026-07-02
---

# Source Identity

## Model

effect-harness 在 provider 仓内部 pin 住 Effect 和 tsgo source entries。

target 不接收 source tree 本体。target 只通过 provider record 接收 artifact/source identity。

source tree、subtree contract、anchor docs 和 route docs 是 provider artifact reference。它们随
effect-harness package artifact 可供审计或 agent 读取，但 delivery mode 是 artifact-only。

## Target Record

provider record SHOULD 记录：

- provider id、contract version、provider version 和 profile。
- provider artifact identity。
- Effect source identity。
- tsgo source identity。
- managed surfaces 和 verification record id。

source identity 表示 provider 建设随着上游 source pin 住且可更新。它不是 target 本地源码目录。

## Boundary

target MUST NOT materialize `repos/effect/`、`repos/tsgo/`、`repos/effect.subtree.json` 或
`repos/tsgo.subtree.json`。

target delivery 只允许 identity-only 字段，例如 source name、contract path、GitHub ref 和 subtree
split。

source pin lifecycle 由 Partita 处理。effect-harness 维护 Effect/tsgo source identity 与 provider
artifact reference。target update 由 Prelude maintain 处理。
