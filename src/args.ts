/**
 * Hand-rolled argument parser.
 *
 * Masterplan amendment A5: zero runtime dependencies. A security tool's own
 * supply chain is part of its pitch, so we do not pull in `commander` for what
 * is ~100 lines of parsing.
 *
 * Grammar:
 *   mcpaudit [options] <target...> [-- <args passed to a stdio server>]
 *
 * A target is either a URL (Streamable HTTP) or a command (stdio).
 */

export type Severity = "info" | "low" | "warn" | "error";
export type IconMode = "auto" | "plain" | "nerd" | "none";

export interface ParsedArgs {
  targets: string[];
  /** Args after `--`, forwarded verbatim to a stdio server command. */
  passthrough: string[];
  json: boolean;
  sarif: boolean;
  failOn: Severity;
  /** `--pin [path]`; undefined when not requested. */
  pin?: string;
  baseline?: string;
  timeoutMs: number;
  color: boolean;
  /** True when `--color` was passed explicitly, which forces colour off-TTY. */
  colorForced: boolean;
  icons: IconMode;
  help: boolean;
  version: boolean;
}

export class ArgError extends Error {}

const SEVERITIES: readonly Severity[] = ["info", "low", "warn", "error"];
const ICON_MODES: readonly IconMode[] = ["auto", "plain", "nerd", "none"];

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_PIN_PATH = ".mcpaudit-baseline.json";

function isSeverity(v: string): v is Severity {
  return (SEVERITIES as readonly string[]).includes(v);
}

function isIconMode(v: string): v is IconMode {
  return (ICON_MODES as readonly string[]).includes(v);
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const out: ParsedArgs = {
    targets: [],
    passthrough: [],
    json: false,
    sarif: false,
    failOn: "warn",
    timeoutMs: DEFAULT_TIMEOUT_MS,
    // Respect the NO_COLOR convention up front; --color/--no-color still wins.
    color: !process.env["NO_COLOR"],
    colorForced: false,
    icons: "auto",
    help: false,
    version: false,
  };

  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg === "--") {
      out.passthrough = argv.slice(i + 1);
      break;
    }

    if (!arg.startsWith("-")) {
      out.targets.push(arg);
      continue;
    }

    // Support --flag=value as well as --flag value.
    const eq = arg.indexOf("=");
    const flag = eq === -1 ? arg : arg.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : arg.slice(eq + 1);

    /** Consume a value for `flag`, from `--flag=v` or the next argv entry. */
    const takeValue = (): string => {
      if (inlineValue !== undefined) return inlineValue;
      const next = argv[i + 1];
      if (next === undefined || next === "--") {
        throw new ArgError(`${flag} requires a value`);
      }
      i++;
      return next;
    };

    switch (flag) {
      case "-h":
      case "--help":
        out.help = true;
        break;
      case "-v":
      case "--version":
        out.version = true;
        break;
      case "--json":
        out.json = true;
        break;
      case "--sarif":
        out.sarif = true;
        break;
      case "--fail-on": {
        const v = takeValue();
        if (!isSeverity(v)) {
          throw new ArgError(
            `--fail-on must be one of ${SEVERITIES.join("|")} (got "${v}")`,
          );
        }
        out.failOn = v;
        break;
      }
      case "--pin":
        // Optional value: `--pin` alone uses the default path.
        out.pin = inlineValue ?? DEFAULT_PIN_PATH;
        break;
      case "--baseline":
        out.baseline = takeValue();
        break;
      case "--timeout": {
        const v = takeValue();
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) {
          throw new ArgError(`--timeout must be a positive number of ms (got "${v}")`);
        }
        out.timeoutMs = n;
        break;
      }
      case "--color":
        out.color = true;
        // Explicit --color means "force", including when stdout is a pipe;
        // that is what --help promises and what the demo capture relies on.
        out.colorForced = true;
        break;
      case "--no-color":
        out.color = false;
        out.colorForced = false;
        break;
      case "--icons": {
        const v = takeValue();
        if (!isIconMode(v)) {
          throw new ArgError(`--icons must be one of ${ICON_MODES.join("|")} (got "${v}")`);
        }
        out.icons = v;
        break;
      }
      default:
        throw new ArgError(`unknown option: ${flag}`);
    }
  }

  return out;
}
