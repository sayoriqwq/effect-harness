# Quality and completion policy

Stable Prelude Output convergence is the prerequisite for Control Handoff, not
proof that a Target toolchain works. Target Adaptation is complete only when:

- the authorized package, lockfile, tsconfig, activation, ESLint, editor, and
  verification changes match the actual repository topology;
- the selected TypeScript 7 and Effect-tsgo identities and patch activation are
  proven through real tools;
- a representative unsuppressed Effect diagnostic reaches the Target's real
  typecheck path and affects its exit code under the canonical policy;
- the Target's own lint, test, and verification commands pass; and
- durable Target-owned rationale and verification evidence are reviewed.

Schema validity, installed packages, or the presence of a plugin item are not
substitutes for actual execution.
