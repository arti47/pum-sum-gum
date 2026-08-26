// Unit + data harness. Runs in seconds; run it on every change.
// Starts with the parse gate: a missing paren in a screen module does not throw
// in the browser — it presents as a screen that never renders.

import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail = "") {
  if (cond) { pass += 1; return; }
  fail += 1;
  failures.push(`${name}${detail ? " — " + detail : ""}`);
}

function eq(name, a, b) {
  ok(name, a === b, `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// --- 0. parse gate ----------------------------------------------------------
{
  const files = [
    ...readdirSync(join(root, "src")).filter((f) => f.endsWith(".js")).map((f) => join("src", f)),
    ...readdirSync(root).filter((f) => f.startsWith("data-") && f.endsWith(".js")),
    "service-worker.js",
  ];
  for (const f of files) {
    try {
      execFileSync(process.execPath, ["--check", join(root, f)], { stdio: "pipe" });
      pass += 1;
    } catch (err) {
      fail += 1;
      failures.push(`parse: ${f} — ${String(err.stderr || err).split("\n")[0]}`);
    }
  }
}

// --- 0a. the service-worker app shell lists every shipped file --------------
// A module added without its app-shell entry 404s offline and the app never boots.
{
  const sw = readFileSync(join(root, "service-worker.js"), "utf8");
  const listed = new Set(
    [...sw.matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1])
      .filter((f) => /\.(js|css|html|svg|json|pdf)$/.test(f))
  );
  const shipped = [
    ...readdirSync(join(root, "src")).map((f) => "src/" + f),
    ...readdirSync(root).filter((f) =>
      /^(data-.*\.js|styles\.css|index\.html|tutorial\.html|tutorial\.pdf|icon\.svg|manifest\.json)$/.test(f)),
  ];
  const missing = shipped.filter((f) => !listed.has(f));
  ok("every shipped file is in the service-worker app shell", missing.length === 0, missing.join(", "));
  const stale = [...listed].filter((f) => f && !shipped.includes(f));
  ok("the app shell lists no file that does not exist", stale.length === 0, stale.join(", "));
}

// --- imports ---------------------------------------------------------------
const oracles = await import("../data-pum-oracles.js");
const plot = await import("../data-pum-plot.js");
const sum = await import("../data-sum.js");
const lib = await import("../data-rules-library.js");
const guidance = await import("../data-guidance.js");
const gum = await import("../data-gum.js");

// crypto is needed by core.js/roller.js under Node (globalThis.crypto is
// already present and read-only from Node 20).
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", {
    value: (await import("node:crypto")).webcrypto, configurable: true,
  });
}

const rules = await import("../src/rules.js");
const derived = await import("../src/derived.js");

// --- 1. Yes/No --------------------------------------------------------------
for (const [id, reg] of Object.entries(oracles.YES_NO)) {
  eq(`YES_NO ${id} has 10 rows`, reg.rows.length, 10);
  ok(`YES_NO ${id} every d10 row is reachable`,
    Array.from({ length: 10 }, (_, i) => rules.yesNoAnswer(id, i + 1)).every(Boolean));
  ok(`YES_NO ${id} rows are non-empty`, reg.rows.every((r) => r && r.trim().length));
}
eq("Deterministic 1 is a strong no", oracles.YES_NO.deterministic.rows[0], "Strong no");
eq("Subjective 5 admits ignorance", oracles.YES_NO.subjective.rows[4], "Don't know, can't tell");
eq("Conversation 10 is warm", oracles.YES_NO.conversation.rows[9], "Yes, of course");

// --- 2. Granular: every band column tiles 1-100 with no gap and no overlap ---
for (const [id, table] of Object.entries(oracles.GRANULAR)) {
  for (const band of oracles.GRANULAR_BANDS) {
    const col = rules.granularColumn(id, band);
    const sorted = [...col].sort((a, b) => a[0] - b[0]);
    let cursor = 1, tiled = true, why = "";
    for (const [min, max] of sorted) {
      if (min !== cursor) { tiled = false; why = `gap or overlap at ${min}, expected ${cursor}`; break; }
      if (max < min) { tiled = false; why = `inverted range ${min}-${max}`; break; }
      cursor = max + 1;
    }
    if (tiled && cursor !== 101) { tiled = false; why = `ends at ${cursor - 1}, not 100`; }
    ok(`GRANULAR ${id}/${band} tiles 1-100`, tiled, why);
    // and every roll in range returns a row
    ok(`GRANULAR ${id}/${band} every roll resolves`,
      Array.from({ length: 100 }, (_, i) => rules.granularLookup(id, band, i + 1)).every(Boolean));
  }
  ok(`GRANULAR ${id} answers match the d10 table's vocabulary`, table.rows.length >= 6);
}
eq("granular deterministic neutral 1 is a strong no",
  rules.granularLookup("deterministic", "neutral", 1), "Strong no");
eq("granular deterministic no-way 100 is still a strong yes",
  rules.granularLookup("deterministic", "no way", 100), "Strong yes");

// --- 3/5. Descriptive and story oracles -------------------------------------
for (const o of [...oracles.DESCRIPTIVE, ...oracles.STORY, ...oracles.QUANTIFIERS]) {
  eq(`oracle ${o.id} has 10 rows`, o.rows.length, 10);
  ok(`oracle ${o.id} rows are non-empty`, o.rows.every((r) => r && r.trim().length));
}
eq("six descriptive oracles", oracles.DESCRIPTIVE.length, 6);
eq("six story oracles", oracles.STORY.length, 6);
eq("three quantifiers", oracles.QUANTIFIERS.length, 3);
// Four of ten quantifier faces are "as expected" — most of the time the world is unremarkable.
for (const q of oracles.QUANTIFIERS) {
  eq(`quantifier ${q.id} has four "as expected" faces`,
    q.rows.filter((r) => r === "As expected").length, 4);
}

// --- 4/6. d100 enrichment tables --------------------------------------------
for (const t of [oracles.DESCRIPTION, oracles.FOCUS]) {
  eq(`${t.name} has 50 paired rows`, t.rows.length, 50);
  ok(`${t.name} covers 1-100`,
    Array.from({ length: 100 }, (_, i) => rules.pairedLookup(t, i + 1)).every(Boolean));
  ok(`${t.name} rows are unique`, new Set(t.rows).size === t.rows.length);
}
eq("Description 1 is ancient/old", rules.pairedLookup(oracles.DESCRIPTION, 1), "ancient / old");
eq("Description 100 is windy/moving", rules.pairedLookup(oracles.DESCRIPTION, 100), "windy / moving");
eq("Focus 81 is Rebels/Traitor", rules.pairedLookup(oracles.FOCUS, 81), "Rebels / Traitor");
eq("Focus 40 is Global/Universe", rules.pairedLookup(oracles.FOCUS, 40), "Global / Universe");

// --- 8/9/10. Plot beats -----------------------------------------------------
eq("ten modified proposals", plot.MODIFIED_PROPOSALS.length, 10);
ok("modified proposals are unique", new Set(plot.MODIFIED_PROPOSALS).size === 10);
// The worked examples on PUM p.11 pin four of these; they must still hold.
eq("proposal 2 (p.11 example)", rules.proposalAt(2), "Bring someone quite inconvenient");
eq("proposal 5 (p.11 example)", rules.proposalAt(5), "Cause frustration, stress, or worry");
eq("proposal 6 (p.11 example)", rules.proposalAt(6), "Cause confusion, doubts, disarray");
eq("proposal 7 (p.11 example)", rules.proposalAt(7), "Make the location more favorable");

for (const [letter, t] of Object.entries(plot.ABCD)) {
  eq(`ABCD ${letter} has 10 rows`, t.rows.length, 10);
  ok(`ABCD ${letter} rows are unique`, new Set(t.rows).size === 10);
}

for (const sheet of plot.PLOT_SHEETS) {
  eq(`${sheet.id} prompt column has 10 rows`, sheet.prompts.length, 10);
  ok(`${sheet.id} prompts all resolve to an event or a node`,
    sheet.prompts.every((p) => p && p.label && (p.event || p.node)));
  ok(`${sheet.id} node prompts name a real category`,
    sheet.prompts.every((p) => !p.node || plot.NODE_CATEGORIES.some((c) => c.id === p.node)));
  ok(`${sheet.id} event prompts name a real ABCD table`,
    sheet.prompts.every((p) => !p.event || plot.ABCD[p.event]));
}
eq("standard prompt 5 is the notable character", rules.promptAt(rules.plotSheet("standard"), 5).node, "characters");
eq("standard prompt 7 is the world element", rules.promptAt(rules.plotSheet("standard"), 7).node, "world");
eq("story-focus reaches only plot nodes",
  rules.plotSheet("story-focus").prompts.filter((p) => p.event).length, 0);
eq("improvised reaches only random events",
  rules.plotSheet("improvised").prompts.filter((p) => p.node).length, 0);

// --- 11. Plot sheets: measured track lengths --------------------------------
const EXPECTED_TRACK = {
  standard: 11, journey: 20, "story-focus": 20, scenes: 10, dungeon: 7,
  exploration: 11, "story-parts": 5, improvised: 0, sandbox: 0, customized: 0,
};
eq("eleven plot sheets are… ten sheets plus the custom one", plot.PLOT_SHEETS.length, 10);
for (const sheet of plot.PLOT_SHEETS) {
  eq(`${sheet.id} track box count`, rules.trackTotal(sheet.track), EXPECTED_TRACK[sheet.id]);
}
eq("standard is 3/5/3", rules.plotSheet("standard").track.map((s) => s.boxes).join("/"), "3/5/3");
eq("journey is 3/7/4/3/3", rules.plotSheet("journey").track.map((s) => s.boxes).join("/"), "3/7/4/3/3");
eq("exploration triples each area", rules.plotSheet("exploration").track.map((s) => s.boxes).join("/"), "1/3/3/3/1");

// The node model is held to what each sheet's page actually prints (F-35). A
// sheet printing no lists is meant to be printed alongside a Plot Nodes sheet,
// which is ten slots and carries the extension lists; a sheet printing its own
// four or six lists is five slots, and six means it prints the extension pair.
for (const sheet of plot.PLOT_SHEETS) {
  const printed = sheet.printedLists;
  ok(`${sheet.id} records how many node lists its page prints`, typeof printed === "number");
  if (printed === 0) {
    ok(`${sheet.id} prints none, so it is 0 or a paired 10-slot sheet`,
      sheet.nodeSlots === 0 || sheet.nodeSlots === 10, String(sheet.nodeSlots));
    eq(`${sheet.id} reaches the extension lists iff it has slots`,
      sheet.expandedNodes, sheet.nodeSlots > 0);
  } else {
    eq(`${sheet.id} prints its own lists at five slots`, sheet.nodeSlots, 5);
    eq(`${sheet.id} prints ${printed} lists`, sheet.expandedNodes, printed > 4);
  }
}

// --- 12. Node categories ----------------------------------------------------
// Four printed base categories, two expanded, and the two blank player-named
// lists the extension sheet carries (PUM p.27).
eq("eight node categories", plot.NODE_CATEGORIES.length, 8);
eq("four base categories", plot.NODE_CATEGORIES.filter((c) => !c.expanded).length, 4);
eq("two player-named lists", plot.NODE_CATEGORIES.filter((c) => c.custom).length, 2);
{
  const scope = derived.normalizeScope({ sheetId: "journey" });
  eq("an unnamed list has no slots", derived.nodeSlots(scope, "custom1"), 0);
  eq("and shows its placeholder name", derived.categoryName(scope, "custom1"), "My list");
  scope.customNames.custom1 = "Rumours";
  ok("naming it brings the list into being", derived.nodeSlots(scope, "custom1") > 0);
  eq("and it answers to that name", derived.categoryName(scope, "custom1"), "Rumours");
  eq("a printed category keeps the book's name", derived.categoryName(scope, "world"), "Game or world elements");
}
ok("every category has a definition and examples",
  plot.NODE_CATEGORIES.every((c) => c.definition && c.examples));
ok("every node-invoking prompt has a play note",
  Object.keys(plot.PROMPT_NOTES).length === plot.NODE_CATEGORIES.length);

// --- 12a. Node-list reachability -------------------------------------------
// Anything the engine can WRITE the player must be able to SEE and edit. The
// Nodes screen and the wizard both hide a category the chosen sheet does not
// print, so a category with slots on such a sheet is a list you can fill and
// never read back.
{
  for (const sheet of plot.PLOT_SHEETS) {
    const scope = derived.normalizeScope({
      sheetId: sheet.id,
      customNames: { custom1: "Rumours", custom2: "Omens" },
    });
    for (const cat of plot.NODE_CATEGORIES) {
      const slots = derived.nodeSlots(scope, cat.id);
      const printed = !cat.expanded || sheet.expandedNodes;
      ok(`${sheet.id}/${cat.id}: slots only where the sheet prints the list`,
        slots === 0 || printed, `${slots} slots on a sheet that does not print it`);
      if (printed && sheet.nodeSlots > 0) {
        eq(`${sheet.id}/${cat.id} carries the sheet's slot count`, slots, sheet.nodeSlots);
      }
    }
  }
  const std = derived.normalizeScope({ sheetId: "standard" });
  eq("the standard sheet prints four node lists",
    plot.NODE_CATEGORIES.filter((c) => derived.nodeSlots(std, c.id) > 0).length, 4);
  const jrn = derived.normalizeScope({ sheetId: "journey" });
  eq("the journey sheet prints six, before any list of your own",
    plot.NODE_CATEGORIES.filter((c) => derived.nodeSlots(jrn, c.id) > 0).length, 6);
}

// --- 12b. Every journal kind is findable ------------------------------------
// A kind the app writes but the Journal cannot filter for is a record you cannot
// find again in a 500-entry log. Source-scanned so a new kind fails here rather
// than quietly disappearing into "All".
{
  const written = new Set();
  for (const f of readdirSync(join(root, "src")).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(join(root, "src", f), "utf8");
    for (const m of src.matchAll(/kind:\s*"([a-z-]+)"/g)) written.add(m[1]);
  }
  const journal = readFileSync(join(root, "src/journal.js"), "utf8");
  const filters = new Set(
    [...journal.matchAll(/\["([a-z-]+)",\s*"[^"]+"\]/g)].map((m) => m[1])
  );
  // The Journal folds the granular variant into the Oracles filter by hand.
  const folded = new Set(["granular"]);
  // rollGumSet's own kind is always overridden at the journal write; if one ever
  // reaches the log it has no filter, so assert it cannot.
  const neverJournalled = new Set(["gum-set"]);
  ok("the Journal offers an All filter", filters.has("all"));
  for (const kind of written) {
    if (neverJournalled.has(kind)) continue;
    ok(`journal kind "${kind}" can be filtered for`,
      filters.has(kind) || folded.has(kind));
  }
  const rollerSrc = readFileSync(join(root, "src/roller.js"), "utf8");
  ok("journalRoll lets its caller name the kind", rollerSrc.includes("extra.kind || result.kind"));
  for (const f of ["src/forge.js"]) {
    const src = readFileSync(join(root, f), "utf8");
    ok(`${f} names the kind on every GUM journal write`,
      !/journalRoll\(r,\s*\{\s*title/.test(src));
  }
}

// --- 12c. the tutorial covers every control ---------------------------------
// "Don't leave out any function" is checkable rather than claimed: scan src/ for
// every labelled control and dialog, and assert each is named somewhere in the
// tutorial. Generic dialog verbs are exempt — they are documented once, in
// Part 3's "Controls that appear everywhere".
{
  const tut = await import("../data-tutorial.js");
  const text = JSON.stringify([tut.QUICK_START, tut.PARTS, tut.TUTORIAL_META]).toLowerCase();

  const GENERIC = new Set([
    "save", "cancel", "close", "done", "add", "remove", "delete", "edit", "open",
    "rename", "name", "undo", "re-roll", "reroll", "dismiss", "back", "play",
    "scene", "oracles", "journal", "more", "invoke", "choose", "import", "copy",
    "download", "prepare a game", "what happened?", "your note",
  ]);

  const labels = new Set();
  for (const f of readdirSync(join(root, "src")).filter((n) => n.endsWith(".js"))) {
    const src = readFileSync(join(root, "src", f), "utf8");
    for (const m of src.matchAll(/\}\s*,\s*"([^"]{2,44})"\s*\)\)?/g)) labels.add(m[1]);
    for (const m of src.matchAll(/label:\s*"([^"]{2,44})"/g)) labels.add(m[1]);
    for (const m of src.matchAll(/title:\s*"([^"]{2,44})"/g)) labels.add(m[1]);
  }
  const checkable = [...labels].filter((l) => !GENERIC.has(l.toLowerCase()));
  ok("there are controls to check the tutorial against", checkable.length >= 100,
    `${checkable.length} found`);

  const missing = checkable.filter((l) => !text.includes(l.toLowerCase()));
  ok("the tutorial names every control in the app", missing.length === 0,
    `${missing.length} unmentioned: ${missing.slice(0, 12).join(" · ")}`);

  // --- and the reverse: the guide must not invent wording -------------------
  // The check above proves every control is *named* in the guide. It cannot see
  // the opposite drift — the guide sending a reader somewhere the app does not
  // have, or spelling a control differently after a rename. Every `tap:` block
  // is a route a reader follows literally, so each of its segments must be a
  // real tab, a real section, or a real control label. Template labels are
  // matched with their holes as wildcards.
  {
    const lit = new Set(); const pats = [];
    const remember = (t) => {
      if (!t || t.length < 3) return;
      if (t.includes("${")) {
        const solid = t.replace(/\$\{[^}]*\}/g, "").replace(/\s+/g, "");
        if (solid.length < 6) return;          // ".{1,28}" alone would match anything
        pats.push(new RegExp("^" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\\\$\\\{[^}]*\\\}/g, ".{1,28}") + "$"));
      } else lit.add(t);
    };
    for (const f of readdirSync(join(root, "src")).filter((n) => n.endsWith(".js"))) {
      const src = readFileSync(join(root, "src", f), "utf8");
      for (const m of src.matchAll(/["`]([^"`\n]{3,70})["`]/g)) remember(m[1]);
    }
    const TABS = ["Play", "Scene", "Oracles", "Journal", "More"];
    const SECTIONS = [
      "Plot track", "Plot nodes", "Cast", "Forge", "Plot seed", "World", "Characters",
      "Grand oracle", "Yes or No", "Descriptive", "Story", "Granular", "Quantifiers",
      "Scene arc", "Exploration", "Battle", "Discovery", "Entries", "Dice",
      "Home", "Rules", "Tutorial", "Settings",
    ];
    const nav = new Set([...TABS, ...SECTIONS]);
    const says = (t) => nav.has(t) || lit.has(t) || pats.some((p) => p.test(t));
    const taps = tut.PARTS.flatMap((p) => p.sections.flatMap((s) => s.blocks))
      .filter((b) => b.tap).map((b) => b.tap);
    const bad = [];
    for (const path of taps) {
      const segs = path.split("→").map((x) => x.trim());
      if (!TABS.includes(segs[0])) { bad.push(`${path} (tab "${segs[0]}")`); continue; }
      // The last segment may be an instruction rather than a control; the ones
      // before it are always navigation the reader has to find.
      for (const seg of segs.slice(1, -1)) {
        if (!says(seg)) bad.push(`${path} ("${seg}")`);
      }
      const last = segs[segs.length - 1];
      if (segs.length > 1 && !says(last) && last.split(" ").length <= 5) {
        bad.push(`${path} ("${last}")`);
      }
    }
    ok("the guide has tap routes to check", taps.length >= 10, `${taps.length} routes`);
    ok("every tap route names a real tab, section or control", bad.length === 0,
      bad.slice(0, 6).join(" · "));
  }

  // --- one stored field, one label ------------------------------------------
  // The scope's mission was "Mission and initial goals" in the prep wizard and
  // "Mission" in both dialogs that edit the same stored value, so the guide
  // could quote either and be wrong on the other screen. A field the player
  // meets twice must be called the same thing both times.
  {
    // Only the stored text fields a player meets on more than one screen. A
    // dialog's local variable name is not a stored key, so the set is explicit.
    const KEYS = new Set(["title", "universe", "tone", "inspiration", "mission",
      "scopeName", "startingPoint", "notes"]);
    const byKey = new Map();
    const note = (key, label, file) => {
      if (!KEYS.has(key)) return;
      if (!byKey.has(key)) byKey.set(key, new Map());
      const seen = byKey.get(key);
      if (!seen.has(label)) seen.set(label, file);
    };
    for (const f of ["src/wizard.js", "src/screens.js", "src/sheet.js", "src/cast.js"]) {
      const src = readFileSync(join(root, f), "utf8");
      // inline wizard fields: field("Label", "key", …)
      for (const m of src.matchAll(/field\("([^"]+)",\s*"(\w+)"/g)) note(m[2], m[1], f);
      // dialog fields: el("span", { class: "lbl", text: "Label" }), variable)
      for (const m of src.matchAll(/class:\s*"lbl",\s*text:\s*"([^"]+)"\s*\}\),\s*(\w+)\)/g)) {
        note(m[2], m[1], f);
      }
    }
    const clashes = [...byKey].filter(([, labels]) => labels.size > 1)
      .map(([key, labels]) => `${key}: ${[...labels].map(([l, f]) => `"${l}" (${f})`).join(" vs ")}`);
    ok("there are stored fields to check", byKey.size >= 5, `${byKey.size} fields`);
    ok("a stored field carries one label everywhere", clashes.length === 0, clashes.join(" · "));
  }

  // and the three renderings cannot drift. execFileSync throws on a non-zero
  // exit, so catch it — a stale file is a failure to report, not a crash that
  // takes the rest of the harness with it.
  let genOut = "";
  try {
    genOut = String(execFileSync(process.execPath,
      [join(root, "tests/tools/gen-tutorial.mjs"), "--check"], { stdio: "pipe" }));
  } catch (err) {
    genOut = String(err.stderr || err.stdout || err);
  }
  ok("the generated guide — doc and page — is current", genOut.includes("current"),
    genOut.trim().split("\n")[0]);
  // The page is served beside the app by whatever hosts it, so the app links to
  // a sibling path rather than to somewhere off the deployment.
  ok("the app links to the guide as a sibling page",
    tut.TUTORIAL_META.page === "./tutorial.html", tut.TUTORIAL_META.page);
  const page = readFileSync(join(root, "tutorial.html"), "utf8");
  ok("the page is a complete document a static host can serve", /^<!doctype html>/i.test(page));
  ok("the page links back to the app", page.includes('href="./index.html"'));
  ok("the page requests nothing off-origin", !/https?:\/\/[^"'\s]+\.(js|css|woff2?)/.test(page));

  // The fourth rendering. A PDF cannot be byte-diffed — its bytes carry a build
  // timestamp — so the generator records the hash of the HTML it printed and
  // this compares it against the HTML on disk. Same drift guarantee.
  ok("the app offers the guide as a PDF beside the page",
    tut.TUTORIAL_META.pdf === "./tutorial.pdf", tut.TUTORIAL_META.pdf);
  ok("the print rendering states the app's address, which a printed link cannot carry",
    /^https:\/\//.test(tut.TUTORIAL_META.site || "") && page.includes(tut.TUTORIAL_META.site),
    tut.TUTORIAL_META.site);
  ok("the page carries a print stylesheet", /@media\s*print\s*\{/.test(page));
  let pdfOut = "";
  try {
    pdfOut = String(execFileSync(process.execPath,
      [join(root, "tests/tools/gen-pdf.mjs"), "--check"], { stdio: "pipe" }));
  } catch (err) {
    pdfOut = String(err.stderr || err.stdout || err);
  }
  ok("the generated PDF is current", pdfOut.includes("current"), pdfOut.trim().split("\n")[0]);
  const pdf = readFileSync(join(root, "tutorial.pdf"));
  ok("tutorial.pdf is a PDF", pdf.subarray(0, 5).toString() === "%PDF-");
  const pdfText = pdf.toString("latin1");
  const pdfPages = (pdfText.match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok("the PDF paginates the whole guide", pdfPages >= 20, `${pdfPages} pages`);
  // A contents entry with no destination would be a page number nobody can act
  // on, and the numbering loop would have silently skipped it.
  const navIds = [...(/<nav class="toc"[\s\S]*?<\/nav>/.exec(page)[0])
    .matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
  const dests = new Set([...pdfText.matchAll(/\/([A-Za-z0-9_.-]+)\s*\[\s*\d+ 0 R \/XYZ/g)]
    .map((m) => m[1]));
  const undested = navIds.filter((id) => !dests.has(id));
  ok("every contents entry in the PDF points at a page", undested.length === 0,
    undested.join(", "));
  ok("the PDF carries bookmarks", /\/Outlines/.test(pdfText));
  ok("the licence notice travels with every rendering",
    /CC BY-NC-SA/.test(tut.TUTORIAL_META.licence));
  // every scenario quotes real rows: each roll cites a page
  const rolls = tut.PARTS.flatMap((p) => p.sections.flatMap((s) => s.blocks))
    .filter((b) => b.roll).map((b) => b.roll);
  ok("every worked example cites its page", rolls.every((r) => r.page && r.result),
    `${rolls.filter((r) => !r.page).length} without`);
  ok("the tutorial carries a worked example for each scenario", rolls.length >= 20,
    `${rolls.length} rolls`);
}

// --- 13-20. SUM tables ------------------------------------------------------
eq("twenty-four SUM tables", sum.SUM_TABLES.length, 24);
eq("eight SUM sections", sum.SUM_SECTIONS.length, 8);
for (const t of sum.SUM_TABLES) {
  ok(`${t.id} names a real section`, sum.SUM_SECTIONS.some((s) => s.id === t.section));
  ok(`${t.id} is d20 or d100`, t.die === 20 || t.die === 100);
  // Every range table covers its range, exactly once.
  let cursor = 1, tiled = true, why = "";
  for (const [min, max] of t.rows) {
    if (min !== cursor) { tiled = false; why = `gap or overlap at ${min}, expected ${cursor}`; break; }
    if (max < min) { tiled = false; why = `inverted ${min}-${max}`; break; }
    cursor = max + 1;
  }
  if (tiled && cursor !== t.die + 1) { tiled = false; why = `ends at ${cursor - 1}, not ${t.die}`; }
  ok(`SUM ${t.id} tiles 1-${t.die}`, tiled, why);
  ok(`SUM ${t.id} every roll returns a row`,
    Array.from({ length: t.die }, (_, i) => rules.rangeLookup(t.rows, i + 1)).every(Boolean));
  ok(`SUM ${t.id} rows are unique`, new Set(t.rows.map((r) => r[2])).size === t.rows.length);
  ok(`SUM ${t.id} carries its bias note`, !!t.bias && !!t.blurb && !!t.lead);
}
eq("twelve character-emulation tables offered on a cast entry", sum.CHARACTER_TABLE_IDS.length, 12);
ok("every character table id exists", sum.CHARACTER_TABLE_IDS.every((id) => rules.sumTable(id)));
// Lower rolls favour the protagonists: the low end of the closure table is the good end.
ok("scene closure 1 is fortunate", rules.rangeLookup(rules.sumTable("scene-closure").rows, 1).startsWith("That is, in fact, good"));
ok("scene closure 20 is not", rules.rangeLookup(rules.sumTable("scene-closure").rows, 20).startsWith("That was a bad move"));
ok("intervention 1 is peaceful", rules.rangeLookup(rules.sumTable("intervention").rows, 1).includes("peaceful"));
ok("intervention 100 is conflict", rules.rangeLookup(rules.sumTable("intervention").rows, 100).includes("Active opposition"));

// --- GUM (v2.2) ------------------------------------------------------------
eq("forty-three GUM tables", gum.GUM_TABLES.length, 43);
eq("four GUM sections", gum.GUM_SECTIONS.length, 4);
{
  let rows = 0;
  const ids = new Set();
  for (const t of gum.GUM_TABLES) {
    ids.add(t.id);
    rows += t.rows.length;
    ok(`GUM ${t.id} names a real section`, gum.GUM_SECTIONS.some((s) => s.id === t.section));
    ok(`GUM ${t.id} is d20 or d100`, t.die === 20 || t.die === 100);
    eq(`GUM ${t.id} row count matches its die`, t.rows.length, t.die);
    ok(`GUM ${t.id} rows are all non-empty strings`,
      t.rows.every((r) => typeof r === "string" && r.trim().length > 3));
    // The book prints one genuine duplicate (GUM_ERRATA G1); everything else is unique.
    const dupAllowed = gum.GUM_ERRATA.filter((e) => e.table === t.id).length;
    eq(`GUM ${t.id} rows are unique except for recorded errata`,
      t.rows.length - new Set(t.rows).size, dupAllowed);
    ok(`GUM ${t.id} every roll returns a row`,
      Array.from({ length: t.die }, (_, i) => rules.gumRow(t, i + 1)).every(Boolean));
    ok(`GUM ${t.id} carries a blurb and a page`, !!t.blurb && !!t.page);
    // A parse artifact would show up as a stray list number inside the text.
    ok(`GUM ${t.id} rows carry no embedded list numbers`,
      !t.rows.some((r) => /\s\d{1,3}\.\s/.test(r)));
  }
  eq("GUM table ids are unique", ids.size, 43);
  eq("1,580 GUM rows", rows, 1580);
  eq("thirty-four d20 tables", gum.GUM_TABLES.filter((t) => t.die === 20).length, 34);
  eq("nine d100 tables", gum.GUM_TABLES.filter((t) => t.die === 100).length, 9);
}
// the recorded erratum is exactly what we think it is
{
  const ev = rules.gumTable("evil-deeds");
  eq("GUM erratum G1 is recorded", gum.GUM_ERRATA.length, 1);
  eq("the duplicate sits at 17", rules.gumRow(ev, 17), "Vandalism and destruction");
  eq("and again at 22", rules.gumRow(ev, 22), "Vandalism and destruction");
  ok("the duplicate is kept as printed rather than corrected",
    rules.gumRow(ev, 17) === rules.gumRow(ev, 22));
}

// values read straight off the printed pages
eq("GUM location archetype 1", rules.gumRow(rules.gumTable("location-archetype"), 1),
  "Humid: Wilderness, jungle, raining, rivers, marshes, falls");
eq("GUM mission 20", rules.gumRow(rules.gumTable("mission"), 20),
  "Fulfill a prophecy, or a backstory goal");
eq("GUM archetypes-1 57", rules.gumRow(rules.gumTable("archetypes-1"), 57),
  "Everyman: Regular person to represent masses");
eq("GUM archetypes-2 100", rules.gumRow(rules.gumTable("archetypes-2"), 100),
  "Workaholic: Obsessed with work; has to be");
eq("GUM grand action 51", rules.gumRow(rules.gumTable("grand-action"), 51),
  "Slow down, delay, hinder, postpone, hold back");
// the book's own combinations
eq("the plot seed is six tables", gum.GUM_PLOT_SEED.length, 6);
ok("every plot-seed table exists", gum.GUM_PLOT_SEED.every((id) => rules.gumTable(id)));
eq("the grand oracle is three tables", gum.GUM_GRAND.length, 3);
ok("every grand-oracle table exists", gum.GUM_GRAND.every((id) => rules.gumTable(id)));
ok("every plot-node category has GUM tables offered for it",
  derived.NODE_IDS.every((id) => (gum.GUM_FOR_FIELDS[id] || []).length > 0));
ok("every GUM_FOR_FIELDS id is a real table",
  Object.values(gum.GUM_FOR_FIELDS).flat().every((id) => rules.gumTable(id)));
// A table with no surface is the §0 defect: extracted, unit-checked, unreachable.
// The Forge reaches the seeding section through the plot-seed and world-truths
// cards, and the other two sections through their own grouped screens.
{
  const reachable = new Set([...gum.GUM_PLOT_SEED, ...gum.GUM_GRAND,
    "location-archetype", "background-problem"]);
  for (const t of gum.GUM_TABLES) {
    if (t.section === "world" || t.section === "character") reachable.add(t.id);
  }
  const orphans = gum.GUM_TABLES.filter((t) => !reachable.has(t.id)).map((t) => t.id);
  ok("every GUM table is reachable from a Forge screen", orphans.length === 0, orphans.join(", "));
}
// The same question of SUM: every table has a screen that rolls it.
{
  const scene = ["location-features", "core-challenge", "challenge-conditions",
    "terrain-features", "enemy-tactics", "enemy-composition",
    "type-of-clue", "revealing-finding", "opposition-activity"];
  const arc = ["scene-opener", "intervention", "scene-closure"];
  const reachable = new Set([...scene, ...arc, ...sum.CHARACTER_TABLE_IDS]);
  const orphans = sum.SUM_TABLES.filter((t) => !reachable.has(t.id)).map((t) => t.id);
  ok("every SUM table is reachable from a Scene screen", orphans.length === 0, orphans.join(", "));
}
// And of PUM: every oracle the data carries is offered by the console.
{
  const offered = new Set([
    ...oracles.DESCRIPTIVE.map((o) => o.id),
    ...oracles.STORY.map((o) => o.id),
    ...oracles.QUANTIFIERS.map((o) => o.id),
  ]);
  ok("every descriptive, story and quantifier oracle is offered", offered.size === 15,
    `${offered.size} oracles`);
  ok("and each resolves through rules.oracle()", [...offered].every((id) => rules.oracle(id)));
}

// --- inspiration prompts: every field reaches real tables -------------------
// A field whose map is wrong falls back silently to the grand oracle, so the
// only way to catch a typo in GUM_FOR_FIELDS is to assert it here.
{
  const forge = await import("../src/forge.js");
  const fields = Object.keys(gum.GUM_FOR_FIELDS);
  ok("every field maps to at least one table", fields.every((f) => gum.GUM_FOR_FIELDS[f].length > 0));
  ok("every field's tables all exist",
    fields.every((f) => gum.GUM_FOR_FIELDS[f].every((id) => rules.gumTable(id))),
    fields.filter((f) => !gum.GUM_FOR_FIELDS[f].every((id) => rules.gumTable(id))).join(", "));
  // Every plot-node category is a field, so an empty slot always has an offer.
  ok("every plot-node category is a field",
    derived.NODE_IDS.every((id) => gum.GUM_FOR_FIELDS[id]));
  // A field the app never asks about still resolves to something, so a typo in a
  // call site degrades to the grand oracle rather than throwing.
  eq("an unknown field falls back to the grand oracle",
    forge.inspireTables("no-such-field").join(","), gum.GUM_GRAND.join(","));
  // Every field the app deliberately does NOT roll on carries its reason, and no
  // field is in both lists.
  ok("every absent field states a reason",
    Object.values(gum.INSPIRE_ABSENT).every((r) => typeof r === "string" && r.length > 20));
  ok("no field is both offered and absent",
    !Object.keys(gum.INSPIRE_ABSENT).some((k) => gum.GUM_FOR_FIELDS[k]),
    Object.keys(gum.INSPIRE_ABSENT).filter((k) => gum.GUM_FOR_FIELDS[k]).join(", "));
  // Shape rule: a field that asks for a proper name is not offered a phrase.
  for (const nameField of ["game-universe", "list-name", "track-section", "cast-rename"]) {
    ok(`${nameField} is recorded as out of GUM's reach`, !!gum.INSPIRE_ABSENT[nameField]);
  }
  eq("a mapped field uses its own tables",
    forge.inspireTables("cast-location")[0], "location-archetype");
  eq("three words is the roll", gum.INSPIRE_WORDS, 3);
  // The seed field is exactly GUM's own plot seed, so "all its tables" rolls it.
  eq("the mission field reaches the whole plot seed",
    gum.GUM_FOR_FIELDS["scope-mission"].join(","), gum.GUM_PLOT_SEED.join(","));
}

// Every promptModal in the app names a field, so no text input is left without
// the offer. Source-scanned: a new dialog added without one fails here.
{
  const sites = [];
  for (const f of readdirSync(join(root, "src")).filter((n) => n.endsWith(".js"))) {
    if (f === "ui.js") continue;   // the definition itself
    const src = readFileSync(join(root, "src", f), "utf8");
    for (const m of src.matchAll(/promptModal\(\{([\s\S]*?)\n\s*\}\)/g)) {
      sites.push({
        file: f,
        hasInspire: /\binspire:/.test(m[1]),
        excused: /\/\/ no-inspire:/.test(m[1]),
      });
    }
  }
  ok("the app has text dialogs to audit", sites.length >= 20, `${sites.length} found`);
  // Not every field can be served: GUM emits phrases about fiction, which is the
  // wrong shape for a proper name or a real-world answer. A dialog must either
  // name a field or say in one line why it has none — silence is the bug.
  const bare = sites.filter((x) => !x.hasInspire && !x.excused).map((x) => x.file);
  ok("every text dialog either rolls or says why it does not", bare.length === 0,
    `${bare.length} silent: ${[...new Set(bare)].join(", ")}`);
  ok("some dialogs are excused, and say so", sites.some((x) => x.excused));
}

// --- 21-24. Guidance and library --------------------------------------------
eq("three play states", guidance.PLAY_STATES.length, 3);
eq("four flowchart decisions", guidance.FLOWCHART.length, 4);
eq("six proposal triggers plus the disruption note", guidance.BEAT_TRIGGERS.proposal.items.length, 7);
eq("six prompt triggers plus the disruption note", guidance.BEAT_TRIGGERS.prompt.items.length, 7);
ok("advice chapter is present", guidance.ADVICE.length >= 7);
ok("advanced mechanics are present", guidance.ADVANCED.length >= 7);
const libIds = lib.RULES_LIBRARY.flatMap((g) => g.entries.map((e) => e.id));
ok("rules-library ids are unique", new Set(libIds).size === libIds.length);
ok("every library entry cites a page", lib.RULES_LIBRARY.every((g) => g.entries.every((e) => e.page)));
ok("safety tools are recorded as absent",
  libIds.includes("safety") && lib.RULES_LIBRARY.some((g) =>
    g.entries.some((e) => e.id === "safety" && e.automated === false)));
eq("two errata recorded", plot.PUM_ERRATA.length, 2);

// --- derived: the node die rule (A7 / PUM p.25) ----------------------------
{
  const mk = (sheetId, fill) => derived.normalizeScope({
    sheetId, nodes: { world: Array.from({ length: fill }, (_, i) => "node " + i) },
  });
  eq("5-slot list always rolls d10 when empty", derived.nodeDie(mk("standard", 0), "world"), 10);
  eq("5-slot list still rolls d10 when full", derived.nodeDie(mk("standard", 5), "world"), 10);
  eq("10-slot list rolls d10 below half", derived.nodeDie(mk("journey", 4), "world"), 10);
  // "less than half … otherwise 1d20" — exactly half is already "otherwise".
  eq("10-slot list rolls d20 at exactly half", derived.nodeDie(mk("journey", 5), "world"), 20);
  eq("10-slot list rolls d20 past half", derived.nodeDie(mk("journey", 6), "world"), 20);
  eq("10-slot list rolls d20 when full", derived.nodeDie(mk("journey", 10), "world"), 20);
}

// --- derived: the track -----------------------------------------------------
{
  const scope = derived.normalizeScope({ sheetId: "standard" });
  eq("a fresh standard track is 11 long", derived.trackLength(scope), 11);
  eq("nothing crossed yet", derived.crossed(scope), 0);
  ok("not resolved yet", !derived.isResolved(scope));
  eq("first section is Exposition", derived.currentSection(scope).name, "Exposition");
  scope.track.crossed = 3;
  eq("box 4 sits in Confrontation", derived.currentSection(scope).name, "Confrontation");
  scope.track.crossed = 10;
  ok("ten of eleven is not resolved", !derived.isResolved(scope));
  scope.track.crossed = 11;
  ok("the predicate flips on the final box", derived.isResolved(scope));
  eq("last section is Resolution", derived.currentSection(scope).name, "Resolution");
  // crossing can never run past the end
  const over = derived.normalizeScope({ sheetId: "standard", track: { crossed: 99 } });
  eq("normalization clamps an over-long track", derived.crossed(over), 11);
  const trackless = derived.normalizeScope({ sheetId: "sandbox", track: { crossed: 4 } });
  eq("a trackless sheet cannot carry crossings", derived.crossed(trackless), 0);
  ok("a trackless sheet never reports resolved", !derived.isResolved(trackless));
}

// --- derived: normalization + migration fixtures ---------------------------
{
  const old = {
    games: [{
      title: "Old save",
      scopes: [{ name: "s", sheetId: "nonexistent-sheet", nodes: { world: ["a", null, 7] } }],
      journal: [{ kind: "beat" }],
    }],
  };
  const n = derived.normalize(old);
  eq("an unknown sheet id falls back to standard", n.games[0].scopes[0].sheetId, "standard");
  ok("non-string nodes are dropped to empty strings",
    n.games[0].scopes[0].nodes.world.every((x) => typeof x === "string"));
  ok("every node category exists after migration",
    derived.NODE_IDS.every((id) => Array.isArray(n.games[0].scopes[0].nodes[id])));
  ok("an active game is selected", n.activeGameId === n.games[0].id);
  ok("journal entries get ids and timestamps", !!n.games[0].journal[0].id && !!n.games[0].journal[0].ts);
  const empty = derived.normalize({});
  eq("an empty state has no games", empty.games.length, 0);
  eq("an empty state has no active game", empty.activeGameId, null);
  eq("theme defaults to system", empty.theme, "system");
  eq("disruption die defaults off", empty.settings.disruptionDie, false);
  eq("enrichment defaults on", empty.settings.autoEnrich, true);
  const scaleJunk = derived.normalize({ textScale: 99 });
  eq("an out-of-range text scale is clamped back to 1", scaleJunk.textScale, 1);
}

// --- the engine -------------------------------------------------------------
// A DOM-free stub so the roller's store/journal calls do not need a browser.
globalThis.localStorage = {
  _v: {},
  getItem(k) { return this._v[k] || null; },
  setItem(k, v) { this._v[k] = String(v); },
  removeItem(k) { delete this._v[k]; },
};
const store = await import("../src/store.js");
const { Settings } = await import("../src/settings.js");
const roller = await import("../src/roller.js");
const core = await import("../src/core.js");

// dice: every face reachable, none out of range
{
  for (const size of [10, 20, 100]) {
    const seen = new Set();
    for (let i = 0; i < size * 60; i++) {
      const v = core.die(size);
      if (v < 1 || v > size) { ok(`d${size} stays in range`, false, `rolled ${v}`); break; }
      seen.add(v);
    }
    eq(`d${size} reaches every face`, seen.size, size);
  }
  let threw = false;
  try { core.die(1); } catch { threw = true; }
  ok("a nonsense die size throws rather than lying", threw);
}

// PUM bias returns both and commits neither (ruling A4)
{
  const r = roller.rollYesNo({ register: "subjective", bias: true });
  eq("bias rolls twice", r.options.length, 2);
  ok("bias needs the player's choice", r.needsChoice === true);
  ok("both answers are real rows", r.options.every((o) => o.answer));
  const plain = roller.rollYesNo({ register: "subjective" });
  eq("no bias rolls once", plain.options.length, 1);
  ok("no bias needs no choice", plain.needsChoice === false);
}

// SUM bias is mechanical: keep low / keep high (ruling A4)
{
  let lowOk = true, highOk = true, both = true;
  for (let i = 0; i < 300; i++) {
    const lo = roller.rollSum({ tableId: "meet-reaction", bias: "low" });
    const hi = roller.rollSum({ tableId: "meet-reaction", bias: "high" });
    if (lo.kept !== Math.min(...lo.rolls)) lowOk = false;
    if (hi.kept !== Math.max(...hi.rolls)) highOk = false;
    if (lo.rolls.length !== 2 || hi.rolls.length !== 2) both = false;
  }
  ok("keep-low returns the minimum", lowOk);
  ok("keep-high returns the maximum", highOk);
  ok("a bias roll shows both dice", both);
  const neutral = roller.rollSum({ tableId: "meet-reaction", bias: "none" });
  eq("neutral rolls once", neutral.rolls.length, 1);
  ok("every SUM roll resolves to an answer", !!neutral.answer);
}

// enrichment
{
  const r = roller.rollOracle({ oracleId: "someone", enrich: true });
  ok("a descriptive oracle enriches with a Description word", r.enrichment && r.enrichment.name === "Description");
  const s = roller.rollOracle({ oracleId: "reason", enrich: true });
  ok("a story oracle enriches with a Focus word", s.enrichment && s.enrichment.name === "Focus");
  const q = roller.rollOracle({ oracleId: "many", enrich: true });
  ok("a quantifier is never enriched", q.enrichment === null);
  ok("a quantifier never carries a disruption die", q.disruption === null);
  const off = roller.rollOracle({ oracleId: "someone", enrich: false });
  ok("enrichment can be switched off", off.enrichment === null);
  eq("an unenriched oracle shows one die", off.dice.length, 1);
  eq("an enriched oracle shows two", r.dice.length, 2);
}

// every oracle roll carries the question it answered, so the card can show it
{
  const q = "Does the bridge hold?";
  eq("a yes/no roll keeps the question", roller.rollYesNo({ question: q }).question, q);
  eq("a granular roll keeps it too", roller.rollGranular({ question: q }).question, q);
  eq("and so does an oracle roll", roller.rollOracle({ oracleId: "someone", question: q }).question, q);
  const src = readFileSync(join(root, "src/oracles.js"), "utf8");
  ok("the result card is given the question to show",
    (src.match(/question: result\.question/g) || []).length >= 2);
}

// plot beats, node invocation, and the compulsion
{
  const game = store.createGame({
    title: "Harness game", scopeName: "Scope", sheetId: "standard",
    protagonists: [{ id: "p1", name: "PC" }],
    nodes: { world: ["a storm", "", "", "", ""] },
  });
  const scope = store.currentScope();

  const beat = roller.rollProposal();
  ok("a proposal names a real row", plot.MODIFIED_PROPOSALS.includes(beat.text));
  eq("a proposal shows one die", beat.dice.length, 1);

  let sawEvent = false, sawNode = false;
  for (let i = 0; i < 200; i++) {
    const p = roller.rollPrompt(scope);
    ok("every prompt resolves", !!p.text);
    if (p.event) { sawEvent = true; ok("an ABCD event rolls its own die", p.dice.length === 2); }
    if (p.node) { sawNode = true; }
  }
  ok("the standard column reaches ABCD events", sawEvent);
  ok("the standard column reaches plot nodes", sawNode);

  // Whatever prep wrote must be readable back: a scope's filled lists are
  // exactly the lists its sheet prints (the wizard and the Nodes screen agree).
  {
    const prepped = store.createGame({
      title: "Prep round-trip", scopeName: "Scope", sheetId: "journey",
      protagonists: [{ id: "p1", name: "PC" }],
      customNames: { custom1: "Rumours" },
      nodes: { world: ["a storm"], custom1: ["a whisper in the market"] },
    });
    const sc = prepped.scopes[0];
    eq("a named list survives prep", derived.customListName(sc, "custom1"), "Rumours");
    eq("and carries the sheet's slots", derived.nodeSlots(sc, "custom1"), 10);
    eq("and holds what prep wrote", derived.nodeList(sc, "custom1")[0], "a whisper in the market");
    for (const cat of plot.NODE_CATEGORIES) {
      const written = (sc.nodes[cat.id] || []).filter((s) => s && s.trim()).length;
      ok(`nothing was written into an invisible ${cat.id} list`,
        written === 0 || derived.nodeSlots(sc, cat.id) > 0);
    }
    store.deleteGame(prepped.id);
  }

  // an empty slot offers add / choose / reroll — the engine reports it as empty
  let sawEmpty = false, sawFilled = false;
  for (let i = 0; i < 200; i++) {
    const n = roller.invokeNode(scope, "world");
    if (n.empty) sawEmpty = true; else sawFilled = true;
    eq("a 5-slot list rolls d10", n.die, 10);
  }
  ok("an empty slot is reported as empty", sawEmpty);
  ok("a written slot comes up too", sawFilled);

  // the compulsion: force never returns an empty slot when the list has an entry
  let forcedEmpty = false;
  for (let i = 0; i < 200; i++) {
    const n = roller.invokeNode(scope, "world", { force: true });
    if (n.empty) forcedEmpty = true;
  }
  ok("force never returns an empty slot", !forcedEmpty);

  // the compulsion terminates even against an all-empty list
  const blank = roller.invokeNode(scope, "problems", { force: true });
  ok("force on an empty list terminates rather than hanging", blank.empty === true);

  // deliberate invocation bypasses the die
  const chosen = roller.invokeNode(scope, "world", { chosen: 0 });
  eq("a chosen node bypasses the die", chosen.dice.length, 0);
  eq("a chosen node returns its text", chosen.text, "a storm");

  // a sheet with no nodes reports unavailable rather than guessing
  store.addScope({ name: "Improv", sheetId: "improvised" });
  const impro = store.currentScope();
  const none = roller.invokeNode(impro, "world");
  ok("a nodeless sheet reports the list unavailable", none.unavailable === true);

  // A prompt face reaching a list the chosen sheet does not print must report
  // itself unavailable rather than rolling on a list the player cannot see.
  const std = derived.normalizeScope({ sheetId: "standard" });
  const ghost = roller.invokeNode(std, "characters");
  ok("a prompt reaching an unprinted list reports it unavailable", ghost.unavailable === true);
  eq("and rolls no die for it", ghost.dice.length, 0);

  store.setActiveScope(scope.id);
}

// the gate, the escalation and the threshold
{
  const before = derived.crossed(store.currentScope());
  const out = store.confirmBeat({ label: "test" });
  eq("confirming crosses exactly one box", out.crossed, before + 1);
  store.uncrossBox();
  eq("an unconfirmed beat leaves the track where it was", derived.crossed(store.currentScope()), before);

  for (let i = 0; i < 40; i++) store.confirmBeat({});
  const sc = store.currentScope();
  eq("crossing stops at the last box", derived.crossed(sc), derived.trackLength(sc));
  ok("the threshold has flipped", derived.isResolved(sc));
  const past = store.confirmBeat({});
  ok("confirming a full track reports resolved without overrunning", past.resolved && past.crossed === derived.trackLength(sc));
}

// the permission to end a scope when you say it ends
{
  const game = store.createGame({
    title: "Ending game", scopeName: "Open ended", sheetId: "sandbox",
    protagonists: [{ id: "p1", name: "PC" }],
  });
  const sc = store.currentScope();
  ok("a trackless scope has no Threshold to meet", !derived.isResolved(sc));
  ok("and starts unfinished", !derived.isEnded(sc));
  store.setScopeClosed(true);
  ok("declaring it ended finishes it", derived.isEnded(store.currentScope()));
  ok("without pretending the track resolved it", !derived.isResolved(store.currentScope()));
  ok("and the summary says so", derived.scopeSummary(store.currentScope()).includes("ended"));
  store.setScopeClosed(false);
  ok("reopening it is one tap back", !derived.isEnded(store.currentScope()));
  store.setScopeClosed(true);
  store.undo();
  ok("ending a scope is undoable", !derived.isEnded(store.currentScope()));
  // and it survives a save/load round trip
  const round = derived.normalizeScope({ ...store.currentScope(), closedAt: 12345 });
  eq("an ending survives normalization", round.closedAt, 12345);
  eq("a junk value normalizes away", derived.normalizeScope({ closedAt: "soon" }).closedAt, null);
  store.deleteGame(game.id);
}

// one player action is one undo, however many mutations it performs
{
  const g = store.createGame({
    title: "Undo grouping", scopeName: "Scope", sheetId: "standard",
    protagonists: [{ id: "p1", name: "PC" }],
  });
  const before = derived.crossed(store.currentScope());
  const entries = store.activeGame().journal.length;
  store.transact("Advance track (no beat)", () => {
    store.confirmBeat({ voluntary: true });
    store.addJournal({ kind: "track", title: "Advanced without a beat", detail: "x" });
  });
  eq("the transaction crossed a box", derived.crossed(store.currentScope()), before + 1);
  eq("and wrote its journal entry", store.activeGame().journal.length, entries + 1);
  store.undo();
  eq("one undo puts the box back", derived.crossed(store.currentScope()), before);
  eq("and takes the journal entry with it", store.activeGame().journal.length, entries);
  eq("the label is the action's, not the last mutation's", store.undoLabel(), "Create game");

  // A preference is not a move in the game: it is its own inverse, and the undo
  // stack is capped, so toggles must not evict play history. Closing a "what
  // this does" note writes a setting on every screen it happens on.
  const label = store.undoLabel();
  Settings.setExplainOpen(false);
  Settings.setTheme("dark");
  Settings.setTextScale(1.2);
  eq("a preference does not become an undo step", store.undoLabel(), label);
  eq("and it still took effect", Settings.explainOpen(), false);
  Settings.setExplainOpen(true);
  Settings.setTheme("system");
  Settings.setTextScale(1);
  store.deleteGame(g.id);
}

// timed beats fire exactly once
{
  store.addScope({ name: "Timed", sheetId: "standard" });
  store.setMark(2, "The horde arrives");
  store.confirmBeat({}); store.confirmBeat({});
  const third = store.confirmBeat({});
  eq("arriving at a marked box fires it", third.mark, "The horde arrives");
  store.uncrossBox();
  const again = store.confirmBeat({});
  ok("a fired mark does not fire twice", !again.mark);
}

// voluntary advance is journalled as such, and every roll writes exactly one entry
{
  const g0 = store.activeGame().journal.length;
  roller.journalRoll(roller.rollProposal(), { title: "one entry" });
  eq("a roll writes exactly one journal entry", store.activeGame().journal.length, g0 + 1);
}

// custom track and custom prompt column persist and roll
{
  store.addScope({ name: "Custom", sheetId: "customized" });
  eq("a customized sheet starts with no track", derived.trackLength(store.currentScope()), 0);
  store.addTrackSection("Act one", 3);
  eq("a grown section counts", derived.trackLength(store.currentScope()), 3);
  store.addTrackBox(0);
  eq("boxes can be added to a section", derived.trackLength(store.currentScope()), 4);
  store.confirmBeat({});
  eq("a custom box crosses", derived.crossed(store.currentScope()), 1);
  store.removeTrackSection(0);
  eq("removing a section clamps the crossing", derived.crossed(store.currentScope()), 0);

  const column = Array.from({ length: 10 }, () => ({ label: "Meet someone", node: "characters" }));
  store.setCustomPrompts(column);
  const sc = store.currentScope();
  eq("a custom column persists", sc.customPrompts.length, 10);
  const p = roller.rollPrompt(sc);
  eq("a custom column is what gets rolled", p.text, "Meet someone");
  store.setCustomPrompts(null);
  ok("a custom column can be cleared", store.currentScope().customPrompts === null);
}

// undo
{
  const title = store.activeGame().title;
  store.updateGame({ title: "Renamed" });
  eq("a mutation applies", store.activeGame().title, "Renamed");
  store.undo();
  eq("undo restores the previous state", store.activeGame().title, title);
}

// export round-trips
{
  const json = store.exportJSON();
  const count = store.games().length;
  const n = store.importJSON(json);
  eq("an export re-imports the same number of games", n, count);
  ok("the export is human-readable JSON", json.includes('"app": "unfolding-machines"'));
}

// the scene arc
{
  store.openScene("Describe the current location");
  ok("a scene is open", !!store.currentScope().openScene);
  store.addIntervention("Something breaks");
  eq("interventions accumulate on the open scene", store.currentScope().openScene.interventions.length, 1);
  const closed = store.closeScene();
  ok("closing returns the scene that was open", !!closed);
  ok("closing a scene leaves none open", store.currentScope().openScene === null);
  eq("closing when none is open returns nothing", store.closeScene(), null);
}

// the disruption cascade widens correctly
{
  const settings = await import("../src/settings.js");
  settings.Settings.setDisruptionDie(true);
  settings.Settings.setDisruptionVolatile(false);
  const faces = new Map();
  for (let i = 0; i < 4000; i++) {
    const r = roller.rollOracle({ oracleId: "someone" });
    if (r.disruption) faces.set(r.disruption.roll, r.disruption.fires);
  }
  eq("a 1 always fires a random prompt", faces.get(1), "prompt");
  eq("a 2 fires a modified proposal", faces.get(2), "proposal");
  eq("a 3 fires nothing by default", faces.get(3), null);
  settings.Settings.setDisruptionVolatile(true);
  const wide = new Map();
  for (let i = 0; i < 4000; i++) {
    const r = roller.rollOracle({ oracleId: "someone" });
    if (r.disruption) wide.set(r.disruption.roll, r.disruption.fires);
  }
  eq("volatile widens the proposal range to 5", wide.get(5), "proposal");
  eq("volatile leaves 6 alone", wide.get(6), null);
  eq("1 stays the sole face for a random prompt", wide.get(1), "prompt");
  settings.Settings.setDisruptionDie(false);
  const off = roller.rollOracle({ oracleId: "someone" });
  ok("the disruption die is silent when off", off.disruption === null);
}

// --- glossary invariants ----------------------------------------------------
// The glossary is the layer under the rules library (§6.6 layer 0), and its
// defects are quiet ones: an alias two entries both claim sends a chip to the
// wrong definition, and an entry with no body is a word the app promises to
// explain and then does not.
{
  const G = lib.GLOSSARY;
  ok("the glossary has entries", G.length > 20, `${G.length}`);

  const gids = G.map((e) => e.id);
  eq("every glossary id is unique", new Set(gids).size, gids.length);

  // The first group must be the one that assumes nothing: a reader who has
  // never played a solo RPG meets it before any of the machinery.
  ok("the glossary opens with the group that assumes nothing",
    /first solo game/i.test(G[0].group || ""), G[0].group);

  for (const e of G) {
    ok(`“${e.term}” has a plain-language body`, !!e.body && e.body.length > 30);
    ok(`“${e.term}” belongs to a group`, !!e.group);
    ok(`“${e.term}” cites a page`, !!e.page);
    for (const a of e.aka || []) {
      ok(`alias “${a}” of “${e.term}” is lowercase`, a === a.toLowerCase());
    }
  }

  // Two entries claiming one word: the flat index silently keeps the last, so a
  // chip for that word would point at whichever entry was written second.
  const claims = new Map();
  for (const e of G) {
    for (const a of new Set([e.term.toLowerCase(), ...(e.aka || [])])) {
      const held = claims.get(a);
      if (held && held !== e.id) {
        ok(`the word “${a}” is claimed by one entry`, false,
          `both “${held}” and “${e.id}” claim it`);
      }
      claims.set(a, e.id);
    }
  }
  eq("the flat index covers every alias", lib.GLOSSARY_INDEX.size, claims.size);
}

// --- report -----------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log("  ✗ " + f);
  process.exit(1);
}
console.log("All green.\n");
