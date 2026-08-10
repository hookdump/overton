import { Registry } from "@overton/core";
import type { CostSource } from "./types.ts";
import { ClaudeCostSource } from "./claude.ts";
import { CodexCostSource } from "./codex.ts";

export * from "./types.ts";
export * from "./scan.ts";
export * from "./claude.ts";
export * from "./codex.ts";

export type CostSourceRegistry = Registry<CostSource>;

export function defaultCostSources(): CostSourceRegistry {
  return new Registry<CostSource>("cost source")
    .register(new ClaudeCostSource())
    .register(new CodexCostSource());
}
