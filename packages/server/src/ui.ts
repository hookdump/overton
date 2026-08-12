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
table, input, .tile-v, .win-meta, .card-foot, .alert-what, .stamp, .sub,
.mix, .diff, .dial-v, .cap-key {
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
.add label, .dial label, .field label {
  display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .11em;
  color: var(--ink-2); margin-bottom: 4px;
}

/* THE SPLIT --------------------------------------------------------------- */
/* One panel per account, because the thing being divided is an account. A
   project-major table can show a share; it cannot show that the shares on one
   account are a single quantity being shared out, which is the fact the whole
   section exists to make obvious. */
.mixers { display: grid; gap: 12px; }
.mix { background: var(--panel); border: 1px solid var(--rule); border-radius: 4px; padding: 12px 14px 12px; }
.mix.flag { border-left: 3px solid var(--tone); padding-left: 12px; }
.mix-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.mix-name { font-family: var(--num); font-size: 14px; font-weight: 600; }
.mix-head .spacer { margin-left: auto; }
.mix-disp { font-family: var(--num); font-size: 11.5px; color: var(--ink-2); margin-top: 3px; }
.mix-disp b { color: var(--ink); font-size: 13px; }
.mix-note { color: var(--ink-3); font-size: 11.5px; margin: 7px 0 0; }

/* Where all hundred points of the week go, drawn at the same scale as the pace
   rule above it: the projects' slices, the capacity held back for a person, and
   the headroom above the account's own stop that nobody may spend. */
.cap {
  display: flex; height: 18px; margin: 10px 0 5px; overflow: hidden;
  background: var(--track); border: 1px solid var(--rule); border-radius: 2px;
}
/* The 2px divider is what actually separates one slice from the next, and it is
   panel against accent, so the boundary survives any hue. The alternating tint
   is a nicety on top of it, and which slice belongs to which project is answered
   by lighting it from the row — never by asking anyone to match two colours. */
.seg { flex: 0 0 auto; min-width: 0; box-shadow: inset -2px 0 0 var(--panel); }
.seg:last-child { box-shadow: none; }
.seg.p { background: var(--accent); }
.seg.alt { background: var(--accent); background: color-mix(in srgb, var(--accent) 45%, var(--panel)); }
.seg.res {
  background: var(--panel-2);
  background-image: repeating-linear-gradient(135deg, var(--tick) 0 3px, transparent 3px 7px);
}
/* Dispatchable and claimed by nobody. Only ever wide when no project names the
   account or every one of them is at 0, and in both cases it must not look like
   the headroom above the stop — those are opposite facts. */
.seg.free { background: var(--track); box-shadow: inset 0 0 0 1px var(--mute-line), inset -2px 0 0 var(--panel); }
.seg.head { background: var(--track); }
.seg.lit { outline: 2px solid var(--clock); outline-offset: -2px; }
.cap-key { display: flex; flex-wrap: wrap; gap: 2px 15px; font-size: 11px; color: var(--ink-2); }
.cap-key i {
  display: inline-block; width: 9px; height: 9px; margin-right: 5px; vertical-align: -1px;
  border: 1px solid var(--rule); border-radius: 1px; font-style: normal;
}
.cap-key i.k-p { background: var(--accent); }
.cap-key i.k-res {
  background: var(--panel-2);
  background-image: repeating-linear-gradient(135deg, var(--tick) 0 3px, transparent 3px 7px);
}
.cap-key i.k-head { background: var(--track); }
.cap-key i.k-free { background: var(--track); box-shadow: inset 0 0 0 1px var(--mute-line); }

.dials {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px 20px;
  margin-top: 10px; padding: 10px 0; border-top: 1px solid var(--rule-2); border-bottom: 1px solid var(--rule-2);
}
.dial-in { display: flex; align-items: center; gap: 10px; }
.dial-v { font-family: var(--num); font-size: 12px; min-width: 3.6em; text-align: right; }
.dial-why { font-size: 11px; color: var(--ink-3); margin-top: 3px; }

.mixrow {
  display: grid; grid-template-columns: minmax(110px, 1.05fr) minmax(120px, 2.3fr) auto auto;
  gap: 3px 12px; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--rule-2);
}
.mixrow:last-of-type { border-bottom: 0; }
.mixrow-name { font-size: 12.5px; overflow-wrap: anywhere; display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; }
.mixrow-name b { font-family: var(--num); font-weight: 600; }
.mixrow-num { font-family: var(--num); font-size: 12px; text-align: right; white-space: nowrap; min-width: 6.6em; }
.mixrow-num b { font-size: 13px; font-weight: 600; }
.mixrow-num .sub { display: block; }
/* A zero is a denial somebody typed, not a very small share, and the gate
   answers "deny" for it. It gets the word and the tone that says so. */
.mixrow.zero .mixrow-num b { color: var(--bad); }
.mixrow.gone { opacity: .6; }
.mixrow.gone .mixrow-name b { text-decoration: line-through; }
.mix-more { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; padding-top: 9px; font-size: 11.5px; color: var(--ink-3); }

input[type=range] {
  -webkit-appearance: none; appearance: none; -moz-appearance: none;
  width: 100%; height: 20px; margin: 0; padding: 0; background: transparent; cursor: pointer;
  accent-color: var(--accent);
}
/* The filled portion is a gradient driven by --v, and --v is written in the one
   place that writes .value, so the paint and the number beside it cannot drift. */
input[type=range]::-webkit-slider-runnable-track {
  height: 6px; border-radius: 3px; border: 1px solid var(--rule);
  background: linear-gradient(90deg,
    var(--accent) 0 calc(var(--v, 0) * 100%), var(--track) calc(var(--v, 0) * 100%) 100%);
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 15px; height: 15px; margin-top: -5.5px; border-radius: 50%;
  background: var(--panel); border: 2px solid var(--accent);
}
input[type=range]::-moz-range-track { height: 6px; border-radius: 3px; border: 1px solid var(--rule); background: var(--track); }
input[type=range]::-moz-range-progress { height: 6px; border-radius: 3px 0 0 3px; background: var(--accent); }
input[type=range]::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: var(--panel); border: 2px solid var(--accent); }
input[type=range]:disabled { cursor: not-allowed; opacity: .5; }

