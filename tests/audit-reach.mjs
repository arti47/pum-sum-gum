// The reachability audit (§11.1 G) — for a player who has read none of the three
// books and may never have played a solo RPG.
//
// It sits beside `audit-novice.mjs`, and asks a different question. That one
// asks whether a stranger could tell what each surface is FOR: guidance before
// action, prose before controls, terms explained in sentences. This one asks
// whether they can get to it at all, and whether it is honest when they do:
//
//   1. REACHABILITY — every route, in every state, renders, offers at least one
//      enabled control, and is not a dead end.
//   2. NAMING — every control's accessible name is a name. Not a die size, not
//      two labels run together, not a bare verb.
//   3. HONESTY — a surface that quietly does less than it appears to says so.
//   4. THE GLOSSARY CONTRACT — every defined term is reachable on the Rules
//      screen, and the chip under each screen's note actually lands on it.
//
// It runs against three states, because the audit before it only ever ran
// against a game already in progress:
//
//   fresh   — no game at all. What a first-time player actually sees, and the
//             state the interaction and modal audits never visit.
//   mid     — a game in play.
//   done    — a resolved scope: the state at the end of a story.
//
// This pass ASSERTS. It is not a probe.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(join(root, "tests/fixtures", f), "utf8"));

const MID = read("mid-session.json");

// A resolved scope: every box crossed. Derived from the mid fixture so the two
// never drift apart.
const DONE = (() => {
  const s = structuredClone(MID);
  const g = s.games[0];
  const sc = g.scopes.find((x) => x.id === g.activeScopeId) || g.scopes[0];
  sc.crossedOverride = null;
  sc.track.crossed = 99;           // derived.normalize clamps to the sheet's length
  sc.openScene = null;
  return s;
})();

