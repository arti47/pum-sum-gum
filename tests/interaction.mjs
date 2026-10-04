// The interaction audit (§11.1 C): visits every route and clicks every visible
// control in isolation, resetting storage between clicks, and flags three things:
// a JS error, a control that cannot be clicked, and a control that changes nothing.
// The no-op check is what catches a button wired to a handler that returns early.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["more", "forge"],
  ["oracles", "yesno"], ["oracles", "descriptive"], ["oracles", "story"],
  ["oracles", "granular"], ["oracles", "quantifiers"],
  ["scene", "arc"], ["scene", "sum"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "library"], ["more", "tutorial"], ["more", "settings"],
];

// Controls whose whole job is to destroy state are exercised elsewhere; clicking
// them here would wipe the fixture mid-audit.
const SKIP = [
  "Erase everything", "Delete the current game", "Clear the journal", "Import",
];

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();

const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") jsErrors.push(m.text()); });

await page.addInitScript((state) => {
  localStorage.setItem("umState", JSON.stringify(state));
}, MID);

const findings = [];
let clicked = 0;

await page.goto(url, { waitUntil: "networkidle" });

// Reset in-page rather than reloading: re-seed localStorage, make the store
// re-read it, clear every module's transient view state, and re-render. Same
// isolation as a reload and far faster, so the audit actually finishes.
async function resetTo(tab, section) {
  await page.evaluate(async ([state, t, s]) => {
    localStorage.setItem("umState", JSON.stringify(state));
    const store = await import("./src/store.js");
    store.load();
    const vs = await import("./src/viewstate.js");
    vs.clearTransient();
    const back = document.querySelector(".modal-back");
    if (back) back.remove();
    const r = await import("./src/router.js");
    r.go(t, s);
  }, [MID, tab, section]);
  await page.waitForTimeout(40);
}

async function snapshot() {
  return page.evaluate(() => ({
    // Hashed, not measured: a swap that changes the DOM without changing its
    // length would otherwise read as a no-op.
    html: (() => {
      const str = document.querySelector("#screen").innerHTML;
      let h = 5381;
      for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
      return str.length + ":" + h.toString(36);
    })(),
    modal: !!document.querySelector(".modal"),
    toast: document.querySelectorAll(".toast").length,
    store: localStorage.getItem("umState") ? localStorage.getItem("umState").length : 0,
    storeHash: (localStorage.getItem("umState") || "").slice(-400),
    route: document.querySelector('.tab-bar [aria-current="page"]')?.textContent || "",
    section: [...document.querySelectorAll('.section-nav [aria-current="true"]')]
      .map((n) => n.textContent).join("|"),
    scroll: window.scrollY,
  }));
}

for (const [tab, section] of ROUTES) {
  await resetTo(tab, section);

  // A control marked as the current one is meant to do nothing when tapped.
  const count = await page.evaluate(() => {
    const sel = "#screen button, #screen .btn, #action-bar button, #screen summary";
    return [...document.querySelectorAll(sel)].filter((n) =>
      n.offsetParent !== null && !n.matches('[aria-current="true"], [aria-current="page"]')
      && !n.closest("details:not([open]) > *:not(summary)")).length;
  });

  for (let i = 0; i < count; i++) {
    await resetTo(tab, section);
    const info = await page.evaluate((idx) => {
      const sel = "#screen button, #screen .btn, #action-bar button, #screen summary";
      const nodes = [...document.querySelectorAll(sel)].filter((n) =>
        n.offsetParent !== null && !n.matches('[aria-current="true"], [aria-current="page"]')
        && !n.closest("details:not([open]) > *:not(summary)"));
      const n = nodes[idx];
      if (!n) return null;
      n.setAttribute("data-audit-target", "1");
      return { label: (n.textContent || "").trim().slice(0, 40), disabled: !!n.disabled };
    }, i);
    if (!info) continue;
    if (info.disabled) continue;
    if (SKIP.some((s) => info.label.includes(s))) continue;

    const before = await snapshot();
    const errorsBefore = jsErrors.length;

    let clickFailed = null;
    try {
      await page.locator('[data-audit-target="1"]').click({ timeout: 2500 });
    } catch (err) {
      clickFailed = String(err).split("\n")[0];
    }
    clicked += 1;

    if (clickFailed) {
      findings.push(`${tab}/${section} · "${info.label}" cannot be clicked — ${clickFailed}`);
      continue;
    }

    // Poll for the change rather than waiting a fixed interval (D-15).
    let after = before, changed = false;
    for (let t = 0; t < 12; t++) {
      await page.waitForTimeout(40);
      after = await snapshot();
      changed = after.html !== before.html
        || after.modal !== before.modal
        || after.toast !== before.toast
        || after.storeHash !== before.storeHash
        || after.store !== before.store
        || after.route !== before.route
        || after.section !== before.section
        || after.scroll !== before.scroll;
      if (changed) break;
    }

    if (jsErrors.length > errorsBefore) {
      findings.push(`${tab}/${section} · "${info.label}" threw — ${jsErrors[errorsBefore]}`);
    } else if (!changed) {
      findings.push(`${tab}/${section} · "${info.label}" changed nothing`);
    }

    // Close any modal it opened so the next iteration starts clean.
    await page.evaluate(() => {
      const b = document.querySelector(".modal-back");
      if (b) b.remove();
    });
  }
}

await browser.close();
server.close();

console.log(`\nInteraction audit: ${clicked} controls clicked across ${ROUTES.length} routes\n`);
if (findings.length) {
  console.log("Findings:");
  for (const f of findings) console.log("  ✗ " + f);
  console.log("");
  process.exit(1);
}
console.log("Every control does something, and nothing threw.\n");
