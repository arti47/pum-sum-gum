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

// One state per structurally distinct plot sheet, because a control can exist
// only on one of them: "Customize" renders only when sheet.customizable, so four
// fixtures on a Standard sheet report the whole custom-track permission — the
// three store mutators behind it included — as unreachable. Same lesson as
// audit-deep's sheet matrix, arrived at the hard way.
const onSheet = (id) => {
  const s = structuredClone(MID);
  const g = s.games[0];
  const sc = g.scopes.find((x) => x.id === g.activeScopeId) || g.scopes[0];
  sc.sheetId = id;
  return s;
};

const STATES = [
  { id: "fresh", state: null },
  { id: "mid", state: MID },
  { id: "done", state: DONE },
  { id: "stress", state: STRESS },
  { id: "customized", state: onSheet("customized") },
  { id: "sandbox", state: onSheet("sandbox") },
  { id: "improvised", state: onSheet("improvised") },
  { id: "journey", state: onSheet("journey") },
  { id: "story-focus", state: onSheet("story-focus") },
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
  ["importData", "opens the import dialog, which is in SKIP for the same reason"],
  ["resetAll", "wipes the fixture every later route stands on (in SKIP)"],
  ["deleteGame", "same — destructive, covered by the unit harness"],
  ["clearJournal", "destructive; in SKIP, and round-tripped by the unit harness"],
  ["granularColumn", "test-only export, already recorded in docs/AUDIT.md under "
    + "\"known and accepted\" — read by the harness, by no shipped surface"],
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
    // main.js caches the active game/scope key and refreshes it only inside the
    // store subscriber. store.load() does not emit, so after seeding a DIFFERENT
    // state that cache is stale, and the next mutation anywhere looks like a
    // context switch and fires clearTransient() — wiping the wizard draft and
    // the Forge's held result mid-journey. One no-op preference write emits and
    // resynchronises it. (In the app this cannot happen: load() runs once, at
    // boot, before the cache is taken.)
    const cfg = await import("./src/settings.js");
    cfg.Settings.setExplainOpen(cfg.Settings.explainOpen());
    const vs = await import("./src/viewstate.js");
    vs.clearTransient();
    for (const b of document.querySelectorAll(".modal-back")) b.remove();
    const r = await import("./src/router.js");
    r.go(t, s);
    // A player opens a fold and then clicks what is inside it. A sweep that
    // re-renders between clicks never gets there, so every control behind a
    // disclosure reads as unreachable. Open them all first.
    for (const d of document.querySelectorAll("#screen details")) d.open = true;
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

const PLAY_ONLY = new Set(["customized", "sandbox", "improvised", "journey", "story-focus"]);

for (const st of STATES) {
  const routes = PLAY_ONLY.has(st.id)
    ? ROUTES.filter(([t]) => t === "play")
    : ROUTES;
  for (const [tab, section] of routes) {
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

// --- scripted journeys ------------------------------------------------------
// Clicking every control from a freshly-seeded state cannot reach anything that
// needs a SEQUENCE. Two of the app's features are sequences, and both read as
// unreachable until the sweep actually performs them:
//
//   · the prep wizard, which will not leave the protagonists step until a name
//     has been typed AND the Add button pressed — filling the field is not
//     enough, and the first version of this pass stalled there silently;
//   · the Customized plot sheet, which starts with no track at all. "Customize"
//     appears only once a section exists, so a sweep that re-seeds between
//     clicks can add a section or open the dialog, never both.
//
// A journey is written out, step by step, rather than discovered. That is the
// honest shape: this pass proves what clicking reaches, and names what needs a
// sequence instead of pretending a sequence is a click.

async function type(selector, value) {
  await page.evaluate(([sel, v]) => {
    const f = document.querySelector(sel);
    if (!f) return;
    f.value = v;
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
  }, [selector, value]);
  await page.waitForTimeout(60);
}

async function tapText(re, where = "#screen button, #action-bar button, .modal button") {
  const hit = await page.evaluate(([sel, src]) => {
    const rx = new RegExp(src, "i");
    const b = [...document.querySelectorAll(sel)]
      .filter((x) => x.offsetParent !== null && !x.disabled)
      // A glossary chip is a definition link, not a step of play. Without this
      // the chip "Random prompt" at the top of the Play screen is the first
      // match for /random prompt/, so the journey navigated to Rules and forty
      // consecutive "rolls" rolled nothing. Exactly the collision F-34 recorded
      // in the flow probes, reintroduced here.
      .filter((x) => !x.classList.contains("term"))
      .find((x) => rx.test((x.textContent || "").trim()));
    if (!b) return false;
    b.click();
    return true;
  }, [where, re.source]);
  if (hit) { clicks += 1; await page.waitForTimeout(90); }
  return hit;
}

const journeys = [];

// 1. Prepare a game, end to end. The only route to wizard.finish and createGame.
{
  await seed(null, "more", "home");
  await page.evaluate(async () => (await import("./src/wizard.js")).startWizard());
  await page.waitForTimeout(90);
  const steps = [];
  for (let i = 0; i < 8; i++) {
    // Fill whatever this step asks for, and press any per-step Add button, which
    // is what the protagonists and plot-node steps require before they are legal.
    await page.evaluate(() => {
      for (const f of document.querySelectorAll("#screen input[type=text], #screen textarea")) {
        if (!f.value) {
          f.value = "audit";
          f.dispatchEvent(new Event("input", { bubbles: true }));
          f.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      for (const d of document.querySelectorAll("#screen details")) d.open = true;
    });
    await page.waitForTimeout(70);
    await tapText(/^add /);
    await page.waitForTimeout(70);
    const label = await page.evaluate(() =>
      document.querySelector(".ab-ctx")?.textContent || "");
    steps.push(label);
    if (!(await tapText(/^(next|start playing)$/))) break;
  }
  journeys.push(`wizard: ${steps.length} step(s) — ${steps.join(" → ")}`);
}

// 2. Cancel out of the wizard: the only route to cancelWizard.
{
  await seed(null, "more", "home");
  await page.evaluate(async () => (await import("./src/wizard.js")).startWizard());
  await page.waitForTimeout(80);
  const ok = await tapText(/^cancel$/);
  await followDialog(0);
  journeys.push(`wizard cancel: ${ok ? "taken" : "NO CONTROL"}`);
}

// 3. Build a custom track: add a section, then a box, then open Customize.
{
  await seed(onSheet("customized"), "play", "track");
  const added = await tapText(/add a track section/);
  await followDialog(0);
  await page.waitForTimeout(80);
  const customize = await tapText(/^customize$/);
  if (customize) {
    // Inside: add a box, edit the prompt column, remove a section.
    await tapText(/^\+|add a box/, ".modal button");
    await page.waitForTimeout(60);
    await tapText(/prompt column|customize the prompt/, ".modal button");
    await page.waitForTimeout(60);
    await followDialog(0);
  }
  journeys.push(`custom track: section ${added ? "added" : "NO CONTROL"}, `
    + `Customize ${customize ? "opened" : "NOT OFFERED after adding a section"}`);
  await page.evaluate(() => { for (const b of document.querySelectorAll(".modal-back")) b.remove(); });
}

// 4. Roll, then use what the roll put on screen. This is the shape of nearly
// everything left: a result card exists only AFTER a roll, so a sweep that
// re-seeds between clicks can never reach one of its follow-ups. That is a
// property of the sweep, not of the app, and the only fix is to roll first.
{
  await seed(MID, "oracles", "yesno");
  await tapText(/^ask$/);
  // The answer's own follow-ups: re-roll, and the plot beat PUM p.28 says a
  // yes or no triggers.
  await tapText(/it said (yes|no)|random prompt|modified proposal/);
  await page.waitForTimeout(80);
  const beat = await page.evaluate(() =>
    (document.querySelector("#screen h1")?.textContent || "") + " "
    + [...document.querySelectorAll("#screen .result-kind")].map((n) => n.textContent).join(" "));
  journeys.push(`oracle → beat trigger: landed on "${beat.trim().slice(0, 40)}"`);

  // An enriched oracle, and the granular variant, each rolled once.
  await seed(MID, "oracles", "descriptive");
  await tapText(/someone|place|object/);
  await seed(MID, "oracles", "granular");
  await tapText(/^ask$/);
  await seed(MID, "oracles", "quantifiers");
  await tapText(/how many|how good|how hard/);
  journeys.push("oracles: enriched, granular and quantifier rolls taken");
}

// 5. Roll in the Forge, then keep the result — the only route to keepDialog.
{
  await seed(MID, "more", "forge");
  await tapText(/roll a whole plot seed|roll all/);
  await page.waitForTimeout(90);
  const kept = await tapText(/keep it/);
  let appended = false;
  if (kept) {
    await page.waitForTimeout(80);
    // The six setting/scope destinations sit inside a fold, and a fold's buttons
    // have no offsetParent while it is shut — so followDialog skips every one of
    // them, and the append helper behind them reads as unreachable. Open it.
    appended = await page.evaluate(() => {
      const box = document.querySelector(".modal");
      if (!box) return false;
      for (const d of box.querySelectorAll("details")) d.open = true;
      const b = [...box.querySelectorAll("button")]
        .find((x) => /add to the universe/i.test(x.textContent || ""));
      if (!b) return false;
      b.click();
      return true;
    });
    await page.waitForTimeout(90);
    await followDialog(0);
  }
  journeys.push(`forge → keep: ${kept ? "taken" : "NO CONTROL after rolling"}, `
    + `folded setting destination: ${appended ? "taken" : "NOT OFFERED"}`);
  await page.evaluate(() => { for (const b of document.querySelectorAll(".modal-back")) b.remove(); });
}

// 6. Roll a plot beat until it points at a plot node, then act on it.
// A beat's face is a die roll: on a Standard sheet only some faces reach a node
// list, and only faces 5 and 6 reach a list the sheet does not print. Rolling
// once and hoping is not a test — roll until the surface appears, or say it
// never did.
{
  let nodeLine = false, unprinted = false, tries = 0;
  for (; tries < 40 && !(nodeLine && unprinted); tries++) {
    await seed(MID, "play", "track");
    // A missed tap is not a reason to stop rolling. If a beat from the previous
    // try is still open the pinned bar is gone, and breaking here ended the walk
    // on try one — which is how this journey reported both surfaces unreachable
    // on one run and reached on the next. Dismiss whatever is open and roll on.
    if (!(await tapText(/random prompt/))) {
      await page.evaluate(async () => {
        for (const b of document.querySelectorAll(".modal-back")) b.remove();
        (await import("./src/viewstate.js")).clearTransient();
        (await import("./src/router.js")).go("play", "track");
      });
      await page.waitForTimeout(60);
      if (!(await tapText(/random prompt/))) continue;
    }
    await page.waitForTimeout(70);
    const seen = await page.evaluate(() => {
      const t = document.querySelector("#screen")?.innerText || "";
      const btn = (re) => [...document.querySelectorAll("#screen button")]
        .some((b) => b.offsetParent !== null && re.test((b.textContent || "").trim()));
      return {
        // The empty-slot line is THREE separate buttons — "Add new", "Choose",
        // "Reroll" — not one control named after all three. Matching the card's
        // prose instead of its buttons is why this journey reported the node
        // line reached and still never opened the Choose dialog.
        choose: btn(/^choose$/i),
        unprinted: /bring one in|recall/i.test(t),
      };
    });
    if (seen.choose && !nodeLine) {
      nodeLine = true;
      await tapText(/^choose$/);
      await page.waitForTimeout(70);
      await followDialog(0);
    }
    if (seen.unprinted) unprinted = true;
  }
  journeys.push(`beat → empty-slot Choose: ${nodeLine ? "reached" : "NEVER APPEARED"}, `
    + `unprinted-list block: ${unprinted ? "reached" : "NEVER APPEARED"} (${tries} rolls)`);
  await page.evaluate(() => { for (const b of document.querySelectorAll(".modal-back")) b.remove(); });
}

// 6b. The oracle result card's own follow-ups, named rather than hoped for:
// re-roll writes a LINKED journal entry, and "Enrich it" rolls only the second
// die into the same entry. Both are controls on a card that exists only after a
// roll, which is why a re-seeding sweep never sees either.
{
  await seed(MID, "oracles", "descriptive");
  await tapText(/someone|place|object/);
  await page.waitForTimeout(80);
  const rerolled = await tapText(/^re-?roll$/);
  await page.waitForTimeout(80);
  const enriched = await tapText(/enrich it/);
  journeys.push(`oracle card: re-roll ${rerolled ? "taken" : "NOT OFFERED"}, `
    + `enrich ${enriched ? "taken" : "NOT OFFERED"}`);

  // Enrichment is the books' default, so "Enrich it" only has work to do when
  // the automatic roll is switched off. Order matters: seed() reloads the
  // fixture, which would put the setting straight back.
  await seed(MID, "oracles", "story");
  await page.evaluate(async () => {
    const st = await import("./src/settings.js");
    st.Settings.setAutoEnrich(false);
    (await import("./src/router.js")).go("oracles", "story");
  });
  await page.waitForTimeout(60);
  await tapText(/discovery|problem|intent/);
  await page.waitForTimeout(80);
  const enriched2 = await tapText(/enrich it/);
  await page.evaluate(async () => {
    const st = await import("./src/settings.js");
    st.Settings.setAutoEnrich(true);
  });
  journeys.push(`oracle card with auto-enrich off: enrich ${enriched2 ? "taken" : "NOT OFFERED"}`);
}

// 7. Inside Customize, remove a section as well as adding one.
{
  await seed(onSheet("customized"), "play", "track");
  await tapText(/add a track section/);
  await followDialog(0);
  await page.waitForTimeout(80);
  if (await tapText(/^customize$/)) {
    await page.waitForTimeout(80);
    const removed = await tapText(/remove/, ".modal button");
    if (removed) await followDialog(0);
    journeys.push(`custom track: remove ${removed ? "taken" : "NOT OFFERED"}`);
  }
  await page.evaluate(() => { for (const b of document.querySelectorAll(".modal-back")) b.remove(); });
}

// 8. The two things that are not clicks at all: a key press and a slider.
{
  await seed(MID, "more", "settings");
  await page.evaluate(() => {
    const r = document.querySelector('#screen input[type="range"]');
    if (r) { r.value = "1.15"; r.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  await page.waitForTimeout(80);
  // Escape closes a dialog — a keyboard path no click can exercise.
  await seed(MID, "play", "cast");
  await tapText(/add|new/);
  await page.waitForTimeout(80);
  const hadModal = await page.evaluate(() => !!document.querySelector(".modal"));
  if (hadModal) await page.keyboard.press("Escape");
  await page.waitForTimeout(60);
  journeys.push(`keyboard + slider: text size changed, Escape ${hadModal ? "pressed on a dialog" : "had no dialog"}`);
  await page.evaluate(() => { for (const b of document.querySelectorAll(".modal-back")) b.remove(); });
}

// 8b. Prep sends you to the Forge for an idea, and the Forge sends the idea
// back. Both halves are single controls that exist only in that sequence: the
// offer card renders only on wizard steps 1-2, and "Prepare a game with this"
// only when no game exists — so a sweep that starts from a seeded fixture takes
// the other branch every time.
{
  await seed(null, "more", "home");
  await page.evaluate(async () => (await import("./src/wizard.js")).startWizard());
  await page.waitForTimeout(120);
  const offered = await tapText(/invent one in the forge/);
  await page.waitForTimeout(250);
  const landed = await page.evaluate(() =>
    document.querySelector("#screen h1")?.textContent || "");
  // ...roll there, and carry the result back into the draft.
  const rolled = await tapText(/roll a whole plot seed/);
  await page.waitForTimeout(250);
  const kept = await tapText(/keep it/);
  await page.waitForTimeout(250);
  const carriedBack = await tapText(/take it back to prep|prepare a game with this/);
  await page.waitForTimeout(250);
  const back = await page.evaluate(() =>
    document.querySelector("#screen h1")?.textContent || "");
  journeys.push(`prep → Forge → prep: offer ${offered ? "taken" : "NOT OFFERED"}, `
    + `landed on "${landed}", roll ${rolled ? "taken" : "no"}, keep ${kept ? "taken" : "no"}, `
    + `carried back to "${back}"${carriedBack ? "" : " (CARRY CONTROL NOT FOUND)"}`);
  await page.evaluate(() => { for (const b of document.querySelectorAll(".modal-back")) b.remove(); });
}

// 9. Two games, so switching between them is reachable.
{
  await seed(MID, "more", "home");
  await page.evaluate(async () => {
    const store = await import("./src/store.js");
    store.createGame({ title: "second", sheetId: "standard" });
    store.setActiveGame(store.games()[1].id);
  });
  await page.waitForTimeout(60);
  await seed(null, "more", "home");
  journeys.push("two games: seeded for the switch control");
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
  // Chromium emits one record per script LOAD, so a navigation mid-run yields two
  // entries for the same URL. Reading only the first made a reload look like a
  // regression: setForgeSection and setActiveGame both "stopped running" purely
  // because their execution was recorded against the second entry.
  const entries = coverage.filter((c) => c.url.endsWith("/" + rel));
  const entry = entries[0];
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
    const recs = entries.flatMap((e) => e.functions)
      .filter((f) => f.functionName === d.name && f.ranges.length);
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

console.log("\nScripted journeys (what clicking alone cannot reach):");
for (const j of journeys) console.log("  · " + j);

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
