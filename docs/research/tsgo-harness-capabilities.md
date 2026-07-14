# tsgo 对 Effect Harness 可提供的能力

状态：调研简报，2026-07-14。本文只讨论 Effect Harness 可以从官方
`Effect-TS/tsgo` 仓库获取、验证、选择、固定、组合或投递什么，不重新介绍
tsgo，也不改变已经完成的 Harness 权威边界。

## 调研基线

- Effect Harness 当前固定的 tsgo Source Pin 是
  `f0d48a67515048d277feb2c184c41cd7cffa51a4`，树摘要为
  `f76adab084de0de584e0a565679b3afca2b48674a28e36c7dd6398846fd2bd9d`；证据见
  `artifact-assets/effect/reference-archives/tsgo.json`。
- 当前安装和 Target Requirement 选择 `@effect/tsgo@0.19.0`、
  `@typescript/native: npm:typescript@7.0.2`；证据见
  `src/harness/Baseline.ts:1-99`。
- `/Users/sayori/Desktop/tsgo` 是官方仓库的干净 checkout，remote 为
  `https://github.com/Effect-TS/tsgo.git`，但其 HEAD
  `dbc279b1877fabc3e81c4577e977bd3210fa53c2` 的 package version 仍是
  `0.15.0`（`_packages/tsgo/package.json:1-4`）。因此本文用它确认仓库结构和
  设计连续性，用 Effect Harness 已发布的精确 0.19 Source Pin
  `repos/tsgo/**` 作为当前 Baseline 的规范源码证据。
- GitHub issue #13 已完成的边界是：Partita 生产 Source Pin publication；
  Harness 选择 Effect/tsgo pin 并组合 Target policy；Prelude Contract 定义 wire
  contract；Prelude 是唯一 Target mutation host。issue #18 的最终修正是：
  Harness ESLint 只拥有 `repos/effect/**`、`repos/tsgo/**` 两条禁止导入边界，
  Effect/TypeScript 语义完全归 tsgo，其他 ESLint policy 完全归 Target。

## 结论

Effect Harness 不应该从 tsgo 仓库“拿走规则实现”，而应该把 tsgo 当作一个
**版本化的语义工具能力包**：

1. Harness 固定并验证它的源码、npm 版本、原生 TypeScript 兼容身份和
   Target policy。
2. Prelude 投递 package requirements 和一项完整的 tsconfig plugin item；包管理器
   投递官方 CLI 与平台二进制。
3. Target 通过官方 binary 获得 diagnostics、quick fixes、refactors、completion、
   hover、inlay、auto-import 和 CLI exit-code 语义。
4. Harness 只投递诊断所有权、使用路径和 reference tree，不复制 Go rule、fix、
   refactor 或 TypeScript-Go patch。

当前最重要的缺口不是“规则不够多”，而是
**Target 是否真的激活了与安装 TypeScript 完全匹配的 Effect binary，Harness
无法以现有官方 CLI/Contract 做机器可判定的证明**。

```text
Effect-TS/tsgo source + npm release
        │
        ├─ official metadata/schema/fixtures ──> Harness upgrade evidence
        ├─ @effect/tsgo + platform packages ───> Target executable capability
        └─ @effect/language-service config ─────> Harness-selected Target policy

Partita publication ─> Harness composition ─> Prelude convergence
                                             └─ Target-owned activation/config repair
```

## 能力分层

