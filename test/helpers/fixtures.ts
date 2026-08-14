import { fileURLToPath } from "node:url";
import { StdioTransport } from "../../src/transport/stdio.js";
import { McpClient } from "../../src/protocol/client.js";

export type FixtureName =
  | "modern-good"
  | "modern-bad"
  | "legacy"
  | "malicious"
  | "benign"
  | "hostile";

export function fixturePath(name: FixtureName): string {
  return fileURLToPath(new URL(`../../fixtures/${name}/server.mjs`, import.meta.url));
}

/** Spawn a fixture server and wrap it in a client. Always `await client.close()`. */
export function fixtureClient(name: FixtureName, args: string[] = []): McpClient {
  const transport = new StdioTransport(`node ${fixturePath(name)}`, args);
  return new McpClient(transport, { timeoutMs: 5000 });
}
