---
name: adapt-effect-target
description: Adapt a delivered Effect Harness integration to a real Target repository through Control Handoff. Use for first integration, upgrades, package or project topology changes, compiler activation repair, or verification of Effect-tsgo behavior.
---

# Adapt Effect Target

Perform Target Adaptation only after Prelude delivers the stable Harness-owned
managed tree, routing block, and pinned reference trees. The Target owns every
repository-specific change.

## Authority

Read `../../data/baseline.json` and `../../data/tsgo-policy.json`; never copy
versions or policy values from prose or memory. The Baseline names formal
TypeScript 7 as the primary compiler, Effect-tsgo as the sole Effect/TypeScript
semantic authority, and TypeScript 6 as compiler-API compatibility. Preserve
TypeScript 6 wherever current Target tooling still requires it.

Read `../../docs/index.md`, `../../docs/package-config.md`, and the Target's
root instructions before acting. Treat delivered `managed/**` and `repos/**`
as read-only evidence.

## Control Handoff

1. **Observe.** Inspect the package manager, workspace manifests and lockfile,
   direct Effect authoring and Effect-opaque boundaries, tsconfig inheritance,
   build/test/editor projects, existing compiler and patch lifecycle, executable
   ESLint composition, editors actually used, verification commands and CI, and
   existing suppression decisions. Do not infer ownership from folder names.
2. **Propose.** Present one reviewable adaptation covering selected package
   roots, one toolchain root and activation owner, TypeScript 6 compatibility,
   the complete policy landing and inheritance, package and lockfile changes,
   Effect-tsgo activation, ESLint composition, relevant editor changes,
   verification scripts and commands, intended suppression changes, and the
   location of durable evidence.
3. **Authorize.** Obtain explicit authorization for that proposal before any
   mutation. If discovery changes the proposal materially, stop and authorize
   the revised proposal.
4. **Mutate.** Make only authorized Target-owned changes to manifests, lockfiles,
   tsconfig files, activation or prepare scripts, executable ESLint config,
   relevant editor config, verification scripts, and durable configuration or
   `feedback/**` evidence. Install with the Target's package manager and preserve
   the complete canonical policy item and severity values.
5. **Verify.** Run the actual compiler and prove the selected TypeScript 7 and
   pinned Effect-tsgo identities and activation. Exercise a representative
   unsuppressed Effect diagnostic through the Target's real typecheck path and
   confirm its exit code, then run the Target's own lint, tests, and verification
   commands. Package presence or a plugin item alone is not proof.
6. **Hand back.** Review the diff, record the toolchain and project-selection
   rationale in committed Target-owned state, report exact verification evidence,
   and return ongoing control to the Target.

## Suppression exceptions

Suppression syntax and semantics belong to Effect-tsgo; permission and rationale
belong to the Target. Preserve existing suppression decisions unless the Target
requests an audit. Never add suppression merely to make verification pass.

A new exception requires the explained diagnostic, the smallest practical
scope, alternatives considered, explicit authorization, and durable
Target-owned rationale. It must not lower the canonical policy for unsuppressed
diagnostics.

## Guardrails

- Never mutate during observation or before authorization.
- Never weaken, partially reproduce, or locally override the canonical policy.
- Never patch once per package in a monorepo; use the authorized activation owner.
- Never add package-manager, tsconfig, editor, executable-config, or activation
  semantics to Prelude core or the Harness Module Plan.
- Never import or edit delivered reference trees, and never run pin maintenance
  commands in the Target.