| 层 | tsgo 官方能力与证据 | Harness 应做什么 | 不应做什么 |
| --- | --- | --- | --- |
| Source Pin | 外层仓库包含规则、patch、schema、fixtures；TypeScript-Go 是 gitlink（`.gitmodules:1-4`）；`flake.nix:7-18` 固定 TypeScript-Go 与 TypeScript commit | 选择外层 revision，消费 Partita publication，投递 `PinnedReferenceTree` | 递归跟随 gitlink、重做 archive、把 reference tree 当依赖 |
| 可执行工具链 | npm CLI 的 `patch/unpatch/get-exe-path/setup/config` 在 `_packages/tsgo/src/cli.ts:301-569`；平台包由 optional dependencies 选择（`_packages/tsgo/package.json:25-40`） | 固定 package/version/native backend；声明 Requirement；验证激活 | 把平台 binary 打进 Harness Artifact、自己编译或 patch TypeScript-Go |
| Diagnostic/config contract | `EffectPluginOptions` 是解析端 schema（`etscore/options.go:17-121`）；生成的 `schema.json` 由测试校验（`etscore/options_schema_test.go:25-50,75-132`） | 选择一项完整、显式、可审计的 plugin policy，并验证它仍被 pinned schema 接受 | 自己定义同名 schema 或复制 parser semantics |
| 规则/修复 | 显式 rule registry 在 `internal/rules/rules.go:8-94`；metadata 携带 name/group/default/fixable/version/code/preview；fix 与 refactor registry 分别在 `internal/fixables/fixables.go:7-49`、`internal/refactors/refactors.go:7-31` | 选择 severity 和非语义 feature options；将实现与 fixture 作为 reference evidence | 用 ESLint 或 Harness plugin 重写任何 Effect 语义、fix 或 refactor |
| 验证/测试 | metadata/README 是从 registry 和 preview fixture 生成并 byte-compare（`internal/rules/rules_json_test.go:44-134,157-195`）；diagnostic、quickfix、refactor 使用 VFS/fourslash/baseline runners | 做 pinned metadata conformance、少量 packed Target smoke、升级差异报告 | 把上游完整 Go test harness 复制进 Harness |
| 发布/版本元数据 | 0.19 package version 在 `_packages/tsgo/package.json:1-4`；Effect version suffix 在 `etscheckerhooks/init.go:17-23`；release 同时构建稳定 `tsc` 与 `tsc-next`（`.github/workflows/release.yml:27-47,79-95`） | 固定 `@effect/tsgo` 和 native TS package；验证 source/package/binary 身份闭环 | 假设一个外层 git revision 就足以证明已安装平台 binary |
| Target 集成 | setup 评估 package、prepare script、tsconfig、VS Code（`_packages/tsgo/src/setup/assessment.ts:74-129,132-226`）；它会建议 `effect-tsgo patch` 和 editor settings | 通过适配流程选择正确 toolchain root、tsconfig landing、editor landing；投递 docs/Issues/Checks | 在每个 Package Root 盲写 prepare，或由 Harness 直接执行 Target mutation |

## 1. Source Pin 能力

### Harness 已经正确拥有的部分

`acceptedEffectBaseline.sourcePins.tsgo` 选择官方 URL、Target 路径和 Output id
（`src/harness/Baseline.ts:92-99`）；`pinnedReferenceOutputs` 只把 Partita 已发布的
archive/provenance 与 `IntegrationWorkspace/repos/tsgo`、`referenceOnly: true` 组合
（`src/harness/SourcePins.ts:1-62`）。这与 Prelude Contract 的
`PinnedReferenceTree` schema 一致：它只承载 archive、locator、source URL、revision、
tree digest 和 `referenceOnly: true`（`../prelude/packages/harness-contract/src/outputs.ts:23-52`）。

这份 tree 对 Harness 有三种直接价值：

- upgrade 时对比 `metadata.json`、options、规则/修复 registry 与 fixtures；
- Target agent 在诊断不清楚时定位同版本实现和 baseline；
- 证明 Harness policy 的每个 rule name 都来自选定的官方 revision。

### gitlink 的边界

tsgo 外层仓库明确要求所有 TypeScript-Go 差异通过 `_patches/**`，并通过 generated
shim 隔离 direct imports（`repos/tsgo/AGENTS.md:1-6`）。但当前 canonical archive
故意不递归 gitlink；Prelude V2 contract 也明确 gitlink 是 opaque boundary
（`../prelude/docs/v2-harness-convergence-contract.md:143-150`）。因此 Target 能看到：

- `.gitmodules` 中的上游 URL；
- `_patches/**` 中 Effect-tsgo 需要的 hook seams；
- `flake.nix` 与 `_packages/tsgo/upstream.json` 中的 pinned upstream identity；

