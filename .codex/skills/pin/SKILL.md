---
name: pin
description: "Use when the user asks to pin an external repository or source repo into the current repository as a durable tracked source with locator, manifest, update path, and verification. Not for Effect-specific harness setup, package-version pinning only, UI/thread pinning, or copying source without provenance."
when_to_use: "pin external repo, repo pin, source pin, vendor repository, subtree source, submodule source, tracked upstream source, repo locator, source provenance, update path"
dispatch_intent: "Pin external repository source"
---

# Pin

Prefix your first user-facing line with `🧭` inline, not as its own paragraph,
when this Craft skill is active.

Pin an external repository into the current repository as a durable source
surface with provenance, locator, update path, and verification.

## Capability

Turn a vague "pin this repo here" request into a reviewable repo-source
contract: identify the upstream, choose or use the repository's pin mechanism,
record where the source lives, and prove that future agents can update and
verify it without guessing.

Pressure scenario: the agent copies files from another repo, adds a submodule or
subtree without a manifest, pins only package versions, or leaves no update and
check path, so the source becomes unowned drift.

## Trigger

Use this skill when the user asks to:

- pin, vendor, mirror, subtree, submodule, or otherwise bring an external repo
  source into the current repo;
- record an upstream repository as a durable local reference;
- design or audit the manifest, locator, update command, and verify command for
  a pinned repo source;
- migrate an ad hoc copied source tree into a reviewable repo pin.

Do not use this skill when:

- the task is specifically to set up Effect harness runtime; use
  `setup-effect-area`;
- the request only pins npm, pnpm, Docker, or tool versions without a repo
  source surface;
- the request uses "pin" for UI items, notes, threads, tasks, or other local
  workflow state;
- the user wants to read or compare an external repo without bringing it into
  the current repo.

## Soft Boundary

Primitive audit: `pin` is `stateful`, `activation: narrow`, and
`duration: task`. It may write a pinned source tree, manifest, lock file,
documentation route, update script, verifier hook, or package metadata. It
stops when the repo pin is materialized and verified, or when source ownership,
pin mechanism, or hard verifier is missing. Source classification and mechanism
choice are `soft`; git state checks, manifest checks, update scripts, CLIs,
tests, and package verification are primitive `constraint.hard` only when they
are machine-checkable.

Classify the pin before editing:

- `source-pin`: the current repo should store or reference an upstream repo.
- `mechanism-audit`: the source is already present but lacks provenance,
  update, or verify rules.
- `provider-setup`: a domain tool owns the setup mechanism; route to the
  provider skill or CLI instead of hand-writing the pin.
- `unknown-pin`: ask which repo is upstream, where it should live, and which
  mechanism should own updates.

## Hard Boundary

This section mixes model-applied boundaries with hard checks. Only items tied
to machine-checkable surfaces such as git commands, scripts, CLIs, schemas,
tests, or package validation are primitive `constraint.hard`; prose-only
boundaries remain strict `soft` constraints.

- Do not copy source without recording repository URL, pinned ref, local path,
  mechanism, update path, and verify path.
- Do not call a repo "pinned" if the pinned ref cannot be checked by git,
  manifest validation, or a project verifier.
- Do not invent a new pin script when the repo already has an owning CLI or
  verifier for that source surface.
- Do not change the upstream source ref in the same step as unrelated project
  work.
- Do not mutate dirty user work in the current repo or upstream checkout.
- Do not treat generated or mirrored copies as semantic authority when the
  upstream repo remains the source of truth.

## Workflow

1. Resolve the current repo, upstream repo URL/path, intended local path, and
   owning mechanism. Ask one focused question if any of these are missing.
2. Preflight the current repo and any local upstream checkout with:

   ```bash
   git -C "$REPO" status --short
   git -C "$REPO" rev-parse HEAD
   ```

3. Prefer an existing project CLI, script, manifest schema, or documented
   source-update command. If none exists, propose the smallest durable mechanism
   before writing source.
4. Record a pin contract that includes at least: upstream locator, pinned ref,
   local path, mechanism, update command, verify command, and ownership note.
5. Materialize only the source surface and directly required manifest or
   verifier files.
6. Run the owning hard checks: git ref checks, manifest validation, update
   dry-run or no-op check, project verifier, and `git diff --check` where
   applicable.
7. Report changed files, pinned ref, update command, verify command, and any
   missing hard mechanism that prevents a complete pin.

## Validation

Before treating output as valid `pin`, check:

- first user-facing line includes `🧭` inline;
- the upstream repo, pinned ref, local path, and owner are explicit;
- request was classified as `source-pin`, `mechanism-audit`, `provider-setup`,
  or `unknown-pin`;
- source authority and local projection are not confused;
- hard constraints are backed by git, script, CLI, schema, test, or package
  output;
- completion reports changed files, update path, verify path, and exact
  blockers.
