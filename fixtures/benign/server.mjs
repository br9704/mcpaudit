#!/usr/bin/env node
/**
 * The false-positive guard.
 *
 * Every tool here is legitimate but written the way real servers are written:
 * instructional prose in descriptions, credential *parameters* without values,
 * destructive names with honest annotations, local $defs refs, an emoji with a
 * zero-width joiner, and a data: icon. If a Lane B rule fires against this
 * server, that rule is too aggressive to ship — which is exactly what the
 * accompanying test asserts.
 */
const PROTOCOL_VERSION = "2026-07-28";
const SERVER_INFO = { name: "mcpaudit-fixture-benign", version: "1.0.0" };
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";

const TOOLS = [
  {
    name: "delete_file",
    title: "Delete file",
    // Destructive name, but the annotations are honest about it.
    description:
      "Permanently deletes a file at the given path. This cannot be undone, so confirm with the " +
      "user before calling it.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Absolute path to remove." } },
      required: ["path"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  },
  {
    name: "github.create_issue",
    title: "Create issue",
    // Ordinary instructional phrasing that a naive injection rule would flag.
    description:
      "Creates a GitHub issue. You must provide an absolute repository slug. Always call " +
      "list_repositories first if you are unsure which repository the user means.",
    inputSchema: {
      type: "object",
      properties: {
        repo: { type: "string" },
        title: { type: "string" },
        labels: { type: "array", items: { $ref: "#/$defs/label" } },
      },
      required: ["repo", "title"],
      $defs: { label: { type: "string", minLength: 1 } },
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "call_upstream",
    title: "Call upstream API",
    description: "Calls the upstream API on the user's behalf.",
    inputSchema: {
      type: "object",
      properties: {
        // A credential-named parameter with NO default: correct practice.
        api_key: { type: "string", description: "API key. Supplied by the caller." },
        // A placeholder default, which must not be mistaken for a live secret.
        endpoint: { type: "string", default: "your-api-key-here" },
        // High-entropy-looking but innocuous identifiers.
        request_id: { type: "string", default: "550e8400-e29b-41d4-a716-446655440000" },
      },
      required: ["api_key"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "remove_background",
    title: "Remove background",
    // "remove" is a destructive-sounding verb used entirely innocently.
    description: "Removes the background from an image and returns the cutout. 👨‍👩‍👧 family emoji.",
    inputSchema: { type: "object", properties: { imageUrl: { type: "string" } } },
    annotations: { readOnlyHint: true, destructiveHint: false },
  },
  {
    name: "show_chart",
    title: "Show chart",
    description: "Renders a chart.",
    inputSchema: { type: "object", properties: {} },
    // data: PNG icon — explicitly allowed by the spec.
    icons: [
      {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      },
    ],
    annotations: { readOnlyHint: true },
  },
];

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
      instructions:
        "This server manages files and GitHub issues. Ask the user before deleting anything.",
      ttlMs: 3600000,
      cacheScope: "public",
    });
  }
  if (method === "tools/list") {
    if (!validateMeta(id, params)) return;
    return ok(id, { tools: TOOLS, ttlMs: 300000, cacheScope: "public" });
  }
  if (method === "tools/call") {
    if (!validateMeta(id, params)) return;
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return fail(id, -32602, `Unknown tool: ${String(params?.name)}`);
    return ok(id, { content: [{ type: "text", text: "done" }], isError: false });
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
      /* ignore */
    }
  }
});
process.stdin.on("end", () => process.exit(0));
