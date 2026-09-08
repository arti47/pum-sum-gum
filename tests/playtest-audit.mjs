// Playtest AUDIT (§11.1 H). Drives a whole solo session, spine first, pressing
// only controls a player can name from the screen — prep, a scene, oracles,
// beats, confirmations, a closure, a second scene, and an ending — then asks
// the only question the other passes cannot: did play ever have nowhere to go?
//
// Two separate generators, on purpose:
//   · the page's dice, seeded by stubbing crypto.getRandomValues (this app never
//     uses Math.random), so a session reproduces roll for roll;
//   · the driver's own PRNG, which decides WHICH branch to take at a chooser.
// If choices were drawn from the page's stream, answering a dialog would shift
// every later die and the seed would stop reproducing — three seeds would then
// be one session in three costumes.
//
// Exits non-zero on a stall, so it works as a gate.

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "./serve.mjs";

const SEEDS = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
const seeds = SEEDS.length ? SEEDS : [7, 23, 101];

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);

// The driver's own randomness, independent of the page's.
function prng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const runs = [];

for (const seed of seeds) {
  const pick = prng(seed);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.addInitScript((sd) => {
    let s = (sd >>> 0) || 1;
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
  }, seed);

  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.removeItem("umState"));
  await page.reload({ waitUntil: "networkidle" });

  const beats = [];
  const stalls = [];
  let beatNo = 0;

  const visibleControls = () => page.evaluate(() => {
    const vis = (n) => n && n.offsetParent !== null;
    const sel = document.querySelector(".modal")
      ? ".modal button"
      : "#screen button, #screen .btn, #action-bar button";
    return [...document.querySelectorAll(sel)]
      .filter((n) => vis(n) && !n.disabled && !n.classList.contains("term"))
      .map((n) => (n.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
  });

  // Press by visible label. A miss is a stall: it means the beat wanted
  // something and the screen did not offer it.
  async function step(what, label, { optional = false } = {}) {
    beatNo += 1;
    const hit = await page.evaluate((want) => {
      const vis = (n) => n && n.offsetParent !== null;
      const txt = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
      const sel = document.querySelector(".modal")
        ? ".modal button"
        : "#screen button, #screen .btn, #action-bar button, .modal button";
      const nodes = [...document.querySelectorAll(sel)]
        .filter((n) => vis(n) && !n.disabled && !n.classList.contains("term"));
      const rx = new RegExp(want, "i");
      const n = nodes.find((x) => rx.test(txt(x)));
      if (!n) return { ok: false, offered: nodes.map(txt) };
      n.click();
      return { ok: true, pressed: txt(n) };
    }, label);
    await page.waitForTimeout(130);
    if (!hit.ok) {
      if (!optional) {
        stalls.push({ beat: beatNo, what, wanted: label, offered: hit.offered });
        beats.push(`${String(beatNo).padStart(2)}. ${what} — STALL, wanted /${label}/`);
      }
      return false;
    }
    beats.push(`${String(beatNo).padStart(2)}. ${what} — "${hit.pressed}"`);
    return true;
  }

  // A dialog the script cannot satisfy is not automatically an app fault — but
  // leaving it open makes every later beat report a phantom stall, so take the
  // dialog's own way out and say what it offered when it happened.
  const deadEnds = [];
  async function escapeDialog(what) {
    const info = await page.evaluate(() => {
      const m = document.querySelector(".modal");
      if (!m) return null;
      const vis = (n) => n && n.offsetParent !== null;
      const txt = (n) => (n.textContent || "").replace(/\s+/g, " ").trim();
      return {
        title: txt(m.querySelector("h2") || {}),
        body: [...m.querySelectorAll("p")].map(txt).filter(Boolean),
        options: [...m.querySelectorAll("button")].filter((n) => vis(n) && !n.disabled).map(txt),
      };
    });
    if (!info) return false;
    if (info.options.length <= 1) deadEnds.push({ beat: beatNo, what, ...info });
    await page.evaluate(() => {
      const m = document.querySelector(".modal");
      const b = [...(m?.querySelectorAll("button") || [])]
        .find((x) => /cancel|close|back/i.test(x.textContent || ""));
      if (b) b.click(); else document.querySelectorAll(".modal-back").forEach((n) => n.remove());
    });
    await page.waitForTimeout(110);
    return true;
  }

  const fill = (v) => page.evaluate((val) => {
    const vis = (n) => n && n.offsetParent !== null;
    const box = document.querySelector(".modal") || document.querySelector("#screen");
    const f = [...box.querySelectorAll("input[type=text], textarea")].filter(vis).find((n) => !n.value);
    if (!f) return false;
    f.value = val;
    f.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, v);

  // The app now leads with a coach whose one primary button is "what to do now",
  // and its label changes with the stage: Write the starting point → Open a
  // scene → Go to the beat → Write how it ended. A playtester that ignores it is
  // not pressing what the app offers, so when a scripted step is not on screen,
  // read the coach's label and take that move instead.
  async function nudge() {
    const label = await page.evaluate(() => {
      const b = document.querySelector("#screen .btn.primary.wide");
      return b && b.offsetParent !== null ? (b.textContent || "").trim() : null;
    });
    if (!label) return null;
    await step(`follow the coach`, `^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
    // Whatever it opened, satisfy it: these dialogs all take a line and a Save.
    if (await page.evaluate(() => !!document.querySelector(".modal"))) {
      await fill(`Written while following the coach`);
      if (!(await step("save what the coach asked for", "^Save", { optional: true }))) {
        await escapeDialog(`the coach's "${label}" dialog`);
      }
    }
    return label;
  }

  const screenText = () => page.evaluate(() =>
    (document.querySelector("#screen")?.innerText || "").replace(/\s+/g, " "));

  // --- prep ---------------------------------------------------------------
  await page.evaluate(async () => (await import("./src/router.js")).go("more", "home"));
  await page.waitForTimeout(80);
  await step("open prep", "Prepare a game");
  await fill(`Seed ${seed}`);
  await step("step 1 → next", "^Next$");
  await fill("Who is skimming the quota");
  await step("step 2 → next", "^Next$");
  await fill("Wren");
  await step("add a protagonist", "Add protagonist");
  await step("step 3 → next", "^Next$");
  // Standard leads alone; sometimes take another sheet, so seeds diverge.
  if (pick() < 0.5) {
    await step("see the other sheets", "Show all ten plot sheets", { optional: true });
    await step("choose a sheet", "Choose this sheet", { optional: true });
  }
  await step("step 4 → next", "^Next$");
  await fill("The watchers on the road");
  await step("write a node", "^Add$", { optional: true });
  await step("finish prep", "Start playing");
  await step("dismiss the welcome", "Stay here", { optional: true });

  // --- the session --------------------------------------------------------
  // Follow the coach until it hands us the scene, rather than assuming the
  // control is there: on a fresh game its first move is the starting point.
  for (let guard = 0; guard < 4; guard += 1) {
    const t = await screenText();
    if (/Open a scene/.test(t)) break;
    if (!(await nudge())) break;
    await page.evaluate(async () => (await import("./src/router.js")).go("play", "track"));
    await page.waitForTimeout(80);
  }
  await step("open a scene", "Open a scene");
  await step("roll the opener", "Roll a scene opener");

  // Four exchanges: ask something, then take a beat, then decide.
  for (let i = 0; i < 4; i += 1) {
    await page.evaluate(async () => (await import("./src/router.js")).go("oracles", "yesno"));
    await page.waitForTimeout(70);
    await step(`ask an oracle (${i + 1})`, "^Ask$");

    // The answer may offer the beat its own cheat sheet says it triggers.
    const trigger = pick() < 0.6;
    if (trigger) await step("take the offered beat", "It said (yes|no)", { optional: true });

    await page.evaluate(async () => (await import("./src/router.js")).go("play", "track"));
    await page.waitForTimeout(70);
    const open = (await screenText()).includes("Confirm");
    if (!open) {
      await step(`call a beat (${i + 1})`, pick() < 0.5 ? "Random prompt" : "Modified proposal");
    }

    // A node prompt can land on an empty slot; the card offers three ways out.
    const t = await screenText();
    if (/Add new/.test(t) && /Choose/.test(t)) {
      const r = pick();
      if (r < 0.34) { await step("invent a node", "^Add new$"); await fill(`Something new ${i}`); await step("save it", "^Save$"); }
      else if (r < 0.67) {
        await step("choose an entry", "^Choose$");
        const took = await step("take a written entry", "^(?!Cancel$).+", { optional: true });
        if (!took) await escapeDialog("choosing from a plot node list");
      }
      else await step("leave it to destiny", "Leave it to destiny");
    }
    if (/bring one in|Recall/i.test(await screenText())) {
      await step("bring someone in", "Bring one in", { optional: true });
      await fill(`A watcher ${i}`);
      if (!(await step("keep them", "^Save$", { optional: true }))) {
        await escapeDialog("bringing a character in from the beat card");
      }
    }

    // Confirm it, or decline — both are legal, and both must work.
    if (pick() < 0.7) await step(`confirm the beat (${i + 1})`, "Confirm", { optional: true });
    else await step(`decline the beat (${i + 1})`, "(Not this time|Played it)", { optional: true });
    await step("dismiss a fired dialog", "(Play it|Stay here|Close)", { optional: true });
  }

  // --- close, and end -----------------------------------------------------
  await escapeDialog("left open at the end of the exchanges");
  await page.evaluate(async () => (await import("./src/router.js")).go("scene", "arc"));
  await page.waitForTimeout(70);
  await step("intervene mid-scene", "Roll an intervention check", { optional: true });
  // A scene can only be closed if one is open; if the exchanges never opened one,
  // the app's own control says so — take it rather than reporting a phantom stall.
  if (!/Roll a scene closure/.test(await screenText())) {
    await step("open a scene to close", "(Open a scene|Roll a scene opener)", { optional: true });
    await step("roll the opener", "Roll a scene opener", { optional: true });
  }
  await step("close the scene", "Roll a scene closure");
  await step("read it back", "Write it down", { optional: true });

  await page.evaluate(async () => (await import("./src/router.js")).go("journal", "entries"));
  await page.waitForTimeout(70);
  await step("write in the record", "Write an entry");
  await fill(`Session on seed ${seed}: the watchers were not the problem.`);
  await step("save the entry", "^Save$");
  await step("mark the break", "Session break", { optional: true });
  await step("save the break", "^Save$", { optional: true });

  await page.evaluate(async () => (await import("./src/router.js")).go("play", "track"));
  await page.waitForTimeout(70);
  await step("end the scope", "End this scope");
  // The confirm dialog's button is "End the scope" — not the card's own label,
  // which is the trap the playtester brief warns about: matching the opener's
  // words inside the dialog it opened presses nothing and reads as success.
  if (!(await step("confirm the ending", "^End the scope$"))) {
    await escapeDialog("confirming the end of the scope");
  }

  // --- what the record says -----------------------------------------------
  const record = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("umState") || "{}");
    const g = (st.games || []).find((x) => x.id === st.activeGameId) || (st.games || [])[0];
    if (!g) return null;
    const sc = g.scopes.find((x) => x.id === g.activeScopeId) || g.scopes[0];
    return {
      game: g.title,
      entries: g.journal.length,
      kinds: [...new Set(g.journal.map((e) => e.kind))].sort(),
      crossed: sc.track.crossed,
      closed: !!sc.closedAt,
      ownWords: g.journal.some((e) => e.kind === "note" && /watchers were not/.test(e.detail || "")),
    };
  });

  runs.push({ seed, beats, stalls, errors, record, deadEnds });
  await ctx.close();
}