但看不到嵌套 TypeScript-Go 全树。这足以诊断 Effect layer；如果将来要离线诊断
上游 compiler internals，应新建一个**显式 sibling Source Pin**，而不是破坏
one-layer-deep contract。当前没有证据表明需要立即增加第三棵 reference tree。

## 2. 可执行工具链与发布身份

`@effect/tsgo` npm package 本身是 Node CLI；它通过七个平台 optional package
投递二进制（`_packages/tsgo/package.json:25-40`），平台 package 用 `os`、`cpu`
限制并发布 `lib/tsc`、`lib/tsc-next` 及相邻 JSON metadata
（例如 `_packages/tsgo-darwin-arm64/package.json:17-29`）。

CLI 的选择不是只看 semver：

- 它读取安装 TypeScript package 的 `gitHead`，定位官方平台包
  （`_packages/tsgo/src/cli.ts:301-343`）；
- 它读取每个 Effect binary 相邻的 `{ tsVersion, tsGitHead }`，只选择 gitHead
  完全相等的候选（同文件 `352-433`）；
- `patch` 先备份原 binary，再复制、chmod，并只用 `--version` 做可执行性 smoke
  （同文件 `435-493`）。

发布 workflow 同时把 release commit 构建为 `tsc-next`，把
`generated/latest` 构建为稳定 `tsc`（`.github/workflows/release.yml:27-47`），再把
两组 artifact 合并到每个平台包（同文件 `127-154`）。因此 Harness 的完整
toolchain identity 至少是：

```text
@effect/tsgo package version
+ selected platform package version/integrity
+ installed native TypeScript package version/gitHead
+ selected binary metadata tsVersion/tsGitHead
+ runtime version suffix +effect-tsgo.<version>
```

Harness 当前只固定前者和 native package semver/installed identity；lockfile 固定
package bytes，但 Source Pin 与实际 binary capability 之间还没有 machine-readable
闭环。当前 self checkout 中执行 `pnpm exec tsc --version` 得到
`Version 7.0.2+effect-tsgo.0.19.0`，说明 Harness 自身已激活；这不是 Target contract
已经证明激活的证据。

### Binary 是否应作为 Output

不应。Prelude Contract 没有 Binary Output，而且不需要新增：

- Package Requirement 已能声明 direct package、range、section
  （`../prelude/packages/harness-contract/src/declarations.ts:12-20`）；
- Prelude 只在 exact manifest/lock 获批后执行 frozen install
  （`../prelude/docs/v2-harness-convergence-contract.md:152-178`）；
- 官方 npm package 已负责平台选择、binary metadata 和 provenance。

把二进制再装入 Harness Artifact 会复制发布责任、放大包体积，并绕过 npm 的
platform selection。Nix flake 的 self-contained binary
（`repos/tsgo/flake.nix:108-157`）适合作为官方可复现构建证据，不适合作为通用
npm Target 的 Harness Output。

## 3. Diagnostic 与 config contract

官方 parser 以 `compilerOptions.plugins` 中 `name: "@effect/language-service"` 为
入口（`etscore/options_parser.go:9-49`）。它支持：

- diagnostics、refactors、quickinfo、completions、goto、renames；
- suggestions 是否进入 tsc 输出，以及各 category 是否影响 exit code；
- rule severity、ordered per-file overrides；
- auto-import style、deterministic key、Effect.fn variant、layer graph、inlay；
- debug、external Mermaid link 和少量 rule parameters。

规范字段及 schema annotations 在 `etscore/options.go:17-121`；每文件 override
是同文件 `142-157`。JSON schema 会把每条 rule name/default/description 注入
`diagnosticSeverity`（`etscore/options_schema_test.go:205-228`）。

Harness 当前的 `JsonKeyedItem` 形态是正确 seam：每个 approved Package Root 只
拥有 plugins collection 内稳定 key 为 `@effect/language-service` 的一项
（`src/prelude.ts:71-82`），不会覆盖其他 compiler options 或 plugin。canonical
policy 又通过 self/Target equality 与 pinned metadata conformance 验证
（`tests/baseline-conformance.test.ts:21-68`）。特别是当前 0.19 metadata 有 83 条
规则，其中 78 条支持 v4；Harness 已明确覆盖这 78 条。

### 仍缺的 config 闭环

