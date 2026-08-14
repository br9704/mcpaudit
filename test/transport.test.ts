import { describe, expect, it } from "vitest";
import { tokenizeCommand } from "../src/transport/stdio.js";
import { encodeHeaderValue, parseSseEvents, HttpTransport } from "../src/transport/http.js";
import { detectTargetKind } from "../src/transport/detect.js";

describe("tokenizeCommand", () => {
  it("splits on whitespace", () => {
    expect(tokenizeCommand("npx -y @scope/server")).toEqual(["npx", "-y", "@scope/server"]);
  });

  it("honours quotes so paths with spaces survive", () => {
    expect(tokenizeCommand(`node "/tmp/my server/x.mjs" --flag`)).toEqual([
      "node",
      "/tmp/my server/x.mjs",
      "--flag",
    ]);
    expect(tokenizeCommand(`a 'b c' d`)).toEqual(["a", "b c", "d"]);
  });

  it("preserves an intentionally empty argument", () => {
    expect(tokenizeCommand(`cmd "" x`)).toEqual(["cmd", "", "x"]);
  });

  it("does not expand shell metacharacters", () => {
    // We spawn with shell:false, so these stay inert literals rather than
    // becoming a command-injection vector via a crafted target string.
    expect(tokenizeCommand("srv; rm -rf /")).toEqual(["srv;", "rm", "-rf", "/"]);
    expect(tokenizeCommand("srv $(whoami)")).toEqual(["srv", "$(whoami)"]);
  });
});

describe("detectTargetKind", () => {
  it("treats http/https as an HTTP endpoint", () => {
    expect(detectTargetKind("https://example.com/mcp")).toBe("http");
    expect(detectTargetKind("http://127.0.0.1:3000/mcp")).toBe("http");
  });

  it("treats everything else as a stdio command", () => {
    expect(detectTargetKind("npx -y server")).toBe("stdio");
    expect(detectTargetKind("./server.mjs")).toBe("stdio");
    // Must not be mistaken for a fetchable URL.
    expect(detectTargetKind("file:///etc/passwd")).toBe("stdio");
    expect(detectTargetKind("javascript:alert(1)")).toBe("stdio");
  });
});

describe("encodeHeaderValue", () => {
  it("passes plain ASCII through", () => {
    expect(encodeHeaderValue("get_weather")).toBe("get_weather");
  });

  it("base64-encodes non-ASCII, padded, and sentinel-shaped values", () => {
    expect(encodeHeaderValue("Hello, 世界")).toBe("=?base64?SGVsbG8sIOS4lueVjA==?=");
    expect(encodeHeaderValue(" padded ")).toBe("=?base64?IHBhZGRlZCA=?=");
    expect(encodeHeaderValue("=?base64?literal?=")).toBe(
      "=?base64?PT9iYXNlNjQ/bGl0ZXJhbD89?=",
    );
  });
});

describe("parseSseEvents", () => {
  it("extracts data payloads and ignores keep-alive comments", () => {
    const body = [":", "", "data: {\"a\":1}", "", ": keepalive", "", "data: {\"b\":2}", ""].join(
      "\r\n",
    );
    expect(parseSseEvents(body)).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("joins multi-line data fields", () => {
    expect(parseSseEvents("data: line1\ndata: line2\n\n")).toEqual(["line1\nline2"]);
  });
});

describe("HttpTransport headers", () => {
  it("sets the standard request headers the spec requires", () => {
    const t = new HttpTransport("https://example.com/mcp");
    const h = t.buildHeaders({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(h.get("MCP-Protocol-Version")).toBe("2026-07-28");
    expect(h.get("Mcp-Method")).toBe("tools/list");
    expect(h.get("Accept")).toContain("text/event-stream");
    expect(h.get("Mcp-Name")).toBeNull();
  });

  it("adds Mcp-Name for the methods that require it", () => {
    const t = new HttpTransport("https://example.com/mcp");
    const call = t.buildHeaders({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "get_weather" },
    });
    expect(call.get("Mcp-Name")).toBe("get_weather");

    const read = t.buildHeaders({
      jsonrpc: "2.0",
      id: 2,
      method: "resources/read",
      params: { uri: "file:///a.txt" },
    });
    expect(read.get("Mcp-Name")).toBe("file:///a.txt");
  });

  it("supports overriding and omitting headers, for the mismatch probe", () => {
    const t = new HttpTransport("https://example.com/mcp");
    const h = t.buildHeaders(
      { jsonrpc: "2.0", id: 1, method: "tools/list" },
      { "MCP-Protocol-Version": "1999-01-01", "Mcp-Method": null },
    );
    expect(h.get("MCP-Protocol-Version")).toBe("1999-01-01");
    expect(h.get("Mcp-Method")).toBeNull();
  });
});
