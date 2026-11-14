---
name: autogis-release
description: Push AutoGIS changes to the intended Git remote and deploy them to the configured server when the user requests a push or deployment.
---

# AutoGIS push and deployment

Use this skill for explicit requests to push AutoGIS changes, deploy them, or do both. Treat these as distinct actions: push updates a Git remote; deployment updates the running server. Do only the actions the user requested.

## Resolve the target before changing anything

1. Read the repository's current `README.md` deployment section and inspect `git status`, current branch, remotes, upstream, and ahead/behind state. The README currently documents server path `/opt/AutoGis1`, branch `main`, and host `31.57.158.55`; verify that the current checkout and user's request still agree before using them.
2. Never infer the push destination from a previous conversation. Use the remote/repository named in the current request. If it differs from `origin`, use the explicitly requested remote; do not silently change `origin` or push to multiple repositories.
3. Read the changed-file list and diff summary before staging. Preserve all unrelated and pre-existing work. Stage only files in the requested release scope. Do not use `git add -A` when the worktree contains unrelated changes.
4. Inspect staged changes for credentials, `.env` files, private keys, database dumps, or local artifacts. Never print secret contents. Do not commit `.env`; keep only safe placeholders in `.env.example`.
5. If the destination branch has diverged, the target repository/branch is unclear, or the worktree has unrelated changes that cannot be separated safely, stop before push and ask a focused question. Never force-push or rewrite shared history.

## Validate and push

- Run `git diff --check` and the relevant project checks before publishing. For this repository, use `npm run typecheck`, `npm run build`, and `cd backend && go build ./...` when their affected code is included. Run test suites only when requested or required by the change's own documented workflow.
- If the requested changes are not committed, make a focused commit containing only the authorized files, with a short descriptive message. Do not amend an existing commit unless the user explicitly asks.
- Fetch the intended remote and confirm the destination branch is the intended one. Push that branch normally; do not use `--force`, `--force-with-lease`, or push tags unless requested.
- Do not deploy if validation or push failed. Report the exact failing step and leave the user's changes intact.

## Deploy to the server

- Prefer direct SSH from the Mac using the user's existing SSH configuration or agent. Check SSH config/agent availability without displaying private-key contents. Do not guess key filenames, copy keys, or put secrets in command arguments or logs.
- If direct SSH is unavailable, do not claim deployment succeeded. Prepare exact commands for the user's server terminal only when useful, and report what blocked the direct deploy.
- On the server, verify the checkout path, branch, and worktree before updating it. Use fast-forward-only Git updates. Do not run `git reset --hard`, `docker compose down -v`, volume deletion, database clearing, or broad cleanup commands.
- Follow the repository README and Compose configuration. Runtime database migrations are enabled in the current Compose file; inspect schema changes before deploy. Stop and explain if a migration drops or rewrites user data. Preserve PostgreSQL and RustFS volumes.
- Build/recreate the application services needed by the change. Prefer `docker compose up -d --build backend frontend` for app-only changes; include other services only when the change requires them. Do not take down the entire stack for a routine release.
- Capture the deployed commit SHA before/after the update. Verify container health, `http://31.57.158.55/healthz`, and the site response. If a check fails, collect bounded service logs and report them with secrets removed. Do not improvise a destructive rollback; restore the previous revision only through a clear, reversible procedure.

## Finish with evidence

Report the exact Git remote/branch and commit pushed, the server revision deployed, which checks passed, and the observed health/site result. Distinguish clearly between a successful push and a successful deployment. Never say “deployed” based only on a completed SSH command or Docker build.