当前 conformance 只验证 v4 `diagnosticSeverity`，没有证明 canonical policy 的
其他 option keys/values 仍被 pinned `schema.json` 接受。由于 tsgo 仍是 alpha，
option rename/default change 是实际风险。Harness 应增加一个 pinned-schema
conformance，但只能**验证官方 schema**，不能在 Harness 中重写 parser。

另外，官方 setup 会把 tsconfig `$schema` 指向 `refs/heads/main/schema.json`
（`_packages/tsgo/src/setup/consts.ts:3-7`；
`_packages/tsgo/src/setup/changes.ts:539-579,615-657`）。该 URL 会越过 Harness pin
持续漂移；`@effect/tsgo` package 的 `files` 又只发布 `dist/` 和 `README.md`
（`_packages/tsgo/package.json:28-31`）。因此不建议 Harness 复制这个 `main` URL。
更好的上游 seam 是随 npm package 发布 version-matched schema，并提供稳定的
package-local定位方式。

## 4. 规则、修复和语言服务能力

Rule 是显式数据结构：name 同时是 tsconfig key 和 directive key，另有 group、
description、default severity、supported Effect versions、diagnostic codes 和纯
`Run` function（`internal/rule/rule.go:11-38`）。runner 在类型检查完成后运行规则，
解析 per-file config 和 directives，再转换 severity
（`internal/rulerunner/diagnostics.go:28-77,104-189`）。checker hook 将结果加入
TypeScript diagnostics（`etscheckerhooks/init.go:17-41`）。

语言服务 hook 还注册 code fix、refactor、hover、document symbols、inlay、
completion 与 auto-import transformer（`etslshooks/init.go:36-62`）。这意味着
Target 安装并激活同一 binary 后自然获得这些能力；Harness 不需要、也不应为它们
设计独立 Outputs。

CLI exit-code 是真正的 Gate seam：Effect-tsgo patch 给 TypeScript-Go 增加一个
exit-code filter hook（`_patches/009-execute-tsc-emit.patch:39-68`），官方
`etsexecutehooks` 根据 diagnostic code range 和三类 ignore option 决定是否影响
exit code（`etsexecutehooks/init.go:12-57`）。Harness 将三个 ignore option 设为
`false`，并包含 suggestions，所以其 `pnpm typecheck` 可以成为严格语义 Gate；
但前提仍是实际运行 patched binary。

### suppression 的最终 ownership

tsgo 原生支持 section、next-line 和 file-level suppression
（`internal/directives/parser.go:63-72,125-180`），还为每条 Effect diagnostic
主动提供“disable line/file” code action
（`internal/fixables/disable.go:13-44`）。这证明 directive 语义属于 tsgo，但不要求
Effect Harness 对所有 Target 统一禁止它。

2026-07-15 的最终决策是：suppression permission 与 rationale 属于 Target-owned
exception。Harness 不以 ESLint 重写 directive，不要求 Prelude 检查，也不声称存在
全局 machine rejection；canonical severity 与 exit-code policy 对所有未 suppression
的 diagnostics 仍保持严格。Target adaptation skill 不得只为让 Check 变绿而自动
新增 suppression；确需例外时，由 skill 说明原因与最小作用域并取得授权，再按照
Target policy 留下耐久证据。

## 5. 验证与 fixtures 能力

`metadata.json` 不是手写目录：上游测试从 registry、fix registry 和 preview fixture
生成 metadata，并与 committed file byte-compare
（`internal/rules/rules_json_test.go:93-134,157-195`）。同一个测试也生成 README
diagnostic table（同文件 `44-90`）。因此它是 Harness upgrade 最适合消费的
machine-readable inventory。

上游 `internal/effecttest` 将 Effect declarations mount 到 VFS，解析多文件 fixture，
注入 plugin config，再运行 checker/baseline
（`internal/effecttest/runner.go:30-49,112-124,126-229`）；quick fix 和 refactor
另有 baseline runner，refactor 通过 fourslash 真正枚举并 apply action
（`internal/effecttest/refactor_runner.go:112-250`）。

Harness 应从这些 fixtures 获得两类验证能力：

