/**
 * The deck.
 *
 * Design brief: an instrument, not a dashboard. A meter plus a ledger is
 * literally a recording instrument, so the page borrows that vernacular — a
 * cool paper ground with a blueprint grid, ink-blue traces, monospace numerals
 * throughout because figures have to align to be scanned, and exactly one red
 * pen reserved for over-limit.
 *
 * THE SIGNATURE IS THE PACE RULE. A track is the project's allocation, the fill
 * is what it has spent, and the hand marks what the clock permits by now. Fill
 * short of the hand is on pace; fill past it is what the gate refuses. That one
 * glyph is the whole product, so everything around it stays quiet.
 *
 * No build step and no framework: the shell is rendered with the current data
 * inlined for an instant first paint, and the same render function runs again
 * in the browser against the JSON API.
 */

import { accountViews, projectViews, type Overton } from "@overton/engine";

const STYLE = `
:root {
  color-scheme: light dark;
  --paper:   #F6F7F9;
  --panel:   #FFFFFF;
  --grid:    rgba(31,95,139,.07);
  --ink:     #17212B;
  --ink-2:   #5C6B7A;
  --rule:    #D9E0E7;
  --trace:   #1F5F8B;
  --hand:    #17212B;
  --pen:     #C03A20;
  --caution: #9A6A08;
  --ok:      #2C7A57;
  --ui: "SF Compact Text", "Avenir Next Condensed", "Helvetica Neue", system-ui, sans-serif;
  --num: ui-monospace, "SF Mono", SFMono-Regular, Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper:   #0F141A;
    --panel:   #151C24;
    --grid:    rgba(111,179,222,.06);
    --ink:     #E6EDF3;
    --ink-2:   #8FA0B2;
    --rule:    #253039;
    --trace:   #6FB3DE;
    --hand:    #E6EDF3;
    --pen:     #FF6B4A;
    --caution: #E0A94A;
    --ok:      #56C08D;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font-family: var(--ui); font-size: 15px; line-height: 1.5;
  /* The grid is the instrument's paper. 8px so it lines up with the spacing. */
  background-image: linear-gradient(var(--grid) 1px, transparent 1px),
                    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 8px 8px;
}
.wrap { max-width: 1080px; margin: 0 auto; padding: 32px 20px 96px; }

/* masthead ---------------------------------------------------------------- */
.mast { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 6px; }
.mark {
  font-family: var(--num); font-size: 22px; font-weight: 600;
  letter-spacing: -.02em;
}
.mark::after { content: ""; }
.tag { color: var(--ink-2); font-size: 13px; }
.mast-actions { margin-left: auto; display: flex; gap: 8px; }

/* panels ------------------------------------------------------------------ */
section { margin-top: 28px; }
h2 {
  font-size: 11px; text-transform: uppercase; letter-spacing: .14em;
  color: var(--ink-2); font-weight: 600; margin: 0 0 10px;
  display: flex; align-items: center; gap: 10px;
}
h2::after { content: ""; flex: 1; height: 1px; background: var(--rule); }
.panel {
  background: var(--panel); border: 1px solid var(--rule); border-radius: 3px;
}
.row { padding: 12px 16px; border-bottom: 1px solid var(--rule); }
.row:last-child { border-bottom: 0; }

/* accounts ---------------------------------------------------------------- */
.acct-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.acct-name { font-family: var(--num); font-size: 14px; font-weight: 600; }
.chip {
  font-size: 10px; text-transform: uppercase; letter-spacing: .1em;
  color: var(--ink-2); border: 1px solid var(--rule); border-radius: 2px; padding: 1px 5px;
}
.acct-meta { margin-left: auto; font-family: var(--num); font-size: 12px; color: var(--ink-2); }
.win { display: grid; grid-template-columns: 34px 1fr 118px; gap: 10px; align-items: center; margin-top: 5px; }
.win-k { font-family: var(--num); font-size: 11px; color: var(--ink-2); }
.win-v { font-family: var(--num); font-size: 12px; color: var(--ink-2); text-align: right; }

/* THE PACE RULE ----------------------------------------------------------- */
.rule-track {
  position: relative; height: 14px; background: transparent;
  border: 1px solid var(--rule); border-radius: 2px; overflow: hidden;
}
/* Scaled, not resized: the needle settles on the compositor rather than
   forcing a layout pass for every frame, and there may be a dozen rules on
   screen at once. --used is a 0-1 ratio. */
.rule-fill {
  position: absolute; inset: 0; width: 100%;
  transform-origin: left center; transform: scaleX(var(--used, 0));
  background: var(--trace); opacity: .85;
  transition: transform .6s cubic-bezier(.22,.61,.36,1);
}
.rule-fill.over { background: var(--pen); }
/* The hand: where the clock says you should be by now. */
.rule-hand {
  position: absolute; top: -3px; bottom: -3px; left: var(--hand-at, 0%);
  width: 2px; background: var(--hand); border-radius: 1px;
}
.rule-hand::after {
  content: ""; position: absolute; left: -2px; top: -3px;
  border-left: 3px solid transparent; border-right: 3px solid transparent;
  border-top: 4px solid var(--hand);
}
@media (prefers-reduced-motion: reduce) { .rule-fill { transition: none; } }

/* allocation table -------------------------------------------------------- */
.alloc { width: 100%; border-collapse: collapse; }
.alloc th {
  font-size: 10px; text-transform: uppercase; letter-spacing: .12em;
  color: var(--ink-2); font-weight: 600; text-align: left;
  padding: 8px 10px; border-bottom: 1px solid var(--rule); white-space: nowrap;
}
.alloc td { padding: 9px 10px; border-bottom: 1px solid var(--rule); vertical-align: middle; }
.alloc tr:last-child td { border-bottom: 0; }
.alloc td.n, .alloc th.n { text-align: right; font-family: var(--num); font-size: 12px; }
.proj { font-family: var(--num); font-size: 13px; }
.proj .acct { color: var(--ink-2); font-size: 11px; }
input[type=number], input[type=text] {
  font-family: var(--num); font-size: 12px; color: var(--ink);
  background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
  padding: 4px 6px; width: 68px; text-align: right;
}
input[type=text] { text-align: left; width: 100%; }
input:focus-visible, button:focus-visible, select:focus-visible {
  outline: 2px solid var(--trace); outline-offset: 1px;
}
.share { color: var(--ink-2); }
.verdict { font-family: var(--num); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.verdict.go { color: var(--ok); }
.verdict.wait, .verdict.ask { color: var(--caution); }
.verdict.deny { color: var(--pen); }
.pace.over { color: var(--pen); }
.pace { color: var(--ink-2); font-family: var(--num); font-size: 12px; }

button {
  font-family: var(--ui); font-size: 12px; letter-spacing: .04em;
  color: var(--ink); background: var(--panel);
  border: 1px solid var(--rule); border-radius: 2px; padding: 5px 10px; cursor: pointer;
}
button:hover { border-color: var(--trace); color: var(--trace); }
button.danger:hover { border-color: var(--pen); color: var(--pen); }
button.primary { background: var(--trace); color: var(--panel); border-color: var(--trace); }
button.primary:hover { opacity: .9; color: var(--panel); }

.add { display: grid; grid-template-columns: 1fr 1.6fr auto; gap: 8px; align-items: end; padding: 12px 16px; }
.add label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: var(--ink-2); margin-bottom: 4px; }
.weights { display: flex; flex-wrap: wrap; gap: 10px; padding: 0 16px 12px; }
.weights div { display: flex; align-items: center; gap: 6px; font-family: var(--num); font-size: 11px; color: var(--ink-2); }
.weights input { width: 56px; }

#flash {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
  background: var(--ink); color: var(--paper); font-family: var(--num); font-size: 12px;
  padding: 8px 14px; border-radius: 3px; opacity: 0; pointer-events: none;
  transition: opacity .2s; max-width: 90vw;
}
#flash.show { opacity: 1; }
#flash.bad { background: var(--pen); color: #fff; }
.empty { padding: 24px 16px; color: var(--ink-2); font-size: 13px; }
@media (max-width: 720px) {
  .add { grid-template-columns: 1fr; }
  .alloc .hide-sm { display: none; }
}
`;

