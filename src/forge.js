// The Forge tab — GUM. Prep-time generation: the blanks PUM's plot sheets and
// SUM's scenes expect you to have already filled in.
//
// GUM's own method is combination: "the key strength of GUM is its ability to
// combine multiple tables for a single subject, or roll multiple times within one
// table" (GUM p.3). So the unit of this screen is a *set* of rolls read together,
// not a single answer.

import { el, add, announce } from "./core.js";
import { explain, actionBar, resultCard, toast, modal, closeModal, promptModal, emptyState,
  registerInspire, noGameNotice } from "./ui.js";
import * as store from "./store.js";
import { rollGum, rollGumSet, journalRoll, diceText } from "./roller.js";
import { gumTable, gumSection } from "./rules.js";
import { nodeSlots, categoryName } from "./derived.js";
import { render, go } from "./router.js";
import { Settings } from "./settings.js";
import { openRule } from "./screens.js";
// Prep is where a plot seed belongs, so the Forge has to be able to start it.
// forge -> wizard -> forge is a cycle the module graph already contains (both
// reach each other only inside functions called after load), same as forge/screens.
import { startWizard } from "./wizard.js";
import { registerClearer } from "./viewstate.js";
import { GUM_TABLES, GUM_PLOT_SEED, GUM_GRAND, GUM_FOR_FIELDS, INSPIRE_WORDS }
  from "../data-gum.js";
import { NODE_CATEGORIES } from "../data-pum-plot.js";

// The last result, held so a re-render never re-rolls it (§5.1).
let last = null;
// The Forge is a section of More rather than a tab of its own, so it carries its
// own second-level nav — the same shape the Journal uses for its filters.
let forgeSection = "seed";
const FORGE_SECTIONS = [
  ["seed", "Plot seed"], ["world", "World"], ["character", "Characters"], ["grand", "Grand oracle"],
];

function resetForge() { last = null; }
registerClearer(resetForge);

export function renderForge(host) {
  if (!Settings.gum()) {
    add(host, el("h1", { text: "Forge" }));
    add(host, emptyState(
      "GUM is switched off",
      "The Game Unfolding Machine's tables are hidden. Turn them back on if you own the book.",
      { label: "Open Settings", onClick: () => go("more", "settings") }
    ));
    return;
  }

  if (!store.activeGame()) {
    add(host, noGameNotice({
      what: "any generator here",
      onPrepare: () => go("more", "home"),
      onWalkthrough: () => go("more", "tutorial"),
    }));
  }

  const nav = el("nav", { class: "section-nav", "aria-label": "Forge sections" });
  for (const [id, label] of FORGE_SECTIONS) {
    add(nav, el("button", {
      "aria-current": forgeSection === id ? "true" : "false",
      onclick: () => { forgeSection = id; last = null; render(); },
    }, label));
  }
  add(host, nav);

  if (forgeSection === "seed") return renderSeed(host);
  if (forgeSection === "grand") return renderGrand(host);
  return renderSectionTables(host, forgeSection);
}

// --- the plot seed: the book's own combination, in its own order -----------
function renderSeed(host) {
  add(host, el("h1", { text: "Plot seed" }));
  add(host, explain([
    "GUM's own six-table combination, in the book's order: a hook, a motivation, a mission, the first lead, a caveat, and the opposition.",
    "Roll the set, read the six lines as one situation, then keep whichever parts you like — this is a seed, not a verdict.",
  ], "gum-what", openRule));

  if (last) add(host, renderLast());

  const card = el("div", { class: "card" });
  add(card, el("h2", { text: "The six questions" }));
  for (const id of GUM_PLOT_SEED) {
    const t = gumTable(id);
    if (!t) continue;
    add(card, el("div", { class: "node-row" },
      el("span", { class: "node-txt" }, el("strong", { text: t.name }), el("br"),
        el("span", { class: "muted", text: t.blurb })),
      el("button", {
        // "d20" is a die size, not a name. The row beside it says which table
        // this is; the button's own accessible name has to say it too.
        class: "btn small", "aria-label": `Roll ${t.name} — d${t.die}`,
        onclick: () => fireOne(id),
      }, `d${t.die}`)
    ));
  }
  add(host, card);

  add(host, worldTruthsCard());

  actionBar({
    label: "Roll a whole plot seed",
    context: "six tables, read together",
    secondary: { label: "World truths", onClick: () => fireSet(["location-archetype", "background-problem"], "World truths") },
    onClick: () => fireSet(GUM_PLOT_SEED, "Plot seed"),
  });
}

