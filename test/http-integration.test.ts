import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { HttpTransport } from "../src/transport/http.js";
import { McpClient } from "../src/protocol/client.js";
import { detectEra } from "../src/protocol/era.js";

const PROTOCOL_VERSION = "2026-07-28";

interface Recorded {
  headers: Record<string, string | string[] | undefined>;
  method: string;
}

let server: Server;
let url: string;
const recorded: Recorded[] = [];
/** Flip to make the endpoint answer with an SSE stream instead of plain JSON. */
let sseMode = false;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.method !== "POST") {
      // 2026-07-28 removed the GET stream and DELETE session teardown.
      res.writeHead(405).end();
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      recorded.push({ headers: req.headers, method: req.method! });
      const msg = JSON.parse(body) as { id: number; method: string; params?: Record<string, unknown> };

      const headerVersion = req.headers["mcp-protocol-version"];
      const meta = (msg.params?.["_meta"] ?? {}) as Record<string, unknown>;
      const bodyVersion = meta["io.modelcontextprotocol/protocolVersion"];

      const send = (payload: unknown, status = 200) => {
        const text = JSON.stringify(payload);
        if (sseMode && status === 200) {
          res.writeHead(status, { "Content-Type": "text/event-stream" });
          // Keep-alive comment + a progress notification before the response,
          // which is exactly the shape the transport must tolerate.
          res.write(":\r\n\r\n");
          res.write(`data: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } })}\r\n\r\n`);
          res.write(`data: ${text}\r\n\r\n`);
          res.end();
        } else {
          res.writeHead(status, { "Content-Type": "application/json" }).end(text);
        }
      };

      // Header/body mismatch → 400 + -32020.
      if (headerVersion !== bodyVersion) {
        send(
          { jsonrpc: "2.0", id: msg.id, error: { code: -32020, message: "Header mismatch" } },
          400,
        );
        return;
      }

      if (msg.method === "server/discover") {
        send({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            resultType: "complete",
            supportedVersions: [PROTOCOL_VERSION],
            capabilities: { tools: {} },
            ttlMs: 3600000,
            cacheScope: "public",
            _meta: {
              "io.modelcontextprotocol/serverInfo": { name: "http-fixture", version: "1.0.0" },
            },
          },
        });
        return;
      }

      send(
        { jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } },
        404,
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (typeof addr === "object" && addr) url = `http://127.0.0.1:${addr.port}/mcp`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Streamable HTTP transport", () => {
  it("detects a modern server and sends the required headers", async () => {
    recorded.length = 0;
    const client = new McpClient(new HttpTransport(url), { timeoutMs: 5000 });
    const era = await detectEra(client);

    expect(era.era).toBe("modern");
    expect(era.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(era.serverInfo?.name).toBe("http-fixture");

    const first = recorded[0]!;
    expect(first.headers["mcp-protocol-version"]).toBe(PROTOCOL_VERSION);
    expect(first.headers["mcp-method"]).toBe("server/discover");
    expect(String(first.headers["accept"])).toContain("text/event-stream");
  });

  it("parses an SSE response stream and separates notifications from the response", async () => {
    sseMode = true;
    try {
      const client = new McpClient(new HttpTransport(url), { timeoutMs: 5000 });
      const res = await client.discover();
      expect(res.outcome).toBe("result");
      expect(res.http?.contentMode).toBe("sse");
      expect(res.result?.["supportedVersions"]).toEqual([PROTOCOL_VERSION]);
      expect(res.notifications).toHaveLength(1);
      expect(res.notifications[0]?.["method"]).toBe("notifications/progress");
    } finally {
      sseMode = false;
    }
  });

  it("surfaces a header/body mismatch as -32020 with HTTP 400", async () => {
    const client = new McpClient(new HttpTransport(url), { timeoutMs: 5000 });
    const res = await client.discover({
      headerOverrides: { "MCP-Protocol-Version": "1999-01-01" },
    });
    expect(res.outcome).toBe("error");
    expect(res.error?.code).toBe(-32020);
    expect(res.http?.status).toBe(400);
  });

  it("reports unknown methods as -32601 with HTTP 404", async () => {
    const client = new McpClient(new HttpTransport(url), { timeoutMs: 5000 });
    const res = await client.request("no/such/method");
    expect(res.outcome).toBe("error");
    expect(res.error?.code).toBe(-32601);
    expect(res.http?.status).toBe(404);
  });

  it("sees 405 for GET and DELETE, as this revision requires", async () => {
    const t = new HttpTransport(url);
    expect(await t.probeMethod("GET")).toBe(405);
    expect(await t.probeMethod("DELETE")).toBe(405);
  });

  it("times out instead of hanging when the server never replies", async () => {
    const dead = createServer(() => {
      /* accept the socket, answer nothing */
    });
    await new Promise<void>((r) => dead.listen(0, "127.0.0.1", r));
    const addr = dead.address();
    const deadUrl = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}/mcp`;
    try {
      const client = new McpClient(new HttpTransport(deadUrl), { timeoutMs: 400 });
      const res = await client.discover();
      expect(res.outcome).toBe("timeout");
    } finally {
      await new Promise<void>((r) => dead.close(() => r()));
    }
  });
});