const SCRIPT = String.raw`
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = (n) => (n == null ? "—" : n.toFixed(0) + "%");

let DATA = window.__OVERTON__;

function flash(msg, bad) {
  const el = $("#flash");
  el.textContent = msg;
  el.className = "show" + (bad ? " bad" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ""), bad ? 6000 : 2200);
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json", "x-overton": "1" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return data;
}

/** The pace rule: track = alloc, fill = used, hand = what the clock permits. */
function paceRule(used, allowance, alloc, over) {
  const span = Math.max(alloc, used, 0.0001);
  const w = Math.min(1, used / span);
  const hand = Math.min(100, (allowance / span) * 100);
  return '<div class="rule-track" role="img" aria-label="' +
    used.toFixed(1) + ' of ' + allowance.toFixed(1) + ' points allowed, ' + alloc.toFixed(1) + ' allocated">' +
    '<div class="rule-fill' + (over ? " over" : "") + '" style="--used:' + w + '"></div>' +
    '<div class="rule-hand" style="--hand-at:' + hand + '%"></div></div>';
}

function renderAccounts(accounts) {
  return accounts.map((a) => {
    const wins = a.windows.length
      ? a.windows.map((w) =>
          '<div class="win"><span class="win-k">' + esc(w.kind.replace("seven_day", "7d").replace("five_hour", "5h")) + '</span>' +
          '<div class="rule-track"><div class="rule-fill" style="--used:' + (w.utilizationPct / 100) + '"></div></div>' +
          '<span class="win-v">' + w.utilizationPct.toFixed(0) + '% · ' + (w.resetsIn ? "resets " + esc(w.resetsIn) : "reset unknown") + '</span></div>'
        ).join("")
      : '<div class="win"><span class="win-k">—</span><span class="win-v" style="grid-column:2/4;text-align:left">' +
        (a.metered ? "no reading yet" : "unmetered — no window to spend") + '</span></div>';
    return '<div class="row"><div class="acct-head">' +
      '<span class="acct-name">' + esc(a.accountId) + '</span>' +
      '<span class="chip">' + esc(a.provider) + '</span>' +
      (a.plan ? '<span class="chip">' + esc(a.plan) + '</span>' : "") +
      '<span class="acct-meta">' + a.claims + '/' + a.maxConcurrent + ' running · ' +
      (a.readingAgeSec == null ? "never metered" : "read " + Math.round(a.readingAgeSec) + "s ago") + '</span>' +
      '</div>' + wins + '</div>';
  }).join("");
}

function renderAlloc(projects) {
  const rows = [];
  for (const p of projects) {
    if (!p.accounts.length) {
      rows.push('<tr><td class="proj">' + esc(p.projectId) + '</td>' +
        '<td colspan="6" class="pace">no accounts — give it a weight below</td>' +
        '<td class="n"><button class="danger" data-rm="' + esc(p.projectId) + '">Remove</button></td></tr>');
      continue;
    }
    p.accounts.forEach((a, i) => {
      rows.push('<tr>' +
        '<td class="proj">' + (i === 0 ? esc(p.projectId) : "") +
          '<div class="acct">' + esc(a.accountId) + '</div></td>' +
        '<td class="n"><input type="number" min="0" step="0.05" value="' + a.weight +
          '" data-w-project="' + esc(p.projectId) + '" data-w-account="' + esc(a.accountId) + '" aria-label="weight"></td>' +
        '<td class="n share">' + pct(a.sharePct) + '</td>' +
        '<td class="n hide-sm">' + a.alloc.toFixed(1) + '</td>' +
        '<td style="min-width:180px">' + paceRule(a.used, a.allowance, a.alloc, a.over) + '</td>' +
        '<td class="n pace' + (a.over ? " over" : "") + '">' + esc(a.pace) + '</td>' +
        '<td class="n"><span class="verdict ' + esc(a.verdict) + '">' + esc(a.verdict) + '</span></td>' +
        '<td class="n">' + (i === 0 ? '<button class="danger" data-rm="' + esc(p.projectId) + '">Remove</button>' : "") + '</td>' +
      '</tr>');
    });
  }
  return rows.join("") || '<tr><td colspan="8" class="empty">No projects yet. Add one below to start allocating.</td></tr>';
}

function render() {
  $("#accounts").innerHTML = renderAccounts(DATA.accounts);
  $("#alloc-body").innerHTML = renderAlloc(DATA.projects);
  $("#metered-at").textContent = new Date().toLocaleTimeString();
}

async function refresh() {
  const [accounts, projects] = await Promise.all([
    fetch("/v1/accounts").then((r) => r.json()),
    fetch("/v1/projects").then((r) => r.json()),
  ]);
  DATA = { ...DATA, accounts, projects: withWeights(projects) };
  render();
}

/** The API reports the normalised share; the weight is what a person edits. */
function withWeights(projects) {
  const cfg = DATA.config.projects || {};
  return projects.map((p) => ({
    ...p,
    accounts: p.accounts.map((a) => ({
      ...a,
      weight: cfg[p.projectId]?.accounts?.[a.accountId]?.weekly_share ?? 1,
    })),
  }));
}

document.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.wProject) {
    const weight = Number(el.value);
    try {
      await api("PUT", "/v1/config/projects/" + encodeURIComponent(el.dataset.wProject) +
        "/accounts/" + encodeURIComponent(el.dataset.wAccount), { weight });
      DATA.config = await fetch("/v1/config").then((r) => r.json());
      await refresh();
      flash(el.dataset.wProject + " → " + weight + " on " + el.dataset.wAccount);
    } catch (err) { flash(err.message, true); }
  }
});

document.addEventListener("click", async (e) => {
  const rm = e.target.dataset && e.target.dataset.rm;
  if (rm) {
    if (!confirm("Remove project " + rm + "? Its allocation goes back to the other projects.")) return;
    try {
      await api("DELETE", "/v1/config/projects/" + encodeURIComponent(rm));
      DATA.config = await fetch("/v1/config").then((r) => r.json());
      await refresh();
      flash("Removed " + rm);
    } catch (err) { flash(err.message, true); }
  }
  if (e.target.id === "refresh") { refresh().then(() => flash("Refreshed")); }
});

$("#add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#add-id").value.trim();
  const roots = $("#add-roots").value.split(",").map((s) => s.trim()).filter(Boolean);
  const accounts = {};
  document.querySelectorAll("[data-add-account]").forEach((el) => {
    const v = Number(el.value);
    if (v > 0) accounts[el.dataset.addAccount] = v;
  });
  try {
    await api("POST", "/v1/config/projects", { id, roots, accounts });
    DATA.config = await fetch("/v1/config").then((r) => r.json());
    await refresh();
    $("#add-id").value = ""; $("#add-roots").value = "";
    flash("Added " + id);
  } catch (err) { flash(err.message, true); }
});

render();
setInterval(refresh, 30000);
`;