function worldTruthsCard() {
  const card = el("div", { class: "card" });
  add(card, el("h2", { text: "World truths" }));
  add(card, el("p", { class: "muted", text: "Two tables that set the ground everything else stands on: where this happens, and what is already wrong there." }));
  const row = el("div", { class: "btn-row" });
  for (const id of ["location-archetype", "background-problem"]) {
    const t = gumTable(id);
    add(row, el("button", { class: "btn", onclick: () => fireOne(id) }, t.name));
  }
  add(card, row);
  return card;
}

// --- the grand oracle: three words -----------------------------------------
function renderGrand(host) {
  add(host, el("h1", { text: "Grand oracle" }));
  add(host, explain([
    "Three d100 tables — an action, an adjective and a subject — for the moment no specific oracle fits.",
    "Read the three words together and let them mean something. That interpretation is the answer; the words are only the prompt.",
  ], "gum-what", openRule));

  if (last) add(host, renderLast());

  const card = el("div", { class: "card" });
  add(card, el("p", { class: "muted", text: "Roll all three, or just the one you are missing." }));
  const row = el("div", { class: "btn-row" });
  for (const id of GUM_GRAND) {
    const t = gumTable(id);
    add(row, el("button", { class: "btn", onclick: () => fireOne(id) }, t.name));
  }
  add(card, row);
  add(host, card);

  actionBar({
    label: "Roll all three",
    context: "action · adjective · subject",
    onClick: () => fireSet(GUM_GRAND, "Grand oracle"),
  });
}

// --- a section of generators ------------------------------------------------
function renderSectionTables(host, sectionId) {
  const sec = gumSection(sectionId);
  const tables = GUM_TABLES.filter((t) => t.section === sectionId);
  add(host, el("h1", { text: sec ? sec.name : "Forge" }));
  add(host, explain([
    sec ? sec.blurb : "",
    "GUM's strength is combination: roll several tables for one subject, or the same table twice, and read the results together.",
    "Nothing here is binding. Interpret freely to fit your world, tone and theme.",
  ], "gum-what", openRule));

  if (last) add(host, renderLast());

  // Grouped by the book's own subject headings, so a whole subject rolls at once.
  const groups = [];
  for (const t of tables) {
    const g = groups.find((x) => x.name === t.group);
    if (g) g.tables.push(t);
    else groups.push({ name: t.group, tables: [t] });
  }

  for (const g of groups) {
    const card = el("div", { class: "card" });
    add(card, el("div", { class: "card-head" },
      el("h3", { text: g.name }),
      el("span", { class: "cite", text: `GUM p.${g.tables[0].page}` })
    ));
    for (const t of g.tables) {
      add(card, el("div", { class: "node-row" },
        el("span", { class: "node-txt" },
          el("strong", { text: t.name }), el("br"),
          el("span", { class: "muted", text: t.blurb })),
        el("button", {
          class: "btn small", "aria-label": `Roll ${t.name} — d${t.die}`,
          onclick: () => fireOne(t.id),
        }, `d${t.die}`)
      ));
    }
    if (g.tables.length > 1) {
      add(card, el("button", {
        class: "btn wide",
        onclick: () => fireSet(g.tables.map((t) => t.id), g.name),
      }, `Roll all of ${g.name}`));
    }
    add(card, tableDetails(g.tables));
    add(host, card);
  }
}

