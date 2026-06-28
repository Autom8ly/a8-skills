---
name: codex-opencode-usage
description: >
  Use this skill when Codex, Claude, or another CLI agent needs to delegate work to OpenCode,
  coordinate with an OpenCode session, use opencode-runner or the OpenCode HTTP API, avoid
  cross-agent workspace conflicts, recover from noisy runner streams, or review OpenCode output
  safely. Trigger it when the user mentions OpenCode, opencode-runner, OpenCode sessions, using
  OpenCode as a junior developer, multiple CLI agents, cross-agent handoff, session IDs, or
  direct OpenCode API usage.
---

# Codex + OpenCode Usage

Use this skill when a senior CLI agent coordinates implementation work with OpenCode as a junior
developer. The goal is to preserve context discipline, avoid workspace corruption, and keep a
reviewable audit trail.

## Core Rules

1. Work from a checkpoint.
   - Before delegating implementation, ensure the target repo has a clean local git checkpoint.
   - If the repo is not under git, initialize it and commit the current state before OpenCode writes.
   - Do not rely on memory or chat history as a rollback mechanism.

2. Enforce one writer per workspace.
   - One active OpenCode session per physical checkout.
   - If multiple agents must work concurrently, create separate git worktrees or containers.
   - Never let a session bound to one repo write into a sibling repo.

3. Keep prompts repo-scoped.
   - Name the exact workspace path.
   - Explicitly forbid reading or modifying unrelated repos.
   - Give OpenCode only the junior task context it needs, not all senior-side deliberation.
   - If there are frozen contracts or architecture decisions, say "STOP and report" on mismatch.

4. Treat OpenCode output as implementation, not acceptance.
   - Review changed files yourself.
   - Run the repo's verification commands yourself.
   - Commit only after senior review and green checks.

## Preferred Delegation Flow

1. Confirm current state:

```bash
git status --short
git log --oneline -3
```

2. Create a checkpoint:

```bash
git commit --allow-empty -m "Checkpoint before <task>"
```

If there are uncommitted intended changes, commit them normally first.

3. Verify the OpenCode session is bound to the correct workspace:

```bash
curl -s http://localhost:8999/session/<session_id>
```

Check the `directory` field before sending a prompt.

4. Send a scoped prompt through the session API:

```bash
curl -s -X POST \
  http://localhost:8999/session/<session_id>/prompt_async \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/opencode-prompt.json
```

Use a JSON file shaped like:

```json
{
  "parts": [
    {
      "type": "text",
      "text": "You are OpenCode... Work ONLY in /path/to/repo..."
    }
  ]
}
```

5. Monitor the workspace, not just the chat stream:

```bash
git status --short
git diff --stat
find . -maxdepth 4 -type f -mmin -5 | sort
```

6. Review and verify:

```bash
git diff
uv run ruff check .
uv run mypy src tests --ignore-missing-imports
uv run pytest -q
```

Use the repo's native commands when different.

7. Commit the accepted result:

```bash
git add <reviewed files>
git commit -m "<task summary>"
```

## opencode-runner Guidance

`opencode-runner` is useful for interactive streaming, permissions, and question gates:

```bash
cd /Users/markv/Code/opencode-runner
python3 runner.py <session_id> "Prompt here"
```

Use it when:

- the user wants to handle permissions in the web/TUI flow;
- you need live thought/tool streaming;
- the server and runner are known to be stable.

Prefer direct session API when:

- the runner stream is noisy;
- multiple OpenCode sessions are active;
- you only need to post a prompt and then inspect files.

Known runner hazard:

- Some runner implementations listen to the global event stream and may display events from other
  sessions unless they filter every event by `sessionID`.
- If the stream looks wrong, query the specific session:

```bash
curl -s http://localhost:8999/session/<session_id>/message
curl -s http://localhost:8999/session/<session_id>
```

## Abort And Recovery

Abort a mis-scoped or runaway session:

```bash
curl -s -X POST http://localhost:8999/session/<session_id>/abort
```

Then inspect:

```bash
git status --short
git diff --stat
git diff
```

If OpenCode wrote outside scope:

1. Stop the session.
2. Identify exactly what changed.
3. Revert only the wrong-scope edits, preserving unrelated user work.
4. Re-prompt with narrower context.

If the repo has a checkpoint and the entire run is invalid:

```bash
git diff > /tmp/bad-run.diff
git reset --hard <checkpoint>
```

Only use destructive reset when the user explicitly approves or the repo is known to contain only
the bad OpenCode run after the checkpoint.

## Prompt Template

Use this structure:

```text
You are OpenCode, junior implementation engineer for <project>.
Work ONLY in <absolute repo path>. Do NOT read, reference, or modify <forbidden paths>.

Context:
- Checkpoint commit exists: <hash>.
- Frozen contracts/requirements: <short list>.
- If you discover a mismatch, STOP and report; do not silently change the contract.

Tasks:
1. <specific task>
2. <specific task>
3. <specific task>

Verification:
- <lint command>
- <typecheck command>
- <test command>

Report:
- files changed
- behavior changed
- exact verification output
- known blockers
```

## Senior Review Checklist

Before accepting OpenCode's work:

- `git status --short` contains only expected files.
- No sibling repo paths were read or written.
- No generated secrets, data stores, caches, or local tool settings are staged.
- Tests cover the requested behavior, including negative/security cases.
- Docs match actual code behavior and command names.
- Verification commands were rerun by the senior agent.
- A new local commit captures the accepted state.

## Coordination Files

When using shared coordination files:

- Read the whole file before appending.
- Use the exact turn marker protocol in that file.
- Find the latest turn with a greppable marker, then increment.
- If two agents append the same turn number concurrently, append a new correction turn and make it the
  canonical marker. Do not rewrite prior turns.
- In the user-facing chat, summarize only the new turn and confirm it was appended.