1. **upgrade evidence**：metadata diff 显示新增/删除/改名/default/version/fixable 变化，
   并路由到对应实现和 fixture；
2. **packed Target smoke**：用少量代表性 v4 fixture 证明安装 binary、plugin config、
   severity、exit code 和一条 quick fix 能通过真实消费路径工作。

Harness 不应复制全量 baseline。上游测试证明规则实现，Harness 测试证明版本选择、
policy projection、package/binary 激活和 Target delivery。

## 6. Target 集成能力

官方 `setup` 的目标状态包括四件事：package、prepare patch、plugin config、editor
settings（README `10-25`）。源码会：

- 检测 package 是否直接声明、native TypeScript 是否 >= 7、prepare 是否包含
  `effect-tsgo patch`（`_packages/tsgo/src/setup/assessment.ts:74-129`）；
- 添加或组合 prepare script（`_packages/tsgo/src/setup/changes.ts:407-447`）；
- 添加/更新 plugin item 和 `$schema`
  （同文件 `513-705`）；
- 为 VS Code 设置 native tsdk 与两个 useTsgo flags
  （`_packages/tsgo/src/setup/target-prompt.ts:113-167`）；
- 应用后仍明确提示运行 `effect-tsgo patch`
  （`_packages/tsgo/src/setup/changes.ts:863-887`）。

Harness 目前已经投递 package requirements、plugin item、三个 editor auto-import
exclusion，以及 package-scoped typecheck/lint/verify Checks；但没有投递或验证：

- 哪一个 workspace root 拥有唯一 toolchain activation；
- `prepare` 是否运行 `effect-tsgo patch`；
- installed `tsc --version` 是否包含正确 Effect version suffix；
- VS Code/Cursor 是否真正启用 native tsgo、tsdk 是否指向 Harness 选择的 alias；
- Neovim/Emacs/Zed 的语言服务 executable 是否指向 Effect-tsgo。

其中 prepare 和 editor executable config 都是 Target-owned，不能直接变成
Harness-owned Output。适配 skill 可以在用户批准后修复它们，但需要把所选
toolchain root/editor landing 记录成耐久 Target config，而不是只留在聊天里。

### 现在可落地与 alpha/upstream 限制

官方明确将 TypeScript-Go 版本的 Effect LSP 标为 alpha，并说明 breaking changes、
相对上一代 language service 的能力缺口，以及部分缺口受上游 pipeline 未完成阻塞
（`repos/tsgo/README.md:6-8`）。按 Harness 能力看，应这样分界：

- **现在可作为 Baseline 强制**：已经进入 v4 metadata 的 78 条 diagnostics、明确的
  severity/exit-code policy、已注册的 quick fixes/refactors，以及 package/plugin
  identity。它们都有源码 registry 和 fixtures。
- **现在可投递但尚未闭环**：package requirements、plugin item、reference tree、
  diagnostic ownership docs；缺 binary activation proof 和 installed-release inventory。
- **只能作为编辑体验，不能当 Gate**：hover、completion、document symbols、inlay、
  refactors。它们依赖 editor/LSP pipeline，且 CLI Gate 不执行这些能力。
- **暂不强制**：README 明确列为不可用的三种 codegen 和 key-string rename
  （`repos/tsgo/README.md:172-184`），以及表中标为 v4 unavailable 的 completions/
  refactors（同文件 `130-170`）。依照当前权威决策，不应用 ESLint 或 Harness 自制
  codegen 填补。
- **升级时重新证明**：native TypeScript/TypeScript-Go compatibility、config option
  schema、editor activation。alpha 意味着 semver/package bump 不能替代这些证明。

## Artifact / Prelude Contract 的逐项判断

