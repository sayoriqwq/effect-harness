# Feedback loop

Use one small change and one named failure route at a time:

1. Identify the selected package root and the failing Plan declaration or
   Check.
2. Read the route from [index.md](./index.md).
3. Inspect delivered source only when managed guidance is insufficient.
4. Make the smallest approved Target-owned change.
5. Replan before Apply; after Apply, replan again before Checks.
6. Run all declared Checks and review the resulting diff.

An Output can converge atomically while a later Output or install fails. That
state is incomplete: preserve the failure evidence, do not run Checks, do not
claim convergence, and continue from a fresh Plan.
