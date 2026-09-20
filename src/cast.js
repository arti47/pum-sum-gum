// The cast: protagonists, and the characters and locations the story has met.
// SUM's character emulation rolls attach to a person and stay with them.

import { el, add, announce } from "./core.js";
import { explain, modal, closeModal, promptModal, confirmModal, toast, inspireBlock } from "./ui.js";
import * as store from "./store.js";
import { filePreview, chooseFile } from "./files.js";
import { rollSum, journalRoll, diceText } from "./roller.js";
import { sumTable, plotSheet } from "./rules.js";
import { render, go } from "./router.js";
import { openRule } from "./screens.js";
import { currentBias } from "./scene.js";
import { CHARACTER_TABLE_IDS } from "../data-sum.js";
import { NODE_CATEGORIES } from "../data-pum-plot.js";
import { categoryName, nodeSlots, expandedSheetSentence } from "./derived.js";

export function renderCast(host) {
  const game = store.activeGame();
  add(host, el("h1", { text: "Cast" }));
  add(host, explain([
    "Your protagonists, plus everyone and everywhere the story has actually met.",
    "Roll SUM's character tables from a person's entry and the result is stored with them, so next time you know how they talk and what they want.",
    "Keeping someone here does not put them in the story's reach: a random prompt can only land on a plot node, so use \u201cAdd to plot nodes\u201d for anyone the plot should be able to bring back on its own.",
  ], "nodes", openRule));

  // Protagonists
  const pcs = el("div", { class: "card" });
  add(pcs, el("div", { class: "card-head" },
    el("h2", { text: "Protagonists" }),
    el("span", { class: "cite", text: "your eyes and ears" })
  ));
  if (!game.protagonists.length) {
    add(pcs, el("p", { class: "muted", text: "No protagonists yet. You are in full control of their thoughts, voice and actions." }));
  }
  for (const p of game.protagonists) {
    add(pcs, el("div", { class: "entry" },
      el("div", { class: "entry-head" },
        el("span", { class: "entry-title", text: p.name }),
        el("button", {
          class: "btn small ghost", style: "margin-left:auto",
          onclick: () => editProtagonist(p),
        }, "Edit")
      ),
      p.notes ? el("div", { class: "entry-detail", text: p.notes }) : null,
      sheetRow(p)
    ));
  }
  add(pcs, el("button", {
    class: "btn wide",
    onclick: () => promptModal({
      // no-inspire: GUM has no name generator; the concept belongs in the notes.
      title: "Add a protagonist", label: "Name",
      hint: "A character you play. They are your eyes and ears in this world, and you control their thoughts, voice and actions — the machine never rolls for them (PUM p.3).",
      notes: {
        label: "A line about them (optional)",
        placeholder: "What marks them out?",
        inspire: "protagonist-notes",
      },
      onSubmit: (v, notes) => { if (v) { store.addProtagonist(v, notes); render(); } },
    }),
  }, "Add a protagonist"));
  add(host, pcs);

  // Characters & locations
  for (const kind of ["character", "location"]) {
    const list = game.cast.filter((c) => c.kind === kind);
    const card = el("div", { class: "card" });
    add(card, el("div", { class: "card-head" },
      el("h2", { text: kind === "character" ? "Notable characters" : "Interesting locations" }),
      el("span", { class: "cite", text: `${list.length}` })
    ));
    if (!list.length) {
      add(card, el("p", { class: "muted", text: kind === "character"
        ? "Nobody yet. When a prompt brings someone into the story, keep them here."
        : "Nowhere yet. When a prompt leads somewhere, keep it here." }));
    }
    for (const c of list) {
      add(card, castEntry(c));
    }
    add(card, el("div", { class: "btn-row" },
      el("button", {
        class: "btn",
        onclick: () => promptModal({
          // no-inspire: a name is the player's; the rolled concept sits beside it.
          title: kind === "character" ? "Add a character" : "Add a location",
          label: "Name",
          hint: kind === "character"
            ? "Someone the story has met or mentioned. Keeping them here means a prompt can bring them back later, and SUM can tell you how they behave."
            : "Somewhere the story has reached or referred to. Keeping it here means a prompt can lead back to it later.",
          notes: {
            label: kind === "character" ? "What GUM says about them" : "What GUM says about it",
            placeholder: kind === "character" ? "Archetype, edge, flaw…" : "Feature, purpose, worth…",
            inspire: kind === "character" ? "cast-character" : "cast-location",
          },
          onSubmit: (v, notes) => { if (v) { store.addCast(kind, v, notes); render(); } },
        }),
      }, kind === "character" ? "Add a character" : "Add a location")
    ));
    add(host, card);
  }
}

