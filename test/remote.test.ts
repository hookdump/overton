/**
 * Remote mode: does the CLI ask the OTHER Overton, and does it say so?
 *
 * The failure this file is written against is not "the request 404s" — it is a
 * `status` table that quietly came from this machine's stale database while the
 * operator believed they were reading the shared arbiter. Every number would be
 * wrong and nothing on the screen would admit it. So the tests that matter here
 * are the ones about what happens when the remote is NOT there, and about the
 * exit codes, which are the only part of the contract a script can see.
 *
 * The arbiter under test is the real HTTP surface — `createHandler` over a real
 * `Overton` — rather than a hand-written fake, so a route that changes shape
 * fails here instead of in someone's terminal.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConfigError,
  Registry,
  loadConfig,
  openDb,
  openMemoryDb,
  parseConfig,
  ruling,
  type Ruling,
  type Verdict,
} from "@overton/core";
import { Overton } from "@overton/engine";
import type { Policy } from "@overton/policy";
import { createHandler } from "@overton/server";
import { COMMANDS } from "../apps/overton/src/commands/index.ts";
import { LOCAL_ONLY, REMOTE_COMMANDS } from "../apps/overton/src/remote/commands.ts";
import { normalizeRemoteUrl, resolveRemote } from "../apps/overton/src/remote/target.ts";

// ---------------------------------------------------------------------------
// harness
// ---------------------------------------------------------------------------

const CLI = new URL("../apps/overton/src/index.ts", import.meta.url).pathname;
const HOME = mkdtempSync(join(tmpdir(), "overton-remote-"));

/**
 * The CLI as a script would see it. Spawned rather than called, because the
 * exit code is the contract under test and only a real process has one.
 */
async function cli(args: string[], env: Record<string, string> = {}) {
  const proc = Bun.spawn(["bun", "run", CLI, ...args], {
    // OVERTON_REMOTE is cleared unless a test sets it: inheriting the operator's
    // own would make these tests pass or fail depending on whose shell ran them.
    env: { ...process.env, OVERTON_HOME: HOME, OVERTON_REMOTE: "", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout, stderr };
}

/** A policy that rules however the test says, so all four verdicts are reachable. */
class ScriptedPolicy implements Policy {
  readonly id = "scripted";
  readonly description = "the verdict this test asked for";
  verdict: Verdict = "go";
  evaluate(): Ruling | null {
    return ruling(this.verdict, `scripted ${this.verdict}`, { retryAfterSec: 42 });
  }
}

const servers: Array<{ stop(closeActiveConnections?: boolean): void }> = [];

function arbiter(o: Overton) {
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: createHandler(o) });
  servers.push(server);
  return { server, url: `http://127.0.0.1:${server.port}` };
}

/** An arbiter whose verdict a test dictates. */
function scriptedArbiter() {
  const scripted = new ScriptedPolicy();
  const o = new Overton({
    db: openMemoryDb(),
    cfg: parseConfig({
      accounts: { shared: { provider: "unmetered" } },
      projects: { app: { accounts: { shared: { weekly_share: 1 } } } },
      policy: { chain: ["scripted"] },
    }),
    policies: new Registry<Policy>("policy").register(scripted),
  });
  return { ...arbiter(o), scripted, o };
}

const ARBITER_CONFIG = `accounts:
  shared:
    provider: unmetered
projects:
  app:
    roots: [/tmp/app]
    accounts:
      shared: { weekly_share: 1 }
`;

/** An arbiter with a config file on disk, so the write surface is exercised too. */
function configBackedArbiter() {
  const file = join(mkdtempSync(join(tmpdir(), "overton-arbiter-")), "config.yaml");
  writeFileSync(file, ARBITER_CONFIG);
  const o = new Overton({ db: openMemoryDb(), cfg: loadConfig(file), configFile: file });
  return { ...arbiter(o), file };
}

/** A port with nothing behind it: bound to learn the number, then released. */
function deadUrl(): string {
  const s = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response("") });
  const url = `http://127.0.0.1:${s.port}`;
  s.stop(true);
  return url;
}

function writeConfig(body: string): string {
  const file = join(mkdtempSync(join(tmpdir(), "overton-cfg-")), "config.yaml");
  writeFileSync(file, body);
  return file;
}

afterAll(() => {
  for (const s of servers) s.stop(true);
});

// ---------------------------------------------------------------------------
// which Overton answers
// ---------------------------------------------------------------------------

