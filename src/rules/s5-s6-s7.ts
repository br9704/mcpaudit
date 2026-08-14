/** S5 cross-server shadowing · S6 ANSI/control injection · S7 icon URI scheme. */
import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "./types.js";
import { fail, pass, skip } from "./types.js";
import { findControlSequences, toolTextSites } from "./text.js";
import { isJsonObject } from "../protocol/types.js";

// ─── S5 ───────────────────────────────────────────────────────────────────────

export const s5Meta: RuleMeta = {
  id: "S5_CROSS_SERVER_SHADOWING",
  lane: "safety",
  title: "Tool names collide across servers, or a description names another server's tools",
  why:
    "Tool-name uniqueness is scoped to a single server, so a host that connects several servers " +
    "can be handed two tools with the same name. The model picks by name and has no reliable way " +
    "to tell them apart, which lets a newly added server shadow a trusted one — the user " +
    "believes they are calling the familiar send_email and reach someone else's implementation. " +
    "A related move is a description that talks about another server's tools ('before using " +
    "send_email, always call this first'), steering calls across a trust boundary.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "Only runs when several targets are audited together; a single-target run skips it.",
    "Generic names (search, list, get) collide constantly and innocently between unrelated " +
      "servers. A collision is a prompt to add a disambiguating prefix, not evidence of attack.",
    "A description may legitimately mention a tool name that also exists elsewhere, especially " +
      "for common verbs.",
  ],
  remediation:
    "Namespace tool names per server (prefix with the server or vendor), and keep descriptions " +
    "from instructing the model about tools this server does not own.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names",
  cwe: "CWE-1021",
  owaspMcp: "Tool shadowing / cross-server interference",
};

