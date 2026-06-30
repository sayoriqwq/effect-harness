# Prelude Provider Profile

This directory exposes the minimal provider profile consumed by Prelude.

Current authorities:

- `harness/provider/effect-harness.provider.json`
- `repos/effect.subtree.json`
- `repos/effect/LLMS.md`
- `harness/offcial-guide.md`

## Boundary

Partita owns generic source-entry pin semantics. effect-harness owns only the Effect source-entry
instance and Effect package baseline.

Prelude owns target lifecycle. effect-harness may verify a Prelude provider record, but it does not
project Codex runtime assets, feedback intake, target `AGENTS.md` blocks, or `.effect-harness.json`
state.

## Target Surfaces

The remaining provider target surfaces are structured pointers only:

- `package.json` dependencies and scripts
- `tsconfig.json` language-service plugin

Provider records retaining old `.codex` runtime files, effect-harness `AGENTS.md` managed blocks, or
`.effect-harness.json` state are legacy and should be regenerated from the new profile.

## Editor Policy

The profile records source-entry editor policy as data. Auto-import exclusion for `repos/**` is the
default hard boundary. Watch/search exclusion requires explicit editor configuration. File hiding is a
preference, not a default. VSCode and Zed shapes stay separate.
