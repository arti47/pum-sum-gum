// The cycle runner — the stopping rule, automated.
//
// The template's rule is: you are done when ONE COMPLETE CYCLE of every pass
// produces no finding. Not "the pass I just fixed is green" — the whole set,
// end to end, in one run, with nothing left over. Running the passes by hand
// makes that rule easy to fake: fix A, run A, ship, and never notice the fix
// broke B. Three of the twenty-six findings in this project's audit history
// were exactly that.
//
//   node tests/cycle.mjs                 one cycle; exits 0 only if all clean
//   node tests/cycle.mjs --watch         re-run the whole cycle on every source
//                                        change, until one cycle comes back clean
//   node tests/cycle.mjs --repeat 4      re-run up to 4 cycles, stopping at the
//                                        first clean one (catches flakiness)
//   node tests/cycle.mjs --only unit,novice
//
// Every pass keeps running even after an earlier one fails. A runner that
// stops at the first failure hides how much is broken, and hiding that is how
// a "one clean cycle" rule quietly becomes "the last thing I looked at".

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Cheapest and most diagnostic first, so a broken parse is reported in two
// seconds rather than after four minutes of browser work.
const PASSES = [
  { id: "unit", label: "data, engine and glossary invariants", cmd: ["node", "tests/harness.mjs"] },
  { id: "deadcode", label: "rules extracted and never called", cmd: ["node", "tests/deadcode.mjs"] },
  { id: "smoke", label: "every route, three widths, the walk", cmd: ["node", "tests/smoke.mjs"] },
  { id: "interaction", label: "every control, clicked in isolation", cmd: ["node", "tests/interaction.mjs"] },
  { id: "modals", label: "every button inside every dialog", cmd: ["node", "tests/audit-modals.mjs"] },
  { id: "deep", label: "every plot sheet, every branch", cmd: ["node", "tests/audit-deep.mjs"] },
  { id: "novice", label: "could a stranger tell what it is for", cmd: ["node", "tests/audit-novice.mjs"] },
  { id: "reach", label: "reachability + naming, three states", cmd: ["node", "tests/audit-reach.mjs"] },
  { id: "guide", label: "the guide against what the app renders", cmd: ["node", "tests/audit-guide.mjs"] },
  { id: "firstrun", label: "a stranger, cold open to a played scene", cmd: ["node", "tests/probe-firstrun.mjs"], probe: true },
  { id: "flow", label: "the book's loop, without the tab bar", cmd: ["node", "tests/probe-flow.mjs"], probe: true },
  { id: "layout", label: "measured layout at 320/360/390", cmd: ["node", "tests/probe-layout.mjs"], probe: true },
];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const value = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const only = value("--only", "").split(",").map((s) => s.trim()).filter(Boolean);
const passes = only.length ? PASSES.filter((p) => only.includes(p.id)) : PASSES;
const repeat = Number(value("--repeat", "1")) || 1;
const watching = flag("--watch");

if (!passes.length) {
  console.error(`No pass matches --only ${only.join(",")}. Known: ${PASSES.map((p) => p.id).join(", ")}`);
  process.exit(2);
}

function run(pass) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(pass.cmd[0], pass.cmd.slice(1), { cwd: root });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => {
      // A probe prints and never asserts, so its exit code says nothing. Read
      // its own report line instead — otherwise the two probes would be
      // decoration inside a runner whose whole job is to decide "clean or not".
      // Match each probe's own one-line verdict, never words that also appear
      // in its column headers — that mistake makes a runner report a finding
      // against a table that says "none" in every row.
      // Probes print and never assert, so their exit code says nothing. Each
      // ends with a one-line verdict; read that, and never a word that also
      // appears in a column header — matching "overflow" in the layout probe's
      // own heading made the first version of this runner report a finding
      // against a table reading "none" in every row.
      const failed = pass.probe
        ? /^VERDICT: (?!every|no\b)/mi.test(out) || !/^VERDICT:/mi.test(out)
        : code !== 0;
      resolve({ pass, failed, out, code, ms: Date.now() - started });
    });
  });
}

