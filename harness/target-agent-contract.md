# Target Agent Contract

这份 contract 给 agent 读，用来接入和审查 `effect-harness init` 产物。人类理解 setup、
默认补充能力和反馈路径时读 `guide/`。

主入口：

```bash
effect-harness init
```

## 用户指令

用户可以直接把这段发给目标仓库里的 agent：

```text
请运行 effect-harness init，把 effect-harness 接入当前仓库。
接入后按 effect-harness 仓库里的 harness/target-agent-contract.md 审查产物。
不要复制 effect-harness 自己的 .codex/skills；target 只接收 harness/runtime/codex。
```

如果目标仓库不是当前目录，把路径说清楚：

```text
请在 /path/to/target-repo 运行 effect-harness init。
接入后按 effect-harness 仓库里的 harness/target-agent-contract.md 审查产物。
```

## Agent Workflow

1. 确认路径：
   - `HARNESS_ROOT=<effect-harness repo root>`
   - `TARGET_ROOT=<当前仓库或用户指定仓库>`
2. 读取 target repo 的 `AGENTS.md`、`package.json`、`pnpm-workspace.yaml`、`tsconfig.json`、
   test config 和现有 scripts。
3. 读取 harness contract：
   - `repos/effect.subtree.json`
   - `harness/index.md`
   - `harness/exposure.md`
   - `harness/feedback/index.md`
   - `repos/effect/LLMS.md`
4. 对齐 dependencies。版本从 `repos/effect.subtree.json.packageBaseline` 读取，不要手写猜测。
5. 添加或更新短 scripts。CLI 写入类似：

   ```json
   {
     "scripts": {
       "effect:status": "node \"<harness-root>/dist/bin/effect-harness.js\" status",
       "effect:verify": "node \"<harness-root>/dist/bin/effect-harness.js\" verify --target ."
     }
   }
   ```

   实际 path 由 CLI 根据 build output 写入。target scripts 不需要重复 `--harness`；
   CLI 从自身入口解析 harness root。

   如果 target repo 已经有 `verify`，把 `pnpm effect:verify` 接到现有验证链尾部；不要覆盖业务验证。
   如果没有 `verify`，新增：

   ```json
   {
     "scripts": {
       "verify": "pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm effect:verify"
     }
   }
   ```

6. 写入 `.effect-harness.json`。它是 target 上给 agent 和 verifier 读的 harness manifest，
   必须记录：

   - `schemaVersion`
   - `harnessRoot`
   - `commands.status` / `commands.verify` / `commands.init`
   - `routes.harness` / `routes.agentContract` / `routes.targetContract` / `routes.officialGuide`
   - `source`
   - `packageBaseline`

7. 确保 primary typecheck 是 patched `tsgo --noEmit`：

   ```json
   {
     "scripts": {
       "typecheck": "tsgo --noEmit",
       "typecheck:tsc": "tsc --noEmit"
     }
   }
   ```

   如果 target repo 已有 `typecheck`，先判断它是否必须保留。需要保留时改名为 comparator，
   例如 `typecheck:tsc`，并让 `typecheck` 指向 `tsgo --noEmit`。

8. 确保测试使用 Effect-aware Vitest：

   ```ts
   import { assert, describe, it } from '@effect/vitest'
   import * as Effect from 'effect/Effect'

   describe('service', () => {
     it.effect('runs in the Effect test runtime', () =>
       Effect.gen(function* () {
         assert.equal(1 + 1, 2)
       }))
   })
   ```

   不从 `node:test` 或 plain `vitest` import。Effect-native tests 使用 `it.effect`、`it.live`
   或 `layer(...)`；纯同步格式化测试可以保留普通 `it(...)`，但仍从 `@effect/vitest` import。

9. 确保 `tsconfig.json` 配置 `@effect/language-service`：

   ```json
   {
     "compilerOptions": {
       "plugins": [
         {
           "name": "@effect/language-service",
           "options": {
             "diagnosticSeverity": {
               "floatingEffect": "error"
             }
           }
         }
       ]
     }
   }
   ```

   保留 target repo 已有 compiler options，只合并 plugin。

10. 把 `harness/runtime/codex/skills/` 和 `harness/runtime/codex/agents/` 投递到 target repo 的 `.codex/`。
    不要投递本仓库 `.codex/skills/`。
    后续派出 focused Effect subagent 时，使用 target repo 的 `.codex/agents/effect-worker.md`，
    并让它读取 `.codex/skills/effect-code/SKILL.md`。

11. 给 target repo 的 `AGENTS.md` 增加简短路由。如果没有 `AGENTS.md`，创建一个最小文件：

   ```md
   # Effect Harness

   Effect guidance uses `<harness-root>` as the harness root.

   Before writing non-trivial Effect code, read:

   - `<harness-root>/repos/effect/LLMS.md`
   - `<harness-root>/harness/index.md`
   - `<harness-root>/repos/effect.subtree.json`

   Do not import from `<harness-root>/repos/effect`.
   Use `pnpm effect:status`, `pnpm effect:verify`, and `pnpm verify` before completion.
   ```

12. 安装并 patch：

    ```bash
    pnpm install
    pnpm exec effect-tsgo patch
    ```

13. 验证：

    ```bash
    pnpm effect:status
    pnpm effect:verify
    pnpm verify
    ```

## Do Not

- 不从 `HARNESS_ROOT/repos/effect` import。
- 不添加 target-local effect-harness dispatcher；只使用 init 写入的 direct scripts。
- 不复制本仓库 `.codex/skills` 到 target repo；target 只接收 `harness/runtime/codex`。
- 不把 target 的业务 example、产品语义或 release ritual 写回 `effect-harness`。
- 不把 `repos/effect/AGENTS.md`、`repos/effect/.agents/skills/*`、`repos/effect/.specs/*`
  当作 downstream 默认 guide。

## TSGO Suggestion Cleanup

- 软约束：把 `@effect/tsgo` suggestion 当成类型边界问题处理。优先用明确 return type、
  命名 discriminated union/helper、`satisfies`、`Effect.satisfiesSuccessType` 或
  `Function.satisfies` 表达边界。
- 硬约束：guardrails 会拒绝 `Effect.orElseSucceed` fallback 里的 assertion、
  `Effect.succeed(null as ...)` 这类 lifted assertion，以及 `{ ok: true/false as const }`
  临时结果 wrapper。
- 例外：确实来自第三方 IO 或不可表达的外部边界时，可以使用局部 assertion，但要先在
  Effect 外声明边界，不要用 assertion 让 diagnostic 消失。

## Failure Handling

- API、pattern 或 testing 写法不确定时，先读 `repos/effect/LLMS.md` 和
  `repos/effect/ai-docs/src/`。
- v3-to-v4 migration 先读 `repos/effect/migration/v3-to-v4.md`。
- `@effect/tsgo` diagnostics 和本地习惯冲突时，以 diagnostics 和官方 source 为准。
- target repo 暴露官方 source 没覆盖的 recurring pitfall 时，使用 target repo 的
  `.codex/skills/effect-feedback/SKILL.md` 记录反馈条目，并说明它应落成 route、
  runtime contract、guardrail、verifier 还是 harness skill update。

## Completion Report

完成时报告：

- 改了哪些 target files
- `effect:status` 是否 current
- `effect:verify` 是否通过
- target `verify` 是否通过
- 是否发现需要提升为 harness contract 的 practice feedback
