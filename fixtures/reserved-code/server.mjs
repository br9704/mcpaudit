#!/usr/bin/env node
/**
 * Conformant except for one thing: every tools/call error uses -32050, a code
 * inside the -32020..-32099 range the MCP specification reserves for itself but
 * has not allocated. A conforming client is entitled to read codes from that
 * range as spec-defined, so squatting in it is a real interoperability hazard.
 *
 * Exists as the pass/fail counterpart for C6_RESERVED_CODE_MISUSE, which
 * modern-bad cannot cover because it uses its unknown-tool path for a
 * different defect.
 */
const PROTOCOL_VERSION = "2026-07-28";
const SERVER_INFO = { name: "mcpaudit-fixture-reserved-code", version: "1.0.0" };
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

function write(msg) {
  process.stdout.write(JSON.stringify(msg).replace(/\n/g, "") + "\n");
}
const ok = (id, result) =>
  write({
    jsonrpc: "2.0",
    id,
    result: { resultType: "complete", _meta: { [META_SERVER_INFO]: SERVER_INFO }, ...result },
  });
const fail = (id, code, message) => write({ jsonrpc: "2.0", id, error: { code, message } });


const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const META_CAPS = "io.modelcontextprotocol/clientCapabilities";
/** Required-_meta validation, so these fixtures are conformance-clean and the
 * safety/drift signal under test is not buried in Lane A noise. */
function validateMeta(id, params) {
  const meta = params?._meta;
  if (!meta || typeof meta !== "object") { fail(id, -32602, 'Invalid params: missing required "_meta"'); return false; }
  if (typeof meta[META_VERSION] !== "string") { fail(id, -32602, 'Invalid params: missing required protocolVersion'); return false; }
  if (typeof meta[META_CAPS] !== "object" || meta[META_CAPS] === null) { fail(id, -32602, 'Invalid params: missing required clientCapabilities'); return false; }
  return true;
}

function handle({ id, method, params }) {
  if (id === undefined) return;
  if (method === "server/discover") {
    if (!validateMeta(id, params)) return;
    return ok(id, {
      supportedVersions: [PROTOCOL_VERSION],
      capabilities: { tools: {} },
      ttlMs: 3600000,
      cacheScope: "public",
    });
  }
  if (method === "tools/list") {
    if (!validateMeta(id, params)) return;
    return ok(id, {
      tools: [{ name: "solo", description: "The only tool.", inputSchema: { type: "object" } }],
      ttlMs: 300000,
      cacheScope: "public",
    });
  }
  // The defect: a reserved-range code the specification never defined.
  if (method === "tools/call") return fail(id, -32050, "Something went wrong");
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
      /* ignore */
    }
  }
});
process.stdin.on("end", () => process.exit(0));
