/**
 * Session continuity across heartbeats.
 *
 * Both Claude Code and Codex can resume a prior session, which is what makes a
 * heartbeat feel like a shift rather than a fresh hire each time. The codec
 * exists so a session id that has gone stale is dropped cleanly instead of
 * being passed to a `--resume` that then fails the whole run.
 */

import type { AdapterSessionCodec } from "@paperclipai/adapter-utils";

function readSessionId(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  if (raw && typeof raw === "object") {
    const v = (raw as Record<string, unknown>).sessionId;
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

export const sessionCodec: AdapterSessionCodec = {
  // Tolerates the legacy bare-string form as well as the object form, so an
  // agent created before this adapter grew a codec still resumes.
  deserialize(raw) {
    const sessionId = readSessionId(raw);
    return sessionId ? { sessionId } : null;
  },
  serialize(params) {
    const sessionId = readSessionId(params);
    return sessionId ? { sessionId } : null;
  },
  getDisplayId(params) {
    return readSessionId(params);
  },
};
