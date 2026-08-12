/**
 * Credentials: reading a token without ever storing one.
 *
 * These are the functions that decide whether Overton thinks an account can
 * still be polled. Getting `parseCredentialBlob` wrong reads as "account not
 * signed in" and quietly drops a seat out of arbitration; getting `isExpiring`
 * wrong either hammers a refresh or uses a dead token.
 */

import { describe, expect, test } from "bun:test";
import {
  isExpiring, keychainService, parseCredentialBlob, type ClaudeToken,
} from "@overton/providers";

const blob = (oauth: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ claudeAiOauth: oauth, ...extra });

describe("parsing a credential blob", () => {
  test("pulls the token, expiry and plan", () => {
    const t = parseCredentialBlob(blob({
      accessToken: "sk-abc", expiresAt: 1_800_000_000_000, subscriptionType: "max",
    }));
    expect(t).toEqual({ token: "sk-abc", expiresAt: 1_800_000_000, subscriptionType: "max" });
  });

  test("milliseconds on disk become seconds everywhere else", () => {
    // The file writes ms; every other number in Overton is seconds. Mixing the
    // two makes a live token look ~50,000 years expired.
    const ms = parseCredentialBlob(blob({ accessToken: "t", expiresAt: 1_800_000_000_000 }))!;
    const sec = parseCredentialBlob(blob({ accessToken: "t", expiresAt: 1_800_000_000 }))!;
    expect(ms.expiresAt).toBe(1_800_000_000);
    expect(sec.expiresAt).toBe(1_800_000_000);
  });

  test("unparseable input is null rather than a throw", () => {
    // This runs on every poll against a file somebody else writes.
    expect(parseCredentialBlob("{ not json")).toBeNull();
    expect(parseCredentialBlob("")).toBeNull();
    expect(parseCredentialBlob("null")).toBeNull();
  });

  test("a blob with no usable token is null", () => {
    expect(parseCredentialBlob(blob({}))).toBeNull();
    expect(parseCredentialBlob(blob({ accessToken: "" }))).toBeNull();
    expect(parseCredentialBlob(blob({ accessToken: 12345 }))).toBeNull();
    expect(parseCredentialBlob(JSON.stringify({ somethingElse: true }))).toBeNull();
  });

  test("a token with no expiry is still a valid token", () => {
    // `claude setup-token` values are long-lived and carry no expiry; treating
    // that as invalid would break the only headless path.
    const t = parseCredentialBlob(blob({ accessToken: "sk-long-lived" }))!;
    expect(t.token).toBe("sk-long-lived");
    expect(t.expiresAt).toBeUndefined();
  });

  test("a nonsense expiry is dropped, not carried through as NaN", () => {
    for (const bad of ["soon", null, Infinity, NaN]) {
      const t = parseCredentialBlob(blob({ accessToken: "t", expiresAt: bad }))!;
      expect(t.token).toBe("t");
      expect(t.expiresAt).toBeUndefined();
    }
  });

  test("subscriptionType is read from either level", () => {
    expect(parseCredentialBlob(blob({ accessToken: "t" }, { subscriptionType: "pro" }))!.subscriptionType).toBe("pro");
    // The nested one wins when both are present.
    expect(parseCredentialBlob(blob({ accessToken: "t", subscriptionType: "max" }, { subscriptionType: "pro" }))!
      .subscriptionType).toBe("max");
  });
});

describe("expiry", () => {
  const at = (expiresAt?: number): ClaudeToken => ({ token: "t", expiresAt });

  test("a token with no expiry never expires", () => {
    expect(isExpiring(at(undefined), 2_000_000_000)).toBe(false);
  });

  test("past expiry is expiring", () => {
    expect(isExpiring(at(1000), 2000)).toBe(true);
  });

  test("the skew window counts as expiring, so a refresh happens before the failure", () => {
    // 30s left, 60s skew — treat as expiring rather than letting the next call
    // race the clock.
    expect(isExpiring(at(1030), 1000)).toBe(true);
    // 90s left is comfortably fine.
    expect(isExpiring(at(1090), 1000)).toBe(false);
  });

  test("the boundary is inclusive", () => {
    expect(isExpiring(at(1060), 1000, 60)).toBe(true);
    expect(isExpiring(at(1061), 1000, 60)).toBe(false);
  });

  test("skew is configurable", () => {
    expect(isExpiring(at(1500), 1000, 600)).toBe(true);
    expect(isExpiring(at(1500), 1000, 0)).toBe(false);
  });
});

describe("keychain service naming", () => {
  test("is stable for the same config dir", () => {
    expect(keychainService("/tmp/profile-a")).toBe(keychainService("/tmp/profile-a"));
  });

  test("differs per profile, which is what keeps two seats apart", () => {
    expect(keychainService("/tmp/profile-a")).not.toBe(keychainService("/tmp/profile-b"));
  });

  test("carries the Claude Code prefix and a short digest", () => {
    const s = keychainService("/tmp/profile-a");
    expect(s).toStartWith("Claude Code-credentials-");
    expect(s.slice("Claude Code-credentials-".length)).toMatch(/^[0-9a-f]{8}$/);
  });

  test("~ and its expansion name the same keychain item", () => {
    // Otherwise the same profile written two ways would look like two seats
    // and one of them would never find its token.
    expect(keychainService("~/x")).toBe(keychainService(`${process.env.HOME}/x`));
  });
});
