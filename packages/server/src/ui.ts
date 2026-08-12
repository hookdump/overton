/**
 * The deck.
 *
 * Design brief: an instrument, not a document. Someone opens this to answer two
 * questions in the first second — *what is my subscription capacity doing*, and
 * *is any project about to be refused* — so the page opens with the answers and
 * puts the evidence underneath them.
 *
 * THE SIGNATURE IS THE PACE RULE. A track is a budget, the fill is what has been
 * spent against it, and the hand marks what the clock permits by now. Fill short
 * of the hand is on pace; fill past it is what the gate refuses. Utilization
 * without the clock beside it is not a reading anyone can act on — 43% used is
 * alarming at 12% elapsed and comfortable at 90% — so no percentage appears on
 * this page without its hand.
 *
 * THREE RULES ABOUT NUMBERS, all of them scars:
 *
 *  1. The gate decides state; the deck only phrases it. `over` and `pace` come
 *     from the API and are never recomputed here. A display tolerance that
 *     rounds 0.01 points away paints "on pace" over a project the next request
 *     will be refused for.
 *  2. `over` describes the WEEKLY window only, while `verdict` is the whole
 *     policy chain — account-stop, reading-guard, allocation, concurrency. So
 *     the verdict column is authoritative and the pace bar is context. Where a
 *     reason is shown it is fetched from the decision, never inferred from the
 *     bar.
 *  3. "on pace" is the boundary band — not over, and within a rounding of the
 *     allowance — which is the last moment before refusal, not a comfortable
 *     state. It reads amber here. Green is reserved for genuinely under.
 *
 * No build step and no framework: the current data is inlined for an instant
 * first paint and the same render functions run again in the browser against
 * the JSON API, so there is exactly one render path.
 */

import { openClaims, accountViews, projectViews, type Overton } from "@overton/engine";

