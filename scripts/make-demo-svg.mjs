#!/usr/bin/env node
/**
 * Render the README's hero image from real CLI output.
 *
 * The picture in a README is a claim like any other, so it is generated rather
 * than drawn: this script runs the built CLI against a real MCP server, parses
 * the ANSI-16 escapes the terminal reporter actually emits, and converts them
 * to SVG. Nothing here invents a line of output.
 *
 *   npm run build && node scripts/make-demo-svg.mjs [target] [outfile]
 *
 * Two notes on reproducibility. The elapsed-time segment on the summary line is
 * a real measurement, so it differs between runs; and the default target is
 * fetched with `npx`, so a newer release of that server will change the
 * capture. Both are intentional — the image re-measures instead of freezing.
 *
 * Colour depends on `--color` forcing ANSI through a pipe (see Theme.resolve).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ESC = "\u001b";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TARGET = process.argv[2] ?? "npx -y @modelcontextprotocol/server-everything stdio";
const OUT = resolve(ROOT, process.argv[3] ?? "docs/media/demo.svg");

/** ANSI-16 on a dark terminal. The SVG paints its own background, so it reads
 *  identically under GitHub's light and dark themes. */
const PALETTE = [
  "#484f58", "#ff7b72", "#3fb950", "#d29922", "#58a6ff", "#bc8cff", "#39c5cf", "#b1bac4",
  "#6e7681", "#ff7b72", "#56d364", "#e3b341", "#79c0ff", "#d2a8ff", "#56d4dd", "#f0f6fc",
];
const FG = "#c9d1d9";
const BG = "#0d1117";
const CHROME = "#161b22";
const BORDER = "#21262d";

const FONT_SIZE = 12.5;
const LINE_H = 17;
const CHAR_W = 0.6 * FONT_SIZE; // monospace advance width
const PAD_X = 20;
const TITLEBAR_H = 34;
const PAD_TOP = 14;
const PAD_BOTTOM = 16;

function capture() {
  const res = spawnSync(
    process.execPath,
    [resolve(ROOT, "dist/cli.js"), "--color", "--icons", "plain", TARGET],
    { encoding: "utf8", cwd: ROOT, maxBuffer: 16 * 1024 * 1024 },
  );
  if (res.error) throw res.error;
  // Exit 1 just means findings were reported at or above the threshold, which is
  // precisely what we want to show. Only a tool/connection error (2) is fatal.
  if (res.status === 2) {
    throw new Error(`mcpaudit could not audit ${TARGET}:\n${res.stderr}`);
  }
  if (!res.stdout.trim()) throw new Error("no output captured — is dist/ built?");
  return res.stdout;
}

/** Split ANSI-coloured text into lines of {text, fg, bold} runs. */
function parseAnsi(raw) {
  const lines = [];
  let run = { text: "", fg: null, bold: false };
  let line = [];
  let fg = null;
  let bold = false;

  const pushRun = () => {
    if (run.text) line.push(run);
    run = { text: "", fg, bold };
  };

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (ch === ESC && raw[i + 1] === "[") {
      const end = raw.indexOf("m", i);
      if (end === -1) continue;
      pushRun();
      for (const p of raw.slice(i + 2, end).split(";")) {
        const code = Number(p);
        if (code === 0) { fg = null; bold = false; }
        else if (code === 1) bold = true;
        else if (code >= 30 && code <= 37) fg = code - 30;
        else if (code >= 90 && code <= 97) fg = code - 90 + 8;
      }
      run = { text: "", fg, bold };
      i = end;
      continue;
    }

    if (ch === "\n") {
      pushRun();
      lines.push(line);
      line = [];
      continue;
    }

    run.text += ch;
  }
  pushRun();
  if (line.length) lines.push(line);

  // Trim leading and trailing blank lines; the reporter pads with both.
  while (lines.length && !lines[0].some((r) => r.text.trim())) lines.shift();
  while (lines.length && !lines[lines.length - 1].some((r) => r.text.trim())) lines.pop();
  return lines;
}

const xmlEscape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Longest line in display columns, so nothing clips. */
function widestLine(lines) {
  let max = 0;
  for (const line of lines) {
    let n = 0;
    for (const r of line) n += [...r.text].length;
    if (n > max) max = n;
  }
  return max;
}

function toSvg(lines, command) {
  const rendered = [{ text: `$ ${command}`, prompt: true }, null, ...lines];
  const cols = Math.max(widestLine(lines), command.length + 2);
  const width = Math.ceil(cols * CHAR_W + PAD_X * 2);
  const height = Math.ceil(
    TITLEBAR_H + PAD_TOP + rendered.length * LINE_H + PAD_BOTTOM,
  );

  const body = rendered
    .map((line, idx) => {
      const y = TITLEBAR_H + PAD_TOP + (idx + 1) * LINE_H - 5;
      if (line === null) return "";
      if (line.prompt) {
        return (
          `  <text class="l" x="${PAD_X}" y="${y}" xml:space="preserve">` +
          `<tspan fill="${PALETTE[10]}">$ </tspan>` +
          `<tspan fill="${FG}">${xmlEscape(line.text.slice(2))}</tspan></text>`
        );
      }
      const spans = line
        .map((r) => {
          const fill = r.fg === null ? FG : PALETTE[r.fg];
          const weight = r.bold ? ' font-weight="700"' : "";
          return `<tspan fill="${fill}"${weight}>${xmlEscape(r.text)}</tspan>`;
        })
        .join("");
      return `  <text class="l" x="${PAD_X}" y="${y}" xml:space="preserve">${spans}</text>`;
    })
    .filter(Boolean)
    .join("\n");

  const title =
    "mcpaudit auditing a real MCP server: the report it prints, generated from actual output";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="demo-title">
  <title id="demo-title">${xmlEscape(title)}</title>
  <style>
    .l { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: ${FONT_SIZE}px; }
    .bar { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-size: 11.5px; fill: #6e7681; }
  </style>
  <rect x="0" y="0" width="${width}" height="${height}" rx="10" ry="10" fill="${BG}"/>
  <path d="M0 10 A10 10 0 0 1 10 0 H${width - 10} A10 10 0 0 1 ${width} 10 V${TITLEBAR_H} H0 Z" fill="${CHROME}"/>
  <line x1="0" y1="${TITLEBAR_H}" x2="${width}" y2="${TITLEBAR_H}" stroke="${BORDER}" stroke-width="1"/>
  <circle cx="20" cy="17" r="5" fill="#3f4650"/>
  <circle cx="38" cy="17" r="5" fill="#3f4650"/>
  <circle cx="56" cy="17" r="5" fill="#3f4650"/>
  <text class="bar" x="${Math.round(width / 2)}" y="21" text-anchor="middle">mcpaudit</text>
${body}
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" ry="10" fill="none" stroke="${BORDER}" stroke-width="1"/>
</svg>
`;
}

const raw = capture();
const lines = parseAnsi(raw);
const command = `mcpaudit "${TARGET}"`;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, toSvg(lines, command), "utf8");
process.stderr.write(`wrote ${OUT} — ${lines.length} lines captured from: ${TARGET}\n`);