function tableDetails(tables) {
  const d = el("details", { class: "explain" },
    el("summary", null, `The whole ${tables.length === 1 ? "table" : "set"}`));
  const body = el("div", { class: "body table-scroll" });
  for (const t of tables) {
    add(body, el("h3", { text: `${t.name} — d${t.die}` }));
    const table = el("table", { class: "rows" });
    t.rows.forEach((r, i) => {
      add(table, el("tr", null,
        el("td", { class: "r", text: String(i + 1) }),
        el("td", { text: r })
      ));
    });
    add(body, table);
  }
  add(d, body);
  return d;
}

// --- rolling -----------------------------------------------------------------
function fireOne(tableId) {
  const r = rollGum({ tableId });
  last = { result: r, label: r.table.name };
  journalRoll(r, {
    kind: "gum", title: `${r.table.name} — ${r.answer}`, detail: diceText(r.dice),
  });
  announce(`${r.table.name}: ${r.answer}`);
  render();
}

function fireSet(ids, label) {
  const r = rollGumSet(ids);
  last = { result: r, label };
  journalRoll(r, {
    kind: "gum", title: label,
    detail: r.parts.map((p) => `${p.table.name}: ${p.answer}`).join(" · "),
  });
  announce(`${label}: ${r.parts.length} results`);
  render();
}

function renderLast() {
  const { result, label } = last;
  const parts = result.kind === "gum-set" ? result.parts : [result];

  const extra = el("div");
  if (parts.length > 1) {
    for (const p of parts) {
      add(extra, el("div", { class: "entry" },
        el("div", { class: "entry-head" },
          el("span", { class: "entry-kind", text: p.table.name }),
          el("span", { class: "entry-ts", text: `d${p.table.die} ${p.roll}` })
        ),
        el("div", { text: p.answer }),
        el("button", {
          class: "btn small ghost",
          onclick: () => { fireOne(p.tableId); },
        }, "Re-roll this one")
      ));
    }
  }

  return resultCard({
    kind: `GUM · ${label}`,
    answer: parts.length === 1 ? parts[0].answer : `${parts.length} results — read them together`,
    second: parts.length === 1 ? parts[0].table.blurb : null,
    dice: result.dice,
    extra: parts.length > 1 ? extra : null,
    actions: [
      {
        label: "Re-roll", primary: true,
        onClick: () => {
          if (result.kind === "gum-set") fireSet(parts.map((p) => p.tableId), label);
          else fireOne(result.tableId);
        },
      },
      { label: "Keep it →", onClick: () => keepDialog(parts, label) },
      { label: "Dismiss", onClick: () => { last = null; render(); } },
    ],
  });
}

// A generated result is only useful once it is written somewhere the game reads.
// A rolled idea does nothing until it is written where the game will reach for
// it. GUM is a PREP tool by the book's own division of labour, so the two moments
// that mattered most were the two this dialog served worst:
//
//   · before a game exists — the whole point of the plot seed — where it could
//     only say "there is nowhere to keep this" and drop the result on the floor;
//   · while setting a game up, where the only destinations were plot nodes, the
//     cast and the journal. GUM's own six-table seed is a hook, a motivation, a
//     MISSION, a first lead, a caveat and an opposition, and not one of those
//     could reach the scope's Mission, the game's universe, its tone, or a
//     protagonist.
//
// Both are destinations now, and a roll taken with no game open is carried into
// prep rather than discarded.
function appendInto(existing, text) {
  const was = (existing || "").trim();
  return was ? `${was}\n\n${text}` : text;
}

