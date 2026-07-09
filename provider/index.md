---
audience: [agent, human]
authors:
  - codex
reviewed_by: []
purpose: 定义 effect-harness provider 对任意 target 暴露的能力、受管 surface 和模板边界。
status: active
sources:
  - provider/effect-harness.provider.json
  - provider/docs/discovery.md
  - provider/docs/index.md
  - provider/snippets/agents.md
  - harness/offcial-migrate.md
  - harness/tsgo.md
updated: 2026-07-02
---

# Provider Profile

`provider/` 是 effect-harness 对外暴露的 provider contract。它描述任意 target 接入
effect-harness 时应该接收哪些受管能力。

Prelude 是 provider lifecycle owner，也可以作为 target 接入 effect-harness。外部仓库和 Prelude
本仓作为 target 时，应该消费同一份 provider profile、同一组 docs bundle 和同一组 snippets。

`effect-harness` 本仓是这份 contract 的第一个 self-conforming repository。self-conformance
只证明本仓符合 exported harness 声明，不在本仓生成 `.prelude/**` 或 Prelude target lifecycle
state。

当前真源：

- `provider/effect-harness.provider.json`
- `provider/docs/index.md`
- `provider/snippets/agents.md`
- `repos/effect.subtree.json`
- `repos/tsgo.subtree.json`
- `repos/effect/LLMS.md`
- `repos/tsgo/README.md`
- `harness/offcial-guide.md`
- `harness/offcial-migrate.md`
- `harness/tsgo.md`

## Layers

第一层是 harness 层：effect-harness 维护本仓内部的 Effect/tsgo 源入口实例、路线、验证、
strict tsgo policy 和 Effect package 基线。

第二层是 provider 层：effect-harness 通过 `provider/effect-harness.provider.json` 暴露 target
应该接收的能力，Prelude 负责 materialize、drift detection、update 和 verify。

Partita 负责 GitHub subtree pin 语义和 source contract；effect-harness 不复制这套能力。Prelude
负责 target lifecycle；effect-harness 不投影 Codex runtime 资产、反馈入口、目标 `AGENTS.md`
managed block 或 `.effect-harness.json` state。

## Delivery Modes

| Mode | Contract field | Delivery |
| --- | --- | --- |
| internal harness | `deliveryModes.internalHarness` | 只服务 provider 仓维护和 self-conformance，不投递到 target。 |
| provider artifact reference | `deliveryModes.providerArtifactReference` | 随 package artifact 保留，target 只记录 identity，不本地维护 source tree 或 route docs。 |
| exported harness | `deliveryModes.exportedHarness` | Prelude 后续可以投递到 target，并纳入 provider record 与 drift 判断。 |

`provider/effect-harness.provider.json.selfConformance` MUST 声明 `completionGate: "pnpm verify"`。

`provider/effect-harness.provider.json.selfConformance.selfMaterialization` MUST 是 `false`。

provider repository MUST NOT 出现
`.prelude/**`、`.prelude/providers/effect-harness/**` 或 target provider record 本体。

## Capabilities

provider 当前暴露以下能力：

| Capability | Contribution | Target surface |
| --- | --- | --- |
| Effect v4 package baseline | `contributions.packageJson.dependencyGroups.runtime` | `package.json` dependencies |
| Effect testing baseline | `contributions.packageJson.dependencyGroups.testing` | `package.json` devDependencies |
| Effect diagnostics packages | `contributions.packageJson.dependencyGroups.diagnostics` | `package.json` devDependencies |
| Native tsgo backend package | `contributions.packageJson.dependencyGroups.nativeBackend` | `package.json` devDependencies |
| ESLint baseline | `contributions.packageJson.dependencyGroups.linting` | `package.json` devDependencies |
| Effect diagnostics | `contributions.packageJson.scripts.typecheck` | `tsgo --noEmit` |
| Native tsgo backend setup | `contributions.packageJson.scripts.prepare` | `effect-tsgo patch` |
| Effect tests | `contributions.packageJson.scripts.test` | `vitest run` |
| ESLint guardrail entry | `contributions.packageJson.scripts.lint` | `eslint` |
| Strict language-service policy | `contributions.tsconfig.compilerOptions.plugins[]` | `tsconfig.json` plugin |
| Strict tsgo execution policy | `contributions.tsconfig.tsgo` | `tsconfig.json` projection and package scripts |
| Editor policy | `contributions.editorPolicy` | editor settings projection |
| Lint guardrails | `contributions.lintGuardrails` | repository boundary and syntax-level guardrails |
| Test policy | `contributions.testPolicy` | `@effect/vitest` baseline and test entry |
| Verification policy | `contributions.verificationPolicy` | completion gate and verify stages |
| Provider discovery | `provider-discover` | package artifact locator and machine-readable provider envelope |
| Provider identity record | `providerRecord` | `.prelude/providers/effect-harness/provider.json` |
| Source identity | `sourceEntries`、`sourceBoundary` | provider record artifact identity only |
| Target docs bundle | `contributions.documentationBundle` | `.prelude/providers/effect-harness/docs/**` |
| Target snippets | `contributions.snippets` | `.prelude/providers/effect-harness/snippets/**` |

