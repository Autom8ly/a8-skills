---
name: opencode-usage
description: >
  Best practices for delegating implementation work to OpenCode as a junior
  developer via the OpenCode HTTP server API, in an optional-architect / senior
  / junior model. Trigger keywords: OpenCode, opencode serve, OpenCode HTTP
  server API, opencode-runner, OpenCode sessions, session orchestration,
  directory scoping, watch URL, context isolation between repos, checkpoint
  and recovery, junior developer delegation, local/open-model inference,
  data-handling boundary, never send PII/PCI/secrets/credentials/production
  policies to OpenCode.
---

# OpenCode Usage — Canonical Skill

## CRITICAL — data boundary (what you may NEVER send to OpenCode)

OpenCode is a JUNIOR running on models that may be local OR routed to
third-party/remote providers. **Treat every prompt, file, snippet, path, and
error you send it as potentially leaving our trust boundary and being logged by
a model provider.** The senior is the DATA GATEKEEPER, not just the context
gatekeeper.

**OK to send:** our own source code, tests, docs, the structure/architecture of
our codebases, non-sensitive task instructions, and synthetic / anonymized
fixture data.

**NEVER send to OpenCode — no exceptions, regardless of which model is selected
(local included):**
- Customer or end-user data of any kind; **PII**; **PHI**; **PCI** / cardholder data.
- Secrets: **keys, API tokens, credentials, passwords, private keys, certs,
  `.env` contents, connection strings, session/grant tokens**.
- Production policies, security configurations, access-control rules, WAF/
  firewall configs.
- **Network topology/topography**, internal hostnames/IPs, infrastructure or
  deployment secrets.
- Controlled / classified material (e.g. CUI, ITAR/EAR, regulated datasets).
- Real production data or logs that may contain any of the above.

**If a task appears to REQUIRE any of the above, STOP.** Do not proceed.
Escalate to the senior/architect and redo it with redacted/synthetic data, or
do that part yourself outside OpenCode.

Practical controls (the senior owns these):
- Scrub context before delegating — never paste `.env`, secrets files, prod
  configs, real customer datasets, real credentials, or production policy docs
  into a prompt.
- Use synthetic fixtures / anonymized samples for tests and examples.
- Pin and verify the session's model + provider; a remote provider means data
  egress — assume it.
- Keep the junior's workspace free of real secrets (secrets must not live in a
  repo it can read, and must not be handed in via the prompt either).
- When in doubt, treat it as sensitive and do not send it.

This complements **Context discipline** below: the senior controls not just
WHICH repo the junior touches, but WHAT data crosses to it.

## Three roles

- **Architect (OPTIONAL)**: sets cross-product strategy, arbitrates
  structural/security decisions, owns frozen contracts and acceptance
  criteria, reviews. Not needed for every task.
- **Senior (orchestrator)**: a human or a senior CLI agent; owns ONE repo,
  translates goals into a single tightly-scoped junior task, manages
  context, checkpoints, hands the user the watch URL, reviews the junior's
  diff, runs verification, and commits.
- **Junior (OpenCode)**: executes ONE scoped implementation task inside ONE
  workspace; writes code/tests/docs; reports. Makes no architectural
  decisions. Absorbs the bulk of implementation tokens, enabling
  local/open-model inference while the senior keeps control.

## Mental model & mechanics (validated against opencode 1.17.9)

- Start server:
  ```
  opencode serve --port <port> --hostname 127.0.0.1
  ```
  Default port 4096. Optional HTTP basic auth via environment variable
  `OPENCODE_SERVER_PASSWORD` (default user `opencode`).

- Health check:
  ```
  GET /global/health
  ```
  Returns `{healthy, version}`.

- ONE server serves MANY workspaces. The HTTP API scopes to a workspace via
  the query parameter `?directory=<absolute_path>` on session calls.
  (Confirmed: `GET /session?directory=/path` returns only that directory's
  sessions.)

### ⚠️ Two DIFFERENT path encodings — do not mix them up

The workspace path is encoded **differently** depending on where it goes. Using
the raw path, or the wrong encoding, is the most common mistake:

1. **HTTP API query param** `?directory=<abs_path>` → **URL-encode** the value
   (percent-encoding). Use `curl -G --data-urlencode` so spaces/special chars in
   the path are handled. The raw path "usually works" but is not safe:
   ```bash
   curl -sG http://127.0.0.1:<port>/session \
     --data-urlencode directory=/Users/markv/Code/ciphergenii
   ```