/* Nothing is written until this appears and someone reads it. */
.pending {
  margin-top: 11px; padding: 9px 11px; border-radius: 3px;
  border: 1px solid var(--warn-line); background: var(--warn-bg);
}
.pending-h { font-size: 11.5px; color: var(--warn); font-weight: 600; }
.pending-w { font-size: 11.5px; color: var(--ink-2); margin-top: 3px; }
.diff { font-size: 11.5px; color: var(--ink-2); margin-top: 6px; }
.diff div { display: flex; align-items: baseline; gap: 8px; padding: 1px 0; }
.diff .who { min-width: 11ch; color: var(--ink); }
.diff .mk { color: var(--ink-3); }
.diff b { color: var(--ink); font-weight: 600; }
.pending-act { display: flex; gap: 8px; margin-top: 9px; align-items: center; flex-wrap: wrap; }

.field { padding: 9px 0 2px; }
.field-in { display: flex; gap: 8px; align-items: center; }
.grp .field label { margin-bottom: 3px; }

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
  /* The slider needs a whole line before it needs a neighbour: a 90px track is
     not a control anyone can aim at. */
  .mixrow { grid-template-columns: minmax(0, 1fr) auto auto; }
  .mixrow-slider { grid-column: 1 / -1; order: 3; }
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

  // A project can be perfectly configured, gate green on every pairing, and
  // still be incapable of spending a point — no roots means nothing is ever
  // attributed to it, no account means it can never dispatch. Neither shows up
  // as a verdict, because neither produces a pairing to rule on, so both would
  // be invisible on a page built only from decisions.
  for (const [id, p] of Object.entries(DATA.config.projects || {})) {
    if (p.enabled === false) continue;
    if (!(p.roots || []).length) {
      rows.push({
        sev: 2, tone: "warn", mk: "?", who: esc(id), lead: "no roots",
        what: "no directory is declared, so no work will ever be attributed to it",
        act: '<button class="quiet" data-act="focus-roots" data-project="' + esc(id) + '">set directories</button>',
      });
    }
    if (!Object.keys(p.accounts || {}).length) {
      rows.push({
        sev: 2, tone: "warn", mk: "?", who: esc(id), lead: "names no account",
        what: "it can never dispatch anywhere until it has a share of one",
        act: '<button class="quiet" data-act="goto-split">give it a share</button>',
      });
    }
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

// ---------------------------------------------------------------------------
// the split: one account, divided
// ---------------------------------------------------------------------------

/**
 * Mirrors normalisedShare() in the core, weekly window only.
 *
 * A weight over the sum of the weights of every ENABLED project naming the
 * account. Disabled projects hold a weight but do not compete, so counting them
 * would dilute everyone against a project that cannot spend a point.
 *
 * This is the only place the deck divides anything. It is deliberately NOT the
 * same code path as the allocation table, which prints the gate's own sharePct:
 * if the two ever disagree, the disagreement is a real bug and should be
 * visible on the page rather than hidden by a shared function.
 */
function weightsOn(accountId) {
  const out = {};
  const cfg = DATA.config.projects || {};
  for (const id of Object.keys(cfg)) {
    const p = cfg[id] || {};
    if (p.enabled === false) continue;
    const pa = (p.accounts || {})[accountId];
    if (!pa) continue;
    out[id] = pa.weekly_share == null ? 1 : pa.weekly_share;
  }
  return out;
}

/** Weights to percentages. A total of zero is not a division by zero: it is
    every project denied, which is exactly what the allocator returns for it. */
function normalise(weights) {
  let total = 0;
  for (const id of Object.keys(weights)) total += weights[id];
  const out = {};
  for (const id of Object.keys(weights)) out[id] = total > 0 ? (weights[id] / total) * 100 : 0;
  return out;
}

function cfgNum(o, k, dflt) { const v = o[k]; return typeof v === "number" && isFinite(v) ? v : dflt; }

/** dispatchablePool(): the account's own stop, less what is held back for a person. */
function poolOf(target, reserve) { return Math.max(0, target - reserve); }

/** Integers summing to exactly the requested total, by largest remainder. */
function distribute(exact, total) {
  const ids = Object.keys(exact);
  const out = {}, rem = [];
  let sum = 0;
  for (const id of ids) {
    const f = Math.floor(exact[id]);
    out[id] = f; sum += f; rem.push([id, exact[id] - f]);
  }
  rem.sort((a, b) => b[1] - a[1]);
  for (let i = 0; sum < total && rem.length; i++) { out[rem[i % rem.length][0]] += 1; sum += 1; }
  return out;
}

/**
 * The current split as whole percentages that sum to 100.
 *
 * Whole percentages are what makes this panel honest: written back as weights
 * they sum to 100, so normalisation becomes the identity and the number someone
 * drags is the number they get. Anything else and the label and the allocation
 * drift apart, which is the entire class of bug this panel exists to end.
 */
function round100(exact) {
  const ids = Object.keys(exact);
  if (!ids.length) return {};
  let sum = 0;
  for (const id of ids) sum += exact[id];
  // Everyone at zero is a real, expressible state — nobody may spend here — and
  // must not be rounded into an allocation nobody asked for.
  if (sum <= 0) { const z = {}; for (const id of ids) z[id] = 0; return z; }
  const out = distribute(exact, 100);
  // A project with any weight at all keeps at least one point. Zero is a denial
  // somebody typed and the gate answers "deny" for it, so rounding a project
  // into one is precisely the silent starvation this panel is here to prevent.
  for (const id of ids) {
    if (out[id] !== 0 || exact[id] <= 0) continue;
    let big = null;
    for (const j of ids) if (out[j] > 1 && (big == null || out[j] > out[big])) big = j;
    if (big == null) break;
    out[big] -= 1; out[id] += 1;
  }
  return out;
}

/**
 * Move one slider; everybody else moves too.
 *
 * Weights are normalised, so what one project gains another loses — there is no
 * such thing as changing one share. The remainder is split in proportion to
 * what each project already had, and a project pinned at 0 stays at 0.
 */
function redistribute(vec, movedId, want) {
  const ids = Object.keys(vec);
  const others = ids.filter((i) => i !== movedId);
  let sumOthers = 0;
  for (const i of others) sumOthers += vec[i];
  if (sumOthers <= 0) {
    // Nobody else is competing, so normalisation hands this project the whole
    // pool whatever the slider says. Holding capacity back is the reserve's
    // job; a weight cannot express it.
    const out = {};
    for (const i of ids) out[i] = 0;
    out[movedId] = 100;
    return { vec: out, clamped: true };
  }
  const target = Math.max(0, Math.min(100, Math.round(want)));
  const scaled = {};
  for (const i of others) scaled[i] = (vec[i] * (100 - target)) / sumOthers;
  const out = distribute(scaled, 100 - target);
  out[movedId] = target;
  return { vec: out, clamped: false };
}

/* Drafts are INTENT, never config: nothing in this section touches the file
   until Apply, so a redistribution can be looked at before it happens rather
   than explained after it has. */
let drafts = {};

/** The set of projects competing on an account, as a key: if config changes
    under an open draft the draft describes a world that no longer exists. */
function sigOf(accountId) { return JSON.stringify(Object.keys(weightsOn(accountId)).sort()); }

function draftOf(accountId, create) {
  const d = drafts[accountId];
  if (d && d.sig !== sigOf(accountId)) delete drafts[accountId];
  if (drafts[accountId]) return drafts[accountId];
  if (!create) return null;
  drafts[accountId] = {
    sig: sigOf(accountId),
    shares: round100(normalise(weightsOn(accountId))),
    drop: {},
    target: null,
    reserve: null,
  };
  return drafts[accountId];
}

/** Everything one panel draws, committed and proposed side by side. */
function splitState(accountId) {
  const acfg = accountCfg(accountId);
  const av = DATA.accounts.find((x) => x.accountId === accountId) || null;
  const d = draftOf(accountId, false);
  const committed = normalise(weightsOn(accountId));
  const wasTarget = cfgNum(acfg, "weekly_target_pct", 85);
  const wasReserve = cfgNum(acfg, "interactive_reserve_pct", 0);
  const target = d && d.target != null ? d.target : wasTarget;
  // A reserve above the stop would leave a negative pool, which the allocator
  // clamps to zero — so the slider is clamped instead, where it can be seen.
  const reserve = Math.min(d && d.reserve != null ? d.reserve : wasReserve, target);
  return {
    acfg, av, d, committed,
    shares: d ? d.shares : round100(committed),
    target, reserve, pool: poolOf(target, reserve),
    wasTarget, wasReserve, wasPool: poolOf(wasTarget, wasReserve),
    // Points are only a real quantity where there is a window to spend them
    // from; on an unmetered or disabled account they would be arithmetic about
    // nothing.
    gated: !!av && av.enabled && av.metered,
  };
}

function verdictOf(projectId, accountId) {
  const p = DATA.projects.find((x) => x.projectId === projectId);
  if (!p) return null;
  return p.accounts.find((a) => a.accountId === accountId) || null;
}

function panelFor(accountId) {
  return Array.prototype.find.call(document.querySelectorAll("[data-mix]"), (el) => el.dataset.mix === accountId) || null;
}
function each(root, sel, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), fn); }

