// Flow probe (§11.1 D). Walks the book's own loop and prints, for each step,
// how many taps it took and whether the step was reachable WITHOUT the tab bar —
// i.e. whether the screen you were on named the next thing to do.
//
// A probe prints; it does not assert.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript((s) => localStorage.setItem("umState", JSON.stringify(s)), MID);
await page.goto(url, { waitUntil: "networkidle" });

const rows = [];

async function route() {
  return page.evaluate(() => ({
    tab: document.querySelector('.tab-bar [aria-current="page"]')?.textContent.replace(/\s+/g, "") || "?",
    heading: document.querySelector("#screen h1")?.textContent || "",
  }));
}

// Click a control by visible label anywhere on the screen or in the action bar.
// Returns false if no such control is offered — that is the interesting result.
async function tap(label) {
  const hit = await page.evaluate((want) => {
    const nodes = [...document.querySelectorAll("#screen button, #screen .btn, #action-bar button, .modal button")]
      .filter((n) => n.offsetParent !== null && !n.disabled
        // A glossary chip is a definition link, not a step of play. "Confirming
        // a beat" would otherwise be the first control matching "Confirm".
        && !n.classList.contains("term"));
    const n = nodes.find((x) => (x.textContent || "").trim().toLowerCase().includes(want.toLowerCase()));
    if (!n) return false;
    n.click();
    return true;
  }, label);
  if (hit) await page.waitForTimeout(140);
  return hit;
}

async function step(name, label, expectTab) {
  const before = await route();
  const offered = await tap(label);
  const after = await route();
  rows.push({
    name,
    offered: offered ? "yes" : "NO — tab bar needed",
    from: before.tab,
    to: after.tab,
    crossedTab: before.tab !== after.tab ? "→" : "",
    onTarget: expectTab ? (after.tab.toLowerCase().includes(expectTab) ? "ok" : "off") : "",
  });
  return offered;
}

// Start on the plot sheet, mid-session, with a scene already open in the fixture.
await page.evaluate(async () => (await import("./src/router.js")).go("play", "track"));
await page.waitForTimeout(120);

// 1. the scene is running; the plot sheet should offer the way back to it
await step("plot sheet → back to the scene", "Back to the scene", "scene");

// 2. mid-scene the book says to ask when you do not know
await step("scene → ask an oracle", "Ask an oracle", "oracles");

// 3. ask it
await step("oracles → ask", "Ask", "oracles");

// 4. the answer should offer the beat its trigger implies (PUM p.28)
await step("answer → the beat it triggers", "random prompt", "play");

// 5. the beat is on the table; confirm it
await step("beat → confirm", "Confirm", "play");
await tap("Play it");          // dismiss a timed-beat modal if one fired
await tap("Stay here");        // or a resolved-scope modal

// 6. from the plot sheet, back to the scene to close it
await step("plot sheet → the scene", "Back to the scene", "scene");
await step("scene → close it", "Roll a scene closure", "scene");

// 7. a closed scene should name what comes next
await step("closure → the next scene", "Open the next scene", "scene");

// 8. and the record should be reachable from where you are
await page.evaluate(async () => (await import("./src/router.js")).go("play", "track"));
await page.waitForTimeout(100);
await step("plot sheet → write it down", "Write it down", "journal");

await browser.close();
server.close();

const pad = (s, n) => String(s).padEnd(n);
console.log("\nFlow probe — the book's loop, walked without using the tab bar\n");
console.log(pad("step", 36) + pad("offered in place?", 22) + pad("from→to", 16) + "on target");
console.log("-".repeat(84));
for (const r of rows) {
  console.log(pad(r.name, 36) + pad(r.offered, 22) + pad(`${r.from} ${r.crossedTab} ${r.to}`, 16) + r.onTarget);
}
const gaps = rows.filter((r) => r.offered !== "yes");
console.log("");
console.log(gaps.length
  ? `${gaps.length} step(s) needed the tab bar: ${gaps.map((g) => g.name).join("; ")}`
  : "Every step of the loop was offered by the screen the player was already on.");
console.log("");
console.log(gaps.length
  ? `VERDICT: ${gaps.length} step(s) of the book's loop needed the tab bar`
  : "VERDICT: every step of the book's loop was offered in place.");
console.log("");
