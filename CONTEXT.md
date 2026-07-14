# Effect Harness

Effect Harness defines the version-aligned Effect authoring capability that an
Artifact and Prelude jointly deliver into an Integration.

## Language

**Integrated Recovery Gate**:
The completion boundary for restoring the Effect authoring capability. It is
reached only when Effect Harness and Prelude can jointly deliver and validate
the recovered capability.
_Avoid_: Harness-only recovery gate, internal recovery complete

**Baseline**:
An accepted, version-aligned combination of an Effect Harness Artifact and a
compatible Prelude protocol and host.
_Avoid_: Harness version, latest package set

**Protocol Cutover**:
The deliberate replacement of the V1 Prelude relationship with the successor
protocol as the only accepted shape for a new Baseline.
_Avoid_: Compatibility window, dual-protocol host

**Approved Package Selection**:
The exact Target manifest and lock state reviewed and authorized during Target
Adaptation before the delivered skill applies the selected dependency graph.
It is durable Target-owned evidence, not a Harness Output or Prelude install
instruction.
_Avoid_: Package range intent, Harness Requirement, Prelude-owned lockfile

**Converged Integration**:
An Integration whose stable Harness-owned Outputs match one accepted Artifact
version and whose Target-owned authoring capability has been adapted and
verified through the delivered skill with durable evidence.
_Avoid_: Partially delivered Integration, green Plan, package-shaped inference

**Output Atomicity**:
The guarantee that one Harness-owned Output is replaced wholly, even though an
Integration may remain partially converged after a multi-Output failure.
_Avoid_: Plan transaction, persistent rollback

**Integration**:
One configured relationship between an Effect Harness Artifact and a Target,
covering one or more explicitly selected package roots.
_Avoid_: Package, repository

**Target Adaptation**:
The skill-owned observation, proposal, authorized mutation, and verification
that maps Effect Harness Baseline and policy data onto a repository's actual
package, TypeScript, compiler, lint, editor, and command topology.
_Avoid_: Project discovery, Prelude policy inference

**Control Handoff**:
The transfer from delivered Harness-owned capability data and guidance to a
user-authorized skill that owns Target-local choices, mutation, verification,
and executable configuration.
_Avoid_: Provider lifecycle, Target dispatcher

**Root-scoped Observation**:
A read-only request from a trusted Harness Module for an explicit path beneath
the Control Root, its Integration Workspace, or an approved Package Root.
_Avoid_: Observation allowlist, unrestricted filesystem access

**Integration Workspace**:
The committed Target area containing Harness-owned managed knowledge and pinned
references alongside Target-owned feedback.
_Avoid_: Cache, checkout, generated folder

**Pinned Reference Tree**:
An official, version-bound source-provenance snapshot owned by Effect Harness
and delivered read-only inside an Integration Workspace. It is exported from a
Canonical Tree Archive built from a Source Pin but does not carry an independent
Git lifecycle.
_Avoid_: Checkout, vendored dependency, editable source copy

**Canonical Tree Archive**:
A deterministic ordinary Artifact file that transports the complete
materializable reference surface of one pinned repository layer across package
managers without losing empty directories, modes, or Safe Reference Links.
Prelude validates and expands it offline.
_Avoid_: Installed source directory, Target reconstruction, package-manager copy

**Opaque Gitlink**:
An upstream Git index reference to another repository that marks the boundary
of the selected Source Pin layer. Harness keeps the outer repository's
`.gitmodules` context but does not follow, pin, archive, or materialize the
referenced repository.
_Avoid_: Missing required source, nested Source Pin, recursive vendoring

**Safe Reference Link**:
A symbolic link preserved as part of a Pinned Reference Tree whose exact POSIX
target resolves lexically inside that same tree. It is hashed and materialized
as a link without being followed; it is never allowed in a Managed Tree.
_Avoid_: Dereferenced link, external link, managed symlink

**Source Pin**:
The authoritative GitHub git-subtree relationship whose generic planning,
verification, deterministic publication, and provenance metadata are owned by
Partita. Effect Harness selects the concrete Effect and tsgo pins and combines
their published artifacts with Harness-specific Baseline identity and Target
delivery policy.
_Avoid_: Target pin, package version pin, downloaded source copy

**Reference Drift**:
A Target-side change inside a Pinned Reference Tree that diverges from the
Artifact-owned source snapshot.
_Avoid_: Local patch, source customization
