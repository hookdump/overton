/**
 * Sortable, prefixed ids. Time-ordered so a raw `ORDER BY id` is chronological
 * and so a claim id quoted in someone's logs tells you roughly when it happened.
 */

import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32, no I/L/O/U

function encode(n: number, len: number): string {
  let out = "";
  for (let i = len - 1; i >= 0; i--) {
    out = ALPHABET[n % 32]! + out;
    n = Math.floor(n / 32);
  }
  return out;
}

function randomPart(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % 32]!;
  return out;
}

export type IdPrefix = "clm" | "win" | "dec";

export function newId(prefix: IdPrefix, nowMs = Date.now()): string {
  return `${prefix}_${encode(nowMs, 10)}${randomPart(8)}`;
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
