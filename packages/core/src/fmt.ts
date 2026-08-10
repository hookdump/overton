/**
 * Rendering shared by every surface.
 *
 * The trap this file exists to close: a DISPLAY tolerance is not the GATE's
 * threshold. The gate refuses at `used > allowance` with no tolerance at all. A
 * renderer that rounds 0.01 points away paints "on pace" over a project the
 * next request will be refused for — the instrument contradicting the thing it
 * measures. So the GATE decides the state; the tolerance decides only how the
 * NUMBER is phrased.
 */

/** Below this many points a delta cannot be stated at one-decimal precision. */
export const PACE_RESOLUTION = 0.05;

export type PaceState =
  | { kind: "over"; deltaPts: number }
  | { kind: "under"; deltaPts: number }
  | { kind: "on-pace" };

/**
 * `over` is the gate's own verdict, passed in — never re-derived here. Only the
 * "under" side may use a tolerance, because being a hundredth of a point under
 * an allowance has no consequence, while being a hundredth over is a refusal.
 */
export function paceState(used: number, allowance: number, over: boolean): PaceState {
  if (over) return { kind: "over", deltaPts: used - allowance };
  const under = allowance - used;
  if (under > PACE_RESOLUTION) return { kind: "under", deltaPts: under };
  return { kind: "on-pace" };
}

/** `0.3`, or `<0.1` when the delta is real but too small to state at one decimal. */
export function formatPaceDelta(deltaPts: number): string {
  if (!Number.isFinite(deltaPts)) return "—";
  const d = Math.abs(deltaPts);
  return d <= PACE_RESOLUTION ? "<0.1" : d.toFixed(1);
}

export function paceText(state: PaceState): string {
  if (state.kind === "over") return `over ${formatPaceDelta(state.deltaPts)}`;
  if (state.kind === "under") return `under ${formatPaceDelta(state.deltaPts)}`;
  return "on pace";
}

/** `[####------] 41%` — a fixed-width gauge for the CLI. */
export function bar(pct: number, width = 10): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`;
}

export function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

export function padLeft(s: string, n: number): string {
  return s.length >= n ? s : " ".repeat(n - s.length) + s;
}

/** A table with aligned columns. Rows may be ragged; missing cells render blank. */
export function table(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const line = (cells: string[]) => cells.map((c, i) => pad(c ?? "", widths[i]!)).join("  ").trimEnd();
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}
