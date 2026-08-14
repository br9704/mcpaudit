import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "./types.js";
import { fail, pass } from "./types.js";
import {
  INJECTION_PHRASES,
  SUSPICIOUS_TAGS,
  findHiddenChars,
  findHomoglyphWords,
  findHtmlComments,
  toolTextSites,
  type TextSite,
} from "./text.js";

export const meta: RuleMeta = {
  id: "S1_TOOL_POISONING",
  lane: "safety",
  title: "Instruction-like or hidden content in tool descriptions",
  why:
    "Tool descriptions and server instructions are fed straight into the model's context, so " +
    "they are an instruction channel, not documentation. Tool poisoning hides directives there " +
    "— telling the model to exfiltrate files, call another tool first, or conceal what it is " +
    "doing — and because most clients show the user only a tool's name, the text doing the " +
    "talking is never seen. Invisible characters and HTML comments make it invisible even to a " +
    "reviewer reading the JSON. This is 'line jumping': the payload lands from tools/list, " +
    "before the user has approved a single call.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "Legitimate tools genuinely explain how they should be used, and phrases like 'you must " +
      "provide an absolute path' or 'always call list_files first' are ordinary guidance. " +
      "Imperative phrasing alone is weak evidence — read the quoted text before acting.",
    "Some servers embed usage examples that quote prompt-injection strings as documentation.",
    "Zero-width joiners are legitimate inside emoji sequences and in scripts such as Devanagari " +
      "and Arabic; only their presence in an otherwise plain-ASCII description is suspicious.",
    "Mixed-script words can be a genuine transliteration in a non-English description.",
  ],
  remediation:
    "Keep tool descriptions purely descriptive. Remove directives aimed at the model, hidden " +
    "characters, and HTML comments. If a tool needs ordering guarantees, express them in the " +
    "schema or in server instructions the user can see.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools",
  source: "Invariant Labs, 'MCP tool poisoning attacks' (April 2025)",
  cwe: "CWE-77",
  owaspMcp: "Prompt/Tool-description injection",
};

const LONG_DESCRIPTION = 2000;

function scanSite(site: TextSite, findings: Finding[]): void {
  const base = {
    path: site.path,
    ...(site.toolName ? { toolName: site.toolName } : {}),
  };

  for (const re of INJECTION_PHRASES) {
    const m = re.exec(site.text);
    if (m) {
      const start = Math.max(0, m.index - 40);
      findings.push(
        finding(meta, {
          id: "S1_INJECTION_PHRASE",
          severity: "warn",
          title: "Description contains model-directed instruction phrasing",
          detail:
            `Matched the phrase pattern ${re.source}. Text in a tool description is read by the ` +
            "model as instruction. Read the quoted excerpt and decide whether this is guidance " +
            "for the user or a directive aimed at the agent.",
          evidence: { ...base, snippet: sanitizeSnippet(site.text.slice(start, start + 160)) },
        }),
      );
      break; // one finding per site is enough to prompt a human read
    }
  }

  for (const re of SUSPICIOUS_TAGS) {
    if (re.test(site.text)) {
      findings.push(
        finding(meta, {
          id: "S1_PSEUDO_TAG",
          severity: "warn",
          title: "Description contains a pseudo-instruction tag",
          detail:
            "Tags such as <IMPORTANT> or <SYSTEM> are a common tool-poisoning device: they give " +
            "injected text the appearance of a privileged instruction block.",
          evidence: { ...base, snippet: sanitizeSnippet(site.text, 240) },
        }),
      );
      break;
    }
  }

  const hidden = findHiddenChars(site.text);
  if (hidden.length) {
    const names = [...new Set(hidden.map((h) => `${h.char} ${h.name}`))].slice(0, 4);
    findings.push(
      finding(meta, {
        id: "S1_HIDDEN_CHARACTERS",
        severity: "error",
        title: `Description contains ${hidden.length} invisible character(s)`,
        detail:
          `Found ${names.join(", ")}. These render as nothing, so text carrying them can say one ` +
          "thing to a human reviewer and another to the model. Bidi overrides can additionally " +
          "reverse displayed word order while leaving the underlying string intact.",
        evidence: { ...base, snippet: sanitizeSnippet(site.text, 240) },
      }),
    );
  }

  const comments = findHtmlComments(site.text);
  if (comments.length) {
    findings.push(
      finding(meta, {
        id: "S1_HTML_COMMENT",
        severity: "warn",
        title: "Description contains an HTML comment",
        detail:
          "HTML comments are invisible in any UI that renders markdown, but the model still " +
          "reads them. That asymmetry is the whole point of the technique.",
        evidence: { ...base, snippet: sanitizeSnippet(comments[0] ?? "", 200) },
      }),
    );
  }

  const homoglyphs = findHomoglyphWords(site.text);
  if (homoglyphs.length) {
    findings.push(
      finding(meta, {
        id: "S1_HOMOGLYPH",
        severity: "warn",
        title: "Mixed-script word looks like a Latin word",
        detail:
          `The word(s) ${homoglyphs.slice(0, 3).map((w) => JSON.stringify(w)).join(", ")} mix ` +
          "ASCII with Cyrillic or Greek look-alike characters. This is used to disguise a name " +
          "so it reads as familiar while being a different string.",
        evidence: { ...base, snippet: sanitizeSnippet(homoglyphs.slice(0, 3).join(" ")) },
      }),
    );
  }

  if (site.path.endsWith(".description") && site.text.length > LONG_DESCRIPTION) {
    findings.push(
      finding(meta, {
        id: "S1_OVERSIZED_DESCRIPTION",
        severity: "low",
        title: `Description is ${site.text.length} characters`,
        detail:
          "Unusually long descriptions consume context and are a convenient place to bury " +
          "instructions far from the part a reviewer actually reads.",
        evidence: { ...base, snippet: sanitizeSnippet(site.text, 160) },
      }),
    );
  }
}

export const rule: Rule = {
  meta,
  run(ctx: AuditContext) {
    const findings: Finding[] = [];

    ctx.tools.forEach((tool, i) => {
      for (const site of toolTextSites(tool, i)) scanSite(site, findings);
    });

    // Server instructions land in the system prompt — the highest-value target.
    if (ctx.era.instructions) {
      scanSite(
        {
          path: ctx.era.era === "modern" ? "server/discover → instructions" : "initialize → instructions",
          text: ctx.era.instructions,
        },
        findings,
      );
    }

    return findings.length ? fail(meta, findings) : pass(meta);
  },
};
