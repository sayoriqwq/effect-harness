---
name: adapt-effect-target
description: Inspect a real repository, select the packages that author or compose Effect, and prepare reviewable Prelude V2 and TypeScript configuration changes. Use when first integrating or upgrading Effect Harness, when a monorepo package selection changes, or when the declared Effect tsconfig Output lands at the wrong project boundary.
---

# Adapt Effect Target

Map the delivered Effect policy onto the Target's actual package and TypeScript
topology, then hand control back through committed configuration and checks.

## Workflow

1. Read `../../docs/index.md`, `../../docs/package-config.md`, and the Target's
   root `AGENTS.md` before proposing changes.
2. Inspect workspace manifests, package manifests, direct Effect imports,
   Layer and Service composition, runnable entries, and the `extends` graph of
   relevant tsconfig files. Do not infer selection from folder names alone.
3. Select a package root when that package directly authors or composes Effect
   programs. Leave a consumer unselected only when its boundary is genuinely
   Effect-opaque, such as a Promise or plain domain interface.
4. Present the proposed nonempty `packageRoots` and every Target-owned config
   repair before editing. Explain why each selected root owns an Effect policy
   landing and how secondary build, test, or runtime projects inherit it.
5. After user approval, record the selection in `.prelude/config.jsonc` and
   make only the approved Target-owned tsconfig or executable-config repairs.
   Never edit delivered `managed/**` or `repos/**` content.
6. Run the installed Prelude plan flow. Verify that the Plan contains one
   Integration-scoped managed tree and pinned reference set, plus one complete
   language-service policy Output and package-scoped Requirements and Checks
   for every selected root. Resolve locator or ownership surprises before
   Apply.
7. Apply only the approved Plan, replan, then run the declared Target Checks.
   Inspect the resulting plugin item for local `overrides` or lowered
   `diagnosticSeverity` entries, and inspect relevant source changes for
   `@effect-diagnostics` suppression directives. Do not claim convergence when
   policy was weakened, Apply is incomplete, or a Check is skipped.
8. Leave durable reasoning in committed config, reviewable diffs, and, when
   useful, Target-owned `feedback/**`; do not leave the selection rationale
   only in chat. Hand ongoing ownership back to the Target.

## Selection example

For `packages/domain`, `packages/effect-runtime`, `apps/api`, and `apps/jobs`:

- Select `packages/effect-runtime` when it defines shared Layers and Services.
- Select `apps/jobs` when it directly composes and runs Effect workflows.
- Select `apps/api` if it builds Effect routes itself; otherwise leave it out
  only when it consumes an Effect-opaque interface from `effect-runtime`.
- Leave `packages/domain` out when it contains plain domain types and logic.

The package layout is evidence, not the answer. Confirm the actual imports,
composition, execution, and tsconfig inheritance.

## Guardrails

- Never discover and silently claim every workspace package.
- Never run Git fetch, clone, subtree, or `$pin` in the Target. Delivered
  `repos/**` trees are read-only reference evidence owned by Effect Harness.
- Never import delivered reference trees from application or test code.
- Never weaken or suppress the canonical diagnostic policy to make a Check
  pass; route failures through the managed diagnostic guidance.
- Never describe Prelude core as proving business-topology coverage. This skill
  owns selection correctness; Prelude owns safe materialization correctness.
