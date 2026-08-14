import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "./types.js";
import { fail, pass } from "./types.js";
import { walkSchema } from "./text.js";

export const meta: RuleMeta = {
  id: "S3_CREDENTIAL_EXPOSURE",
  lane: "safety",
  title: "Credential material exposed in schemas, defaults or errors",
  why:
    "Tool schemas are published to every client that lists the server, and error strings flow " +
    "back into the model's context and the user's logs. A live token sitting in a schema default " +
    "is disclosed to everyone who can call tools/list — no exploitation required. Separately, " +
    "revision 2026-07-28 lets a server mirror a parameter into an HTTP header with x-mcp-header, " +
    "and the specification warns explicitly that sensitive values must not be marked this way, " +
    "because header values are visible to every proxy and gateway on the path.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "A parameter named api_key is expected and correct for a tool that proxies a third-party " +
      "API — the parameter existing is not the finding. Only a non-empty default, or a value " +
      "matching a known key format, is treated as a likely real secret.",
    "High-entropy strings are often legitimate: UUIDs, hashes, base64 example payloads and " +
      "opaque resource identifiers all look like secrets to a length-and-entropy test.",
    "Placeholder values such as 'your-api-key-here' or 'xxx' will match a name-based rule while " +
      "being deliberately fake; we exclude obvious placeholders but cannot catch every one.",
    "The error-output probe only sees errors our own malformed call provokes, so a server can " +
      "leak credentials on a path we never exercise.",
  ],
  remediation:
    "Take secrets from the server's environment, never from tool parameters with defaults. " +
    "Remove any default value from a credential parameter, strip credential material from error " +
    "messages, and never mark a sensitive parameter with x-mcp-header.",
  specRef:
    "https://modelcontextprotocol.io/specification/2026-07-28/server/tools#x-mcp-header",
  cwe: "CWE-522",
  owaspMcp: "Credential exposure / insecure secret handling",
};

const SENSITIVE_NAME =
  /(api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|bearer|secret|password|passwd|pwd|credential|private[_-]?key|client[_-]?secret|session[_-]?key)/i;

/** Recognisable key formats. A hit here is strong evidence of a real secret. */
const KEY_PATTERNS: readonly { re: RegExp; label: string }[] = [
  { re: /\bsk-[A-Za-z0-9]{16,}\b/, label: "OpenAI-style secret key" },
  { re: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, label: "GitHub token" },
  { re: /\bAKIA[0-9A-Z]{16}\b/, label: "AWS access key id" },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: "Slack token" },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, label: "Google API key" },
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, label: "private key block" },
  { re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, label: "JWT" },
];

const PLACEHOLDER =
  /^(?:|null|none|xxx+|todo|changeme|your[_-]?(?:api[_-]?)?key(?:[_-]?here)?|<[^>]*>|\{\{.*\}\}|\$\{.*\}|example|dummy|placeholder|test|fake|redacted|\*+)$/i;

function scanForKeys(text: string): { label: string; match: string } | undefined {
  for (const { re, label } of KEY_PATTERNS) {
    const m = re.exec(text);
    if (m) return { label, match: m[0] };
  }
  return undefined;
}

export const rule: Rule = {
  meta,
  async run(ctx: AuditContext) {
    const findings: Finding[] = [];

    ctx.tools.forEach((tool, i) => {
      const name = typeof tool.name === "string" ? tool.name : `tools[${i}]`;
      const schema = tool.inputSchema;
      if (!schema || typeof schema !== "object") return;

      for (const { path, node } of walkSchema(schema, `tools/list → tools[${i}].inputSchema`)) {
        // A default value on a credential-shaped property.
        const def = node["default"];
        const propName = path.split(".").pop() ?? "";
        if (
          typeof def === "string" &&
          def.length > 0 &&
          !PLACEHOLDER.test(def) &&
          SENSITIVE_NAME.test(propName + " " + String(node["title"] ?? ""))
        ) {
          findings.push(
            finding(meta, {
              id: "S3_CREDENTIAL_DEFAULT",
              severity: "error",
              title: `Credential-shaped parameter ships a default value`,
              detail:
                "This parameter is named like a secret and carries a non-empty default, which " +
                "is published to every client that calls tools/list. If the value is live, it " +
                "is already disclosed.",
              evidence: {
                path: `${path}.default`,
                toolName: name,
                snippet: sanitizeSnippet(def, 60),
              },
            }),
          );
        }

        // A recognisable key format anywhere in the schema.
        for (const key of ["default", "const", "description", "example", "pattern"]) {
          const v = node[key];
          if (typeof v !== "string") continue;
          const hit = scanForKeys(v);
          if (hit) {
            findings.push(
              finding(meta, {
                id: "S3_KEY_MATERIAL_IN_SCHEMA",
                severity: "error",
                title: `Schema contains what looks like a ${hit.label}`,
                detail:
                  `A string matching a known ${hit.label} format appears in the tool schema. ` +
                  "Anything in a schema is public to every client that lists this server.",
                evidence: {
                  path: `${path}.${key}`,
                  toolName: name,
                  snippet: sanitizeSnippet(hit.match, 40),
                },
              }),
            );
          }
        }

        // x-mcp-header on a sensitive parameter — new in 2026-07-28.
        const header = node["x-mcp-header"];
        if (typeof header === "string" && SENSITIVE_NAME.test(propName + " " + header)) {
          findings.push(
            finding(meta, {
              id: "S3_SENSITIVE_X_MCP_HEADER",
              severity: "error",
              title: `Sensitive parameter is mirrored into an HTTP header`,
              detail:
                `This parameter is marked x-mcp-header: "${header}", so its value is copied into ` +
                `the Mcp-Param-${header} request header on every call. The specification says ` +
                "servers SHOULD NOT do this for passwords, API keys, tokens or PII, because " +
                "header values are visible to every intermediary on the path and are routinely " +
                "written to proxy access logs.",
              evidence: { path: `${path}.x-mcp-header`, toolName: name },
            }),
          );
        }
      }
    });

    // Does a provoked error leak credential material?
    const probe = await ctx.client.callTool("mcpaudit_credential_probe", {
      __mcpaudit: "malformed-argument-probe",
    });
    const errText = [probe.error?.message ?? "", probe.raw ?? ""].join("\n");
    const hit = scanForKeys(errText);
    if (hit) {
      findings.push(
        finding(meta, {
          id: "S3_CREDENTIAL_IN_ERROR",
          severity: "error",
          title: `Error output contains what looks like a ${hit.label}`,
          detail:
            "A malformed tool call produced an error containing a string that matches a known " +
            "credential format. Error text flows into the model's context and into logs.",
          evidence: { path: "tools/call (error output)", snippet: sanitizeSnippet(hit.match, 40) },
        }),
      );
    }

    return findings.length ? fail(meta, findings) : pass(meta);
  },
};