const STYLE = `
/* Tokens. Every colour is declared here on bare :root and only REDEFINED in the
   dark block, so no value exists solely inside a media query. Semantic colour
   (ok / warn / bad) is deliberately nowhere near the accent: the accent is data
   ink and focus, the semantics are state, and a page where the brand colour also
   means "fine" cannot say "fine" about anything else. Every state also carries a
   mark and a word, so none of it depends on hue. */
:root {
  color-scheme: light dark;

  --paper:    #F2F4F6;
  --panel:    #FFFFFF;
  --panel-2:  #F8FAFB;
  --ink:      #12171C;
  --ink-2:    #57636F;
  /* Tertiary, not decorative: roots, projections and the policy chain all live
     here, so it clears 4.5:1 on the lightest ground rather than fading out. */
  --ink-3:    #626C78;
  --rule:     #DCE2E8;
  --rule-2:   #EAEEF2;
  --track:    #EDF1F4;
  --tick:     #D3DBE3;

  --accent:     #1F5F8B;
  --accent-ink: #FFFFFF;
  /* The hand is ink, not a hue: it is the clock, and the clock is not a state. */
  --clock:      #12171C;

  --ok:    #1B7A4B; --ok-bg:   #E3F1E9; --ok-line:   #A9D6BF;
  --warn:  #8A5800; --warn-bg: #FAEFD8; --warn-line: #E3C68A;
  --bad:   #B2311B; --bad-bg:  #FAE5E1; --bad-line:  #EAAE9F;
  --mute:  #57636F; --mute-bg: #EEF1F4; --mute-line: #D5DCE3;

  --ui:  system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  --num: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper:    #0D1117;
    --panel:    #141A21;
    --panel-2:  #182029;
    --ink:      #E6EDF3;
    --ink-2:    #97A5B4;
    --ink-3:    #8593A2;
    --rule:     #242D37;
    --rule-2:   #1D252D;
    --track:    #1B222A;
    --tick:     #2B3540;

    --accent:     #6FB3DE;
    --accent-ink: #0D1117;
    --clock:      #E6EDF3;

    --ok:    #56C08D; --ok-bg:   #10261C; --ok-line:   #23503B;
    --warn:  #E0A94A; --warn-bg: #2A2110; --warn-line: #54421A;
    --bad:   #FF7A5C; --bad-bg:  #2E1512; --bad-line:  #5C2A20;
    --mute:  #97A5B4; --mute-bg: #1D252D; --mute-line: #2B3540;
  }
}

.t-ok   { --tone: var(--ok);   --tone-bg: var(--ok-bg);   --tone-line: var(--ok-line); }
.t-warn { --tone: var(--warn); --tone-bg: var(--warn-bg); --tone-line: var(--warn-line); }
.t-bad  { --tone: var(--bad);  --tone-bg: var(--bad-bg);  --tone-line: var(--bad-line); }
.t-mute { --tone: var(--mute); --tone-bg: var(--mute-bg); --tone-line: var(--mute-line); }

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--ui);
  font-size: 14px;
  line-height: 1.5;
  /* The page may never scroll sideways; wide things scroll inside themselves. */
  overflow-x: hidden;
}
.wrap { max-width: 1180px; margin: 0 auto; padding: 26px 20px 80px; }
/* Everywhere a figure sits above or beside another one and has to be compared
   by eye rather than read as a word. */
table, input, .tile-v, .win-meta, .card-foot, .alert-what, .stamp, .sub, .grp-roots {
  font-variant-numeric: tabular-nums;
}

/* masthead ---------------------------------------------------------------- */
.mast { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.mark { font-family: var(--num); font-size: 19px; font-weight: 600; letter-spacing: -.02em; margin: 0; }
.tag { color: var(--ink-2); font-size: 12.5px; }
.mast-r { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.stamp { font-family: var(--num); font-size: 11.5px; color: var(--ink-2); }
.mast-sub {
  font-family: var(--num); font-size: 11.5px; color: var(--ink-3);
  margin-top: 4px; overflow-wrap: anywhere;
}

/* sections ---------------------------------------------------------------- */
section { margin-top: 26px; }
h2 {
  font-size: 10.5px; text-transform: uppercase; letter-spacing: .14em;
  color: var(--ink-2); font-weight: 600; margin: 0 0 9px;
  display: flex; align-items: center; gap: 10px;
}
h2::after { content: ""; flex: 1; height: 1px; background: var(--rule); }
h2 .h2-note { text-transform: none; letter-spacing: 0; color: var(--ink-3); font-weight: 400; }
.panel { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; }
.note { color: var(--ink-2); font-size: 12px; margin: 8px 2px 0; max-width: 78ch; }
.note code, code { font-family: var(--num); font-size: .95em; color: var(--ink); }
.empty { padding: 18px 14px; color: var(--ink-2); font-size: 12.5px; }

/* the strip of headline figures ------------------------------------------- */
.tiles {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: 4px;
  overflow: hidden;
}
.tile { background: var(--panel); padding: 11px 14px 12px; }
.tile-k {
  font-size: 10px; text-transform: uppercase; letter-spacing: .12em;
  color: var(--ink-2); font-weight: 600;
}
.tile-v {
  font-family: var(--num); font-size: 26px; line-height: 1.15; letter-spacing: -.02em;
  margin-top: 5px; display: flex; align-items: baseline; gap: 7px;
}
.tile-v .mk { font-size: 16px; color: var(--tone); }
.tile.flag .tile-v { color: var(--tone); }
.tile-s { color: var(--ink-2); font-size: 11.5px; margin-top: 3px; }

/* what needs attention ---------------------------------------------------- */
.alerts { list-style: none; margin: 10px 0 0; padding: 0; border: 1px solid var(--rule); border-radius: 4px; }
.alert {
  display: grid; grid-template-columns: 14px minmax(0, auto) minmax(0, 1fr) auto;
  gap: 4px 12px; align-items: baseline;
  padding: 9px 13px; background: var(--panel); border-bottom: 1px solid var(--rule-2);
  border-left: 3px solid var(--tone);
}
.alert:first-child { border-radius: 3px 3px 0 0; }
.alert:last-child { border-bottom: 0; border-radius: 0 0 3px 3px; }
.alert .mk { color: var(--tone); font-family: var(--num); font-weight: 700; }
.alert-who { font-family: var(--num); font-size: 12.5px; }
.alert-who .arrow { color: var(--ink-3); }
.alert-what { color: var(--ink-2); font-size: 12px; font-family: var(--num); }
.alert-what .lead { color: var(--tone); font-weight: 600; }
.all-clear {
  display: flex; align-items: baseline; gap: 8px; margin-top: 10px;
  padding: 9px 13px; border: 1px solid var(--rule); border-radius: 4px;
  background: var(--panel); color: var(--ink-2); font-size: 12.5px;
}
.all-clear .mk { color: var(--ok); font-family: var(--num); font-weight: 700; }

/* accounts ---------------------------------------------------------------- */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(370px, 1fr)); gap: 12px; }
@media (max-width: 800px) { .cards { grid-template-columns: 1fr; } }
.card { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 12px 14px 11px; }
/* The stripe is signal, so only a card that wants attention gets one. A rule
   drawn on every card is decoration and stops meaning anything. */
.card.flag { border-left: 3px solid var(--tone); padding-left: 12px; }
.card-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 2px; }
.card-name { font-family: var(--num); font-size: 14px; font-weight: 600; }
.card-head .spacer { margin-left: auto; }
.chip {
  font-size: 10px; text-transform: uppercase; letter-spacing: .09em;
  color: var(--ink-2); border: 1px solid var(--rule); border-radius: 2px; padding: 1px 5px;
  white-space: nowrap;
}
.pill {
  display: inline-flex; align-items: baseline; gap: 4px;
  font-size: 10.5px; letter-spacing: .04em; white-space: nowrap;
  color: var(--tone); background: var(--tone-bg);
  border: 1px solid var(--tone-line); border-radius: 2px; padding: 1px 5px;
}
.pill .mk { font-family: var(--num); font-weight: 700; }
.card-foot {
  margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--rule-2);
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-family: var(--num); font-size: 11px; color: var(--ink-2);
}
.card-foot .spacer { margin-left: auto; }

/* one window: a label, a rule, and the two numbers that make it mean something */
.win { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 2px 10px; margin-top: 9px; }
.win-k { grid-row: 1 / span 2; font-family: var(--num); font-size: 11px; color: var(--ink-2); padding-top: 7px; }
.win-meta {
  display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
  font-family: var(--num); font-size: 11px; color: var(--ink-2);
}
.win-meta .spacer { margin-left: auto; }
.win-meta b { color: var(--ink); font-weight: 600; }

/* THE PACE RULE ----------------------------------------------------------- */
.meter { position: relative; padding-top: 5px; }
.track {
  position: relative; height: 15px; overflow: hidden;
  background-color: var(--track); border: 1px solid var(--rule); border-radius: 2px;
  /* Decile ticks, so a bar can be read to ~5% without looking at the number. */
  background-image: linear-gradient(90deg, var(--tick) 0 1px, transparent 1px);
  background-size: 10% 100%;
}
/* CLIPPED, not scaled and not resized. Scaling shears the hatch on an over-pace
   fill, and the hatch is the half of that encoding which survives
   colourblindness, so it has to keep its angle. Clipping a full-width element
   leaves the stripes alone and moves no layout — there can be thirty of these
   settling at once. */
.fill {
  position: absolute; inset: 0; background: var(--accent);
  clip-path: inset(0 calc((1 - var(--v, 0)) * 100%) 0 0);
  transition: clip-path .5s cubic-bezier(.22,.61,.36,1);
}
.fill.over {
  background-color: var(--bad);
  background-image: repeating-linear-gradient(
    135deg, rgba(255,255,255,.30) 0 3px, rgba(255,255,255,0) 3px 7px);
}
/* The hand: where the clock says this ought to be by now. */
.hand {
  position: absolute; top: 0; bottom: 0; left: var(--at, 0%);
  width: 2px; margin-left: -1px; background: var(--clock);
}
.hand::before {
  content: ""; position: absolute; top: 0; left: -3px;
  border-left: 4px solid transparent; border-right: 4px solid transparent;
  border-top: 5px solid var(--clock);
}
/* The account's own stop, which no project's share can spend past. */
.stop {
  position: absolute; top: 5px; bottom: 0; left: var(--at, 0%); width: 1px;
  background: repeating-linear-gradient(180deg, var(--ink-2) 0 2px, transparent 2px 5px);
}
.spill {
  position: absolute; right: 2px; top: 6px; font-family: var(--num); font-size: 11px;
  color: var(--bad); line-height: 15px;
}
@media (prefers-reduced-motion: reduce) { .fill { transition: none; } }

/* tables ------------------------------------------------------------------ */
.tablewrap { overflow-x: auto; }
table.grid { width: 100%; border-collapse: collapse; min-width: 720px; }
table.grid th {
  font-size: 10px; text-transform: uppercase; letter-spacing: .1em;
  color: var(--ink-2); font-weight: 600; text-align: left;
  padding: 7px 10px; border-bottom: 1px solid var(--rule); white-space: nowrap;
  background: var(--panel-2);
}
table.grid td { padding: 8px 10px; border-bottom: 1px solid var(--rule-2); vertical-align: middle; }
table.grid tr:last-child td { border-bottom: 0; }
table.grid td.n, table.grid th.n { text-align: right; font-family: var(--num); font-size: 12px; }
table.grid td.mono { font-family: var(--num); font-size: 12px; }
.sub { color: var(--ink-3); font-size: 11px; font-family: var(--num); }

.grp th {
  background: var(--panel-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule-2);
  text-transform: none; letter-spacing: 0; padding: 8px 10px;
}
.grp-in { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.grp-name { font-family: var(--num); font-size: 13px; font-weight: 600; color: var(--ink); }
.grp-roots { font-family: var(--num); font-size: 11px; color: var(--ink-3); overflow-wrap: anywhere; }
.grp-in .spacer { margin-left: auto; }
.acct-cell { font-family: var(--num); font-size: 12px; }

/* the decision, fetched on demand ----------------------------------------- */
.why { background: var(--panel-2); }
.why-in { padding: 4px 2px 8px; }
.why-head { display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap; margin-bottom: 6px; }
.why-sum { font-size: 12.5px; }
.why-head .spacer { margin-left: auto; }
.why pre {
  margin: 0; font-family: var(--num); font-size: 11.5px; color: var(--ink-2);
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.why ul { margin: 7px 0 0; padding-left: 0; list-style: none; }
.why li { font-family: var(--num); font-size: 11.5px; color: var(--ink-2); padding: 1px 0; }
.why li::before { content: "\\2192  "; color: var(--accent); }
.why .rulings { margin-top: 8px; font-family: var(--num); font-size: 11px; color: var(--ink-3); }
.why .rulings div { padding: 1px 0; }

/* controls ---------------------------------------------------------------- */
input[type=number], input[type=text] {
  font-family: var(--num); font-size: 12px; color: var(--ink);
  background: var(--panel); border: 1px solid var(--rule); border-radius: 2px;
  padding: 4px 6px; width: 70px; text-align: right;
}
input[type=text] { text-align: left; width: 100%; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-radius: 2px; }
button {
  font-family: var(--ui); font-size: 11.5px; letter-spacing: .02em;
  color: var(--ink); background: var(--panel);
  border: 1px solid var(--rule); border-radius: 2px; padding: 4px 9px; cursor: pointer;
}
button:hover { border-color: var(--accent); color: var(--accent); }
button.quiet { border-color: transparent; background: transparent; color: var(--ink-2); padding: 2px 5px; }
button.quiet:hover { color: var(--accent); border-color: var(--rule); }
button.danger:hover { border-color: var(--bad); color: var(--bad); }
button.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
button.primary:hover { color: var(--accent-ink); opacity: .9; }
button[aria-expanded=true] { border-color: var(--accent); color: var(--accent); }

.add { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(200px, 2fr) auto; gap: 10px; align-items: end; padding: 12px 14px; }
.add label, .weights label {
  display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .11em;
  color: var(--ink-2); margin-bottom: 4px;
}
.weights { display: flex; flex-wrap: wrap; gap: 12px; padding: 0 14px 12px; }
.weights > div { font-family: var(--num); }
.weights label { font-family: var(--ui); text-transform: none; letter-spacing: 0; font-size: 11px; }
.weights input { width: 62px; }

/* legend and footer ------------------------------------------------------- */
.legend { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 9px 2px 0; }
.legend span.item { font-size: 11.5px; color: var(--ink-2); }
.legend .mk { font-family: var(--num); font-weight: 700; color: var(--tone); }
.foot {
  margin-top: 30px; padding-top: 12px; border-top: 1px solid var(--rule);
  color: var(--ink-3); font-size: 11.5px;
}
.foot .chain { font-family: var(--num); color: var(--ink-2); }

#flash {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
  background: var(--ink); color: var(--paper); font-family: var(--num); font-size: 12px;
  padding: 8px 14px; border-radius: 3px; opacity: 0; pointer-events: none;
  transition: opacity .2s; max-width: 90vw; z-index: 9;
}
#flash.show { opacity: 1; }
/* --paper, not white: the dark palette's --bad is a light salmon, and white on
   it is unreadable. The ground colour inverts correctly in both themes. */
#flash.bad { background: var(--bad); color: var(--paper); }
@media (prefers-reduced-motion: reduce) { #flash { transition: none; } }

@media (max-width: 720px) {
  .add { grid-template-columns: 1fr; }
  .alert { grid-template-columns: 14px minmax(0, 1fr); }
  .alert .alert-act { grid-column: 2; justify-self: start; }
  /* The table still scrolls in its own box; dropping the two columns a phone
     can least use just shortens how far. */
  .hide-sm { display: none; }
  table.grid { min-width: 540px; }
}
`;

