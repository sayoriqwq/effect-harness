---
name: update-effect-harness
description: "Use when the user asks to update effect-harness itself to the latest official Effect source pin, package baseline, or self-update workflow. Not for setting up an Effect target repo, generic repo pinning, writing Effect application code, or one-off dependency bumps outside effect-harness."
when_to_use: "update effect-harness, refresh Effect baseline, update Effect source pin, beta version drift, effect:status outdated, make effect-harness current, update harness mechanism"
dispatch_intent: "Update effect-harness official source and baseline"
---

# Update Effect Harness

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Craft skill is active.

Update `effect-harness` itself against official Effect source and package
baselines without turning a recurring harness operation into an ad hoc manual
checklist.

## Capability

Turn "update the harness to latest" into a reviewable mechanism-first update:
detect official drift, decide whether the current harness has a hard update
path, run or create that mechanism, then verify the harness and report any
missing hard surface before target repos consume the update.

Pressure scenario: the agent sees `effect:status` drift, edits versions and
docs by hand, updates a subtree in the same pass as unrelated target work, or
claims the harness is current while the update path still depends on memory and
prose.

## Trigger

Use this skill when the user asks to:

- update `effect-harness` to the latest official Effect beta or source pin;
- refresh `repos/effect`, `repos/effect.subtree.json`, pnpm catalog,
  overrides, lockfile, or baseline docs inside `effect-harness`;
- turn a repeated Effect baseline update checklist into a CLI, script,
  verifier, or test-backed harness contract;
- decide whether a downstream target can safely update after harness drift.

Do not use this skill when:

- the task is to set up, migrate, or repair a target repo; use
  `setup-effect-area`;
- the task is generic external repo pinning; use `pin`;
- the task is writing Effect application features or fixing target business
  code;
- the user only wants to inspect official Effect docs without changing the
  harness.

## Soft Boundary

Primitive audit: `update-effect-harness` is `stateful`,
`activation: narrow`, and `duration: task`. It may write source pins,
baseline manifests, package metadata, lockfiles, docs, verifier contracts,
tests, or update CLI surfaces in `effect-harness`. It stops when the harness is
verified current, or when the missing update mechanism is named as the blocker.

Use agent judgment for:

- whether the current task is a harness self-update or target setup;
- whether existing `effect-harness` commands are sufficient, or a hard update
  mechanism must be added before changing versions;
- whether official API drift requires verifier/runtime contract changes;
- whether downstream target work should wait until the harness update is
  landed and verified;
- how to separate reviewable commits or diffs when source subtree churn is
  large.

## Hard Boundary

This section mixes model-applied boundaries with hard checks. Only items tied
to machine-checkable surfaces such as git commands, npm dist-tags, the
`effect-harness` CLI, pnpm lockfile validation, tests, or verifier output are
primitive `constraint.hard`; prose-only update rules remain strict `soft`
constraints.

- Do not call the harness current unless `pnpm effect:status` reports every
  official row current, or reports the exact blocker.
- Do not update `repos/effect` or package baselines with a dirty worktree unless
  the dirty files are the current update task and the user explicitly accepts
  that scope.
- Do not treat a prose checklist as the hard update mechanism. If no CLI,
  script, verifier, schema, test, or package check enforces the repeatable
  update, first add or request that mechanism.
- Do not mix an official Effect source/baseline update with target repo setup
  or business feature work.
- Do not hand-write package versions from memory; resolve official npm
  dist-tags and source head through `effect-harness` status/update machinery or
  direct official commands.
- Do not finish without `pnpm verify` and final `pnpm effect:status`, or an
  exact machine-checkable blocker.

## Workflow

1. Confirm the repo is `effect-harness` and preflight:

   ```bash
   git status --short --branch -uall
   pnpm effect:status
   ```

2. Classify the task:
   - `status-only`: report drift, no writes.
   - `mechanism-gap`: status proves drift but the repeatable update path is not
     hard enough.
   - `harness-update`: run the owning hard update path.
   - `target-blocked`: downstream setup must wait for a verified harness.
3. If classification is `mechanism-gap`, design the smallest hard surface
   before changing the source pin or baseline.
4. If classification is `harness-update`, update only the official source pin,
   manifest baseline, pnpm catalog/overrides/trust policy, lockfile, baseline
   docs, and tests directly required by the official drift.
5. Read updated official guidance before changing runtime/verifier contracts.
6. Verify:

   ```bash
   pnpm verify
   pnpm effect:status
   ```

7. Report changed files, official source ref, package baseline, update command,
   verify command, and any target repos still blocked.

## Validation

Before treating output as valid `update-effect-harness`, check:

- first user-facing line includes `🧭` inline;
- the task is classified as `status-only`, `mechanism-gap`,
  `harness-update`, or `target-blocked`;
- soft judgment and deterministic hard constraints are separated;
- hard constraints are backed by CLI, git, npm, package, test, or verifier
  output;
- no target repo setup or business work was mixed into the harness update;
- completion reports `pnpm verify` and `pnpm effect:status`, or exact blockers.