function castEntry(c) {
  const wrap = el("div", { class: "entry" });
  add(wrap, el("div", { class: "entry-head" },
    el("span", { class: "entry-title", text: c.name }),
    el("button", {
      class: "btn small ghost", style: "margin-left:auto",
      onclick: () => openCast(c),
    }, "Open")
  ));
  const game = store.activeGame();
  const portrait = c.portraitId && game && game.files.find((f) => f.id === c.portraitId);
  if (portrait) add(wrap, filePreview(portrait, { max: "8rem" }));
  if (c.notes) add(wrap, el("div", { class: "entry-detail", text: c.notes }));
  if (c.traits.length) {
    const ul = el("ul", { style: "margin:.3rem 0 0;padding-left:1.1rem" });
    for (const t of c.traits) {
      add(ul, el("li", { class: "entry-detail" },
        el("span", { class: "cite", text: t.label + ": " }), t.text
      ));
    }
    add(wrap, ul);
  }
  return wrap;
}

// The character sheet from the player's own RPG. PUM models no stats (§1.0), so
// this app files the PDF and hands it back; it does not read it, and nothing in
// the app depends on what is inside it.
function sheetRow(p) {
  const game = store.activeGame();
  const sheet = p.sheetId && game && game.files.find((f) => f.id === p.sheetId);
  const row = el("div", { class: "btn-row", style: "margin-top:.3rem;align-items:center" });
  if (sheet) add(row, el("span", { class: "cite", text: `Sheet: ${sheet.name}` }));
  add(row, el("button", {
    class: "btn small ghost",
    onclick: () => chooseFile({
      title: "Character sheet",
      current: p.sheetId,
      onPick: (f) => store.setProtagonistSheet(p.id, f.id),
      onClear: () => store.setProtagonistSheet(p.id, null),
    }),
  }, "Character sheet"));
  return row;
}

function editProtagonist(p) {
  const name = el("input", { type: "text", value: p.name });
  const notes = el("textarea", null);
  notes.value = p.notes || "";
  modal({
    title: "Protagonist",
    body: el("div", null,
      el("p", { class: "muted", text: "One of the characters you play. Notes are for you — what they want, how they sound, what they are carrying." }),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Name" }), name),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Notes" }), notes),
      inspireBlock("protagonist-notes", notes)
    ),
    actions: [
      {
        label: "Save", primary: true,
        onClick: () => {
          store.updateProtagonist(p.id, { name: name.value.trim() || p.name, notes: notes.value });
          render();
        },
      },
      {
        label: "Remove", danger: true,
        onClick: () => {
          closeModal();
          confirmModal({
            title: "Remove this protagonist?",
            message: `${p.name} and their notes are deleted. This can be undone once from Settings.`,
            confirmLabel: "Remove", danger: true,
            onConfirm: () => { store.removeProtagonist(p.id); render(); },
          });
          return true;
        },
      },
      { label: "Cancel" },
    ],
  });
}