const SCRIPT = String.raw`
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const clamp01 = (n) => (isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const pts = (n) => (n == null || !isFinite(n) ? "—" : n.toFixed(1));
const pct = (n) => (n == null || !isFinite(n) ? "—" : n.toFixed(0) + "%");

/* Mirrors humanDuration in the core. The deck and the CLI describing the same
   backoff differently is a bug report waiting to happen. */
function dur(sec) {
  if (sec == null || !isFinite(sec)) return "—";
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return s + "s";
  const mins = Math.round(s / 60);
  if (mins < 60) return mins + "m";
  if (mins < 1440) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? h + "h" + m + "m" : h + "h";
  }
  const hours = Math.round(mins / 60), d = Math.floor(hours / 24), h = hours % 24;
  return h ? d + "d" + h + "h" : d + "d";
}

/* Window kinds are open-ended — a provider may report a monthly one — so an
   unrecognised kind is shown as itself rather than dropped. */
function winLabel(kind) {
  return kind === "seven_day" ? "7d" : kind === "five_hour" ? "5h" : String(kind);
}

/* Every state carries a MARK as well as a colour. Four marks, one alphabet:
   usable, degraded, needs a person, void. */
const VERDICTS = {
  go:   { mk: "✓", tone: "ok",   gloss: "dispatch" },
  wait: { mk: "~",      tone: "warn", gloss: "time fixes this" },
  ask:  { mk: "?",      tone: "warn", gloss: "a human fixes this" },
  deny: { mk: "×", tone: "bad",  gloss: "policy fixes this" },
};
const SEVERITY = { go: 0, wait: 1, ask: 2, deny: 3 };
const FRESHNESS = {
  ok:      { mk: "✓", tone: "ok",   gloss: "usable" },
  stale:   { mk: "~",      tone: "warn", gloss: "describes a live window, but spend has happened since" },
  expired: { mk: "×", tone: "bad",  gloss: "the window it describes has ended — every number in it is void" },
  unknown: { mk: "?",      tone: "mute", gloss: "no reading for this window" },
};
/* The freshness ladder, least to most degraded. unknown sits below expired:
   having no reading is a gap, while holding one about a window that has ended
   is a number that will actively mislead. */
const DEGRADED = ["ok", "stale", "unknown", "expired"];
const UP = "▲", DOWN = "▼", LEVEL = "=";

let DATA = window.__OVERTON__;
let ledgers = {};            // accountId -> LedgerView, for the open ones
let panels = { ledger: {}, why: null, whyData: null };
let clockSkew = 0;           // daemon seconds minus browser seconds
let live = true;
let lastGood = Date.now();
let timer = null;

/* Ages are measured on the DAEMON's clock. A browser an hour out would print
   plausible, wrong reading ages, and "how old is this number" is the one
   question the honesty rules exist to answer. */
function now() { return Math.floor(Date.now() / 1000) + clockSkew; }

function flash(msg, bad) {
  const el = $("#flash");
  el.textContent = msg;
  el.className = "show" + (bad ? " bad" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ""), bad ? 7000 : 2200);
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
const getJson = (path) => fetch(path).then((r) => {
  if (!r.ok) throw new Error(path + " → HTTP " + r.status);
  return r.json();
});

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

function pill(tone, mk, text, title) {
  return '<span class="pill t-' + tone + '"' + (title ? ' title="' + esc(title) + '"' : "") + '>' +
    '<span class="mk" aria-hidden="true">' + mk + '</span>' + esc(text) + '</span>';
}

function verdictPill(verdict, retryAfterSec) {
  const v = VERDICTS[verdict] || { mk: "?", tone: "mute", gloss: "" };
  // Matches verdictLabel() in the core: a bare wait tells a caller nothing.
  const label = verdict === "wait" && retryAfterSec != null ? "wait " + dur(retryAfterSec) : verdict;
  return pill(v.tone, v.mk, label, verdict + " — " + v.gloss);
}

/**
 * The pace rule. v is the fill as a fraction of the track, hand is where the
 * clock permits by now, stop is a fixed ceiling. All fractions of the track.
 */
function meter(o) {
  const out = ['<div class="meter" role="img" aria-label="' + esc(o.label) + '">',
    '<div class="track"><span class="fill' + (o.over ? " over" : "") +
    '" style="--v:' + clamp01(o.v).toFixed(4) + '"></span></div>'];
  if (o.hand != null) out.push('<span class="hand" style="--at:' + (clamp01(o.hand) * 100).toFixed(2) + '%"></span>');
  if (o.stop != null) out.push('<span class="stop" style="--at:' + (clamp01(o.stop) * 100).toFixed(2) + '%"></span>');
  if (o.spill) out.push('<span class="spill" aria-hidden="true">▸</span>');
  out.push('</div>');
  return out.join("");
}

// ---------------------------------------------------------------------------
// derived, once, so every section agrees
// ---------------------------------------------------------------------------

/** Every (project, account) pairing the gate has an opinion about. */
function pairings() {
  const out = [];
  for (const p of DATA.projects) for (const a of p.accounts) out.push({ projectId: p.projectId, a });
  return out;
}

function accountCfg(id) { return (DATA.config.accounts || {})[id] || {}; }
function windowOf(a, kind) { return a.windows.find((w) => w.kind === kind) || null; }

/**
 * The card's headline state, worst first.
 *
 * Freshness leads because it is a statement about whether the other numbers
 * mean anything at all. The account stop is the AccountStopPolicy's own rule —
 * utilization >= weekly_target_pct, no tolerance — restated, not re-derived
 * with a threshold of the deck's own invention.
 */
function accountState(a) {
  if (!a.enabled) return { tone: "mute", mk: "×", text: "disabled", why: "no project may spend on it" };
  if (!a.metered) return { tone: "mute", mk: "=", text: "unmetered", why: "no window to spend against" };
  if (!a.windows.length) return { tone: "warn", mk: "?", text: "no reading", why: "run overton meter" };

  let worst = null;
  for (const w of a.windows) {
    if (w.freshness === "ok") continue;
    if (!worst || DEGRADED.indexOf(w.freshness) > DEGRADED.indexOf(worst.freshness)) worst = w;
  }
  if (worst) {
    const f = FRESHNESS[worst.freshness];
    return { tone: f.tone, mk: f.mk, text: winLabel(worst.kind) + " " + worst.freshness, why: f.gloss };
  }

  const w7 = windowOf(a, "seven_day");
  const target = accountCfg(a.accountId).weekly_target_pct;
  if (w7 && target != null && w7.utilizationPct >= target) {
    return {
      tone: "bad", mk: "×", text: "at the account stop",
      why: "the account is at " + pct(w7.utilizationPct) + " of a " + target + "% target, which stops every project",
    };
  }
  if (w7 && w7.resetsAt != null && w7.utilizationPct > w7.elapsedPct + 1) {
    return {
      tone: "warn", mk: UP, text: "ahead of the clock",
      why: "descriptive, not a gate: " + pct(w7.utilizationPct) + " used at " + pct(w7.elapsedPct) + " elapsed",
    };
  }
  return { tone: "ok", mk: "✓", text: "ok", why: "reading usable, inside the clock" };
}

// ---------------------------------------------------------------------------
// sections
// ---------------------------------------------------------------------------

function renderTiles() {
  const all = pairings();
  const blocked = all.filter((x) => x.a.verdict !== "go");
  let worst = "go";
  for (const x of all) if (SEVERITY[x.a.verdict] > SEVERITY[worst]) worst = x.a.verdict;

  const tiles = [];
  const v = VERDICTS[worst] || VERDICTS.go;
  tiles.push(tile({
    k: "Gate",
    tone: blocked.length ? v.tone : "ok",
    flag: blocked.length > 0,
    mk: blocked.length ? v.mk : "✓",
    value: blocked.length ? String(blocked.length) : "clear",
    sub: all.length ? (blocked.length ? "of " + all.length + " pairings refused" : "all " + all.length + " pairings go") : "no pairings configured",
  }));

  // The tightest window across the fleet, measured against the clock rather
  // than against 100% — ranking by raw percentage gets it exactly backwards.
  let tight = null;
  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    const w = windowOf(a, "seven_day");
    if (!w || w.resetsAt == null) continue;
    const gap = w.utilizationPct - w.elapsedPct;
    if (!tight || gap > tight.gap) tight = { a, w, gap };
  }
  if (tight) {
    const target = accountCfg(tight.a.accountId).weekly_target_pct;
    const stopped = target != null && tight.w.utilizationPct >= target;
    tiles.push(tile({
      k: "Tightest 7d window",
      tone: stopped ? "bad" : tight.gap > 0 ? "warn" : "ok",
      flag: stopped || tight.gap > 0,
      mk: stopped ? "×" : tight.gap > 0 ? UP : DOWN,
      value: (tight.gap >= 0 ? "+" : "−") + Math.abs(tight.gap).toFixed(0),
      sub: tight.a.accountId + " · " + pct(tight.w.utilizationPct) + " used at " + pct(tight.w.elapsedPct) + " elapsed",
    }));
  } else {
    tiles.push(tile({ k: "Tightest 7d window", tone: "mute", mk: "?", value: "—", sub: "no metered window with a reset instant" }));
  }

  const cap = DATA.accounts.filter((a) => a.enabled).reduce((n, a) => n + a.maxConcurrent, 0);
  const held = DATA.claims.length;
  tiles.push(tile({
    k: "Holding capacity",
    tone: cap && held >= cap ? "warn" : "ok",
    flag: cap > 0 && held >= cap,
    mk: cap && held >= cap ? "!" : "=",
    value: held + " / " + cap,
    sub: held ? "open claims, lease " + dur(DATA.meta.claimLeaseSec) : "nothing is spending right now",
  }));

  // Oldest reading, because a deck that shows a confident number from four
  // hours ago is the failure mode the freshness ladder exists to prevent.
  let oldest = null;
  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    if (a.readingAgeSec == null) { oldest = { a, age: Infinity, never: true }; break; }
    if (!oldest || a.readingAgeSec > oldest.age) oldest = { a, age: a.readingAgeSec };
  }
  let fresh = "ok";
  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    for (const w of a.windows) if (DEGRADED.indexOf(w.freshness) > DEGRADED.indexOf(fresh)) fresh = w.freshness;
  }
  const f = FRESHNESS[fresh] || FRESHNESS.unknown;
  tiles.push(tile({
    k: "Oldest reading",
    tone: oldest && oldest.never ? "warn" : f.tone,
    flag: fresh !== "ok" || !!(oldest && oldest.never),
    mk: oldest && oldest.never ? "?" : f.mk,
    value: !oldest ? "—" : oldest.never ? "never" : dur(oldest.age),
    sub: !oldest ? "no metered accounts" : oldest.never ? oldest.a.accountId + " has never been metered" : oldest.a.accountId + " · worst freshness " + fresh,
  }));

  $("#tiles").innerHTML = tiles.join("");
}

function tile(o) {
  return '<div class="tile t-' + o.tone + (o.flag ? " flag" : "") + '">' +
    '<div class="tile-k">' + esc(o.k) + '</div>' +
    '<div class="tile-v"><span class="mk" aria-hidden="true">' + o.mk + '</span>' + esc(o.value) + '</div>' +
    '<div class="tile-s">' + esc(o.sub) + '</div></div>';
}

/**
 * What needs attention, as FACTS rather than causes.
 *
 * The verdict comes from the whole policy chain, so "over its allocation" would
 * be a guess three times out of four — a stale reading, the account-wide stop
 * and the concurrency ceiling all produce a wait with a perfectly healthy
 * pace bar. The numbers shown here are the ones the row would show; the reason
 * is a click away, from the decision itself.
 */
function renderAttention() {
  const rows = [];

  for (const a of DATA.accounts) {
    if (!a.enabled || !a.metered) continue;
    const st = accountState(a);
    if (st.tone === "ok" || st.tone === "mute") continue;
    rows.push({
      sev: st.tone === "bad" ? 3 : 1, tone: st.tone, mk: st.mk,
      who: esc(a.accountId), lead: st.text, what: st.why, act: "",
    });
  }

  for (const x of pairings()) {
    if (x.a.verdict === "go") continue;
    const v = VERDICTS[x.a.verdict];
    const label = x.a.verdict === "wait" && x.a.retryAfterSec != null ? "wait " + dur(x.a.retryAfterSec) : x.a.verdict;
    rows.push({
      sev: SEVERITY[x.a.verdict], tone: v.tone, mk: v.mk,
      who: esc(x.projectId) + ' <span class="arrow">→</span> ' + esc(x.a.accountId),
      lead: label,
      what: x.a.alloc > 0
        ? pts(x.a.used) + " of " + pts(x.a.allowance) + " pts permitted by now · " + pct(x.a.elapsedPct) + " of the week elapsed"
        : "no allocation on this account",
      act: '<button class="quiet" data-act="why" data-project="' + esc(x.projectId) + '" data-account="' + esc(x.a.accountId) + '">why</button>',
    });
  }

  rows.sort((a, b) => b.sev - a.sev);
  const host = $("#attention");
  if (!rows.length) {
    const n = pairings().length;
    host.innerHTML = '<div class="all-clear"><span class="mk" aria-hidden="true">✓</span>' +
      (n ? 'Nothing is refused. ' + n + ' pairing' + (n === 1 ? "" : "s") + ', every reading usable.'
         : 'No project names an account yet, so there is nothing to gate.') + '</div>';
    return;
  }
  host.innerHTML = '<ul class="alerts">' + rows.map((r) =>
    '<li class="alert t-' + r.tone + '"><span class="mk" aria-hidden="true">' + r.mk + '</span>' +
    '<span class="alert-who">' + r.who + '</span>' +
    '<span class="alert-what"><span class="lead">' + esc(r.lead) + '</span> · ' + esc(r.what) + '</span>' +
    '<span class="alert-act">' + r.act + '</span></li>').join("") + '</ul>';
}

function windowRow(a, w) {
  const cfg = accountCfg(a.accountId);
  const known = w.resetsAt != null;
  const weekly = w.kind === "seven_day";
  const target = weekly ? cfg.weekly_target_pct : cfg.five_hour_target_pct;
  const f = FRESHNESS[w.freshness] || FRESHNESS.unknown;

  const label = winLabel(w.kind) + " window: " + pct(w.utilizationPct) + " used" +
    (known ? ", " + pct(w.elapsedPct) + " of the window elapsed, resets in " + w.resetsIn
           : ", the vendor did not say when it resets") +
    (target != null ? ", account stop at " + target + "%" : "");

  // Only the weekly window gets a pace delta. The 5-hour window is burst by
  // default — a flat ceiling, deliberately unpaced, because it refills several
  // times a day — so marking it "ahead" would imply a gate that is not running.
  let delta = "";
  if (weekly && known) {
    const d = w.utilizationPct - w.elapsedPct;
    const tone = target != null && w.utilizationPct >= target ? "bad" : d > 1 ? "warn" : "ok";
    const mk = d > 1 ? UP : d < -1 ? DOWN : LEVEL;
    const text = Math.abs(d) <= 1 ? "level with the clock" : Math.abs(d).toFixed(0) + " pts " + (d > 0 ? "ahead" : "behind");
    delta = pill(tone, mk, text, "utilization minus elapsed — descriptive of the account, not a project's gate");
  }

  return '<div class="win"><span class="win-k">' + esc(winLabel(w.kind)) + '</span>' +
    meter({
      v: w.utilizationPct / 100,
      hand: known ? w.elapsedPct / 100 : null,
      stop: target != null ? target / 100 : null,
      label: label,
    }) +
    '<span class="win-meta"><b>' + pct(w.utilizationPct) + '</b> used' +
      (known ? ' at <b>' + pct(w.elapsedPct) + '</b> elapsed' : ' · reset instant unknown') +
      (delta ? " " + delta : "") +
      '<span class="spacer"></span>' +
      (w.freshness !== "ok" ? pill(f.tone, f.mk, w.freshness, f.gloss) + " " : "") +
      (known ? "resets " + esc(w.resetsIn) : "") +
    '</span></div>';
}

function renderAccounts() {
  $("#accounts").innerHTML = DATA.accounts.map((a) => {
    const st = accountState(a);
    const cfg = accountCfg(a.accountId);
    const body = a.windows.length
      ? a.windows.map((w) => windowRow(a, w)).join("")
      : '<div class="empty" style="padding:10px 0 0">' +
        (a.metered ? "No reading yet — run <code>overton meter</code>." : "Unmetered: no window, so nothing to pace.") +
        '</div>';

    const isOpen = !!panels.ledger[a.accountId];
    const led = isOpen ? renderLedger(a) : "";
    // A stripe on every card is decoration. Only warn and bad want an eye;
    // "unmetered" and "disabled" are settings, not conditions.
    const flagged = st.tone === "warn" || st.tone === "bad";
    // Points only mean something where there is a window to spend them from.
    const spendable = a.enabled && a.metered;

    return '<article class="card t-' + st.tone + (flagged ? " flag" : "") + '">' +
      '<div class="card-head">' +
        '<span class="card-name">' + esc(a.accountId) + '</span>' +
        '<span class="chip">' + esc(a.provider) + '</span>' +
        (a.plan ? '<span class="chip">' + esc(a.plan) + '</span>' : "") +
        '<span class="spacer"></span>' + pill(st.tone, st.mk, st.text, st.why) +
      '</div>' + body +
      '<div class="card-foot">' +
        (spendable
          ? '<span>' + pts(a.dispatchable) + ' pts dispatchable</span><span>' + pts(a.attributed) + ' attributed</span>'
          : '<span>not dispatchable</span>') +
        '<span>' + a.claims + '/' + a.maxConcurrent + ' running</span>' +
        '<span class="spacer"></span>' +
        '<span>' + (a.readingAgeSec == null ? "never metered" : "read " + dur(a.readingAgeSec) + " ago") + '</span>' +
        (spendable
          ? '<button class="quiet" data-act="ledger" data-account="' + esc(a.accountId) + '" aria-expanded="' + isOpen + '">' +
            (isOpen ? "hide split" : "who spent it") + '</button>'
          : "") +
      '</div>' + led +
    '</article>';
  }).join("");
}

/**
 * The attribution split, including the spend nobody claimed.
 *
 * The vendor reports one number per account; dividing it across projects is
 * inference, and the gap between the two is the only signal that says a spend
 * source is being missed. It is fetched per account on demand rather than on
 * the poll because it is a different question from "am I on pace".
 */
function renderLedger(a) {
  const v = ledgers[a.accountId];
  if (!v) return '<div class="empty" style="padding:8px 0 0">reading the ledger…</div>';
  const rows = v.rows.slice().sort((x, y) => y.pct - x.pct);
  if (!rows.length) {
    return '<div class="empty" style="padding:8px 0 0">Nothing attributed in this epoch yet.</div>';
  }
  const total = v.attributed;
  const gap = v.vendorPct != null ? v.vendorPct - total : null;
  // tabindex, because a box that scrolls but cannot be focused is unreachable
  // from a keyboard. The allocation table needs none — its inputs are focusable.
  return '<div class="tablewrap" tabindex="0" role="group" aria-label="attribution split for ' + esc(a.accountId) +
    '" style="margin-top:8px"><table class="grid" style="min-width:0">' +
    '<thead><tr><th>Project</th><th class="n">Attributed</th><th class="n">Output tokens</th><th class="n">Confidence</th></tr></thead><tbody>' +
    rows.map((r) =>
      '<tr><td class="mono">' + esc(r.projectId) + '</td>' +
      '<td class="n">' + r.pct.toFixed(2) + '</td>' +
      '<td class="n">' + r.proxy.toLocaleString() + '</td>' +
      '<td class="n">' + pct(r.confidencePct) + '</td></tr>').join("") +
    '</tbody></table></div>' +
    (gap == null ? "" :
      '<p class="note" style="margin:7px 0 0">vendor says <b>' + pct(v.vendorPct) + '</b>, we attributed <b>' +
      pts(total) + ' pts</b> — a gap of ' + pts(gap) + '. Some of that is spend from before this epoch was ' +
      'first observed; a <em>widening</em> gap means a source Overton cannot see.</p>');
}

/** Config is the source of truth for which projects exist — projectViews
    omits the disabled ones, and a project that silently vanishes from the deck
    when someone toggles it in the YAML is worse than one shown greyed out. */
function projectRows() {
  const cfg = DATA.config.projects || {};
  const byId = {};
  for (const p of DATA.projects) byId[p.projectId] = p;
  const ids = Object.keys(cfg);
  for (const p of DATA.projects) if (ids.indexOf(p.projectId) < 0) ids.push(p.projectId);
  return ids.map((id) => ({
    id,
    cfg: cfg[id] || { accounts: {}, roots: [] },
    view: byId[id] || null,
    enabled: cfg[id] ? cfg[id].enabled !== false : true,
  }));
}

function renderAlloc() {
  const out = [];
  for (const p of projectRows()) {
    const roots = (p.cfg.roots || []);
    out.push('<tr class="grp"><th colspan="9" scope="rowgroup"><div class="grp-in">' +
      '<span class="grp-name">' + esc(p.id) + '</span>' +
      (p.enabled ? "" : pill("mute", "×", "disabled", "not allocated, and its weights do not dilute anyone else's share")) +
      '<span class="grp-roots">' + (roots.length ? esc(roots.join("  ")) : "no roots — nothing will be attributed to it") + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="quiet" data-act="toggle" data-project="' + esc(p.id) + '" data-to="' + (p.enabled ? "0" : "1") + '">' +
        (p.enabled ? "disable" : "enable") + '</button>' +
      '<button class="quiet danger" data-act="rm" data-project="' + esc(p.id) + '">remove</button>' +
      '</div></th></tr>');

    const accountIds = Object.keys(p.cfg.accounts || {});
    if (!p.view && !accountIds.length) {
      out.push('<tr><td colspan="9" class="empty">No account named, so this project may not spend anywhere. Give it a weight below.</td></tr>');
      continue;
    }

    if (!p.enabled || !p.view) {
      for (const id of accountIds) out.push(ungatedRow(p, id, "not gated — this project is disabled"));
      continue;
    }

    for (const a of p.view.accounts) out.push(allocRow(p.id, a));
    // Accounts named in config but skipped by the view: the account is off.
    for (const id of accountIds) {
      if (p.view.accounts.some((a) => a.accountId === id)) continue;
      out.push(ungatedRow(p, id, "the account is disabled, so this pairing is not gated"));
    }
  }
  $("#alloc-body").innerHTML = out.join("") ||
    '<tr><td colspan="9" class="empty">No projects yet. Add one below to start allocating.</td></tr>';
}

/** A pairing the gate has no opinion about, but whose weight is still editable:
    the weight is what makes it gateable again, so it must show the real one. */
function ungatedRow(p, accountId, why) {
  const weight = (p.cfg.accounts[accountId] || {}).weekly_share;
  return '<tr><td class="acct-cell">' + esc(accountId) + '</td>' + weightCell(p.id, accountId, weight) +
    '<td colspan="7" class="empty" style="padding:8px 10px">' + esc(why) + '</td></tr>';
}

function weightCell(projectId, accountId, weight) {
  return '<td class="n"><input type="number" min="0" step="0.05" value="' + (weight == null ? 1 : weight) +
    '" data-act="weight" data-project="' + esc(projectId) + '" data-account="' + esc(accountId) +
    '" aria-label="weight for ' + esc(projectId) + ' on ' + esc(accountId) + '"></td>';
}

function allocRow(projectId, a) {
  // over and pace are the gate's own, never recomputed. Only the phrasing
  // is ours: "under" is the one genuinely comfortable state, and "on pace"
  // means within a rounding of the allowance — the last moment before refusal.
  const under = !a.over && a.pace.indexOf("under") === 0;
  const paceTone = a.over ? "bad" : under ? "ok" : "warn";
  const paceMk = a.over ? UP : under ? DOWN : LEVEL;

  // Where it lands at this rate. Mirrors projectedFinish() in the allocator,
  // including its refusal to extrapolate from an elapsed fraction near zero.
  const elapsed = a.elapsedPct / 100;
  const projected = elapsed > 0.01 ? a.used / elapsed : null;

  // A share of 0 is a positive statement — this project may never use this
  // account — so a pace bar, an allowance and a projection are all answers to a
  // question nobody asked. The verdict is the whole of it.
  const middle = a.alloc <= 0
    ? '<td colspan="4" class="empty" style="padding:8px 10px">no allocation — a weight of 0 says this project may never use this account</td>'
    : '<td style="min-width:190px">' + meter({
        v: a.used / a.alloc,
        hand: a.allowance / a.alloc,
        over: a.over,
        spill: a.used > a.alloc,
        label: pts(a.used) + " of " + pts(a.alloc) + " points allocated used; the clock permits " +
               pts(a.allowance) + " by now",
      }) + '</td>' +
      '<td class="n">' + pts(a.used) + ' / ' + pts(a.allowance) +
        '<div class="sub">of ' + pts(a.alloc) + ' alloc</div></td>' +
      '<td class="n">' + pill(paceTone, paceMk, a.pace, "as the gate sees it") + '</td>' +
      '<td class="n hide-sm">' + (projected == null ? "—" : pts(projected) +
        '<div class="sub">' + (projected / a.alloc * 100).toFixed(0) + '% of alloc</div>') + '</td>';

  return '<tr>' +
    '<td class="acct-cell">' + esc(a.accountId) + '</td>' +
    weightCell(projectId, a.accountId, a.weight) +
    '<td class="n hide-sm">' + pct(a.sharePct) + '</td>' +
    middle +
    '<td class="n">' + verdictPill(a.verdict, a.retryAfterSec) + '</td>' +
    '<td class="n"><button class="quiet" data-act="why" data-project="' + esc(projectId) + '" data-account="' + esc(a.accountId) + '"' +
      (panels.why && panels.why.project === projectId && panels.why.account === a.accountId ? ' aria-expanded="true"' : "") +
      '>why</button>' +
      '<button class="quiet danger" data-act="revoke" data-project="' + esc(projectId) + '" data-account="' + esc(a.accountId) +
      '" title="stop this project from using this account at all">×</button></td>' +
  '</tr>' + whyRow(projectId, a.accountId);
}

/** The decision, in full, from the gate that made it. */
function whyRow(projectId, accountId) {
  if (!panels.why || panels.why.project !== projectId || panels.why.account !== accountId) return "";
  const d = panels.whyData;
  if (!d) return '<tr class="why"><td colspan="9" class="empty">asking the gate…</td></tr>';
  const v = VERDICTS[d.verdict] || VERDICTS.go;
  return '<tr class="why t-' + v.tone + '"><td colspan="9"><div class="why-in">' +
    '<div class="why-head">' + verdictPill(d.verdict, d.retryAfterSec) +
      '<span class="why-sum">' + esc(d.summary) + '</span>' +
      '<span class="spacer"></span>' +
      '<button class="quiet" data-act="why-close">close</button></div>' +
    (d.detail && d.detail.length ? '<pre>' + esc(d.detail.join("\n")) + '</pre>' : "") +
    (d.remedies && d.remedies.length ? '<ul>' + d.remedies.map((r) => '<li>' + esc(r) + '</li>').join("") + '</ul>' : "") +
    '<div class="rulings">decided by <b>' + esc(d.policy) + '</b> — every policy ruled, the worst verdict won:' +
      (d.rulings || []).map((r) => '<div>' + esc(r.verdict) + "  " + esc(r.policy) + " · " + esc(r.summary) + '</div>').join("") +
    '</div></div></td></tr>';
}

function renderClaims() {
  const host = $("#claims");
  if (!DATA.claims.length) {
    host.innerHTML = '<div class="empty">Nothing is holding capacity. A claim is opened by <code>overton claim</code> or <code>overton run</code>, and reaped if its heartbeat goes quiet for ' + esc(dur(DATA.meta.claimLeaseSec)) + '.</div>';
    return;
  }
  const lease = DATA.meta.claimLeaseSec;
  const t = now();
  host.innerHTML = '<div class="tablewrap" tabindex="0" role="group" aria-label="open claims"><table class="grid"><thead><tr>' +
    '<th>Project</th><th>Account</th><th class="n">Age</th><th class="n">Last beat</th><th>Label</th><th class="n hide-sm">PID</th>' +
    '</tr></thead><tbody>' +
    DATA.claims.map((c) => {
      const beat = t - c.heartbeatAt;
      // Reaping is the daemon's job; showing how close a claim is to it turns a
      // fleet that died quietly into something visible before capacity idles.
      const tone = beat >= lease ? "bad" : beat > lease / 2 ? "warn" : "ok";
      const mk = beat >= lease ? "×" : beat > lease / 2 ? "~" : "✓";
      return '<tr><td class="mono">' + esc(c.projectId) + '</td>' +
        '<td class="mono">' + esc(c.accountId) + '</td>' +
        '<td class="n">' + dur(t - c.openedAt) + '</td>' +
        '<td class="n">' + pill(tone, mk, dur(beat) + " ago", beat >= lease ? "past its lease — due to be reaped" : "heartbeat") + '</td>' +
        '<td class="mono">' + esc(c.label || "—") + '</td>' +
        '<td class="n hide-sm">' + (c.pid == null ? "—" : c.pid) + '</td></tr>';
    }).join("") + '</tbody></table></div>';
}

/** Rebuilt only when the set of accounts changes, so a poll never clobbers a
    number someone is halfway through typing. */
function renderAddWeights() {
  const cfg = DATA.config.accounts || {};
  const ids = Object.keys(cfg).filter((id) => cfg[id].enabled !== false);
  const host = $("#add-weights");
  const key = ids.join("\u0000");
  if (host.dataset.key === key) return;
  host.dataset.key = key;
  host.innerHTML = ids.length
    ? ids.map((id) =>
        '<div><label for="w-' + esc(id) + '">' + esc(id) + '</label>' +
        '<input type="number" min="0" step="0.05" value="0" id="w-' + esc(id) + '" data-add-account="' + esc(id) + '"></div>').join("")
    : '<div class="empty" style="padding:0">No enabled accounts. Add one to <code>config.yaml</code> first.</div>';
}

function renderStamp() {
  const at = new Date(lastGood).toLocaleTimeString();
  const bits = [];
  if (!live) bits.push(pill("bad", "×", "not answering", "the last refresh failed — these numbers are from " + at));
  bits.push('<span class="stamp">' + (live ? "updated " + esc(at) + " · auto 30s" : "last good " + esc(at)) + '</span>');
  // A browser clock well out from the daemon's makes every age on the page a
  // small lie, so say so rather than quietly rendering it.
  if (Math.abs(clockSkew) > 60) {
    bits.push(pill("warn", "!", "clock skew " + dur(Math.abs(clockSkew)), "this browser's clock differs from the daemon's; ages use the daemon's"));
  }
  $("#stamp-host").innerHTML = bits.join(" ");
}

function renderFoot() {
  $("#foot").innerHTML =
    'Policy chain <span class="chain">' + esc((DATA.meta.chain || []).join("  →  ")) + '</span>. ' +
    'Every policy rules on every request and the worst verdict wins, so the chain’s order decides only which refusal is reported. ' +
    'Pacing allows a floor of ' + Math.round((DATA.meta.floorPct || 0) * 100) + '% of alloc at a window boundary and ' +
    Math.round((DATA.meta.slackPct || 0) * 100) + '% slack above the paced line.';
}

function render() {
  renderStamp();
  renderTiles();
  renderAttention();
  renderAccounts();
  // Never rebuild the table under someone's cursor: a 30-second poll landing
  // mid-edit would throw away the weight they were typing.
  if (!editingAlloc()) renderAlloc();
  renderClaims();
  renderAddWeights();
  renderFoot();
}

function editingAlloc() {
  const el = document.activeElement;
  return !!(el && el.tagName === "INPUT" && el.closest && el.closest("#alloc"));
}

// ---------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------

/** The API reports the normalised share; the weight is what a person edits. */
function withWeights(projects) {
  const cfg = DATA.config.projects || {};
  return projects.map((p) => ({
    ...p,
    accounts: p.accounts.map((a) => ({
      ...a,
      weight: ((cfg[p.projectId] || {}).accounts || {})[a.accountId]?.weekly_share ?? 1,
    })),
  }));
}

/* Config is re-read every poll, not only after an edit: config.yaml is
   hand-edited too, and a deck showing weights the file no longer has is the
   instrument disagreeing with the thing it controls. */
async function refresh(loud) {
  try {
    const [accounts, projects, claims, config, health] = await Promise.all([
      getJson("/v1/accounts"), getJson("/v1/projects"), getJson("/v1/claims"),
      getJson("/v1/config"), getJson("/v1/health"),
    ]);
    clockSkew = health.now - Math.floor(Date.now() / 1000);
    DATA = {
      ...DATA, accounts, claims, config,
      meta: { ...DATA.meta, chain: health.policies || DATA.meta.chain, now: health.now },
    };
    DATA.projects = withWeights(projects);
    lastGood = Date.now();
    live = true;
    if (loud) flash("Refreshed");
  } catch (err) {
    live = false;
    flash(err.message, true);
  }
  await Promise.all(Object.keys(panels.ledger).map(loadLedger));
  render();
}

async function loadLedger(accountId) {
  try {
    ledgers[accountId] = await getJson("/v1/ledger?account=" + encodeURIComponent(accountId));
  } catch (err) {
    delete ledgers[accountId];
  }
}

/* /v1/ask RECORDS the decision it makes, which is why this is on a click and
   not on the poll: the decisions table is the audit trail for "why did it
   refuse at 03:00", and filling it with a deck idling in a background tab would
   bury the answer. One row per deliberate question is a fair price for the only
   honest source of a reason. */
async function loadWhy(project, account) {
  panels.why = { project, account };
  panels.whyData = null;
  render();
  try {
    panels.whyData = await getJson("/v1/ask?project=" + encodeURIComponent(project) + "&account=" + encodeURIComponent(account));
  } catch (err) {
    panels.why = null;
    flash(err.message, true);
  }
  render();
}

async function afterEdit(msg) {
  DATA.config = await getJson("/v1/config");
  await refresh();
  flash(msg);
}

// ---------------------------------------------------------------------------
// interaction
// ---------------------------------------------------------------------------

document.addEventListener("change", async (e) => {
  const el = e.target.closest ? e.target.closest("[data-act=weight]") : null;
  if (!el) return;
  const weight = Number(el.value);
  const { project, account } = el.dataset;
  try {
    await api("PUT", "/v1/config/projects/" + encodeURIComponent(project) + "/accounts/" + encodeURIComponent(account), { weight });
    await afterEdit(project + " → " + weight + " on " + account);
  } catch (err) { flash(err.message, true); }
});

document.addEventListener("click", async (e) => {
  const el = e.target.closest ? e.target.closest("[data-act]") : null;
  if (!el) return;
  const { act, project, account } = el.dataset;
  try {
    if (act === "refresh") return void refresh(true);

    if (act === "rm") {
      if (!confirm("Remove project " + project + "?\n\nIts allocation goes back to the other projects naming the same accounts.")) return;
      await api("DELETE", "/v1/config/projects/" + encodeURIComponent(project));
      return void afterEdit("Removed " + project);
    }

    if (act === "toggle") {
      const to = el.dataset.to === "1";
      await api("PATCH", "/v1/config/projects/" + encodeURIComponent(project), { enabled: to });
      return void afterEdit((to ? "Enabled " : "Disabled ") + project);
    }

    if (act === "revoke") {
      if (!confirm("Stop " + project + " from using " + account + "?\n\nIt keeps its weights on other accounts.")) return;
      await api("DELETE", "/v1/config/projects/" + encodeURIComponent(project) + "/accounts/" + encodeURIComponent(account));
      return void afterEdit(project + " may no longer use " + account);
    }

    if (act === "ledger") {
      if (panels.ledger[account]) { delete panels.ledger[account]; delete ledgers[account]; render(); return; }
      panels.ledger[account] = true;
      render();
      await loadLedger(account);
      return void render();
    }

    if (act === "why") return void loadWhy(project, account);
    if (act === "why-close") { panels.why = null; panels.whyData = null; return void render(); }
  } catch (err) { flash(err.message, true); }
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
    $("#add-id").value = ""; $("#add-roots").value = "";
    document.querySelectorAll("[data-add-account]").forEach((el) => (el.value = "0"));
    await afterEdit("Added " + id);
  } catch (err) { flash(err.message, true); }
});

// A background tab polling a loopback daemon forever is rude and pointless;
// coming back to a stale deck is worse, so it catches up on return instead.
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
timer = setInterval(() => { if (!document.hidden) refresh(); }, 30000);

clockSkew = DATA.meta.now - Math.floor(Date.now() / 1000);
render();
`;

