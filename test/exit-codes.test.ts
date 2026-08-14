import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const LEGACY = fileURLToPath(new URL("../fixtures/legacy/server.mjs", import.meta.url));
const MODERN = fileURLToPath(new URL("../fixtures/modern-good/server.mjs", import.meta.url));

/** Run the built CLI and capture code + stdout, never throwing on non-zero. */
async function cli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await run(process.execPath, [CLI, ...args], {
      maxBuffer: 8 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

/**
 * These drive the real binary end to end. Sprint 0 proved that unit tests alone
 * can pass while the packed CLI is broken, so the exit-code contract is checked
 * against the actual process.
 */
describe("exit codes (end-to-end)", () => {
  it("exits 0 on a clean server", async () => {
    const { code } = await cli([`node ${MODERN}`]);
    expect(code).toBe(0);
  });

  it("exits 1 at the default warn threshold when a warn finding is present", async () => {
    // The legacy fixture answers before initialize (C8), which is a warn.
    const { code, stdout } = await cli([`node ${LEGACY}`]);
    expect(stdout).toContain("pre-2026");
    expect(code).toBe(1);
  });

  it("exits 0 when every finding sits below the threshold", async () => {
    // Same server, but nothing it reports reaches `error`.
    const { code } = await cli([`node ${LEGACY}`, "--fail-on", "error"]);
    expect(code).toBe(0);
  });

  it("exits 1 when --fail-on lowers the threshold to info", async () => {
    const { code } = await cli([`node ${LEGACY}`, "--fail-on", "info"]);
    expect(code).toBe(1);
  });

  it("exits 2 when the server cannot be reached at all", async () => {
    const { code } = await cli(["node -e ''", "--timeout", "1500"]);
    expect(code).toBe(2);
  });

  it("emits parseable JSON with --json", async () => {
    const { stdout } = await cli([`node ${LEGACY}`, "--json"]);
    const parsed = JSON.parse(stdout) as { era: string; findings: unknown[] };
    expect(parsed.era).toBe("legacy");
    expect(Array.isArray(parsed.findings)).toBe(true);
  });

  it("emits parseable SARIF with --sarif", async () => {
    const { stdout } = await cli([`node ${LEGACY}`, "--sarif"]);
    const parsed = JSON.parse(stdout) as { version: string; runs: unknown[] };
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs).toHaveLength(1);
  });

  it("never styles machine-readable output", async () => {
    const { stdout } = await cli([`node ${LEGACY}`, "--json", "--color"]);
    expect(stdout).not.toContain("[");
  });
});
