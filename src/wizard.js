// Game prep — PUM p.3's four steps, plus the starting point the book names as
// the thing to decide before play (template §6.3.7).

import { el, add, uid, fmtRange } from "./core.js";
import { actionBar, toast, modal, inspireBlock } from "./ui.js";
import * as store from "./store.js";
import { plotSheet, trackTotal } from "./rules.js";
import { go, render } from "./router.js";
import { PLOT_SHEETS, NODE_CATEGORIES } from "../data-pum-plot.js";
import { GUM_PLOT_SEED, GUM_FOR_FIELDS } from "../data-gum.js";
import { rollGumSet } from "./roller.js";
import { registerClearer } from "./viewstate.js";
import { Settings } from "./settings.js";

let step = 0;
let draft = null;
let onDone = null;
// Which fields a roll has just filled, so they can be marked for the player to
// read and edit, and the dice that filled them (every die face is shown, §1.1).
// A roll used to arrive as a card of per-field buttons, each pasting all six
// lines into one box — reported from play as the point the player gave up.
let filled = null;   // { fields: Set<key>, dice: string, from: string }
// How many node slots each list is currently showing in prep (§6.5: a long list
// reveals progressively rather than landing all at once).
const SLOTS_AT_FIRST = 3;
let visible = {};

const STEPS = [
  { n: 1, name: "Universe", legend: "Pick a universe and gather inspiration" },
  { n: 2, name: "Scope", legend: "Draft a plot scope and mission" },
  { n: 3, name: "Protagonists", legend: "Create your main protagonists" },
  { n: 4, name: "Sheet", legend: "Pick a plot sheet" },
  { n: 5, name: "Nodes", legend: "Write your plot nodes" },
];

// Carry a Forge result into prep WITHOUT restarting it. startWizard resets the
// draft, so a player who is halfway through, goes to the Forge for an idea and
// comes back would lose everything they had typed.
export function carryIntoWizard(parts) {
  if (!draft) { startWizard(null, parts); return; }
  applyRoll(parts, "the Forge");
  go("more", "home");
}

export function startWizard(after = null, parts = null) {
  pcTyped = { name: "", notes: "" };
  step = 0;
  onDone = after;
  filled = null;
  draft = {
    title: "", universe: "", tone: "", inspiration: "",
    scopeName: "", mission: "", startingPoint: "", gameNotes: "",
    protagonists: [],
    sheetId: "standard",
    customNames: { custom1: "", custom2: "" },
    nodes: {},
  };
  for (const c of NODE_CATEGORIES) draft.nodes[c.id] = [];
  visible = {};
  if (parts) applyRoll(parts, "the Forge");
  go("more", "home");
}

// Put each rolled line where it belongs, rather than asking which field it is
// for. GUM's plot seed (p.3) answers the scope step, one line per place: the
// mission line is the Mission and nothing else (reported from play: "why does
// mission have the whole lump of data dumped inside"); the hook and the first
// lead are how the story opens, so they are the Starting point; motivation,
// caveat and opposition are background the player keeps in the plot sheet's
// Game notes. A table that serves the game's tone goes to the tone; anything
// else is inspiration. Appended, never substituted for what was written.
const LINE_NAMES = {
  "plot-hook": "Hook", motivation: "Motivation", mission: "Mission",
  "initial-lead": "First lead", caveat: "Caveat", opposition: "Opposition",
};

function applyRoll(parts, from) {
  const add = (key, text) => {
    if (!text) return;
    const was = (draft[key] || "").trim();
    draft[key] = was ? `${was}\n${text}` : text;
    keys.add(key);
  };
  const keys = new Set();
  const by = Object.fromEntries(parts.map((p) => [p.tableId, p]));
  const lines = (ids) => ids.filter((id) => by[id]).map((id) => `${LINE_NAMES[id]}: ${by[id].answer}`).join("\n");
  if (by.mission) add("mission", by.mission.answer);
  add("startingPoint", lines(["plot-hook", "initial-lead"]));
  add("gameNotes", lines(["motivation", "caveat", "opposition"]));
  for (const p of parts) {
    if (GUM_PLOT_SEED.includes(p.tableId)) continue;
    add(GUM_FOR_FIELDS["game-tone"].includes(p.tableId) ? "tone" : "inspiration", p.answer);
  }
  filled = {
    fields: keys,
    from,
    dice: parts.map((p) => `${(p.table && p.table.name) || LINE_NAMES[p.tableId] || p.tableId} ${p.roll}`).join(" · "),
  };
}

