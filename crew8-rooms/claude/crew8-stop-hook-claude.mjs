#!/usr/bin/env node
/**
 * REFERENCE COPY — mirrored from <crew8-checkout>/integrations/hooks/crew8-stop-hook-claude.mjs
 * for discoverability. This file is NOT executed from here; point your Stop
 * hook `command` at the copy inside your actual crew8 checkout (see the
 * "Claude Code sessions" section of SKILL.md one level up). If crew8's hook
 * logic changes, re-sync this copy so the two don't drift.
 *
 * crew8 Stop hook for CLAUDE CODE.
 *
 * Pattern: Claude Code re-invokes the session when a background task exits,
 * so the long-poll watcher (`crew8 inbox-wait`) runs as a background task and
 * this hook is only the ENFORCER:
 *
 *   - watcher armed            -> silent (the watcher will wake the session)
 *   - watcher not armed        -> deliver anything pending now, and block the
 *                                 stop with an instruction to arm the watcher
 *   - no agent identity        -> no-op (rooms not enabled for this session)
 *
 * Install (.claude/settings.json):
 *   "hooks": { "Stop": [{ "hooks": [{ "type": "command",
 *     "command": "node /Users/markv/Code/crew8/integrations/hooks/crew8-stop-hook-claude.mjs" }] }] }
 *
 * Identity: CREW8_AGENT env var, or a `.crew8/agent` file in the project dir.
 * Watch window: CREW8_WAIT_TIMEOUT (seconds, default 240; use ~3000 on
 * subscription accounts where the prompt-cache TTL is 1 hour).
 */

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return {};
  }
}

function resolveAgent(projectDir) {
  if (process.env.CREW8_AGENT) return process.env.CREW8_AGENT.trim();
  for (const dir of [projectDir, process.cwd()].filter(Boolean)) {
    try {
      const v = fs.readFileSync(path.join(dir, ".crew8", "agent"), "utf-8").trim();
      if (v) return v;
    } catch {
      /* not configured here */
    }
  }
  return null;
}

function crew8Bin() {
  if (process.env.CREW8_HOME) return path.join(process.env.CREW8_HOME, "bin", "crew8.js");
  return path.join(__dirname, "..", "..", "bin", "crew8.js");
}

function watcherArmed(agent) {
  const safe = agent.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pidFile = path.join(os.homedir(), ".crew8", `inbox-wait-${safe}.pid`);
  try {
    const pid = Number(fs.readFileSync(pidFile, "utf-8").trim());
    if (!pid) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const input = readStdin();

// Never fight the harness: if this turn was already continued by a Stop hook,
// let it stop.
if (input.stop_hook_active) process.exit(0);

const agent = resolveAgent(input.cwd || process.env.CLAUDE_PROJECT_DIR);
if (!agent) process.exit(0);

if (watcherArmed(agent)) process.exit(0);

// Watcher is not armed: deliver anything already waiting, then make the model
// arm the watcher before it goes idle.
const bin = crew8Bin();
const check = spawnSync(process.execPath, [bin, "inbox-wait", "--agent", agent, "--timeout", "0"], {
  encoding: "utf-8",
  timeout: 30000,
});
const pending = (check.stdout || "").trim();

const timeoutSec = Number(process.env.CREW8_WAIT_TIMEOUT) > 0 ? Number(process.env.CREW8_WAIT_TIMEOUT) : 240;
const armCmd = `node ${bin} inbox-wait --agent ${agent} --timeout ${timeoutSec}`;
const armInstruction =
  `Your crew8 room watcher is not armed. Run this with the Bash tool using run_in_background: true (do NOT wait for it):\n\n` +
  `  ${armCmd}\n\n` +
  `When it completes in the background with messages, handle them (reply via crew8 post_message), then re-arm it the same way. ` +
  `If it completes with no output, just re-arm it. Then end your turn.`;

const reason = pending ? `${pending}\n\n---\n\n${armInstruction}` : armInstruction;

console.log(JSON.stringify({ decision: "block", reason }));
