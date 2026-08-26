// The function-reachability audit (§11.1 H).
//
// Every other pass asks about things it can SEE: a route, a control, a string on
// screen. This one asks the question underneath: of the functions this app is
// built from, which ones can a player never cause to run?
//
// It does not read the source and reason about it. It runs the app under
// Chromium's precise coverage counter, clicks every control on every route in
// every state — including inside every dialog — and then asks the browser which
// functions never executed. A function nobody can reach is either dead weight or
// a feature with no way in (D-22, the permission with no control), and both are
// findings the dead-data scan misses: that scan proves a name is IMPORTED, not
// that a player can ever get to it.
//
// Findings are triaged, not automatic. Some functions are legitimately reachable
// only from a state this sweep cannot manufacture in one pass (an update prompt
// from the service worker, an import of a file the sweep has no file for), so
// EXPECTED_UNREACHED lists them with a reason. Everything else is a finding.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));
const STRESS = JSON.parse(readFileSync(join(root, "tests/fixtures/stress.json"), "utf8"));

// A resolved scope, so the end-of-story surfaces are swept too.
const DONE = (() => {
  const s = structuredClone(MID);
  const g = s.games[0];
  const sc = g.scopes.find((x) => x.id === g.activeScopeId) || g.scopes[0];
  sc.track.crossed = 99;                 // normalize clamps to the sheet's length
  sc.openScene = null;
  return s;
})();

const STATES = [
  { id: "fresh", state: null },
  { id: "mid", state: MID },
  { id: "done", state: DONE },
  { id: "stress", state: STRESS },
];

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["scene", "arc"], ["scene", "explore"], ["scene", "battle"],
  ["scene", "discovery"], ["scene", "people"],
  ["oracles", "yesno"], ["oracles", "descriptive"], ["oracles", "story"],
  ["oracles", "granular"], ["oracles", "quantifiers"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "forge"], ["more", "tutorial"],
  ["more", "library"], ["more", "settings"],
];

// Controls whose whole job is to destroy the fixture the sweep is standing on.
// They are exercised by the unit harness instead; clicking them here would blank
// the state every later route depends on.
const SKIP = [
  "Erase everything", "Delete the current game", "Delete this game",
  "Clear the journal", "Erase", "Import",
];

// Reachable only from a state this sweep cannot manufacture, with the reason.
// A name added here needs a sentence saying why, or it becomes a place to hide
// an unreachable feature.
const EXPECTED_UNREACHED = new Map([
  ["importJSON", "needs a pasted export; the unit harness round-trips it instead"],
  ["resetAll", "wipes the fixture every later route stands on (in SKIP)"],
  ["deleteGame", "same — destructive, covered by the unit harness"],
]);

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();

const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(String(e)));

await page.coverage.startJSCoverage({ resetOnNavigation: false });
await page.goto(url, { waitUntil: "networkidle" });

async function seed(state, tab, section) {
  await page.evaluate(async ([st, t, s]) => {
    if (st) localStorage.setItem("umState", JSON.stringify(st));
    else localStorage.removeItem("umState");
    const store = await import("./src/store.js");
    store.load();
    const vs = await import("./src/viewstate.js");
    vs.clearTransient();
    for (const b of document.querySelectorAll(".modal-back")) b.remove();
    const r = await import("./src/router.js");
    r.go(t, s);
  }, [state, tab, section]);
  await page.waitForTimeout(35);
}

const controlsSel = "#screen button, #screen summary, #action-bar button";

async function screenControls() {
  return page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((n) => n.offsetParent !== null && !n.disabled)
    .map((n) => (n.getAttribute("aria-label") || n.textContent || "").trim().slice(0, 50)), controlsSel);
}

let clicks = 0, dialogButtons = 0;

async function clickNth(i) {
  return page.evaluate(([sel, idx, skip]) => {
    const nodes = [...document.querySelectorAll(sel)]
      .filter((n) => n.offsetParent !== null && !n.disabled);
    const n = nodes[idx];
    if (!n) return false;
    const name = (n.getAttribute("aria-label") || n.textContent || "").trim();
    if (skip.some((s) => name.includes(s))) return false;
    n.click();
    return true;
  }, [controlsSel, i, SKIP]);
}