/** One decimal, but only where a decimal is saying something. */
function share1(v) {
  if (v == null || !isFinite(v)) return "—";
  return (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) + "%";
}

function renderSplit() {
  const ids = Object.keys(DATA.config.accounts || {});
  const host = $("#split");
  if (!ids.length) {
    host.innerHTML = '<div class="panel"><div class="empty">No accounts configured. Accounts are declared in <code>config.yaml</code>; there is nothing to divide until one exists.</div></div>';
    return;
  }
  host.innerHTML = ids.map(mixPanel).join("");
  for (const id of ids) paintSplit(id);
}

function mixPanel(accountId, idx) {
  const s = splitState(accountId);
  const st = s.av ? accountState(s.av) : { tone: "mute", mk: "?", text: "not configured", why: "" };
  const order = Object.keys(s.shares).sort((a, b) =>
    (s.committed[b] || 0) - (s.committed[a] || 0) || (a < b ? -1 : a > b ? 1 : 0));
  const dropped = s.d ? Object.keys(s.d.drop) : [];
  const cfgP = DATA.config.projects || {};
  const absent = Object.keys(cfgP).filter((p) =>
    cfgP[p].enabled !== false && !(p in s.shares) && dropped.indexOf(p) < 0);
  const parked = Object.keys(cfgP).filter((p) => cfgP[p].enabled === false && (cfgP[p].accounts || {})[accountId]);

  const segs = order.map((pid, i) =>
      '<span class="seg p' + (i % 2 ? " alt" : "") + '" data-seg-for="' + esc(pid) +
      '" title="' + esc(pid) + '"></span>').join("") +
    '<span class="seg free" data-seg-free title="dispatchable, and allocated to nobody"></span>' +
    '<span class="seg res" data-seg-res title="held back for your own interactive work"></span>' +
    '<span class="seg head" data-seg-head title="above the account stop — nobody spends here"></span>';

  const rows = order.length
    ? order.map((pid, i) => mixRow(s, accountId, pid, idx, i)).join("")
    : '<div class="empty" style="padding:12px 0 4px">No project names this account, so none of its capacity is allocated. Give one a share below.</div>';

  return '<article class="mix t-' + st.tone + (st.tone === "warn" || st.tone === "bad" ? " flag" : "") +
      '" data-mix="' + esc(accountId) + '" aria-labelledby="mx' + idx + '">' +
    '<div class="mix-head">' +
      '<span class="mix-name" id="mx' + idx + '">' + esc(accountId) + '</span>' +
      '<span class="chip">' + esc(s.acfg.provider || "?") + '</span>' +
      (s.av && s.av.plan ? '<span class="chip">' + esc(s.av.plan) + '</span>' : "") +
      '<span class="spacer"></span>' + pill(st.tone, st.mk, st.text, st.why) +
    '</div>' +
    '<div class="mix-disp"><b data-pool>—</b> <span data-pool-sub></span></div>' +
    '<div class="cap" role="img" data-cap aria-label="the split of this account">' + segs + '</div>' +
    '<div class="cap-key">' +
      '<span><i class="k-p"></i>allocated to projects</span>' +
      '<span><i class="k-res"></i>held back for you</span>' +
      '<span data-key-free hidden><i class="k-free"></i>allocated to nobody</span>' +
      '<span><i class="k-head"></i>above the account stop</span>' +
    '</div>' +
    dials(s, accountId, idx) +
    rows +
    dropped.map((pid) => goneRow(accountId, pid)).join("") +
    (absent.length
      ? '<div class="mix-more">not named here: ' + absent.map((p) =>
          '<button class="quiet" data-act="include" data-account="' + esc(accountId) + '" data-project="' + esc(p) +
          '" title="give ' + esc(p) + ' a share of this account">+ ' + esc(p) + '</button>').join(" ") + '</div>'
      : "") +
    (parked.length
      ? '<div class="mix-more">disabled, so not competing: ' + esc(parked.join(", ")) + '</div>'
      : "") +
    '<div data-pending></div>' +
  '</article>';
}

