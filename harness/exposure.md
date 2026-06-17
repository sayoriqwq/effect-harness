# Harness Exposure Boundary

这份文件定义 `effect-harness` 允许向外暴露什么。

本仓库只暴露稳定、business-neutral 的 harness contract：

- pinned official Effect source 和 package baseline
- official source drift status
- `effect-harness init` 投递的 target runtime
- target `AGENTS.md` route fragment
- guardrails 和 verifier contracts
- reusable practice feedback intake

它不暴露 target business examples、product semantics、project shape、local distribution machinery
或 upstream maintainer-only workflow。

`publish` 只服务本仓库 npm package / CLI 分发，不是 target repo ritual。npm tarball 包含
`repos/effect/` 是有意暴露：CLI、verifier、target route 和 agent 都需要 pinned official
source/reference 与 `repos/effect.subtree.json` 保持同包可读。

## Allowed Exposure

| Surface | 是否投递给 target | Contract owner |
| --- | --- | --- |
| `repos/effect/LLMS.md` route | 是，作为 reference | official Effect source |
| `harness/runtime/codex/` | 是，由 init 复制 | `effect-harness` |
| `effect:status` / `effect:verify` scripts | 是，由 init 写入 | `src/harness/Init.ts` |
| `.effect-harness.json` | 是，由 init 写入 | target verifier |
| `harness/feedback/index.md` | 不直接复制 | harness maintainers |
| `.codex/skills/` | 否 | repo-local maintenance only |

Target setup 细节见 [target-agent-contract.md](./target-agent-contract.md)。
Official source classification 见 [official-inventory.md](./official-inventory.md)。

## Promotion Gate

新增 exposure route 前必须回答：

1. official Effect source 或 `@effect/tsgo` 是否已经提供 semantic rule 或 diagnostic？
2. 哪个 pinned upstream artifact 能证明？
3. 证据来自 external target，还是 harness-as-target practice？
4. 这是 reusable harness contract，而不是 target business shape 吗？
5. landing 是 guide、route、target runtime、guardrail、verifier 还是 repo-local skill？
6. 后续 drift 由哪个 verifier 或 review path 捕获？

只有通过这个 gate 的内容才属于本仓库。