| 能力 | 当前能否投递 | 应否由 Harness/Contract 投递 | 判断 |
| --- | --- | --- | --- |
| tsgo binary | Package install 可间接获得；Artifact 无 Binary Output | 不应作为 Artifact file/Output | 保持官方 npm platform packages 为唯一发布者 |
| binary activation | 当前没有可靠 declarative seam | 应由 Target-owned setup 执行，Harness 声明/验证结果 | 先补官方 read-only status command，再用现有 Check exit code |
| plugin config | 能，`JsonKeyedItem` | 应，由 Harness 选择 policy，Prelude 收敛稳定-key item | 当前形态正确 |
| rule selection/severity | 能，plugin item 内 `diagnosticSeverity` | 应由 Harness 选择；规则定义仍属 tsgo | 当前已覆盖全部 pinned v4 metadata |
| fixes/refactors/completion | 安装激活 binary 后自然获得 | 不应拆成 Outputs | 只在 docs 中说明/路由 |
| diagnostic ownership docs | 能，`ManagedTree` | 应由 Harness 投递 | 当前正确；需修正 suppression“已强制”的表述 |
| pinned reference tree | 能，`PinnedReferenceTree` | 应由 Harness 选择、Partita 发布、Prelude materialize | 当前正确 |
| tsconfig schema | tree 中可参考，npm package 不提供本地 schema | 不应复制 main URL 或重定义 | 推动上游 package-local versioned schema |
| upstream TypeScript-Go source | 当前 opaque gitlink | 默认不应递归投递 | 若将来确有离线 compiler diagnosis，再建独立 sibling pin |

## 缺少的 seam

### 优先要求 tsgo 提供

1. **`effect-tsgo status --json` / `verify`（最高优先级）**
   
   必须只读并以 exit code 判断：安装 native TypeScript 身份、匹配 platform binary、
   当前 target binary 是否已经 patched、Effect version suffix、selected binary
   `{tsVersion, tsGitHead}`。有了它，现有 Prelude `Check { argv }`
   （`../prelude/packages/harness-contract/src/declarations.ts:32-39`）已经足够，
   不必新增 Binary Output 或 expected-stdout contract。

2. **安装包能力清单导出**
   
   增加 `effect-tsgo metadata --json` 或 package export，返回和该 npm package bytes
   同源的 rule/config/feature metadata。现在 CLI bundle 内部使用 metadata
   （`_packages/tsgo/src/setup/rule-info.ts:1-43`），但消费者没有稳定导出。Harness
   才能证明“pinned source inventory = installed binary release inventory”。

3. **version-matched package-local `schema.json`**
   
   避免 tsconfig `$schema` 指向持续漂移的 `main`。

Suppression 不再构成要求 tsgo 新增全局 forbid option 的 Harness seam；其语义由
tsgo 拥有，许可由 Target 决定，适配由 skill 执行。

### 可能需要 Harness/Prelude config 提供

只有当适配结果需要跨次 plan 自动判定时，才增加一个 Target-owned
`toolchainRoot`/`activationOwner` 选择。它解决 monorepo 中“patch 应运行一次，不能对
每个 Package Root 重复写 prepare”的问题。它首先是 Integration config/适配决策，
不是新的 Output。

如果未来要由 Prelude 自动执行 activation，才需要一种声明式、审批绑定的
`ToolchainActivationRequirement`。这会扩大 Prelude mutation 权限，当前不建议先做；
优先使用 Target-owned prepare + 官方 read-only status Check。

## 建议能力清单