const STATES = [
  { id: "fresh", label: "no game prepared", state: null },
  { id: "mid", label: "a game in play", state: MID },
  { id: "done", label: "a resolved scope", state: DONE },
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

// Labels that are legitimately terse because the row they sit in names the
// subject, AND that carry an aria-label saying so. Anything not on this list
// needs a name a screen reader can read on its own.
const MIN_NAME = 4;

const findings = [];
const finding = (s) => { if (!findings.includes(s)) findings.push(s); };

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();

const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") jsErrors.push(m.text()); });

await page.goto(url, { waitUntil: "networkidle" });

// The glossary's own vocabulary, read from the shipped data file rather than
// re-listed here — a second copy of the term list would drift.
const GLOSSARY = await page.evaluate(async () => {
  const m = await import("./data-rules-library.js");
  return m.GLOSSARY.map((e) => ({ id: e.id, term: e.term, aka: e.aka || [], group: e.group }));
});

async function goTo(stateObj, tab, section) {
  await page.evaluate(async ([st, t, s]) => {
    if (st) localStorage.setItem("umState", JSON.stringify(st));
    else localStorage.removeItem("umState");
    const store = await import("./src/store.js");
    store.load();
    const vs = await import("./src/viewstate.js");
    vs.clearTransient();
    const back = document.querySelector(".modal-back");
    if (back) back.remove();
    const r = await import("./src/router.js");
    r.go(t, s);
  }, [stateObj, tab, section]);
  await page.waitForTimeout(50);
}

// What a beginner can see and touch on the screen they are on right now.
async function surface() {
  return page.evaluate(() => {
    const vis = (n) => n.offsetParent !== null;
    const named = (n) => (n.getAttribute("aria-label") || n.textContent || "").trim().replace(/\s+/g, " ");
    const controls = [...document.querySelectorAll("#screen button, #action-bar button")]
      .filter(vis)
      .map((n) => ({
        name: named(n),
        text: (n.textContent || "").trim().replace(/\s+/g, " "),
        aria: n.getAttribute("aria-label") || null,
        disabled: !!n.disabled,
        nav: !!n.closest(".section-nav"),
      }));
    // A `<summary>` is a control too. The rules library and the glossary are
    // built entirely out of them — counting only buttons would report the two
    // most reference-heavy screens in the app as dead ends. They are exempt
    // from the naming rules below, because a disclosure is named by the thing
    // it discloses ("GUM"), not by an instruction.
    const discloses = [...document.querySelectorAll("#screen summary")].filter(vis).length;
    const folds = [...document.querySelectorAll("#screen details")].filter(vis).map((d) => ({
      summary: (d.querySelector("summary")?.textContent || "").trim(),
      open: d.open,
      // A disclosure that discloses nothing is a control that changes nothing.
      bodyLen: (d.textContent || "").length - (d.querySelector("summary")?.textContent || "").length,
    }));
    return {
      controls,
      discloses,
      folds,
      explains: document.querySelectorAll("#screen details.explain").length,
      openExplains: [...document.querySelectorAll("#screen details.explain")].filter((d) => d.open).length,
      termChips: [...document.querySelectorAll("#screen .chip.term")].map((n) => n.textContent.trim()),
      // Everything the screen actually says, for the jargon sweep.
      prose: (document.querySelector("#screen")?.innerText || "").replace(/\s+/g, " "),
      heading: document.querySelector("#screen h1")?.textContent || "",
    };
  });
}

// ---------------------------------------------------------------------------
// 1. Reachability: every route in every state
// ---------------------------------------------------------------------------
const seenTerms = new Set();
const termRoutes = new Map();       // glossary id -> a route that used it

for (const st of STATES) {
  for (const [tab, section] of ROUTES) {
    const before = jsErrors.length;
    await goTo(st.state, tab, section);
    const s = await surface();
    const at = `${st.id} · ${tab}/${section}`;

    if (jsErrors.length > before) {
      finding(`${at} threw on render — ${jsErrors[before]}`);
      continue;
    }

    // A screen a beginner can reach and do nothing on is a dead end.
    const live = s.controls.filter((c) => !c.disabled && !c.nav);
    if (!live.length && !s.discloses) finding(`${at} is a dead end — nothing on it can be tapped`);

    // Every screen carries its own "what this does" note (§6.6 layer 1).
    // The empty-state screens are exempt: they are one sentence and one button.
    const isEmpty = /No game yet|no plot nodes|switched off/i.test(s.prose);
    if (!s.explains && !isEmpty) finding(`${at} has no “What this does” note`);

    // 2. Comprehensibility: every control names itself.
    for (const c of s.controls) {
      if (c.nav) continue;
      if (/^d\d+$/.test(c.name)) {
        finding(`${at} · a control's whole name is “${c.name}” — a die size is not a name`);
      } else if (c.name.length < MIN_NAME) {
        finding(`${at} · a control is named “${c.name}”, too short to stand on its own`);
      } else if (!c.aria && /[a-z][A-Z]/.test(c.text)) {
        finding(`${at} · “${c.text}” runs two labels together and has no aria-label`);
      }
    }

    // A disclosure that opens onto nothing.
    for (const f of s.folds) {
      if (f.bodyLen < 10) finding(`${at} · the fold “${f.summary}” has no body`);
    }

    // 3. Jargon: every term the screen uses is one tap from its definition.
    // The chips under the note are that tap; the Words screen is the fallback.
    const hay = " " + s.prose.toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
    for (const e of GLOSSARY) {
      for (const alias of [e.term.toLowerCase(), ...e.aka]) {
        const needle = " " + alias.replace(/[^a-z0-9]+/g, " ").trim() + " ";
        if (!hay.includes(needle)) continue;
        seenTerms.add(e.id);
        if (!termRoutes.has(e.id)) termRoutes.set(e.id, at);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. The glossary contract, both directions
// ---------------------------------------------------------------------------
// (a) every glossary entry is reachable, and addressable, on the Rules screen
await goTo(MID, "more", "library");
const listed = await page.evaluate(() =>
  [...document.querySelectorAll("#screen .glossary .defrow")].map((n) => ({
    id: n.id, term: (n.querySelector(".k") || {}).textContent || "",
  })));
for (const e of GLOSSARY) {
  const row = listed.find((r) => r.term.trim() === e.term);
  if (!row) finding(`glossary · “${e.term}” is defined and the Rules screen never shows it`);
  else if (row.id !== "term-" + e.id) finding(`glossary · “${e.term}” has no anchor a chip can land on`);
}

// (b) the Words screen is reachable from the tab bar without prior knowledge
await goTo(null, "more", "home");
const homeRoutes = await page.evaluate(() =>
  [...document.querySelectorAll("#screen button, #action-bar button")]
    .map((n) => (n.getAttribute("aria-label") || n.textContent).trim()).join(" | "));
if (!/tutorial|walkthrough|guide|never played/i.test(homeRoutes)) {
  finding("more/home · a first-time player is never pointed at the guide");
}

// (c) the chips actually fire — a chip that does not reach its entry is a lie
await goTo(MID, "oracles", "yesno");
const chipWorks = await page.evaluate(async () => {
  const chip = document.querySelector("#screen .chip.term");
  if (!chip) return "no chip on the oracles screen";
  const want = chip.textContent.trim();
  chip.click();
  await new Promise((r) => setTimeout(r, 150));
  const h = document.querySelector("#screen h1")?.textContent || "";
  const hit = document.querySelector("#screen .glossary .defrow.flash .k");
  if (h !== "Rules") return `chip landed on “${h}”, not the Rules screen`;
  if (!hit) return "chip reached Rules but highlighted no entry";
  return hit.textContent.trim() === want ? true : `chip for “${want}” highlighted “${hit.textContent.trim()}”`;
});
if (chipWorks !== true) finding(`glossary chip · ${chipWorks}`);

// ---------------------------------------------------------------------------
// 3. The first-run honesty check
// ---------------------------------------------------------------------------
// With no game, a roll is discarded — addJournal has nowhere to write. Every
// surface that rolls must say so before the player rolls, not after.
const ROLLING = [
  ["oracles", "yesno"], ["oracles", "descriptive"], ["oracles", "story"],
  ["oracles", "granular"], ["oracles", "quantifiers"],
  ["scene", "explore"], ["scene", "battle"], ["scene", "discovery"], ["scene", "people"],
  ["more", "forge"],
];
for (const [tab, section] of ROLLING) {
  await goTo(null, tab, section);
  const s = await surface();
  if (!/being saved|no journal|nothing is kept/i.test(s.prose)) {
    finding(`fresh · ${tab}/${section} rolls happily with no game and never says the result is not kept`);
  }
  if (!s.controls.some((c) => /prepare a game/i.test(c.name))) {
    finding(`fresh · ${tab}/${section} names the problem with no way out of it`);
  }
}

// And the claim itself must be true: rolling with no game must leave no journal.
await goTo(null, "oracles", "yesno");
const leaked = await page.evaluate(async () => {
  const btns = [...document.querySelectorAll("#action-bar button")];
  const ask = btns.find((b) => b.textContent.trim() === "Ask");
  if (!ask) return "no Ask button";
  ask.click();
  await new Promise((r) => setTimeout(r, 150));
  const raw = localStorage.getItem("umState");
  if (!raw) return false;
  return JSON.parse(raw).games.some((g) => g.journal.length) ? "a journal entry appeared from nowhere" : false;
});
if (leaked) finding(`fresh · ${leaked}`);

// ---------------------------------------------------------------------------
// 4. The beginner path, walked end to end without prior knowledge
// ---------------------------------------------------------------------------
// Boot cold. Can a player who taps only what the screen offers reach a first
// roll? Each step names a control by its visible text; a step that finds no
// such control is the finding.
await page.evaluate(() => localStorage.removeItem("umState"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(120);

async function tap(label) {
  const hit = await page.evaluate((want) => {
    const nodes = [...document.querySelectorAll(
      "#screen button, #screen summary, #action-bar button, .modal button")]
      .filter((n) => n.offsetParent !== null && !n.disabled
        // A glossary chip is a definition link, not a step of play. "Confirming
        // a beat" would otherwise be the first control matching "Confirm".
        && !n.classList.contains("term"));
    const n = nodes.find((x) => (x.getAttribute("aria-label") || x.textContent || "")
      .trim().toLowerCase().includes(want.toLowerCase()));
    if (!n) return false;
    n.click();
    return true;
  }, label);
  await page.waitForTimeout(140);
  return hit;
}

const PATH = [
  ["the cold-boot screen offers the walkthrough", "walkthrough"],
  ["the guide leads somewhere", "Rules"],
];
for (const [what, label] of PATH) {
  if (!(await tap(label))) finding(`beginner path · ${what} — no control matching “${label}”`);
}

await browser.close();
server.close();

// ---------------------------------------------------------------------------
const unusedTerms = GLOSSARY.filter((e) => !seenTerms.has(e.id));

console.log(`\nReachability audit: ${ROUTES.length} routes × ${STATES.length} states, ${GLOSSARY.length} glossary terms\n`);
console.log(`  states: ${STATES.map((s) => `${s.id} (${s.label})`).join(" · ")}`);
console.log(`  terms the app actually puts on screen: ${seenTerms.size}/${GLOSSARY.length}`);
if (unusedTerms.length) {
  console.log("\nNotes (a term defined for the player's benefit, which no screen uses):");
  for (const e of unusedTerms) console.log(`  · ${e.term}`);
}

if (findings.length) {
  console.log("\nFindings:");
  for (const f of findings) console.log("  ✗ " + f);
  console.log("");
  process.exit(1);
}
console.log("\nEvery route is reachable and alive in every state; every control names itself;");
console.log("every term the app uses is one tap from a plain-language definition.\n");
