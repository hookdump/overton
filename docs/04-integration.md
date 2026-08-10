# 04 — Integration

Overton is meant to sit in front of something you already run. The integration
surface is deliberately one question, so adopting it does not mean adopting
anything else.

---

## The three surfaces

```bash
overton ask P A                                   # exit code carries the verdict
curl 'localhost:7787/v1/ask?project=P&account=A'  # always 200; decision in the body
overton mcp                                       # MCP over stdio
```

Same answers from all three — they call the same function.

### HTTP

| route | |
|---|---|
| `GET /v1/ask?project=P[&account=A]` | omit `account` to get every eligible account, best first |
| `POST /v1/claim` | `{project, account, label?, pid?, force?}` → decision + claim |
| `POST /v1/claim/:id/renew` | heartbeat; **404** if it was reaped |
| `POST /v1/claim/:id/release` | close |
| `GET /v1/accounts` `/v1/projects` `/v1/claims` `/v1/ledger?account=A` | views |
| `GET /v1/health` | |

Add `&format=text` to any `ask` for the human rendering.

**Every non-GET request needs `x-overton: 1`.** A cross-origin form post cannot
set a custom header, so requiring one is the CSRF guard for a loopback service
with no authentication. An API client just sends it:

```bash
curl -X POST localhost:7787/v1/claim \
  -H 'content-type: application/json' -H 'x-overton: 1' \
  -d '{"project":"myproject","account":"claude-personal"}'
```

**A refusal is 200, not 4xx.** The request was well-formed and the answer is
data. A `wait` is not a client error, and returning 429 invites middleware to
retry on a schedule of its own choosing rather than the one the decision
carries.

**It binds loopback and has no authentication**, because there is no multi-user
story. Expose it with Tailscale, not with `0.0.0.0`:

```bash
tailscale serve --bg --set-path /overton http://127.0.0.1:7787
```

---

## Shell — the general case

```bash
#!/usr/bin/env bash
set -euo pipefail
PROJECT=myproject ACCOUNT=claude-personal

while :; do
  if decision=$(overton ask "$PROJECT" "$ACCOUNT" --json); then
    break                                   # exit 0 → go
  fi
  case $? in
    10) sleep "$(jq -r '.retryAfterSec // 300' <<<"$decision")" ;;   # wait
    11) echo "needs a human: $(jq -r .summary <<<"$decision")"; exit 1 ;;
    12) echo "not allowed: $(jq -r .summary <<<"$decision")";  exit 1 ;;
  esac
done

overton run "$PROJECT" "$ACCOUNT" -- claude -p "$1"
```

`overton run` is the short version of the whole lifecycle — it asks, holds a
claim, heartbeats it on a timer, runs your command, and releases in a `finally`
so a crash or a signal still gives the capacity back.

## Symphony

[Symphony][symphony] polls a tracker and dispatches an agent per issue. Its
`WORKFLOW.md` supports workspace lifecycle hooks, and `before_run` is exactly
the admission point:

```yaml
workspace:
  root: ~/symphony-workspaces
  hooks:
    # A non-zero exit aborts the attempt, which is what a refusal should do.
    before_run: overton ask myproject claude-personal
```

Symphony's own `agent.max_concurrent_agents` caps sessions globally; Overton
adds the per-project budget it has no concept of. If you run several Symphony
instances against different repos, point them at one Overton and they stop
independently concluding they are on pace.

For a softer integration that waits rather than aborts, use the shell loop above
as the hook.

## Paperclip

[Paperclip][paperclip] wakes agents on heartbeats and enforces budgets in
**currency**. Overton enforces them in **plan window**, which is the constraint
that actually binds when you are on subscriptions rather than API keys.

Use it as the admission check in the adapter that runs the agent:

```bash
#!/usr/bin/env bash
# paperclip agent adapter
if ! overton ask "$PAPERCLIP_COMPANY" claude-personal >/dev/null; then
  # Exit non-zero so the heartbeat is a no-op and the agent sleeps to the next
  # one, rather than burning a turn to discover it has no budget.
  exit 75   # EX_TEMPFAIL
fi
exec claude -p "$PAPERCLIP_PROMPT"
```

## GitHub Actions

Self-hosted runners only — Overton reads credentials on the host.

```yaml
- name: Check budget
  id: budget
  run: |
    if overton ask "${{ github.event.repository.name }}" claude-personal --json > d.json; then
      echo "go=true" >> "$GITHUB_OUTPUT"
    else
      echo "go=false" >> "$GITHUB_OUTPUT"
      jq -r '.summary, (.remedies[] | "  → " + .)' d.json >> "$GITHUB_STEP_SUMMARY"
    fi

- if: steps.budget.outputs.go == 'true'
  run: overton run "${{ github.event.repository.name }}" claude-personal -- claude -p "…"
```

## MCP — letting an agent see its own budget

```json
{
  "mcpServers": {
    "overton": { "command": "overton", "args": ["mcp"] }
  }
}
```

Five tools: `overton_ask`, `overton_explain`, `overton_accounts`,
`overton_projects`, `overton_ledger`.

They are read-only on purpose. An agent should be able to find out *why* it was
refused and what else it could use; opening and releasing claims belongs to the
harness that actually runs the work, not to the model.

Decisions are returned as prose as well as JSON — a model reading *"wait 4h12m,
project is over its weekly allocation"* acts correctly far more often than one
handed a nested object to interpret.

## Running the daemon

```bash
overton daemon            # meter on a loop + serve HTTP
overton daemon --no-http  # metering only
overton meter             # a single tick, for cron
```

The daemon is **not** a scheduler of work. It owns no queue and dispatches
nothing; it keeps readings fresh and answers questions.

If it dies, `overton ask` keeps working against the same database — the readings
simply age, and the freshness guard tightens accordingly rather than silently
going stale. That is the intended failure mode.

### launchd (macOS)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>Label</key><string>dev.hookdump.overton</string>
  <key>ProgramArguments</key>
  <array><string>/opt/homebrew/bin/overton</string><string>daemon</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardErrorPath</key><string>/tmp/overton.log</string>
</dict></plist>
```

Save as `~/Library/LaunchAgents/dev.hookdump.overton.plist`, then
`launchctl load` it.

On macOS the daemon reads OAuth tokens from the login keychain, so it must run
as a **user agent**, not a system daemon — a `LaunchDaemon` has no access to
your login keychain and every Anthropic account will fail `doctor`.

### systemd (Linux)

```ini
[Unit]
Description=Overton quota arbiter
[Service]
ExecStart=/usr/local/bin/overton daemon
Restart=always
[Install]
WantedBy=default.target
```

`systemctl --user enable --now overton`.

---

## Multiple machines

Overton is single-host by design. If two machines share a subscription, run
Overton on one and have the other ask it over Tailscale:

```bash
overton() { curl -fsS "https://my-host.tailnet.ts.net/overton/v1/ask?project=$1&account=$2&format=text"; }
```

The metering is still correct — the vendor's number is account-wide, not
per-machine. What degrades is *attribution*: the remote machine's transcripts
are not on the arbiter's disk, so its spend lands in `@interactive` rather than
against a project. `reading-guard` accounts for this honestly rather than
pretending otherwise.

[symphony]: https://github.com/openai/symphony
[paperclip]: https://github.com/paperclipai/paperclip
