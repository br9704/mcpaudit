import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as {
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  bin?: Record<string, string>;
};

/**
 * Masterplan amendment A5. These are load-bearing claims in the README's
 * supply-chain table, so they are enforced rather than asserted in prose.
 */
describe("supply chain", () => {
  it("has zero runtime dependencies", () => {
    const deps = Object.keys(pkg.dependencies ?? {});
    expect(deps).toEqual([]);
  });

  it("declares no install lifecycle scripts", () => {
    // npm v12 makes lifecycle scripts opt-in; a CLI needing postinstall breaks
    // under `npx`. Also: a security tool that runs code on install is a bad joke.
    const forbidden = ["preinstall", "install", "postinstall", "prepare"];
    const present = forbidden.filter((s) => pkg.scripts?.[s] !== undefined);
    expect(present).toEqual([]);
  });

  it("exposes the binary through the brand constant", async () => {
    const { BIN_NAME } = await import("../src/brand.js");
    expect(Object.keys(pkg.bin ?? {})).toEqual([BIN_NAME]);
  });
});
