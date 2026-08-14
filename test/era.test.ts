import { describe, expect, it } from "vitest";
import { detectEra } from "../src/protocol/era.js";
import { fixtureClient } from "./helpers/fixtures.js";
import { StdioTransport } from "../src/transport/stdio.js";
import { McpClient } from "../src/protocol/client.js";

describe("era detection", () => {
  it("classifies a 2026-07-28 server as modern via server/discover", async () => {
    const client = fixtureClient("modern-good");
    try {
      const era = await detectEra(client);
      expect(era.era).toBe("modern");
      expect(era.protocolVersion).toBe("2026-07-28");
      expect(era.supportedVersions).toContain("2026-07-28");
      expect(era.capabilities).toBeDefined();
      expect(era.serverInfo?.name).toBe("mcpaudit-fixture-modern-good");
      expect(era.instructions).toContain("fixture server");
    } finally {
      await client.close();
    }
  });

  it("falls back to initialize for a pre-2026 server", async () => {
    const client = fixtureClient("legacy");
    try {
      const era = await detectEra(client);
      expect(era.era).toBe("legacy");
      expect(era.protocolVersion).toBe("2025-06-18");
      expect(era.serverInfo?.name).toBe("mcpaudit-fixture-legacy");
      // The fallback must be reached by "not a recognized modern response",
      // never by matching one specific error code.
      expect(era.trace.some((s) => s.step === "server/discover")).toBe(true);
      expect(era.trace.some((s) => s.step.startsWith("initialize("))).toBe(true);
    } finally {
      await client.close();
    }
  });

  it("reports unknown rather than crashing when nothing answers", async () => {
    // `true` exits immediately: no discover, no initialize, no output.
    const client = new McpClient(new StdioTransport("node -e ''"), { timeoutMs: 1500 });
    try {
      const era = await detectEra(client);
      expect(era.era).toBe("unknown");
    } finally {
      await client.close();
    }
  });
});

describe("client envelope", () => {
  it("injects the required _meta keys on every request", async () => {
    const client = fixtureClient("modern-good");
    try {
      const meta = client.buildMeta();
      expect(meta["io.modelcontextprotocol/protocolVersion"]).toBe("2026-07-28");
      expect(meta["io.modelcontextprotocol/clientCapabilities"]).toEqual({});
      expect(meta["io.modelcontextprotocol/clientInfo"]).toMatchObject({ name: "mcpaudit" });
    } finally {
      await client.close();
    }
  });

  it("can deliberately omit _meta so the C3 probe can test rejection", async () => {
    const client = fixtureClient("modern-good");
    try {
      const res = await client.listTools({ omitMeta: true });
      expect(res.outcome).toBe("error");
      expect(res.error?.code).toBe(-32602);
    } finally {
      await client.close();
    }
  });

  it("gets a real tools/list back from the modern fixture", async () => {
    const client = fixtureClient("modern-good");
    try {
      await detectEra(client);
      const res = await client.listTools();
      expect(res.outcome).toBe("result");
      expect(res.result?.["resultType"]).toBe("complete");
      expect(res.result?.["ttlMs"]).toBeTypeOf("number");
      expect(res.result?.["cacheScope"]).toBe("public");
      const tools = res.result?.["tools"];
      expect(Array.isArray(tools)).toBe(true);
      expect((tools as { name: string }[]).map((t) => t.name)).toEqual(["add", "echo"]);
    } finally {
      await client.close();
    }
  });
});