function dials(s, accountId, idx) {
  return '<div class="dials">' +
    '<div class="dial">' +
      '<label for="dt' + idx + '">Account stop · 7 days</label>' +
      '<div class="dial-in">' +
        '<input type="range" id="dt' + idx + '" min="0" max="100" step="1" data-act="target" data-account="' + esc(accountId) + '">' +
        '<span class="dial-v" data-target-v>—</span>' +
      '</div>' +
      '<div class="dial-why">No project may spend past this, whatever its share.</div>' +
    '</div>' +
    '<div class="dial">' +
      '<label for="dr' + idx + '">Held back for you</label>' +
      '<div class="dial-in">' +
        '<input type="range" id="dr' + idx + '" min="0" max="100" step="1" data-act="reserve" data-account="' + esc(accountId) + '">' +
        '<span class="dial-v" data-reserve-v>—</span>' +
      '</div>' +
      '<div class="dial-why">Never dispatchable to an agent. This is the only way to leave capacity unallocated — weights always divide the whole of what is left.</div>' +
    '</div>' +
  '</div>';
}

function mixRow(s, accountId, projectId, idx, i) {
  const v = verdictOf(projectId, accountId);
  const roots = ((DATA.config.projects || {})[projectId] || {}).roots || [];
  const zero = (s.shares[projectId] || 0) <= 0;
  return '<div class="mixrow' + (zero ? " zero" : "") + '" data-row-for="' + esc(projectId) + '">' +
    '<label class="mixrow-name" for="sl' + idx + '-' + i + '"><b>' + esc(projectId) + '</b>' +
      (roots.length ? "" : pill("warn", "?", "no roots", "nothing will ever be attributed to it, so its share cannot be spent")) +
      (v && v.verdict !== "go" ? verdictPill(v.verdict, v.retryAfterSec) : "") +
    '</label>' +
    '<div class="mixrow-slider">' +
      '<input type="range" id="sl' + idx + '-' + i + '" min="0" max="100" step="1" data-act="share" ' +
      'data-account="' + esc(accountId) + '" data-project="' + esc(projectId) + '"></div>' +
    '<div class="mixrow-num"><b data-pct-for="' + esc(projectId) + '">—</b>' +
      '<span class="sub" data-pts-for="' + esc(projectId) + '">—</span></div>' +
    '<div><button class="quiet danger" data-act="unname" data-account="' + esc(accountId) + '" data-project="' + esc(projectId) +
      '" title="take ' + esc(projectId) + ' off this account entirely">×</button></div>' +
  '</div>';
}

function goneRow(accountId, projectId) {
  return '<div class="mixrow gone"><span class="mixrow-name"><b>' + esc(projectId) + '</b></span>' +
    '<span class="sub">will be taken off this account</span>' +
    '<span class="mixrow-num">—</span>' +
    '<div><button class="quiet" data-act="keep" data-account="' + esc(accountId) + '" data-project="' + esc(projectId) + '">undo</button></div>' +
  '</div>';
}

/* value and --v are written together and nowhere else, so the fill painted
   behind the thumb and the number printed beside it cannot drift apart. */
function setSlider(el, v, max) {
  if (!el) return;
  const top = max == null ? Number(el.max) || 100 : max;
  if (max != null) el.max = String(max);
  if (Number(el.value) !== v) el.value = String(v);
  el.style.setProperty("--v", (top > 0 ? clamp01(v / top) : 0).toFixed(4));
}

/**
 * Repaint one panel's numbers in place.
 *
 * In place, and not by rebuilding the panel, because this runs on every pixel
 * of a drag: an innerHTML rewrite would take the focus off the slider under the
 * pointer and end the gesture.
 */
