// First-run probe (§11.1 D). The flow probe walks the loop from a mid-session
// fixture — a game already prepared, a scene already open. This one starts from
// an empty localStorage, the way a stranger does, and walks the whole arc:
// open the app → prepare a game → write a node → open a scene → ask an oracle →
// call a beat → confirm it → close the scene → read it back.
//
// For each step it records whether the screen the player was already on offered
// the next thing, and how many taps that step cost. A probe prints; it does not
// assert.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });

const rows = [];
let taps = 0;

const snapshot = () => page.evaluate(() => {
  const vis = (n) => n && n.offsetParent !== null;
  const bar = document.querySelector("#action-bar .btn.primary");
  return {
    heading: document.querySelector("#screen h1")?.textContent?.trim() || "",
    primary: bar && vis(bar) ? bar.textContent.trim() : "(none pinned)",
    controls: [...document.querySelectorAll("#screen button, #action-bar button, .modal button")]
      .filter(vis).length,
    aboveFold: [...document.querySelectorAll("#screen button, #action-bar button")]
      .filter((n) => vis(n) && n.getBoundingClientRect().top < window.innerHeight).length,
    modal: !!document.querySelector(".modal"),
  };
});

async function tap(label, { exact = false } = {}) {
  const hit = await page.evaluate(({ want, exact }) => {
    const nodes = [...document.querySelectorAll(
      ".modal button, #screen button, #screen .btn, #action-bar button, .tab-bar button, .sectionnav button")]
      .filter((n) => n.offsetParent !== null && !n.disabled
        // A glossary chip is a definition link, not a step of play. "Confirming
        // a beat" would otherwise be the first control matching "Confirm".
        && !n.classList.contains("term"));
    const t = (x) => (x.textContent || "").trim().toLowerCase();
    const n = exact ? nodes.find((x) => t(x) === want.toLowerCase())
                    : nodes.find((x) => t(x).includes(want.toLowerCase()));
    if (!n) return false;
    n.click();
    return true;
  }, { want: label, exact });
  if (hit) { taps += 1; await page.waitForTimeout(160); }
  return hit;
}

async function type(label, value) {
  return page.evaluate(({ label, value }) => {
    const fields = [...document.querySelectorAll(".modal .field, #screen .field")];
    const f = fields.find((x) => (x.querySelector(".lbl")?.textContent || "").toLowerCase().includes(label.toLowerCase()));
    const i = f && f.querySelector("input, textarea");
    if (!i) return false;
    i.value = value;
    i.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, { label, value });
}

// A step is: what a first-timer is trying to do, and the label they would look for.
async function step(name, label, opts = {}) {
  const before = await snapshot();
  const t0 = taps;
  const offered = await tap(label, opts);
  const after = await snapshot();
  if (!offered && process.env.PROBE_DEBUG) {
    const labels = await page.evaluate(() => [...document.querySelectorAll(
      ".modal button, #screen button, #screen .btn, #action-bar button")]
      .filter((n) => n.offsetParent !== null).map((n) => (n.disabled ? "[x] " : "") + n.textContent.trim().slice(0, 40)));
    console.log(`   ! "${label}" not found. On screen: ${labels.join(" | ")}`);
  }
  rows.push({
    name,
    offered: offered ? "yes" : "NOT OFFERED",
    was: before.primary,
    now: after.primary,
    taps: taps - t0,
    controls: after.controls,
  });
  return offered;
}

// --- the arc ---------------------------------------------------------------
const first = await snapshot();
rows.push({ name: "cold open (no games yet)", offered: "—", was: "—", now: first.primary,
  taps: 0, controls: first.controls });

await step("start preparing a game", "Prepare a game");
await type("Name this game", "The Ashfall Contract");
await step("step 1 → next", "Next");
await type("Plot scope name", "Find out who burned the archive");
await step("step 2 → next", "Next");
await type("Name", "Wren");
await step("add a protagonist", "Add protagonist");
await step("step 3 → next", "Next");
// Standard is pre-chosen and leads alone; the other nine are one tap away.
await step("see the other nine sheets", "Show all ten plot sheets");
await step("step 4 → next", "Next");
await step("write a plot node", "Add");
await type("", "The burned archive");
await tap("Save");
await step("finish prep", "Start playing");
await tap("Stay here");

// The starting point is optional during prep, so a first-time player commonly
// arrives on the Play tab without one — and the coach's first job is to say so.
// This step exists because the app now guides that gap rather than leaving the
// player on a screen whose next move they cannot see.
await step("coach: write the starting point", "Write the starting point");
await type("", "The raid site, three days cold, with the lord's rider still waiting.");
await tap("Save");

await step("open a scene", "Open a scene");
await step("roll the opener", "Roll a scene opener");
await step("ask an oracle", "Ask an oracle");
await step("ask it", "Ask");
await step("the beat the answer triggers", "random prompt");
await step("confirm the beat", "Confirm");
await tap("Play it"); await tap("Stay here");
await step("back to the scene", "Back to the scene");
await step("close the scene", "Roll a scene closure");
await step("read it back", "Write it down");

await browser.close();
server.close();

const pad = (s, n) => String(s).padEnd(n);
console.log("\nFirst-run probe — a stranger, from an empty app to a played scene, at 390px\n");
console.log(pad("step", 34) + pad("offered?", 14) + pad("taps", 6) + pad("pinned primary after", 30) + "controls");
console.log("-".repeat(96));
for (const r of rows) {
  console.log(pad(r.name, 34) + pad(r.offered, 14) + pad(r.taps, 6) + pad(r.now, 30) + r.controls);
}
const gaps = rows.filter((r) => r.offered === "NOT OFFERED");
console.log("");
console.log(`${taps} taps from a cold open to a scene played and journalled.`);
console.log(gaps.length
  ? `${gaps.length} step(s) the screen did not offer: ${gaps.map((g) => g.name).join("; ")}`
  : "Every step was offered by the screen the player was already on.");
if (errors.length) console.log(`\n${errors.length} page error(s): ${errors[0]}`);

// One line a runner can read, so the stopping rule does not have to re-derive
// this probe's judgement from its own table.
console.log("");
console.log(gaps.length || errors.length
  ? `VERDICT: ${gaps.length} unoffered step(s), ${errors.length} page error(s) on the first-run path`
  : "VERDICT: every step of the first run was offered in place, with no page errors.");
console.log("");
