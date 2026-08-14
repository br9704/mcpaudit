import { describe, expect, it } from "vitest";
import { ArgError, parseArgs } from "../src/args.js";

describe("parseArgs", () => {
  it("defaults sensibly with a single stdio target", () => {
    const a = parseArgs(["npx -y some-server"]);
    expect(a.targets).toEqual(["npx -y some-server"]);
    expect(a.failOn).toBe("warn");
    expect(a.timeoutMs).toBe(10_000);
    expect(a.json).toBe(false);
    expect(a.sarif).toBe(false);
    expect(a.pin).toBeUndefined();
  });

  it("accepts multiple targets for cross-server shadowing checks", () => {
    const a = parseArgs(["serverA", "serverB", "https://example.com/mcp"]);
    expect(a.targets).toHaveLength(3);
  });

  it("forwards everything after -- to the server command", () => {
    const a = parseArgs(["my-server", "--json", "--", "--port", "8080"]);
    expect(a.targets).toEqual(["my-server"]);
    expect(a.json).toBe(true);
    expect(a.passthrough).toEqual(["--port", "8080"]);
  });

  it("supports --flag=value and --flag value", () => {
    expect(parseArgs(["t", "--fail-on=error"]).failOn).toBe("error");
    expect(parseArgs(["t", "--fail-on", "error"]).failOn).toBe("error");
  });

  it("treats --pin as an optional-value flag", () => {
    expect(parseArgs(["t", "--pin"]).pin).toBe(".mcpaudit-baseline.json");
    expect(parseArgs(["t", "--pin=custom.json"]).pin).toBe("custom.json");
  });

  it("rejects bad values rather than silently coercing", () => {
    expect(() => parseArgs(["t", "--fail-on", "catastrophic"])).toThrow(ArgError);
    expect(() => parseArgs(["t", "--timeout", "-5"])).toThrow(ArgError);
    expect(() => parseArgs(["t", "--icons", "emoji"])).toThrow(ArgError);
    expect(() => parseArgs(["t", "--nope"])).toThrow(ArgError);
    expect(() => parseArgs(["t", "--baseline"])).toThrow(ArgError);
  });

  it("honours --no-color and --color", () => {
    expect(parseArgs(["t", "--no-color"]).color).toBe(false);
    expect(parseArgs(["t", "--color"]).color).toBe(true);
  });

  it("parses help and version without a target", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-v"]).version).toBe(true);
  });
});
