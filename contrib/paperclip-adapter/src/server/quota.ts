/**
 * Reporting Overton's readings into Paperclip's own quota surface.
 *
 * Paperclip already has a place to show provider rate-limit windows; it just
 * has no way to learn about a subscription window that several projects share.
 * Overton has exactly that, so this hook hands it over and the numbers appear
 * natively rather than only in a separate terminal.
 *
 * One `ProviderQuotaResult` covers every account, with the account id in each
 * window's label. The alternative — one result per provider — would collapse a
 * personal and a work Claude seat into a single row, which is precisely the
 * conflation this whole project exists to undo.
 */

import type { ProviderQuotaResult, QuotaWindow } from "@paperclipai/adapter-utils";
import { OvertonClient } from "../overton.js";
import { DEFAULT_OVERTON_URL } from "../constants.js";

const WINDOW_LABEL: Record<string, string> = {
  five_hour: "5h",
  seven_day: "7d",
  seven_day_opus: "Opus 7d",
  seven_day_sonnet: "Sonnet 7d",
};

export async function getQuotaWindows(baseUrl = DEFAULT_OVERTON_URL): Promise<ProviderQuotaResult> {
  try {
    const accounts = await new OvertonClient(baseUrl).accounts();
    const windows: QuotaWindow[] = [];

    for (const account of accounts) {
      if (!account.metered) {
        windows.push({
          label: `${account.accountId} — unmetered`,
          usedPercent: null,
          resetsAt: null,
          valueLabel: `${account.claims}/${account.maxConcurrent} running`,
          detail: "local or separately billed; no window to spend",
        });
        continue;
      }
      if (account.windows.length === 0) {
        // Reported as a window with a NULL percentage rather than omitted.
        // "Never metered" and "0% used" are opposite facts, and an account
        // silently missing from this list reads as the latter.
        windows.push({
          label: `${account.accountId} — no reading`,
          usedPercent: null,
          resetsAt: null,
          valueLabel: null,
          detail: "Overton has not metered this account yet — run `overton meter`",
        });
        continue;
      }
      for (const w of account.windows) {
        windows.push({
          label: `${account.accountId} ${WINDOW_LABEL[w.kind] ?? w.kind}`,
          usedPercent: w.utilizationPct,
          resetsAt: w.resetsAt != null ? new Date(w.resetsAt * 1000).toISOString() : null,
          valueLabel: null,
          detail: [
            w.resetsIn ? `resets in ${w.resetsIn}` : null,
            // Surfaced, not hidden: a stale reading tightens every gate built
            // on it, so a human looking at this number should know.
            w.freshness !== "ok" ? `reading is ${w.freshness}` : null,
            account.plan ? `plan ${account.plan}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        });
      }
    }

    return { provider: "overton", source: baseUrl, ok: true, windows };
  } catch (e) {
    return {
      provider: "overton",
      source: baseUrl,
      ok: false,
      errorFamily: "transient_upstream",
      error: `Overton unreachable at ${baseUrl}: ${(e as Error).message}`,
      windows: [],
    };
  }
}