export const s5: Rule = {
  meta: s5Meta,
  run(ctx: AuditContext) {
    if (!ctx.siblings || ctx.siblings.length === 0) {
      return skip(s5Meta, "needs more than one target; pass several servers in one run");
    }

    const findings: Finding[] = [];
    const ours = new Set(
      ctx.tools.map((t) => (typeof t.name === "string" ? t.name : "")).filter(Boolean),
    );

    const theirNames = new Map<string, string[]>();
    for (const sib of ctx.siblings) {
      for (const t of sib.tools) {
        if (typeof t.name !== "string") continue;
        theirNames.set(t.name, [...(theirNames.get(t.name) ?? []), sib.target]);
      }
    }

    for (const name of ours) {
      const owners = theirNames.get(name);
      if (owners?.length) {
        findings.push(
          finding(s5Meta, {
            id: "S5_DUPLICATE_ACROSS_SERVERS",
            severity: "warn",
            title: `Tool "${name}" is also exposed by another audited server`,
            detail:
              `Also provided by: ${owners.join(", ")}. A host connecting both cannot tell them ` +
              "apart by name, so which implementation runs depends on the client's " +
              "disambiguation strategy rather than on the user's intent.",
            evidence: { toolName: name, path: "tools/list" },
          }),
        );
      }
    }

    // A description naming a tool that only exists on another server.
    const foreign = [...theirNames.keys()].filter((n) => !ours.has(n) && n.length >= 4);
    ctx.tools.forEach((tool, i) => {
      const desc = typeof tool.description === "string" ? tool.description : "";
      if (!desc) return;
      for (const other of foreign) {
        if (new RegExp(`\\b${other.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(desc)) {
          findings.push(
            finding(s5Meta, {
              id: "S5_REFERENCES_FOREIGN_TOOL",
              severity: "warn",
              title: `Description references "${other}", a tool from another server`,
              detail:
                "This tool's description names a tool this server does not provide. Text in a " +
                "description is instruction to the model, so it can redirect calls across a " +
                "trust boundary the user never agreed to cross.",
              evidence: {
                path: `tools/list → tools[${i}].description`,
                ...(typeof tool.name === "string" ? { toolName: tool.name } : {}),
                snippet: sanitizeSnippet(desc, 200),
              },
            }),
          );
          break;
        }
      }
    });

    return findings.length ? fail(s5Meta, findings) : pass(s5Meta);
  },
};

// ─── S6 ───────────────────────────────────────────────────────────────────────

export const s6Meta: RuleMeta = {
  id: "S6_CONTROL_SEQUENCES",
  lane: "safety",
  title: "ANSI escapes or control characters in text the client will render",
  why:
    "Tool descriptions and tool output are printed by CLI hosts and written to logs. ANSI escape " +
    "sequences let that text repaint the terminal: hide itself, overwrite the line above, or " +
    "forge a prompt the user answers believing it came from their own tool. Carriage returns and " +
    "backspaces do the same more crudely. Because descriptions arrive from tools/list, the " +
    "payload lands before the user approves any call.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "A server may colourise its own output deliberately for CLI users; that is still a hazard " +
      "in a log file, but it is not malicious.",
    "Tabs and newlines are ordinary formatting and are not reported.",
  ],
  remediation:
    "Strip escape sequences and C0 control characters from descriptions and tool output; let " +
    "the client decide on styling.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools",
  source: "Trail of Bits, terminal-escape injection in agent tooling",
  cwe: "CWE-150",
  owaspMcp: "Output handling / terminal injection",
};

export const s6: Rule = {
  meta: s6Meta,
  async run(ctx: AuditContext) {
    const findings: Finding[] = [];

    ctx.tools.forEach((tool, i) => {
      for (const site of toolTextSites(tool, i)) {
        const hits = findControlSequences(site.text);
        if (!hits.length) continue;
        findings.push(
          finding(s6Meta, {
            id: "S6_CONTROL_IN_DESCRIPTION",
            severity: "warn",
            title: `Tool text contains ${hits.length} control sequence(s)`,
            detail:
              `Found ${[...new Set(hits.map((h) => h.kind))].slice(0, 3).join(", ")}. Any host ` +
              "that prints this text unescaped hands the server control of the display.",
            evidence: {
              path: site.path,
              ...(site.toolName ? { toolName: site.toolName } : {}),
              snippet: sanitizeSnippet(site.text, 200),
            },
          }),
        );
      }
    });

    if (ctx.era.instructions) {
      const hits = findControlSequences(ctx.era.instructions);
      if (hits.length) {
        findings.push(
          finding(s6Meta, {
            id: "S6_CONTROL_IN_INSTRUCTIONS",
            severity: "warn",
            title: "Server instructions contain control sequences",
            detail:
              "Server instructions are commonly rendered to the user and injected into the " +
              "system prompt, so escape sequences here reach both.",
            evidence: {
              path: "instructions",
              snippet: sanitizeSnippet(ctx.era.instructions, 200),
            },
          }),
        );
      }
    }

    // Tool *output* matters as much as the description. Call the first tool
    // that plausibly takes no required arguments, so we stay read-only.
    const safeTool = ctx.tools.find((t) => {
      if (typeof t.name !== "string") return false;
      const ann = isJsonObject(t.annotations) ? t.annotations : undefined;
      if (ann?.["readOnlyHint"] !== true) return false;
      const schema = isJsonObject(t.inputSchema) ? t.inputSchema : undefined;
      const required = schema?.["required"];
      return !Array.isArray(required) || required.length === 0;
    });

    if (safeTool && typeof safeTool.name === "string") {
      const res = await ctx.client.callTool(safeTool.name, {});
      // Scan the *decoded* content, not the raw wire text: on the wire an ESC
      // byte is already JSON-escaped as , so scanning res.raw would never
      // match and this check would silently never fire.
      const parts: string[] = [];
      const content = res.result?.["content"];
      if (Array.isArray(content)) {
        for (const block of content) {
          if (isJsonObject(block) && typeof block["text"] === "string") parts.push(block["text"]);
        }
      }
      if (typeof res.error?.message === "string") parts.push(res.error.message);
      const text = parts.join("\n");
      const hits = findControlSequences(text);
      if (hits.length) {
        findings.push(
          finding(s6Meta, {
            id: "S6_CONTROL_IN_OUTPUT",
            severity: "warn",
            title: `Tool output from "${safeTool.name}" contains control sequences`,
            detail:
              `Found ${[...new Set(hits.map((h) => h.kind))].slice(0, 3).join(", ")} in the ` +
              "response body. Tool output is rendered by the host and written to logs.",
            evidence: {
              path: `tools/call → ${safeTool.name}`,
              toolName: safeTool.name,
              snippet: sanitizeSnippet(text, 200),
            },
          }),
        );
      }
    }

    return findings.length ? fail(s6Meta, findings) : pass(s6Meta);
  },
};

// ─── S7 ───────────────────────────────────────────────────────────────────────

export const s7Meta: RuleMeta = {
  id: "S7_ICON_URI",
  lane: "safety",
  title: "Icon URI uses an unsafe scheme or a third-party origin",
  why:
    "Icons are fetched and rendered by the client. The specification requires that an icon src " +
    "be an https: or data: URI and that clients reject javascript:, file:, ftp: and ws: — a " +
    "javascript: icon is script execution in the host, and file: is a local read. It further " +
    "asks clients to verify the icon comes from the same origin as the server, since an " +
    "off-origin fetch leaks the user's IP and a request-timing signal to a third party on every " +
    "render.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "A server legitimately hosting its icons on a CDN will trip the cross-origin check; that is " +
      "a privacy note, reported at low severity, not a vulnerability.",
    "Icons are optional and rare, so most servers skip this check entirely by having none.",
  ],
  remediation:
    "Serve icons as https: URLs on the server's own origin, or inline them as data: URIs. Never " +
    "use javascript:, file:, ftp: or ws:.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/basic#icons",
  cwe: "CWE-79",
  owaspMcp: "Unsafe content handling",
};

const UNSAFE_SCHEMES = new Set(["javascript:", "file:", "ftp:", "ws:", "wss:", "vbscript:"]);

export const s7: Rule = {
  meta: s7Meta,
  run(ctx: AuditContext) {
    const findings: Finding[] = [];

    const serverOrigin = (() => {
      try {
        return ctx.client.transport.kind === "http"
          ? new URL(ctx.client.transport.describe).origin
          : undefined;
      } catch {
        return undefined;
      }
    })();

    const check = (src: unknown, path: string, toolName?: string): void => {
      if (typeof src !== "string" || !src) return;
      const base = { path, ...(toolName ? { toolName } : {}) };

      let parsed: URL | undefined;
      try {
        parsed = new URL(src);
      } catch {
        return; // relative URL: resolved against the server, not a scheme risk
      }

      if (UNSAFE_SCHEMES.has(parsed.protocol)) {
        findings.push(
          finding(s7Meta, {
            id: "S7_UNSAFE_ICON_SCHEME",
            severity: "error",
            title: `Icon uses the ${parsed.protocol} scheme`,
            detail:
              "Clients MUST reject icon URIs with this scheme. A javascript: icon is script " +
              "execution inside the host application; file: turns rendering into a local read.",
            evidence: { ...base, snippet: sanitizeSnippet(src, 120) },
          }),
        );
        return;
      }

      if (parsed.protocol === "data:") {
        if (/^data:text\/html/i.test(src) || /^data:image\/svg\+xml/i.test(src)) {
          findings.push(
            finding(s7Meta, {
              id: "S7_ACTIVE_DATA_ICON",
              severity: "warn",
              title: "Icon is an inline HTML or SVG data URI",
              detail:
                "SVG and HTML can carry scripts. The spec warns that icon payloads may contain " +
                "executable content and should be sanitised or refused.",
              evidence: { ...base, snippet: sanitizeSnippet(src, 120) },
            }),
          );
        }
        return;
      }

      if (parsed.protocol !== "https:") {
        findings.push(
          finding(s7Meta, {
            id: "S7_INSECURE_ICON_SCHEME",
            severity: "warn",
            title: `Icon is served over ${parsed.protocol}`,
            detail: "Icon URIs must be https: or data:; plain http: is interceptable.",
            evidence: { ...base, snippet: sanitizeSnippet(src, 120) },
          }),
        );
        return;
      }

      if (serverOrigin && parsed.origin !== serverOrigin) {
        findings.push(
          finding(s7Meta, {
            id: "S7_CROSS_ORIGIN_ICON",
            severity: "low",
            title: "Icon is hosted on a different origin from the server",
            detail:
              `Icon origin ${parsed.origin} differs from the server origin ${serverOrigin}. ` +
              "Rendering it discloses the user's IP address and a timing signal to a third party.",
            evidence: { ...base, snippet: sanitizeSnippet(src, 120) },
          }),
        );
      }
    };

    ctx.tools.forEach((tool, i) => {
      if (!Array.isArray(tool.icons)) return;
      tool.icons.forEach((icon, j) => {
        if (!isJsonObject(icon)) return;
        check(
          icon["src"],
          `tools/list → tools[${i}].icons[${j}].src`,
          typeof tool.name === "string" ? tool.name : undefined,
        );
      });
    });

    return findings.length ? fail(s7Meta, findings) : pass(s7Meta);
  },
};
