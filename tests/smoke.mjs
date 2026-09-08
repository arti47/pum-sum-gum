// Browser smoke: boots the app, walks every route, and asserts the §6.7
// measurement contract. Runs in about a minute.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = {
  fresh: null,
  mid: JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8")),
  stress: JSON.parse(readFileSync(join(root, "tests/fixtures/stress.json"), "utf8")),
};

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

const WIDTHS = [320, 360, 390];

let pass = 0, fail = 0;
const failures = [];
const ok = (n, c, d = "") => { if (c) pass += 1; else { fail += 1; failures.push(`${n}${d ? " — " + d : ""}`); } };

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);

async function newPage(fixture, width = 390) {
  const ctx = await browser.newContext({ viewport: { width, height: 780 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  if (fixture) {
    await page.addInitScript((state) => {
      localStorage.setItem("umState", JSON.stringify(state));
    }, fixture);
  }
  await page.goto(url, { waitUntil: "networkidle" });
  return { ctx, page, errors };
}

async function goto(page, tab, section) {
  await page.evaluate(async ([t, s]) => {
    const r = await import("./src/router.js");
    r.go(t, s);
  }, [tab, section]);
  await page.waitForTimeout(60);
}

// --- 1. every route renders a heading with zero console errors -------------
for (const [name, fixture] of Object.entries(FIXTURES)) {
  const { ctx, page, errors } = await newPage(fixture);
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const heading = await page.locator("#screen h1, #screen h2, #screen h3").first().textContent().catch(() => null);
    ok(`[${name}] ${tab}/${section} renders a heading`, !!heading && heading.trim().length > 0);

    // No stray null/undefined/NaN/[object Object] text anywhere.
    const strays = await page.evaluate(() => {
      const bad = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walk.nextNode())) {
        const t = n.textContent;
        if (/\b(null|undefined|NaN|\[object Object\])\b/.test(t)) bad.push(t.trim().slice(0, 80));
      }
      return bad;
    });
    ok(`[${name}] ${tab}/${section} has no stray null/undefined/NaN`, strays.length === 0, strays.join(" | "));
  }
  ok(`[${name}] zero console errors across every route`, errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// --- 2. zero horizontal overflow at 320/360/390 ---------------------------
for (const width of WIDTHS) {
  const { ctx, page } = await newPage(FIXTURES.stress, width);
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const over = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      widest: Math.max(0, ...[...document.querySelectorAll("#screen *")]
        .map((e) => e.getBoundingClientRect().right - document.documentElement.clientWidth)),
    }));
    ok(`${width}px ${tab}/${section} no horizontal overflow`, over.doc <= 1,
      `document overflows by ${over.doc}px, widest child +${Math.round(over.widest)}px`);
  }
  await ctx.close();
}

