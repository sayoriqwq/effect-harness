# Effect Harness Route

这是 `effect-harness` 的根 route。它只负责告诉读者去哪里；详细 contract 放在 `harness/`。

## Layers

| Layer | Audience | Role |
| --- | --- | --- |
| `guide/` | humans | 解释 setup、默认补充能力和 feedback flow。 |
| `harness/` | agents | 定义 contracts、provider profile、source-entry policy、managed surfaces、feedback 和 verification。 |
| `src/` | maintainers | 实现 CLI、verifier、guardrails 和 publish flow。 |
| `repos/effect/` | humans and agents | Pinned official Effect source。 |
| `.codex/skills/` | repo-local agents | 只维护本仓库；不投递给 targets。 |

`guide/` 可以解释为什么。`harness/` 必须明确 agent 读什么、改什么、避免什么、验证什么。

## Entry Points

- Human setup guide: `guide/setup.md`
- Agent contract index: `harness/index.md`
- Prelude provider profile: `harness/provider/index.md`
- Target setup contract: `harness/target-agent-contract.md`
- Official Effect guide: `repos/effect/LLMS.md`
- Source pin policy: `harness/source.md`

## Target Repos

Target repos 不复制 `HARNESS.md`。它们只接收：

- `AGENTS.md` route fragment
- prelude-managed provider state at `.prelude/providers/effect-harness/provider.json`
- provider record `surfaces[]` 声明的 provider-owned runtime assets
- `.codex/effect-feedback/` 和 `.codex/effect-feedback/.gitkeep`，用于 local feedback evidence

Target repos 不接收 provider repo 内部的 `repos/effect` source pin 本体，除非 provider contract
显式声明该 surface。

authoritative harness route 留在本仓库。
