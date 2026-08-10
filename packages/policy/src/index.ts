/**
 * The policy registry.
 *
 * Adding a rule of your own is: implement `Policy`, register it, name it in
 * `policy.chain`. Nothing else changes, and because the chain takes the worst
 * verdict rather than the first, your policy cannot accidentally weaken the
 * built-ins — only tighten them.
 */

import { Registry } from "@overton/core";
import type { Policy } from "./types.ts";
import { AccountStopPolicy } from "./builtin/account-stop.ts";
import { ReadingGuardPolicy } from "./builtin/reading-guard.ts";
import { AllocationPolicy } from "./builtin/allocation.ts";
import { ConcurrencyPolicy } from "./builtin/concurrency.ts";

export * from "./types.ts";
export * from "./allocator.ts";
export * from "./chain.ts";
export * from "./builtin/account-stop.ts";
export * from "./builtin/reading-guard.ts";
export * from "./builtin/allocation.ts";
export * from "./builtin/concurrency.ts";

export type PolicyRegistry = Registry<Policy>;

export function defaultPolicies(): PolicyRegistry {
  return new Registry<Policy>("policy")
    .register(new AccountStopPolicy())
    .register(new ReadingGuardPolicy())
    .register(new AllocationPolicy())
    .register(new ConcurrencyPolicy());
}
