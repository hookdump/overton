/**
 * Wiring Overton into Paperclip.
 *
 * Paperclip decides what work happens and who does it. Overton decides whether
 * the subscription can afford it right now. They compose cleanly, but composing
 * them by hand is five steps — install deps, compile, find the absolute path,
 * register it through a form, remember to restart because Node's ESM cache
 * keeps serving the module it imported first. Five steps done rarely is a
 * setup people get wrong once and then blame on the tool.
 *
 * So it is one command.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { Command, CommandContext } from "./index.ts";

const ADAPTER_TYPE = "overton";

/** Walk up from this file to the repo, then down to the adapter we ship. */
function findAdapterDir(explicit?: string): string {
  if (explicit) {
    const dir = resolve(explicit);
    if (!existsSync(join(dir, "package.json"))) {
      throw new Error(`no package.json under ${dir} — is that the adapter directory?`);
    }
    return dir;
  }
  let here = dirname(new URL(import.meta.url).pathname);
  for (let i = 0; i < 8; i++) {
    const candidate = join(here, "contrib", "paperclip-adapter");
    if (existsSync(join(candidate, "package.json"))) return candidate;
    const up = dirname(here);
    if (up === here) break;
    here = up;
  }
  throw new Error(
    "could not find contrib/paperclip-adapter\n" +
      "  pass it explicitly:  overton paperclip install --path /path/to/adapter",
  );
}

function run(cmd: string, args: string[], cwd?: string): { ok: boolean; out: string } {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (r.error) return { ok: false, out: `${cmd} not found: ${r.error.message}` };
  return { ok: r.status === 0, out };
}

function have(bin: string): boolean {
  return spawnSync("sh", ["-c", `command -v ${bin}`], { encoding: "utf8" }).status === 0;
}

/** Flags that address a Paperclip instance, passed straight through. */
function apiFlags(ctx: CommandContext): string[] {
  const out: string[] = [];
  for (const name of ["api-base", "api-key", "profile", "context", "data-dir"]) {
    const v = ctx.args.flags[name];
    if (typeof v === "string" && v) out.push(`--${name}`, v);
  }
  if (!ctx.args.flags["api-key"] && process.env.PAPERCLIP_API_KEY) {
    out.push("--api-key", process.env.PAPERCLIP_API_KEY);
  }
  return out;
}

function manualFallback(dir: string): void {
  console.log("");
  console.log("Register it by hand instead — it takes about fifteen seconds:");
  console.log("  Paperclip → Adapters → Install External Adapter → Local path");
  console.log(`  ${dir}`);
  console.log("");
  console.log("Then restart Paperclip. `Reload` refreshes the registry row, but Node's ESM");
  console.log("cache keeps returning the module it imported first, so edits do not take");
  console.log("effect until the process restarts:");
  console.log("  systemctl --user restart paperclip    # or however you run it");
}

const installCommand: Command = {
  needsConfig: false,
  run(ctx: CommandContext): number {
    const dir = findAdapterDir(
      typeof ctx.args.flags.path === "string" ? ctx.args.flags.path : undefined,
    );
    const skipBuild = ctx.args.flags["no-build"] === true;

    console.log(`adapter  ${dir}`);

    if (!skipBuild) {
      const pm = have("bun") ? "bun" : have("npm") ? "npm" : null;
      if (!pm) {
        console.error("neither bun nor npm is on PATH — cannot build the adapter");
        return 78;
      }
      process.stdout.write(`build    ${pm} install … `);
      const install = run(pm, ["install"], dir);
      if (!install.ok) {
        console.log("failed");
        console.error(install.out.slice(0, 800));
        return 1;
      }
      const tsc = pm === "bun" ? run("bunx", ["tsc"], dir) : run("npx", ["tsc"], dir);
      if (!tsc.ok) {
        console.log("failed");
        console.error(tsc.out.slice(0, 800));
        return 1;
      }
      console.log("compiled");
    }

    if (!existsSync(join(dir, "dist", "index.js"))) {
      console.error(`no dist/index.js under ${dir} — the build produced nothing`);
      return 1;
    }

    if (!have("paperclipai")) {
      console.error("paperclipai is not on PATH, so the adapter cannot be registered for you.");
      manualFallback(dir);
      return 78;
    }

    // Paperclip's own CLI owns the registration contract; shelling out to it
    // means this command does not have to track that endpoint's payload shape.
    const payload =
      typeof ctx.args.flags["payload-json"] === "string"
        ? (ctx.args.flags["payload-json"] as string)
        : JSON.stringify({ path: dir });

    process.stdout.write("register … ");
    const reg = run("paperclipai", ["adapter", "install", "--payload-json", payload, ...apiFlags(ctx)]);
    if (!reg.ok) {
      console.log("failed");
      console.error(reg.out.slice(0, 900));
      if (/unauthor|forbidden|401|403|api.key/i.test(reg.out)) {
        console.error("");
        console.error("That looks like an auth failure. Paperclip's API needs a token:");
        console.error("  paperclipai auth login          # or: paperclipai token create");
        console.error("  export PAPERCLIP_API_KEY=…      # then re-run this command");
      }
      manualFallback(dir);
      return 1;
    }
    console.log("done");

    const restart = ctx.args.flags.restart === true;
    if (restart) {
      process.stdout.write("restart  … ");
      const r = run("systemctl", ["--user", "restart", "paperclip"]);
      console.log(r.ok ? "done" : "could not restart — do it yourself");
    }

    console.log("");
    console.log(`Registered as adapter type \`${ADAPTER_TYPE}\` — it shows up as`);
    console.log("\"Overton (budget-gated)\" in the agent form, with your real accounts");
    console.log("and their current utilization in the dropdown.");
    if (!restart) {
      console.log("");
      console.log("Restart Paperclip before using it — Node's ESM cache serves the module");
      console.log("it imported first:  overton paperclip install --restart   (or restart by hand)");
    }
    return 0;
  },
};

const statusCommand: Command = {
  needsConfig: false,
  run(ctx: CommandContext): number {
    if (!have("paperclipai")) {
      console.error("paperclipai is not on PATH");
      return 78;
    }
    const r = run("paperclipai", ["adapter", "get", ADAPTER_TYPE, "--json", ...apiFlags(ctx)]);
    if (!r.ok) {
      console.log(`not registered — run \`overton paperclip install\``);
      if (r.out) console.error(r.out.slice(0, 400));
      return 1;
    }
    console.log(r.out);
    return 0;
  },
};

const paperclipCommand: Command = {
  needsConfig: false,
  run(ctx: CommandContext): number | Promise<number> {
    // `positional` holds what follows the command, so the subcommand is [0].
    const sub = ctx.args.positional[0];
    if (sub === "install") return installCommand.run(ctx);
    if (sub === "status") return statusCommand.run(ctx);
    console.log("overton paperclip — wire Overton into Paperclip");
    console.log("");
    console.log("  install    build the bundled adapter and register it");
    console.log("  status     is it registered?");
    console.log("");
    console.log("OPTIONS");
    console.log("  --path <dir>        adapter directory (default: bundled contrib/paperclip-adapter)");
    console.log("  --no-build          skip install+compile, register what is already built");
    console.log("  --restart           restart the paperclip systemd user service afterwards");
    console.log("  --api-key <token>   Paperclip API token (or $PAPERCLIP_API_KEY)");
    console.log("  --api-base <url>    a Paperclip other than the local one");
    return sub ? 2 : 0;
  },
};

export const paperclipCommands: Record<string, Command> = { paperclip: paperclipCommand };
