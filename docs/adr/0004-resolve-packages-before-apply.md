---
status: superseded by ADR-0007
---

# Resolve packages before apply

Prelude core installs only an Approved Package Selection: exact manifest and
lock bytes that have already been reviewed and bound to the Plan and execution
hash. When Harness Requirements are missing or incompatible, a repair workflow
resolves them in a temporary copy and presents the complete manifest and lock
diff for approval before replanning; Apply then performs a frozen install
without running `pnpm add` or otherwise selecting versions. This adds a repair
round trip to initial integration but prevents Apply from introducing an
unreviewed dependency graph or workspace-wide lock changes.
