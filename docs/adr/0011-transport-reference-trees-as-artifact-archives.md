# Transport reference trees as Artifact archives

Pinned Reference Trees are transported inside the npm Artifact as deterministic
canonical tree archives rather than read from installed Artifact directories.
The [Prelude Contract package](https://github.com/yume-infra/prelude/blob/main/packages/harness-contract/README.md#canonical-tree-archive-protocol)
is normative for this wire format and digest; Partita produces verified
publications, while Effect Harness only composes selected publication files and
Target policy.
npm and pnpm can drop symbolic links, empty directories, and mode information
even when an input tarball contains them, so an installed directory cannot prove
the selected repository layer's materializable reference surface. Prelude
securely parses the ordinary archive file offline, rejects unsafe or ambiguous
entries, recomputes the logical tree digest, stages exact files, directories,
modes, and Safe Reference Links, and re-scans before replacement. Upstream
gitlinks remain opaque boundaries and are not represented as archive entries.
This adds Partita-side publication and Prelude-side parsing, but prevents the
package manager from silently changing the evidence Harness actually promises
to deliver.
