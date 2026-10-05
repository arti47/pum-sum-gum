// The guided path: a stranger who presses only the one orange button on each
// screen — the pinned bar's primary, or a dialog's primary — and types a line
// wherever a text box asks for one. Nothing else: no tab bar, no reading.
//
// The question is not "can every step be reached" (probe-firstrun asks that)
// but "does the app's own next move ever lead nowhere": a disabled button with
// nothing marked to do, a button that sends you round in a circle, or an arc
// that never reaches its ending. Each of those was found by this walk before it
// existed as a probe (§8, 2026-10-04).
//
//   node tests/probe-guided.mjs

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });

const steps = [];
let stall = null;
for (let i = 0; i < 220; i++) {
  await page.waitForTimeout(150);
  const r = await page.evaluate(() => {
    const vis = (n) => n && n.offsetParent !== null && !n.disabled;
    const where = `${document.body.dataset.tab}/${document.body.dataset.section}`;
    const modal = document.querySelector(".modal");
    const fill = (root) => {
      for (const f of root.querySelectorAll("input[type=text], input:not([type]), textarea")) {
        if (vis(f) && !f.value && (modal || f.closest(".field"))) {
          f.value = "The rain hammers the old mill.";
          f.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    };
    if (modal) {
      fill(modal);
      const b = [...modal.querySelectorAll("button.primary")].find(vis);
      if (!b) return { where, stall: `dialog "${modal.querySelector("h2, h3")?.textContent}" offers no primary` };
      const t = b.textContent.trim(); b.click();
      return { where, pressed: t, dialog: true };
    }
    fill(document);
    const b = [...document.querySelectorAll("#action-bar .btn.primary")].find(vis)
      || [...document.querySelectorAll("#screen .btn.primary")].find(vis);
    if (!b) return { where, stall: "no enabled orange button on this screen" };
    const t = b.textContent.trim(); b.click();
    return { where, pressed: t };
  });
  if (r.stall) { stall = `${r.where}: ${r.stall}`; break; }
  steps.push(`${r.where} → ${r.pressed}`);
  const state = await page.evaluate(() => {
    try { const s = JSON.parse(localStorage.umState); const g = s.games[0]; return g ? { scopes: g.scopes.length } : null; }
    catch { return null; }
  });
  // The arc is complete once a second storyline has been started from the end
  // of the first — the guided path went all the way round.
  if (state && state.scopes >= 2) break;
}

const state = await page.evaluate(() => {
  const s = JSON.parse(localStorage.umState || "null");
  const g = s && s.games[0];
  if (!g) return null;
  const first = g.scopes[0];
  return {
    scopes: g.scopes.length, crossed: first.track.crossed,
    ending: g.journal.some((e) => e.kind === "ending"),
    scenes: g.journal.filter((e) => e.kind === "scene" && /closed/i.test(e.title)).length,
  };
});
await browser.close();
server.close();

// A loop is the same press repeating with nothing changing; the walk's cap
// catches it, and a run that never started a second storyline did not finish.
const finished = state && state.scopes >= 2 && state.ending && state.crossed > 0;
console.log(`\nGuided path — ${steps.length} presses of the one orange button\n`);
const seen = new Set();
for (const s of steps) if (!seen.has(s)) { seen.add(s); console.log("  " + s); }
if (state) console.log(`\n  first storyline: ${state.crossed} boxes crossed over ${state.scenes} scenes, ending ${state.ending ? "written" : "NOT written"}`);
if (stall) console.log(`  stalled at ${stall}`);
if (errors.length) console.log("  page errors:\n    " + errors.join("\n    "));
console.log(finished && !stall && !errors.length
  ? "\nVERDICT: every orange press led on, from an empty app to a written ending and the next storyline."
  : `\nVERDICT: the guided path ${stall ? "stalled" : "did not reach a written ending and a new storyline"}${errors.length ? `, with ${errors.length} page error(s)` : ""}.`);
process.exit(finished && !stall && !errors.length ? 0 : 1);
