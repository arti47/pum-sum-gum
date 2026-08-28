// Game prep — PUM p.3's four steps, plus the starting point the book names as
// the thing to decide before play (template §6.3.7).

import { el, add, uid, fmtRange } from "./core.js";
import { explain, actionBar, toast, modal, inspireBlock } from "./ui.js";
import * as store from "./store.js";
import { plotSheet, trackTotal } from "./rules.js";
import { go, render } from "./router.js";
import { PLOT_SHEETS, NODE_CATEGORIES } from "../data-pum-plot.js";
import { registerClearer } from "./viewstate.js";
import { Settings } from "./settings.js";
// wizard <-> forge is a mutual import. Both sides reach the other only inside
// functions called after load, never at module-evaluation time, so the cycle
// resolves — the same shape forge/screens already has.
import { setForgeSection } from "./forge.js";

let step = 0;
let draft = null;
let onDone = null;
// A result carried in from the Forge. GUM is a prep tool, so rolling a plot seed
// before any game exists is the normal way to use it — and until now that roll
// had nowhere to go but the floor. Held here, offered against each field on the
// step that owns it, and cleared when prep ends.
let carried = null;
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
export function carryIntoWizard(seed) {
  if (!draft) { startWizard(null, seed); return; }
  carried = seed;
  go("more", "home");
}

export function startWizard(after = null, seed = null) {
  step = 0;
  onDone = after;
  carried = seed;
  draft = {
    title: "", universe: "", tone: "", inspiration: "",
    scopeName: "", mission: "", startingPoint: "",
    protagonists: [],
    sheetId: "standard",
    customNames: { custom1: "", custom2: "" },
    nodes: {},
  };
  for (const c of NODE_CATEGORIES) draft.nodes[c.id] = [];
  visible = {};
  go("more", "home");
}

export function inWizard() { return draft !== null; }

function cancelWizard() { draft = null; step = 0; carried = null; render(); }

// Switching game mid-prep discards the draft rather than carrying it across.
registerClearer(() => { draft = null; step = 0; onDone = null; visible = {}; carried = null; });

export function renderWizard(host) {
  const s = STEPS[step];
  add(host, el("h1", { text: "Prepare a game" }));
  add(host, el("p", { class: "lede", text: `Step ${s.n} of ${STEPS.length} — ${s.legend}` }));
  add(host, explain([
    "PUM asks for a little preparation so your mind is in the right creative context before you start.",
    "Nothing here is locked. Everything can be edited later, and plot nodes are meant to grow as you play.",
  ]));

  const nav = el("div", { class: "section-nav" });
  STEPS.forEach((st, i) => {
    const reachable = i <= step || legalUpTo(i);
    add(nav, el("button", {
      "aria-current": i === step ? "true" : "false",
      disabled: reachable ? null : true,
      title: reachable ? null : "Finish the earlier steps first",
      onclick: () => { if (reachable) { step = i; render(); } },
    }, `${st.n} ${st.name}`));
  });
  add(host, nav);

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
      if (step < STEPS.length - 1) { step += 1; render(); return; }
      finish();
    },
  });
}

// Legality per step (template §9.2 Phase 1).
function legalNow() {
  if (step === 0 && !draft.title.trim()) return { ok: false, why: "Name the game to continue" };
  if (step === 1 && !draft.scopeName.trim()) return { ok: false, why: "Name the plot scope to continue" };
  if (step === 2 && !draft.protagonists.length) return { ok: false, why: "Add at least one protagonist" };
  return { ok: true, why: "" };
}

function legalUpTo(i) {
  if (i >= 1 && !draft.title.trim()) return false;
  if (i >= 2 && !draft.scopeName.trim()) return false;
  if (i >= 3 && !draft.protagonists.length) return false;
  return true;
}

