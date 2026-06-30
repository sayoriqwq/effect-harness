# Harness Contract Index

这是 agent-facing route table。给人读的说明在 `guide/`。

## Route Matrix

| Incoming intent | Read first | Authority | Action surface | Verify | Feedback path |
| --- | --- | --- | --- | --- | --- |
| Setup prelude-managed target repo | `harness/provider/index.md` | `harness/provider/effect-harness.provider.json`, provider `sourceEntries.effect-official-source`, `repos/effect.subtree.json`, `repos/effect/LLMS.md` | prelude provider record, managed surfaces, runtime assets declared by `surfaces[]` | target `pnpm effect:verify`, `pnpm verify` | target `.codex/effect-feedback/` |
| Setup standalone target repo | `harness/target-agent-contract.md` | `repos/effect.subtree.json`, `repos/effect/LLMS.md` | `effect-harness init` compatibility runtime | target `pnpm effect:verify`, `pnpm verify` | target `.codex/effect-feedback/` |
| Write or review Effect code | target `AGENTS.md`, provider runtime asset routes | `repos/effect/LLMS.md`, `repos/effect/ai-docs/src/`, patched `tsgo --noEmit` | target source/tests | target `pnpm verify` | target `.codex/effect-feedback/` |
| Inspect default harness capability | `harness/default-capabilities.md` | landed feedback plus verifier/guardrail | provider profile, guardrails, verifier | `pnpm effect:verify` | `harness/feedback/index.md` |
| Report recurring practice gap | `harness/feedback/index.md` | official source coverage check | target `.codex/effect-feedback/` or harness feedback entry | landing-specific | promote to guide/runtime/verifier |
| Update official source pin | `harness/source.md` | `repos/effect.subtree.json`, official remote/npm tags | `repos/effect/`, package baseline files | subtree trailer, `pnpm verify`, `pnpm effect:status` | source update notes |
| Maintain harness implementation | `harness/exposure.md` | harness contract plus tests | `src/`, `bin/`, `tests/` | `pnpm verify` | self dogfood feedback |

## Boundaries

- application 或 test code 不从 `repos/effect/` import。
- 不复制本仓库 `.codex/skills/` 到 target repos；targets 只接收 provider record
  `surfaces[]` 声明的 runtime assets。
- provider 内部 source entry `repos/effect` 不投递给 target，除非 provider contract 显式声明。
- prelude-managed targets 使用 `.prelude/providers/effect-harness/provider.json` 作为长期状态，
  不使用 `.effect-harness.json` 作为 source of truth。
- 不创建 target-local dispatcher scripts。
- 不把 target business examples、product semantics 或 release rituals 放进本仓库。
- `guide/` 负责解释；`harness/` contract files 对 agent 具有规范性。