2. **Browser / watch URL path segment** → **base64url** of the absolute path,
   **no `=` padding**. This is NOT URL-encoding and the raw path does NOT work
   here:
   ```
   http://127.0.0.1:<port>/<base64url(/Users/markv/Code/ciphergenii)>/session/<session_id>
   ```

Rule of thumb: query string ⇒ URL-encode; URL path segment ⇒ base64url.

### API endpoints

All session-scoped calls take `?directory=<absolute_path>`.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/session` | `{title?}` | `Session {id, directory, title, ...}` |
| GET | `/session` | — | List of sessions |
| GET | `/session/:id` | — | Single session |
| DELETE | `/session/:id` | — | — |
| POST | `/session/:id/abort` | — | — |
| POST | `/session/:id/prompt_async` | `{parts:[{type:"text","text":"..."}]}` | 204 |
| POST | `/session/:id/message` | `{parts:[{type:"text","text":"..."}]}` | `{info, parts}` |
| GET | `/session/:id/message` | — | Messages |
| POST | `/session/:id/permissions/:permissionID` | `{response, remember?}` | — |

**Permission reply — two valid endpoints** (verified against the server's
`/doc` OpenAPI spec):
- v1: `POST /session/:id/permissions/:permissionID`  body `{response}`
- v2: `POST /api/session/:id/permission/:requestID/reply`  body `{reply, message}`

Both work. (opencode-runner uses the v2 path — it is valid, not wrong. The
runner's real caveat is that it subscribes to the GLOBAL event stream and may
show other sessions' events unless filtered by `sessionID`.)

You can also set the permission policy when you CREATE the session — the
`POST /session` body accepts a `permission` object — so you don't always need
an `opencode.json` in the workspace.

## Model & agent selection (pin it deliberately)

A session created via the API inherits a DEFAULT model, which may not be the
one you want (e.g. it can pick a local model when you intended a big remote
one). The senior should pin the model explicitly:

- At session creation: `POST /session` body accepts `{model, agent, permission}`.
- Per prompt: `POST /session/:id/message` and `/prompt_async` accept `{model, agent}`.
- List available models: `GET /api/model`.

Route deliberately to control cost and speed: a cheap local/open model for
bulk/mechanical work, escalating to a larger remote model for hard tasks —
this is what lets the junior absorb tokens on local inference while the senior
keeps control. (Note: local model servers, e.g. Ollama, may need timeout/
config tuning to avoid request timeouts on long generations — handle that in
the model/provider config, separately from this skill.)

## Making a workspace appear in the GUI sidebar

The GUI sidebar lists RECENT PROJECTS. Verified behavior:

- There is NO dedicated "register folder" API endpoint. A directory becomes a
  sidebar project by being OPENED in the GUI — i.e. by navigating to its
  base64url route (the same watch URL below).
- The project entry is created lazily server-side the first time you operate
  in a directory (`POST /session?directory=...`, or `GET /project/current?directory=...`
  which returns the project with a hash `id`). `GET /project` lists known projects.
- The GUI "+ / Open project" dialog simply browses the filesystem via
  `GET /find/file?directory=<path>&type=directory&limit=50` and then navigates
  to the chosen folder's route.

Practical rule: to get a workspace into the user's sidebar, **create the
session via the API and hand the user the watch URL (below) — opening it
registers the project and it appears in the sidebar.** A freshly created or
ephemeral directory will not appear until it is opened this way.

## The watch URL (must-do)

After creating a session the senior MUST generate and hand the user a
deep-link URL so they can watch and approve in the browser. A freshly
API-created or ephemeral directory may NOT appear in the UI sidebar, so
the direct URL is required.

Formula (the path segment is **base64url** of the absolute path — NOT the raw
path, NOT URL-encoding; strip `=` padding):

```
url = "http://<host>:<port>/" + base64url(absolute_workspace_path, no `=` padding) + "/session/" + session_id
```

Python snippet for encoding:

```python
import base64
path = "/absolute/path/to/workspace"
encoded = base64.urlsafe_b64encode(path.encode()).decode().rstrip("=")
watch_url = f"http://127.0.0.1:4096/{encoded}/session/{session_id}"
```

## Permissions (the "secret sauce")

Two ways to handle permission gates (`edit` / `bash` / `webfetch`):

1. **PREFERRED for supervised work**: the human keeps the opencode server
   URL open in a browser and approves gates live in the UI. This avoids
   interactive-approval deadlocks when an agent drives the session
   headlessly.

2. **For autonomous runs inside an ISOLATED, CHECKPOINTED workspace**: add
   an `opencode.json` with:
   ```json
   {"permission": {"edit": "allow", "bash": "deny", "webfetch": "deny"}}
   ```
   Allow only what is needed. **Never auto-allow `bash` in a non-isolated
   repo.**

## Senior workflow

1. **Checkpoint**: ensure the repo is under git and commit current state
   (`"checkpoint before opencode <task>"`). Never rely on chat history for
   rollback.
2. **Scope** to ONE repo; write a single focused instruction.
3. **Create a session** scoped with `?directory=<repo>`.
4. **Generate and give the user the watch URL**.
5. **Send the prompt** (`prompt_async`).
6. **User watches/approves gates** in the UI (or autonomous via
   `opencode.json`).
7. **Senior reviews the diff**, runs the repo's verification
   (lint/type/test), commits only after green review.

## Context discipline (most important rule)

NEVER feed raw multi-party coordination logs (e.g., a cross-team chat log)
to the junior — it will confuse the junior about which repo/task it owns
and may edit the wrong codebase. The senior ACTS AS TRANSLATOR: parse the
goals and hand the junior only the minimal single-repo task context. Name
the exact workspace path and explicitly forbid touching other repos. If
there are frozen contracts, instruct: "STOP and report on mismatch; do not
silently change the contract."

## Isolation & recovery

- One active session per physical workspace at a time (a busy session
  rejects concurrent prompts).
- For concurrent work on one repo, use separate git worktrees.
- Abort a runaway: `POST /session/:id/abort?directory=<...>`
- If the junior wrote outside scope: stop, inspect `git status` in the
  affected repo, restore only the wrong-scope edits
  (`git restore <files>`; `rm` untracked), re-prompt narrower. If the
  whole run is bad and the repo contains only that run since the
  checkpoint: `git reset --hard <checkpoint>` (only with explicit
  approval).

## Prompt template

```
You are OpenCode, junior implementation engineer for <project>.
Work ONLY in <absolute repo path>. Do NOT read, reference, or modify
<forbidden paths>. Do NOT run shell commands unless asked.
Context: checkpoint commit <hash>; frozen contracts/requirements:
<short list>; STOP and report on mismatch.
Tasks:
1) ...
2) ...
3) ...
Verification: <lint> / <typecheck> / <test>
Report: files changed, behavior changed, verification output, blockers.
```

## Senior review checklist

- `git status` shows only expected files
- No sibling-repo paths touched
- No secrets / caches / data stores staged
- Tests cover requested behavior including negative and security cases
- Docs match code
- Verification rerun by the senior
- A commit captures the accepted state

## Mentorship & continuous improvement

The senior is a **MENTOR**, not only a reviewer — coach the junior so it gets
better over time, and capture what is learned so future sessions start smarter.

- **Have the junior record learnings.** Remind it to write reusable notes into
  its own markdown / skill / `AGENTS.md` files in the workspace: project
  conventions, commands that worked, gotchas, and patterns. A junior that
  maintains good notes compounds its performance across sessions.
- **Turn repeated tasks into local skills.** Encourage the junior to create a
  local skill for any recurring multi-step workflow — **regression suites**,
  build/verify, release checklists, common refactors — so the task runs
  consistently instead of being re-derived each time.
- **LLM-flow regression: the SR is the DECIDER.** When the task is testing an
  LLM / agent flow, a green unit assertion is NOT sufficient — outputs are
  non-deterministic and judgment-laden. The junior runs the flow and reports the
  evidence (inputs, outputs, traces); **the senior decides whether it worked "as
  expected" in the context of the problem being solved.** Never let the junior
  self-certify subjective LLM-flow correctness. Write down the acceptance
  criteria ("what 'as expected' means for this problem") so the judgment is
  reusable and the junior can pre-screen against it next time.
- **Notes obey the data boundary.** Anything written into notes/skill files
  lives in the workspace the junior reads — keep it free of secrets / PII /
  customer data (see **CRITICAL — data boundary** above).

## Coordination files (if used)

Read the whole file before appending. Use the file's turn-marker protocol.
Find the latest marker and increment. On concurrent same-number collisions
append a correction turn (do not rewrite prior turns). Summarize only the
new turn to the user.

## Note on opencode-runner

The `opencode-runner` tool can stream thoughts/tools and broker
permissions over stdin, but:
- (a) it may subscribe to the GLOBAL event stream and show other sessions'
  events unless filtered by `sessionID`.
- (b) it uses the v2 permission reply endpoint
  (`POST /api/session/:id/permission/:requestID/reply`) — valid, but confirm
  the body shape (`{reply, message}`) matches your server version.

**Prefer** the directory-scoped API plus the browser UI for approvals.
