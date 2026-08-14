#!/usr/bin/env node
/**
 * A server that claims 2026-07-28 and gets it wrong in one specific way per
 * check, so every Lane A rule has a fixture that fails it.
 *
 * Deliberate defects:
 *   C1 — DiscoverResult missing capabilities, ttlMs, cacheScope and serverInfo
 *   C2 — a tool with inputSchema:null, a bad-charset name, a duplicate name,
 *        non-deterministic ordering, and no ttlMs/cacheScope on the list
 *   C3 — required _meta is never validated; malformed requests are answered
 *   C4 — unknown methods return a success result instead of -32601
 *   C6 — no resultType anywhere; emits -32050, a reserved code the spec does
 *        not define; an unknown tool returns a plain success result
 */
const PROTOCOL_VERSION = "2026-07-28";

const TOOLS = [
  {
    name: "alpha",
    description: "First tool.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    // C2: inputSchema is null — the one hard MUST in a tool definition.
    name: "broken schema tool!",
    description: "Has a null inputSchema and a name outside the recommended charset.",
    inputSchema: null,
  },
  {
    name: "alpha",
    description: "C2: duplicate name.",
    inputSchema: { type: "array" }, // C2: root type is not "object"
  },
  {
    // Makes the name sequence non-palindromic, so reversing it actually
    // changes the order the C2 determinism check compares.
    name: "zeta",
    description: "Last tool.",
    inputSchema: { type: "object", properties: {} },
  },
];

function write(msg) {
  process.stdout.write(JSON.stringify(msg).replace(/\n/g, "") + "\n");
}
// C6: no resultType, ever.
const ok = (id, result) => write({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => write({ jsonrpc: "2.0", id, error: { code, message } });

let flip = false;

function handle(msg) {
  const { id, method, params } = msg;
  if (id === undefined) return;

  if (method === "server/discover") {
    // C1: advertises versions but omits capabilities/ttlMs/cacheScope/serverInfo.
    return ok(id, { supportedVersions: [PROTOCOL_VERSION] });
  }

  if (method === "tools/list") {
    // C3: never validates _meta — answers even when it is absent entirely.
    // C2: alternates order on each call, with the same tool set.
    flip = !flip;
    const tools = flip ? TOOLS : [...TOOLS].reverse();
    return ok(id, { tools }); // C2: no ttlMs / cacheScope
  }

  if (method === "tools/call") {
    if (params?.name === "reserved") {
      // C6: -32050 is inside the spec-reserved range but undefined by the spec.
      return fail(id, -32050, "Reserved-range code the specification does not define");
    }
    // C6: an unknown tool comes back as a plain success with no error signal.
    return ok(id, { content: [{ type: "text", text: "sure, done" }] });
  }

  // C4: unknown methods succeed instead of returning -32601.
  return ok(id, { content: [{ type: "text", text: "ok" }] });
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
      /* stay quiet */
    }
  }
});
process.stdin.on("end", () => process.exit(0));
