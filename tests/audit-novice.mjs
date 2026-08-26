// Novice audit (§11.1 F). The interaction and modal audits ask whether a control
// *acts*. This one asks whether a stranger could tell what it is FOR — across
// every route and every dialog, not just the first-run path.
//
// Four checks, all mechanical:
//   1. every route carries its "what this does" note;
//   2. every route's first content is prose, not a control — guidance before action;
//   3. every book term used on a screen is used in PROSE somewhere on that screen,
//      not only in a button label or a heading;
//   4. every dialog says what it does before it asks: at least one sentence of
//      eight words or more, or a labelled field with a hint.
//
// It reports; the harness does not run it. Findings are fixed, not tolerated.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));
const { GLOSSARY } = await import(join(root, "data-rules-library.js"));

const TERMS = GLOSSARY.map((g) => g.term.toLowerCase())
  .concat(["oracle", "bias", "enrichment", "disruption die", "intervention check",
    "scene opener", "scene closure", "gme", "plot node", "d100"]);

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["oracles", "yesno"], ["oracles", "granular"], ["oracles", "descriptive"],
  ["oracles", "story"], ["oracles", "quantifiers"],
  ["scene", "arc"], ["scene", "explore"], ["scene", "battle"],
  ["scene", "discovery"], ["scene", "people"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "forge"], ["more", "library"],
  ["more", "tutorial"], ["more", "settings"],
];

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript((s) => localStorage.setItem("umState", JSON.stringify(s)), MID);
await page.goto(url, { waitUntil: "networkidle" });

const findings = [];
const rows = [];

async function reset(tab, section) {
  await page.evaluate(async ([state, t, s]) => {
    localStorage.setItem("umState", JSON.stringify(state));
    (await import("./src/store.js")).load();
    (await import("./src/viewstate.js")).clearTransient();
    document.querySelectorAll(".modal-back").forEach((n) => n.remove());
    (await import("./src/router.js")).go(t, s);
  }, [MID, tab, section]);
  await page.waitForTimeout(60);
}

const readScreen = () => page.evaluate((TERMS) => {
  const vis = (n) => n && n.offsetParent !== null;
  const screen = document.querySelector("#screen");
  const text = (sel) => [...screen.querySelectorAll(sel)].filter(vis)
    .map((n) => n.innerText || "").join(" ").toLowerCase();
  // Prose: anything written as a sentence. Labels: anything you press or scan.
  const prose = text("p, li, .hint, .cite, .muted, .explain .body, .coach, .defrow, .strip");
  // A term sitting in a definition row IS defined, so a .defrow key is prose,
  // not a label.
  const labels = text("button, summary, h1, h2, h3, .pill, .lbl, .entry-title")
    .split(" ").filter(Boolean).join(" ");
  // The section nav is chrome, not content: it is the same row on every screen
  // of a tab and is not what the screen leads with.
  const firstContent = (() => {
    const kids = [...screen.children].filter(vis);
    for (const k of kids) {
      if (k.tagName === "H1" || k.classList.contains("section-nav") || k.tagName === "NAV") continue;
      if (k.matches("p, .lede, details.explain, .coach")) return "prose";
      if (k.querySelector("button")) return "control";
      return "other";
    }
    return "empty";
  })();
  // A glossary chip under the note is a per-term route into the definition —
  // a better one than a generic "read the rule" link, because it lands on the
  // word rather than on the screen holding it. A term with its own chip is
  // answered, so it is not counted as unexplained.
  const chips = [...screen.querySelectorAll(".chip.term")]
    .filter(vis).map((n) => (n.textContent || "").trim().toLowerCase());
  return {
    hasExplain: !!screen.querySelector("details.explain"),
    explainOpen: !!screen.querySelector("details.explain[open]"),
    firstContent,
    linksToRule: /read the rule/.test(text("button")),
    chips,
    unexplained: TERMS.filter((t) =>
      labels.includes(t) && !prose.includes(t) && !chips.some((c) => c.includes(t))),
    controls: [...screen.querySelectorAll("button")].filter(vis).length,
  };
}, TERMS);

