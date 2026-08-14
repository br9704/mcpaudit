import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "./types.js";
import { fail, pass } from "./types.js";
import { walkSchema } from "./text.js";

export const meta: RuleMeta = {
  id: "S4_SCHEMA_EGRESS_DOS",
  lane: "safety",
  title: "Schema $ref points off-host, or is expensive enough to be a DoS",
  why:
    "JSON Schema 2020-12 allows $ref to name an absolute URI, so a tool schema can ask whatever " +
    "validates it to fetch a URL. Revision 2026-07-28 states that implementations MUST NOT " +
    "automatically dereference a network $ref, and that any opt-in fetcher must reject " +
    "loopback, link-local and private addresses — because a client that follows such a ref " +
    "becomes an SSRF gadget pointed at whatever it can reach, including cloud metadata " +
    "endpoints. The same section asks implementations to bound composition keywords, since " +
    "deeply nested anyOf/allOf/$defs can make validation exponential and turn a schema into a " +
    "denial-of-service payload against the validator.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "Local refs ('#/$defs/Foo') are normal, idiomatic schema reuse and are never reported.",
    "A public https:// $ref to a well-known vocabulary may be intentional and harmless in a " +
      "client that refuses to dereference — which is what the spec already requires.",
    "The depth and subschema thresholds are heuristics chosen to sit well above ordinary " +
      "hand-written schemas; a legitimately large generated schema can exceed them without " +
      "being an attack.",
  ],
  remediation:
    "Inline schema definitions or use local $defs refs. Never point $ref at a network URI, and " +
    "keep composition nesting shallow enough to validate cheaply.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/basic#ref-resolution",
  cwe: "CWE-918",
  owaspMcp: "SSRF / resource exhaustion",
};

const MAX_DEPTH = 20;
const MAX_SUBSCHEMAS = 500;
const MAX_DEFS = 200;

/** Loopback, link-local (incl. cloud metadata), and RFC-1918 ranges. */
function privateHostKind(hostname: string): string | undefined {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1" || h.endsWith(".localhost")) return "loopback";
  if (/^127\./.test(h)) return "loopback";
  if (/^169\.254\./.test(h)) return "link-local (cloud metadata range)";
  if (/^10\./.test(h)) return "RFC-1918 private";
  if (/^192\.168\./.test(h)) return "RFC-1918 private";
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return "RFC-1918 private";
  if (/^(fc|fd)[0-9a-f]{2}:/.test(h)) return "unique-local IPv6";
  if (/^fe80:/.test(h)) return "link-local IPv6";
  if (h === "metadata.google.internal") return "cloud metadata host";
  return undefined;
}

export const rule: Rule = {
  meta,
  run(ctx: AuditContext) {
    const findings: Finding[] = [];

    ctx.tools.forEach((tool, i) => {
      const name = typeof tool.name === "string" ? tool.name : `tools[${i}]`;

      for (const which of ["inputSchema", "outputSchema"] as const) {
        const schema = tool[which];
        if (!schema || typeof schema !== "object") continue;

        const nodes = walkSchema(schema, `tools/list → tools[${i}].${which}`);
        let maxDepth = 0;
        let defsCount = 0;

        for (const { path, node, depth } of nodes) {
          maxDepth = Math.max(maxDepth, depth);
          if (node["$defs"] && typeof node["$defs"] === "object") {
            defsCount += Object.keys(node["$defs"] as object).length;
          }

          const ref = node["$ref"];
          if (typeof ref !== "string" || ref.startsWith("#")) continue;

          let parsed: URL | undefined;
          try {
            parsed = new URL(ref);
          } catch {
            // A relative, non-fragment ref: unusual but not a network fetch.
            continue;
          }

          const kind = privateHostKind(parsed.hostname);
          if (kind) {
            findings.push(
              finding(meta, {
                id: "S4_REF_INTERNAL_ADDRESS",
                severity: "error",
                title: `$ref points at a ${kind} address`,
                detail:
                  `The schema references ${parsed.protocol}//${parsed.host}. Any validator that ` +
                  "dereferences this would issue a request from wherever the client runs, " +
                  "reaching hosts the schema author cannot otherwise reach. The 169.254.169.254 " +
                  "metadata endpoint is the classic target.",
                evidence: { path: `${path}.$ref`, toolName: name, snippet: sanitizeSnippet(ref, 120) },
              }),
            );
          } else if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            findings.push(
              finding(meta, {
                id: "S4_REF_NETWORK_URI",
                severity: "warn",
                title: "$ref points at a network URI",
                detail:
                  `The schema references ${parsed.origin}. Implementations MUST NOT dereference ` +
                  "network refs automatically; a schema that depends on it will either fail to " +
                  "validate or push the client into fetching an attacker-controlled document.",
                evidence: { path: `${path}.$ref`, toolName: name, snippet: sanitizeSnippet(ref, 120) },
              }),
            );
          } else {
            findings.push(
              finding(meta, {
                id: "S4_REF_UNSAFE_SCHEME",
                severity: "error",
                title: `$ref uses the ${parsed.protocol} scheme`,
                detail:
                  "A $ref outside http(s) — file:, ftp:, data: — asks the validator to read " +
                  "something other than a schema, and file: in particular turns validation into " +
                  "a local file read.",
                evidence: { path: `${path}.$ref`, toolName: name, snippet: sanitizeSnippet(ref, 120) },
              }),
            );
          }
        }

        if (maxDepth > MAX_DEPTH || nodes.length > MAX_SUBSCHEMAS || defsCount > MAX_DEFS) {
          findings.push(
            finding(meta, {
              id: "S4_SCHEMA_COMPLEXITY",
              severity: "warn",
              title: "Schema is large enough to be a validator DoS risk",
              detail:
                `Depth ${maxDepth} (limit ${MAX_DEPTH}), ${nodes.length} subschemas (limit ` +
                `${MAX_SUBSCHEMAS}), ${defsCount} $defs (limit ${MAX_DEFS}). Composition ` +
                "keywords can make validation blow up combinatorially, so the spec asks " +
                "implementations to bound them.",
              evidence: { path: `tools/list → tools[${i}].${which}`, toolName: name },
            }),
          );
        }
      }
    });

    return findings.length ? fail(meta, findings) : pass(meta);
  },
};