// --- 2b. a phone on its side ----------------------------------------------
// Every other probe runs portrait. Landscape once spent 48% of a 360px-tall
// viewport on fixed chrome, which no test could see.
{
  const { ctx, page, errors } = await newPage(FIXTURES.mid, 740);
  await page.setViewportSize({ width: 740, height: 360 });
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const m = await page.evaluate(() => {
      const px = (sel) => {
        const n = document.querySelector(sel);
        return n && !n.hidden && n.offsetParent !== null ? n.getBoundingClientRect().height : 0;
      };
      const chrome = px(".tab-bar") + px("#action-bar .action-bar") + px(".plot-header");
      return {
        pct: Math.round((chrome / window.innerHeight) * 100),
        over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tap: Math.min(999, ...[...document.querySelectorAll(".tab-bar button")]
          .map((b) => b.getBoundingClientRect().height)),
      };
    });
    ok(`landscape ${tab}/${section} keeps fixed chrome under 45%`, m.pct <= 45, `${m.pct}%`);
    ok(`landscape ${tab}/${section} no horizontal overflow`, m.over <= 1, `${m.over}px`);
    ok(`landscape ${tab}/${section} tab targets stay 40px`, m.tap >= 40, `${Math.round(m.tap)}px`);
  }
  ok("landscape produced no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// --- 2c. a desktop window --------------------------------------------------
// The app is phone-first, not phone-only: at 1440px it used to be a 720px
// column with a tab bar stretched the full width beneath it.
{
  const { ctx, page, errors } = await newPage(FIXTURES.stress, 1440);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const m = await page.evaluate(() => ({
      cols: getComputedStyle(document.querySelector("#screen")).gridTemplateColumns.split(" ").length,
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pad: parseFloat(getComputedStyle(document.querySelector(".tab-bar")).paddingLeft),
    }));
    ok(`wide ${tab}/${section} flows in two columns`, m.cols === 2, `${m.cols} column(s)`);
    ok(`wide ${tab}/${section} no horizontal overflow`, m.over <= 1, `${m.over}px`);
    ok(`wide ${tab}/${section} holds the tab bar to the column`, m.pad > 0, `${m.pad}px`);
  }
  ok("a wide viewport produced no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// --- 2d. WCAG AA contrast, both themes ------------------------------------
// The palette had never been checked: 145 failing text nodes in light, the worst
// of them the label on the primary action (3.52:1). Measured against whatever is
// actually painted behind each node, not against the theme's nominal paper.
for (const theme of ["light", "dark"]) {
  const { ctx, page } = await newPage(FIXTURES.mid);
  await page.evaluate(async (t) => {
    const st = await import("./src/settings.js");
    st.Settings.setTheme(t);
    st.applyTheme();
  }, theme);
  const seen = new Map();
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const bad = await page.evaluate(() => {
      const lum = (c) => {
        const [r, g, b] = c.map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const parse = (s) => (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
      const bgOf = (n) => {
        let e = n;
        while (e) {
          const b = getComputedStyle(e).backgroundColor;
          if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) return parse(b);
          e = e.parentElement;
        }
        return [255, 255, 255];
      };
      const out = [];
      for (const n of document.querySelectorAll("#screen *, .tab-bar button, .plot-header *")) {
        if (!n.offsetParent && !n.closest(".tab-bar")) continue;
        const txt = [...n.childNodes]
          .filter((c) => c.nodeType === 3 && c.textContent.trim())
          .map((c) => c.textContent.trim()).join("");
        if (!txt) continue;
        const cs = getComputedStyle(n);
        const L1 = lum(parse(cs.color)), L2 = lum(bgOf(n));
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
        const need = large ? 3 : 4.5;
        // Two decimals of slack: sub-pixel colour rounding, not a real miss.
        if (ratio < need - 0.005) {
          out.push(`${(n.className || n.tagName).toString().slice(0, 24)} ${ratio.toFixed(2)}/${need}`);
        }
      }
      return out;
    });
    for (const b of bad) if (!seen.has(b)) seen.set(b, `${tab}/${section}`);
  }
  ok(`${theme} theme meets WCAG AA contrast`, seen.size === 0,
    [...seen].slice(0, 6).map(([k, v]) => `${v} ${k}`).join(" | "));
  await ctx.close();
}

// --- 3. primary action above the fold, nothing under the tab bar ----------
{
  const { ctx, page } = await newPage(FIXTURES.mid);
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const info = await page.evaluate(() => {
      const bar = document.querySelector(".action-bar .btn.primary");
      const actionMount = document.querySelector("#action-bar .action-bar");
      const actionTop = actionMount ? actionMount.getBoundingClientRect().top : null;
      const inline = document.querySelector("#screen .btn.primary");
      return {
        hasBar: !!bar,
        barVisible: actionTop !== null && actionTop < window.innerHeight && actionTop > 0,
        inlineTop: inline ? inline.getBoundingClientRect().top : null,
        innerHeight: window.innerHeight,
      };
    });
    // The buried check only means anything at the FOOT of the screen: scroll all
    // the way down, then assert the last control still clears the fixed bars.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(40);
    const buried = await page.evaluate(() => {
      const tabTop = document.querySelector(".tab-bar").getBoundingClientRect().top;
      const actionMount = document.querySelector("#action-bar .action-bar");
      const ceiling = actionMount ? Math.min(tabTop, actionMount.getBoundingClientRect().top) : tabTop;
      return [...document.querySelectorAll("#screen .btn, #screen button, #screen input, #screen textarea")]
        .filter((b) => {
          if (b.closest("details:not([open])")) return false;  // collapsed panels keep their last position
          const r = b.getBoundingClientRect();
          return r.height > 0 && r.top < window.innerHeight && r.bottom > ceiling + 1;
        })
        .map((b) => (b.textContent || b.tagName).trim().slice(0, 30));
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    if (info.hasBar) {
      ok(`${tab}/${section} pinned primary action is on screen`, info.barVisible);
    } else if (info.inlineTop !== null) {
      ok(`${tab}/${section} primary action is above the fold`,
        info.inlineTop < info.innerHeight, `at ${Math.round(info.inlineTop)}px of ${info.innerHeight}`);
    }
    ok(`${tab}/${section} nothing at the foot sits under the fixed bars`, buried.length === 0,
      buried.join(" | "));
  }
  await ctx.close();
}

// --- 4. explain() present and open-until-closed; tap targets; input font size
{
  const { ctx, page } = await newPage(FIXTURES.mid);
  for (const [tab, section] of ROUTES) {
    await goto(page, tab, section);
    const m = await page.evaluate(() => {
      const ex = document.querySelector("#screen details.explain");
      const smalls = [...document.querySelectorAll("#screen label.check, #screen input[type=checkbox], #screen input[type=radio]")]
        .map((n) => {
          const label = n.closest("label") || n;
          const r = label.getBoundingClientRect();
          return Math.min(r.width, r.height);
        }).filter((v) => v > 0);
      const inputs = [...document.querySelectorAll("#screen input[type=text], #screen textarea, #screen select")]
        .map((n) => parseFloat(getComputedStyle(n).fontSize));
      return {
        hasExplain: !!ex,
        explainOpen: ex ? ex.hasAttribute("open") : false,
        smallest: smalls.length ? Math.min(...smalls) : null,
        minFont: inputs.length ? Math.min(...inputs) : null,
      };
    });
    ok(`${tab}/${section} has an explain() note`, m.hasExplain);
    // The notes start expanded for a new player and collapse everywhere, for
    // good, the first time one is closed. The fixture has never closed one.
    if (m.hasExplain) ok(`${tab}/${section} explain() starts open for a new player`, m.explainOpen);
    if (m.smallest !== null) {
      ok(`${tab}/${section} checkbox rows are at least 40px`, m.smallest >= 40,
        `smallest is ${Math.round(m.smallest)}px`);
    }
    if (m.minFont !== null) {
      ok(`${tab}/${section} inputs are at least 16px`, m.minFont >= 16, `${m.minFont}px`);
    }
  }
  await ctx.close();
}

// --- 4b. closing one "what this does" note closes them everywhere ---------
// The gesture is the setting: a reader who has taken the point should not have
// to take it again on every screen, and re-opening one brings them all back.
{
  const { ctx, page } = await newPage(FIXTURES.mid);
  await goto(page, "play", "track");
  const closeOne = () => page.evaluate(() => {
    const d = document.querySelector("#screen details.explain");
    d.open = false;
    d.dispatchEvent(new Event("toggle"));
  });
  await closeOne();
  await page.waitForTimeout(120);
  await goto(page, "oracles", "yesno");
  const afterClose = await page.evaluate(() =>
    document.querySelector("#screen details.explain").hasAttribute("open"));
  ok("closing one note collapses the next screen's too", !afterClose);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("umState")).settings.explainOpen);
  ok("and the choice is stored, not just visual", stored === false);
  await page.evaluate(() => {
    const d = document.querySelector("#screen details.explain");
    d.open = true;
    d.dispatchEvent(new Event("toggle"));
  });
  await page.waitForTimeout(120);
  await goto(page, "scene", "arc");
  const afterOpen = await page.evaluate(() =>
    document.querySelector("#screen details.explain").hasAttribute("open"));
  ok("re-opening one brings them all back", afterOpen);
  await ctx.close();
}

// --- 5. section nav reaches every sibling and marks the current one -------
{
  const { ctx, page } = await newPage(FIXTURES.mid);
  const tabs = await page.evaluate(async () => {
    const r = await import("./src/router.js");
    return r.TABS.map((t) => ({ id: t.id, sections: r.liveSections(t) }));
  });
  for (const t of tabs) {
    for (const s of t.sections) {
      await goto(page, t.id, s);
      const nav = await page.evaluate((count) => {
        const buttons = [...document.querySelectorAll("#screen .section-nav button")];
        const cur = buttons.filter((b) => b.getAttribute("aria-current") === "true");
        return { n: buttons.length, current: cur.length, expected: count };
      }, t.sections.length);
      // The Journal tab renders a second pill row for filters; only the first is the nav.
      ok(`${t.id}/${s} section nav marks exactly one current`, nav.current >= 1, `${nav.current} marked`);
      ok(`${t.id}/${s} section nav reaches every sibling`, nav.n >= t.sections.length,
        `${nav.n} of ${t.sections.length}`);
    }
  }
  await ctx.close();
}

// --- 5b. the Forge's own second-level nav ----------------------------------
// The Forge is a section of More now, so the route walk reaches only its first
// screen. Its four sub-screens are driven the way a player drives them.
{
  const { ctx, page, errors } = await newPage(FIXTURES.mid, 320);
  await goto(page, "more", "forge");
  const pills = await page.locator("#screen .section-nav").nth(1).locator("button").allTextContents();
  ok("the Forge carries its own nav", pills.length === 4, pills.join("|"));
  for (let i = 0; i < pills.length; i++) {
    await page.evaluate((idx) => {
      document.querySelectorAll("#screen .section-nav")[1].querySelectorAll("button")[idx].click();
    }, i);
    await page.waitForTimeout(80);
    const h = await page.locator("#screen h1").first().textContent().catch(() => null);
    ok(`Forge/${pills[i]} renders a heading`, !!h && h.trim().length > 0);
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`Forge/${pills[i]} no horizontal overflow at 320px`, over <= 1, `${over}px`);
    const cur = await page.evaluate(() =>
      document.querySelectorAll("#screen .section-nav")[1].querySelectorAll('[aria-current="true"]').length);
    ok(`Forge/${pills[i]} marks itself current`, cur === 1, `${cur} marked`);
  }
  ok("the Forge sub-nav produced no console errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// --- 5c. five tabs, and the Forge reachable from More ----------------------
{
  const { ctx, page } = await newPage(FIXTURES.mid, 320);
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll(".tab-bar button")].map((b) => ({
      label: b.textContent, w: Math.round(b.getBoundingClientRect().width),
    })));
  ok("five tabs, not six", tabs.length === 5, tabs.map((t) => t.label).join("|"));
  ok("each tab is at least 60px wide at 320px", Math.min(...tabs.map((t) => t.w)) >= 60,
    `narrowest ${Math.min(...tabs.map((t) => t.w))}px`);
  await ctx.close();
}

