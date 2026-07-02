---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 target 接入 effect-harness 后哪些 surface 受管、哪些只是 artifact reference。
status: active
sources:
  - provider/effect-harness.provider.json
  - provider/docs/index.md
  - harness/feedback-loop.md
updated: 2026-07-02
---

# Managed Surfaces

## Target-Managed

target-managed surfaces 是 exported harness 的本地投影。

provider record、package baseline、`tsconfig.json` projection、editor settings projection、docs bundle、
snippets、lint policy、test policy 和 verification policy 都属于 target 应记录的 provider-managed
能力。

target 修改这些 surface 后，Prelude maintain SHOULD 区分 local drift、provider update 和 base match。

## Artifact-Only

source identity、source pin contract、route docs 和 upstream source references 是 provider artifact
reference。

target 可以通过 provider record 读取 source identity，但 target MUST NOT 接收 provider-internal source
tree、subtree contract 或 route docs 本体。

## Snippets

snippet 是 provider-managed source content。

effect-harness 可以提供 snippet contribution，但 effect-harness MUST NOT 直接管理 target `AGENTS.md`
block。

target-local agent policy 可以 include、copy 或改写 snippet，并由 target owner 决定本地落点。

## Feedback Loop

verification policy 的 completion gate 是 `pnpm verify`。

provider docs bundle 说明如何定位失败 stage、diagnostic layer 和受管 surface。

feedback loop semantics 用于判断下一步读哪个 provider doc，不表示 effect-harness 接管 Prelude
target lifecycle。
