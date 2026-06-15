---
name: setup-effect-area
description: "Use when the user asks to set up, update, verify, or repair a TypeScript/Effect target repository against effect-harness runtime and CLI contracts. Not for updating effect-harness itself, generic repo pinning, writing Effect business features, or defining Craft skill semantics."
when_to_use: "setup effect area, update Effect target, effect-harness init, Effect target setup, verify Effect harness target, setup TypeScript Effect repo, effect runtime contract"
dispatch_intent: "Set up Effect target area with effect-harness"
---

# Setup Effect Area

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Craft skill is active.

Set up a target TypeScript/Effect repository against an existing
`effect-harness` CLI and runtime contract.

## Capability

Use Craft-owned skill guidance to drive the `effect-harness`-owned executable
mechanism: resolve target and harness roots, run the harness setup path, inspect
managed output, and verify the target against the harness contract.

Pressure scenario: the agent hand-copies Effect docs or skills, adds a
target-local dispatcher, updates baseline versions manually, or lets
`effect-harness` runtime copies become the source of Craft skill semantics.
Another pressure scenario: the agent patches one target file while leaving the
package baseline, verify chain, managed runtime, and harness manifest
inconsistent.

## Trigger

Use this skill when the user asks to:

- run, review, or repair `effect-harness init` for a target repo;
- update a target repo after `effect-harness` baseline or runtime contract
  changes;
- verify whether a target repo is compatible with the current `effect-harness`;
- coordinate Craft skill source with `effect-harness` managed runtime copies.

Do not use this skill when:

- the request is generic external repo pinning; use `pin`;
- the user asks to update `effect-harness` itself, `effect-harness/repos/effect`,
  or the official Effect source subtree; use `update-effect-harness`;
- the user wants Effect API design or target business feature work after setup;
- the task is to redesign Craft skill semantics inside `effect-harness`.

## Soft Boundary

Primitive audit: `setup-effect-area` is `stateful`, `activation: narrow`, and
`duration: task`. It may write target package metadata, tsconfig, `.codex`
runtime, `.effect-harness.json`, AGENTS managed blocks, lockfiles, and managed
runtime copies. It stops when the target verifies against `effect-harness`, or
when missing roots, dirty worktree risk, or missing CLI support blocks setup.
Root selection, update strategy, copy ownership review, and whether to wait for
a harness self-update are `soft`; harness init commands, target verify, source
status, package checks, local-dispatcher detection, and target `verify` are
primitive `constraint.hard` only when enforced by CLI commands, scripts, git,
grep/package checks, or package validation.

Classify the target before editing:

- `fresh-setup`: no target harness contract exists.
- `target-update`: target already has managed harness output but the harness
  baseline or runtime contract changed.
- `blocked-by-harness`: target cannot update until `effect-harness` exposes a
  hard setup or update mechanism.

Authority split:

- Craft owns skill source semantics.
- `effect-harness` owns setup CLI, verifier, runtime projection, and sync
  mechanism.
- Target repos own target-local product code and local verification results.
- Any skill copy in `effect-harness` or a target repo is a managed projection,
  not source authority.

## Hard Boundary

This section mixes model-applied boundaries with hard checks. Only items tied
to machine-checkable surfaces such as the `effect-harness` CLI, package scripts,
git status, or verifier output are primitive `constraint.hard`; prose-only
boundaries remain strict `soft` constraints.

- Do not define Craft skill semantics in `effect-harness`; update Craft first,
  then sync managed copies through an explicit mechanism.
- Do not copy the harness repo's internal skills into a target repo. Target
  repos receive only `runtime/codex` output from `effect-harness init`.
- Do not add target-local effect-harness dispatcher scripts.
- Do not hand-write Effect baseline versions; read them from
  `<harness-root>/repos/effect.subtree.json` or let the harness CLI write them.
- Do not run source subtree update commands for target setup.
- Do not claim setup is complete until the relevant verifier or exact blocker
  is reported.

## Workflow

1. Resolve `HARNESS_ROOT` and `TARGET_ROOT`. Ask one focused question if either
   root is missing or ambiguous.
2. Preflight both repos with `git -C "$ROOT" status --short`; preserve dirty
   user work.
3. Read harness authority: `README.md`, `docs/target-agent-guide.md`, and
   `repos/effect.subtree.json`.
4. Read target shape: `AGENTS.md`, `package.json`, `pnpm-workspace.yaml`,
   `tsconfig.json`, and local dispatcher scripts.
5. Classify the target as `fresh-setup`, `target-update`, or
   `blocked-by-harness`. If the required harness setup/update command does not
   exist, report that blocker instead of hand-writing a replacement.
6. Run setup or update dry-run before writing:

   ```bash
   node "$HARNESS_ROOT/bin/effect-harness.ts" init --target "$TARGET_ROOT" --harness "$HARNESS_ROOT" --dry-run
   ```

7. For actual setup or update, run the owning harness command without
   `--dry-run`.
8. If package or lockfile surfaces changed, run from the target:

   ```bash
   pnpm install
   pnpm exec effect-tsgo patch
   ```

9. Verify from the target:

   ```bash
   pnpm effect:status
   pnpm effect:verify
   pnpm verify
   ```

10. Report changed files, target classification, whether `effect:status` is
    current, verifier results, and any missing `effect-harness` CLI/sync
    mechanism.

## Validation

Before treating output as valid `setup-effect-area`, check:

- first user-facing line includes `🧭` inline;
- target root and harness root are explicit;
- target classification is `fresh-setup`, `target-update`, or
  `blocked-by-harness`;
- Craft skill source and `effect-harness` CLI/runtime ownership are separated;
- setup or update dry-run happened before target writes;
- no official Effect source subtree update happened for target setup;
- target receives managed runtime output, not harness-internal skill source;
- hard constraints are backed by CLI, package script, git, or verifier output;
- completion reports changed files and verification results or exact blockers.
