/** Public entry point. The CLI is the primary surface; this exists so the
 * checks can be consumed programmatically later without reshaping the package. */
export * from "./brand.js";
export { VERSION } from "./version.js";
export { parseArgs, ArgError } from "./args.js";
export type { ParsedArgs, Severity, IconMode } from "./args.js";
