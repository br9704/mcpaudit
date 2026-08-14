import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import type { AuditContext, Rule } from "./types.js";
import { fail, pass } from "./types.js";
import { isJsonObject } from "../protocol/types.js";

export const meta: RuleMeta = {
  id: "S2_DESTRUCTIVE_ANNOTATION",
  lane: "safety",
  title: "Destructive-sounding tool contradicts its own annotations",
  why:
    "Clients use annotations to decide what needs a confirmation prompt. The specification is " +
    "explicit that annotations are hints and MUST be treated as untrusted from untrusted " +
    "servers, so the interesting signal is not the hint itself but a *contradiction*: a tool " +
    "called delete_everything that declares readOnlyHint:true will slip past a client that " +
    "auto-approves read-only calls. Note the defaults are already safe — destructiveHint " +
    "defaults to true and readOnlyHint to false — so omitting annotations is not the problem; " +
    "asserting the wrong ones is.",
  appliesTo: ["modern", "legacy"],
  defaultSeverity: "warn",
  falsePositiveModes: [
    "Verb matching is lexical. A tool named remove_background edits an image and is genuinely " +
      "not destructive to the user's data; drop_shadow is not a database DROP.",
    "A tool may be read-only with respect to the user's environment while its name describes " +
      "what it reports on (list_deleted_files, find_removals).",
    "We cannot verify what a tool actually does — only whether its stated semantics are " +
      "self-consistent. A tool with honest annotations and a scary name is fine; a tool with " +
      "reassuring annotations and a scary name deserves a look.",
  ],
  remediation:
    "Make annotations match behaviour: a tool that writes or deletes must not claim " +
    "readOnlyHint:true, and should leave destructiveHint at its default of true unless the " +
    "change is purely additive.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools",
  cwe: "CWE-1188",
  owaspMcp: "Excessive agency / unsafe tool exposure",
};

/**
 * Verbs that mean irreversible loss almost wherever they appear.
 */
const STRONG_DESTRUCTIVE = [
  "delete", "destroy", "drop", "truncate", "purge", "wipe", "erase",
  "format", "uninstall", "rmdir", "shutdown",
];

/**
 * Verbs that *can* mean destruction but are also ordinary in harmless contexts
 * — remove_background edits an image, reset_zoom changes a view. These count
 * only when paired with an object that implies persistent state, otherwise the
 * rule fires on perfectly innocent tools and burns its own credibility.
 */
const WEAK_DESTRUCTIVE = [
  "remove", "revoke", "kill", "terminate", "overwrite", "reset", "unlink", "clear",
];

/** Objects that suggest the verb acts on persistent, user-visible state. */
const STATEFUL_OBJECT =
  /\b(all|everything|file|files|record|records|row|rows|table|database|db|index|collection|bucket|repo|repository|branch|user|users|account|accounts|key|keys|token|tokens|credential|secret|volume|disk|directory|folder|data|backup|snapshot|history|log|logs|message|messages|email|config|configuration)\b/i;

const DESTRUCTIVE = [...STRONG_DESTRUCTIVE, ...WEAK_DESTRUCTIVE];

/** Verbs implying any state change at all. */
const MUTATING = [
  ...DESTRUCTIVE,
  "write", "create", "update", "insert", "modify", "edit", "set", "put",
  "patch", "send", "post", "upload", "publish", "execute", "run", "install",
];

/**
 * Match a verb and its ordinary inflections, but nothing that merely starts
 * with it. Without the trailing boundary, `clear` matches "clearly" and
 * `format` matches "formatted" — which produced four false positives against
 * the official filesystem server ("Results clearly distinguish…") before this
 * was tightened.
 */
function matchedVerbs(haystack: string, verbs: readonly string[]): string[] {
  const lower = haystack.toLowerCase();
  return verbs.filter((v) => new RegExp(`\\b${v}(?:s|es|d|ed|ing)?\\b`, "i").test(lower));
}

