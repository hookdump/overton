/**
 * Reading a Claude account's OAuth access token.
 *
 * The token lives wherever that profile's Claude Code put it, and Claude Code
 * refreshes it in place roughly hourly. So this module is deliberately a
 * *function*, never a cache: a token memoised at daemon start is a 401 an hour
 * later, and the failure looks like an auth misconfiguration rather than a
 * stale read.
 *
 * The token never leaves this module except as a return value. It is not
 * logged, not embedded in error messages, and not attached to events.
 */

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { claudeCredentialsFile, expandHome, type AccountConfig } from "@overton/core";
import { ProviderError } from "./types.ts";

const execFileAsync = promisify(execFile);

export interface ClaudeToken {
  token: string;
  /** Epoch SECONDS. The keychain stores milliseconds; normalised here. */
  expiresAt?: number;
  /** `pro` | `max` | `team` — the plan label the UI shows. */
  subscriptionType?: string;
}

/** Injected so tests never touch the keychain, the filesystem or the real env. */
export interface CredentialDeps {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  /** Raw keychain payload, or null when the item does not exist. */
  keychain(service: string): Promise<string | null>;
  readFile(path: string): Promise<string | null>;
}

/**
 * Claude Code namespaces each profile's keychain item by a digest of its config
 * dir, so several profiles coexist on one login keychain.
 */
export function keychainService(configDir: string): string {
  const digest = createHash("sha256").update(expandHome(configDir)).digest("hex").slice(0, 8);
  return `Claude Code-credentials-${digest}`;
}

/**
 * `-w` prints the password on stdout and does not prompt for an already-unlocked
 * login keychain. `-g` would put it on *stderr*, which is the usual reason a
 * "working" keychain read returns an empty string.
 */
async function securityFindPassword(service: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("security", ["find-generic-password", "-s", service, "-w"], {
      timeout: 5000,
      maxBuffer: 1 << 20,
    });
    const out = stdout.trim();
    return out === "" ? null : out;
  } catch {
    // Exit 44 is "item not found"; a locked keychain or a missing `security`
    // binary is equally "no token here" as far as the precedence chain goes.
    return null;
  }
}

export const defaultCredentialDeps: CredentialDeps = {
  env: process.env,
  platform: process.platform,
  keychain: securityFindPassword,
  async readFile(path) {
    try {
      return await readFile(path, "utf8");
    } catch {
      return null;
    }
  },
};

/** Parses the credential JSON shared by the keychain item and the file. */
export function parseCredentialBlob(raw: string): ClaudeToken | null {
  let parsed: {
    claudeAiOauth?: { accessToken?: unknown; expiresAt?: unknown; subscriptionType?: unknown };
    subscriptionType?: unknown;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const oauth = parsed?.claudeAiOauth;
  const token = oauth?.accessToken;
  if (typeof token !== "string" || token === "") return null;

  const out: ClaudeToken = { token };
  if (typeof oauth?.expiresAt === "number" && Number.isFinite(oauth.expiresAt)) {
    // Milliseconds on disk, seconds everywhere in Overton.
    out.expiresAt = oauth.expiresAt > 1e11 ? Math.floor(oauth.expiresAt / 1000) : Math.floor(oauth.expiresAt);
  }
  const sub = oauth?.subscriptionType ?? parsed?.subscriptionType;
  if (typeof sub === "string" && sub !== "") out.subscriptionType = sub;
  return out;
}

/**
 * Resolve an account's access token, in precedence order:
 *
 *   1. `oauth_token_env` — a long-lived `claude setup-token` value, the only
 *      path that works on a headless host with no keychain.
 *   2. the macOS keychain item for that profile's config dir.
 *   3. `<config_dir>/.credentials.json` — Linux, and macOS with the keychain
 *      integration disabled.
 *
 * Call it on every poll. Never store the result.
 */
export async function readClaudeToken(
  account: AccountConfig,
  deps: Partial<CredentialDeps> = {},
): Promise<ClaudeToken> {
  const d: CredentialDeps = { ...defaultCredentialDeps, ...deps };
  const tried: string[] = [];

  if (account.oauth_token_env) {
    const raw = d.env[account.oauth_token_env];
    if (typeof raw === "string" && raw.trim() !== "") return { token: raw.trim() };
    tried.push(`$${account.oauth_token_env} (unset or empty)`);
  }

  if (account.config_dir) {
    if (d.platform === "darwin") {
      const service = keychainService(account.config_dir);
      const raw = await d.keychain(service);
      const parsed = raw ? parseCredentialBlob(raw) : null;
      if (parsed) return parsed;
      tried.push(`keychain item \`${service}\``);
    }
    const file = claudeCredentialsFile(account.config_dir);
    const raw = await d.readFile(file);
    const parsed = raw ? parseCredentialBlob(raw) : null;
    if (parsed) return parsed;
    tried.push(file);
  }

  // Non-retryable: retrying a missing credential just burns polls.
  throw new ProviderError(
    `no Claude OAuth token for this account — looked in: ${tried.join(", ") || "(nothing configured)"}\n` +
      `  fix: run \`claude\` once in that profile to sign in ` +
      `(CLAUDE_CONFIG_DIR=${account.config_dir ?? "<config_dir>"}), or set \`oauth_token_env\` ` +
      `to an env var holding a \`claude setup-token\` value`,
    "auth",
    false,
  );
}

/** True when the token is past, or within `skewSec` of, its expiry. */
export function isExpiring(token: ClaudeToken, now: number, skewSec = 60): boolean {
  return token.expiresAt != null && token.expiresAt - skewSec <= now;
}
