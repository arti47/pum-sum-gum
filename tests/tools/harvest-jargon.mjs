// A tool, not a pass. The reachability audit can prove that every word IN the
// glossary is defined and reachable. It cannot prove the other direction — that
// nothing on screen is jargon nobody thought to define — because there is no
// dictionary of "words a beginner would not know" to check against.
//
// This closes half that gap mechanically and hands the other half to a person.
// It harvests every string the app actually renders, across every route, every
// state, every fold and every dialog, then subtracts:
//
//   · the ~1,100 commonest English words (a word list, below),
//   · every alias already in the glossary,
//   · the books' own table contents (rolled results are fiction, not UI voice).
//
// What is left is the app speaking in its own words, ranked by how often it does
// so. Read the list; anything on it that a stranger would not know either goes
// in the glossary or gets rewritten. The judgement is not automatable — the
// harvest is.
//
//   node tests/tools/harvest-jargon.mjs [minCount]

import { chromium } from "playwright-core";
import { serve, LAUNCH } from "../serve.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MID = JSON.parse(readFileSync(join(root, "tests/fixtures/mid-session.json"), "utf8"));
const MIN = Number(process.argv[2] || 1);

const ROUTES = [
  ["play", "track"], ["play", "nodes"], ["play", "cast"],
  ["scene", "arc"], ["scene", "explore"], ["scene", "battle"],
  ["scene", "discovery"], ["scene", "people"],
  ["oracles", "yesno"], ["oracles", "descriptive"], ["oracles", "story"],
  ["oracles", "granular"], ["oracles", "quantifiers"],
  ["journal", "entries"], ["journal", "dice"],
  ["more", "home"], ["more", "forge"], ["more", "tutorial"],
  ["more", "library"], ["more", "settings"],
];

// The commonest English words, plus the plain vocabulary any UI uses. A word
// here is assumed known; a word not here is a candidate. Deliberately generous:
// a false candidate costs one line of reading, a missed one costs a player.
const COMMON = new Set(`
a about above across act add added adding after again against all almost alone along already also
always am among an and another answer answered answers any anyone anything appear are area around as
ask asked asking asks at away back bad bar be because become been before began begin behind being
below beside best better between big both bring brings brought but by call called calls came can
cannot cant card cards care carry case cases catch caught cause certain chance change changed changes
check checked checking choice choose chose chosen clear clearly close closed closes closing come comes
coming common complete could count counted counts course cover covered create created cut dark day
days deal decide decided decides decision deep did die different do does doing done dont door down
draw drawn drop dropped during each earlier early easy edit either else empty end ended ending ends
enough enter entire entry entries even ever every everyone everything exactly example except expect
expected expecting eye face fact fall far fast feel feet felt few field fields fill filled find finds
fine finish finished first fit five fix follow followed following for force found four free from front
full further game games gave general get gets getting give given gives go goes going gone good got
great group groups had half hand happen happened happens hard has have having he head hear heard held
help her here hidden hide high him himself his hit hold home hour how however i idea ideas if in
inside instead into is it its itself just keep keeping keeps kept kind kinds knew know known knows
land large last late later lead leads learn least leave leaves led left less let letter level lie life
light like line lines list listed lists little live long look looked looking looks lose lost lot low
made make makes making man many mark marked marks matter may maybe me mean means meant meet meets
member men might mind mine minute miss missing moment money month more morning most move moved moves
much must my myself name named names near need needed needs never new next night no none nor not
note noted notes nothing notice now number numbers of off offer offered offers often old on once one
only open opened opening opens or order other others our out outside over own page pages part parts
pass passed past people perhaps person pick picked picks piece place placed places plain play played
player players playing plays please point points possible present press pretty problem problems put
question questions quick quickly quite ran rather reach reached read reader reading ready real really
reason record recorded records red remember remove removed rest result results return returned rich
right rise road roll rolled rolling rolls room round row rows run running said same save saved saves
saw say saying says search second see seem seems seen sees send sense sent set sets setting settings
seven several shall she short should show showed showing shown shows side similar simple simply since
single sit six size slot slots small so some someone something sometimes soon sort sound space speak
special spend stand start started starting starts state states stay step steps still stop stopped
story straight strong such sudden suddenly sure surface take taken takes taking talk tap tapped tell
ten term terms text than that the their them themselves then there these they thing things think
third this those though thought three through throw thrown time times to today together told too took
top total toward town track tracked tracks tried tries trouble true try trying turn turned turns twice
two type types under understand until up upon us use used useful uses using usually value values very
view voice wait walk want wanted wants war was watch water way ways we week well went were what
whatever when where whether which while white who whole whom whose why wide will win wind wish with
within without woman word words work worked working works world worse worst would write writes writing
written wrong wrote year years yes yet you young your yourself
`.trim().split(/\s+/));

