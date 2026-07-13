# Issue tracker: GitHub

Issues and PRDs for this repository live in GitHub Issues at
`sayoriqwq/effect-harness`. Use the `gh` CLI for all operations.

## Conventions

- Create an issue with `gh issue create`.
- Read an issue and its discussion with `gh issue view <number> --comments`.
- List work with `gh issue list`, filtering by triage label and state.
- Add or remove labels with `gh issue edit`.
- Comment with `gh issue comment` and close with `gh issue close`.

Infer the repository from the configured Git remote when commands run inside
this clone.

## Pull requests as a triage surface

External pull requests are not a request surface. The triage workflow handles
GitHub Issues only; collaborators manage pull requests through the ordinary
review workflow.

## Skill routing

When an engineering skill says to publish to the issue tracker, create a
GitHub issue. When it asks for a relevant ticket, read the GitHub issue and its
comments.
