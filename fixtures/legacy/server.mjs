#!/usr/bin/env node
/**
 * A pre-2026 (`initialize`-era) MCP server, mirroring how the real ecosystem
 * behaves today — including the era-ambiguity hazard the spec warns about:
 * it answers `tools/list` even before `initialize`, exactly as the official
 * `server-everything` does. Check C8 exists because of this.
 *
 * Deliberately legacy: no `server/discover`, no `resultType`, no
 * `ttlMs`/`cacheScope`, no `_meta` validation.
 */
const PROTOCOL_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "echo",
    description: "Echoes back the input string",
    inputSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
];

function write(msg) {
  process.stdout.write(JSON.stringify(msg).replace(/\n/g, "") + "\n");
}
const ok = (id, result) => write({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => write({ jsonrpc: "2.0", id, error: { code, message } });

function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return;

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "mcpaudit-fixture-legacy", version: "0.4.0" },
      instructions: "A pre-2026 fixture server.",
    });
  }

  // Note: no `initialize` gate — this is the hazard, reproduced on purpose.
  if (method === "tools/list") return ok(id, { tools: TOOLS });

  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return fail(id, -32602, `Unknown tool: ${String(params?.name)}`);
    return ok(id, {
      content: [{ type: "text", text: String(params?.arguments?.message ?? "") }],
      isError: false,
    });
  }

  return fail(id, -32601, "Method not found");
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      /* legacy servers are sloppy; stay quiet */
    }
  }
});
process.stdin.on("end", () => process.exit(0));