function paintSplit(accountId) {
  const panel = panelFor(accountId);
  if (!panel) return;
  const s = splitState(accountId);
  const shown = (pid) => (s.d ? s.shares[pid] : s.committed[pid]);
  const points = (pid) => s.pool * (shown(pid) || 0) / 100;

  each(panel, "[data-act=share]", (el) => {
    const pid = el.dataset.project;
    if (s.shares[pid] == null) return;
    setSlider(el, s.shares[pid]);
    // The spoken value is the printed value, to the same precision: two
    // readings of one number is two numbers.
    el.setAttribute("aria-valuetext", share1(shown(pid)) + " of " + accountId +
      (s.gated ? ", " + pts(points(pid)) + " points" : ", which is not gated"));
  });
  each(panel, "[data-pct-for]", (el) => {
    const pid = el.dataset.pctFor;
    el.textContent = s.d ? s.shares[pid] + "%" : share1(s.committed[pid]);
  });
  each(panel, "[data-pts-for]", (el) => {
    const pid = el.dataset.ptsFor;
    el.textContent = (shown(pid) || 0) <= 0 ? "denied"
      : s.gated ? pts(points(pid)) + " pts" : "not gated";
  });
  each(panel, "[data-row-for]", (el) => {
    el.classList.toggle("zero", (shown(el.dataset.rowFor) || 0) <= 0);
  });

  each(panel, "[data-seg-for]", (el) => {
    const w = s.pool * (shown(el.dataset.segFor) || 0) / 100;
    el.style.display = w > 0 ? "" : "none";
    el.style.flexBasis = w.toFixed(4) + "%";
  });
  // Whatever the projects did not take. Normalisation means this is zero
  // except when nobody is competing at all, which is precisely the state that
  // must not be mistaken for the headroom above the stop.
  let claimed = 0;
  for (const pid of Object.keys(s.shares)) claimed += s.pool * (shown(pid) || 0) / 100;
  const free = Math.max(0, s.pool - claimed);
  const freeSeg = panel.querySelector("[data-seg-free]");
  freeSeg.style.display = free > 0.001 ? "" : "none";
  freeSeg.style.flexBasis = free.toFixed(4) + "%";
  panel.querySelector("[data-key-free]").hidden = !(free > 0.001);

  const res = panel.querySelector("[data-seg-res]");
  res.style.display = s.reserve > 0 ? "" : "none";
  res.style.flexBasis = s.reserve.toFixed(4) + "%";
  const head = panel.querySelector("[data-seg-head]");
  const above = Math.max(0, 100 - s.target);
  head.style.display = above > 0 ? "" : "none";
  head.style.flexBasis = above.toFixed(4) + "%";
  const nprojects = Object.keys(s.shares).filter((pid) => (shown(pid) || 0) > 0).length;
  panel.querySelector("[data-cap]").setAttribute("aria-label",
    pts(s.pool) + " points to divide: " + pts(claimed) + " allocated across " +
    nprojects + (nprojects === 1 ? " project" : " projects") +
    (free > 0.001 ? ", " + pts(free) + " allocated to nobody" : "") +
    ", " + s.reserve + " points held back for interactive work, " +
    above + " points above the account stop");

  const tEl = panel.querySelector("[data-act=target]");
  setSlider(tEl, s.target, 100);
  tEl.setAttribute("aria-valuetext", s.target + "% of the plan window — the account stop");
  const rEl = panel.querySelector("[data-act=reserve]");
  setSlider(rEl, s.reserve, s.target || 100);
  rEl.setAttribute("aria-valuetext",
    s.reserve + "% held back, leaving " + (s.gated ? pts(s.pool) + " points" : s.pool + "%") + " to divide");
  panel.querySelector("[data-target-v]").textContent = s.target + "%";
  panel.querySelector("[data-reserve-v]").textContent = s.reserve + "%";
  panel.querySelector("[data-pool]").textContent = s.gated ? pts(s.pool) + " pts" : s.pool + "%";
  panel.querySelector("[data-pool-sub]").textContent =
    "to divide — the " + s.target + "% stop less the " + s.reserve + "% you keep" +
    (s.gated ? "" : " · this account is not gated, so the split has no effect today");

  panel.querySelector("[data-pending]").innerHTML = pendingBlock(accountId);
}

/**
 * The redistribution, before it happens.
 *
 * Someone once added a project at weight 2 and took another from 63% of an
 * account to 18% without a single number on the page moving to say so. This is
 * that number, for every project the edit touches, in the points the gate
 * actually compares against.
 */
function pendingBlock(accountId) {
  const s = splitState(accountId);
  if (!s.d) return "";
  const ids = Object.keys(s.shares).concat(Object.keys(s.d.drop))
    .sort((a, b) => (s.committed[b] || 0) - (s.committed[a] || 0) || (a < b ? -1 : a > b ? 1 : 0));
  const rows = [];
  for (const pid of ids) {
    const before = s.committed[pid] == null ? null : s.committed[pid];
    const after = s.d.drop[pid] ? null : s.shares[pid];
    const bp = before == null ? null : s.wasPool * before / 100;
    const ap = after == null ? null : s.pool * after / 100;
    if (before != null && after != null && Math.abs(before - after) < 0.05 && Math.abs((bp || 0) - (ap || 0)) < 0.05) continue;
    // The arrow follows the POINTS, not the percentage. Raising an account's
    // reserve leaves every share exactly where it was and still takes points
    // off everyone, and an arrow pointing up through that would be describing
    // the label rather than the consequence.
    const bcmp = s.gated ? bp : before, acmp = s.gated ? ap : after;
    const mk = after == null ? "×" : before == null ? "+"
      : acmp > bcmp + 0.005 ? UP : acmp < bcmp - 0.005 ? DOWN : LEVEL;
    rows.push('<div><span class="who">' + esc(pid) + '</span><span class="mk" aria-hidden="true">' + mk + '</span>' +
      '<span>' + (before == null ? "not named" : share1(before) + (s.gated ? " · " + pts(bp) + " pts" : "")) +
      ' → <b>' + (after == null ? "taken off this account"
        : after + "%" + (s.gated ? " · " + pts(ap) + " pts" : "") + (after <= 0 ? " · denied" : "")) + '</b></span></div>');
  }
  if (s.target !== s.wasTarget) {
    rows.push('<div><span class="who">account stop</span><span class="mk" aria-hidden="true">' +
      (s.target > s.wasTarget ? UP : DOWN) + '</span><span>' + s.wasTarget + '% → <b>' + s.target + '%</b></span></div>');
  }
  if (s.reserve !== s.wasReserve) {
    rows.push('<div><span class="who">held back</span><span class="mk" aria-hidden="true">' +
      (s.reserve > s.wasReserve ? UP : DOWN) + '</span><span>' + s.wasReserve + '% → <b>' + s.reserve +
      '%</b> · ' + pts(s.wasPool) + ' → ' + pts(s.pool) + ' pts to divide</span></div>');
  }
  if (!rows.length) return "";

  return '<div class="pending" role="group" aria-label="pending changes to ' + esc(accountId) + '">' +
    '<div class="pending-h">Not written yet — this is what applying would do</div>' +
    '<div class="pending-w">Shares are written back as whole percentages summing to 100, so the number on the slider is the share the gate uses.</div>' +
    '<div class="diff">' + rows.join("") + '</div>' +
    '<div class="pending-act">' +
      '<button class="primary" data-act="apply-split" data-account="' + esc(accountId) + '">Apply to ' + esc(accountId) + '</button>' +
      '<button data-act="cancel-split" data-account="' + esc(accountId) + '">Discard</button>' +
    '</div></div>';
}