这些 target surface 是 exported harness。它们可以出现在真实 target 中，但不能出现在
`effect-harness` provider repository 中。

## Target Surfaces

当前 provider target surfaces 是受管 surface。目标可以是 Prelude 本仓，也可以是其他接入仓库。

Target 应该接收：

- `package.json` dependencies and scripts
- `tsconfig.json` strict language-service plugin
- editor settings projection
- ESLint package baseline and guardrail config projection
- lint/test/verification policy records
- `.prelude/providers/effect-harness/provider.json` provider record
- `.prelude/providers/effect-harness/docs/**` docs bundle
- `.prelude/providers/effect-harness/snippets/**` snippets
- provider artifact/source identities

Target 不应该接收：

- `repos/effect/` 本体
- `repos/tsgo/` 本体
- `repos/effect.subtree.json` 本体
- `repos/tsgo.subtree.json` 本体
- `repos/effect/LLMS.md` 本体
- `repos/tsgo/README.md` 本体
- `.codex` runtime files
- effect-harness `AGENTS.md` 管理块
- `.effect-harness.json` state
- `.codex/effect-feedback` feedback intake

目标项目可以接收 provider record 中的 Effect source identity 和 tsgo source identity，但不接收
provider-internal source tree 本体。

包含 `.codex` runtime files、effect-harness `AGENTS.md` 管理块或 `.effect-harness.json`
state 的 provider records 应按当前 profile 重新生成。

## Managed Docs

`provider/docs/**` 是 target-facing docs bundle 的 provider source。它不是本仓 harness
维护手册，也不引用 provider-internal source tree 作为 target 本地路径。

Prelude materialization 时应把 docs bundle 投递到 `.prelude/providers/effect-harness/docs/**`，
并把它纳入 provider record surfaces。目标项目对这些文件的本地修改属于 drift，需要按 Prelude
maintain 规则处理。

`provider/snippets/**` 是受管 snippet source。snippet 可以被用户或 target-local policy 引用，
但 effect-harness 不直接管理目标 `AGENTS.md` block。

## Discovery

Prelude SHOULD 通过 `npx --yes @sayoriqwq/effect-harness provider-discover` 读取 provider discovery
envelope。

package-backed discovery 的职责边界是：npm selects the artifact，effect-harness owns desired
semantics，Prelude projects the artifact，target repositories are mutated only by Prelude lifecycle
commands。

discovery envelope 暴露 provider identity、artifact root、package locator、target-managed surfaces、
artifact-only references、source identity 和 internal harness surfaces。

Prelude MUST NOT 把 `provider/effect-harness.provider.json` 复制进 Prelude 源码并手写保持同步。

Prelude MUST NOT 把 artifact-only references 当作 target-managed files 投递。

## 编辑器策略

`contributions.editorPolicy` 把 source-entry editor policy 投影为 target-facing contribution。

`repos/**` 的 auto-import exclusion 是默认硬边界。watch/search exclusion 是 recommended policy。
文件隐藏是 preference。VSCode 和 Zed 的配置 shape 分开记录。

这个 contribution 服务于 provider artifact 中的 source identity，不要求 target 接收 provider-internal
source tree 本体。

## Tsgo policy

profile 把 `harness/tsgo.md` 的 strict policy 投影为 `tsgoPolicy` 和
`contributions.tsconfig.compilerOptions.plugins[]`。

当前 provider 只有 `strict-v4` profile，不提供 relaxed 或 compatibility profile。

目标项目接入后应修复 diagnostics，不通过 local override 降低 strict policy。

`includeSuggestionsInTsc` 固定为 `true`；`ignoreEffectSuggestionsInTscExitCode`、
`ignoreEffectWarningsInTscExitCode` 和 `ignoreEffectErrorsInTscExitCode` 固定为 `false`。

## Quality policy

`contributions.lintGuardrails` 负责 repository boundary、Effect v4 CLI import boundary、test entry 和
syntax-level guardrails。它不负责 Effect semantic diagnostics。

`contributions.testPolicy` 记录 `@effect/vitest` baseline 和 expected test entry。

`contributions.verificationPolicy` 记录 `pnpm verify` completion gate、local diagnostic commands 和
stage semantics。Prelude 仍负责 target materialization、drift 和 maintain lifecycle。