export function inWizard() { return draft !== null; }

function cancelWizard() { draft = null; step = 0; filled = null; pcTyped = { name: "", notes: "" }; render(); }

// Switching game mid-prep discards the draft rather than carrying it across.
registerClearer(() => { draft = null; step = 0; onDone = null; visible = {}; filled = null; pcTyped = { name: "", notes: "" }; });

export function renderWizard(host) {
  const s = STEPS[step];
  add(host, el("h1", { text: "Prepare a game" }));
  // Where you are, said once: no strip of five step buttons (four of them
  // greyed out), no fold above the form. Back and Next are the only way round.
  const dots = el("div", { class: "wz-dots", "aria-hidden": "true" });
  STEPS.forEach((_, i) => add(dots, el("i", { class: i < step ? "done" : i === step ? "here" : "" })));
  add(host, el("div", { class: "wz-progress" },
    dots,
    el("p", { class: "lede", text: `Step ${s.n} of ${STEPS.length} — ${s.legend}` })
  ));
  add(host, filledNote());

  if (step === 0) stepUniverse(host);
  if (step === 1) stepScope(host);
  if (step === 2) stepProtagonists(host);
  if (step === 3) stepSheet(host);
  if (step === 4) stepNodes(host);

  const legal = legalNow();
  actionBar({
    label: step === STEPS.length - 1 ? "Start playing" : "Next",
    context: legal.ok ? `step ${s.n}/${STEPS.length}` : legal.why,
    disabled: !legal.ok,
    secondary: step > 0
      ? { label: "Back", onClick: () => { step -= 1; render(); } }
      : { label: "Cancel", onClick: () => cancelWizard() },
    onClick: () => {
      if (step === 2 && pcTyped.name.trim()) addTypedProtagonist();
      if (step < STEPS.length - 1) { step += 1; render(); return; }
      finish();
    },
  });
}

// Re-evaluate the pinned action's legality without a full re-render.
function refreshBar() {
  const legal = legalNow();
  const btn = document.querySelector("#action-bar .btn.primary");
  const ctx = document.querySelector("#action-bar .ab-ctx");
  if (btn) btn.disabled = !legal.ok;
  if (ctx) ctx.textContent = legal.ok ? `step ${STEPS[step].n}/${STEPS.length}` : legal.why;
}

// A protagonist's name typed but not yet added. Next adds it: the step asks
// for at least one protagonist, and a stranger who has typed a name and
// presses the one orange button has given one — a disabled Next beside an
// unmarked "Add protagonist" stopped the follow-the-button walk dead here.
let pcTyped = { name: "", notes: "" };

function addTypedProtagonist() {
  const v = pcTyped.name.trim();
  if (!v) return false;
  draft.protagonists.push({ id: uid("pc"), name: v, notes: pcTyped.notes.trim() });
  pcTyped = { name: "", notes: "" };
  return true;
}

// Legality per step (template §9.2 Phase 1).
function legalNow() {
  if (step === 0 && !draft.title.trim()) return { ok: false, why: "Name the game to continue" };
  if (step === 1 && !draft.scopeName.trim()) return { ok: false, why: "Name the plot scope to continue" };
  if (step === 2 && !draft.protagonists.length && !pcTyped.name.trim()) return { ok: false, why: "Name a protagonist" };
  return { ok: true, why: "" };
}

// What a roll just filled, said in one line, with the dice beside it. The
// fields themselves are marked; there is nothing further to choose.
function filledNote() {
  if (!filled || !filled.fields.size) return null;
  const names = { title: "Name this game", universe: "Universe or RPG", tone: "World, tone and theme",
    inspiration: "Inspiration", mission: "Mission", startingPoint: "Starting point", gameNotes: "Game notes" };
  const where = [...filled.fields].map((k) => names[k] || k);
  const onScope = [...filled.fields].some((k) => k === "mission" || k === "startingPoint" || k === "gameNotes");
  return el("div", { class: "coach wz-filled" },
    el("strong", { text: `Filled from ${filled.from}: ` }),
    `${where.join(", ")}${onScope && step !== 1 ? " (step 2)" : ""}. Read it, change anything, keep what fits.`,
    el("div", { class: "cite", text: filled.dice })
  );
}

