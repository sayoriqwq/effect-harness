# Trust root-scoped Harness observation

Prelude treats installed first-party Harness Modules as trusted planners and
allows each read-only observation to name a tagged Control Root, Integration
Workspace, or approved Package Root locator. Every path is normalized,
contained, and read without following symlinks; Package Root locators must
belong to the Integration's approved roots, while Target-owned feedback remains
observable but can never become an Output. We rejected a separate observation
allowlist because it would add a permission protocol without creating an OS
sandbox, while preventing the delivered Target Adaptation skill from examining
repository-specific configuration. Observed bytes are not automatically added
to the execution hash: only the declarations returned into the Plan are bound,
and Apply must replan so observations that change declarations make the prior
Plan stale.