function keepDialog(parts, label) {
  const text = parts.map((p) => p.answer).join(" · ");
  const scope = store.currentScope();
  const game = store.activeGame();
  const body = el("div");
  add(body, el("p", { class: "muted", text: "A rolled idea does nothing until it is written down. Put it where the game will reach for it." }));
  add(body, el("div", { class: "card" }, el("p", { text })));

  if (!game) {
    // No game yet is the NORMAL case for a plot seed, not an error state. Carry
    // the result into prep and let the wizard offer it against each field.
    add(body, el("p", { class: "muted", text: "No game open yet — which is exactly when a plot seed is most useful. Take this into game prep and it will be offered against every field it could fill." }));
    modal({
      title: "Keep this",
      body,
      actions: [
        {
          label: "Prepare a game with this", primary: true,
          onClick: () => { closeModal(); startWizard(null, { text, label }); return true; },
        },
        { label: "Cancel" },
      ],
    });
    return;
  }

  const dest = (labelText, run) => add(body, el("button", {
    class: "btn wide", onclick: () => { closeModal(); run(); },
  }, labelText));

  // 1. The plot-node lists this sheet actually prints.
  if (scope) {
    for (const cat of NODE_CATEGORIES) {
      const slots = nodeSlots(scope, cat.id);
      if (!slots) continue;
      dest(`Write into ${categoryName(scope, cat.id)}`, () => {
        const at = store.writeNodeToFirstEmpty(cat.id, text, slots);
        if (at < 0) toast(`${categoryName(scope, cat.id)} is full — clear a slot first.`);
        else { toast(`Written into ${cat.name}.`, { undo: true }); go("play", "nodes"); }
      });
    }
  }

  // 2. The game's own setting fields, and the scope's. These are what a plot
  // seed, a world truth or a faction is actually FOR. Folded, because they are
  // six destinations and the node lists above are the commoner answer in play.
  const fold = el("details", { class: "acc" },
    el("summary", null, "Into this game's setting or plot sheet"));
  const foldBody = el("div", { class: "acc-body" });
  const into = (labelText, run) => add(foldBody, el("button", {
    class: "btn wide", onclick: () => { closeModal(); run(); },
  }, labelText));

  into("Add to the universe", () => {
    store.updateGame({ universe: appendInto(game.universe, text) });
    toast("Added to the universe.", { undo: true });
    go("more", "home");
  });
  into("Add to the world, tone and theme", () => {
    store.updateGame({ tone: appendInto(game.tone, text) });
    toast("Added to the tone.", { undo: true });
    go("more", "home");
  });
  into("Add to the game's inspiration", () => {
    store.updateGame({ inspiration: appendInto(game.inspiration, text) });
    toast("Added to the inspiration.", { undo: true });
    go("more", "home");
  });
  if (scope) {
    into("Add to this plot sheet's mission", () => {
      store.updateScope({ mission: appendInto(scope.mission, text) });
      toast("Added to the mission.", { undo: true });
      go("more", "home");
    });
    into("Add to the starting point", () => {
      store.updateScope({ startingPoint: appendInto(scope.startingPoint, text) });
      toast("Added to the starting point.", { undo: true });
      go("more", "home");
    });
    into("Add to the game notes", () => {
      store.setScopeNotes(appendInto(scope.notes, text));
      toast("Added to the game notes.", { undo: true });
      go("play", "track");
    });
  }
  add(fold, foldBody);
  add(body, fold);

  // 3. People and places.
  dest("Add as a protagonist", () => {
    promptModal({
      // no-inspire: you have just rolled; this only names the result.
      title: "Name your protagonist", label: "Name",
      hint: text,
      onSubmit: (v) => {
        if (!v) return;
        store.addProtagonist(v, text);
        toast("Added as a protagonist.", { undo: true });
        go("play", "cast");
      },
    });
  });
  dest("Add to the cast as a character", () => {
    promptModal({
      // no-inspire: you have just rolled; this only names the result.
      title: "Name them", label: "Name",
      hint: text,
      onSubmit: (v) => {
        if (!v) return;
        store.addCast("character", v, text);
        toast("Added to the cast.", { undo: true });
        go("play", "cast");
      },
    });
  });
  dest("Add to the cast as a location", () => {
    promptModal({
      // no-inspire: as above.
      title: "Name the place", label: "Name",
      hint: text,
      onSubmit: (v) => {
        if (!v) return;
        store.addCast("location", v, text);
        toast("Added to the cast.", { undo: true });
        go("play", "cast");
      },
    });
  });
  dest("Just keep it in the journal", () => {
    store.addJournal({ kind: "note", title: `Kept from GUM — ${label}`, detail: text });
    toast("Kept in the journal.", { undo: true });
  });

  modal({ title: "Keep this", body, actions: [{ label: "Cancel" }] });
}

