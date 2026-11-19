#!/usr/bin/env node
// Checks the Bangla message catalogue against the English one:
//   - keys that exist in English but are missing (or have a different shape) in Bangla,
//   - ICU arguments that differ between the two ({title} in one but not the other, or a
//     plural argument that became a plain one),
//   - ICU syntax errors, and messages that intl-messageformat can't format for "bn".
// Keys only in Bangla are listed as warnings (stale translations; harmless at runtime).
//
// Each locale's catalogue is every messages/{locale}.json and messages/{locale}.*.json file merged
// together, the same way src/i18n/messages.ts loads them.
//
// Usage: node scripts/check-messages.mjs   (exits 1 when there is something to fix)

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "messages");
const BASE = "en";
const TARGET = "bn";

function loadCatalogue(locale) {
  const files = readdirSync(dir).filter(
    (f) => f === `${locale}.json` || (f.startsWith(`${locale}.`) && f.endsWith(".json")),
  );
  const flat = new Map();
  const shapes = new Map(); // key → "object" | "string", to spot a string where the other has an object
  const walk = (node, prefix, file) => {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") {
        shapes.set(path, "object");
        walk(value, path, file);
      } else {
        if (flat.has(path)) duplicates.push(`${path} (${flat.get(path).file} and ${file})`);
        shapes.set(path, "string");
        flat.set(path, { value: String(value), file });
      }
    }
  };
  const duplicates = [];
  for (const file of files.sort()) walk(JSON.parse(readFileSync(join(dir, file), "utf8")), "", file);
  return { files, flat, shapes, duplicates };
}