// Follow a dialog through. The first version clicked only index 0 and stopped,
// which never reached a commit action sitting behind a body button — that is why
// it reported store.setNode, addCast, addProtagonist and the whole wizard as
// unreachable while the app plainly reaches them. Now: fill every field, click
// the button we were told to click first, then keep following the PRIMARY action
// of whatever dialog is in front of us, which is the one that writes.
async function followDialog(firstIndex = -1, maxSteps = 10) {
  let acted = 0;
  for (let step = 0; step < maxSteps; step++) {
    const hit = await page.evaluate(([skip, want]) => {
      const box = document.querySelector(".modal");
      if (!box) return false;
      for (const f of box.querySelectorAll("input[type=text], textarea")) {
        if (!f.value) { f.value = "audit"; f.dispatchEvent(new Event("input", { bubbles: true })); }
      }
      const btns = [...box.querySelectorAll("button, summary")]
        .filter((b) => b.offsetParent !== null && !b.disabled && !b.dataset.swept)
        .filter((b) => !skip.some((s) => (b.textContent || "").includes(s)));
      if (!btns.length) return false;
      const pick = (want >= 0 && btns[want]) ? btns[want]
        : (btns.find((b) => b.classList.contains("primary")) || btns[0]);
      pick.dataset.swept = "1";
      pick.click();
      return true;
    }, [SKIP, step === 0 ? firstIndex : -1]);
    if (!hit) break;
    acted += 1;
    await page.waitForTimeout(30);
  }
  dialogButtons += acted;
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".modal-back")) b.remove();
  });
  return acted;
}

// How many buttons the dialog this control opens has, so it can be re-opened
// once per button rather than only ever down its first path.
async function dialogWidth() {
  return page.evaluate((skip) => {
    const box = document.querySelector(".modal");
    if (!box) return 0;
    return [...box.querySelectorAll("button, summary")]
      .filter((b) => b.offsetParent !== null && !b.disabled)
      .filter((b) => !skip.some((s) => (b.textContent || "").includes(s))).length;
  }, SKIP);
}

for (const st of STATES) {
  for (const [tab, section] of ROUTES) {
    await seed(st.state, tab, section);
    const names = await screenControls();
    for (let i = 0; i < names.length; i++) {
      // Re-seed between clicks so each control is exercised from the same state,
      // exactly as the interaction audit does — a click that navigates would
      // otherwise leave the rest of the list unvisited.
      await seed(st.state, tab, section);
      const hit = await clickNth(i);
      if (!hit) continue;
      clicks += 1;
      await page.waitForTimeout(35);
      const width = await dialogWidth();
      if (!width) continue;
      // Re-open once per button, so a commit action behind a body button is
      // reached rather than only whatever sat first.
      await followDialog(0);
      for (let bIdx = 1; bIdx < Math.min(width, 8); bIdx++) {
        await seed(st.state, tab, section);
        if (!(await clickNth(i))) break;
        await page.waitForTimeout(30);
        await followDialog(bIdx);
      }
    }
  }
}

// The wizard renders only while a draft exists, so it never appears on a route.
// Walk it end to end, clicking every control on every step.
await seed(null, "more", "home");
await page.evaluate(async () => {
  const w = await import("./src/wizard.js");
  w.startWizard();
});
await page.waitForTimeout(60);
for (let step = 0; step < 8; step++) {
  const names = await screenControls();
  for (let i = 0; i < names.length; i++) {
    const hit = await clickNth(i);
    if (hit) { clicks += 1; await page.waitForTimeout(25); await followDialog(0); }
  }
  const moved = await page.evaluate(() => {
    const next = [...document.querySelectorAll("#action-bar button, #screen button")]
      .find((b) => /next|finish|start playing|create/i.test(b.textContent || "") && !b.disabled);
    if (!next) return false;
    for (const f of document.querySelectorAll("#screen input[type=text], #screen textarea")) {
      if (!f.value) { f.value = "audit"; f.dispatchEvent(new Event("input", { bubbles: true })); }
    }
    next.click();
    return true;
  });
  await page.waitForTimeout(60);
  if (!moved) break;
}

