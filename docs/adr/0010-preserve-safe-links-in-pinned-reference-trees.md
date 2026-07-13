# Preserve safe links in Pinned Reference Trees

Pinned Reference Trees preserve safe relative symbolic links from the official
Source Pin instead of dereferencing, dropping, or shortening them. The shared
tree digest records each link's path, mode, and exact POSIX target; Prelude
scans with no-follow operations, rejects absolute, platform-qualified,
backslash, NUL, and lexically escaping targets, and materializes the link only
when the platform can do so. Managed Trees remain symlink-forbidden. This keeps
the materializable surface of the selected repository layer identical to its
official Git tree entries and maintains one Source Pin truth. Internal gitlinks
remain opaque boundaries under ADR 0012 and therefore are not delivered tree
entries. Platforms that cannot create safe internal links fail explicitly.
