# Effect v4 stable 同步审计

状态：调研简报，2026-08-20。本文只使用 Effect 官方 GitHub、release、tag、
commit、package manifest 与 npm registry 元数据；审计基线是 Effect Harness 当前
固定的 `effect@4.0.0-beta.97`、`@effect/platform-node@4.0.0-beta.97`、
`@effect/vitest@4.0.0-beta.97`。

## 结论

截至 **2026-08-20 11:09（Asia/Shanghai）**，官方尚未发布 Effect v4 stable，
因此不存在可核对的 `4.0.0` 正式版版本号或发布时间，也还不能建立最终 stable
Source Pin。官方当前最高发布是 `4.0.0-rc.110`，发布时间为
**2026-08-17 01:51:32 UTC**，GitHub 明确标记为 prerelease；下一轮自动版本 PR
也仍名为 `Version Packages (rc)`。证据见
[effect rc.110 release](https://github.com/Effect-TS/effect/releases/tag/effect%404.0.0-rc.110)、
[npm dist-tags](https://registry.npmjs.org/-/package/effect/dist-tags) 与
[下一轮 RC PR #7297](https://github.com/Effect-TS/effect/pull/7297)。

用户所说的“不再是 rc”与当前官方发布状态不一致；更可能是把“从 beta 进入 RC”
理解成了“进入 stable”。本报告不把 RC 冒充正式版，而以当前候选
`beta.97 → rc.110` 做预审。最终结论是：

1. **现在不要把 Harness baseline 宣称为 stable，也不要先猜 `4.0.0` revision。**
2. stable 发布后需要同步的不只是三个 semver：还包括 Effect canonical repository
   URL、Source Pin/archive、reference tree 内的平台源码路径，以及 Target 的 peer
   compatibility。
3. Harness 自身当前调用的少量 `Effect` / `Schema` / `@effect/vitest` API 没有命中
   已知移除项；真正命中的变化主要在版本与来源身份、reference routing 和 peer
   policy。
4. `@effect/platform-node` 的 Redis peer 已从 `ioredis` 改为 `redis`；即使 Harness
   自己不使用 `NodeRedis`，Target requirements 与安装验证也必须显式判断这一变化。

## 官方发布事实

| 包 | Harness 基线 | 当前最高 v4 | 发布时间（UTC） | stable 状态 |
| --- | --- | --- | --- | --- |
| `effect` | `4.0.0-beta.97` | `4.0.0-rc.110` | 2026-08-17 01:51:32 | prerelease；无 `4.0.0` |
| `@effect/platform-node` | `4.0.0-beta.97` | `4.0.0-rc.110` | 2026-08-17 01:52 左右 | prerelease；无 `4.0.0` |
| `@effect/vitest` | `4.0.0-beta.97` | `4.0.0-rc.110` | 2026-08-17 01:52:40 | prerelease；无 `4.0.0` |

三项 RC release 分别见
[effect](https://github.com/Effect-TS/effect/releases/tag/effect%404.0.0-rc.110)、
[@effect/platform-node](https://github.com/Effect-TS/effect/releases/tag/%40effect/platform-node%404.0.0-rc.110)、
[@effect/vitest](https://github.com/Effect-TS/effect/releases/tag/%40effect/vitest%404.0.0-rc.110)。
完整候选差异可从官方
[beta.97...rc.110 compare](https://github.com/Effect-TS/effect/compare/effect%404.0.0-beta.97...effect%404.0.0-rc.110)
进入；`effect`、platform-node 与 vitest 的逐版说明分别在官方
[core changelog](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/effect/CHANGELOG.md)、
[platform-node changelog](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/platform/node/CHANGELOG.md)、
[vitest changelog](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/vitest/CHANGELOG.md)。

`effect@4.0.0-beta.97` 的官方 tag 指向
[`f643dbb265093065dc0a61ca6133693dc2401678`](https://github.com/Effect-TS/effect/commit/f643dbb265093065dc0a61ca6133693dc2401678)，
与 Harness 当前 Effect publication provenance 一致；`rc.110` tag 指向
[`66114151c2b4640bf773f2b3456ce70d679422f6`](https://github.com/Effect-TS/effect/commit/66114151c2b4640bf773f2b3456ce70d679422f6)。
后者只可用于这份候选审计，不能代替未来 stable tag 的 revision。

## `beta.97 → rc.110` 中会命中 Harness 的变化

### 1. canonical source repository 已变化

`beta.97` 的 package manifest 使用
`https://github.com/Effect-TS/effect-smol.git`；`rc.110` 三个包均使用
`https://github.com/Effect-TS/effect.git`。可直接对照官方 tag 下的
[beta.97 effect package manifest](https://github.com/Effect-TS/effect/blob/effect%404.0.0-beta.97/packages/effect/package.json)
与
[rc.110 effect package manifest](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/effect/package.json)。

这会直接命中 `acceptedEffectBaseline.sourcePins.effect.sourceUrl`、Partita
publication provenance、`artifact-assets/effect/reference-archives/effect.json` 和所有
依赖 canonical source identity 的测试。旧 URL 当前会重定向，但 Source Pin 真值不应
永久依赖重定向；stable 升级时应以 `Effect-TS/effect` 为 canonical URL，重新发布
archive/provenance，而不是只替换 npm semver。

### 2. platform 源码在 monorepo 内搬家

官方 [PR #7169](https://github.com/Effect-TS/effect/pull/7169) 把平台包统一移入
`packages/platform/`：`packages/platform-node/**` 变为
`packages/platform/node/**`，`packages/platform-node-shared/**` 变为
`packages/platform/node-shared/**`。npm 包名与运行时 import
`@effect/platform-node/*` 没有随目录改名。

这会直接使当前 managed source routing 中的以下路径失效：

- `repos/effect/packages/platform-node/src/`
- `packages/platform-node/src/NodeRuntime.ts`

stable Source Pin 更新时必须把它们路由到 `packages/platform/node/src/`；同时检查
任何 subtree contract、archive test 和诊断文档是否把 repository path 与 npm import
path 混为一谈。

### 3. 三包仍要求同一 prerelease/stable 版本线

`rc.110` 的 `@effect/platform-node` 与 `@effect/vitest` 都把 `effect` peer 固定在
匹配的 `^4.0.0-rc.110` 版本线；官方 package manifests 见
[@effect/platform-node](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/platform/node/package.json)
和
[@effect/vitest](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/vitest/package.json)。

因此 Harness 现有“同一个 `versions.effect` 投影到三个包”的模型仍正确；升级时应
一次性更新 `effect`、platform-node、vitest、自身 catalog/lock、managed baseline
及 Target policy，不能只升级 core。当前 acceptance fixture 还显式处理 Partita
带入的 `@effect/platform-node@4.0.0-beta.92` 与 shared 包 override；stable 升级必须
重新证明 Partita / Prelude 已发布版本的 peer graph，而不是沿用 beta 的
`trustPolicyExclude` 清单。

### 4. `@effect/vitest` 的 Vitest peer 收紧

官方 [PR #6668](https://github.com/Effect-TS/effect/pull/6668) 把
`@effect/vitest` 的 Vitest peer 收紧为 `>=4.1.0 <5.0.0`；`beta.97` 原先允许
`^3.0.0 || ^4.0.0`。Harness 自身当前 Vitest 4.1.x 满足候选要求，但 managed
Target baseline 只显式声明 `@effect/vitest`，没有把其 host `vitest` 的兼容范围表达为
Effect baseline package requirement。

stable 升级时至少应把这一 peer 作为 Target adaptation 的可观测前置条件：已有
Vitest 4.0 或 3.x 的 Target 不能被判为版本对齐，仅安装 `@effect/vitest` 也不足以
证明测试工具链可运行。

### 5. NodeRedis 从 `ioredis` 迁移到 `redis`

官方 [PR #7221](https://github.com/Effect-TS/effect/pull/7221) 将
`@effect/platform-node/NodeRedis` 从 `ioredis` 改为 node-redis，并把 peer 改为
`redis: >=5.0.0 <7.0.0`。同时：

- layer 接受 `RedisClientOptions`；socket 配置移入 `socket`；`db` 改为
  `database`；命令改用 camelCase，任意命令改用 `sendCommand`；
- layer 构建时连接，错误进入 `RedisError`；初始连接默认 fail-fast；
- scope finalization 改用 `close()`，可能等待 in-flight / blocking command。

Harness 自身不 import `NodeRedis`，所以没有直接源码修改；但 platform-node package
manifest 的 peer 已经改变，当前 lock 中由旧 platform / Partita 图带入的
`ioredis` 不能再被当成新 platform 的满足项。对 Target 应采用条件化策略：使用
NodeRedis 的 Target 需要迁移依赖与配置；不使用它的 Target 也要验证包管理器对这个
非 optional peer 的处理结果，不能静默忽略 install warning/error。

### 6. pinned reference import guard 不变，repository diagnostics 内容会漂移

npm package 的公共名字与本 Harness 的禁止导入边界仍是
`repos/effect/**`、`repos/tsgo/**`，所以 ESLint adapter 不需要因上游 monorepo 搬家而
增加规则。变化发生在 reference tree 内部：除了 platform 路径搬迁，官方还持续重写
AI docs、Schema 文档和源码索引。官方 [PR #7098](https://github.com/Effect-TS/effect/pull/7098)
开始随发布包投递 AI documentation；这不会改变 Harness “reference tree 只读、不得
import”的边界，但 stable archive 更新后必须重跑 managed docs 的所有 route
存在性检查。

## API、行为与工具变化：对 Harness 的命中判断

| 上游变化 | 官方证据 | Harness 判断 |
| --- | --- | --- |
| `Schema.ErrorClass` → `Schema.Error`、`Schema.TaggedErrorClass` → `Schema.TaggedError`、原 JavaScript Error schema → `Schema.ErrorInstance` | [PR #6732](https://github.com/Effect-TS/effect/pull/6732) | 当前 Harness 不使用这些名字；Target guidance / pinned examples 需随新 source pin 更新 |
| 独立 `effect/SchemaError` 模块移除，错误类型并回 `Schema` | [PR #7181](https://github.com/Effect-TS/effect/pull/7181) | 当前 Harness 无此 import；升级 smoke 应禁止陈旧 reference 路由 |
| `Schedule.andThen*` → `Schedule.concat*` | [PR #7077](https://github.com/Effect-TS/effect/pull/7077) | 当前 Harness 不使用；属于 Target 代码迁移项 |
| `Command.withHidden` / `hidden` → `Command.unlisted` / `unlisted` | [PR #7010](https://github.com/Effect-TS/effect/pull/7010) | 当前 Harness 不使用；属于 unstable CLI Target 迁移项 |
| `Schema.toArbitrary` 改为接收 fast-check module 的 factory，旧 lazy/report API 移除 | [PR #7148](https://github.com/Effect-TS/effect/pull/7148) | `@effect/vitest` 已同步适配；Harness 测试仅消费 test API，不直接调用该函数 |
| Schema representation / JSON Schema pipeline 大改，旧 persisted representation wire format 不兼容 | [PR #6649](https://github.com/Effect-TS/effect/pull/6649) | Harness 的 Prelude wire contract 不使用 Effect Schema representation，不能混淆两种 wire contract；使用 persisted Schema document 的 Target 必须迁移 |
| `Clock.Clock` 增加 monotonic nanos members，elapsed-time API 改用 monotonic time | [PR #6807](https://github.com/Effect-TS/effect/pull/6807) | Harness 无自定义 Clock；自定义测试 Clock 的 Target 需适配 |
| `effect/index` 等显式 `/index` 子路径被阻断 | [PR #6701](https://github.com/Effect-TS/effect/pull/6701) | Harness 均使用 package root / named module import，不受影响；Target adaptation 应把 `/index` import 视为陈旧用法 |
| `@effect/vitest` 修复 `it.describe.each` / `it.skip.each` proxy helper 丢失 | [PR #6444](https://github.com/Effect-TS/effect/pull/6444) | 行为修复，无 Harness 迁移；升级测试可自然覆盖现有 import |
| core 移除多项运行时依赖并内建 router、multipart、encoding、UUID/Kubernetes declarations | [core changelog](https://github.com/Effect-TS/effect/blob/effect%404.0.0-rc.110/packages/effect/CHANGELOG.md) | lock 会显著变化，但不应把已移除的 transitive package 变成 Harness requirement |

Harness 自身的生产代码只从 `effect` 使用 `Effect.succeed`；测试主要使用
`Effect.sync`、`Effect.gen`、`Effect.promise`、`Effect.runPromise`、基础
`Schema.Struct` / `String` / `Literal` / `Array` / `Unknown` 与同步 decode，以及
`@effect/vitest` 的 `it` / `expect`。在官方 `beta.98` 至 `rc.110` changelog 中没有
这些接口被删除或改名的记录。故当前证据支持“升级大概率不需要改 Harness 业务
实现”，但这不是跳过真实 typecheck/packed test 的理由。

## `@effect/tsgo@0.19.0 → 0.36.5` 的直接影响

### 官方 identity 与 metadata 差异

Harness 当前 tsgo Source Pin revision
[`f0d48a67515048d277feb2c184c41cd7cffa51a4`](https://github.com/Effect-TS/tsgo/commit/f0d48a67515048d277feb2c184c41cd7cffa51a4)
就是官方 `@effect/tsgo@0.19.0` tag。官方当前 `latest` 是稳定发布的
`@effect/tsgo@0.36.5`，tag revision 为
[`cf4147ada15dddb8cbb6194b0275411862ed9957`](https://github.com/Effect-TS/tsgo/commit/cf4147ada15dddb8cbb6194b0275411862ed9957)，
npm 发布时间为 **2026-08-15 10:19:47 UTC**，GitHub release 时间为
**2026-08-15 10:20:17 UTC**。证据见
[npm dist-tags](https://registry.npmjs.org/-/package/%40effect%2Ftsgo/dist-tags)、
[0.19.0 release](https://github.com/Effect-TS/tsgo/releases/tag/%40effect/tsgo%400.19.0)
与
[0.36.5 release](https://github.com/Effect-TS/tsgo/releases/tag/%40effect/tsgo%400.36.5)。

对两个 tag 的官方 generated metadata 做 name-set 对比后：

- 总 rules 从 **83** 增到 **95**；支持 Effect v4 的 rules 从 **78** 增到
  **90**；
- 新增以下 12 条 v4 rule，**没有删除**：
  `abortControllerInEffect`、`catchChainToFirstSuccessOf`、
  `catchTagToCatchReason`、`floatingEffectInVitest`、
  `missingPipeableSignature`、`preferSchemaTypeProperty`、
  `preferTypedSchemaDecoder`、`preferUnsafeConstructor`、
  `promiseInEffectSuccess`、`schemaLiteralNonFinite`、
  `schemaOpaqueInstanceMember`、`syncToSucceed`；
- `floatingEffect` 的 `fixable` 从 `false` 变为 `true`，并新增对应 yield
  quick fix；名称、group 与默认 severity 保持不变。

原始证据是 tag 内随 registry/fixtures 生成并由上游测试校验的
[0.19.0 metadata.json](https://github.com/Effect-TS/tsgo/blob/f0d48a67515048d277feb2c184c41cd7cffa51a4/_packages/tsgo/src/metadata.json)
与
[0.36.5 metadata.json](https://github.com/Effect-TS/tsgo/blob/cf4147ada15dddb8cbb6194b0275411862ed9957/_packages/tsgo/src/metadata.json)；
最新 rule registry 与 fix registry 分别见
[internal/rules/rules.go](https://github.com/Effect-TS/tsgo/blob/cf4147ada15dddb8cbb6194b0275411862ed9957/internal/rules/rules.go)
和
[internal/fixables/fixables.go](https://github.com/Effect-TS/tsgo/blob/cf4147ada15dddb8cbb6194b0275411862ed9957/internal/fixables/fixables.go)。

这里的“新增 12、无删除”同时适用于全量 rule set 与 v4-filtered rule set：两个
版本各有 5 条不支持 v4 的规则，所以总数与 v4 数都恰好增加 12。

### 为什么不能只换 tsgo package version

`tests/baseline-conformance.test.ts` 不接受 policy 的宽松子集。它读取 pinned
`repos/tsgo/_packages/tsgo/src/metadata.json`，过滤所有支持 v4 的 rule，按 Harness
`strictSeverity` 投影后，要求结果与
`canonicalEffectTsgoPolicy.diagnosticSeverity` **完全相等**。因此 pin 升到
0.36.5 而不改 policy 会立即失败；这正是期望的 upgrade gate。

按当前 `strictSeverity`，12 条新 rule 必须进入 canonical policy，投影值为：

| Rule | 0.36.5 metadata | Harness strict projection |
| --- | --- | --- |
| `abortControllerInEffect` | effectNative / suggestion | `warning` |
| `catchChainToFirstSuccessOf` | style / suggestion | `suggestion` |
| `catchTagToCatchReason` | style / suggestion，fixable | `suggestion` |
| `floatingEffectInVitest` | correctness / error | `error` |
| `missingPipeableSignature` | style / off | `warning` |
| `preferSchemaTypeProperty` | style / off，fixable | `warning` |
| `preferTypedSchemaDecoder` | style / suggestion，fixable | `suggestion` |
| `preferUnsafeConstructor` | antipattern / suggestion，fixable | `suggestion` |
| `promiseInEffectSuccess` | correctness / warning | `warning` |
| `schemaLiteralNonFinite` | correctness / error | `error` |
| `schemaOpaqueInstanceMember` | correctness / error | `error` |
| `syncToSucceed` | style / suggestion，fixable | `suggestion` |

一次合法的 tsgo upgrade 至少必须原子同步：

- `acceptedEffectBaseline.versions.tsgo`、workspace catalog、lock 与 installed
  identity；
- tsgo Partita Source Pin、archive/provenance 与 reference tree；
- `src/harness/Policy.ts` 的 canonical policy；
- `tsconfig.effect.json` 的 self projection；
- `artifact-assets/effect/managed/data/tsgo-policy.json` 的 Target projection；
- managed baseline/docs 中的版本与 rule behavior 说明。

这不只是配置维护：启用 12 条新规则会让 Harness 自身和已适配 Target 出现新的
warning/error/suggestion，`floatingEffect` 还会获得此前不存在的自动修复行为。升级
验收必须运行真实 patched compiler，而不能只比较 JSON；同时仍需核对 0.36.5 平台
binary 与 Harness 选择的 `@typescript/native` identity，不能从 metadata rule diff
推断 compiler compatibility。

候选只读 smoke 也支持这个判断：直接运行
`@effect/tsgo@0.36.5 effect-tsgo diagnostics --project tsconfig.json` 检查 6/6 个
production files，结果为 0 errors / 0 warnings / 0 messages，说明生产源码没有立即
迁移项；对 `tsconfig.tests.json` 检查 11/11 个文件则得到 33 warnings 与 1 message，
其中新增的 `syncToSucceed` 命中 `tests/prelude-module.test.ts:8`。测试与 tooling 当前
由 TS6 compatibility gate 管理而非 tsgo semantic gate，所以这不是 production
blocker；它证明了 policy 扩展确实会改变 Harness/Target 的可见 diagnostics，不能把
metadata 增量当成无行为影响的版本更新。

## stable Harness 的跨仓库 peer/runtime gate

当前已发布的
[`@sayoriqwq/prelude-contract@0.2.2`](https://registry.npmjs.org/%40sayoriqwq%2Fprelude-contract/0.2.2)
声明精确 peer `effect: 4.0.0-beta.97`。这不是一个能自然接受未来 stable 的 caret
range：Effect Harness 若把自身 catalog 单独改成 `effect@4.0.0`，其直接依赖
`@sayoriqwq/prelude-contract@0.2.2` 就会形成不满足的 peer graph。

另一方面，当前使用的
[`@sayoriqwq/partita@0.2.2`](https://registry.npmjs.org/%40sayoriqwq%2Fpartita/0.2.2)
把 `effect@4.0.0-beta.92`、`@effect/platform-node@4.0.0-beta.92` 和
`@sayoriqwq/prelude-contract@0.2.0` 声明为普通 dependencies，而不是只声明兼容
peer。由此产生的是一个实际的 beta.92 runtime/tool graph，不能靠 Harness 顶层
`effect@4.0.0` 自动收敛为 stable。

本仓库 lock 与 acceptance 已把这个事实写成可执行证据：

- `pnpm-lock.yaml` 同时解析顶层 contract 0.2.2 / effect beta.97，以及 Partita 内的
  contract 0.2.0 / effect 与 platform-node beta.92；
- `pnpm-workspace.yaml` 需要把 platform-node-shared override 到 beta.97，并为
  beta.92 / beta.97 Effect 图配置 trust-policy exceptions；
- `tests/acceptance/cross-repo.ts` 在 packed Partita runner 中再次写入同样的
  platform shared override 与 beta trust-policy exclusions，证明这不是 lockfile
  偶然残留，而是发布物消费路径的一部分。

这个 beta.92 图属于 Partita 的 producer/tool runtime，不等同于 Harness Artifact 或
Target runtime。按照现有架构边界，Partita 只拥有通用 Source Pin publication，具体
Effect 版本由 Harness 选择；因此不能仅因 Effect stable 就反向要求 Partita 采用同一
Effect runtime。硬性的 consumer 发布顺序是：

```text
Effect stable identity
  → Prelude Contract 以 stable Effect peer 重发
  → Effect Harness 消费新 Contract，更新两棵 Source Pin 与 policy
  → Prelude 消费新 Contract / Harness
  → packed cross-repository acceptance 证明 Target consumer graph 为 stable
```

Partita 是否重发是条件性的。复用 0.2.2 时，packed gate 必须证明它的历史 beta.92
runtime 保持在 producer 边界内，仍能确定性地产生新 Contract 可接受的 canonical
archive/provenance，且 beta package 不泄漏进 Harness tarball 或 Target consumer
graph；若这项证明失败，或发布政策要求消除 producer 内的 beta runtime，才需要先
重发 Partita。也可以另行设计更深的 peer 或 adapter seam，但那是 Partita 自身的
架构工作，不是 Effect Harness 这次 pin selection 的默认范围。

Harness 不得通过顶层 override 把未满足的 Prelude Contract stable peer 伪装成兼容；
Partita 历史 runtime 所需的 scoped override / trust exception 只能作为 producer
隔离证据保留，不能被误报成 Target 已收敛。升级 gate 应明确拒绝：Harness/Prelude
consumer 侧未满足的 Contract peer、泄漏到 consumer 的 beta Effect runtime、陈旧
Redis peer，以及只在本仓库 self install 成功但 packed publication/Prelude 消费失败
的状态。

这意味着“Effect stable 同步”是 dependency-order 的 cross-repository release，
不是 Effect Harness 的 catalog bump。Prelude Contract 必须先重发；Partita 必须先
通过复用证明或在必要时重发。若 public contract 或 producer runtime graph 发生变化，
Prelude 与 Harness 的 acceptance fixtures 都必须消费真实 tarball 重新证明。

## stable 真正发布后的同步清单

按当前权威边界，建议一次升级事务完成：

1. 先从官方 npm dist-tags、GitHub stable release 和 `effect@4.0.0` tag 获取同一个
   stable identity；如果三包没有同时发布，不接受部分升级。
2. 先重发以 stable Effect peer 构建的 Prelude Contract；随后用 packed gate 决定
   Partita 0.2.2 能否作为隔离 producer 复用。只有兼容/隔离证明失败或发布政策要求
   消除 beta producer graph 时才重发 Partita；不得用 Harness 顶层 override 绕过
   Contract peer。
3. 决定与 stable Effect 对齐的 tsgo / native TypeScript identity，审计 metadata、
   schema、platform binary 与新增 diagnostics，再固定 exact versions。
4. 使用已通过上述 gate 的 Partita producer，将 Effect Source Pin canonical URL 改为
   `https://github.com/Effect-TS/effect`，以 stable tag 的 peeled commit 重新执行
   publication；同时重发 tsgo Source Pin，记录两者的新 revision/tree digest。
5. 同步 `Baseline.ts`、workspace catalog、lock、canonical tsgo policy、self/managed
   projections、managed baseline 与 effect-code docs；不要手工短接
   archive/provenance。
6. 修正 managed effect-source routing 的 `packages/platform/node/**` 与
   `packages/platform/node-shared/**` 路径，并验证 archive 中每个路由真实存在。
7. 审计 Target peers：Vitest 必须满足 stable `@effect/vitest` manifest；NodeRedis
   用户迁移到 `redis`；Prelude / Target consumer graph 不得再依赖 beta override，
   Partita 若保留历史 override，必须继续被 scoped 在 producer gate 内。
8. 最后运行 `pnpm verify`，并用 packed isolated Target 证明 Contract → Partita
   publication → Harness tarball install → Effect-tsgo
   activation → typecheck → `@effect/vitest` test 的完整消费路径。

## 未决与停止条件

- **stable version、发布时间、tag commit、tree digest 均未产生。** 任何现在写出的
  `4.0.0` stable identity 都是猜测。
- `main` 在 `rc.110` 之后已有未发布提交，不能以 `main` HEAD 代替 release tag。
- RC 到 stable 之间仍可发生 API、peer、source layout 与 changelog 变化；本报告的
  API 清单是候选预审，不是 future stable 的穷尽式 release notes。
- 只有当官方 npm 同时出现三个匹配的 stable 包、GitHub release 不再标记 prerelease、
  且 stable tag 可解析到不可变 commit 时，才能关闭这项审计并开始正式 baseline
  mutation。
