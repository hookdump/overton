# 02 — Providers

A **provider** reads one account's windows from that vendor's own authority.
A **cost source** observes local evidence of spend so attribution has a ratio to
divide by.

They are separate because the two do not always come together: a vendor may
publish a usable percentage with no local transcript (nothing to divide by), or
write transcripts with no published percentage (nothing to divide).

---

## The one rule

> A provider returns `null` only when there is genuinely nothing to read, and
> **throws** when it could not read. It never fabricates a zero.

"Unknown" and "0% used" produce opposite decisions in the gate. A provider that
blurs them turns a broken credential into an open budget.

## Built-in: `anthropic`

Reads `GET https://api.anthropic.com/api/oauth/usage` — the same numbers the
`/usage` command shows, server-side and authoritative.

```http
GET /api/oauth/usage
Authorization: Bearer <oauth_access_token>
anthropic-beta: oauth-2025-04-20
User-Agent: claude-code/<version>
```

```jsonc
{
  "five_hour":        { "utilization": 33.0, "resets_at": "2026-08-11T07:00:00.528743+00:00" },
  "seven_day":        { "utilization": 13.0, "resets_at": "2026-08-17T00:59:59.951713+00:00" },
  "seven_day_opus":   null,
  "seven_day_sonnet": { "utilization": 1.0,  "resets_at": "2026-08-16T03:00:00.951719+00:00" }
}
```

Four things about this endpoint are not obvious and each costs a day to
rediscover.

1. **The `User-Agent` is mandatory.** Without `claude-code/<version>` the request
   lands in an aggressively rate-limited bucket and returns persistent 429s that
   look exactly like real quota exhaustion. `buildHeaders()` is the only way to
   construct the header set, so it cannot be forgotten.
2. **Rate limiting is per access token**, not per account. ~180s polling is safe.
3. **Access tokens expire roughly hourly** and are refreshed in place by Claude
   Code. The token is therefore read on *every* poll and never cached — a token
   memoised at daemon start is a 401 an hour later, and the failure looks like a
   misconfiguration rather than a stale read.
4. **It is undocumented.** Treat a schema change as expected. The top-level keys
   are the stable contract; the undocumented `limits[]` array is parsed
   defensively, may never throw, and only ever *fills* windows the top-level
   keys omitted.

`null` for a window is a real answer — that account has no such window — and is
never turned into `0`.

### Credentials

Resolved in precedence order:

1. `oauth_token_env` — a long-lived `claude setup-token` value; the only path
   that works on a headless host with no keychain.
2. The macOS keychain item for that profile's config dir. Claude Code namespaces
   it by a digest of the directory (`Claude Code-credentials-<sha256[:8]>`), so
   several profiles coexist on one login keychain.
3. `<config_dir>/.credentials.json` — Linux, and macOS with the keychain
   integration disabled.

`security find-generic-password -w` is used rather than `-g`: `-g` prints to
*stderr*, which is the usual reason a "working" keychain read returns an empty
string.

## Built-in: `codex`

There is no endpoint. Codex writes its server-reported limits into the session
transcript on `token_count` events, so the newest such block anywhere under
`$CODEX_HOME/sessions` is the account's most recent truth.

```jsonc
{ "primary":   { "window_minutes": 300,   "used_percent": 12.5, "resets_at": 1786179600 },
  "secondary": { "window_minutes": 10080, "used_percent": 41.0, "resets_at": 1786608000 },
  "plan_type": "team" }
```

**`primary` and `secondary` do not mean short and long.** The same account has
been observed reporting a 5h primary with a weekly secondary, and a weekly
primary with nothing else. Everything sorts by `window_minutes`; the names are
never consulted. Anything ≥ 24h is the "week" card, whatever the vendor calls it.

A second consequence of the source: readings only refresh while a session is
active, so an idle account's reading ages. That is correct — a weekly percentage
barely moves in an hour — and it is exactly what `stale` exists to express.

## Built-in: `unmetered`

Local models, and anything billed somewhere Overton does not arbitrate. It has
no window to be over, so budget policies skip it — but concurrency policy still
applies, because your machine has a finite number of cores whatever the tokens
cost.