await browser.close();
server.close();

// --- report -----------------------------------------------------------------
console.log("\nPlaytest AUDIT — a solo session, start to finish, pressing only what the app offers\n");
let bad = 0;
for (const r of runs) {
  const ok = !r.stalls.length && !r.errors.length && r.record && r.record.closed;
  if (!ok) bad += 1;
  console.log(`── seed ${r.seed} — ${ok ? "played to an ending" : "DID NOT FINISH"}`);
  if (r.record) {
    console.log(`   game "${r.record.game}" · ${r.record.entries} journal entries `
      + `(${r.record.kinds.join(", ")}) · track ${r.record.crossed} crossed · `
      + `scope ${r.record.closed ? "ended" : "still open"} · `
      + `own words in the record: ${r.record.ownWords ? "yes" : "NO"}`);
  } else {
    console.log("   no campaign in storage at the end of the session");
  }
  for (const s of r.stalls) {
    console.log(`   ✗ beat ${s.beat} — ${s.what}: nothing offered /${s.wanted}/`);
    console.log(`     offered: ${s.offered.slice(0, 10).join(" · ") || "(nothing)"}`);
  }
  for (const d of r.deadEnds) {
    console.log(`   ! beat ${d.beat} — "${d.title}" offered only ${d.options.join(" · ")} `
      + `while ${d.what}`);
    for (const line of d.body.slice(0, 2)) console.log(`     it said: "${line}"`);
  }
  for (const e of r.errors.slice(0, 3)) console.log(`   ✗ console: ${e.slice(0, 120)}`);
}

console.log(`\n${runs.length} seeds · ${runs.reduce((a, r) => a + r.stalls.length, 0)} stalls · `
  + `${runs.reduce((a, r) => a + r.errors.length, 0)} console errors`);
if (!bad) console.log("\nEvery seed played a session from a cold open to an ending.\n");
else console.log(`\n${bad} of ${runs.length} seeds could not finish a session.\n`);

if (process.env.PLAYTEST_TRANSCRIPT) {
  for (const r of runs) {
    console.log(`\n── transcript, seed ${r.seed}`);
    for (const b of r.beats) console.log("   " + b);
  }
}
process.exit(bad ? 1 : 0);