export const rule: Rule = {
  meta,
  run(ctx: AuditContext) {
    const findings: Finding[] = [];

    ctx.tools.forEach((tool, i) => {
      const name = typeof tool.name === "string" ? tool.name : `tools[${i}]`;
      const description = typeof tool.description === "string" ? tool.description : "";
      const ann = isJsonObject(tool.annotations) ? tool.annotations : undefined;

      const readOnly = ann?.["readOnlyHint"];
      const destructive = ann?.["destructiveHint"];

      const spacedName = name.replace(/[_.-]/g, " ");

      // Strong verbs count on their own; weak verbs only when they act on
      // something that sounds like persistent state.
      const strong = [
        ...matchedVerbs(spacedName, STRONG_DESTRUCTIVE),
        ...matchedVerbs(description, STRONG_DESTRUCTIVE),
      ];
      // Weak verbs count only in the tool *name*. In prose they are far too
      // common to mean anything — a description saying "clear results" or
      // "reset the view" is not evidence about what the tool does.
      const weak = matchedVerbs(spacedName, WEAK_DESTRUCTIVE);
      const actsOnState = STATEFUL_OBJECT.test(spacedName) || STATEFUL_OBJECT.test(description);

      const nameVerbs = matchedVerbs(spacedName, DESTRUCTIVE);
      const descVerbs = matchedVerbs(description, DESTRUCTIVE);
      const anyDestructive = strong.length > 0 || (weak.length > 0 && actsOnState);
      const mutating = matchedVerbs(spacedName, MUTATING).length > 0;

      const base = { path: `tools/list → tools[${i}].annotations`, toolName: name };

      // The strong signal: claims read-only while named for destruction.
      if (anyDestructive && readOnly === true) {
        findings.push(
          finding(meta, {
            id: "S2_DESTRUCTIVE_CLAIMS_READONLY",
            severity: "error",
            title: `"${name}" declares readOnlyHint:true but reads as destructive`,
            detail:
              `Matched destructive verb(s): ${[...new Set([...nameVerbs, ...descVerbs])].join(", ")}. ` +
              "A client that auto-approves read-only tools would call this without asking the " +
              "user. Verify what the tool actually does before trusting either signal.",
            evidence: { ...base, snippet: sanitizeSnippet(description, 160) },
          }),
        );
        return;
      }

      if (anyDestructive && destructive === false) {
        findings.push(
          finding(meta, {
            id: "S2_DESTRUCTIVE_HINT_DISABLED",
            severity: "warn",
            title: `"${name}" sets destructiveHint:false but reads as destructive`,
            detail:
              `Matched destructive verb(s): ${[...new Set([...nameVerbs, ...descVerbs])].join(", ")}. ` +
              "destructiveHint:false asserts the tool makes only additive changes, which " +
              "downgrades the confirmation a client will ask for.",
            evidence: { ...base, snippet: sanitizeSnippet(description, 160) },
          }),
        );
        return;
      }

      // A mutating tool asserting read-only is also a contradiction, if milder.
      // Gated on a stateful object for the same reason as the weak verbs: a
      // tool that "removes a background" or "creates a chart" is genuinely
      // read-only with respect to the user's environment.
      if (mutating && !anyDestructive && actsOnState && readOnly === true) {
        findings.push(
          finding(meta, {
            id: "S2_MUTATING_CLAIMS_READONLY",
            severity: "warn",
            title: `"${name}" declares readOnlyHint:true but its name implies a write`,
            detail:
              "readOnlyHint:true asserts the tool does not modify its environment. If this tool " +
              "writes anything, clients that skip confirmation for read-only calls will act " +
              "without asking.",
            evidence: { ...base, snippet: sanitizeSnippet(description, 160) },
          }),
        );
      }
    });

    return findings.length ? fail(meta, findings) : pass(meta);
  },
};