Its purpose is to make free capacity a **first-class row** rather than an absence
from config, so `overton status` shows it and a project can be routed to it.

---

## Writing a provider

```ts
import { readingFreshness, type Reading } from "@overton/core";
import { ProviderError, type Provider, type ProviderContext } from "@overton/providers";

export class GeminiProvider implements Provider {
  readonly id = "gemini";
  readonly description = "Gemini CLI, via its daily request quota";
  readonly metered = true;

  async check(accountId, account, ctx): Promise<string[]> {
    // Fail fast at startup with a human fix, rather than at 03:00 with a stack
    // trace. Return the problems; an empty array means ready.
    if (!account.gemini_home) return ["needs `gemini_home`"];
    return [];
  }

  async read(accountId, account, ctx: ProviderContext): Promise<Reading | null> {
    let raw;
    try {
      raw = await ctx.fetch("https://…", { signal: AbortSignal.timeout(10_000) });
    } catch (e) {
      // Retryable: the daemon degrades the account to "no fresh reading",
      // which can only tighten a gate.
      throw new ProviderError(`unreachable: ${(e as Error).name}`, "transport", true);
    }
    if (raw.status === 401) {
      // Not retryable: re-auth is a human action, and retrying burns polls.
      throw new ProviderError("re-authenticate with `gemini auth`", "auth", false);
    }

    const body = await raw.json();
    const reading: Reading = {
      accountId,
      provider: this.id,
      ts: ctx.now,          // when the numbers were TRUE, not when we looked
      fetchedAt: ctx.now,
      windows: {
        // Window kinds are open-ended. A vendor with a daily window can use
        // "one_day" and it flows through the ledger and surfaces untouched.
        one_day: {
          kind: "one_day",
          utilizationPct: Math.max(0, Math.min(100, body.used_pct)),
          resetsAt: body.resets_at_epoch ?? null,
          windowSec: 86400,
        },
      },
      freshness: "ok",
    };
    reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
    return reading;
  }
}
```

Register it and name it in config:

```ts
import { Overton } from "@overton/engine";
import { defaultProviders } from "@overton/providers";

const providers = defaultProviders().register(new GeminiProvider());
const overton = new Overton({ db, cfg, providers });
```

```yaml
accounts:
  gemini-personal:
    provider: gemini
    gemini_home: ~/.gemini    # unknown keys pass through to your plugin
```

### Checklist

- [ ] `ts` is when the numbers were *true*, not when you fetched. If the source
      is a file written an hour ago, say so — freshness will handle it.
- [ ] Percentages clamped to `[0, 100]`, so a vendor glitch cannot produce a
      negative budget or an allowance above the plan.
- [ ] A missing window is **absent** from `windows`, never `0`.
- [ ] Errors are `ProviderError` with an accurate `retryable`.
- [ ] Credentials are read per call, never cached, and never appear in an error
      message or a log line.
- [ ] `check()` returns a human *fix*, not just a complaint.

## Writing a cost source

Only needed if your provider's vendor writes transcripts Overton cannot already
read. The contract is one method:

```ts
export class MyCostSource implements CostSource {
  readonly id = "my-transcript";
  readonly description = "Output tokens from …";

  supports(account) { return !!account.my_home; }

  scan(db, accountId, account, sinceMtime): ScanResult {
    // Return events AND cursors. The caller commits both in one transaction —
    // a cursor advanced before the events it covers are stored permanently
    // skips whatever a crash lost, and the loss is silent.
    return { events, cursors };
  }
}
```

Two traps, both measured in production:

- **Deduplicate by request, not by line.** A single API request is often written
  across several streamed records that each repeat the same cumulative usage
  block. Summing lines counted one request 2–4× and inflated whichever project
  streamed the most.
- **Event keys must be content-derived, never position-derived.** An index within
  a parse shifts the moment the read window slides, and deduplication then stops
  working. A 9.7 MiB rollout re-inserted its entire history on every tick, so
  its project's proxy grew without bound and every other project on the account
  was charged almost nothing.
