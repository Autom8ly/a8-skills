---
name: opencode-guidance
description: >
  Field lessons on getting the best results from OpenCode as a junior coder:
  how to prompt it, manage it, mentor it, and review its output. Complements
  opencode-usage (which covers the server API mechanics and data boundary);
  this skill is the growing playbook of what actually works. Trigger keywords:
  opencode prompting, opencode lessons, junior prompt shape, opencode review,
  opencode parallel sessions, mentoring opencode.
---

# OpenCode Guidance — Lessons Playbook

Companion to `opencode-usage` (mechanics + data boundary — read that first).
This file collects **empirical lessons** from real senior/junior runs. Append a
dated entry after each significant round; promote recurring lessons into the
numbered sections.

## Prompt shape that works

1. **Open with identity + hard scope.** "You are OpenCode, junior implementation
   engineer for <project>. Work ONLY in <abs path>" — then, when running
   parallel sessions, an explicit FILE allowlist ("ONLY these three files")
   plus a *why* ("another engineer is working on those right now"). Juniors
   respect scope better when the reason is stated.
2. **Name the checkpoint commit** in the prompt so the junior can diff against
   it and the senior can revert precisely.
3. **Frozen contracts with STOP semantics.** List the interfaces the junior
   must not change ("transition() returns None on invalid pairs"; "chat_json's
   _usage shape") and instruct: "STOP and report on mismatch, do not silently
   change." This converts silent API drift into a reported blocker.
4. **Number the tasks, and put file/function anchors in each.** "In
   `_phase_emit_tool_result` add a branch for tool name X" beats "wire the tool
   into the FSM." Include log-line text or comments as search anchors when line
   numbers may drift.
5. **Pre-answer the design questions.** Where the junior would face a choice
   (sync listener vs async write; where to put a testable seam), decide it in
   the prompt ("use asyncio.create_task like the existing listener does";
   "structure the fallback as a module-level _call_openrouter coroutine you can
   monkeypatch"). Every decision left open is a coin-flip you'll re-review.
6. **Constrain verification.** Tell the junior exactly which checks it may run
   (e.g. only `python3 -c "import ast; ast.parse(...)"`) and state that the
   senior runs the real suite. Prevents both permission-gate deadlocks and
   false confidence from partial test runs.
7. **Demand a structured report**: files changed, behavior changed per task
   number, verification output, blockers. And "Do not commit" — commits are the
   senior's.

## Managing parallel work

- **Parallel sessions in ONE workspace are fine iff file sets are disjoint**
  and each prompt carries an explicit file allowlist naming the other's turf as
  forbidden. Verify disjointness BEFORE dispatch (grep the task surfaces).
  For overlapping work use git worktrees per `opencode-usage`.
- **Dispatch order:** send the big multi-file task first, then carve small
  independent tasks (new modules, isolated utils) into parallel sessions.
- **Completion polling:** `GET /session/:id/message` — the run is done when the
  last message has `info.role == "assistant"` and `info.time.completed` set.
  Poll that; don't scrape the UI.
- **Poll for WORK, not just completion.** `completed=True` also fires on
  silent stalls (reasoning-only turns with zero edits/text). Harden the poll:
  require the last assistant message to contain a `text` part or an
  edit/write `tool` part before treating the run as done — otherwise you wait
  on a stall and only discover it at review time. Long-context sessions stall
  more often; consider a fresh session once one has stalled twice.

## Reviewing (senior checklist deltas)

- Diff against the checkpoint commit, not just `git status` — juniors sometimes
  edit more than they report.
- Re-run the FULL test suite yourself in the real runtime (our case: inside the
  docker container), never trust the junior's syntax-check as verification.
- For LLM-flow work the senior is the DECIDER (see opencode-usage) — junior
  evidence, senior judgment.

## Lessons log

### 2026-07-06 — API schema drift before junior dispatch
- **Verify the live OpenCode schema when setup calls fail.** The usage skill
  documented the older permission map shape, but opencode 1.17.13 expects a
  `permission` array of `{permission, pattern, action}` rules on
  `POST /session`. A bare `{"_tag":"BadRequest"}` from session creation is
  a senior orchestration problem, not a junior implementation blocker: inspect
  `GET /doc`, update `opencode-usage`, then retry with the verified request
  shape.

### 2026-07-02 — green-board campaign (senior-led, no juniors: debugging round)
- **Diagnosis-first paid off:** two parallel read-only Explore agents produced
  file:line root-cause tables for 14 failing scenarios in ~3 min; every fix
  round after that was targeted. For DEBUGGING (vs building), senior-led with
  read-only diagnostic agents beat delegating to a junior — the loop is
  hypothesis→log→fix→re-run, which needs the runtime access juniors lack.
- **Time-dependent tests are a flake factory:** scenarios asserting a
  "transfer to live agent" line can never pass outside business hours when
  the agent correctly says "call back during business hours". Milestones must
  accept every CORRECT behavior for the run's context, not one golden path.
- **When your new safety gate ships, watch it for self-inflicted wounds:** a
  completeness gate checking `status == 'collected'` suppressed 11 legitimate
  detections because the field lifecycle ends at `'confirmed'`. Verify gates
  against the REAL state lifecycle, not the first status name you saw.
- **Role-gating context facts is wrong:** sidecar facts describe the last N
  turns, not the triggering turn — gating "agent asked X" handling on
  role=='agent' dropped 4/4 legitimate detections that arrived on user-turn
  inferences.

### 2026-07-01 — Phase B (schema v3) round: frozen-contract parallelism
- **Freeze the interface, parallelize the sides.** Two juniors worked producer
  (controller writes `session_data['sidecar_facts']`) and consumer (tool
  guards read it) simultaneously with zero integration bugs, because the
  prompt to BOTH stated the contract verbatim: exact key name, exact
  timestamp key, exact freshness rule ("fresh iff time.time() - _ts <= 10.0"),
  and "may be absent entirely — every consumer MUST fall back." Interface
  first, then fan out.
- **Split senior/junior by judgment density, not size.** The senior kept the
  LLM prompt engineering + golden cases + accuracy gate (judgment-laden,
  eval-gated); juniors got the wiring (mechanical once the schema froze).
  Both junior rounds landed clean on first review — a well-frozen upstream
  artifact makes junior work first-pass reviewable.
- **"Extract the battle-tested branch into a helper and call it from both
  paths"** is the safe way to let a junior add a second trigger for an
  existing critical action (forced redirects here): no behavior fork, one
  action body, diff shows pure extraction.

### 2026-07-01 — Phase A review findings (same project, round 2)
- **Review lesson — projection timing:** when a junior replaces N direct
  writers of a flag with a single projection, review the TIMING of each
  original writer, not just the final value. Junior latched
  `greeting_confirmed` from `identity_confirmed`, which flips later (at
  address confirm) than the original writer (at name confirm) — same eventual
  value, different intermediate reads → a tool consulting the flag mid-window
  regresses. "Same flag eventually True" is NOT equivalence when intermediate
  reads exist.
- **Silent-stall failure mode:** a junior can complete a turn having only READ
  files — `completed=True`, reasoning part present, zero edits, zero text
  report. Detect it (last assistant message has no tool-edit parts and no text)
  and re-prompt: "Continue now: implement tasks N–M… If something blocked you,
  say exactly what it was instead of stopping silently." Don't assume
  completed == worked.
- **Mentoring works over the API:** review corrections sent as a follow-up
  prompt to the SAME session (with a MENTORING NOTE asking the junior to
  record the lesson in its notes) preserve full task context — much cheaper
  than re-briefing a fresh session.
- **Junior's syntax check ≠ working tests.** Junior reported "syntax OK" on 4
  new tests that all failed at runtime (`aiohttp.ClientSession.post` mocked
  with a coroutine instead of an async context manager — the most common
  aiohttp-mock bug). The senior running the suite in the real runtime caught
  it immediately. When sending the fix back, include the EXACT error text,
  the root cause, and paste the correct pattern (a `__aenter__`/`__aexit__`
  fake) — pasting the pattern beats describing it.
- **Constrain the fix surface on re-prompts:** "Fix in <test file> ONLY — do
  not touch <production file>, the production code is fine." Prevents the
  junior from 'fixing' passing production code to satisfy broken tests.
- **Know when to stop round-tripping.** Junior's round-2 fix dropped an
  `import aiohttp` line (NameError). A third junior round costs minutes; a
  one-line import is seconds for the senior. Rule of thumb: mentor on
  CONCEPTUAL mistakes (timing semantics, mock protocols); just fix
  MECHANICAL slips (missing import, typo) yourself and move on. Outcome of
  the full round: 2 junior sessions in parallel, 2 review rounds each,
  final result 45/45 + 11/11 tests green, golden eval 44/44 — the
  senior/junior split held, with the senior catching 1 semantic regression
  and 1 broken-test batch that the junior's own checks missed.

### 2026-07-01 — voice-agent-v3 state-consolidation round
- Two parallel sessions in the same workspace (controller/FSM refactor +
  groq_client OpenRouter fallback) dispatched with disjoint file allowlists.
  Prompts included: checkpoint hash, frozen contracts w/ STOP, numbered tasks
  with function-name anchors, pre-made design decisions, ast-parse-only
  verification, no-commit rule. (Outcomes to be appended after review.)
- `prompt_async` returns 204 immediately; completion detected via message-list
  polling (`info.time.completed` on the last assistant message).
- Sensitive-repo note: `.env`, `vertex-sa-key.json`, and `client/logs/*` (PII)
  named as forbidden in every prompt — the repo mounts real keys, so the data
  boundary must be re-stated per prompt, not assumed.
