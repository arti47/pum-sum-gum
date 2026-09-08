// The playtest driver (§11.1 H). Every other harness asks a structural question
// — is this control reachable, is this rule implemented, does this function run.
// All of them stay green on an app nobody can play a session with. This one
// presses real controls by their visible label, one beat per invocation, with
// the campaign persisted on disk between invocations, so a session can be
// played across many commands and resumed tomorrow.
//
//   node tests/playtest.mjs new                     fresh campaign, land in play
//   node tests/playtest.mjs state                   who am I, what is live
//   node tests/playtest.mjs screen play/track       navigate
//   node tests/playtest.mjs do "Random prompt"      press a control by its label
//   node tests/playtest.mjs choose "Confirm"        answer the open dialog
//   node tests/playtest.mjs type "Wren"             fill the focused field
//   node tests/playtest.mjs write "..."             a journal entry, in the app
//   node tests/playtest.mjs journal                 the record, OLDEST FIRST
//
// Verbs chain in one invocation, because a dialog cannot survive the reload
// between two of them:
//   node tests/playtest.mjs do "Add a protagonist" type "Wren" choose "Save"
//
// --seed N stubs crypto.getRandomValues (this app never uses Math.random, so
// seeding that would seed nothing) with a deterministic stream, so a session
// reproduces roll for roll.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(root, ".playtest");
const STATE = join(DIR, "state.json");
const LOG = join(DIR, "transcript.md");

const argv = process.argv.slice(2);
const seedArg = argv.indexOf("--seed");
const SEED = seedArg > -1 ? Number(argv[seedArg + 1]) : null;
const quiet = argv.includes("--quiet");
const steps = [];
for (let i = 0; i < argv.length; i += 1) {
  const v = argv[i];
  if (v === "--seed") { i += 1; continue; }
  if (v === "--quiet") continue;
  if (["new", "state", "journal", "screen", "do", "choose", "type", "write", "controls", "read", "set"].includes(v)) {
    const takesArg = ["screen", "do", "choose", "type", "write", "set"].includes(v);
    steps.push({ verb: v, arg: takesArg ? argv[++i] : null });
  } else {
    console.error(`unknown verb "${v}"`);
    process.exit(2);
  }
}
if (!steps.length) { console.error("nothing to do"); process.exit(2); }

mkdirSync(DIR, { recursive: true });
const say = (s = "") => { if (!quiet) console.log(s); };

// --- the page ---------------------------------------------------------------
const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });

// The dice are the app's, and they are cryptographic. A seeded run replaces the
// source rather than the caller, so rejection sampling, uid() and every roll
// stay exactly the code that ships.
if (SEED !== null) {
  await page.addInitScript((seed) => {
    let s = (seed >>> 0) || 1;
    const next = () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s >>> 0;
    };
    const real = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (buf) => {
      if (!(buf instanceof Uint32Array)) return real(buf);
      for (let i = 0; i < buf.length; i += 1) buf[i] = next();
      return buf;
    };
  }, SEED);
}

const saved = existsSync(STATE) ? readFileSync(STATE, "utf8") : null;
if (saved && !steps.some((s) => s.verb === "new")) {
  await page.addInitScript((s) => localStorage.setItem("umState", s), saved);
}
await page.goto(url, { waitUntil: "networkidle" });