// --- inspiration: three rolled words beside any text field -----------------
// Every text input in the app can ask GUM for three words. This is the one
// mechanism for it (§10.11), mounted *inside* the dialog rather than opening a
// second one — a nested dialog would replace the first and take whatever the
// player had already typed with it.

// Which tables a field reaches for, falling back to the grand oracle.
export function inspireTables(fieldId) {
  const mapped = (GUM_FOR_FIELDS[fieldId] || []).filter((id) => gumTable(id));
  return mapped.length ? mapped : GUM_GRAND.filter((id) => gumTable(id));
}

// Three tables from the field's set, starting at an offset that advances on each
// re-roll so a field with more than three does not waste the extras. A field with
// fewer than three rolls repeatedly within the ones it has, which GUM p.3 names
// as its own method.
function pickTables(ids, offset) {
  const out = [];
  for (let i = 0; i < INSPIRE_WORDS; i++) out.push(ids[(offset + i) % ids.length]);
  return out;
}

// Only what the player actually uses is journalled (a recorded decision): the
// dice that produced a kept word are counted, the discarded ones are not.
function keepInspiration(parts, fieldId) {
  const text = parts.map((p) => p.answer).join(" · ");
  store.addJournal({
    kind: "gum",
    title: parts.length === 1
      ? `${parts[0].table.name} — ${parts[0].answer}`
      : `Inspiration — ${parts.length} words`,
    detail: `${parts.map((p) => `${p.table.name}: ${p.answer}`).join(" · ")} · kept for ${fieldId}`,
    dice: parts.flatMap((p) => p.dice.map((d) => ({ label: d.label, value: d.value, kept: d.kept }))),
  });
  return text;
}

function inspireFor(fieldId, append) {
  if (!Settings.gum()) return null;
  const ids = inspireTables(fieldId);
  let offset = 0;

  const out = el("div");
  const body = el("div", { class: "body" }, out);
  const block = el("details", { class: "explain inspire" },
    el("summary", null, "Stuck? Roll three words"),
    body
  );

  const use = (parts) => append(keepInspiration(parts, fieldId));

  const show = (parts, all) => {
    out.replaceChildren();
    add(out, el("p", { class: "cite", text: parts.map((p) => `${p.table.name} ${p.roll}`).join(" · ") }));
    const words = el("div", { class: "btn-row" });
    for (const p of parts) {
      add(words, el("button", {
        class: "btn small", "aria-label": `Use "${p.answer}"`,
        onclick: () => use([p]),
      }, p.answer));
    }
    add(out, words);
    const tools = el("div", { class: "btn-row" });
    add(tools, el("button", {
      class: "btn small primary", onclick: () => use(parts),
    }, parts.length === INSPIRE_WORDS ? "Use all three" : `Use all ${parts.length}`));
    add(tools, el("button", { class: "btn small", onclick: () => roll() }, "Roll again"));
    // GUM p.3's own method is combination, so the whole mapped set stays one tap
    // away — rendered here rather than in a dialog of its own.
    if (!all && ids.length > INSPIRE_WORDS) {
      add(tools, el("button", {
        class: "btn small ghost", onclick: () => rollAll(),
      }, `All ${ids.length} tables`));
    }
    add(out, tools);
  };

  const roll = () => {
    const picks = pickTables(ids, offset);
    offset = (offset + INSPIRE_WORDS) % ids.length;
    show(picks.map((id) => rollGum({ tableId: id })), false);
  };

  const rollAll = () => show(ids.map((id) => rollGum({ tableId: id })), true);

  // Nothing is rolled until the block is opened: PUM p.10 asks you not to roll
  // when you already know, and an unopened field is a field you may well know.
  block.addEventListener("toggle", () => {
    if (block.open && !out.firstChild) roll();
  });
  return block;
}

registerInspire(inspireFor);