// One button that does what the Forge's plot seed does, without leaving prep:
// roll GUM's six seed tables (GUM p.3) and put each line where it belongs.
function suggestCard() {
  if (!Settings.gum()) return null;
  const card = el("div", { class: "card wz-suggest" });
  add(card, el("p", { class: "muted", text: "No story in mind yet? GUM can roll one: a hook, a motivation, a mission, a first lead, a caveat and the opposition — each written into the field it belongs to below, for you to edit." }));
  add(card, el("button", {
    class: "btn wide",
    onclick: () => {
      const set = rollGumSet(GUM_PLOT_SEED);
      applyRoll(set.parts, "GUM's plot seed");
      render();
    },
  }, "Suggest a starting situation"));
  return card;
}

function field(label, key, { multiline = false, placeholder = "", hint = "", inspire = null } = {}) {
  const input = multiline ? el("textarea", { placeholder }) : el("input", { type: "text", placeholder });
  input.value = draft[key] || "";
  input.addEventListener("input", () => {
    draft[key] = input.value;
    refreshBar();
  });
  // The wizard's fields are inline on the screen rather than in a dialog, so the
  // block mounts beside the input instead of inside promptModal.
  return el("div", { class: filled && filled.fields.has(key) ? "wz-was-filled" : null },
    el("label", { class: "field" },
      el("span", { class: "lbl", text: label }),
      input,
      hint ? el("div", { class: "hint", text: hint }) : null
    ),
    inspireBlock(inspire, input)
  );
}

function stepUniverse(host) {
  const card = el("div", { class: "card" });
  // no-inspire: a title is a name you coin. GUM's nearest tables emit synonym
  // clusters, not words, so the offer was to paste a thesaurus entry into it.
  add(card, field("Name this game", "title", {
    placeholder: "The Neverwinter road",
    hint: "The only thing this step needs. You can change it later.",
  }));
  // The rest is optional, so it waits behind one line instead of standing
  // between the player and Next. It opens by itself once anything is in it.
  const more = el("details", { class: "acc wz-more" },
    el("summary", null, "Add more detail (optional)"));
  if (draft.universe || draft.tone || draft.inspiration) more.open = true;
  const body = el("div", { class: "acc-body" });
  add(body, el("p", { class: "muted", text: "Which RPG or universe do you want to roleplay in? If it brings no setting, define the world, tone and theme yourself. Mystery or horror? Social or action?" }));
  // no-inspire: which RPG you are playing is a real-world answer, not one GUM has.
  add(body, field("Universe or RPG", "universe", { placeholder: "D&D 5e · Blade Runner · my own" }));
  add(body, field("World, tone and theme", "tone", { placeholder: "Grim frontier fantasy, low magic", inspire: "game-tone" }));
  add(body, field("Inspiration", "inspiration", {
    multiline: true,
    inspire: "game-inspiration",
    placeholder: "Artbooks, video games, lore, films, tarot…",
    hint: "The book suggests drawing on anything to hand. Premade adventures work too — read only the minimum to get started.",
  }));
  add(more, body);
  add(card, more);
  add(host, card);
}

function stepScope(host) {
  add(host, suggestCard());
  const card = el("div", { class: "card" });
  // The old intro read "a plot scope is one defined MISSION, task or goal" and
  // was followed by two fields, one of them called Mission — reported from play
  // as impossible to tell apart. The contrast is said once, plainly.
  add(card, el("p", { class: "muted" },
    "A plot scope is one storyline with an end in sight. ",
    el("strong", { text: "The name " }),
    "is a short label you will see at the top of every screen. ",
    el("strong", { text: "The mission " }),
    "is the paragraph underneath: what is going on, and what your protagonists want out of it."
  ));
  // no-inspire: a scope name is a handle for the player's OWN fiction — "who
  // burned THE CARAVAN". GUM has no table of their nouns, so every offer was a
  // generic goal they would rewrite from scratch. Reported from play twice.
  add(card, field("Plot scope name", "scopeName", {
    placeholder: "Find out who burned the caravan",
    hint: "Two to six words. Nothing coming? Write the mission first, then lift the name out of it.",
  }));
  // no-inspire: the suggestion card above rolls the plot seed into this field.
  add(card, field("Mission", "mission", {
    multiline: true,
    placeholder: "Caravans on the Triboar Trail keep burning. A merchant house has hired the party to find out who is behind it and stop them.",
    hint: "A paragraph, not a title: the situation you are starting in, and the protagonists' initial goals.",
  }));
  // no-inspire: the suggestion card above rolls the plot seed's hook into this field.
  add(card, field("Starting point", "startingPoint", {
    multiline: true,
    placeholder: "Where does this open, and what is introduced there?",
    hint: "Optional now — the home screen will keep asking until it's written. Consider starting in medias res.",
  }));
  // The plot sheet's Game notes area (the printed node sheets carry one), here
  // so background the player wants kept has a home that is not the Mission.
  // Folded: it is optional, and opens by itself once anything is in it.
  const more = el("details", { class: "acc wz-more" }, el("summary", null, "Game notes (optional)"));
  if (draft.gameNotes) more.open = true;
  const body = el("div", { class: "acc-body" });
  // no-inspire: the suggestion card above writes the plot seed's background lines here.
  add(body, field("Game notes", "gameNotes", {
    multiline: true,
    placeholder: "Who wants what, what could go wrong, who stands in the way…",
    hint: "Background to keep beside the plot sheet. You will find it under This scope on the Play tab.",
  }));
  add(more, body);
  add(card, more);
  add(host, card);
}