export function renderPage(o: Overton): string {
  const accounts = accountViews(o);
  const projects = projectViews(o);

  const data = JSON.stringify({
    accounts,
    projects: projects.map((p) => ({
      ...p,
      accounts: p.accounts.map((a) => ({
        ...a,
        weight: o.cfg.projects[p.projectId]?.accounts[a.accountId]?.weekly_share ?? 1,
      })),
    })),
    config: { projects: o.cfg.projects, accounts: o.cfg.accounts },
    claims: openClaims(o.db),
    meta: {
      chain: o.cfg.policy.chain,
      claimLeaseSec: o.cfg.policy.claim_lease_sec,
      floorPct: o.cfg.policy.weekly.floor_pct,
      slackPct: o.cfg.policy.weekly.slack_pct,
      // The daemon's clock, so ages on the page do not inherit a skewed browser.
      now: o.clock(),
    },
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
  <header>
    <div class="mast">
      <h1 class="mark">overton</h1>
      <span class="tag">the range of dispatches currently acceptable</span>
      <span class="mast-r"><span id="stamp-host"></span><button id="refresh" data-act="refresh" type="button">Refresh</button></span>
    </div>
    <div class="mast-sub">${escapeHtml(o.configFile ?? "started without a config file — editing is refused rather than guessed")}</div>
  </header>

  <noscript><p class="note">This deck renders in the browser. Without JavaScript, use <code>overton status</code>, or the JSON at <code>/v1/accounts</code> and <code>/v1/projects</code>.</p></noscript>

  <main>
  <section aria-labelledby="h-now">
    <h2 id="h-now">Right now</h2>
    <div class="tiles" id="tiles"></div>
    <div id="attention"></div>
  </section>

  <section aria-labelledby="h-accounts">
    <h2 id="h-accounts">Accounts <span class="h2-note">used against elapsed — the hand is the clock</span></h2>
    <div class="cards" id="accounts"></div>
    <p class="note">
      A reading is only usable while it is <code>ok</code> or <code>stale</code>; <code>expired</code> and
      <code>unknown</code> cannot gate at all, and a degraded reading may only ever tighten a gate. The dotted
      tick is the account-wide stop, which no project's share can spend past. The 5-hour window is
      <code>burst</code> by default — a flat ceiling rather than a paced one — because it refills several times a day.
    </p>
  </section>

  <section aria-labelledby="h-alloc">
    <h2 id="h-alloc">Allocation <span class="h2-note">the 7-day window</span></h2>
    <div class="panel">
      <div class="tablewrap">
        <table class="grid" id="alloc">
          <thead><tr>
            <th>Account</th>
            <th class="n">Weight</th>
            <th class="n hide-sm">Share</th>
            <th>Used against the clock</th>
            <th class="n">Used / allowed</th>
            <th class="n">Pace</th>
            <th class="n hide-sm">At this rate</th>
            <th class="n">Verdict</th>
            <th class="n"><span class="sub">actions</span></th>
          </tr></thead>
          <tbody id="alloc-body"></tbody>
        </table>
      </div>
    </div>
    <div class="legend">
      <span class="item t-ok"><span class="mk">&#x2713;</span> go — dispatch</span>
      <span class="item t-warn"><span class="mk">~</span> wait — time fixes this</span>
      <span class="item t-warn"><span class="mk">?</span> ask — a human fixes this</span>
      <span class="item t-bad"><span class="mk">&#xd7;</span> deny — policy fixes this, never retry</span>
    </div>
    <p class="note">
      Weights are relative: raising one lowers everyone else's share, because the total always divides the
      account's dispatchable points. The verdict is the whole policy chain, so a pairing can be on pace and
      still refused — ask <em>why</em> for the decision itself.
    </p>
  </section>

  <section aria-labelledby="h-claims">
    <h2 id="h-claims">Holding capacity</h2>
    <div class="panel" id="claims"></div>
  </section>

  <section aria-labelledby="h-add">
    <h2 id="h-add">Add a project</h2>
    <form class="panel" id="add-form">
      <div class="add">
        <div><label for="add-id">Name</label><input type="text" id="add-id" placeholder="sideproject" required></div>
        <div><label for="add-roots">Directories</label><input type="text" id="add-roots" placeholder="~/Projects/sideproject, ~/Projects/other"></div>
        <button type="submit" class="primary">Add project</button>
      </div>
      <div class="weights" id="add-weights"></div>
    </form>
    <p class="note">
      Directories decide attribution: work whose path sits under one of them is charged to this project, longest
      root first. An account left at 0 is simply not named, and a project may never spend on an account it does
      not name.
    </p>
  </section>
  </main>

  <footer class="foot" id="foot"></footer>
</div>
<div id="flash" role="status" aria-live="polite"></div>
<script>window.__OVERTON__ = ${data};</script>
<script>${SCRIPT}</script>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