/**
 * Write the draft.
 *
 * SEQUENTIALLY, and this is not a style choice: every config route re-reads
 * config.yaml, edits the document and saves the whole file, so two writes in
 * flight at once would have the second overwrite the first.
 */
async function applySplit(accountId) {
  const s = splitState(accountId);
  if (!s.d) return;
  const w = weightsOn(accountId);
  const writes = [];
  const patch = {};
  if (s.target !== s.wasTarget) patch.weekly_target_pct = s.target;
  if (s.reserve !== s.wasReserve) patch.interactive_reserve_pct = s.reserve;
  if (Object.keys(patch).length) writes.push(["PATCH", "/v1/config/accounts/" + encodeURIComponent(accountId), patch]);
  for (const pid of Object.keys(s.shares)) {
    if (w[pid] === s.shares[pid]) continue;
    writes.push(["PUT", "/v1/config/projects/" + encodeURIComponent(pid) + "/accounts/" + encodeURIComponent(accountId),
      { weight: s.shares[pid] }]);
  }
  for (const pid of Object.keys(s.d.drop)) {
    writes.push(["DELETE", "/v1/config/projects/" + encodeURIComponent(pid) + "/accounts/" + encodeURIComponent(accountId), null]);
  }
  if (!writes.length) { delete drafts[accountId]; render(); return; }

  let done = 0;
  try {
    for (const wr of writes) { await api(wr[0], wr[1], wr[2]); done += 1; }
    delete drafts[accountId];
    await afterEdit(accountId + " divided: " + writes.length + " change" + (writes.length === 1 ? "" : "s") + " written");
  } catch (err) {
    // Partly written is the honest report. The draft goes, because the config
    // it described is no longer the config on disk.
    delete drafts[accountId];
    await refresh();
    render();
    flash(done + " of " + writes.length + " changes were written, then: " + err.message, true);
  }
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
    const accountIds = Object.keys(p.cfg.accounts || {});
    // The two ways a project can exist and still be incapable of anything. Both
    // are silent in the config file and both look exactly like a working
    // project from every other angle, so they are said out loud here.
    const broken =
      (roots.length ? "" : pill("warn", "?", "no roots", "no directory is declared, so no work can ever be attributed to it — its share cannot be spent")) +
      (accountIds.length ? "" : pill("warn", "?", "no account", "it names no account, so it can never dispatch anywhere"));
    out.push('<tr class="grp"><th colspan="9" scope="rowgroup"><div class="grp-in">' +
      '<span class="grp-name">' + esc(p.id) + '</span>' +
      (p.enabled ? "" : pill("mute", "×", "disabled", "not allocated, and its weights do not dilute anyone else's share")) +
      broken +
      '<span class="spacer"></span>' +
      '<button class="quiet" data-act="toggle" data-project="' + esc(p.id) + '" data-to="' + (p.enabled ? "0" : "1") + '">' +
        (p.enabled ? "disable" : "enable") + '</button>' +
      '<button class="quiet danger" data-act="rm" data-project="' + esc(p.id) + '">remove</button>' +
      '</div>' + rootsField(p.id, roots) + '</th></tr>');

    if (!p.view && !accountIds.length) {
      out.push('<tr><td colspan="9" class="empty">No account named, so this project may not spend anywhere. ' +
        '<button class="quiet" data-act="goto-split">give it a share of an account</button></td></tr>');
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

/**
 * Directories, editable where they are read.
 *
 * A project whose roots are wrong is a project nothing is charged to, and until
 * now the only cure was the CLI — the deck could show the fault and not fix it,
 * which is the worst of both. Committed on Enter or on "save", never on blur:
 * a path is too easy to lose to a stray click somewhere else on the page.
 */
function rootsField(projectId, roots) {
  const v = roots.join(", ");
  return '<div class="field"><label for="rt-' + esc(projectId) + '">Directories — work under these is charged here, longest root first</label>' +
    '<div class="field-in">' +
      '<input type="text" id="rt-' + esc(projectId) + '" value="' + esc(v) + '" data-act="roots" data-project="' + esc(projectId) +
      '" data-orig="' + esc(v) + '" placeholder="~/Projects/thing, ~/Work/other">' +
      '<button class="quiet" data-act="save-roots" data-project="' + esc(projectId) + '" disabled>save</button>' +
    '</div></div>';
}

/** A pairing the gate has no opinion about. The weight is still worth showing:
    it is what the pairing becomes the moment the account is enabled again. */
function ungatedRow(p, accountId, why) {
  const weight = (p.cfg.accounts[accountId] || {}).weekly_share;
  return '<tr><td class="acct-cell">' + esc(accountId) + '</td>' + weightCell(weight) +
    '<td colspan="7" class="empty" style="padding:8px 10px">' + esc(why) + '</td></tr>';
}

/* Read-only, and labelled as a weight rather than left as a bare number. It is
   edited in The split, where the consequence of changing it — every other
   project on the account moving — can be seen while it is being decided. */
function weightCell(weight) {
  return '<td class="n">' + (weight == null ? 1 : weight) + '</td>';
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
    weightCell(a.weight) +
    '<td class="n hide-sm">' + share1(a.sharePct) + '</td>' +
    middle +
    '<td class="n">' + verdictPill(a.verdict, a.retryAfterSec) + '</td>' +
    '<td class="n"><button class="quiet" data-act="why" data-project="' + esc(projectId) + '" data-account="' + esc(a.accountId) + '"' +
      (panels.why && panels.why.project === projectId && panels.why.account === a.accountId ? ' aria-expanded="true"' : "") +
      '>why</button></td>' +
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

/**
 * The name field offers the projects that already exist, and the form's verb
 * changes to match what submitting will actually do.
 *
 * A form that can only ever ADD sends someone to the CLI the first time they
 * want to move a directory, which is exactly what happened. Typing a name that
 * exists updates that project instead of failing, and the button says so before
 * the submit rather than an error saying it afterwards.
 */
function renderProjectForm() {
  const ids = Object.keys(DATA.config.projects || {});
  const host = $("#project-names");
  const key = JSON.stringify(ids);
  if (host.dataset.key !== key) {
    host.dataset.key = key;
    host.innerHTML = ids.map((id) => '<option value="' + esc(id) + '"></option>').join("");
  }
  syncProjectForm();
}

function syncProjectForm() {
  const id = $("#add-id").value.trim();
  const existing = !!(DATA.config.projects || {})[id];
  $("#add-submit").textContent = existing ? "Update " + id : "Create project";
  $("#add-hint").textContent = existing
    ? "This project already exists — submitting rewrites its directories. Its shares are left alone; those are set in The split."
    : "Creates the project. Give it a share of an account in The split afterwards, or it can never dispatch anywhere.";
  // Prefilled from the project it names, but only for as long as nobody has
  // typed into the field themselves.
  const roots = $("#add-roots");
  if (existing && roots.dataset.auto !== "no") {
    roots.value = (((DATA.config.projects || {})[id] || {}).roots || []).join(", ");
    roots.dataset.auto = "yes";
  } else if (!existing && roots.dataset.auto === "yes") {
    roots.value = "";
    delete roots.dataset.auto;
  }
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
  // Never rebuild anything under someone's hand: a 30-second poll landing
  // mid-gesture would take the slider out from under the pointer, or throw away
  // the path they were halfway through typing. Drafts survive a rebuild — they
  // live in the draft table, not in the DOM — so this only has to protect the gesture.
  if (!busy("#split")) renderSplit();
  if (!busy("#alloc")) renderAlloc();
  renderClaims();
  renderProjectForm();
  renderFoot();
}

/* An INPUT specifically: a slider mid-drag or a path half typed is a gesture in
   progress. A focused BUTTON is not — and treating it as one would freeze the
   section that the button's own edit is supposed to redraw. */
function busy(sel) {
  const el = document.activeElement;
  return !!(el && el.tagName === "INPUT" && el.closest && el.closest(sel));
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

/* Sliders are read on the input event, not the change event, so the whole panel tracks the
   gesture rather than reporting afterwards what it did. Nothing here writes: it
   moves a draft, and a draft is intent. */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el || !el.dataset) return;
  const act = el.dataset.act;

  if (act === "share" || act === "reserve" || act === "target") {
    const accountId = el.dataset.account;
    const d = draftOf(accountId, true);
    if (act === "share") {
      const moved = redistribute(d.shares, el.dataset.project, Number(el.value));
      d.shares = moved.vec;
      if (moved.clamped) {
        flash("Every other project on " + accountId + " is at 0, so this one takes the whole pool whatever the slider says. " +
              "Capacity is held back with the reserve, not with a weight.", true);
      }
    } else if (act === "target") {
      d.target = Number(el.value);
      const reserve = d.reserve != null ? d.reserve : cfgNum(accountCfg(accountId), "interactive_reserve_pct", 0);
      if (reserve > d.target) d.reserve = d.target;
    } else {
      const target = d.target != null ? d.target : cfgNum(accountCfg(accountId), "weekly_target_pct", 85);
      d.reserve = Math.min(Number(el.value), target);
    }
    paintSplit(accountId);
    return;
  }

  // The save button stays inert until the path is actually different, so the button is
  // never a way to rewrite config.yaml with what it already says.
  if (act === "roots") {
    const btn = Array.prototype.find.call(
      document.querySelectorAll("[data-act=save-roots]"), (b) => b.dataset.project === el.dataset.project);
    if (btn) btn.disabled = el.value === el.dataset.orig;
    return;
  }

  if (el.id === "add-id") { syncProjectForm(); return; }
  if (el.id === "add-roots") { el.dataset.auto = "no"; }
});

/* Which slice of the bar is which project, answered by pointing at the project
   rather than by asking anyone to match two shades of the same blue. */
function lightSeg(e, on) {
  const row = e.target && e.target.closest ? e.target.closest("[data-row-for]") : null;
  const panel = row && row.closest("[data-mix]");
  if (!panel) return;
  each(panel, "[data-seg-for]", (seg) => {
    if (seg.dataset.segFor === row.dataset.rowFor) seg.classList.toggle("lit", on);
  });
}
document.addEventListener("pointerover", (e) => lightSeg(e, true));
document.addEventListener("pointerout", (e) => lightSeg(e, false));
document.addEventListener("focusin", (e) => lightSeg(e, true));
document.addEventListener("focusout", (e) => lightSeg(e, false));

/* A path is committed deliberately, never on blur: leaving a field is not a
   statement about the field. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const el = e.target;
  if (!el || !el.dataset || el.dataset.act !== "roots") return;
  e.preventDefault();
  saveRoots(el.dataset.project, el.value);
});

async function saveRoots(projectId, value) {
  const roots = value.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    await api("PATCH", "/v1/config/projects/" + encodeURIComponent(projectId), { roots });
    // The field keeps the focus — somebody editing a path is usually not done —
    // so the row is not rebuilt, and what it now considers unchanged is set here.
    const field = Array.prototype.find.call(
      document.querySelectorAll("[data-act=roots]"), (i) => i.dataset.project === projectId);
    if (field) {
      field.dataset.orig = field.value;
      const btn = Array.prototype.find.call(
        document.querySelectorAll("[data-act=save-roots]"), (b) => b.dataset.project === projectId);
      if (btn) btn.disabled = true;
    }
    await afterEdit(roots.length
      ? projectId + " is charged for work under " + roots.join(", ")
      : projectId + " now has no roots — nothing will be attributed to it");
  } catch (err) { flash(err.message, true); }
}

document.addEventListener("click", async (e) => {
  const el = e.target.closest ? e.target.closest("[data-act]") : null;
  if (!el) return;
  const { act, project, account } = el.dataset;
  try {
    if (act === "refresh") return void refresh(true);

    /* Removing a project deletes its directories, its weights and its whole row
       from config.yaml, and one has already been lost to a single click here.
       So the name must be typed: a confirm dialog gets answered reflexively, a
       name does not. */
    if (act === "rm") {
      const p = (DATA.config.projects || {})[project] || {};
      const named = Object.keys(p.accounts || {});
      const typed = prompt(
        "Remove the project \"" + project + "\" from config.yaml?\n\n" +
        "This deletes its directories and its weights on " + (named.length ? named.join(", ") : "no accounts") + ". " +
        "Every other project naming those accounts gets a larger share.\n\n" +
        "Type the project name to confirm:");
      if (typed == null) return;
      if (typed.trim() !== project) return void flash("Nothing removed \u2014 that is not the project name.", true);
      await api("DELETE", "/v1/config/projects/" + encodeURIComponent(project));
      return void afterEdit("Removed " + project);
    }

    if (act === "toggle") {
      const to = el.dataset.to === "1";
      if (!to && !confirm(
        "Disable " + project + "?\n\nIt stops dispatching, and because it stops competing for its accounts, every " +
        "other project on them immediately gets a larger share. Its weights are kept.")) return;
      await api("PATCH", "/v1/config/projects/" + encodeURIComponent(project), { enabled: to });
      return void afterEdit((to ? "Enabled " : "Disabled ") + project);
    }

    if (act === "save-roots") {
      const field = Array.prototype.find.call(
        document.querySelectorAll("[data-act=roots]"), (i) => i.dataset.project === project);
      if (field) await saveRoots(project, field.value);
      return;
    }

    // --- the split -------------------------------------------------------
    if (act === "include") {
      // At 0, which takes nothing from anyone until a decision is made about it.
      const d = draftOf(account, true);
      delete d.drop[project];
      d.shares[project] = 0;
      renderSplit();
      const panel = panelFor(account);
      const slider = panel && Array.prototype.find.call(
        panel.querySelectorAll("[data-act=share]"), (i) => i.dataset.project === project);
      if (slider) slider.focus();
      return;
    }

    if (act === "unname") {
      const d = draftOf(account, true);
      delete d.shares[project];
      d.drop[project] = true;
      // What it held goes back to the rest, in proportion — and only in the
      // draft. The diff underneath says so before Apply does it.
      d.shares = round100(normalise(d.shares));
      return void renderSplit();
    }

    if (act === "keep") {
      const d = draftOf(account, true);
      delete d.drop[project];
      d.shares[project] = 0;
      d.shares = round100(normalise(d.shares));
      return void renderSplit();
    }

    if (act === "apply-split") return void applySplit(account);
    if (act === "cancel-split") { delete drafts[account]; return void renderSplit(); }

    if (act === "goto-split") {
      $("#h-split").scrollIntoView({ behavior: prefersStill() ? "auto" : "smooth", block: "start" });
      return;
    }

    if (act === "focus-roots") {
      const field = Array.prototype.find.call(
        document.querySelectorAll("[data-act=roots]"), (i) => i.dataset.project === project);
      if (!field) return;
      field.scrollIntoView({ behavior: prefersStill() ? "auto" : "smooth", block: "center" });
      field.focus();
      field.select();
      return;
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

function prefersStill() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/**
 * One form, two verbs.
 *
 * POST /v1/config/projects refuses a name that already exists, which is right
 * of it — creating over a project is how configuration gets lost — but it is no
 * reason to make somebody open a terminal to move a directory. So the form
 * decides which request it is, and falls back if it guessed from a config that
 * changed underneath it a moment ago.
 */
$("#add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("#add-id").value.trim();
  const roots = $("#add-roots").value.split(",").map((s) => s.trim()).filter(Boolean);
  if (!id) return;
  const path = "/v1/config/projects/" + encodeURIComponent(id);
  try {
    if ((DATA.config.projects || {})[id]) {
      await api("PATCH", path, { roots });
    } else {
      try {
        await api("POST", "/v1/config/projects", { id, roots, accounts: {} });
      } catch (err) {
        if (String(err.message).indexOf("already exists") < 0) throw err;
        await api("PATCH", path, { roots });
      }
    }
    $("#add-id").value = "";
    $("#add-roots").value = "";
    delete $("#add-roots").dataset.auto;
    await afterEdit(id + " saved" + (roots.length ? "" : " \u2014 with no roots, nothing will be attributed to it"));
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

  <section aria-labelledby="h-split">
    <h2 id="h-split">The split <span class="h2-note">one account at a time — the 7-day window</span></h2>
    <div class="mixers" id="split"></div>
    <p class="note">
      Every account's week divides into three: what its projects may spend, what is <strong>held back for you</strong>,
      and the headroom above the account's own stop that nobody may touch. Weights are relative — they always divide
      the whole of what is left — so a slider going up is another one coming down, and the only way to leave capacity
      genuinely unallocated is to hold it back. A project at <code>0</code> is not a small share; it is a statement
      that it may never spend here, and the gate answers <code>deny</code>. Nothing is written to
      <code>config.yaml</code> until you apply it.
    </p>
  </section>

  <section aria-labelledby="h-alloc">
    <h2 id="h-alloc">Allocation <span class="h2-note">what the gate makes of it</span></h2>
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
      One group per project, so this is the other way round from <em>The split</em> above — and it is a readout,
      not a control: weights and shares are set there, where the redistribution they cause can be seen while it is
      being decided. The verdict is the whole policy chain, so a pairing can be on pace and still refused — ask
      <em>why</em> for the decision itself.
    </p>
  </section>

  <section aria-labelledby="h-claims">
    <h2 id="h-claims">Holding capacity</h2>
    <div class="panel" id="claims"></div>
  </section>

  <section aria-labelledby="h-add">
    <h2 id="h-add">Projects <span class="h2-note">a name and the directories it owns</span></h2>
    <form class="panel" id="add-form">
      <div class="add">
        <div>
          <label for="add-id">Name</label>
          <input type="text" id="add-id" placeholder="sideproject" list="project-names" autocomplete="off" required>
          <datalist id="project-names"></datalist>
        </div>
        <div>
          <label for="add-roots">Directories</label>
          <input type="text" id="add-roots" placeholder="~/Projects/sideproject, ~/Projects/other">
        </div>
        <button type="submit" class="primary" id="add-submit">Create project</button>
      </div>
      <p class="note" id="add-hint" style="padding: 0 14px 12px; margin: 0"></p>
    </form>
    <p class="note">
      Directories decide attribution: work whose path sits under one of them is charged to this project, longest
      root first. Naming a project that already exists updates it — the directories of every project are also
      editable in place, in the row above. Capacity is a separate question, and it is answered in <em>The split</em>.
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
