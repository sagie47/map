# Linear PR Traceability Workflow

This repository follows a simple Linear lifecycle policy so ticket state reflects actual code review progress.

## Required state flow

- `Todo` — issue is scoped, no active implementation work.
- `In Progress` — implementation has started locally or on a branch.
- `In Review` — a pull request exists and the Linear issue has a comment with the PR URL and branch name.
- `Done` — PR is merged and any required follow-up notes or deployment checks are recorded.

## PR traceability policy

When opening a PR for a Linear issue:

1. Create or switch to the issue branch.
2. Open the PR.
3. Confirm Symphony posts the PR auto-comment to the Linear issue.
4. If the auto-comment does not appear, add a manual Linear comment with:
   - PR URL
   - branch name
   - short status note (`opened`, `ready for review`, `merged`, etc.)
5. Move the issue to `In Review` only after the PR link is visible on the Linear issue.

## Manual fallback comment template

```md
PR: https://github.com/<org>/<repo>/pull/<number>
Branch: <branch-name>
Status: ready for review
```

## Done criteria

Before marking an issue `Done`, verify:

- the PR link comment exists on the Linear issue;
- the PR has merged or otherwise reached a terminal reviewed state; and
- any follow-up deployment or verification notes are captured in Linear if needed.

## Audit checklist for open PRs

Use this checklist whenever reviewing active work:

- [ ] every open PR has a matching Linear issue;
- [ ] every linked Linear issue includes a PR URL and branch comment;
- [ ] issues without a PR stay in `Todo` or `In Progress`, not `In Review`;
- [ ] issues only move to `Done` after merge/verification.