// --- reading the screen the way a player does -------------------------------
const look = () => page.evaluate(() => {
  const vis = (n) => n && n.offsetParent !== null;
  const txt = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
  const modal = document.querySelector(".modal");
  const labels = (sel) => [...document.querySelectorAll(sel)].filter(vis)
    // A glossary chip is a definition link, not a move: pressing one navigates
    // to the rules and looks, in a transcript, exactly like playing.
    .filter((n) => !n.classList.contains("term"))
    .map(txt).filter(Boolean);
  const header = document.querySelector("#plot-header");
  return {
    // The app routes in module state, not the URL, so read the two navs that
    // mark where you are — the same thing a player reads.
    route: [
      (document.querySelector('.tab-bar [aria-current="page"]')?.textContent || "?").trim(),
      (document.querySelector('.section-nav [aria-current="true"]')?.textContent || "").trim(),
    ].filter(Boolean).join(" / "),
    heading: txt(document.querySelector("#screen h1") || {}) || "",
    header: header && vis(header) ? txt(header) : "",
    dialog: modal ? {
      title: txt(modal.querySelector("h2") || {}),
      body: [...modal.querySelectorAll("p, li, .hint")].map(txt).filter(Boolean).slice(0, 6),
      options: [...modal.querySelectorAll("button")].filter((n) => !n.disabled).map(txt),
      fields: [...modal.querySelectorAll("input[type=text], input[type=number], textarea")].length,
    } : null,
    result: txt(document.querySelector("#screen .result") || {}),
    controls: modal ? [] : labels("#screen button, #screen .btn, #action-bar button"),
    disabled: modal ? [] : [...document.querySelectorAll("#screen button, #action-bar button")]
      .filter((n) => vis(n) && n.disabled).map(txt),
  };
});

const journal = () => page.evaluate(() => {
  const raw = localStorage.getItem("umState");
  if (!raw) return [];
  const st = JSON.parse(raw);
  const g = (st.games || []).find((x) => x.id === st.activeGameId) || (st.games || [])[0];
  if (!g) return [];
  // Stored newest-first; a diary reads the other way.
  return [...(g.journal || [])].reverse().map((e) => ({
    ts: e.ts, kind: e.kind, title: e.title, detail: e.detail, note: e.note,
    dice: (e.dice || []).map((d) => `${d.label}=${d.value}`).join(" "),
  }));
});

const snapshot = () => page.evaluate(() => localStorage.getItem("umState") || "");

// --- pressing things --------------------------------------------------------
// By visible label, never by selector: a control a player cannot name from the
// screen is a finding, and a selector would hide it.
async function press(label, where) {
  // "Journey > Choose this sheet" — ten cards whose buttons all read the same
  // words; a player tells them apart by the card they sit in, so the driver
  // can too. The part before " > " scopes to the nearest block containing it.
  const hit = await page.evaluate(([want0, sel]) => {
    const vis = (n) => n && n.offsetParent !== null;
    const txt = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    let scope = null, want = want0;
    if (want0.includes(" > ")) { const i = want0.indexOf(" > "); scope = want0.slice(0, i).trim(); want = want0.slice(i + 3).trim(); }
    let nodes = [...document.querySelectorAll(sel)]
      .filter((n) => vis(n) && !n.disabled && !n.classList.contains("term"));
    // Depth matters: a common ancestor of the whole screen contains every
    // heading, so the *closest* block that says the scope wins, not the first.
    // The *smallest* block that says the scope wins, not the nearest ancestor:
    // a card containing ten sheet cards also contains the word, and its own
    // buttons sit closer to it than the ones inside the card you meant.
    const near = (n) => {
      let a = n.parentElement, depth = 0;
      while (a && depth < 8) {
        const t = txt(a);
        if (t.toLowerCase().includes(scope.toLowerCase())) return t.length;
        a = a.parentElement; depth += 1;
      }
      return -1;
    };
    if (scope) {
      const scored = nodes.map((n) => [n, near(n)]).filter(([, d]) => d >= 0)
        .sort((a, b) => a[1] - b[1]);
      const best = scored.length ? scored[0][1] : -1;
      nodes = scored.filter(([, d]) => d === best).map(([n]) => n);
    }
    const exact = nodes.find((n) => txt(n).toLowerCase() === want.toLowerCase());
    const loose = nodes.find((n) => txt(n).toLowerCase().includes(want.toLowerCase()));
    const n = exact || loose;
    if (!n) return { ok: false, offered: nodes.map(txt) };
    n.click();
    return { ok: true, pressed: txt(n) };
  }, [label, where]);
  await page.waitForTimeout(140);
  return hit;
}