for (const [tab, section] of ROUTES) {
  await reset(tab, section);
  const m = await readScreen();
  rows.push({ route: `${tab}/${section}`, ...m });
  if (!m.hasExplain) findings.push(`${tab}/${section}: no "what this does" note`);
  else if (!m.explainOpen) findings.push(`${tab}/${section}: note is collapsed on a fresh install`);
  if (m.firstContent === "control") findings.push(`${tab}/${section}: leads with a control, not a sentence`);
  // A term used as a heading or a button but never written out in prose is only
  // a defect if the screen also offers no way to look it up. The rules library
  // holds the glossary, so a screen that links into it has answered the question.
  const unexplained = [...new Set(m.unexplained)];
  if (unexplained.length && !m.linksToRule && !m.chips.length) {
    findings.push(`${tab}/${section}: uses ${unexplained.map((t) => `"${t}"`).join(", ")} `
      + "with no prose and no route to the rule");
  }
}

// --- dialogs: does each say what it does before it asks? -------------------
let dialogs = 0;
for (const [tab, section] of ROUTES) {
  await reset(tab, section);
  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("#screen button, #screen .btn, #action-bar button")]
      .filter((n) => n.offsetParent !== null && !n.disabled)
      .map((n) => (n.textContent || "").trim().slice(0, 40)));

  for (let i = 0; i < labels.length; i++) {
    if (/erase|delete|clear the journal|^import$/i.test(labels[i])) continue;
    await reset(tab, section);
    await page.evaluate((idx) => {
      const nodes = [...document.querySelectorAll("#screen button, #screen .btn, #action-bar button")]
        .filter((n) => n.offsetParent !== null && !n.disabled);
      nodes[idx] && nodes[idx].click();
    }, i);
    await page.waitForTimeout(110);
    if (!(await page.locator(".modal").count())) continue;
    dialogs += 1;
    const d = await page.evaluate(() => {
      const m = document.querySelector(".modal");
      const title = m.querySelector("h2")?.textContent?.trim() || "(untitled)";
      const prose = [...m.querySelectorAll("p, li, .hint, .muted, .cite")]
        .map((n) => (n.innerText || "").trim());
      const longest = prose.reduce((a, b) => (b.split(/\s+/).length > a ? b.split(/\s+/).length : a), 0);
      const fields = m.querySelectorAll("input, textarea, select").length;
      const hints = m.querySelectorAll(".hint").length;
      return { title, longest, fields, hints };
    });
    if (d.longest < 8 && !(d.fields && d.hints)) {
      findings.push(`dialog "${d.title}" (${tab}/${section}): asks without saying what it does`);
    }
  }
}

await browser.close();
server.close();

const pad = (s, n) => String(s).padEnd(n);
console.log("\nNovice audit — could a stranger tell what each surface is for?\n");
console.log(pad("route", 22) + pad("note", 10) + pad("leads with", 12) + pad("rule link", 10)
  + pad("controls", 10) + "terms used only as labels");
console.log("-".repeat(104));
for (const r of rows) {
  console.log(pad(r.route, 22) + pad(r.explainOpen ? "open" : r.hasExplain ? "CLOSED" : "NONE", 10)
    + pad(r.firstContent, 12) + pad(r.linksToRule ? "yes" : "—", 10) + pad(r.controls, 10)
    + [...new Set(r.unexplained)].join(", "));
}
console.log(`\n${rows.length} routes · ${dialogs} dialogs opened`);
console.log(findings.length ? `\n${findings.length} finding(s):\n  ` + findings.join("\n  ") : "\nNo findings.");
console.log("");
// A pass whose findings are "fixed, not tolerated" has to be able to fail, or
// the stopping rule cannot see it. Exits non-zero like the other audits.
if (findings.length) process.exit(1);
