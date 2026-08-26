// A probe prints; it does not assert. Read the table and notice the outlier.
// Once a number is known-good it graduates into the smoke harness (§11.1 D).
//
//   node tests/probe-layout.mjs [fresh|mid|stress] [width]

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const which = process.argv[2] || "stress";
const width = Number(process.argv[3] || 390);
const file = { fresh: "fresh", mid: "mid-session", stress: "stress" }[which] || "stress";
const state = JSON.parse(readFileSync(join(root, `tests/fixtures/${file}.json`), "utf8"));

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["more", "forge"],
  ["oracles", "yesno"], ["oracles", "descriptive"], ["oracles", "story"],
  ["oracles", "granular"], ["oracles", "quantifiers"],
  ["scene", "arc"], ["scene", "explore"], ["scene", "battle"],
  ["scene", "discovery"], ["scene", "people"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "library"], ["more", "tutorial"], ["more", "settings"],
];

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript((s) => localStorage.setItem("umState", JSON.stringify(s)), state);
await page.goto(url, { waitUntil: "networkidle" });

const rows = [];
for (const [tab, section] of ROUTES) {
  await page.evaluate(async ([t, s]) => {
    const r = await import("./src/router.js");
    r.go(t, s);
  }, [tab, section]);
  await page.waitForTimeout(70);

  const m = await page.evaluate(() => {
    const vh = window.innerHeight;
    const docH = document.documentElement.scrollHeight;
    const controls = [...document.querySelectorAll("#screen button, #screen .btn, #screen input, #screen select, #screen textarea")];
    const visible = controls.filter((c) => c.offsetParent !== null);
    const taps = visible.map((c) => {
      const label = c.closest("label") || c;
      const r = label.getBoundingClientRect();
      return Math.min(r.width, r.height);
    }).filter((v) => v > 0);
    const barBtn = document.querySelector("#action-bar .btn.primary");
    const inline = document.querySelector("#screen .btn.primary");
    const primaryTop = barBtn
      ? barBtn.getBoundingClientRect().top
      : (inline ? inline.getBoundingClientRect().top + window.scrollY : null);
    return {
      viewports: +(docH / vh).toFixed(1),
      controls: visible.length,
      primary: primaryTop === null ? "—" : (barBtn ? "pinned" : Math.round(primaryTop) + "px"),
      smallestTap: taps.length ? Math.round(Math.min(...taps)) : "—",
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  rows.push({ route: `${tab}/${section}`, ...m });
}

await browser.close();
server.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nLayout probe — fixture: ${which}, width: ${width}px\n`);
console.log(pad("route", 20) + pad("height", 8) + pad("controls", 10) + pad("primary", 10) + pad("min tap", 9) + "overflow");
console.log("-".repeat(64));
for (const r of rows) {
  console.log(
    pad(r.route, 20) + pad(r.viewports + "vh", 8) + pad(r.controls, 10) +
    pad(r.primary, 10) + pad(r.smallestTap + "px", 9) + (r.overflow > 1 ? `⚠ ${r.overflow}px` : "none")
  );
}
const tall = rows.filter((r) => r.viewports > 8);
const small = rows.filter((r) => typeof r.smallestTap === "number" && r.smallestTap < 40);
console.log("");
if (tall.length) console.log(`Long screens (>8 viewports): ${tall.map((r) => r.route + " " + r.viewports).join(", ")}`);
if (small.length) console.log(`Small tap targets (<40px): ${small.map((r) => r.route + " " + r.smallestTap).join(", ")}`);

// A probe prints; it does not assert. But it must still state a verdict in one
// line, or a runner reading its output has to re-derive the judgement from the
// table — and a header word like "overflow" then reads as a finding.
const wide = rows.filter((r) => r.overflow > 1);
const bad = [...new Set([...small, ...wide])];
console.log("");
console.log(bad.length
  ? `VERDICT: ${bad.length} route(s) fail the layout floor — ${bad.map((r) => r.route).join(", ")}`
  : "VERDICT: every route fits its width and every tap target clears 40px.");
console.log("");
