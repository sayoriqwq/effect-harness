# Hand Target Adaptation to a delivered skill

Effect Harness delivers its Target-aware adaptation skill, immutable Baseline
and tsgo policy data, and supporting knowledge through Prelude, then performs a
Control Handoff. The skill inspects the real repository, selects the packages
and TypeScript projects that author or compose Effect, identifies the Target's
toolchain and editor landings, and proposes reviewable Target-owned changes.
After user authorization, the skill owns adaptation of package manifests,
lockfiles, tsconfig inheritance, the Effect-tsgo patch lifecycle, executable
ESLint composition, editor configuration, verification scripts, and any
Target-owned suppression exceptions.

Prelude remains the safe materialization host for stable Harness-owned Outputs:
the managed knowledge tree, agent-routing block, and pinned reference trees.
Effect Harness does not model Target package installation, tsconfig items,
prepare scripts, editor settings, or Target command composition as universally
applicable Outputs or Requirements. Those shapes vary with the Target and are
handled after Control Handoff. A subsequent read-only plan and the skill's
actual Target checks provide evidence of the resulting capability; neither
Prelude core nor Harness planning claims to infer complete business topology.

The skill must not add a suppression merely to make a check green. Suppression
semantics remain owned by tsgo, while permission and rationale are Target-owned
decisions. Existing or explicitly approved exceptions are adapted and recorded
according to Target policy rather than being globally forbidden by Effect
Harness.

This deliberately trades an impossible claim of complete automatic coverage
for Target-local judgment made explicit in committed configuration, reviewable
diffs, actual tool execution, and durable Target evidence. It supersedes
ADR-0006 and replaces the earlier ADR-0007 assumption that Prelude converges an
exact Harness-declared tsconfig Output.
