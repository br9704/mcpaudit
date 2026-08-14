#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BIN_NAME, DISPLAY_NAME, FRAMING, REPO_URL, TAGLINE } from "./brand.js";
import { VERSION } from "./version.js";
import { ArgError, parseArgs } from "./args.js";
import { audit, pin, readToolSurface } from "./engine.js";
import { readFile, writeFile } from "node:fs/promises";
import { parseBaseline, serializeBaseline, type Baseline } from "./pin/baseline.js";
import { ALL_RULES, ALL_RULE_META } from "./registry.js";
import { atOrAbove, maxSeverity, type AuditReport } from "./schema/finding.js";
import { renderTerminal } from "./report/terminal.js";
import { renderJson, renderJsonMany } from "./report/json.js";
import { renderSarifMany } from "./report/sarif.js";
import { Theme } from "./report/theme.js";

/** Exit codes are part of the CI contract (masterplan Sprint 2). */
export const EXIT_OK = 0;
export const EXIT_FINDINGS = 1;
export const EXIT_ERROR = 2;

/**
 * The CLI's own surface is part of the pitch, so `--help` is styled with the
 * same inherited ccline design system as the report: ANSI-16 by index, bold as
 * the only emphasis, and a clean collapse to plain monospace off-TTY.
 */
function helpText(theme: Theme): string {
  const h = (s: string) => theme.bold(s); // section headings
  const f = (s: string) => theme.paint(14, s); // flags, matching the brand accent
  const d = (s: string) => theme.dim(s); // secondary text

  return `${theme.paint(14, theme.bold(DISPLAY_NAME))} ${d(`v${VERSION}`)} — ${TAGLINE}

  ${d(FRAMING)}

${h("USAGE")}
  ${f(BIN_NAME)} [options] <target...> [-- <server args>]

  <target>  ${d("a URL")}           → Streamable HTTP transport
            ${d("a command")}       → stdio transport ${d('(e.g. "npx -y @scope/server")')}

${h("OPTIONS")}
  ${f("--json")}                  machine-readable report on stdout
  ${f("--sarif")}                 SARIF 2.1.0 report ${d("(GitHub code scanning)")}
  ${f("--fail-on <level>")}       exit 1 at or above this severity
                          ${d("info|warn|low|error            (default: warn)")}
  ${f("--pin[=<path>]")}          write a baseline snapshot      ${d("(default: .mcpaudit-baseline.json)")}
  ${f("--baseline <path>")}       diff against a baseline; drift is a finding
  ${f("--timeout <ms>")}          per-request timeout            ${d("(default: 10000)")}
  ${f("--color")} / ${f("--no-color")}    force or disable ANSI colour   ${d("(NO_COLOR respected)")}
  ${f("--icons <mode>")}          auto|plain|nerd|none           ${d("(default: auto)")}
  ${f("-h, --help")}              show this help
  ${f("-v, --version")}           show version

${h("EXIT CODES")}
  ${theme.paint(10, "0")}  clean
  ${theme.paint(11, "1")}  findings at or above --fail-on
  ${theme.paint(9, "2")}  tool or connection error

${h("EXAMPLES")}
  ${d(`${BIN_NAME} "npx -y @modelcontextprotocol/server-everything"`)}
  ${d(`${BIN_NAME} https://example.com/mcp --sarif > mcp.sarif`)}
  ${d(`${BIN_NAME} "npx -y my-server" --pin`)}
  ${d(`${BIN_NAME} "npx -y my-server" --baseline .mcpaudit-baseline.json`)}

  ${d(REPO_URL)}
`;
}


export async function main(argv: readonly string[]): Promise<number> {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    if (err instanceof ArgError) {
      process.stderr.write(`${BIN_NAME}: ${err.message}\n\nTry \`${BIN_NAME} --help\`.\n`);
      return EXIT_ERROR;
    }
    throw err;
  }

  if (args.help) {
    process.stdout.write(helpText(Theme.resolve({ color: args.color, icons: args.icons })));
    return EXIT_OK;
  }

  if (args.version) {
    process.stdout.write(`${VERSION}\n`);
    return EXIT_OK;
  }

  if (args.targets.length === 0) {
    process.stderr.write(
      `${BIN_NAME}: no target given.\n\nTry \`${BIN_NAME} --help\`.\n`,
    );
    return EXIT_ERROR;
  }

  try {
    // --pin writes a snapshot and exits; it is a separate mode, not a report.
    if (args.pin !== undefined) {
      const now = new Date().toISOString();
      for (const target of args.targets) {
        const baseline = await pin({
          target,
          passthrough: args.passthrough,
          timeoutMs: args.timeoutMs,
          now,
        });
        const path =
          args.targets.length === 1
            ? args.pin
            : args.pin.replace(/(\.json)?$/, `.${baseline.server.name ?? "server"}$1`);
        await writeFile(path, serializeBaseline(baseline), "utf8");
        process.stderr.write(
          `${BIN_NAME}: pinned ${baseline.tools.length} tool(s) from ` +
            `${baseline.server.name ?? target} to ${path}\n`,
        );
      }
      return EXIT_OK;
    }

    let baseline: Baseline | undefined;
    if (args.baseline !== undefined) {
      try {
        baseline = parseBaseline(await readFile(args.baseline, "utf8"));
      } catch (err) {
        process.stderr.write(
          `${BIN_NAME}: could not read baseline ${args.baseline}: ` +
            `${err instanceof Error ? err.message : String(err)}\n`,
        );
        return EXIT_ERROR;
      }
    }

    // Cross-server shadowing needs every target's tool surface, so with more
    // than one target we read the others first and hand them to each audit.
    const surfaces =
      args.targets.length > 1
        ? await Promise.all(
            args.targets.map(async (t) => ({
              target: t,
              tools: await readToolSurface(t, args.passthrough, args.timeoutMs),
            })),
          )
        : [];

    const reports: AuditReport[] = [];
    for (const target of args.targets) {
      reports.push(
        await audit({
          target,
          passthrough: args.passthrough,
          timeoutMs: args.timeoutMs,
          rules: ALL_RULES,
          siblings: surfaces.filter((s) => s.target !== target),
          ...(baseline ? { baseline } : {}),
        }),
      );
    }

    if (args.json) {
      process.stdout.write(
        reports.length === 1 ? renderJson(reports[0]!) : renderJsonMany(reports),
      );
    } else if (args.sarif) {
      process.stdout.write(renderSarifMany(reports, ALL_RULE_META));
    } else {
      const theme = Theme.resolve({ color: args.color, icons: args.icons });
      for (const r of reports) process.stdout.write(renderTerminal(r, theme));
    }

    // Exit 2 if we could not talk to a server at all; findings are exit 1.
    if (reports.some((r) => r.era === "unknown")) return EXIT_ERROR;

    const worst = maxSeverity(reports.flatMap((r) => r.findings));
    return worst !== undefined && atOrAbove(worst, args.failOn) ? EXIT_FINDINGS : EXIT_OK;
  } catch (err) {
    process.stderr.write(
      `${BIN_NAME}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return EXIT_ERROR;
  }
}

/**
 * True when this module is the process entry point. Compares real paths: npm
 * installs `bin` as a symlink in node_modules/.bin, so a naive
 * `import.meta.url === file://${process.argv[1]}` check silently fails under
 * `npx` and the CLI produces no output at all.
 */
function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

// Only run when invoked as a binary, so tests can import `main` freely.
if (isEntryPoint()) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err: unknown) => {
      process.stderr.write(`${BIN_NAME}: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = EXIT_ERROR;
    });
}
