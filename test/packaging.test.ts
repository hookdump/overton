/**
 * Packaging: the CLI has to survive leaving this repo.
 *
 * Overton is a workspace, and `bun install -g github:hookdump/overton` used to
 * fail outright:
 *
 *   error: @overton/core@workspace:* failed to resolve   (and five more)
 *
 * A global install pulls the root package without the workspace context, so
 * every `workspace:*` dependency is unresolvable. The fix is that the shipped
 * artifact is a bundle with those six packages inlined — which means the thing
 * to protect is not "does it build" but "does the built thing still depend on
 * anything that only exists inside this repo".
 *
 * These tests build into a temp dir rather than asserting against `dist/`, so
 * they pass on a clean checkout and cannot be fooled by a stale bundle.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as {
  name: string; bin: Record<string, string>; files?: string[];
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

let out: string;
let bundle: string;

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "overton-pack-"));
  bundle = join(out, "overton.js");
  execFileSync("bun", [
    "build", "apps/overton/src/index.ts", "--target=bun", `--outfile=${bundle}`,
  ], { cwd: repo, stdio: "pipe" });
});

afterAll(() => rmSync(out, { recursive: true, force: true }));

describe("the published package", () => {
  test("is scoped, because the bare name is taken on npm", () => {
    expect(pkg.name).toBe("@hookdump/overton");
  });

  test("is not private — a private package cannot be published or installed", () => {
    expect((pkg as Record<string, unknown>).private).toBeUndefined();
  });

  test("declares no runtime dependencies at all", () => {
    // Everything is bundled. A single runtime dep here is either dead weight
    // or, if it is a `workspace:*`, the exact bug this file exists for.
    const deps = Object.entries(pkg.dependencies ?? {});
    expect(deps).toEqual([]);
  });

  test("keeps the workspace packages, as dev dependencies", () => {
    // They still have to resolve for local development and for the build.
    const dev = pkg.devDependencies ?? {};
    for (const p of ["core", "engine", "ledger", "policy", "providers", "server"]) {
      expect(dev[`@overton/${p}`]).toBe("workspace:*");
    }
  });

  test("ships only the bundle", () => {
    expect(pkg.files).toEqual(["dist"]);
  });

  test("bin points at the built artifact, not at TypeScript source", () => {
    // `bin` used to point at apps/overton/src/index.ts, which does not exist
    // in the published tarball.
    expect(pkg.bin.overton).toBe("./dist/overton.js");
    expect(pkg.bin.overton).toStartWith("./dist/");
  });

  test("builds before publishing, and never on install", () => {
    expect(pkg.scripts.build).toContain("bun build");
    expect(pkg.scripts.prepublishOnly).toBe("bun run build");
    // `prepare` would run on install, where there is no workspace and so no
    // way to resolve `@overton/*`. It fails by construction, so it must not
    // come back: bun blocks it by default and trusting it only surfaces the
    // failure. The bundle is committed instead.
    expect(pkg.scripts.prepare).toBeUndefined();
  });

  test("the committed bundle is the one bin points at", () => {
    // A git install runs this file verbatim — if it is missing or stale, every
    // machine installing from GitHub gets the old CLI or none at all.
    const shipped = join(repo, "dist", "overton.js");
    expect(statSync(shipped).isFile()).toBe(true);
    expect(pkg.bin.overton).toBe("./dist/overton.js");
  });
});

describe("the bundle", () => {
  test("builds", () => {
    expect(statSync(bundle).size).toBeGreaterThan(1000);
  });

  test("inlines every workspace package", () => {
    // The failure mode: a bundler config change makes `@overton/*` external
    // again, the build still succeeds, and the install breaks for everyone
    // who is not in this repo.
    const code = readFileSync(bundle, "utf8");
    for (const p of ["core", "engine", "ledger", "policy", "providers", "server"]) {
      expect(code).not.toContain(`"@overton/${p}"`);
      expect(code).not.toContain(`'@overton/${p}'`);
    }
  });

  test("runs from a directory with no node_modules and no repo in sight", () => {
    // The real test of "self-contained": execute it from the temp dir.
    const stdout = execFileSync("bun", [bundle, "--help"], {
      cwd: out, encoding: "utf8", stdio: "pipe",
    });
    expect(stdout).toContain("overton");
  });
});