describe("resolving the target", () => {
  const config = () => ({
    remotes: { e16: { url: "https://e16.example" }, laptop: { url: "https://laptop.example" } },
    default_remote: "laptop",
    remote: "https://flat.example",
  });

  test("the flag outranks the environment, which outranks the config", () => {
    expect(resolveRemote({ flag: "https://flag.example", env: { OVERTON_REMOTE: "https://env.example" }, config })).toMatchObject(
      { url: "https://flag.example", source: "--remote" },
    );
    expect(resolveRemote({ env: { OVERTON_REMOTE: "https://env.example" }, config })).toMatchObject({
      url: "https://env.example",
      source: "OVERTON_REMOTE",
    });
    expect(resolveRemote({ env: {}, config })).toMatchObject({
      name: "laptop",
      url: "https://laptop.example",
      source: "config",
    });
  });

  test("a name resolves through `remotes:`, from the flag or the environment", () => {
    expect(resolveRemote({ flag: "e16", config })).toMatchObject({
      name: "e16",
      url: "https://e16.example",
    });
    expect(resolveRemote({ env: { OVERTON_REMOTE: "e16" }, config })).toMatchObject({ name: "e16" });
  });

  test("an unknown name is refused, and says which ones exist", () => {
    let caught: Error | null = null;
    try {
      resolveRemote({ flag: "e17", config });
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeInstanceOf(ConfigError);
    expect(caught!.message).toContain("e17");
    expect(caught!.message).toContain("e16, laptop");
  });

  test("one remote and no `default_remote` is the default — a second key would be ceremony", () => {
    expect(resolveRemote({ env: {}, config: () => ({ remotes: { e16: { url: "https://e16.example" } } }) })).toMatchObject({
      name: "e16",
      url: "https://e16.example",
    });
  });

  test("several remotes and no `default_remote` is an address book, not a default", () => {
    // Nothing there says which one, and guessing is the failure this whole
    // mechanism exists to avoid — so it stays local until `--remote` names one.
    const book = () => ({ remotes: { a: { url: "https://a.example" }, b: { url: "https://b.example" } } });
    expect(resolveRemote({ env: {}, config: book })).toBeNull();
    expect(resolveRemote({ flag: "b", config: book })).toMatchObject({ name: "b" });
  });

  test("the flat `remote:` shorthand still works, as an unnamed default", () => {
    expect(resolveRemote({ env: {}, config: () => ({ remote: "https://flat.example" }) })).toMatchObject({
      name: null,
      url: "https://flat.example",
      source: "config",
    });
  });

  test("nothing configured is local, which is the whole of today's behaviour", () => {
    expect(resolveRemote({ env: {}, config: () => ({}) })).toBeNull();
  });

  test("`--remote` with no value is an error rather than a guess", () => {
    expect(() => resolveRemote({ flag: true, config: () => ({}) })).toThrow(ConfigError);
  });

  test("a literal URL never reads the config, so a laptop needs no config of its own", () => {
    const explode = () => {
      throw new ConfigError("no config at ~/.overton/config.yaml");
    };
    expect(resolveRemote({ flag: "https://host.ts.net", config: explode })).toMatchObject({
      name: null,
      url: "https://host.ts.net",
    });
  });

  test("a missing scheme is filled in: https for a host, http for loopback", () => {
    expect(normalizeRemoteUrl("host.ts.net", "test")).toBe("https://host.ts.net");
    expect(normalizeRemoteUrl("127.0.0.1:7787", "test")).toBe("http://127.0.0.1:7787");
    expect(normalizeRemoteUrl("https://host.ts.net/overton/", "test")).toBe("https://host.ts.net/overton");
    expect(() => normalizeRemoteUrl("ftp://host", "test")).toThrow(ConfigError);
  });

  test("`default_remote` naming nothing is caught when the config is parsed", () => {
    expect(() => parseConfig({ remotes: { e16: { url: "https://e16" } }, default_remote: "e17" })).toThrow(
      /default_remote/,
    );
  });
});

describe("the command table", () => {
  test("every command is either remote-capable or explicitly local-only", () => {
    // The default for a new command must be a decision, not an accident: one
    // that is neither listed nor implemented would refuse with a vague message
    // instead of a reason.
    for (const name of Object.keys(COMMANDS)) {
      expect(REMOTE_COMMANDS[name] ?? LOCAL_ONLY[name]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// against a real arbiter
// ---------------------------------------------------------------------------

describe("asking another Overton", () => {
  test("the verdict's exit code survives the wire", async () => {
    const { url, scripted } = scriptedArbiter();
    for (const [verdict, code] of [
      ["go", 0],
      ["wait", 10],
      ["ask", 11],
      ["deny", 12],
    ] as Array<[Verdict, number]>) {
      scripted.verdict = verdict;
      const res = await cli(["ask", "app", "shared", "--remote", url]);
      expect(res.code).toBe(code);
      expect(res.stdout).toContain(verdict);
    }
  });

  test("`claim` carries the verdict's exit code too, and prints only the id when it opens", async () => {
    const { url, scripted } = scriptedArbiter();
    scripted.verdict = "wait";
    const refused = await cli(["claim", "app", "shared", "--remote", url]);
    expect(refused.code).toBe(10);

    scripted.verdict = "go";
    const opened = await cli(["claim", "app", "shared", "--remote", url]);
    expect(opened.code).toBe(0);
    // `id=$(overton claim …)` has to keep working, so stdout is the id alone.
    expect(opened.stdout.trim()).toMatch(/^clm_/);
  });

  test("--json is the local document, without the wire's `exitCode`", async () => {
    const { url, scripted } = scriptedArbiter();
    scripted.verdict = "wait";
    const res = await cli(["ask", "app", "shared", "--json", "--remote", url]);
    expect(res.code).toBe(10);
    const decision = JSON.parse(res.stdout) as Record<string, unknown>;
    expect(decision.verdict).toBe("wait");
    expect(decision.exitCode).toBeUndefined();
    expect(decision).toHaveProperty("rulings");
    expect(decision).toHaveProperty("request");
  });

  test("the target is named on stderr, and never on stdout", async () => {
    const { url } = scriptedArbiter();
    const table = await cli(["status", "--remote", url]);
    expect(table.stderr).toContain(`overton · (unnamed) ${url}`);
    expect(table.stdout).toContain("ACCOUNT");
    expect(table.stdout).not.toContain("overton ·");

    // Under --json the line would corrupt the document, so it is not printed.
    const json = await cli(["status", "--json", "--remote", url]);
    expect(json.stderr).not.toContain("overton ·");
    expect(JSON.parse(json.stdout)).toHaveProperty("accounts");
  });

  test("a named remote is named in the banner", async () => {
    const { url } = scriptedArbiter();
    const file = writeConfig(`remotes:\n  e16:\n    url: ${url}\ndefault_remote: e16\n`);
    const res = await cli(["status", "--config", file]);
    expect(res.code).toBe(0);
    expect(res.stderr).toContain(`overton · e16 ${url}`);
    expect(res.stdout).toContain("shared");
  });

  test("`run` holds a claim on the remote, runs the command, and gives the capacity back", async () => {
    const { url, scripted, o } = scriptedArbiter();
    scripted.verdict = "go";
    const res = await cli(["run", "app", "shared", "--remote", url, "--", "echo", "from the child"]);
    expect(res.code).toBe(0);
    expect(res.stdout).toContain("from the child");
    // A claim leaked here would idle the account for every machine, not just
    // this one — the release is in a `finally` for exactly that reason.
    expect(o.db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM claims WHERE state = 'open'").get()!.n).toBe(0);

    scripted.verdict = "deny";
    const refused = await cli(["run", "app", "shared", "--remote", url, "--", "echo", "never"]);
    expect(refused.code).toBe(12);
    expect(refused.stdout).not.toContain("never");
  });

  test("the looking commands render the remote's numbers", async () => {
    const { url } = scriptedArbiter();
    for (const args of [["windows"], ["projects"], ["claims"], ["ledger", "shared"]]) {
      const res = await cli([...args, "--remote", url]);
      expect(res.code).toBe(0);
    }
  });
});

describe("local and remote are the same answer", () => {
  /**
   * One database, two paths to it: the CLI reading it directly, and the CLI
   * asking an arbiter that holds it. Anything a script can see must match, or
   * "point it at the shared Overton" silently becomes a migration.
   */
  test("--json is byte-identical, and local mode prints no banner", async () => {
    const dir = mkdtempSync(join(tmpdir(), "overton-both-"));
    const file = join(dir, "config.yaml");
    writeFileSync(file, ARBITER_CONFIG);
    const o = new Overton({ db: openDb(join(dir, "overton.db")), cfg: loadConfig(file), configFile: file });
    const { url } = arbiter(o);

    for (const args of [["status"], ["projects"], ["windows"], ["claims"], ["ledger", "shared"]]) {
      const local = await cli([...args, "--json"], { OVERTON_HOME: dir });
      const remote = await cli([...args, "--json", "--remote", url], { OVERTON_HOME: dir });
      expect(local.code).toBe(0);
      expect(remote.code).toBe(0);
      expect(remote.stdout).toBe(local.stdout);
      // Nothing is set locally, so the output is exactly what it was before
      // remote mode existed — including an untouched stderr.
      expect(local.stderr).toBe("");
    }

    // A decision differs only in when it was asked.
    const at = (s: string) => {
      const d = JSON.parse(s) as { request: { at: number } };
      d.request.at = 0;
      return d;
    };
    const local = await cli(["ask", "app", "shared", "--json"], { OVERTON_HOME: dir });
    const remote = await cli(["ask", "app", "shared", "--json", "--remote", url], { OVERTON_HOME: dir });
    expect(at(remote.stdout)).toEqual(at(local.stdout));
    expect(remote.code).toBe(local.code);
  });
});

describe("when the remote is not there", () => {
  test("it fails loudly rather than answering from the local database", async () => {
    const dead = deadUrl();
    // A config that WOULD answer locally, so a fallback would be silent and
    // plausible — which is exactly the outcome this test exists to forbid.
    const file = writeConfig(
      `remote: ${dead}\naccounts:\n  shared:\n    provider: unmetered\nprojects:\n  app:\n    accounts:\n      shared: { weekly_share: 1 }\n`,
    );
    const res = await cli(["ask", "app", "shared", "--config", file]);

    expect(res.code).toBe(1);
    // Not 0/10/11/12: a transport failure must never be mistaken for a verdict.
    expect(res.stdout).toBe("");
    expect(res.stderr).toContain(dead);
    expect(res.stderr).toContain("nothing was answered from this machine's database");
  });

  test("a URL that is not an Overton says so, rather than rendering an empty table", async () => {
    const s = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response("<html>hi</html>") });
    servers.push(s);
    const res = await cli(["status", "--remote", `http://127.0.0.1:${s.port}`]);
    expect(res.code).toBe(1);
    expect(res.stderr).toContain("not JSON");
  });
});

describe("the commands that stay here", () => {
  test("each refuses with a reason and a way forward", async () => {
    const { url } = scriptedArbiter();
    for (const command of ["explain", "meter", "doctor", "daemon", "serve", "mcp", "plugins", "init"]) {
      const res = await cli([command, "--remote", url]);
      expect(res.code).toBe(2);
      expect(res.stderr).toContain(`\`${command}\` cannot run against a remote Overton`);
      expect(res.stderr).toContain("fix:");
      expect(res.stdout).toBe("");
    }
  });

  test("`explain` refuses because the facts are not on the wire, not because nobody wrote it", async () => {
    const { url } = scriptedArbiter();
    const res = await cli(["explain", "app", "shared", "--remote", url]);
    expect(res.stderr).toContain("not on the HTTP surface");
    expect(res.stderr).toContain("ssh 127.0.0.1");
  });

  test("`init` is refused as local work, and points back at this machine", async () => {
    const { url } = scriptedArbiter();
    const res = await cli(["init", "--remote", url]);
    expect(res.stderr).toContain("about this machine");
  });

  test("a named remote still resolves for the commands that need no config", async () => {
    // `init` runs before a config exists, so it may not REQUIRE one — but when
    // one is there and names `e16`, being told that no remotes are configured
    // by a process reading that very file is its own small betrayal.
    const { url } = scriptedArbiter();
    const file = writeConfig(`remotes:\n  e16:\n    url: ${url}\n`);
    const res = await cli(["init", "--config", file], { OVERTON_REMOTE: "e16" });
    expect(res.code).toBe(2);
    expect(res.stderr).toContain("about this machine");
    expect(res.stderr).toContain("e16");
  });
});

describe("editing the remote's projects", () => {
  test("ls, ensure and rm all act on the arbiter's config file", async () => {
    const { url, file } = configBackedArbiter();

    const ls = await cli(["project", "ls", "--remote", url]);
    expect(ls.stdout.trim()).toBe("app");

    const ensure = await cli([
      "project", "ensure", "side", "--root", "/tmp/side", "--account", "shared=2", "--remote", url,
    ]);
    expect(ensure.code).toBe(0);
    expect(ensure.stdout).toContain("created project `side`");
    // The split it prints is the one the edit produced: two projects at 1 and 2
    // are a third and two thirds, and the remote is where that was computed.
    expect(ensure.stdout).toContain("side *");
    expect(readFileSync(file, "utf8")).toContain("side");

    const rm = await cli(["project", "rm", "side", "--remote", url]);
    expect(rm.code).toBe(0);
    expect(readFileSync(file, "utf8")).not.toContain("side");
  });

  test("naming an account the remote does not have is refused before anything is written", async () => {
    const { url } = configBackedArbiter();
    const res = await cli(["project", "ensure", "nope", "--account", "ghost", "--remote", url]);
    expect(res.code).toBe(2);
    expect(res.stderr).toContain("no account `ghost`");
  });
});
