import { createRequire } from "node:module";

/**
 * Read the version from package.json at runtime rather than baking it in, so
 * the published binary can never report a version it isn't.
 */
function readVersion(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export const VERSION: string = readVersion();
