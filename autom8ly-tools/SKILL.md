---
name: autom8ly-tools
description: >
  How to correctly use the ClickUp MCP and AgentGenii MCP for Autom8ly work —
  fetching transcripts and docs from ClickUp, sending and searching email via
  AgentGenii, accessing calendar and tasks, and avoiding the common mistakes
  that trip up new sessions (wrong MCP, local gws CLI, bash vs Read tool for
  large responses). Use this skill any time you are about to touch ClickUp,
  email, calendar, Google Drive, or Google Tasks on behalf of Autom8ly. Also
  consult it whenever you are unsure which MCP to reach for, or when a tool
  call returns nothing and you suspect you may have used the wrong path.
---

# Autom8ly Tools Guide

Reference for AI sessions working inside the Autom8ly workspace. The two
systems covered here — ClickUp and AgentGenii — are the backbone of how
transcripts, email, calendar, and tasks are managed. Getting the routing wrong
wastes tokens and produces silent failures, so read this before making calls.

---

## 1. AgentGenii MCP — Autom8ly Google Workspace

**MCP server ID:** `mcp__42393541-c09f-49fc-9ae2-5b7382dc0289`

This is the **only** way to reach Autom8ly's Google Workspace. It proxies Gmail,
Calendar, and Google Tasks for the `mark@autom8ly.com` account through the
AgentGenii gateway.

### Available tools

| Tool | Purpose |
|------|---------|
| `search_gmail_messages` | Search inbox by query string (sender, subject, date, etc.) |
| `get_gmail_thread_content` | Fetch full thread by thread ID |
| `list_gmail_labels` | List all Gmail labels |
| `list_calendar_events` | List upcoming calendar events |
| `list_task_lists` | List Google Task lists |
| `cli_exec` | Run a `gws` CLI command directly (use sparingly; prefer the typed tools) |
| `mcp_exec` | Run a raw MCP command through the gateway |
| `draft_recap_email` / `send_recap_email` | Structured recap email helpers |

### Critical rules

**Never run `gws` locally.** The `gws` CLI is available on the host machine but
must NOT be called via bash. Always route through AgentGenii. Local calls bypass
auth and will fail or produce wrong results.

**The Drive MCP is personal Gmail only.** `mcp__7d713b0a-...` connects to
Mark's personal Gmail/Drive — not Autom8ly. Do not use it for business docs,
email, or calendar. If you need to deliver a file to Autom8ly Drive, save it
locally and instruct Mark to upload manually (the AgentGenii connector has no
Drive write tool yet).

### Email safety rules

- **Never auto-send email to external addresses** (non-`@autom8ly.com`) without
  explicit instruction in the current message.
- Call recaps go to internal participants only unless Mark explicitly says
  otherwise.
- GChat messages may only be sent to `@autom8ly.com` addresses.
- PandaDoc document sends: only action if instructed by `mark@autom8ly.com`
  or `jkaiser@autom8ly.com`.

### Common patterns

**Search email:**
```
search_gmail_messages(query="from:kathryn@jongordon.com", max_results=10)
```

**Get a thread:**
```
get_gmail_thread_content(thread_id="<id from search result>")
```

**List today's calendar:**
```
list_calendar_events(time_min="2026-06-30T00:00:00Z", time_max="2026-06-30T23:59:59Z")
```

---

## 2. ClickUp MCP — Transcripts, Tasks, Docs

**MCP server ID:** `mcp__dee6363c-0b18-4597-b719-3be68bcbeca0`

⚠️ **ClickUp is being retired.** Transcripts are migrating to Google Drive
(via Recall AI) and recordings to GCP Cloud Storage. Use local copies when
available; only fall back to ClickUp if a local file doesn't exist yet.

### Fetching transcripts / docs

Use `clickup_get_document_pages` — not `clickup_get_task` — for call
transcripts stored as ClickUp Docs. Always request markdown:

```
clickup_get_document_pages(
  workspaceId="<workspace_id>",
  docId="<doc_id>",
  content_format="text/md"
)
```

**Read local files first.** Transcripts already saved to
`/Users/markv/Code/agentgenii/docs/transcripts/` should be read with the
`Read` tool, not re-fetched from ClickUp. Check that directory before making
any ClickUp API call.

### Large response handling — critical

ClickUp API responses that exceed the context window are **auto-persisted to
tool-result files** at paths like:
```
/var/folders/g4/.../tool-results/toolu_<hash>.txt
```

These files live on the Mac host filesystem. They are:
- ✅ Readable via the `Read` tool (runs on the Mac host)
- ❌ NOT accessible via `bash` (which runs in an isolated Linux sandbox)

If a ClickUp call returns a large blob and the content seems truncated, look
for a file path in the tool result and use `Read` to retrieve it.

### Navigation

```
clickup_get_workspace_hierarchy()   # start here to orient yourself
clickup_search(query="<keyword>")   # find docs or tasks by text
clickup_list_document_pages(workspaceId, docId)  # list pages before fetching
```

### Space / list creation

Daniel Cogan creates new client spaces — the ClickUp MCP cannot create spaces.
Once a space exists, you can populate it with standard lists via
`clickup_create_list`.

### Saving transcripts locally

Convention: `YYYY-MM-DD-descriptive-slug.md` under
`/Users/markv/Code/agentgenii/docs/transcripts/`.

Write with the `Write` tool. If the file already exists, read it first (the
Write tool requires a prior Read on existing files).

---

## 3. Quick decision guide

| You want to… | Use |
|---|---|
| Search Autom8ly email | AgentGenii `search_gmail_messages` |
| Read a full email thread | AgentGenii `get_gmail_thread_content` |
| Check Mark's calendar | AgentGenii `list_calendar_events` |
| Fetch a ClickUp transcript | `clickup_get_document_pages` (or read local file) |
| Find a ClickUp task | `clickup_search` or `clickup_filter_tasks` |
| Access Autom8ly Google Drive | ⚠️ Not supported — save locally, Mark uploads manually |
| Access personal Gmail/Drive | Drive MCP `mcp__7d713b0a-...` |
| Run a gws CLI command | AgentGenii `cli_exec` — NEVER run gws in bash |

---

## 4. Identities

| Person | Autom8ly email | Role |
|--------|---------------|------|
| Mark Vange | mark@autom8ly.com | Managing Member / CTO |
| Jim Kaiser | jkaiser@autom8ly.com | Partner |
| Autumn (AI) | autumn@autom8ly.com | Internal AI — PandaDoc sender identity |
