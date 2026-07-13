# Keep Source Pins one layer deep

A Source Pin exists to give agents a stable API, guide, and implementation
reference for the selected upstream repository. It is not recursive vendoring.
When that repository contains a gitlink, Harness treats the gitlink as an
Opaque Gitlink: the outer repository remains pinned and its `.gitmodules` file
remains visible, but the referenced repository is not separately pinned,
fetched, archived, or materialized in the Target.

The canonical archive therefore omits gitlink entries while preserving every
materializable file, directory, mode, and Safe Reference Link in the selected
repository layer. We rejected composed nested Source Pins because they add
maintenance lifecycles, provenance structure, package weight, and recursion
questions without improving the API-and-guide reference goal.
