/**
 * The MCP surface, so an agent can ask about its own budget.
 *
 * Implemented directly against the JSON-RPC wire format rather than through an
 * SDK: the protocol surface Overton needs is `initialize`, `tools/list` and
 * `tools/call`, and a dependency-free server is one less thing to keep current
 * in a component whose whole pitch is that it is small enough to adopt.
 *
 * The tools are deliberately read-mostly. An agent should be able to find out
 * why it was refused and what else it could use; opening and releasing claims
 * belongs to the harness that actually runs the work, not to the model.
 */

import { renderDecision } from "@overton/core";
import { accountViews, ledgerView, projectViews, type Overton } from "@overton/engine";

const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run(o: Overton, args: any): unknown;
}

export const TOOLS: Tool[] = [
  {
    name: "overton_ask",
    description:
      "Ask whether a project may dispatch an agent on an account right now. Returns a verdict of " +
      "go / wait / ask / deny, the reason, and how long to wait. Omit `account` to get an answer " +
      "for every account the project may use, best first.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project id from Overton's config" },
        account: { type: "string", description: "Account id; omit to compare all eligible accounts" },
      },
      required: ["project"],
    },
    run: (o, a) => (a.account ? o.ask(a.project, a.account) : o.askAll(a.project)),
  },
  {
    name: "overton_explain",
    description:
      "The full set of facts behind a decision: window readings, freshness, allocation, points used, " +
      "elapsed fraction, open claims. Use this to understand a refusal rather than guessing at it.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string" },
        account: { type: "string" },
      },
      required: ["project", "account"],
    },
    run: (o, a) => o.facts(a.project, a.account),
  },
  {
    name: "overton_accounts",
    description: "Every account: provider, plan, window utilization, reset times, open claims.",
    inputSchema: { type: "object", properties: {} },
    run: (o) => accountViews(o),
  },
  {
    name: "overton_projects",
    description: "Every project's share, allocation, points used and pace on each account it may use.",
    inputSchema: { type: "object", properties: {} },
    run: (o) => projectViews(o),
  },
  {
    name: "overton_ledger",
    description:
      "How one account's window was actually spent, split by project, with the confidence of each " +
      "attribution and the vendor's own total for comparison.",
    inputSchema: {
      type: "object",
      properties: {
        account: { type: "string" },
        window: { type: "string", description: "seven_day (default) or five_hour" },
      },
      required: ["account"],
    },
    run: (o, a) => ledgerView(o, a.account, a.window),
  },
];

export function handleRpc(o: Overton, req: JsonRpcRequest): object | null {
  const reply = (result: unknown) => ({ jsonrpc: "2.0" as const, id: req.id ?? null, result });
  const fail = (code: number, message: string) => ({
    jsonrpc: "2.0" as const,
    id: req.id ?? null,
    error: { code, message },
  });

  switch (req.method) {
    case "initialize":
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "overton", version: "0.1.0" },
      });

    // Notifications carry no id and must not be answered at all.
    case "notifications/initialized":
      return null;

    case "tools/list":
      return reply({
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });

    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === req.params?.name);
      if (!tool) return fail(-32602, `no tool named \`${req.params?.name}\``);
      try {
        const result = tool.run(o, req.params?.arguments ?? {});
        // Decisions get a prose rendering as well as the JSON: a model reading
        // "wait 4h12m, project is over its weekly allocation" acts correctly far
        // more often than one handed a nested object to interpret.
        const pretty =
          result && typeof result === "object" && "verdict" in (result as any)
            ? renderDecision(result as any)
            : JSON.stringify(result, null, 2);
        return reply({ content: [{ type: "text", text: pretty }] });
      } catch (e) {
        // Reported as tool failure, not transport failure: the agent should see
        // the message and adapt rather than have its connection error out.
        return reply({ content: [{ type: "text", text: `error: ${(e as Error).message}` }], isError: true });
      }
    }

    default:
      return fail(-32601, `method not found: ${req.method}`);
  }
}

/** Newline-delimited JSON-RPC over stdio, the transport every MCP client speaks. */
export async function runMcpStdio(o: Overton): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;

      let req: JsonRpcRequest;
      try {
        req = JSON.parse(line);
      } catch {
        process.stdout.write(
          JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n",
        );
        continue;
      }
      const res = handleRpc(o, req);
      if (res) process.stdout.write(JSON.stringify(res) + "\n");
    }
  }
}
