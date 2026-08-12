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

## Multiple machines — remote mode

One host meters and holds the database; every other machine's CLI asks it. That
is the difference between four machines each concluding it is on pace and one
arbiter that knows what all four have spent.

```bash
overton --remote https://arbiter.tailnet.ts.net status
```

Name it, and the name appears on every command, so nobody has to wonder which
Overton answered:

```yaml
# ~/.overton/config.yaml on the laptop
remotes:
  e16:
    url: https://overton.my-tailnet.ts.net
default_remote: e16
```

```console
$ overton ask myproject claude-personal
overton · e16 https://overton.my-tailnet.ts.net
go · myproject may dispatch on claude-personal
  7d  used 0.0 of 22.1 pts allowed (alloc 30.0, 64% elapsed)
```

The arbiter itself needs no new configuration — remote mode speaks the same
HTTP surface documented above. Expose it with Tailscale as usual:

```bash
tailscale serve --bg https://+:443 http://127.0.0.1:7787
```

### Where the target comes from

Highest first:

| | |
|---|---|
| `--remote <name\|url>` | this invocation |
| `$OVERTON_REMOTE` | this shell |
| `remotes:` + `default_remote:` | this machine |
| `remote: <url>` | the same, unnamed, for a host with only one |

A value containing `://` is used as given; anything else is a **name** looked up
in `remotes:`. A name that is not there is an error listing the ones that are —
never a near-miss guess. One remote with no `default_remote` is the default;
*several* with no `default_remote` are an address book, and stay local until
`--remote` picks one. With nothing set at all, everything behaves exactly as it
did before remote mode existed.

### Which commands go over the wire

| | |
|---|---|
| **remote** | `ask` `claim` `renew` `release` `run` `status` `windows` `projects` `claims` `ledger` `project ls\|ensure\|rm` |
| **local, and says so** | `meter` `daemon` `serve` `mcp` `doctor` `plugins` `init` `paperclip` `explain` |

The local-only ones are not missing features. Metering needs the vendor
credentials *on the machine it runs on*; `doctor` checks those same
credentials; `daemon` and `serve` bind a port to a database; `init` and
`paperclip` are about the machine you are typing on. `explain` is the
interesting one: there is no HTTP route that serves `Facts`, so a remote can
tell you what it decided but not show its working. Each refuses with the reason
and an `ssh` line, rather than answering a different question.

### It never falls back

If the remote is unreachable, the command **fails** — exit 1, the URL and the
underlying error on stderr, nothing on stdout:

```console
$ overton status
overton: https://overton.my-tailnet.ts.net is unreachable: Unable to connect
  the remote (e16 https://overton.my-tailnet.ts.net, from config) is where this question had to go,
  so nothing was answered from this machine's database.
```

Quietly rendering the local database instead would produce a complete,
plausible, entirely wrong table — every number from the wrong arbiter, and
nothing on the screen admitting it. That is the one failure worse than no
answer, so it is not an option, not even for read-only commands.

Verdict exit codes are identical over the wire: `ask` and `claim` still exit
0 `go` / 10 `wait` / 11 `ask` / 12 `deny` (the HTTP decision carries the code,
so the arbiter remains the authority), and 1 is only ever a transport failure.
`--json` output is byte-for-byte the local document, so a script cannot tell
which Overton answered.

### What still degrades

Metering stays correct — the vendor's number is account-wide, not per-machine.
What degrades is *attribution*: the other machine's transcripts are not on the
arbiter's disk, so its spend lands in `@interactive` rather than against a
project. `reading-guard` accounts for that honestly rather than pretending
otherwise, and a `claim` from a remote CLI carries no pid, because a pid from
another machine points at whatever unrelated process holds that number here.

[symphony]: https://github.com/openai/symphony
[paperclip]: https://github.com/paperclipai/paperclip
