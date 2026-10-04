// Modal audit. The interaction audit (§11.1 C) clicks top-level controls and then
// discards whatever modal opened — so every button INSIDE a dialog was unaudited.
// This pass opens each modal and clicks each of its buttons in isolation.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["scene", "arc"], ["scene", "sum"],
  ["oracles", "yesno"], ["oracles", "granular"],
  ["more", "forge"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "library"], ["more", "settings"],
];

// Destroy-everything controls are exercised by unit tests, not here.
const SKIP_OPENER = ["Erase everything", "Delete the current game", "Clear the journal", "Import"];
const SKIP_INNER = ["Erase everything", "Delete this game", "Erase", "Import"];

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();

const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") jsErrors.push(m.text()); });

await page.addInitScript((s) => {
  localStorage.setItem("umState", JSON.stringify(s));
  // Hashed, not measured: a swap that changes the DOM without changing its
  // length would otherwise read as a no-op.
  window.__hash = (node) => {
    const str = node ? node.innerHTML : "";
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return str.length + ":" + h.toString(36);
  };
}, MID);
await page.goto(url, { waitUntil: "networkidle" });

const findings = [];
let openers = 0, innerClicks = 0;

async function reset(tab, section) {
  await page.evaluate(async ([state, t, s]) => {
    localStorage.setItem("umState", JSON.stringify(state));
    (await import("./src/store.js")).load();
    (await import("./src/viewstate.js")).clearTransient();
    document.querySelectorAll(".modal-back").forEach((n) => n.remove());
    (await import("./src/router.js")).go(t, s);
  }, [MID, tab, section]);
  await page.waitForTimeout(40);
}

// Opening a <details> fires its toggle, which is what makes an inspiration
// block roll — so this both reveals the controls and populates them.
async function expandFolds() {
  await page.evaluate(() => {
    document.querySelectorAll(".modal details").forEach((d) => { d.open = true; });
  });
  await page.waitForTimeout(60);
}

async function screenControls() {
  return page.evaluate(() => {
    const sel = "#screen button, #screen .btn, #action-bar button";
    return [...document.querySelectorAll(sel)]
      .filter((n) => n.offsetParent !== null && !n.disabled
        && !n.closest("details:not([open]) > *:not(summary)"))
      .map((n) => (n.textContent || "").trim().slice(0, 40));
  });
}