// UI furniture and the app's own screen names, which are learned by being on them.
const CHROME = new Set(`
app browser cancel clear click close copy dark data delete deleted device dialog dismiss done download
edit erase export filter filters import install json label light local mode next ok option options
paste pdf pinch prev preview previous reload reroll restore save screen scroll search select selected
setting settings size storage system tab tabs tap theme toggle undo undone update upload version
view widget window zoom
`.trim().split(/\s+/));

const { server, url } = await serve();
const browser = await chromium.launch(LAUNCH);
const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((s) => localStorage.setItem("umState", JSON.stringify(s)), MID);
await page.goto(url, { waitUntil: "networkidle" });

const GLOSS = await page.evaluate(async () => {
  const m = await import("./data-rules-library.js");
  return [...m.GLOSSARY_INDEX.keys()];
});
// Both the split words and the whole alias: "x-card" tokenises to "x" and
// "card", so splitting alone would leave the hyphenated word on screen looking
// undefined when it is defined.
const glossWords = new Set([
  ...GLOSS.map((a) => a.toLowerCase()),
  ...GLOSS.flatMap((a) => a.toLowerCase().split(/[^a-z0-9]+/)),
].filter(Boolean));

// The books' own table rows are fiction the player reads, not the app's voice —
// "nemesis", "reliquary", "vendetta" are content, and holding the app to account
// for them would drown the signal.
const tableWords = await page.evaluate(async () => {
  const out = new Set();
  const add = (t) => String(t).toLowerCase().split(/[^a-z0-9]+/).forEach((w) => w && out.add(w));
  const gum = await import("./data-gum.js");
  for (const t of gum.GUM_TABLES) for (const r of t.rows) add(r);
  const sum = await import("./data-sum.js");
  for (const t of sum.SUM_TABLES) for (const r of t.rows) add(r[2]);
  const or = await import("./data-pum-oracles.js");
  for (const key of ["DESCRIPTION", "FOCUS"]) {
    for (const r of ((or[key] && or[key].rows) || [])) add(r);
  }
  // Every oracle answer and every plot-beat row is content the books wrote, not
  // the app's own voice.
  for (const key of ["YES_NO", "GRANULAR", "DESCRIPTIVE", "STORY", "QUANTIFIERS"]) {
    const v = or[key];
    if (!v) continue;
    const walk = (x) => {
      if (!x) return;
      if (typeof x === "string") return add(x);
      if (Array.isArray(x)) return x.forEach(walk);
      if (typeof x === "object") return Object.values(x).forEach(walk);
    };
    walk(v);
  }
  const plot = await import("./data-pum-plot.js");
  for (const key of ["MODIFIED_PROPOSALS", "ABCD", "PROPOSAL_NOTES", "PROMPT_NOTES"]) {
    const v = plot[key];
    const walk = (x) => {
      if (!x) return;
      if (typeof x === "string") return add(x);
      if (Array.isArray(x)) return x.forEach(walk);
      if (typeof x === "object") return Object.values(x).forEach(walk);
    };
    walk(v);
  }
  return [...out];
});
const bookWords = new Set(tableWords);

// Two more subtractions, without which the list is 900 lines of noise:
//
//   · the fixture's own fiction. "Goblins", "Triboar", "Kathrine's sister" are
//     words the PLAYER wrote into a plot node. Holding the app's vocabulary to
//     account for them is meaningless.
//   · anything the app does not say in its own source. A word only reaches the
//     screen from three places — the app's own prose, the books' tables, or the
//     player's data — and only the first is the app's voice.
const fixtureWords = new Set(
  JSON.stringify(MID).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));