const coverage = await page.coverage.stopJSCoverage();
await browser.close();
server.close();

// --- map coverage back to named functions -----------------------------------
const files = [
  ...readdirSync(join(root, "src")).filter((f) => f.endsWith(".js")).map((f) => "src/" + f),
];

// Every function declaration, with the offset of its body — a range covering the
// body is proof the function ran, where a range covering only the declaration
// line is not.
function declarations(src) {
  const out = [];
  const rx = /(?:^|\n)\s*(export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while ((m = rx.exec(src))) {
    // The body brace is not simply the next "{": a destructured parameter list
    // ({ voluntary = false } = {}) puts braces inside the signature. Walk the
    // parens to the end of the parameter list first.
    let i = rx.lastIndex, depth = 1;
    while (i < src.length && depth > 0) {
      if (src[i] === "(") depth += 1;
      else if (src[i] === ")") depth -= 1;
      i += 1;
    }
    const open = src.indexOf("{", i);
    if (open < 0) continue;
    out.push({ name: m[2], exported: !!m[1], declAt: m.index, bodyAt: open + 1 });
  }
  return out;
}


const findings = [];
const notes = [];
let total = 0, reached = 0;

for (const rel of files) {
  const src = readFileSync(join(root, rel), "utf8");
  const entry = coverage.find((c) => c.url.endsWith("/" + rel));
  const decls = declarations(src);
  total += decls.length;

  if (!entry) {
    findings.push(`${rel} was never loaded at all — no route imports it`);
    continue;
  }
  // Chromium reports one record per function, named, whose FIRST range is that
  // function's own extent and whose count is how many times it ran. Match by
  // NAME, and disambiguate same-named functions by requiring the record's extent
  // to contain the declaration — matching by offset alone picks whichever
  // enclosing closure happens to be tightest, which is how the first version of
  // this pass reported the entire wizard as unreachable while it was running it.
  const ran = (d) => {
    const recs = entry.functions.filter((f) => f.functionName === d.name && f.ranges.length);
    if (!recs.length) return null;                    // no record: report it as such
    const here = recs.filter((f) =>
      f.ranges[0].startOffset <= d.bodyAt && d.bodyAt <= f.ranges[0].endOffset);
    return (here.length ? here : recs).some((f) => f.ranges[0].count > 0);
  };

  for (const d of decls) {
    const verdict = ran(d);
    if (verdict === true) { reached += 1; continue; }
    const why = EXPECTED_UNREACHED.get(d.name);
    if (why) { notes.push(`${rel}: ${d.name} — ${why}`); continue; }
    if (verdict === null) {
      // The engine optimised it away entirely, which only happens when nothing
      // ever referenced it. Report it as the stronger finding it is.
      findings.push(`${rel}: ${d.name}() has no coverage record at all — never even referenced`);
    } else {
      findings.push(`${rel}: ${d.name}() never ran — no sequence of clicks reaches it`);
    }
  }
}

console.log(`\nFunction-reachability audit: ${clicks} controls clicked, `
  + `${dialogButtons} in-dialog buttons, ${STATES.length} states × ${ROUTES.length} routes + the wizard\n`);
console.log(`  ${reached}/${total} functions in src/ were executed by clicking alone`);
if (jsErrors.length) console.log(`  ${jsErrors.length} page error(s): ${jsErrors[0]}`);

if (notes.length) {
  console.log("\nExpected, with a reason:");
  for (const n of notes) console.log("  · " + n);
}

if (findings.length) {
  console.log(`\n${findings.length} finding(s):`);
  for (const f of findings) console.log("  ✗ " + f);
  console.log("");
  process.exit(1);
}
console.log("\nEvery function in src/ is reachable by clicking.\n");
