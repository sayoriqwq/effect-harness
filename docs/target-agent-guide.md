# Target Agent Guide

这份 guide 是目标仓库人工接入和审查 `effect-harness init` 产物的参考。

主入口：

```bash
effect-harness init
```

## 用户指令

用户可以直接把这段发给目标仓库里的 agent：

```text
请运行 effect-harness init，把 effect-harness 接入当前仓库。
接入后按 effect-harness 仓库里的 docs/target-agent-guide.md 审查产物。
不要复制 effect-harness 自己的 .codex/skills；target 只接收 runtime/codex。
```

如果目标仓库不是当前目录，把路径说清楚：

```text
请在 /path/to/target-repo 运行 effect-harness init。
接入后按 effect-harness 仓库里的 docs/target-agent-guide.md 审查产物。
```

## Agent Workflow

1. 确认路径：
   - `HARNESS_ROOT=<effect-harness repo root>`
   - `TARGET_ROOT=<当前仓库或用户指定仓库>`
2. 读取 target repo 的 `AGENTS.md`、`package.json`、`pnpm-workspace.yaml`、`tsconfig.json`、
   test config 和现有 scripts。
3. 读取 harness contract：
   - `repos/effect.subtree.json`
   - `docs/effect-patterns/index.md`
   - `docs/harness-exposure.md`
   - `repos/effect/LLMS.md`
4. 对齐 dependencies。版本从 `repos/effect.subtree.json.packageBaseline` 读取，不要手写猜测。
5. 添加或更新短 scripts。CLI 写入类似：

   ```json
   {
     "scripts": {
       "effect:status": "node \"<harness-root>/bin/effect-harness.ts\" status --harness \"<harness-root>\"",
       "effect:verify": "node \"<harness-root>/bin/effect-harness.ts\" verify --target . --harness \"<harness-root>\""
     }
   }
   ```

   如果 target repo 已经有 `verify`，把 `pnpm effect:verify` 接到现有验证链尾部；不要覆盖业务验证。
   如果没有 `verify`，新增：

   ```json
   {
     "scripts": {
       "verify": "pnpm build && pnpm typecheck && pnpm test && pnpm lint && pnpm effect:verify"
     }
   }
   ```

6. 确保 primary typecheck 是 patched `tsgo --noEmit`：

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

7. 确保测试使用 Effect-aware Vitest：

   ```ts
   import { assert, describe, it } from "@effect/vitest"
   import * as Effect from "effect/Effect"

   describe("service", () => {
     it.effect("runs in the Effect test runtime", () =>
       Effect.gen(function* () {
         assert.equal(1 + 1, 2)
       }))
   })
   ```

   不从 `node:test` 或 plain `vitest` import。Effect-native tests 使用 `it.effect`、`it.live`
   或 `layer(...)`；纯同步格式化测试可以保留普通 `it(...)`，但仍从 `@effect/vitest` import。

8. 确保 `tsconfig.json` 配置 `@effect/language-service`：

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

9. 把 `runtime/codex/skills/` 和 `runtime/codex/agents/` 投递到 target repo 的 `.codex/`。
   不要投递本仓库 `.codex/skills/`。

10. 给 target repo 的 `AGENTS.md` 增加简短路由。如果没有 `AGENTS.md`，创建一个最小文件：

   ```md
   # Effect Harness

   Effect guidance uses `<harness-root>` as the harness root.

   Before writing non-trivial Effect code, read:

   - `<harness-root>/repos/effect/LLMS.md`
   - `<harness-root>/docs/effect-patterns/index.md`
   - `<harness-root>/repos/effect.subtree.json`

   Do not import from `<harness-root>/repos/effect`.
   Use `pnpm effect:status`, `pnpm effect:verify`, and `pnpm verify` before completion.
   ```

11. 安装并 patch：

    ```bash
    pnpm install
    pnpm exec effect-tsgo patch
    ```

12. 验证：

    ```bash
    pnpm effect:status
    pnpm effect:verify
    pnpm verify
    ```

## Do Not

- 不从 `HARNESS_ROOT/repos/effect` import。
- 不添加 target-local `scripts/effect-harness.mjs` 或 `scripts/effect-harness.ts` dispatcher。
- 不复制本仓库 `.codex/skills` 到 target repo；target 只接收 `runtime/codex`。
- 不把 target 的业务 example、产品语义或 release ritual 写回 `effect-harness`。
- 不把 `repos/effect/AGENTS.md`、`repos/effect/.agents/skills/*`、`repos/effect/.specs/*`
  当作 downstream 默认 guide。

## Failure Handling

- API、pattern 或 testing 写法不确定时，先读 `repos/effect/LLMS.md` 和
  `repos/effect/ai-docs/src/`。
- v3-to-v4 migration 先读 `repos/effect/migration/v3-to-v4.md`。
- `@effect/tsgo` diagnostics 和本地习惯冲突时，以 diagnostics 和官方 source 为准。
- target repo 暴露官方 guide 没覆盖的 recurring pitfall 时，使用 target repo 的
  `.codex/skills/effect-feedback/SKILL.md` 记录反馈条目。

## Completion Report

完成时报告：

- 改了哪些 target files
- `effect:status` 是否 current
- `effect:verify` 是否通过
- target `verify` 是否通过
- 是否发现需要进入 harness feedback 的问题