const ownVoice = (() => {
  const files = [
    ...readdirSync(join(root, "src")).filter((f) => f.endsWith(".js")).map((f) => join(root, "src", f)),
    join(root, "data-guidance.js"),
    join(root, "data-rules-library.js"),
    join(root, "data-tutorial.js"),
  ];
  const out = new Set();
  for (const f of files) {
    let src = "";
    try { src = readFileSync(f, "utf8"); } catch { continue; }
    // Only string and template literals: identifiers are not what a player reads.
    for (const m of src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      for (const w of m[2].toLowerCase().split(/[^a-z0-9’'-]+/)) {
        const word = w.replace(/^[’'-]+|[’'-]+$/g, "");
        if (word.length >= 4) out.add(word);
      }
    }
  }
  return out;
})();

const seen = new Map();          // word -> { n, where:Set }
function record(text, where) {
  for (const w of String(text).toLowerCase().split(/[^a-z0-9’'-]+/)) {
    const word = w.replace(/^[’'-]+|[’'-]+$/g, "");
    if (word.length < 4) continue;
    if (/^\d+$/.test(word)) continue;
    if (COMMON.has(word) || CHROME.has(word)) continue;
    if (glossWords.has(word)) continue;
    if (bookWords.has(word)) continue;
    if (fixtureWords.has(word)) continue;
    if (!ownVoice.has(word)) continue;
    const hit = seen.get(word) || { n: 0, where: new Set() };
    hit.n += 1;
    hit.where.add(where);
    seen.set(word, hit);
  }
}

async function visible() {
  return page.evaluate(() => {
    for (const d of document.querySelectorAll("#screen details")) d.open = true;
    const s = document.querySelector("#screen");
    const m = document.querySelector(".modal");
    return [(s ? s.innerText : ""), (m ? m.innerText : "")].join(" ");
  });
}

let dialogs = 0;
for (const [tab, section] of ROUTES) {
  await page.evaluate(async ([t, s]) => {
    const r = await import("./src/router.js");
    r.go(t, s);
  }, [tab, section]);
  await page.waitForTimeout(70);
  record(await visible(), `${tab}/${section}`);

  // and every dialog this screen can open
  const n = await page.evaluate(() => [...document.querySelectorAll("#screen button")]
    .filter((b) => b.offsetParent !== null && !b.disabled).length);
  for (let i = 0; i < n; i++) {
    await page.evaluate(async ([t, s]) => {
      for (const b of document.querySelectorAll(".modal-back")) b.remove();
      const r = await import("./src/router.js");
      r.go(t, s);
    }, [tab, section]);
    await page.waitForTimeout(30);
    const opened = await page.evaluate((idx) => {
      const b = [...document.querySelectorAll("#screen button")]
        .filter((x) => x.offsetParent !== null && !x.disabled)[idx];
      if (!b) return false;
      const t = (b.textContent || "");
      if (/Erase|Delete|Clear the journal|Import/.test(t)) return false;
      b.click();
      return true;
    }, i);
    if (!opened) continue;
    await page.waitForTimeout(50);
    const has = await page.evaluate(() => !!document.querySelector(".modal"));
    if (!has) continue;
    dialogs += 1;
    record(await visible(), `${tab}/${section} dialog`);
  }
  await page.evaluate(() => {
    for (const b of document.querySelectorAll(".modal-back")) b.remove();
  });
}

await browser.close();
server.close();

const ranked = [...seen.entries()]
  .filter(([, v]) => v.n >= MIN)
  .sort((a, b) => b[1].n - a[1].n);

console.log(`\nJargon harvest — ${ROUTES.length} routes, ${dialogs} dialogs, every fold opened\n`);
console.log(`${ranked.length} word(s) the app says in its own voice that are neither common English,`);
console.log(`UI furniture, nor already in the glossary. Read them; decide.\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad("word", 20) + pad("times", 8) + "where");
console.log("-".repeat(92));
for (const [w, v] of ranked) {
  console.log(pad(w, 20) + pad(v.n, 8) + [...v.where].slice(0, 4).join(", ")
    + (v.where.size > 4 ? ` +${v.where.size - 4}` : ""));
}
console.log("");
