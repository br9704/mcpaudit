#!/usr/bin/env node
/**
 * A server that is actively hostile to its client — not by attacking the model,
 * but by breaking every assumption a naive implementation makes about the wire.
 *
 * mcpaudit must never crash, hang, leak memory or emit an unhandled rejection
 * against any of these. Select a mode with argv[2]:
 *
 *   garbage      non-JSON on stdout, interleaved with valid frames
 *   truncated    a JSON object cut off mid-string
 *   wrong-shape  responses with neither result nor error, wrong ids, null ids
 *   huge         a very large tools/list
 *   nulls        tools that are null, numbers, strings, arrays
 *   silent       accepts input, answers nothing, ever
 *   slow         answers after a long delay
 *   crash        exits mid-conversation
 *   flood        unsolicited notifications forever
 *   nonewline    writes a valid frame with no trailing newline
 */
const MODE = process.argv[2] ?? "garbage";

function raw(s) {
  process.stdout.write(s);
}
function line(obj) {
  raw(JSON.stringify(obj) + "\n");
}

const okResult = (id, result) => line({ jsonrpc: "2.0", id, result });

function hugeTools() {
  const tools = [];
  for (let i = 0; i < 2000; i++) {
    tools.push({
      name: `tool_${i}`,
      description: "x".repeat(500),
      inputSchema: { type: "object", properties: {} },
    });
  }
  return tools;
}

/** A schema nested deeply enough to blow a naive recursive walker. */
function deepSchema(depth) {
  let node = { type: "object" };
  for (let i = 0; i < depth; i++) node = { type: "object", properties: { next: node } };
  return node;
}

function handle(msg) {
  const id = msg?.id;
  if (id === undefined) return;

  switch (MODE) {
    case "garbage":
      raw("this is not json at all\n");
      raw("<html><body>500 Internal Server Error</body></html>\n");
      okResult(id, { tools: [] });
      raw("}{ still not json\n");
      return;

    case "truncated":
      raw('{"jsonrpc":"2.0","id":' + JSON.stringify(id) + ',"result":{"tools":[{"name":"a","desc\n');
      return;

    case "wrong-shape":
      line({ jsonrpc: "2.0", id }); // neither result nor error
      line({ jsonrpc: "2.0", id: 99999, result: {} }); // id we never sent
      line({ jsonrpc: "2.0", id: null, result: {} });
      line({ result: "not even an object", id });
      return;

    case "huge":
      okResult(id, { tools: hugeTools() });
      return;

    case "nulls":
      okResult(id, {
        tools: [null, 42, "a string", [], { name: null, inputSchema: null }, { name: "ok" }],
      });
      return;

    case "deep":
      okResult(id, {
        tools: [{ name: "deep", description: "d", inputSchema: deepSchema(400) }],
      });
      return;

    case "silent":
      return; // never answers

    case "slow":
      setTimeout(() => okResult(id, { tools: [] }), 30_000).unref?.();
      return;

    case "crash":
      process.exit(1);
      return;

    case "flood":
      for (let i = 0; i < 500; i++) {
        line({ jsonrpc: "2.0", method: "notifications/progress", params: { progress: i } });
      }
      okResult(id, { tools: [] });
      return;

    case "nonewline":
      raw(JSON.stringify({ jsonrpc: "2.0", id, result: { tools: [] } })); // no "\n"
      return;

    default:
      okResult(id, { tools: [] });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let i;
  while ((i = buffer.indexOf("\n")) >= 0) {
    const l = buffer.slice(0, i).trim();
    buffer = buffer.slice(i + 1);
    if (!l) continue;
    try {
      handle(JSON.parse(l));
    } catch {
      raw("could not parse that\n");
    }
  }
});
process.stdin.on("end", () => process.exit(0));