for (const [tab, section] of ROUTES) {
  await reset(tab, section);
  const labels = await screenControls();

  for (let i = 0; i < labels.length; i++) {
    if (SKIP_OPENER.some((s) => labels[i].includes(s))) continue;
    await reset(tab, section);

    // click the opener
    const opened = await page.evaluate(async (idx) => {
      const sel = "#screen button, #screen .btn, #action-bar button";
      const nodes = [...document.querySelectorAll(sel)]
        .filter((n) => n.offsetParent !== null && !n.disabled
          && !n.closest("details:not([open]) > *:not(summary)"));
      if (!nodes[idx]) return false;
      nodes[idx].click();
      return true;
    }, i);
    if (!opened) continue;
    await page.waitForTimeout(120);

    const hasModal = await page.locator(".modal").count();
    if (!hasModal) continue;
    openers += 1;

    // Expand every fold first: an inspiration block keeps its controls behind a
    // <summary>, so collecting buttons without opening it audits none of them.
    await expandFolds();
    const inner = await page.evaluate(() =>
      [...document.querySelectorAll(".modal button")]
        .filter((n) => !n.disabled)
        .map((n) => (n.textContent || "").trim().slice(0, 40)));

    const modalTitle = await page.locator(".modal h2").first().textContent().catch(() => "(untitled)");

    for (let j = 0; j < inner.length; j++) {
      if (SKIP_INNER.some((s) => inner[j] === s)) continue;
      // re-open the modal fresh for each of its buttons
      await reset(tab, section);
      await page.evaluate(async (idx) => {
        const sel = "#screen button, #screen .btn, #action-bar button";
        const nodes = [...document.querySelectorAll(sel)]
          .filter((n) => n.offsetParent !== null && !n.disabled
            && !n.closest("details:not([open]) > *:not(summary)"));
        nodes[idx] && nodes[idx].click();
      }, i);
      await page.waitForTimeout(110);
      if (!(await page.locator(".modal").count())) continue;
      await expandFolds();

      const before = await page.evaluate(() => ({
        store: localStorage.getItem("umState") || "",
        html: window.__hash(document.querySelector("#screen")),
        modals: document.querySelectorAll(".modal").length,
        toasts: document.querySelectorAll(".toast").length,
        // A dialog that closes itself and opens another leaves the COUNT at 1.
        // Fingerprint the dialog itself or those swaps read as no-ops.
        modalId: [...document.querySelectorAll(".modal")]
          .map((m) => m.getAttribute("aria-label") + "#" + window.__hash(m)).join("|"),
      }));
      const errsBefore = jsErrors.length;

      const clicked = await page.evaluate((jdx) => {
        const b = [...document.querySelectorAll(".modal button")].filter((n) => !n.disabled)[jdx];
        if (!b) return false;
        b.click();
        return true;
      }, j);
      innerClicks += 1;
      if (!clicked) continue;

      let changed = false;
      for (let t = 0; t < 10; t++) {
        await page.waitForTimeout(40);
        const after = await page.evaluate(() => ({
          store: localStorage.getItem("umState") || "",
          html: window.__hash(document.querySelector("#screen")),
          modals: document.querySelectorAll(".modal").length,
          toasts: document.querySelectorAll(".toast").length,
          modalId: [...document.querySelectorAll(".modal")]
            .map((m) => m.getAttribute("aria-label") + "#" + window.__hash(m)).join("|"),
        }));
        changed = after.store !== before.store || after.html !== before.html
          || after.modals !== before.modals || after.toasts !== before.toasts
          || after.modalId !== before.modalId;
        if (changed) break;
      }

      if (jsErrors.length > errsBefore) {
        findings.push(`${tab}/${section} · "${labels[i]}" → [${modalTitle}] "${inner[j]}" threw — ${jsErrors[errsBefore]}`);
      } else if (!changed) {
        findings.push(`${tab}/${section} · "${labels[i]}" → [${modalTitle}] "${inner[j]}" changed nothing`);
      }
      await page.evaluate(() => document.querySelectorAll(".modal-back").forEach((n) => n.remove()));
    }
  }
}

// --- a dialog opened BY a dialog action must survive that action ----------
// The action wrapper closes the dialog after its handler runs. If it closed
// whatever is open now rather than its own dialog, a handler that opens a
// follow-up — a timed beat firing, a scope resolving — would have that
// follow-up closed the instant it appeared, and the app would look as though
// it had swallowed the news. Nothing else in this file can catch that: the
// dialog does open, so every "changed something" check passes.
{
  const state = JSON.parse(JSON.stringify(MID));
  const sc = state.games[0].scopes[0];
  sc.track.marks = { [String(sc.track.crossed || 0)]: "The horde arrives" };
  sc.track.fired = {};
  await page.evaluate(async ([s]) => {
    localStorage.setItem("umState", JSON.stringify(s));
    (await import("./src/store.js")).load();
    (await import("./src/viewstate.js")).clearTransient();
    document.querySelectorAll(".modal-back").forEach((n) => n.remove());
    (await import("./src/router.js")).go("play", "track");
  }, [state]);
  await page.waitForTimeout(80);

  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll("#screen button")]
      .find((n) => n.textContent.includes("Advance without a beat") && !n.disabled);
    if (!b) return false;
    b.click();
    return true;
  });
  if (!opened) {
    findings.push("the voluntary-advance control was not offered on the plot sheet");
  } else {
    await page.waitForTimeout(120);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll(".modal button")]
        .find((n) => n.textContent.includes("Cross the next box"));
      b && b.click();
    });
    await page.waitForTimeout(300);
    const title = await page.locator(".modal h2").first().textContent().catch(() => null);
    if (title !== "A timed plot beat fires") {
      findings.push(`a dialog opened from inside a dialog action did not survive it — saw ${title === null ? "no dialog" : `"${title}"`}`);
    }
    innerClicks += 2;
    await page.evaluate(() => document.querySelectorAll(".modal-back").forEach((n) => n.remove()));
  }
}

await browser.close();
server.close();

console.log(`\nModal audit: ${openers} modals opened, ${innerClicks} in-dialog buttons clicked\n`);
if (findings.length) {
  console.log("Findings:");
  for (const f of findings) console.log("  ✗ " + f);
  console.log("");
  process.exit(1);
}
console.log("Every dialog button does something, and nothing threw.\n");
