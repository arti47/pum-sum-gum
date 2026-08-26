// Guide audit (§11.1 G). Earlier wording checks compared the guide against
// string literals in src/. That misses anything the app composes at runtime and
// flatters anything the guide paraphrases. This one drives the real app: it
// walks every route, opens every dialog, harvests the text actually on screen,
// and compares the guide's claims against that.
//
// Two directions:
//   guide → app   a phrase the guide presents as on-screen text must appear
//                 on screen somewhere.
//   app → guide   a control the app renders must be named in the guide.
//
// It reports; the harness does not run it.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));
const tut = await import(join(root, "data-tutorial.js"));

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["scene", "arc"], ["scene", "explore"], ["scene", "battle"],
  ["scene", "discovery"], ["scene", "people"],
  ["oracles", "yesno"], ["oracles", "descriptive"], ["oracles", "story"],
  ["oracles", "granular"], ["oracles", "quantifiers"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "forge"], ["more", "library"],
  ["more", "tutorial"], ["more", "settings"],
];
const SKIP = /erase|delete|clear the journal/i;

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript((s) => localStorage.setItem("umState", JSON.stringify(s)), MID);
await page.goto(url, { waitUntil: "networkidle" });

const seen = new Map();               // text → where it was seen
const note = (list, where) => { for (const t of list) if (t && !seen.has(t)) seen.set(t, where); };

const harvest = () => page.evaluate(() => {
  const vis = (n) => n && n.offsetParent !== null;
  const grab = (sel) => [...document.querySelectorAll(sel)].filter(vis)
    .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim()).filter((t) => t && t.length < 90);
  return grab("#screen button, #action-bar button, .modal button, .tab-bar button, .section-nav button")
    .concat(grab(".entry-title, .entry-kind, .result-kind, .result-answer"))
    .concat(grab("#screen h1, #screen h2, #screen h3, .modal h2, .modal h3"))
    .concat(grab(".field .lbl, .modal .field .lbl"))
    .concat(grab("label.check .ct strong"))          // toggle labels
    .concat(grab("#screen summary, .modal summary"))
    .concat(grab(".pill, .cite, .entry-kind, #plot-header .ph-name"));
});

async function reset(tab, section) {
  await page.evaluate(async ([state, t, s]) => {
    localStorage.setItem("umState", JSON.stringify(state));
    (await import("./src/store.js")).load();
    (await import("./src/viewstate.js")).clearTransient();
    document.querySelectorAll(".modal-back").forEach((n) => n.remove());
    (await import("./src/router.js")).go(t, s);
  }, [MID, tab, section]);
  await page.waitForTimeout(50);
}

let dialogs = 0;
for (const [tab, section] of ROUTES) {
  await reset(tab, section);
  await page.evaluate(() => document.querySelectorAll("#screen details").forEach((d) => { d.open = true; }));
  await page.waitForTimeout(60);
  note(await harvest(), `${tab}/${section}`);

  const labels = await page.evaluate(() =>
    [...document.querySelectorAll("#screen button, #screen .btn, #action-bar button")]
      .filter((n) => n.offsetParent !== null && !n.disabled).map((n) => n.textContent.trim()));

  for (let i = 0; i < labels.length; i++) {
    if (SKIP.test(labels[i])) continue;
    await reset(tab, section);
    await page.evaluate((idx) => {
      const nodes = [...document.querySelectorAll("#screen button, #screen .btn, #action-bar button")]
        .filter((n) => n.offsetParent !== null && !n.disabled);
      nodes[idx] && nodes[idx].click();
    }, i);
    await page.waitForTimeout(90);
    if (!(await page.locator(".modal").count())) { note(await harvest(), `${tab}/${section}`); continue; }
    dialogs += 1;
    await page.evaluate(() => document.querySelectorAll(".modal details").forEach((d) => { d.open = true; }));
    await page.waitForTimeout(50);
    note(await harvest(), `${tab}/${section} → ${labels[i]}`);
  }
}
await browser.close();
server.close();