function stepProtagonists(host) {
  const card = el("div", { class: "card" });
  add(card, el("p", { class: "muted", text: "Your PCs are your eyes and ears in the universe. You are in full control of their thoughts, voice and actions — PUM never rolls for them." }));
  for (const p of draft.protagonists) {
    add(card, el("div", { class: "entry" },
      el("div", { class: "entry-head" },
        el("span", { class: "entry-title", text: p.name }),
        el("button", {
          class: "btn small ghost", style: "margin-left:auto",
          onclick: () => {
            draft.protagonists = draft.protagonists.filter((x) => x.id !== p.id);
            render();
          },
        }, "Remove")
      ),
      p.notes ? el("div", { class: "entry-detail", text: p.notes }) : null
    ));
  }
  const name = el("input", { type: "text", placeholder: "Name" });
  const notes = el("input", { type: "text", placeholder: "A line about them (optional)" });
  const addBtn = el("button", { class: "btn wide" }, draft.protagonists.length ? "Add another protagonist" : "Add protagonist");
  if (!draft.protagonists.length) add(card, el("p", { class: "cite", text: "Type a name, then Next — or Add protagonist to add more than one." }));
  name.value = pcTyped.name; notes.value = pcTyped.notes;
  addBtn.disabled = !name.value.trim();
  const addOne = () => { if (addTypedProtagonist()) render(); };
  addBtn.addEventListener("click", addOne);
  // A control that silently does nothing is worse than one that says why it
  // cannot act yet (§6.4): it stays disabled until there is a name to add.
  name.addEventListener("input", () => {
    pcTyped.name = name.value;
    addBtn.disabled = !name.value.trim();
    refreshBar();
  });
  notes.addEventListener("input", () => { pcTyped.notes = notes.value; });
  name.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addOne(); } });
  add(card, el("label", { class: "field" }, el("span", { class: "lbl", text: "Name" }), name));
  add(card, el("label", { class: "field" }, el("span", { class: "lbl", text: "Notes" }), notes));
  add(card, addBtn);
  add(host, card);
}

