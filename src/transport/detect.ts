import type { Transport } from "./types.js";
import { StdioTransport } from "./stdio.js";
import { HttpTransport } from "./http.js";

export type TargetKind = "stdio" | "http";

/**
 * A target that parses as an http/https URL is a Streamable HTTP endpoint;
 * anything else is a command to spawn over stdio.
 *
 * Deliberately narrow: only http/https count. A `file:` or `javascript:` string
 * must not be mistaken for a URL target and silently fetched.
 */
export function detectTargetKind(target: string): TargetKind {
  try {
    const u = new URL(target);
    if (u.protocol === "http:" || u.protocol === "https:") return "http";
  } catch {
    /* not a URL */
  }
  return "stdio";
}

export function createTransport(
  target: string,
  passthrough: readonly string[] = [],
): Transport {
  return detectTargetKind(target) === "http"
    ? new HttpTransport(target)
    : new StdioTransport(target, passthrough);
}
