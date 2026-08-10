/**
 * The provider registry.
 *
 * `defaultProviders()` returns a fresh registry with the built-ins in it. It is
 * a function rather than a shared singleton so a test — or a second Overton in
 * the same process — can register its own without leaking into anyone else's.
 */

import { Registry } from "@overton/core";
import type { Provider } from "./types.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { CodexProvider } from "./codex.ts";
import { UnmeteredProvider } from "./unmetered.ts";

export * from "./types.ts";
export * from "./credentials.ts";
export * from "./anthropic.ts";
export * from "./codex.ts";
export * from "./unmetered.ts";

export type ProviderRegistry = Registry<Provider>;

export function defaultProviders(): ProviderRegistry {
  return new Registry<Provider>("provider")
    .register(new AnthropicProvider())
    .register(new CodexProvider())
    .register(new UnmeteredProvider());
}
