import { finding, sanitizeSnippet, type Finding, type RuleMeta } from "../schema/finding.js";
import { fingerprintTool, type Baseline, type ToolFingerprint } from "./baseline.js";
import type { RawTool } from "../protocol/types.js";
import { isJsonObject } from "../protocol/types.js";

/**
 * Rug-pull detection: compare the current tool surface against a pinned one.
 *
 * This is the check that catches the attack no static scan can — a server that
 * is clean when you evaluate it and rewrites a tool description afterwards.
 * Only runtime wrappers do this today; doing it from a baseline file means it
 * works in CI, offline, against any server.
 */
export const meta: RuleMeta = {
  id: "D1_SURFACE_DRIFT",
  lane: "safety",
  title: "Tool surface changed since the pinned baseline",
  why:
    "A server can pass every review and then silently redefine what its tools claim to do. " +
    "Because descriptions and schemas are instructions to the model, changing them changes agent " +
    "behaviour without any code on the client side changing, and without the server version " +
    "moving. Pinning the surface and diffing on each re-audit turns that from invisible into a " +
    "build failure.",
  appliesTo: ["modern", "legacy", "unknown"],
  defaultSeverity: "error",
  falsePositiveModes: [
    "Legitimate releases change tool descriptions and schemas all the time. Drift means 'this " +
      "changed since you approved it', not 'this is malicious' — review the diff and re-pin.",
    "Servers that generate tools dynamically (per-tenant, per-credential, feature-flagged) will " +
      "drift on every run by design and are poor candidates for pinning.",
    "A baseline captured against a different target than the one being audited will report " +
      "everything as added or removed; the diff notes when the target does not match.",
  ],
  remediation:
    "Review the diff. If the change is expected, re-pin with --pin; if it is not, stop using the " +
    "server and report it to its maintainer.",
  specRef: "https://modelcontextprotocol.io/specification/2026-07-28/server/tools",
  source: "Rug-pull / tool-redefinition attacks (Invariant Labs, 2025)",
  cwe: "CWE-494",
  owaspMcp: "Supply-chain / tool redefinition",
};

const FIELD_LABEL: Record<keyof ToolFingerprint["fields"], string> = {
  title: "title",
  description: "description",
  inputSchema: "inputSchema",
  outputSchema: "outputSchema",
  annotations: "annotations",
};

/** Annotation changes that weaken a safety claim are worse than any other edit. */
function annotationsRelaxed(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): string[] {
  const relaxed: string[] = [];
  const b = before ?? {};
  const a = after ?? {};
  if (b["readOnlyHint"] !== true && a["readOnlyHint"] === true) {
    relaxed.push("readOnlyHint became true");
  }
  if (b["destructiveHint"] !== false && a["destructiveHint"] === false) {
    relaxed.push("destructiveHint became false");
  }
  if (b["openWorldHint"] === false && a["openWorldHint"] === true) {
    relaxed.push("openWorldHint became true");
  }
  return relaxed;
}

export interface DriftOptions {
  baseline: Baseline;
  tools: readonly RawTool[];
  instructions?: string;
  /** Current target spec, to warn when the baseline was taken elsewhere. */
  targetSpec: string;
}