export function renderPage(o: Overton): string {
  const accounts = accountViews(o);
  const projects = projectViews(o);
  const config = { projects: o.cfg.projects, accounts: o.cfg.accounts };
  const accountIds = Object.keys(o.cfg.accounts).filter((id) => o.cfg.accounts[id]!.enabled);

  const data = JSON.stringify({
    accounts,
    projects: projects.map((p) => ({
      ...p,
      accounts: p.accounts.map((a) => ({
        ...a,
        weight: o.cfg.projects[p.projectId]?.accounts[a.accountId]?.weekly_share ?? 1,
      })),
    })),
    config,
    // Inlined so the first paint needs no round trip; the script re-fetches
    // from the same endpoints afterwards, so there is one render path.
  }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Overton</title>
<style>${STYLE}</style>
</head><body>
<div class="wrap">
  <div class="mast">
    <span class="mark">overton</span>
    <span class="tag">the range of dispatches currently acceptable</span>
    <span class="mast-actions">
      <button id="refresh">Refresh</button>
    </span>
  </div>
  <div class="tag" style="font-family:var(--num);font-size:11px">
    ${escapeHtml(o.configFile ?? "no config file — editing disabled")} · updated <span id="metered-at">—</span>
  </div>

  <section>
    <h2>Accounts</h2>
    <div class="panel" id="accounts"></div>
  </section>

  <section>
    <h2>Allocation</h2>
    <div class="panel">
      <table class="alloc">
        <thead><tr>
          <th>Project</th><th class="n">Weight</th><th class="n">Share</th>
          <th class="n hide-sm">Alloc</th><th>Used against the clock</th>
          <th class="n">Pace</th><th class="n">Verdict</th><th></th>
        </tr></thead>
        <tbody id="alloc-body"></tbody>
      </table>
    </div>
    <p class="tag" style="margin:8px 2px 0;font-size:12px">
      Weights are relative. Raising one lowers everyone else's share — the total always divides the
      account's dispatchable points. The mark on each rule is what the clock permits by now.
    </p>
  </section>

  <section>
    <h2>Add a project</h2>
    <form class="panel" id="add-form">
      <div class="add">
        <div><label for="add-id">Name</label><input type="text" id="add-id" placeholder="sideproject" required></div>
        <div><label for="add-roots">Directories</label><input type="text" id="add-roots" placeholder="~/Projects/sideproject, ~/Projects/other"></div>
        <button type="submit" class="primary">Add project</button>
      </div>
      <div class="weights">
        ${accountIds
          .map(
            (id) =>
              `<div><label for="w-${escapeHtml(id)}">${escapeHtml(id)}</label>
               <input type="number" min="0" step="0.05" value="0" id="w-${escapeHtml(id)}" data-add-account="${escapeHtml(id)}"></div>`,
          )
          .join("")}
      </div>
    </form>
    <p class="tag" style="margin:8px 2px 0;font-size:12px">
      Directories decide attribution: work whose path sits under one of them is charged to this project.
      A weight of 0 means the project may never use that account.
    </p>
  </section>
</div>
<div id="flash"></div>
<script>window.__OVERTON__ = ${data};</script>
<script>${SCRIPT}</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
