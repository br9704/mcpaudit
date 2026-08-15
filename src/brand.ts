/**
 * THE name constant. Every user-facing occurrence of the product name routes
 * through here, so a rename is a one-line change (CLAUDE.md, "Naming").
 *
 * `mcp-audit` on npm is squatted by a non-functional v0.0.1 stub; per masterplan
 * amendment A1 we ship scoped and do not plan around the dispute.
 */
export const PKG_NAME = "@aethereumdev/mcp-audit";

/** The executable name, i.e. what a user types. */
export const BIN_NAME = "mcpaudit";

/** Human-facing display name used in report headers and `--help`. */
export const DISPLAY_NAME = "mcpaudit";

/** One-liner. Kept in sync with package.json `description`. */
export const TAGLINE =
  "conformance + safety linter for MCP servers";

/**
 * The framing sentence. Locked by CLAUDE.md and reproduced verbatim in the
 * README and `--help`. Overclaiming security is the fastest way to get torn
 * apart publicly by people who do this professionally.
 */
export const FRAMING =
  "a first-pass linter that catches common issues — not a security audit.";

export const REPO_URL = "https://github.com/br9704/mcpaudit";