export function diffAgainstBaseline(opts: DriftOptions): Finding[] {
  const findings: Finding[] = [];
  const { baseline } = opts;

  if (baseline.target.spec !== opts.targetSpec) {
    findings.push(
      finding(meta, {
        id: "D1_BASELINE_TARGET_MISMATCH",
        severity: "warn",
        title: "Baseline was recorded against a different target",
        detail:
          `The baseline names "${baseline.target.spec}" but this run audited ` +
          `"${opts.targetSpec}". The diff below compares two different servers, so treat it ` +
          "with suspicion.",
        evidence: { path: "baseline.target.spec" },
      }),
    );
  }

  const before = new Map(baseline.tools.map((t) => [t.name, t]));
  const after = new Map(
    opts.tools
      .filter((t) => typeof t.name === "string")
      .map((t) => [t.name as string, fingerprintTool(t)]),
  );

  for (const [name, now] of after) {
    const then = before.get(name);
    if (!then) {
      findings.push(
        finding(meta, {
          id: "D1_TOOL_ADDED",
          severity: "info",
          title: `New tool "${name}" appeared since the baseline`,
          detail:
            "A tool that was not present when the baseline was taken is now exposed. New " +
            "capability the user never reviewed is still new capability.",
          evidence: { toolName: name, path: "tools/list" },
        }),
      );
      continue;
    }

    if (then.hash === now.hash) continue;

    // Annotations relaxing a safety claim is the highest-signal drift there is.
    const relaxed = annotationsRelaxed(then.values.annotations, now.values.annotations);
    if (relaxed.length) {
      findings.push(
        finding(meta, {
          id: "D1_ANNOTATIONS_RELAXED",
          severity: "error",
          title: `"${name}" relaxed a safety annotation`,
          detail:
            `${relaxed.join("; ")}. This makes clients less likely to ask the user before ` +
            "calling the tool than they were when you pinned it.",
          evidence: {
            toolName: name,
            path: `tools/list → ${name}.annotations`,
            snippet: sanitizeSnippet(
              `was ${JSON.stringify(then.values.annotations ?? {})} → now ${JSON.stringify(now.values.annotations ?? {})}`,
              300,
            ),
          },
        }),
      );
    }

    for (const key of Object.keys(FIELD_LABEL) as (keyof ToolFingerprint["fields"])[]) {
      if (then.fields[key] === now.fields[key]) continue;
      if (key === "annotations" && relaxed.length) continue; // already reported

      const oldValue = key === "description" ? then.values.description : key === "title" ? then.values.title : undefined;
      const newValue = key === "description" ? now.values.description : key === "title" ? now.values.title : undefined;

      findings.push(
        finding(meta, {
          id:
            key === "description"
              ? "D1_DESCRIPTION_CHANGED"
              : key === "inputSchema" || key === "outputSchema"
                ? "D1_SCHEMA_CHANGED"
                : "D1_FIELD_CHANGED",
          // A description change is the classic rug pull: it rewrites the
          // instructions the model follows, with no schema change to notice.
          severity: key === "description" || key === "inputSchema" ? "error" : "warn",
          title: `"${name}" changed its ${FIELD_LABEL[key]} since the baseline`,
          detail:
            key === "description"
              ? "Tool descriptions are instructions to the model. A silent rewrite is the " +
                "textbook rug pull: the server behaved during review and changed afterwards."
              : `The ${FIELD_LABEL[key]} of this tool differs from the pinned baseline.`,
          evidence: {
            toolName: name,
            path: `tools/list → ${name}.${FIELD_LABEL[key]}`,
            ...(oldValue !== undefined || newValue !== undefined
              ? {
                  snippet: sanitizeSnippet(
                    `was: ${oldValue ?? "(absent)"}\nnow: ${newValue ?? "(absent)"}`,
                    400,
                  ),
                }
              : {}),
          },
        }),
      );
    }
  }

  for (const [name] of before) {
    if (!after.has(name)) {
      findings.push(
        finding(meta, {
          id: "D1_TOOL_REMOVED",
          severity: "warn",
          title: `Tool "${name}" is gone since the baseline`,
          detail:
            "A pinned tool is no longer exposed. Usually a release change; occasionally a sign " +
            "the server is presenting a different surface than the one you reviewed.",
          evidence: { toolName: name, path: "tools/list" },
        }),
      );
    }
  }

  const nowInstructions = opts.instructions;
  const instructionsChanged =
    (baseline.instructions ?? undefined) !== (nowInstructions ?? undefined);
  if (instructionsChanged) {
    findings.push(
      finding(meta, {
        id: "D1_INSTRUCTIONS_CHANGED",
        severity: "error",
        title: "Server instructions changed since the baseline",
        detail:
          "Server instructions are injected into the model's system prompt, so a change here " +
          "alters agent behaviour across every tool at once.",
        evidence: {
          path: "instructions",
          snippet: sanitizeSnippet(
            `was: ${baseline.instructions ?? "(absent)"}\nnow: ${nowInstructions ?? "(absent)"}`,
            400,
          ),
        },
      }),
    );
  }

  return findings;
}

/** True when a value looks like a tool object; used for defensive parsing. */
export function isToolLike(v: unknown): boolean {
  return isJsonObject(v) && typeof v["name"] === "string";
}