async function typeInto(text) {
  // Same " > " scoping as press: "A list of your own > Debts owed" types into the
  // first empty field inside the block whose words say what it is for. Without a
  // scope it is the old behaviour — the first empty field on screen.
  return page.evaluate((v0) => {
    const vis = (n) => n && n.offsetParent !== null;
    const txt = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
    let scope = null, v = v0;
    if (v0.includes(" > ")) { const i = v0.indexOf(" > "); scope = v0.slice(0, i).trim(); v = v0.slice(i + 3).trim(); }
    const box = document.querySelector(".modal") || document.querySelector("#screen");
    let fields = [...box.querySelectorAll("input[type=text], input[type=number], textarea")].filter(vis);
    if (scope) {
      const near = (n) => {
        if ((n.placeholder || "").toLowerCase().includes(scope.toLowerCase())) return -1;
        let a = n.parentElement, depth = 0;
        while (a && depth < 8) {
          const t = txt(a);
          if (t.toLowerCase().includes(scope.toLowerCase())) return t.length;
          a = a.parentElement; depth += 1;
        }
        return Infinity;
      };
      const scored = fields.map((n) => [n, near(n)]).filter(([, d]) => d < Infinity)
        .sort((a, b) => a[1] - b[1]);
      const best = scored.length ? scored[0][1] : Infinity;
      fields = scored.filter(([, d]) => d === best).map(([n]) => n);
    }
    const f = fields.find((n) => !n.value) || fields[0];
    if (!f) return false;
    f.value = v;
    f.dispatchEvent(new Event("input", { bubbles: true }));
    f.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, text);
}

function fmtState(s) {
  const out = [];
  out.push(`route     ${s.route}`);
  if (s.header) out.push(`track     ${s.header}`);
  if (s.heading) out.push(`screen    ${s.heading}`);
  if (s.result) out.push(`result    ${s.result.slice(0, 160)}`);
  if (s.dialog) {
    out.push(`dialog    ${s.dialog.title}`);
    for (const b of s.dialog.body) out.push(`          ${b.slice(0, 110)}`);
    if (s.dialog.fields) out.push(`fields    ${s.dialog.fields} to fill`);
    out.push(`options   ${s.dialog.options.join(" · ")}`);
  } else {
    out.push(`controls  ${s.controls.join(" · ")}`);
    if (s.disabled.length) out.push(`disabled  ${s.disabled.join(" · ")}`);
  }
  return out.join("\n");
}

// --- verbs ------------------------------------------------------------------
let failed = false;

async function run(step) {
  const { verb, arg } = step;
  if (verb === "new") {
    await page.evaluate(() => localStorage.removeItem("umState"));
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(async () => (await import("./src/router.js")).go("more", "home"));
    await page.waitForTimeout(120);
    say("new campaign — nothing prepared yet");
    say(fmtState(await look()));
    return;
  }
  if (verb === "state") { say(fmtState(await look())); return; }
  if (verb === "controls") { say((await look()).controls.join("\n")); return; }
  // read — the full text of the result card / the open dialog / the whole screen,
  // one block-level node per line. `state` truncates at 160 chars and runs blocks
  // together, which is fine for pressing buttons and useless for reading fiction.
  if (verb === "read") {
    const lines = await page.evaluate((which) => {
      const vis = (n) => n && n.offsetParent !== null;
      const root = which === "screen"
        ? document.querySelector("#screen")
        : (document.querySelector(".modal") || document.querySelector("#screen .result")
           || document.querySelector("#screen"));
      if (!root) return [];
      const out = [];
      const walk = (n) => {
        for (const c of n.childNodes) {
          if (c.nodeType === 3) {
            const t = c.textContent.replace(/\s+/g, " ").trim();
            if (t) out.push({ d: 0, t });
          } else if (c.nodeType === 1) {
            if (!vis(c) && c.tagName !== "OPTION") continue;
            // A textarea's content is its .value, not its text nodes — and the
            // export dialogs are nothing but a textarea.
            if (c.tagName === "TEXTAREA" && c.value) {
              out.push({ br: true }); out.push({ d: 0, t: c.value }); out.push({ br: true }); continue;
            }
            const block = getComputedStyle(c).display !== "inline";
            if (block) out.push({ br: true });
            walk(c);
            if (block) out.push({ br: true });
          }
        }
      };
      walk(root);
      const rows = [];
      let cur = [];
      for (const o of out) {
        if (o.br) { if (cur.length) { rows.push(cur.join(" ")); cur = []; } }
        else cur.push(o.t);
      }
      if (cur.length) rows.push(cur.join(" "));
      return rows.filter(Boolean);
    }, arg || "");
    for (const l of lines) say(l);
    return;
  }
  if (verb === "journal") {
    const j = await journal();
    if (!j.length) { say("(the record is empty)"); return; }
    for (const e of j) {
      say(`${new Date(e.ts).toISOString().slice(11, 16)}  [${e.kind}] ${e.title || ""}`
        + (e.dice ? `   ${e.dice}` : ""));
      if (e.detail) say(`        ${e.detail}`);
      if (e.note) say(`        note: ${e.note}`);
    }
    return;
  }
  // set "Theme = dark" / "Text size = 1.15" — the two controls that are not
  // buttons: a <select> and a range slider, matched by the words next to them.
  if (verb === "set") {
    const [lbl, val] = arg.split("=").map((x) => x.trim());
    const ok = await page.evaluate(([l, v]) => {
      const vis = (n) => n && n.offsetParent !== null;
      const txt = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
      const nodes = [...document.querySelectorAll("select, input[type=range]")].filter(vis);
      const n = nodes.find((x) => {
        const lab = x.closest("label") || x.parentElement;
        return lab && txt(lab).toLowerCase().includes(l.toLowerCase());
      }) || nodes[0];
      if (!n) return false;
      n.value = v;
      n.dispatchEvent(new Event("input", { bubbles: true }));
      n.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, [lbl, val]);
    if (!ok) { failed = true; say(`STALL: no control called "${lbl}"`); } else say(`set: ${lbl} = ${val}`);
    return;
  }
  if (verb === "screen") {
    const [tab, section] = arg.split("/");
    await page.evaluate(async ([t, s]) => (await import("./src/router.js")).go(t, s || null), [tab, section]);
    await page.waitForTimeout(120);
    say(fmtState(await look()));
    return;
  }
  if (verb === "type") {
    const ok = await typeInto(arg);
    if (!ok) { failed = true; say(`STALL: nothing to type into`); }
    return;
  }
  if (verb === "write") {
    // The app's own record, through its own control, not a store call.
    await page.evaluate(async () => (await import("./src/router.js")).go("journal", "entries"));
    await page.waitForTimeout(120);
    const opened = await press("Write an entry", "#screen button, #action-bar button");
    if (!opened.ok) { failed = true; say(`STALL: no way to write in the journal — offered: ${opened.offered.join(" · ")}`); return; }
    await typeInto(arg);
    const saved2 = await press("Save", ".modal button");
    if (!saved2.ok) { failed = true; say("STALL: the write dialog would not save"); return; }
    say(`wrote: ${arg}`);
    return;
  }
  if (verb === "do" || verb === "choose") {
    // `summary` is included because the app's folds ("Stuck? Roll some ideas",
    // "What this does", "Show all N slots") are <details>/<summary>, and a player
    // opens them by clicking the words exactly like a button.
    const where = verb === "choose"
      ? ".modal button, .modal summary, .modal label.check"
      // label.check is a checkbox with its words beside it — a player clicks the
      // words, which is what the label element is for.
      : "#screen button, #screen .btn, #screen summary, #screen label.check, #action-bar button, .modal button, .modal summary, .modal label.check";
    const hit = await press(arg, where);
    if (!hit.ok) {
      failed = true;
      say(`STALL: nothing here says "${arg}"`);
      say(`        offered: ${hit.offered.join(" · ") || "(nothing)"}`);
      return;
    }
    say(`${verb}: ${hit.pressed}`);
    return;
  }
}

for (const step of steps) await run(step);

// Persist whatever the session now is, and append the transcript.
const after = await snapshot();
if (after) writeFileSync(STATE, after);
const line = steps.map((s) => `${s.verb}${s.arg ? ` "${s.arg}"` : ""}`).join(" ");
writeFileSync(LOG, (existsSync(LOG) ? readFileSync(LOG, "utf8") : "") + `- ${line}\n`);

if (consoleErrors.length) {
  failed = true;
  say(`\nCONSOLE ERROR: ${consoleErrors[0]}`);
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