// A small ICU MessageFormat reader: returns the arguments a message uses ({name} → "name", with its
// type: "plural", "select", "number", … or "" for a plain argument). Throws on unbalanced syntax.
const BRANCHED = new Set(["plural", "select", "selectordinal"]);
export function icuArguments(message) {
  const args = new Map();
  let i = 0;
  const fail = (why) => {
    throw new Error(`${why} at position ${i}`);
  };
  const skipSpace = () => {
    while (i < message.length && /\s/.test(message[i])) i++;
  };
  const readToken = () => {
    const start = i;
    while (i < message.length && !/[\s,{}]/.test(message[i])) i++;
    return message.slice(start, i);
  };
  // reads literal text and arguments until an unmatched "}" or the end
  const readMessage = () => {
    while (i < message.length) {
      const c = message[i];
      if (c === "'" && message[i + 1] === "'") i += 2;
      else if (c === "'" && /[{}#|]/.test(message[i + 1] ?? "")) {
        const end = message.indexOf("'", i + 1);
        i = end < 0 ? message.length : end + 1;
      } else if (c === "{") {
        i++;
        readArgument();
      } else if (c === "<" && /^<[A-Za-z][\w-]*>/.test(message.slice(i))) {
        // rich text (t.rich): <privacy>…</privacy> is an argument too, of type "tag"
        const tag = /^<([A-Za-z][\w-]*)>/.exec(message.slice(i))[1];
        args.set(tag, "tag");
        i += tag.length + 2;
      } else if (c === "}") return;
      else i++;
    }
  };
  const readArgument = () => {
    skipSpace();
    const name = readToken();
    if (!name) fail("argument without a name");
    skipSpace();
    let type = "";
    if (message[i] === ",") {
      i++;
      skipSpace();
      type = readToken();
      skipSpace();
    }
    const previous = args.get(name);
    if (previous === undefined || previous === "") args.set(name, type);
    if (message[i] === "}") {
      i++;
      return;
    }
    if (message[i] !== ",") fail(`unexpected "${message[i] ?? "end"}" in {${name}}`);
    i++;
    if (BRANCHED.has(type)) {
      let branches = 0;
      for (;;) {
        skipSpace();
        if (message[i] === "}") break;
        const key = readToken();
        if (!key) fail(`branch without a key in {${name}}`);
        if (key.startsWith("offset:")) continue;
        skipSpace();
        if (message[i] !== "{") fail(`branch "${key}" of {${name}} has no message`);
        i++;
        readMessage();
        if (message[i] !== "}") fail(`unclosed branch "${key}" of {${name}}`);
        i++;
        branches++;
      }
      if (!branches) fail(`{${name}, ${type}} has no branches`);
      if (!/(^|[\s}])other\s*\{/.test(message)) fail(`{${name}, ${type}} needs an "other" branch`);
      i++;
    } else {
      // {n, number, ::currency/BDT} and friends: skip the style
      let depth = 1;
      while (i < message.length && depth) {
        if (message[i] === "{") depth++;
        else if (message[i] === "}") depth--;
        i++;
      }
      if (depth) fail(`unclosed {${name}}`);
    }
  };
  readMessage();
  if (i < message.length) fail('unmatched "}"');
  return args;
}

function sampleValues(args, count) {
  const values = {};
  for (const [name, type] of args) {
    if (type === "plural" || type === "selectordinal" || type === "number") values[name] = count;
    else if (type === "date" || type === "time") values[name] = new Date(Date.UTC(2026, 0, 15));
    else if (type === "tag") values[name] = (chunks) => chunks.join("");
    else values[name] = type === "select" ? "other" : name;
  }
  return values;
}

async function loadFormatter() {
  try {
    const mod = await import("intl-messageformat");
    return mod.IntlMessageFormat ?? mod.default;
  } catch {
    return null; // optional: next-intl's dependency, used here when it can be resolved
  }
}

const base = loadCatalogue(BASE);
const target = loadCatalogue(TARGET);
const IntlMessageFormat = await loadFormatter();

const missing = [];
const shape = [];
const mismatched = [];
const invalid = [];
const extra = [];

for (const [key, kind] of base.shapes) {
  const other = target.shapes.get(key);
  if (!other) {
    // report only the top-most missing key of a missing group
    const parent = key.split(".").slice(0, -1).join(".");
    if (!parent || target.shapes.has(parent) || !base.shapes.has(parent)) missing.push(key);
  } else if (other !== kind) shape.push(`${key}: ${kind} in ${BASE}, ${other} in ${TARGET}`);
}
for (const key of target.shapes.keys()) {
  const parent = key.split(".").slice(0, -1).join(".");
  if (!base.shapes.has(key) && (!parent || base.shapes.has(parent))) extra.push(key);
}

for (const [key, { value, file }] of target.flat) {
  let args;
  try {
    args = icuArguments(value);
  } catch (err) {
    invalid.push(`${key} (${file}): ${err.message}`);
    continue;
  }
  if (IntlMessageFormat) {
    try {
      for (const count of [0, 1, 2, 5]) new IntlMessageFormat(value, TARGET).format(sampleValues(args, count));
    } catch (err) {
      invalid.push(`${key} (${file}): ${err.message}`);
      continue;
    }
  }
  const english = base.flat.get(key);
  if (!english) continue;
  let baseArgs;
  try {
    baseArgs = icuArguments(english.value);
  } catch (err) {
    invalid.push(`${key} (${english.file}): ${err.message}`);
    continue;
  }
  const problems = [];
  for (const [name, type] of baseArgs) {
    if (!args.has(name)) problems.push(`{${name}} missing in ${TARGET}`);
    else if (type !== args.get(name))
      problems.push(`{${name}} is "${type || "plain"}" in ${BASE} but "${args.get(name) || "plain"}" in ${TARGET}`);
  }
  for (const name of args.keys()) if (!baseArgs.has(name)) problems.push(`{${name}} only in ${TARGET}`);
  if (problems.length) mismatched.push(`${key}: ${problems.join("; ")}`);
}

const section = (title, items) => {
  if (!items.length) return;
  console.log(`\n${title} (${items.length}):`);
  for (const item of items) console.log(`  - ${item}`);
};

console.log(
  `Checked ${target.flat.size} ${TARGET} messages (${target.files.join(", ")}) against ${base.flat.size} ${BASE} messages (${base.files.join(", ")}).`,
);
if (!IntlMessageFormat) console.log("intl-messageformat not found: skipped the formatting check.");
section(`Missing in ${TARGET}`, missing);
section("Different shape (string vs. group)", shape);
section("Placeholder mismatches", mismatched);
section("Invalid ICU messages", invalid);
section(`Duplicate keys across ${BASE} files`, base.duplicates);
section(`Duplicate keys across ${TARGET} files`, target.duplicates);
section(`Warning: only in ${TARGET} (unused)`, extra);

const failures =
  missing.length +
  shape.length +
  mismatched.length +
  invalid.length +
  base.duplicates.length +
  target.duplicates.length;
if (failures) {
  console.log(`\n✗ ${failures} problem(s) to fix.`);
  process.exitCode = 1;
} else {
  console.log(`\n✓ The ${TARGET} catalogue covers every ${BASE} message with matching placeholders.`);
}
