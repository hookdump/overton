/**
 * Which Overton is answering.
 *
 * A laptop and a build host that share one subscription each think they are on
 * pace, because each is looking at its own database. Pointing the laptop's CLI
 * at the host's Overton is what makes a single arbiter see all of the spend.
 *
 * The choice is resolved from four places, highest first:
 *
 *   --remote <name|url>          this invocation only
 *   $OVERTON_REMOTE              this shell
 *   remotes: + default_remote:   this machine, named
 *   remote: <url>                this machine, unnamed shorthand
 *
 * Anything containing `://` is taken literally; anything else is a NAME and is
 * looked up in `remotes:`. A name that is not there is an error listing the
 * ones that are — never the nearest match, and never a silent fall back to the
 * local database, because a number from the wrong arbiter is worse than no
 * number at all.
 */

import { ConfigError } from "@overton/core";

export interface RemoteTarget {
  /** The key from `remotes:`, or null when a URL was given literally. */
  name: string | null;
  /** Normalised: scheme present, no trailing slash. */
  url: string;
  /** Which of the four places chose it. Named in errors, so a surprise is traceable. */
  source: RemoteSource;
}

export type RemoteSource = "--remote" | "OVERTON_REMOTE" | "config";

/**
 * The slice of config this file reads. Declared loosely rather than as
 * `Pick<Config, …>` so a caller with no config at all — `overton init`, which
 * runs before there is a file — can pass an empty object.
 */
export interface RemoteConfig {
  remote?: string | undefined;
  remotes?: Record<string, { url: string }> | undefined;
  default_remote?: string | undefined;
}

/** `e16 https://host` — how a target is named in output and in errors. */
export function describeTarget(t: RemoteTarget): string {
  return `${t.name ?? "(unnamed)"} ${t.url}`;
}

/** The bare hostname — no port, because the advice it appears in is an `ssh`. */
export function targetHost(t: RemoteTarget): string {
  return new URL(t.url).hostname;
}

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/**
 * A URL that `fetch` will accept, from what a human is willing to type.
 *
 * A missing scheme is filled in rather than rejected: `https` for a real host,
 * `http` for loopback, because nobody runs TLS on 127.0.0.1 and defaulting it
 * there produces a connection failure whose message blames the network.
 */
export function normalizeRemoteUrl(raw: string, where: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) throw new ConfigError(`${where}: a remote needs a URL`);
  const authority = trimmed.split("/")[0]!;
  const withScheme = /:\/\//.test(trimmed)
    ? trimmed
    : `${LOOPBACK.test(authority) ? "http" : "https"}://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error(`\`${u.protocol}\` is not http or https`);
    }
  } catch (e) {
    throw new ConfigError(`${where}: \`${raw}\` is not a usable URL — ${(e as Error).message}`);
  }
  return withScheme;
}

/** `--remote` and `$OVERTON_REMOTE` take either form; this decides which it was. */
function fromRef(ref: string, source: RemoteSource, config: () => RemoteConfig): RemoteTarget {
  if (/:\/\//.test(ref)) return { name: null, url: normalizeRemoteUrl(ref, source), source };

  const remotes = config().remotes ?? {};
  const entry = remotes[ref];
  if (!entry) {
    const known = Object.keys(remotes);
    throw new ConfigError(
      `${source}: no remote named \`${ref}\`\n` +
        (known.length
          ? `  configured: ${known.join(", ")}\n`
          : "  no remotes are configured\n") +
        "  fix: name one of those, add it under `remotes:` in config.yaml, " +
        "or pass a full URL like https://host.ts.net",
    );
  }
  return { name: ref, url: normalizeRemoteUrl(entry.url, `remotes.${ref}.url`), source };
}

export interface RemoteSources {
  /** The raw `--remote` flag. `true` means it was passed with no value. */
  flag?: string | boolean | undefined;
  env?: NodeJS.ProcessEnv | undefined;
  /**
   * Read only when the higher-precedence sources did not answer, or when one of
   * them gave a name to look up. Lazy so that `--remote https://host` needs no
   * local config file at all — a machine that only ever consults a shared
   * arbiter should not have to keep a config of its own to do it.
   */
  config: () => RemoteConfig;
}

/** The target, or null for "this machine's own database" — today's behaviour. */
export function resolveRemote(sources: RemoteSources): RemoteTarget | null {
  const { flag, env, config } = sources;

  if (flag === true) {
    throw new ConfigError(
      "--remote needs a name or a URL, e.g. `--remote e16` or `--remote https://host.ts.net`",
    );
  }
  if (typeof flag === "string" && flag.trim()) return fromRef(flag.trim(), "--remote", config);

  const fromEnv = (env?.OVERTON_REMOTE ?? "").trim();
  if (fromEnv) return fromRef(fromEnv, "OVERTON_REMOTE", config);

  const cfg = config();
  const remotes = cfg.remotes ?? {};
  const names = Object.keys(remotes);

  // Validated at load time, so it names a real entry by the time we get here.
  if (cfg.default_remote) {
    return {
      name: cfg.default_remote,
      url: normalizeRemoteUrl(remotes[cfg.default_remote]!.url, `remotes.${cfg.default_remote}.url`),
      source: "config",
    };
  }
  // One remote and no `default_remote` is not an ambiguity worth a second key.
  // Several with no default is an ADDRESS BOOK, not a default: nothing there
  // says which one, and guessing is the failure this whole file exists to
  // avoid, so those stay local until `--remote` names one.
  if (names.length === 1) {
    const only = names[0]!;
    return { name: only, url: normalizeRemoteUrl(remotes[only]!.url, `remotes.${only}.url`), source: "config" };
  }

  if (cfg.remote?.trim()) {
    return { name: null, url: normalizeRemoteUrl(cfg.remote, "remote"), source: "config" };
  }

  return null;
}
