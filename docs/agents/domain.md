# Domain docs

This repository uses a single-context domain documentation layout.

## Consumer rules

Before exploring a domain change, engineering skills should read:

- `CONTEXT.md` at the repository root, when present;
- relevant decisions under `docs/adr/`, when present.

Missing domain files are not an error. Continue silently and let the domain
modeling workflows create them lazily when terminology or decisions need a
durable home.

Use glossary terms exactly when a `CONTEXT.md` defines them. If proposed work
contradicts an ADR, surface the conflict explicitly instead of silently
overriding the decision.