function stepSheet(host) {
  add(host, el("p", { class: "muted", text: "The sheet sets your pacing: how long the track is, how it is sectioned, and how often you invoke beats. More boxes means more randomness before this thread resolves." }));
  // Ten sheets is a pacing decision a first-timer has no basis to make, and the
  // measured first run met 444 words here. Standard is the book's own answer —
  // "if this is your first time, the standard Plot Sheet is a good start"
  // (p.3) — so it leads alone until the player asks for the rest.
  const showAll = !!visible.sheets;
  const list = showAll
    ? PLOT_SHEETS
    : PLOT_SHEETS.filter((s) => s.id === "standard" || s.id === draft.sheetId);
  for (const sheet of list) {
    const chosen = draft.sheetId === sheet.id;
    const card = el("div", { class: "card", style: chosen ? "border-color:var(--accent)" : null });
    add(card, el("div", { class: "card-head" },
      el("h3", { text: sheet.name }),
      el("span", { class: "pill" + (chosen ? " on" : ""), text: sheet.track.length ? `${trackTotal(sheet.track)} boxes` : "no track" }),
      el("span", { class: "cite", text: `p.${sheet.page}` })
    ));
    add(card, el("p", { class: "muted", text: sheet.tagline }));
    add(card, trackPreview(sheet));
    add(card, el("p", { class: "muted", text: sheet.detail }));
    add(card, el("p", { class: "cite", text: sheet.nodeSlots
      ? `${sheet.nodeSlots} node slots per list${sheet.expandedNodes ? " · characters and locations too" : ""}`
      : "no plot nodes" }));
    // The picker behaves like a radio group, so say so: without aria-pressed a
    // screen reader hears ten identical buttons and no indication of which one
    // is live, and the chosen one is a control that correctly does nothing.
    add(card, el("button", {
      class: `btn wide ${chosen ? "primary" : ""}`.trim(),
      "aria-pressed": chosen ? "true" : "false",
      onclick: () => { draft.sheetId = sheet.id; render(); },
    }, chosen ? "Chosen" : "Choose this sheet"));
    if (sheet.id === "standard" && !showAll) {
      add(card, el("p", { class: "cite", text: "PUM p.3: if this is your first time, the Standard sheet is a good start." }));
    }
    add(host, card);
  }
  if (!showAll) {
    add(host, el("button", {
      class: "btn wide",
      onclick: () => { visible.sheets = true; render(); },
    }, "Show all ten plot sheets"));
  }
}

function trackPreview(sheet) {
  if (!sheet.track.length) return el("p", { class: "cite", text: "— no plot track —" });
  const track = el("div", { class: "track" });
  for (const sec of sheet.track) {
    const secEl = el("div", { class: "track-sec" },
      el("div", { class: "track-sec-name", text: `${sec.name} (${sec.boxes})` })
    );
    const boxes = el("div", { class: "track-boxes" });
    for (let i = 0; i < sec.boxes; i++) add(boxes, el("div", { class: "track-box", style: "height:18px;min-width:16px" }));
    add(secEl, boxes);
    add(track, secEl);
  }
  return track;
}

function stepNodes(host) {
  const sheet = plotSheet(draft.sheetId);
  add(host, el("p", { class: "muted", text: "Plot nodes are your game's own content — the things a random prompt reaches into. Write a few now; you can add more at any time, and empty slots are an invitation to invent." }));

  if (!sheet.nodeSlots) {
    add(host, el("div", { class: "card" },
      el("h3", { text: `${sheet.name} uses no plot nodes` }),
      el("p", { class: "muted", text: "This sheet plays lightweight: its prompt column reaches only the random events. Nothing to write here — go and play." })
    ));
    return;
  }

  for (const cat of NODE_CATEGORIES) {
    if (cat.expanded && !sheet.expandedNodes) continue;
    // A list of your own does not exist until it is named (PUM p.27), so it gets
    // no slots here either — writing into one would be writing into nothing.
    if (cat.custom && !draft.customNames[cat.id]) continue;
    const card = el("div", { class: "card" });
    add(card, el("div", { class: "card-head" },
      el("h3", { text: draft.customNames[cat.id] || cat.name }),
      el("span", { class: "cite", text: `${(draft.nodes[cat.id] || []).filter(Boolean).length}/${sheet.nodeSlots}` })
    ));
    add(card, el("p", { class: "muted", text: cat.definition }));
    add(card, el("p", { class: "cite", text: "e.g. " + cat.examples }));
    const list = draft.nodes[cat.id] || (draft.nodes[cat.id] = []);
    // Prep asked for up to sixty empty boxes on a Journey sheet, which reads as
    // an obligation. The book says nodes grow in play, so show a few and let the
    // player call for more; the slots all still exist on the plot sheet.
    const shown = Math.min(sheet.nodeSlots, Math.max(SLOTS_AT_FIRST, visible[cat.id] || 0,
      list.filter((x) => x && x.trim()).length + 1));
    const inputs = [];
    for (let i = 0; i < shown; i++) {
      const input = el("input", { type: "text", placeholder: "Add new, choose, or reroll" });
      input.value = list[i] || "";
      input.addEventListener("input", () => { list[i] = input.value; });
      inputs.push(input);
      add(card, el("div", { class: "node-row" },
        el("span", { class: "node-idx", text: fmtRange(i * 2 + 1, i * 2 + 2) }),
        input
      ));
    }
    // One block per list rather than one per slot: a rolled word lands in the
    // first empty slot, which is where writeNodeToFirstEmpty puts one in play.
    // Getter and setter must agree on which slot they mean, or appending to a
    // full list would overwrite the last entry instead of extending it.
    const slot = () => inputs.find((x) => !x.value.trim()) || inputs[inputs.length - 1];
    const target = {
      tagName: "INPUT",
      get value() { return slot().value; },
      set value(v) { const n = slot(); n.value = v; list[inputs.indexOf(n)] = v; },
      focus() { slot().focus(); },
      setSelectionRange() {},
      dispatchEvent() { return true; },
    };
    add(card, inspireBlock(cat.id, target));
    if (shown < sheet.nodeSlots) {
      add(card, el("button", {
        class: "btn small ghost",
        onclick: () => { visible[cat.id] = shown + 1; render(); },
      }, `Add another slot — ${sheet.nodeSlots - shown} left`));
    }
    add(host, card);
  }

  // The plot-node extension sheet prints two blank lists you name yourself (p.27).
  if (sheet.expandedNodes) {
    const unused = NODE_CATEGORIES.filter((c) => c.custom && !draft.customNames[c.id]);
    if (unused.length) {
      const card = el("div", { class: "card" });
      add(card, el("h3", { text: "A list of your own" }));
      add(card, el("p", { class: "muted", text: `${sheet.name} pairs with the plot-node extension sheet, which carries two blank lists for whatever this game needs that the printed categories do not cover. ${unused.length} still unused.` }));
      const name = el("input", { type: "text", placeholder: "Factions · rumours · omens · debts owed" });
      const addBtn = el("button", { class: "btn wide", disabled: true }, "Add a plot node list");
      const addList = () => {
        const v = name.value.trim();
        if (!v) return;
        draft.customNames[unused[0].id] = v;
        name.value = "";
        render();
      };
      addBtn.addEventListener("click", addList);
      // Disabled until there is a name, rather than silently doing nothing.
      name.addEventListener("input", () => { addBtn.disabled = !name.value.trim(); });
      name.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addList(); } });
      add(card, el("label", { class: "field" }, el("span", { class: "lbl", text: "What is this list of?" }), name));
      add(card, inspireBlock("list-name", name));
      add(card, addBtn);
      add(card, el("p", { class: "cite", text: "PUM p.27 — point a face of the Random Prompt column at it on a Customized sheet." }));
      add(host, card);
    }
  }
}

