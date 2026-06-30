# Effect Harness Guide

这个目录是给人读的 guide 层。它帮助维护者和目标仓库用户理解 harness 怎么运作、
从哪里补信息、以及实践问题如何反馈回来。

如果你是在执行任务的 agent，优先读取 harness contract 层：

- `harness/index.md`
- `harness/exposure.md`
- `harness/provider/index.md`
- `harness/feedback/index.md`
- `harness/target-agent-contract.md`
- `repos/effect/LLMS.md`
- `repos/effect.subtree.json`

## 层级划分

| Layer | Audience | Writing style | Files |
| --- | --- | --- | --- |
| Guide | 人 | 解释背景、路径和判断方式，优先可读性。 | `guide/` |
| Harness contract | agent | 明确 provider profile、规则、输入、输出、验证命令和禁止事项。 | `harness/`、CLI/verifier |
| Official source | 人和 agent | Effect 语义真源。 | `repos/effect/`、`@effect/tsgo` |

Guide 可以解释为什么这样设计；harness contract 必须让 agent 知道具体该读什么、改什么、
跑什么验证、哪些内容不能提升。

## 阅读路径

新接入目标仓库的人先读：

- [Setup Guide](./setup.md)
- [Default Harness Capabilities](./default-capabilities.md)

维护本仓库的人先读：

- [Default Harness Capabilities](./default-capabilities.md)
- `harness/feedback/index.md`
- `harness/exposure.md`

## Feedback Loop

实践反馈可以来自外部 target，也可以来自本仓库自己的 CLI/runtime/verifier 使用。
反馈先进入 intake；只有能变成 reusable harness contract 的内容才提升。

提升后的落点必须明确：

- guide：帮助人理解怎么使用或判断。
- runtime：由 prelude provider 或 standalone `effect-harness init` 投递给 target。
- guardrail/verifier：把 recurring failure 变成会失败的检查。
- repo-local skill：维护本仓库 harness contract 的流程。