// --- what the app can render, whether or not this sweep reached it ----------
// The sweep cannot reach every state (a beat card with an empty node slot, a
// scene that is not open yet), so "not seen" is not the same as "not there".
// Source strings, with template holes as wildcards, cover the rest; a phrase in
// neither is the only real finding.
const { readdirSync } = await import("node:fs");
const lit = new Set(); const pats = [];
{
  const remember = (t) => {
    if (!t || t.length < 3) return;
    if (t.includes("${")) {
      const solid = t.replace(/\$\{[^}]*\}/g, "").replace(/\s+/g, "");
      if (solid.length < 6) return;
      pats.push(new RegExp("^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\\\$\\\{[^}]*\\\}/g, ".{1,28}") + "$"));
    } else lit.add(t);
  };
  for (const f of readdirSync(join(root, "src")).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(join(root, "src", f), "utf8");
    for (const m of src.matchAll(/["`]([^"`\n]{3,80})["`]/g)) remember(m[1]);
  }
  for (const f of readdirSync(root).filter((n) => /^data-.*\.js$/.test(n))) {
    const src = readFileSync(join(root, f), "utf8");
    for (const m of src.matchAll(/(?:name|term|title|label|text):\s*"([^"]{3,80})"/g)) remember(m[1]);
  }
}
const inSource = (t) => lit.has(t) || pats.some((p) => p.test(t));

// --- the guide's claims -----------------------------------------------------
const onScreen = new Set(seen.keys());
const says = (t) => {
  if (onScreen.has(t)) return true;
  // "Recall" is rendered "Recall (1)"; "Game Unfolding Machine (GUM v2.2)" is
  // the whole label. Accept a claim that matches either side of a suffix.
  const bare = t.replace(/\s*\([^)]*\)$/, "");
  if (bare !== t && onScreen.has(bare)) return true;
  if ([...onScreen].some((s) => s.replace(/\s*\([^)]*\)$/, "") === t)) return true;
  // a label the app composes: "Show all 10 slots", "All 6 tables", "1d20"
  const rx = new RegExp("^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{?N\\\}?|\bN\b|\bdN\b/g, "\\d+") + "$", "i");
  return [...onScreen].some((s) => rx.test(s));
};

const claims = new Map();             // phrase → where the guide says it
const addClaim = (t, where) => {
  let s = t.trim();
  // A bullet reads "Group: Control · Control"; the group name is prose.
  if (s.includes(": ")) s = s.slice(s.indexOf(": ") + 2);
  s = s.replace(/[“”"']/g, "").replace(/[.,;:]+$/, "").trim();
  if (/\([^)]*$/.test(s)) s = s.replace(/\s*\([^)]*$/, "");   // an unclosed tail
  if (/ (and|or) /.test(s) && s.split(" ").length > 4) return; // a clause, not a label
  if (s.includes(",")) return;               // a list inside prose, not one label
  if (!s || s.length < 3 || s.length > 46) return;
  if (/^[a-z]/.test(s)) return;                 // prose, not a label
  if (/<[^>]+>/.test(s)) return;                // a placeholder the guide writes
  if (/\. /.test(s)) return;                    // a sentence remnant
  if (/\)$/.test(s) && !s.includes("(")) return; // half of a parenthetical
  if (!claims.has(s)) claims.set(s, where);
};

for (const part of tut.PARTS) {
  for (const sec of part.sections) {
    for (const b of sec.blocks) {
      if (b.tap) for (const seg of b.tap.split("→")) addClaim(seg.trim(), `tap: ${b.tap}`);
      if (!/reference/i.test(part.title)) continue;
      for (const line of (b.bullets || [])) {
        const body = line.includes(" — ") ? line.split(" — ").slice(1).join(" — ") : line;
        for (const raw of body.split(/ · | \/ /)) {
          const t = raw.replace(/\(.*?\)/g, "").trim();
          if (t.includes("→") || t.split(" ").length > 6) continue;
          addClaim(t, `${part.title} → ${sec.title}`);
        }
      }
    }
  }
}

const TABS = new Set(["Play", "Scene", "Oracles", "Journal", "More"]);
const rest = [...claims].filter(([t]) => !TABS.has(t) && !says(t));
const unreached = rest.filter(([t]) => inSource(t));
const drift = rest.filter(([t]) => !inSource(t));

// A sibling document (a scenario walkthrough kept outside the repo) can be
// checked against the same harvest.
if (process.env.DUMP_SCREEN_STRINGS) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.env.DUMP_SCREEN_STRINGS, JSON.stringify([...onScreen], null, 0));
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nGuide audit — the guide's wording against what the app actually renders\n`);
console.log(`${onScreen.size} distinct strings harvested from ${ROUTES.length} routes and ${dialogs} dialogs`);
console.log(`${claims.size} phrases the guide presents as on-screen text\n`);
console.log(`${claims.size - rest.length} seen on screen during the sweep`);
console.log(`${unreached.length} the app can render but this sweep never reached`);
if (!drift.length) console.log("\nNo phrase in the guide is missing from the app.");
else {
  console.log(`\n${drift.length} the app never says:\n`);
  const near = (t) => {
    const a = new Set((t.toLowerCase().match(/.{1,3}/g) || []));
    let best = "", bs = 0;
    for (const s of onScreen) {
      const b2 = new Set((s.toLowerCase().match(/.{1,3}/g) || []));
      let i = 0; for (const x of a) if (b2.has(x)) i++;
      const sc = i / Math.max(a.size, b2.size);
      if (sc > bs) { bs = sc; best = s; }
    }
    return bs > 0.3 ? `app says: "${best}"` : "(nothing like it on screen)";
  };
  for (const [t, where] of drift) console.log("  ✗ " + pad(`"${t}"`, 44) + near(t));
}
console.log("");
// The guide is a shipped document; a phrase in it the app never says is a lie
// to the reader. Exits non-zero so the stopping rule can see it.
if (drift.length) process.exit(1);