// The findings themselves, pulled out of each pass's own report so the cycle
// summary is readable without scrolling back through eight pass outputs.
function findingsIn(out) {
  return out.split("\n").filter((l) => l.trim().startsWith("✗")).map((l) => l.trim());
}

async function cycle(n) {
  const bar = "═".repeat(64);
  console.log(`\n${bar}\n  CYCLE ${n} — ${passes.length} passes\n${bar}`);
  const results = [];
  for (const pass of passes) {
    process.stdout.write(`  ${pass.id.padEnd(12)} ${pass.label.padEnd(42)} … `);
    const r = await run(pass);
    results.push(r);
    const secs = (r.ms / 1000).toFixed(1) + "s";
    console.log(r.failed ? `FAIL  ${secs}` : `ok    ${secs}`);
  }

  const bad = results.filter((r) => r.failed);
  console.log("");
  if (!bad.length) {
    console.log(`  Cycle ${n} is CLEAN — all ${passes.length} passes green in one run.`);
    return { clean: true, results };
  }

  console.log(`  Cycle ${n}: ${bad.length} of ${passes.length} passes reported findings.\n`);
  for (const r of bad) {
    const fs = findingsIn(r.out);
    console.log(`  ── ${r.pass.id} (${r.pass.label})`);
    if (fs.length) {
      for (const f of fs.slice(0, 25)) console.log(`     ${f}`);
      if (fs.length > 25) console.log(`     … and ${fs.length - 25} more`);
    } else {
      // No "✗" lines: an assertion harness or a probe. Show its tail.
      for (const l of r.out.trimEnd().split("\n").slice(-12)) console.log(`     ${l}`);
    }
    console.log("");
  }
  return { clean: false, results };
}

async function untilCleanOrGiveUp() {
  let last = null;
  for (let n = 1; n <= repeat; n++) {
    last = await cycle(n);
    if (last.clean) return last;
    if (n < repeat) console.log(`  Re-running — ${repeat - n} attempt(s) left.\n`);
  }
  return last;
}

if (!watching) {
  const final = await untilCleanOrGiveUp();
  console.log(final.clean
    ? "\n  Done. The stopping rule is met: one complete cycle, no findings.\n"
    : "\n  NOT done. Fix the findings above and run it again — the rule is a whole\n  clean cycle, so a pass that was green last time still has to be green now.\n");
  process.exit(final.clean ? 0 : 1);
}

// --- watch mode --------------------------------------------------------------
// Keep re-running the whole cycle every time a shipped file changes, and stop
// the first time a complete cycle comes back clean. This is the answer to
// "how do I keep testing until nothing is reported": you do not re-run the one
// pass you were working on, you re-run all of them, and the loop ends itself.
const WATCHED = [
  ...readdirSync(root).filter((f) => /\.(js|css|html|json)$/.test(f) && !f.startsWith("package")),
  ...readdirSync(join(root, "src")).map((f) => join("src", f)),
  ...readdirSync(join(root, "tests")).filter((f) => f.endsWith(".mjs")).map((f) => join("tests", f)),
].filter((f) => {
  try { return statSync(join(root, f)).isFile(); } catch { return false; }
});

console.log(`\n  Watch mode: ${WATCHED.length} files. Re-runs the whole cycle on every change,`);
console.log("  and exits the moment one complete cycle reports nothing. Ctrl-C to stop.");

let running = false;
let queued = false;
let n = 0;

async function go() {
  if (running) { queued = true; return; }
  running = true;
  const r = await cycle(++n);
  running = false;
  if (r.clean) {
    console.log("\n  Done. A complete cycle came back clean — nothing left to report.\n");
    process.exit(0);
  }
  console.log("  Waiting for a change…\n");
  if (queued) { queued = false; go(); }
}

let debounce = null;
for (const f of WATCHED) {
  try {
    watch(join(root, f), () => {
      clearTimeout(debounce);
      debounce = setTimeout(go, 250);
    });
  } catch { /* a file that cannot be watched is not worth failing over */ }
}

go();
