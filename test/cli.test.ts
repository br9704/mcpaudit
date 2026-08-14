import { afterEach, describe, expect, it, vi } from "vitest";
import { EXIT_ERROR, EXIT_OK, main } from "../src/cli.js";
import { FRAMING } from "../src/brand.js";

function captureStdout() {
  const chunks: string[] = [];
  const spy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((c: unknown) => (chunks.push(String(c)), true));
  return { chunks, spy };
}

function captureStderr() {
  const chunks: string[] = [];
  const spy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((c: unknown) => (chunks.push(String(c)), true));
  return { chunks, spy };
}

afterEach(() => vi.restoreAllMocks());

describe("cli", () => {
  it("--help exits 0 and carries the locked framing verbatim", async () => {
    const { chunks } = captureStdout();
    const code = await main(["--help"]);
    expect(code).toBe(EXIT_OK);
    // CLAUDE.md: the framing is non-negotiable and appears in the CLI surface.
    expect(chunks.join("")).toContain(FRAMING);
  });

  it("--version prints just the version", async () => {
    const { chunks } = captureStdout();
    const code = await main(["--version"]);
    expect(code).toBe(EXIT_OK);
    expect(chunks.join("").trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exits 2 with no target", async () => {
    const { chunks } = captureStderr();
    expect(await main([])).toBe(EXIT_ERROR);
    expect(chunks.join("")).toContain("no target");
  });

  it("exits 2 on a bad flag instead of throwing", async () => {
    const { chunks } = captureStderr();
    expect(await main(["t", "--bogus"])).toBe(EXIT_ERROR);
    expect(chunks.join("")).toContain("unknown option");
  });
});
