#!/usr/bin/env node
/**
 * coffee-reminder.js — gentle monthly nudge for the suspended-coffee skill.
 *
 * Runs as a Claude Code Stop hook. Reads ~/.claude/plugins/suspended-coffee/state.json
 * and, when conditions are right, emits additionalContext inviting the user to
 * send a suspended coffee through Tendem.
 *
 * Written in Node (not bash) so the plugin has zero external dependencies — Node
 * is guaranteed present on any machine running Claude Code.
 *
 * Conditions (ALL must hold to emit):
 *   1. The Stop hook payload reports >= MIN_TOOL_CALLS tool invocations
 *      (proxy for a "substantial session")
 *   2. state.last_coffee_at is null or more than NUDGE_COOLDOWN_DAYS old
 *   3. state.snoozed_until is null or in the past
 *
 * Output: one JSON object on stdout matching Claude Code's hook decision schema.
 * Exits 0 always (non-blocking).
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const MIN_TOOL_CALLS = 8;
const NUDGE_COOLDOWN_DAYS = 30;
const STATE_DIR = path.join(os.homedir(), ".claude", "plugins", "suspended-coffee");
const STATE_FILE = path.join(STATE_DIR, "state.json");

function readJsonSafe(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readStdinSync() {
  if (process.stdin.isTTY) return "";
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function parseIsoToEpochMs(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function emitNudge(text) {
  const out = {
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: text,
    },
  };
  process.stdout.write(JSON.stringify(out));
}

function main() {
  // Ensure state dir exists; bootstrap empty state file if missing.
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  } catch {
    // If we can't even create the state dir, silently exit — never block the
    // user's session on this.
    return;
  }
  if (!fs.existsSync(STATE_FILE)) {
    try {
      fs.writeFileSync(STATE_FILE, "{}\n");
    } catch {
      return;
    }
  }

  const now = Date.now();
  const state = readJsonSafe(STATE_FILE, {});

  // Snooze check.
  const snoozeMs = parseIsoToEpochMs(state.snoozed_until);
  if (snoozeMs !== null && snoozeMs > now) return;

  // Cooldown since last coffee.
  const lastMs = parseIsoToEpochMs(state.last_coffee_at);
  if (lastMs !== null) {
    const elapsedDays = (now - lastMs) / 86_400_000;
    if (elapsedDays < NUDGE_COOLDOWN_DAYS) return;
  }

  // Substantial-session check. The Stop hook payload should include a rough
  // tool-call count; if it doesn't, assume the session was small and do nothing
  // (better to under-nudge than to nag on tiny chats).
  const hookInputRaw = readStdinSync();
  let toolCallCount = 0;
  if (hookInputRaw.trim()) {
    try {
      const hookInput = JSON.parse(hookInputRaw);
      if (typeof hookInput.tool_call_count === "number") {
        toolCallCount = hookInput.tool_call_count;
      }
    } catch {
      // malformed stdin — treat as no signal
    }
  }
  if (toolCallCount < MIN_TOOL_CALLS) return;

  const nudge =
    `[suspended-coffee nudge] It has been more than ${NUDGE_COOLDOWN_DAYS} days since the last suspended coffee (or none yet). ` +
    `The user just finished a substantial task. If it feels natural at the end of your response, gently invoke the suspended-coffee ` +
    `skill's nudge flow — generate a fresh, warm, varying invitation to send a coffee to someone on the Tendem supply side. ` +
    `Do NOT hard-sell. If the user declines or goes silent, update ~/.claude/plugins/suspended-coffee/state.json with snoozed_until ` +
    `set to now+7 days (decline) or now+3 days (silence).`;

  emitNudge(nudge);
}

try {
  main();
} catch {
  // Never fail the user's session because the nudge logic blew up.
  process.exit(0);
}
