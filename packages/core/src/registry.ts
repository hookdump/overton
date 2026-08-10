/**
 * The extension mechanism.
 *
 * Providers, cost sources and policies are all *plugins* keyed by a stable
 * string id. Nothing in Overton reaches for a concrete implementation by name;
 * it asks a registry. That is what makes a new vendor a new file rather than a
 * patch across the codebase, and what lets a user drop in a policy of their own
 * without forking.
 *
 * Registration is explicit and duplicate-hostile. Two plugins claiming one id
 * is a configuration error that should surface at startup, not a silent
 * last-writer-wins that changes which policy guards your budget.
 */

export interface Plugin {
  /** Stable, referenced from config. Kebab-case by convention. */
  readonly id: string;
  /** One line, shown by `overton plugins`. */
  readonly description: string;
}

export class DuplicatePluginError extends Error {
  constructor(kind: string, id: string) {
    super(`two ${kind} plugins both claim the id \`${id}\` — ids must be unique`);
    this.name = "DuplicatePluginError";
  }
}

export class UnknownPluginError extends Error {
  constructor(kind: string, id: string, known: string[]) {
    super(
      `no ${kind} plugin with id \`${id}\`. Known: ${known.length ? known.join(", ") : "(none registered)"}`,
    );
    this.name = "UnknownPluginError";
  }
}

export class Registry<T extends Plugin> {
  private readonly items = new Map<string, T>();

  constructor(readonly kind: string) {}

  register(item: T): this {
    if (this.items.has(item.id)) throw new DuplicatePluginError(this.kind, item.id);
    this.items.set(item.id, item);
    return this;
  }

  /** Replace an existing registration. Tests and deliberate overrides only. */
  override(item: T): this {
    this.items.set(item.id, item);
    return this;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  get(id: string): T {
    const found = this.items.get(id);
    if (!found) throw new UnknownPluginError(this.kind, id, this.ids());
    return found;
  }

  find(id: string): T | undefined {
    return this.items.get(id);
  }

  /** Registration order, which is the order a chain runs in. */
  all(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }

  /** Resolve a list of ids, failing loudly on the first unknown one. */
  select(ids: readonly string[]): T[] {
    return ids.map((id) => this.get(id));
  }
}
