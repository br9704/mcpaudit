/**
 * Shared text analysis for the safety lane.
 *
 * Every heuristic here is lexical. That is a deliberate limit, not an oversight:
 * mcpaudit is "a first-pass linter that catches common issues — not a security
 * audit", so these functions find *signals* a human should look at, and each
 * caller documents how its signal misfires.
 */
import type { RawTool } from "../protocol/types.js";

/** Where a piece of text came from, for evidence paths. */
export interface TextSite {
  path: string;
  text: string;
  toolName?: string;
}

/**
 * Prompt-injection phrasing, from the tool-poisoning research (Invariant Labs,
 * April 2025) and subsequent advisories. Matched case-insensitively.
 */
export const INJECTION_PHRASES: readonly RegExp[] = [
  /\bignore (?:all |any )?(?:previous|prior|above|earlier)\b/i,
  /\bdisregard (?:all |any )?(?:previous|prior|above|earlier|the)\b/i,
  /\bdo not (?:tell|inform|mention|reveal|disclose|show)\b/i,
  /\bdon'?t (?:tell|inform|mention|reveal|disclose|show)\b/i,
  /\bwithout (?:telling|informing|notifying|asking) the user\b/i,
  /\bbefore (?:using|calling|invoking) (?:any|the) other tool\b/i,
  /\byou (?:must|should) (?:always|first|never)\b/i,
  /\bnever (?:mention|reveal|disclose|tell)\b/i,
  /\bsystem prompt\b/i,
  /\bas an ai (?:language )?model\b/i,
  /\boverride (?:the |your )?(?:instructions|rules|safety)\b/i,
];

/** Pseudo-tags used to smuggle instructions into a description. */
export const SUSPICIOUS_TAGS: readonly RegExp[] = [
  /<\s*IMPORTANT\s*>/i,
  /<\s*SECRET\s*>/i,
  /<\s*SYSTEM\s*>/i,
  /<\s*INSTRUCTIONS?\s*>/i,
  /<\s*ADMIN\s*>/i,
];

/** Invisible characters used to hide instructions from human reviewers. */
const HIDDEN_CHARS: ReadonlyMap<number, string> = new Map([
  [0x200b, "ZERO WIDTH SPACE"],
  [0x200c, "ZERO WIDTH NON-JOINER"],
  [0x200d, "ZERO WIDTH JOINER"],
  [0x2060, "WORD JOINER"],
  [0xfeff, "ZERO WIDTH NO-BREAK SPACE"],
  [0x00ad, "SOFT HYPHEN"],
  [0x202a, "LEFT-TO-RIGHT EMBEDDING"],
  [0x202b, "RIGHT-TO-LEFT EMBEDDING"],
  [0x202c, "POP DIRECTIONAL FORMATTING"],
  [0x202d, "LEFT-TO-RIGHT OVERRIDE"],
  [0x202e, "RIGHT-TO-LEFT OVERRIDE"],
  [0x2066, "LEFT-TO-RIGHT ISOLATE"],
  [0x2067, "RIGHT-TO-LEFT ISOLATE"],
  [0x2068, "FIRST STRONG ISOLATE"],
  [0x2069, "POP DIRECTIONAL ISOLATE"],
]);

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;

/**
 * Invisible characters, excluding legitimate uses.
 *
 * A ZERO WIDTH JOINER between two pictographic characters is how emoji
 * sequences are built (👨‍👩‍👧 is three people joined by ZWJs), and flagging it
 * would fire on any server whose description contains a family emoji. Only a
 * ZWJ outside that context is treated as hiding something.
 */
export function findHiddenChars(text: string): { char: string; name: string; index: number }[] {
  const out: { char: string; name: string; index: number }[] = [];
  const chars = [...text];
  let i = 0;

  for (let n = 0; n < chars.length; n++) {
    const ch = chars[n]!;
    const cp = ch.codePointAt(0)!;
    const name = HIDDEN_CHARS.get(cp);

    if (name) {
      const isEmojiJoiner =
        cp === 0x200d &&
        PICTOGRAPHIC.test(chars[n - 1] ?? "") &&
        PICTOGRAPHIC.test(chars[n + 1] ?? "");
      // Variation-selector-adjacent ZWJs are also part of emoji sequences.
      const nearVariationSelector =
        cp === 0x200d && ((chars[n - 1]?.codePointAt(0) ?? 0) === 0xfe0f);

      if (!isEmojiJoiner && !nearVariationSelector) {
        out.push({
          char: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
          name,
          index: i,
        });
      }
    }
    i += ch.length;
  }
  return out;
}