function finish() {
  // Take a local copy first: creating the game changes the active context, which
  // fires the clearer registered below and nulls `draft` mid-flight.
  const d = draft;
  draft = null;
  step = 0;
  filled = null;

  const game = store.createGame(d);
  const scope = game.scopes[0];
  store.addJournal({
    kind: "prep",
    title: "Game prepared",
    detail: [d.universe, d.tone, plotSheet(d.sheetId).name].filter(Boolean).join(" · "),
    scopeId: scope.id,
  });
  if (d.startingPoint) {
    store.addJournal({ kind: "prep", title: "Starting point", detail: d.startingPoint, scopeId: scope.id });
  }
  toast("Ready. Open a scene when you are.");
  if (onDone) { const f = onDone; onDone = null; f(); }
  else go("play", "track");
}

// Adding a further plot sheet to an existing game — a short version of steps 2, 4, 5.
export function addScopeDialog() {
  const name = el("input", { type: "text", placeholder: "The next thread" });
  const mission = el("textarea", { placeholder: "What is this scope about?" });
  const select = el("select");
  for (const s of PLOT_SHEETS) {
    add(select, el("option", { value: s.id },
      `${s.name} — ${s.track.length ? trackTotal(s.track) + " boxes" : "no track"}`));
  }
  modal({
    title: "New plot sheet",
    body: el("div", null,
      el("p", { class: "muted", text: "A longer game is several plot sheets, each covering one scope. The finished ones stay in the library as a record." }),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Plot scope name" }), name),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Mission" }), mission),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Plot sheet" }), select)
    ),
    actions: [
      {
        label: "Add it", primary: true,
        onClick: () => {
          const v = name.value.trim();
          if (!v) { toast("Give the scope a name."); return true; }
          store.addScope({ name: v, mission: mission.value, sheetId: select.value });
          store.addJournal({ kind: "prep", title: "New plot sheet", detail: `${v} · ${plotSheet(select.value).name}` });
          go("play", "track");
        },
      },
      { label: "Cancel" },
    ],
  });
}