// What was rolled in the Forge, offered against the fields this step owns. One
// button per field, because "use this" with no destination is the question the
// player already could not answer.
// The Forge was invisible from the one screen where it is most useful. A player
// stuck on "what is this game even about?" was offered five empty fields and no
// way to find the machine that answers exactly that.
function forgeOfferCard(what) {
  if (!Settings.gum() || carried) return null;
  const card = el("div", { class: "card" });
  add(card, el("h3", { text: "Do not know yet?" }));
  add(card, el("p", { text: what }));
  add(card, el("p", { class: "muted", text: "Your draft is kept — come back to it from the card at the top of any More screen." }));
  add(card, el("button", {
    class: "btn wide", onclick: () => { setForgeSection("seed"); go("more", "forge"); },
  }, "Invent one in the Forge →"));
  return card;
}

function carriedCard(fields) {
  if (!carried || !fields.length) return null;
  const card = el("div", { class: "card notice" });
  add(card, el("div", { class: "card-head" },
    el("h3", { text: "Rolled in the Forge" }),
    el("span", { class: "cite", text: carried.label || "GUM" })
  ));
  add(card, el("p", { text: carried.text }));
  add(card, el("p", { class: "muted", text: "Add it to any field on this step. It is appended, never substituted for what you have already written." }));
  const row = el("div", { class: "btn-row" });
  for (const [key, name] of fields) {
    add(row, el("button", {
      class: "btn small", "aria-label": `Add the rolled text to ${name}`,
      onclick: () => {
        const was = (draft[key] || "").trim();
        draft[key] = was ? `${was}\n\n${carried.text}` : carried.text;
        toast(`Added to ${name}.`);
        render();
      },
    }, name));
  }
  add(card, row);
  add(card, el("button", {
    class: "btn small ghost", style: "margin-top:.4rem",
    onclick: () => { carried = null; render(); },
  }, "Dismiss"));
  return card;
}

function field(label, key, { multiline = false, placeholder = "", hint = "", inspire = null } = {}) {
  const input = multiline ? el("textarea", { placeholder }) : el("input", { type: "text", placeholder });
  input.value = draft[key] || "";
  input.addEventListener("input", () => {
    draft[key] = input.value;
    // Re-evaluate the pinned action's legality without a full re-render.
    const legal = legalNow();
    const btn = document.querySelector("#action-bar .btn.primary");
    const ctx = document.querySelector("#action-bar .ab-ctx");
    if (btn) btn.disabled = !legal.ok;
    if (ctx) ctx.textContent = legal.ok ? `step ${STEPS[step].n}/${STEPS.length}` : legal.why;
  });
  // The wizard's fields are inline on the screen rather than in a dialog, so the
  // block mounts beside the input instead of inside promptModal.
  return el("div", null,
    el("label", { class: "field" },
      el("span", { class: "lbl", text: label }),
      input,
      hint ? el("div", { class: "hint", text: hint }) : null
    ),
    inspireBlock(inspire, input)
  );
}

function stepUniverse(host) {
  add(host, forgeOfferCard("The Forge rolls six tables at once and hands you a whole starting situation — who pulled your protagonists in, what they are being asked to do, and who stands in the way. Roll it, then bring the parts you like back here."));
  add(host, carriedCard([
    ["title", "Name this game"], ["universe", "Universe or RPG"],
    ["tone", "World, tone and theme"], ["inspiration", "Inspiration"],
  ]));
  const card = el("div", { class: "card" });
  add(card, el("p", { class: "muted", text: "Narrow things down. Which RPG or universe do you want to roleplay in? If it brings no setting, define the world, tone and theme yourself. Mystery or horror? Social or action?" }));
  // no-inspire: a title is a name you coin. GUM's nearest tables emit synonym
  // clusters, not words, so the offer was to paste a thesaurus entry into it.
  add(card, field("Name this game", "title", { placeholder: "The Neverwinter road" }));
  // no-inspire: which RPG you are playing is a real-world answer, not one GUM has.
  add(card, field("Universe or RPG", "universe", { placeholder: "D&D 5e · Blade Runner · my own" }));
  add(card, field("World, tone and theme", "tone", { placeholder: "Grim frontier fantasy, low magic", inspire: "game-tone" }));
  add(card, field("Inspiration", "inspiration", {
    multiline: true,
    inspire: "game-inspiration",
    placeholder: "Artbooks, video games, lore, films, tarot…",
    hint: "The book suggests drawing on anything to hand. Premade adventures work too — read only the minimum to get started.",
  }));
  add(host, card);
}

