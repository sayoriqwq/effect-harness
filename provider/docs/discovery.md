---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 说明 Prelude 如何通过 provider discovery 消费 effect-harness provider artifact。
status: active
sources:
  - provider/effect-harness.provider.json
  - src/harness/ProviderDiscovery.ts
  - src/cli/Main.ts
updated: 2026-07-02
---

# Provider Discovery

## Interface

Prelude SHOULD 通过 package artifact 执行 discovery，而不是复制
`provider/effect-harness.provider.json` 到 Prelude 源码中维护。

稳定入口是：

```bash
npx --yes @sayoriqwq/effect-harness provider-discover
```

本仓 self-conformance 或本地调试 MAY 显式传入 artifact root：

```bash
node bin/effect-harness.ts provider-discover --harness .
```

discovery 输出是 machine-readable JSON。它从 provider profile 和 package manifest 派生，不是第二份
profile 真源。

## Shape

discovery envelope MUST 暴露 provider identity：

- provider id
- contract version
- provider version
- default profile
- selected profile

discovery envelope MUST 暴露 package locator：

- package name
- package version
- provider artifact root
- provider profile path
- package files
- discovery command

discovery envelope MUST 暴露 target-managed surfaces：

- provider record surface
- `package.json` contribution
- `tsconfig.json` contribution
- editor policy contribution
- lint policy contribution
- test policy contribution
- verification policy contribution
- docs bundle contribution
- snippets contribution

discovery envelope MUST 暴露 artifact-only references：

- Effect source tree identity
- Effect source contract identity
- Effect anchor doc identity
- Effect route doc identity
- tsgo source tree identity
- tsgo source contract identity
- tsgo anchor doc identity
- tsgo route doc identity

discovery envelope MUST 暴露 internal harness surfaces，使 Prelude 能明确这些内容只服务
effect-harness 本仓维护和 self-conformance。

## Prelude

Prelude 是 target lifecycle owner。Prelude SHOULD 把 discovery 输出转成自己的 provider record、
materialization plan、drift record 和 maintain/update 流程。

Prelude MUST NOT 把 provider profile 复制进 Prelude 代码并手写保持同步。

Prelude MUST NOT 把 artifact-only references 当作 target-managed files 投递。`repos/effect/`、
`repos/tsgo/`、subtree contracts、route docs 和 anchor docs 只随 provider artifact 保留，target record
只记录 source identity。

Prelude SHOULD materialize docs bundle 和 snippets，因为它们是 provider-managed contributions。

Prelude SHOULD materialize package、tsconfig、editor、lint、test 和 verification contributions，
并把它们纳入 target drift detection。

## Boundary

`provider-discover` 只做发现和声明。它不创建 `.prelude/**`，不修改 target 仓库，不运行
maintain lifecycle，也不替 Prelude 决定 conflict policy。

effect-harness 继续维护 provider artifact、source identity、strict tsgo policy、docs bundle 和
snippets。Prelude 继续维护 target lifecycle。