| 能力 | 官方证据 | Harness ownership | 建议形态 | 风险 | 阶段/issue |
| --- | --- | --- | --- | --- | --- |
| Source/package/version coherence | package version、Effect suffix、upstream metadata、release workflow | Harness 选择与验证 | 增加 conformance：Baseline version = pinned package = generated EffectVersion；记录 upstream identities | pinned source 与 published bytes 可能不是同一 release commit | 立即，新 issue“Close tsgo source/package identity” |
| 完整 v4 diagnostic policy | metadata rule registry；当前 78 条 v4 | Harness 选择 severity；tsgo 定义规则 | 保持 canonical plugin item；生成 upgrade diff | alpha 新增/删除/改名会阻断升级 | 已有，增强 upgrade report |
| 全 plugin option schema conformance | `etscore/options.go` + generated `schema.json` | Harness 验证所选 policy | 用 pinned schema 验证 canonical object | defaults/rename 漂移当前未捕获 | 立即，同一 identity/conformance issue |
| Binary activation proof | CLI binary matching/patch code；Effect version suffix | Target 激活，Harness 验证 | 上游 `status --json` 后添加 package-scoped Check | 现在只能证明 executable 能运行，不能证明已 patch | 上游依赖 issue，然后 Harness issue |
| Target toolchain landing | setup 的 prepare/editor workflow | Target config + adaptation skill | 记录 toolchainRoot/editor landing；Plan 对缺失状态报 Issue | monorepo 多 roots、alias、不同 editor | 近期 Target integration issue |
| Runtime release inventory | CLI bundle 已内嵌 metadata | tsgo 发布，Harness 消费 | 上游 `metadata --json`；Harness 比较 pinned vs installed | 当前 npm 没稳定 export | 上游依赖 issue |
| Strict CLI Gate | exit-code hook 和 Harness 三个 false ignore values | Harness policy + Target Check | 保持 `pnpm typecheck`，加 patched-binary precheck | 未激活时 plugin policy可能不起作用 | 与 activation 同期 |
| Diagnostic source routing | metadata→rule→fix→fixture | Harness docs | 保持 `repos/tsgo` reference route；增加 release/upstream identity 路由 | agent误把 source 当依赖 | 立即文档 issue |
| Suppression exception | directives/fixable 明确支持 suppression | tsgo 拥有语义；Target 拥有许可；skill 适配 | 保持 canonical policy 严格；只在授权后采用最小作用域例外并记录理由 | skill 自动 suppression 会隐藏真实失败 | issue #24 的 skill/docs 同步 |
| Packed Target smoke | upstream VFS/fourslash baseline seams | Harness delivery verification | 代表性 correctness + suggestion exit + quickfix smoke | 全量复制会形成第二测试权威 | activation seam 后 |
| Editor activation | setup 的 VS Code tsdk/useTsgo settings | Target-owned config；Harness 指导/验证 | adaptation skill 明确各 editor landing | upstream默认 `typescript` 与 Harness alias `@typescript/native` 不同 | 近期 Target integration issue |

## 明确不建议做

- 不把 tsgo 或平台 binary 存进 Effect Harness Artifact。
- 不新增 Harness ESLint rules 来模拟任何 tsgo diagnostic 或 suppression policy。
- 不复制 `internal/rules`、`internal/fixables`、`internal/refactors` 或 upstream fixture
  为 Harness 实现。
- 不让 Partita 或 Prelude 解释 tsgo metadata、选择 rule severity 或编译 binary。
- 不递归 materialize `typescript-go` gitlink；需要时用显式独立 Source Pin。
- 不把 `https://raw.githubusercontent.com/Effect-TS/tsgo/refs/heads/main/schema.json`
  投递成 pinned Target policy。
- 不为每个 selected Package Root 盲目添加 `prepare: effect-tsgo patch`。
- 不把官方 interactive `setup/config` CLI 当作 Prelude Apply：它会直接修改
  package.json、tsconfig 和 editor config，与 read-only Plan/exact approval 模型不同。
- 不把 README feature table 当 machine contract；当前只有 diagnostic metadata 是
  结构化、生成并测试的 inventory。

## 推荐执行顺序

1. **现在**：开一个 Harness conformance issue，补 source/package/EffectVersion/
   upstream identity 和完整 plugin schema 检查；同时修正文档对 suppression
   machine enforcement 的表述。
2. **并行上游**：向 Effect-TS/tsgo 提 `status --json`、runtime metadata export、
   package-local schema 三个小而独立的 seam。
3. **上游 status 可用后**：Harness 用现有 `Check.argv` 投递 read-only activation
   check；无需扩 Prelude Contract。
4. **Target adaptation**：明确并持久化 toolchain root、prepare ownership 和 editor
   landing，避免 monorepo 重复 patch。
5. **最后**：加入 packed isolated Target smoke，证明 Requirement → install → activation
   → plugin → strict exit code 的完整链；不要先扩展 Output union。

## 一句话权威链

```text
tsgo 仓库/发布定义语义工具能力
→ Effect Harness 选择版本与 policy、验证 identity、投递 reference/docs/config
→ Prelude 只收敛声明和安装选择
→ Target-owned setup 激活 binary
→ tsgo binary 成为唯一 Effect/TypeScript 语义执行者
```
