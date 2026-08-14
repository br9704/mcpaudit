#!/usr/bin/env node
/**
 * A fully 2026-07-28-conformant MCP server, over stdio, with zero dependencies.
 *
 * This exists because as of 2026-08 no shipping server or SDK implements the
 * current revision (the official `server-everything@2026.7.4` is a 2025-06-18
 * server). Without this fixture there is nothing on earth to test the modern
 * lane against.
 *
 * Every behaviour here is deliberate and traceable to the spec:
 *   - `server/discover` is implemented (MUST)
 *   - required `_meta` keys are validated → -32602 (MUST)
 *   - every result carries `resultType` (MUST)
 *   - list results carry `ttlMs` + `cacheScope` (MUST)
 *   - results carry `_meta['io.modelcontextprotocol/serverInfo']` (SHOULD)
 *   - unknown method → -32601; unknown tool → -32602
 */
const PROTOCOL_VERSION = "2026-07-28";
const SERVER_INFO = { name: "mcpaudit-fixture-modern-good", version: "1.0.0" };

const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const META_CAPS = "io.modelcontextprotocol/clientCapabilities";
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

const TOOLS = [
  {
    name: "echo",
    title: "Echo",
    description: "Returns the message it was given.",
    inputSchema: {
      type: "object",
      properties: { message: { type: "string", description: "Text to echo back." } },
      required: ["message"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "add",
    title: "Add",
    description: "Adds two numbers and returns the sum.",
    inputSchema: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

function write(msg) {
  process.stdout.write(JSON.stringify(msg).replace(/\n/g, "") + "\n");
}

function ok(id, result) {
  write({
    jsonrpc: "2.0",
    id,
    result: { resultType: "complete", _meta: { [META_SERVER_INFO]: SERVER_INFO }, ...result },
  });
}

function fail(id, code, message, data) {
  write({ jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });
}

/** Required `_meta` validation. Missing a required field is -32602 per spec. */
function validateMeta(id, params) {
  const meta = params?._meta;
  if (!meta || typeof meta !== "object") {
    fail(id, -32602, `Invalid params: missing required "_meta"`);
    return false;
  }
  if (typeof meta[META_VERSION] !== "string") {
    fail(id, -32602, `Invalid params: missing required "_meta.${META_VERSION}"`);
    return false;
  }
  if (typeof meta[META_CAPS] !== "object" || meta[META_CAPS] === null) {
    fail(id, -32602, `Invalid params: missing required "_meta.${META_CAPS}"`);
    return false;
  }
  if (meta[META_VERSION] !== PROTOCOL_VERSION) {
    fail(id, -32022, `Unsupported protocol version: ${meta[META_VERSION]}`, {
      supported: [PROTOCOL_VERSION],
    });
    return false;
  }
  return true;
}

function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return; // notification: no response

  if (method === "server/discover") {
    if (!validateMeta(id, params)) return;
    return ok(id, {
      supportedVersions: [PROTOCOL_VERSION],
      capabilities: { tools: { listChanged: false } },
      instructions: "A minimal conformant fixture server exposing echo and add.",
      ttlMs: 3600000,
      cacheScope: "public",
    });
  }

  if (method === "tools/list") {
    if (!validateMeta(id, params)) return;
    // Deterministic order (SHOULD) — sorted by name, stable across calls.
    return ok(id, {
      tools: [...TOOLS].sort((a, b) => a.name.localeCompare(b.name)),
      ttlMs: 300000,
      cacheScope: "public",
    });
  }

  if (method === "tools/call") {
    if (!validateMeta(id, params)) return;
    const name = params?.name;
    const tool = TOOLS.find((t) => t.name === name);
    // Unknown tool is a protocol error with -32602 (not -32601).
    if (!tool) return fail(id, -32602, `Unknown tool: ${String(name)}`);

    const args = params?.arguments ?? {};
    if (name === "echo") {
      if (typeof args.message !== "string") {
        return ok(id, {
          content: [{ type: "text", text: "message must be a string" }],
          isError: true,
        });
      }
      return ok(id, { content: [{ type: "text", text: args.message }], isError: false });
    }
    if (name === "add") {
      if (typeof args.a !== "number" || typeof args.b !== "number") {
        return ok(id, {
          content: [{ type: "text", text: "a and b must be numbers" }],
          isError: true,
        });
      }
      return ok(id, {
        content: [{ type: "text", text: String(args.a + args.b) }],
        structuredContent: { sum: args.a + args.b },
        isError: false,
      });
    }
  }

  return fail(id, -32601, `Method not found: ${String(method)}`);
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
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }
    try {
      handle(msg);
    } catch (err) {
      if (msg?.id !== undefined) fail(msg.id, -32603, `Internal error: ${err.message}`);
    }
  }
});
// Exit promptly when stdin closes — the portable graceful-shutdown signal.
process.stdin.on("end", () => process.exit(0));
