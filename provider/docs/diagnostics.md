---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明接入 effect-harness 后 target 内 strict tsgo diagnostic gate 的受管口径。
status: active
sources:
  - provider/effect-harness.provider.json
  - harness/tsgo.md
  - repos/tsgo/README.md
updated: 2026-07-02
---

# Diagnostics

## Commands

target 的 Effect diagnostics 主路径是：

```bash
tsgo --noEmit
```

target 的 native backend 准备命令是：

```bash
effect-tsgo patch
```

Prelude materialization 应通过 provider profile 维护这些 script 指针。

## Gate

strict profile 要求 `tsgo --noEmit` 达到 0 error、0 warning、0 suggestion、0 message。

`@effect/language-service` plugin MUST 保持 provider profile 声明的 strict v4 policy。

target SHOULD 修复 diagnostics。target SHOULD NOT 用 local override、diagnostic suppress 注释或
降级 rule map 绕过 provider gate。

## Drift

`package.json`、`tsconfig.json`、provider record、docs bundle 和 snippets 都是 provider-managed
surface。

target 修改这些 surface 后，Prelude maintain 应区分本地 drift、provider update 和可自动更新的
base match。