/** ANSI escape sequences and raw control characters. */
export function findControlSequences(text: string): { kind: string; index: number }[] {
  const out: { kind: string; index: number }[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x1b) {
      const next = text[i + 1];
      out.push({
        kind: next === "[" ? "ANSI CSI escape" : next === "]" ? "ANSI OSC escape" : "ESC",
        index: i,
      });
    } else if (code === 0x0d) {
      out.push({ kind: "carriage return (overwrites the line)", index: i });
    } else if (code === 0x07) {
      out.push({ kind: "BEL", index: i });
    } else if (code === 0x08) {
      out.push({ kind: "backspace (erases displayed text)", index: i });
    } else if (code < 0x09 || (code > 0x0a && code < 0x0d) || (code > 0x0d && code < 0x20)) {
      out.push({ kind: `control character 0x${code.toString(16)}`, index: i });
    }
  }
  return out;
}

/**
 * Latin-looking characters from other scripts, used to spoof a familiar name.
 * We flag only mixed-script *words*: an all-Cyrillic description is a language,
 * while `dеlete` with a Cyrillic е inside an ASCII word is a disguise.
 */
export function findHomoglyphWords(text: string): string[] {
  const suspicious: string[] = [];
  for (const word of text.split(/\s+/)) {
    if (word.length < 2) continue;
    let ascii = 0;
    let confusable = 0;
    for (const ch of word) {
      const cp = ch.codePointAt(0)!;
      if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) ascii++;
      // Cyrillic and Greek blocks contain the common Latin look-alikes.
      else if ((cp >= 0x0400 && cp <= 0x04ff) || (cp >= 0x0370 && cp <= 0x03ff)) confusable++;
    }
    if (ascii > 0 && confusable > 0) suspicious.push(word);
  }
  return suspicious;
}

/** HTML comments, which render invisibly in many chat UIs. */
export function findHtmlComments(text: string): string[] {
  return [...text.matchAll(/<!--([\s\S]*?)(?:-->|$)/g)].map((m) => m[1] ?? "");
}

/** Collect every human-readable string a tool exposes to the model. */
export function toolTextSites(tool: RawTool, index: number): TextSite[] {
  const name = typeof tool.name === "string" ? tool.name : `tools[${index}]`;
  const sites: TextSite[] = [];
  const push = (field: string, value: unknown) => {
    if (typeof value === "string" && value.length > 0) {
      sites.push({ path: `tools/list → tools[${index}].${field}`, text: value, toolName: name });
    }
  };
  push("name", tool.name);
  push("title", tool.title);
  push("description", tool.description);

  // Parameter descriptions reach the model too, and are a favourite hiding place.
  const schema = tool.inputSchema;
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    const props = (schema as Record<string, unknown>)["properties"];
    if (props && typeof props === "object" && !Array.isArray(props)) {
      for (const [key, val] of Object.entries(props as Record<string, unknown>)) {
        if (val && typeof val === "object" && !Array.isArray(val)) {
          const d = (val as Record<string, unknown>)["description"];
          if (typeof d === "string" && d.length > 0) {
            sites.push({
              path: `tools/list → tools[${index}].inputSchema.properties.${key}.description`,
              text: d,
              toolName: name,
            });
          }
        }
      }
    }
  }
  return sites;
}

/** Walk every node of a JSON Schema, yielding [path, node] pairs. */
export function walkSchema(
  schema: unknown,
  path = "",
  depth = 0,
  maxDepth = 64,
): { path: string; node: Record<string, unknown>; depth: number }[] {
  if (depth > maxDepth) return [];
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return [];
  const node = schema as Record<string, unknown>;
  const out = [{ path, node, depth }];
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => out.push(...walkSchema(v, `${path}.${key}[${i}]`, depth + 1, maxDepth)));
    } else if (value && typeof value === "object") {
      out.push(...walkSchema(value, `${path}.${key}`, depth + 1, maxDepth));
    }
  }
  return out;
}