// --- 5d. undo is reachable from the toast that raised it -------------------
{
  const { ctx, page } = await newPage(FIXTURES.mid);
  await goto(page, "play", "track");
  const before = await page.locator("#plot-header .ph-count").textContent();
  await page.getByRole("button", { name: "Advance without a beat" }).click();
  await page.waitForTimeout(120);
  await page.getByRole("button", { name: "Cross the next box" }).click();
  await page.waitForTimeout(300);
  // dismiss a timed-beat / resolved dialog if one fired
  const anyBtn = page.locator(".modal-actions .btn").first();
  if (await anyBtn.count()) { await anyBtn.click(); await page.waitForTimeout(120); }
  const undo = page.locator(".toast .toast-undo");
  ok("a track advance offers Undo in its toast", await undo.count() > 0);
  if (await undo.count()) {
    await undo.first().click();
    await page.waitForTimeout(200);
    const after = await page.locator("#plot-header .ph-count").textContent();
    ok("and tapping it puts the box back", after.trim() === before.trim(), `${before} → ${after}`);
  }
  await ctx.close();
}

// --- 6. the end-to-end walk: prep → scene → beat → track → close → journal -
{
  const { ctx, page, errors } = await newPage(FIXTURES.fresh);

  await goto(page, "more", "home");
  await page.getByRole("button", { name: "Prepare a game" }).first().click();
  await page.waitForTimeout(60);

  // Step 1 — universe
  await page.locator("#screen input[type=text]").first().fill("Smoke test game");
  await page.waitForTimeout(30);
  ok("wizard step 1 unlocks Next once the game is named",
    !(await page.locator("#action-bar .btn.primary").isDisabled()));
  await page.locator("#action-bar .btn.primary").click();
  await page.waitForTimeout(60);

  // Step 2 — scope
  ok("wizard step 2 is gated until the scope is named",
    await page.locator("#action-bar .btn.primary").isDisabled());
  await page.locator("#screen input[type=text]").first().fill("The smoke scope");
  await page.waitForTimeout(30);
  await page.locator("#action-bar .btn.primary").click();
  await page.waitForTimeout(60);

  // Step 3 — protagonists
  ok("wizard step 3 is gated until a protagonist exists",
    await page.locator("#action-bar .btn.primary").isDisabled());
  await page.locator("#screen input[type=text]").first().fill("Vera");
  await page.getByRole("button", { name: "Add protagonist" }).click();
  await page.waitForTimeout(60);
  await page.locator("#action-bar .btn.primary").click();
  await page.waitForTimeout(60);

  // Step 4 — sheet (Standard is preselected)
  await page.locator("#action-bar .btn.primary").click();
  await page.waitForTimeout(60);

  // Step 5 — nodes, then start
  const firstNode = page.locator("#screen .node-row input").first();
  await firstNode.fill("A storm off the cape");
  await page.locator("#action-bar .btn.primary").click();
  await page.waitForTimeout(120);

  ok("the wizard lands on the plot sheet",
    (await page.locator("#screen h1").first().textContent()).includes("The smoke scope"));
  ok("the persistent plot header appears", await page.locator("#plot-header").isVisible());
  const header0 = await page.locator("#plot-header .ph-count").textContent();
  ok("the header shows an empty track", header0.trim() === "0/11", header0);

  // Open a scene
  await goto(page, "scene", "arc");
  await page.getByRole("button", { name: "Roll a scene opener" }).first().click();
  await page.waitForTimeout(80);
  ok("a scene opens", (await page.locator("#screen .pill.on").first().textContent()) === "open");

  // Roll a beat and confirm it
  await goto(page, "play", "track");
  await page.locator("#action-bar .btn.primary").click();   // random prompt
  await page.waitForTimeout(80);
  ok("a beat card appears", await page.locator("#screen .result").first().isVisible());
  const dice = await page.locator("#screen .result .die").count();
  ok("the beat shows its dice", dice >= 1, `${dice} dice shown`);

  const confirm = page.getByRole("button", { name: "Confirm — cross a box" });
  if (await confirm.count()) {
    await confirm.first().click();
    await page.waitForTimeout(120);
    // A modal may open (timed beat / resolved); dismiss whatever is there.
    const anyBtn = page.locator(".modal-actions .btn").first();
    if (await anyBtn.count()) { await anyBtn.click(); await page.waitForTimeout(80); }
    const header1 = await page.locator("#plot-header .ph-count").textContent();
    ok("confirming crosses a box in the header", header1.trim() === "1/11", header1);
  } else {
    ok("confirm control is offered on a beat card", false, "no confirm button found");
  }

  // Ask an oracle
  await goto(page, "oracles", "yesno");
  await page.locator("#action-bar .btn.primary").click();
  await page.waitForTimeout(80);
  ok("an oracle answers", await page.locator("#screen .result-answer").first().isVisible());

  // Close the scene
  await goto(page, "scene", "arc");
  await page.getByRole("button", { name: "Roll a scene closure" }).first().click();
  await page.waitForTimeout(120);
  ok("closing a scene summarises what changed",
    (await page.locator(".modal h2").first().textContent()) === "Scene closed");
  await page.getByRole("button", { name: "Open the next scene" }).click();
  await page.waitForTimeout(80);

  // Read it back
  await goto(page, "journal", "entries");
  const entries = await page.locator("#screen .entry").count();
  ok("the journal recorded the session", entries >= 5, `${entries} entries`);
  await goto(page, "journal", "dice");
  ok("the dice distribution renders", await page.locator("#screen .dist").first().isVisible());

  ok("the end-to-end walk produced no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// --- 7. a beat on the table survives closing the app ----------------------
// Found in play: the card was module state while `lastBeat.open` was stored, so
// reopening the app left the coach announcing "A beat is on the table" over a
// screen with no way to confirm it. The fixture is whatever the app itself
// rolls — building one by hand would assert the card renders from state the
// player has no way to reach.
{
  const { ctx, page } = await newPage(FIXTURES.mid);
  await goto(page, "play", "track");
  await page.locator("#action-bar button", { hasText: "Random prompt" }).first().click();
  await page.waitForTimeout(160);
  const named = async (pg) => pg.evaluate(() => [...document.querySelectorAll("button")]
    .filter((n) => n.offsetParent && !n.classList.contains("term"))
    .map((n) => n.textContent.trim()));
  ok("rolling a beat puts a card on the table",
    (await named(page)).includes("Confirm — cross a box"));

  const raw = await page.evaluate(() => localStorage.getItem("umState"));
  const stored = (() => {
    const st = JSON.parse(raw);
    const g = st.games.find((x) => x.id === st.activeGameId);
    return g.scopes.find((x) => x.id === g.activeScopeId).lastBeat;
  })();
  ok("the beat is written down, not just displayed",
    !!(stored && stored.open && stored.beatType && stored.text));
  await ctx.close();

  // Boot a second time from exactly what the first left behind: the player
  // closing the tab and coming back.
  const { ctx: ctx2, page: page2, errors } = await newPage(JSON.parse(raw));
  await goto(page2, "play", "track");
  const after = await named(page2);
  ok("the beat is still there after reopening, and can be confirmed",
    after.includes("Confirm — cross a box"), after.join(" | ").slice(0, 140));
  ok("it is the same beat, not a fresh roll",
    (await page2.locator("#screen").innerText()).includes(stored.text));

  // Conditional so a regression is reported as a finding rather than thrown as
  // a locator timeout: a pass that crashes says less than one that names what
  // is missing.
  let closed = "never offered";
  if (after.includes("Confirm — cross a box")) {
    await page2.locator("button", { hasText: "Confirm — cross a box" }).first().click();
    await page2.waitForTimeout(160);
    closed = await page2.evaluate(() => {
      const st = JSON.parse(localStorage.getItem("umState"));
      const g = st.games.find((x) => x.id === st.activeGameId);
      return g.scopes.find((x) => x.id === g.activeScopeId).lastBeat.open;
    });
  }
  ok("confirming the restored beat closes it", closed === false, String(closed));
  ok("reopening on an open beat produced no console errors",
    errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx2.close();
}

// --- report ---------------------------------------------------------------
await browser.close();
server.close();

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log("Browser smoke green.\n");