function stepScope(host) {
  add(host, forgeOfferCard("A plot scope is one goal with an end in sight. The Forge rolls a list of exactly those — try it if nothing has suggested itself."));
  add(host, carriedCard([
    ["scopeName", "Plot scope name"], ["mission", "Mission"],
    ["startingPoint", "Starting point"],
  ]));
  const card = el("div", { class: "card" });
  // The old intro read "a plot scope is one defined MISSION, task or goal" and
  // was followed by two fields, one of them called Mission — the screen defined
  // the scope as a mission and then asked for both. Reported from play as
  // impossible to tell apart, and fairly.
  add(card, el("p", { class: "muted", text: "A plot scope is one storyline with an end in sight — defeating a powerful enemy, uncovering a mystery, solving an inner problem. Two things are asked about it, and they are not the same thing." }));
  add(card, el("p", { class: "muted" },
    el("strong", { text: "The name " }),
    "is a short label. You will see it at the top of every screen while you play. ",
    el("strong", { text: "The mission " }),
    "is the paragraph underneath: what is going on, and what your protagonists want out of it."
  ));
  add(card, field("Plot scope name", "scopeName", {
    placeholder: "Find out who burned the caravan",
    inspire: "scope-name",
    hint: "A handle, not a description — two to six words. It goes in the header on every screen.",
  }));
  // One label for one stored field: the scope's mission is called "Mission"
  // here, in the Add-a-scope dialog and on Home. What it is *for* — the initial
  // goals — is guidance, and guidance goes in the hint (§6.6).
  //
  // Its placeholder used to be an INSTRUCTION ("A pitch for the situation you
  // start in…") while the name field's was an EXAMPLE. One field showed and the
  // other told, which is half of why they read alike — and on a dark screen the
  // instruction looked like content already in the box.
  add(card, field("Mission", "mission", {
    multiline: true,
    inspire: "scope-mission",
    placeholder: "Caravans on the Triboar Trail keep burning. A merchant house has hired the party to find out who is behind it and stop them.",
    hint: "A paragraph, not a title: the situation you are starting in, and the protagonists' initial goals.",
  }));
  add(card, field("Starting point", "startingPoint", {
    multiline: true,
    inspire: "scope-start",
    placeholder: "Where does this open, and what is introduced there?",
    hint: "Optional now, and the home screen will keep asking until it's written. Consider starting in medias res.",
  }));
  if (Settings.gum()) {
    // The mission field's own inspiration block is the plot seed: scope-mission
    // maps to exactly GUM's six seed tables, so "All 6 tables" rolls the seed.
    add(card, el("p", { class: "cite", text: "Stuck on the mission? Its inspiration block rolls GUM's plot seed — a hook, a motivation, a mission, a lead, a caveat and the opposition." }));
  }
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
  const addBtn = el("button", { class: "btn wide", disabled: true }, "Add protagonist");
  const addOne = () => {
    const v = name.value.trim();
    if (!v) return;
    draft.protagonists.push({ id: uid("pc"), name: v, notes: notes.value.trim() });
    name.value = ""; notes.value = "";
    render();
  };
  addBtn.addEventListener("click", addOne);
  // A control that silently does nothing is worse than one that says why it
  // cannot act yet (§6.4): it stays disabled until there is a name to add.
  name.addEventListener("input", () => { addBtn.disabled = !name.value.trim(); });
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
  carried = null;

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