function openCast(c) {
  const body = el("div");
  add(body, el("p", { class: "muted", text: c.kind === "character"
    ? "Everything this game knows about them. Ask SUM below and the answer is stored here, so next time you know how they talk and what they want."
    : "Everything this game knows about this place. Notes stay with it, so a prompt that leads back here has something to lead back to." }));
  const notes = el("textarea", { placeholder: "What do you know about them?" });
  notes.value = c.notes || "";
  add(body, el("label", { class: "field" }, el("span", { class: "lbl", text: "Notes" }), notes));
  add(body, inspireBlock("cast-notes", notes));

  if (c.traits.length) {
    const list = el("div", { class: "card" });
    add(list, el("h3", { text: "What SUM has told you" }));
    c.traits.forEach((t, i) => {
      add(list, el("div", { class: "entry" },
        el("div", { class: "entry-head" },
          el("span", { class: "entry-kind", text: t.label }),
          el("span", { class: "entry-ts", text: `rolled ${t.roll}` })
        ),
        el("div", { text: t.text }),
        el("button", {
          class: "btn small ghost",
          onclick: () => { store.removeCastTrait(c.id, i); closeModal(); openCast(store.activeGame().cast.find((x) => x.id === c.id)); },
        }, "Remove")
      ));
    });
    add(body, list);
  }

  if (c.kind === "character") {
    const roll = el("div", { class: "card" });
    add(roll, el("h3", { text: "Ask SUM about them" }));
    add(roll, el("p", { class: "muted", text: "Only roll the depth this scene has actually reached. Bias comes from the Scene tab." }));
    const grid = el("div", { class: "btn-grid" });
    for (const id of CHARACTER_TABLE_IDS) {
      const t = sumTable(id);
      if (!t) continue;
      add(grid, el("button", {
        class: "btn small",
        onclick: () => {
          const r = rollSum({ tableId: id, bias: currentBias() });
          store.addCastTrait(c.id, { table: id, label: t.name, text: r.answer, roll: r.kept });
          journalRoll(r, {
            kind: "sum", title: `${c.name} — ${t.name}: ${r.answer}`, detail: diceText(r.dice),
          });
          announce(`${t.name}: ${r.answer}`);
          closeModal();
          const fresh = store.activeGame().cast.find((x) => x.id === c.id);
          openCast(fresh);
          render();
        },
      }, t.name));
    }
    add(roll, grid);
    add(body, roll);
  }

  modal({
    title: c.name,
    body,
    actions: [
      {
        label: "Save", primary: true,
        onClick: () => { store.updateCast(c.id, { notes: notes.value }); render(); },
      },
      {
        label: "Rename",
        onClick: () => {
          closeModal();
          promptModal({
            // no-inspire: renaming something that exists is a correction.
            title: "Rename", label: "Name", value: c.name,
            onSubmit: (v) => { if (v) { store.updateCast(c.id, { name: v }); render(); } },
          });
          return true;
        },
      },
      {
        // A face for someone the story keeps meeting. Stored like any other
        // file, so removing it from the shelf removes it from here too.
        label: "Portrait",
        onClick: () => {
          chooseFile({
            title: "Portrait",
            form: "image",
            current: c.portraitId,
            onPick: (f) => store.setCastPortrait(c.id, f.id),
            onClear: () => store.setCastPortrait(c.id, null),
          });
          return true;
        },
      },
      {
        label: "Add to plot nodes",
        onClick: () => {
          closeModal();
          addToNodes(c);
          return true;
        },
      },
      {
        label: "Remove", danger: true,
        onClick: () => {
          closeModal();
          confirmModal({
            title: `Remove ${c.name}?`,
            message: `Their notes and ${c.traits.length} rolled trait${c.traits.length === 1 ? "" : "s"} are deleted. This can be undone once from Settings.`,
            confirmLabel: "Remove", danger: true,
            onConfirm: () => { store.removeCast(c.id); render(); },
          });
          return true;
        },
      },
    ],
  });
}

// A cast member is only reachable by a random prompt once they are a plot node.
function addToNodes(c) {
  const scope = store.currentScope();
  const catId = c.kind === "character" ? "characters" : "locations";
  const cat = NODE_CATEGORIES.find((x) => x.id === catId);
  // The list's length is the sheet's, never a number chosen here (§10.2).
  const slots = scope ? nodeSlots(scope, catId) : 0;

  if (!slots) {
    const sheet = scope ? plotSheet(scope.sheetId) : null;
    modal({
      title: "Add to plot nodes",
      body: el("div", null,
        el("p", { text: `${sheet ? sheet.name : "This plot sheet"} prints no ${cat.name.toLowerCase()} list, so there is no slot to write ${c.name} into.` }),
        el("p", { class: "muted", text: `They stay in the cast either way — a prompt that reaches for a character will offer to recall them. The ${expandedSheetSentence()} sheets pair with the extension sheet that carries these lists.` })
      ),
      actions: [
        { label: "Back to the cast", primary: true, onClick: () => go("play", "cast") },
        { label: "Close" },
      ],
    });
    return;
  }

  modal({
    title: "Add to plot nodes",
    body: el("div", null,
      el("p", null, `Write `, el("strong", { text: c.name }), ` into `, el("strong", { text: categoryName(scope, catId) }), `.`),
      el("p", { class: "muted", text: "Until a name sits in a plot node list, a random prompt can never reach them." })
    ),
    actions: [
      {
        label: "Write it in", primary: true,
        onClick: () => {
          const at = store.writeNodeToFirstEmpty(catId, c.name, slots);
          if (at < 0) toast(`${categoryName(scope, catId)} is full — clear a slot first.`);
          else { toast(`Added to ${categoryName(scope, catId)}.`, { undo: true }); go("play", "nodes"); }
        },
      },
      { label: "Cancel" },
    ],
  });
}
