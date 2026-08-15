/**
 * Terminal design system, inherited from ccline (CCometixLine,
 * `~/.claude/ccline/themes/*.toml`) rather than invented here.
 *
 * What we inherit:
 *  - the ANSI-16 palette addressed by index (`c16`), never truecolor, so output
 *    renders identically in any terminal and degrades cleanly;
 *  - the plain / nerd_font icon duality;
 *  - segment composition with a `" | "` separator and bold as the only emphasis.
 *
 * CI safety: NO_COLOR, --no-color, or a non-TTY stdout collapses this to pure
 * monospace black-and-white with box drawing, which is the form the masterplan
 * specified. `--json` / `--sarif` are never styled at all.
 */
import type { IconMode } from "../args.js";
import type { CheckStatus, Severity } from "../schema/finding.js";

/** ccline addresses colours as 16-colour indices; so do we. */
export const C16 = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
  brightBlack: 8,
  brightRed: 9,
  brightGreen: 10,
  brightYellow: 11,
  brightBlue: 12,
  brightMagenta: 13,
  brightCyan: 14,
  brightWhite: 15,
} as const;

export const SEPARATOR = " | ";

export interface Icon {
  plain: string;
  nerd: string;
}

export const ICONS = {
  error: { plain: "x", nerd: "" },
  warn: { plain: "!", nerd: "" },
  low: { plain: "-", nerd: "" },
  info: { plain: "i", nerd: "" },
  pass: { plain: "+", nerd: "" },
  skip: { plain: ".", nerd: "" },
  server: { plain: "@", nerd: "" },
  lane: { plain: "#", nerd: "" },
} as const satisfies Record<string, Icon>;

export type IconName = keyof typeof ICONS;

const SEVERITY_COLOR: Record<Severity, number> = {
  error: C16.brightRed,
  warn: C16.brightYellow,
  low: C16.yellow,
  info: C16.brightBlue,
};

const STATUS_COLOR: Record<CheckStatus, number> = {
  pass: C16.brightGreen,
  fail: C16.brightRed,
  skip: C16.brightBlack,
  error: C16.brightMagenta,
};

export interface ThemeOptions {
  color: boolean;
  icons: IconMode;
  /** Terminal width, for rules and wrapping. */
  width: number;
}

export class Theme {
  readonly color: boolean;
  readonly icons: IconMode;
  readonly width: number;

  constructor(opts: ThemeOptions) {
    this.color = opts.color;
    this.icons = opts.icons;
    this.width = opts.width;
  }

  /**
   * Resolve rendering options from flags + environment. Colour is on only for a
   * real TTY that has not opted out, so piping into a file or CI log yields the
   * plain monospace form automatically.
   *
   * An explicit `--color` (`colorForced`) overrides that auto-detection, because
   * `--help` documents the flag as "force or disable ANSI colour" — without
   * this, `--color` was a no-op off-TTY and contradicted its own description.
   */
  static resolve(opts: {
    color: boolean;
    icons: IconMode;
    colorForced?: boolean;
    stream?: NodeJS.WriteStream;
  }): Theme {
    const stream = opts.stream ?? process.stdout;
    const isTty = Boolean(stream.isTTY);
    const color =
      opts.color && (opts.colorForced === true || (isTty && process.env["TERM"] !== "dumb"));

    let icons: IconMode = opts.icons;
    if (icons === "auto") {
      // Nerd-font glyphs are unsafe to assume; ccline ships a plain variant for
      // exactly this reason. Opt in with --icons=nerd.
      icons = isTty ? "plain" : "none";
    }

    const width = Math.max(40, Math.min(stream.columns ?? 80, 120));
    return new Theme({ color, icons, width });
  }

  #sgr(code: string, s: string): string {
    return this.color ? `[${code}m${s}[0m` : s;
  }

  /** Paint with an ANSI-16 index (30–37 / 90–97). */
  paint(c16: number, s: string): string {
    if (!this.color) return s;
    const code = c16 < 8 ? 30 + c16 : 90 + (c16 - 8);
    return this.#sgr(String(code), s);
  }

  bold(s: string): string {
    return this.#sgr("1", s);
  }

  dim(s: string): string {
    return this.paint(C16.brightBlack, s);
  }

  severity(sev: Severity, s: string): string {
    return this.paint(SEVERITY_COLOR[sev], s);
  }

  status(st: CheckStatus, s: string): string {
    return this.paint(STATUS_COLOR[st], s);
  }

  icon(name: IconName): string {
    if (this.icons === "none") return "";
    const ic = ICONS[name];
    return this.icons === "nerd" ? ic.nerd : ic.plain;
  }

  /** `[!]`-style badge; empty string when icons are off. */
  badge(name: IconName): string {
    const g = this.icon(name);
    return g ? `[${g}]` : "";
  }

  rule(char = "─"): string {
    return this.dim(char.repeat(this.width));
  }

  /** Join segments the way ccline does. */
  segments(parts: readonly string[]): string {
    return parts.filter(Boolean).join(this.dim(SEPARATOR));
  }
}
