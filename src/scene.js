// The Scene tab — SUM. The scene arc is the app's lifecycle engine (§3.12):
// open → intervene → close, all player-fired, each with a summary and one-step undo.

import { el, add, announce, fmtTime } from "./core.js";
import { explain, actionBar, resultCard, toast, modal, promptModal, emptyState, noGameNotice } from "./ui.js";
import * as store from "./store.js";
import { rollSum, journalRoll, diceText } from "./roller.js";
import { sumTable } from "./rules.js";
import { sectionNav, render, go } from "./router.js";
import { openRule } from "./screens.js";
import { SUM_TABLES, SUM_SECTIONS, BIAS_NOTE } from "../data-sum.js";
import { registerClearer } from "./viewstate.js";
import { coachStrip } from "./coach.js";

let last = null;      // the last SUM roll, held so re-render never re-rolls it
let bias = "none";    // none | low | high — the Rule of Bias, declared before rolling

const SECTION_TABLES = {
  explore: ["location-features", "core-challenge", "challenge-conditions"],
  battle: ["terrain-features", "enemy-tactics", "enemy-composition"],
  discovery: ["type-of-clue", "revealing-finding", "opposition-activity"],
};

export function renderScene(host, section) {
  const scope = store.currentScope();
  add(host, sectionNav("scene", section, { arc: !!(scope && scope.openScene) }));

  if (!store.activeGame() && section !== "arc") {
    add(host, noGameNotice({
      what: "these SUM tables",
      onPrepare: () => go("more", "home"),
      onWalkthrough: () => go("more", "tutorial"),
    }));
  }

  if (section === "people") return renderPeopleTables(host);
  if (SECTION_TABLES[section]) return renderTableGroup(host, section);
  return renderArc(host, scope);
}

// --- the scene arc ----------------------------------------------------------
function renderArc(host, scope) {
  add(host, el("h1", { text: "Scene arc" }));
  add(host, explain([
    "SUM's three boundary rolls, in play order: an opener when you don't know how to start, an intervention check mid-scene, and a closure to see how the world responds.",
    "None of them fires on its own — you decide when a scene needs one. Each writes a journal entry you can undo in one step.",
  ], "scene-arc", openRule));
  if (store.activeGame()) add(host, coachStrip());

  if (!store.activeGame()) {
    add(host, emptyState("No game yet", "Scenes belong to a plot scope. Prepare a game first.",
      { label: "Prepare a game", onClick: () => go("more", "home") },
      { label: "Read the first-session walkthrough", onClick: () => go("more", "tutorial") }));
    return;
  }

  add(host, biasCard());
  // Only a controller roll belongs on this screen: an enemy-tactics result left
  // over from the Battle tab reads as if this scene had rolled it.
  if (last && last.result.table.section === "controller") add(host, renderLast());

  const open = scope && scope.openScene;

  // 1 — Open
  const c1 = el("div", { class: "card" });
  add(c1, el("div", { class: "card-head" },
    el("h2", { text: "1 · Open the scene" }),
    open ? el("span", { class: "pill on", text: "open" }) : null
  ));
  if (open) {
    add(c1, el("p", null, el("strong", { text: "Opened " + fmtTime(open.openedAt) })));
    if (open.opener) add(c1, el("p", { text: open.opener }));
  } else {
    add(c1, el("p", { class: "muted", text: "Stuck on where to begin, or would rather not decide? Let the opener choose your focus." }));
    add(c1, el("button", {
      class: "btn primary wide",
      onclick: () => fire("scene-opener", (r) => {
        store.openScene(r.answer);
        store.addJournal({ kind: "scene", title: "Scene opened", detail: r.answer, dice: diceOf(r) });
      }),
    }, "Roll a scene opener"));
    add(c1, el("button", {
      class: "btn wide",
      onclick: () => promptModal({
        title: "Open a scene",
        label: "How does it open?",
        multiline: true,
        inspire: "scene-open",
        hint: "You never have to roll. Write it yourself if you already know.",
        onSubmit: (v) => {
          store.openScene(v);
          store.addJournal({ kind: "scene", title: "Scene opened", detail: v });
          render();
        },
      }),
    }, "Open it myself"));
  }
  add(host, c1);

  // 2 — Intervene
  const c2 = el("div", { class: "card" });
  add(c2, el("h2", { text: "2 · Intervention check" }));
  add(c2, el("p", { class: "muted", text: "Roll when the PCs are taking too long, tension is high, danger is near, or silence lingers." }));
  add(c2, el("button", {
    class: "btn primary wide", disabled: !open || undefined,
    onclick: () => fire("intervention", (r) => {
      store.addIntervention(r.answer);
      store.addJournal({ kind: "scene", title: "Intervention check", detail: r.answer, dice: diceOf(r) });
    }),
  }, "Roll an intervention check"));
  if (!open) add(c2, el("p", { class: "cite", text: "Open a scene first — an intervention interrupts something." }));
  if (open && open.interventions.length) {
    for (const iv of open.interventions) {
      add(c2, el("div", { class: "entry" },
        el("div", { class: "entry-ts", text: fmtTime(iv.ts) }),
        el("div", { text: iv.text })
      ));
    }
  }
  add(host, c2);

  // 3 — Close
  const c3 = el("div", { class: "card" });
  add(c3, el("h2", { text: "3 · Close the scene" }));
  add(c3, el("p", { class: "muted", text: "See how the world responds — a consequence, a shift, or a lead into what comes next." }));
  add(c3, el("button", {
    class: "btn primary wide", disabled: !open || undefined,
    onclick: () => closeSceneFlow(open),
  }, "Roll a scene closure"));
  if (!open) add(c3, el("p", { class: "cite", text: "There is no scene open to close." }));
  add(host, c3);

  if (open) {
    const loop = el("div", { class: "card" });
    add(loop, el("div", { class: "card-head" },
      el("h3", { text: "While the scene runs" }),
      el("span", { class: "cite", text: "PUM p.5" })
    ));
    add(loop, el("p", { class: "muted", text: "Roleplay it. Ask when you genuinely do not know. Call a beat when a moment might matter to the bigger picture." }));
    add(loop, el("div", { class: "btn-row" },
      el("button", { class: "btn", onclick: () => go("play", "track") }, "Call a plot beat"),
      el("button", { class: "btn", onclick: () => go("oracles", "yesno") }, "Ask an oracle"),
      el("button", { class: "btn", onclick: () => go("play", "cast") }, "Who is here?")
    ));
    add(host, loop);

    actionBar({
      label: "Intervention check",
      context: `scene open · ${open.interventions.length} check${open.interventions.length === 1 ? "" : "s"}`,
      secondary: { label: "Close", onClick: () => closeSceneFlow(open) },
      onClick: () => fire("intervention", (r) => {
        store.addIntervention(r.answer);
        store.addJournal({ kind: "scene", title: "Intervention check", detail: r.answer, dice: diceOf(r) });
      }),
    });
  } else {
    actionBar({
      label: "Roll a scene opener",
      context: "no scene open",
      onClick: () => fire("scene-opener", (r) => {
        store.openScene(r.answer);
        store.addJournal({ kind: "scene", title: "Scene opened", detail: r.answer, dice: diceOf(r) });
      }),
    });
  }
}

// Boundary events summarise what changed, with one-step undo (§6.4).
function closeSceneFlow(open) {
  const r = rollSum({ tableId: "scene-closure", bias });
  last = { result: r, tableId: "scene-closure" };
  const scene = store.transact("Close the scene", () => closeAndRecord(r));
  const mins = scene ? Math.max(1, Math.round((Date.now() - scene.openedAt) / 60000)) : 0;
  announce("Scene closed: " + r.answer);
  modal({
    title: "Scene closed",
    body: el("div", null,
      el("p", null, el("strong", { text: r.answer })),
      el("div", { class: "card" },
        el("h3", { text: "What changed" }),
        el("ul", null,
          el("li", { text: `The scene ran about ${mins} minute${mins === 1 ? "" : "s"}.` }),
          el("li", { text: `${scene ? scene.interventions.length : 0} intervention check${scene && scene.interventions.length === 1 ? "" : "s"} fired.` }),
          el("li", { text: "Two journal entries were written: the opener and this closure." })
        )
      )
    ),
    actions: [
      { label: "Open the next scene", primary: true, onClick: () => render() },
      { label: "Back to the plot sheet", onClick: () => go("play", "track") },
      // The closure summary says two journal entries were written, and until now
      // it was the one step of the loop with no route to them: the first-run
      // probe had to go via the plot sheet to reach the record it had just made.
      { label: "Write it down", onClick: () => go("journal", "entries") },
      {
        label: "Undo",
        onClick: () => {
          store.undo();   // closing and its journal entry are one transaction
          last = null;
          toast("Scene reopened.");
          render();
        },
      },
    ],
  });
}

// Closing writes the scene away and records it; both belong to one undo.
function closeAndRecord(r) {
  const scene = store.closeScene();
  store.addJournal({ kind: "scene", title: "Scene closed", detail: r.answer, dice: diceOf(r) });
  return scene;
}

function fire(tableId, after) {
  const r = rollSum({ tableId, bias });
  last = { result: r, tableId };
  if (after) after(r);
  announce(r.answer);
  render();
}

function diceOf(r) {
  return r.dice.map((d) => ({ label: d.label, value: d.value, kept: d.kept }));
}

// --- the Rule of Bias — a mechanical modifier here, unlike PUM's ------------
function biasCard() {
  const card = el("div", { class: "card" });
  add(card, el("div", { class: "card-head" },
    el("h3", { text: "Rule of Bias" }),
    el("span", { class: "cite", text: "SUM p.3" })
  ));
  add(card, el("p", { class: "muted", text: BIAS_NOTE }));
  const row = el("div", { class: "btn-row" });
  const opts = [
    ["none", "Neutral — roll once"],
    ["low", "Favourable — keep lowest"],
    ["high", "Trouble — keep highest"],
  ];
  for (const [id, label] of opts) {
    add(row, el("button", {
      class: `btn small ${bias === id ? "primary" : ""}`.trim(),
      "aria-pressed": bias === id ? "true" : "false",
      onclick: () => { bias = id; render(); },
    }, label));
  }
  add(card, row);
  return card;
}

function renderLast() {
  const { result } = last;
  return resultCard({
    kind: `${result.table.name} · d${result.table.die}${result.bias !== "none" ? " · bias " + result.bias : ""}`,
    answer: result.answer,
    second: result.table.lead,
    dice: result.dice,
    actions: [
      {
        label: "Re-roll",
        onClick: () => {
          const r = rollSum({ tableId: last.tableId, bias });
          journalRoll(r, { kind: "sum", title: `${r.table.name} — re-rolled: ${r.answer}`, detail: diceText(r.dice) });
          last = { result: r, tableId: last.tableId };
          render();
        },
      },
      { label: "Dismiss", onClick: () => { last = null; render(); } },
    ],
  });
}

// --- the table groups (exploration, battle, discovery) ---------------------
function renderTableGroup(host, section) {
  const ids = SECTION_TABLES[section];
  const titles = {
    explore: ["Exploration", "For unknown regions and new locations — what the place is, what it asks of you, and what makes it harder."],
    battle: ["Battle", "The battlefield, the enemy's plan, and who exactly is standing there."],
    discovery: ["Discovery", "What is uncovered, how it presents itself, and what the opposition has been doing."],
  };
  add(host, el("h1", { text: titles[section][0] }));
  add(host, explain([
    titles[section][1],
    "Every SUM table is ordered so low rolls favour your protagonists and high rolls bring trouble. Declare your expectation before rolling and the app keeps the right die for you.",
  ], "sum-bias", openRule));
  if (store.activeGame()) add(host, coachStrip());

  add(host, biasCard());
  if (last && ids.includes(last.tableId)) add(host, renderLast());

  for (const id of ids) {
    const t = sumTable(id);
    if (!t) continue;
    const card = el("div", { class: "card" });
    add(card, el("div", { class: "card-head" },
      el("h3", { text: t.name }),
      el("span", { class: "pill", text: `d${t.die}` }),
      el("span", { class: "cite", text: `SUM p.${t.page}` })
    ));
    add(card, el("p", { class: "muted", text: t.blurb }));
    add(card, el("button", {
      class: "btn primary wide",
      onclick: () => {
        const r = rollSum({ tableId: id, bias });
        last = { result: r, tableId: id };
        journalRoll(r, { kind: "sum", title: `${t.name} — ${r.answer}`, detail: diceText(r.dice) });
        announce(r.answer);
        render();
      },
    }, `Roll ${t.name}`));
    add(card, tableDetails(t));
    add(host, card);
  }

  // Every other screen pins its primary action; these three left it inline at
  // 365px. The book presents the section's tables in order, so the first is the
  // one you came for.
  const firstId = ids[0];
  const first = sumTable(firstId);
  if (first) {
    actionBar({
      label: `Roll ${first.name}`,
      context: `d${first.die}${bias !== "none" ? " · bias " + bias : ""}`,
      onClick: () => {
        const r = rollSum({ tableId: firstId, bias });
        last = { result: r, tableId: firstId };
        journalRoll(r, { kind: "sum", title: `${first.name} — ${r.answer}`, detail: diceText(r.dice) });
        announce(r.answer);
        render();
      },
    });
  }
}

function tableDetails(t, hitRoll = null) {
  const d = el("details", { class: "explain" }, el("summary", null, `The whole table (${t.rows.length} rows)`));
  const body = el("div", { class: "body table-scroll" });
  const table = el("table", { class: "rows" });
  for (const [min, max, text] of t.rows) {
    const hit = hitRoll !== null && hitRoll >= min && hitRoll <= max;
    add(table, el("tr", { class: hit ? "hit" : null },
      el("td", { class: "r", text: min === max ? String(min) : `${min}-${max}` }),
      el("td", { text })
    ));
  }
  add(body, table);
  add(d, body);
  return d;
}

// --- the character tables live on the Cast screen, listed here too ---------
function renderPeopleTables(host) {
  add(host, el("h1", { text: "Character emulation" }));
  add(host, explain([
    "SUM reads non-protagonists in four depths of acquaintance. Roll only the depth the scene has actually reached.",
    "To keep a result attached to someone, roll it from their entry in the cast instead — it is stored with them.",
  ], "sum-characters", openRule));
  if (store.activeGame()) add(host, coachStrip());
  add(host, biasCard());
  if (last && ["first-contact", "shallow", "trust", "deep"].includes(last.result.table.section)) {
    add(host, renderLast());
  }

  const bySection = {};
  for (const t of SUM_TABLES) {
    if (!["first-contact", "shallow", "trust", "deep"].includes(t.section)) continue;
    (bySection[t.section] = bySection[t.section] || []).push(t);
  }
  for (const [sec, tables] of Object.entries(bySection)) {
    const section = SUM_SECTIONS.find((s) => s.id === sec);
    const card = el("div", { class: "card" });
    add(card, el("div", { class: "card-head" },
      el("h3", { text: section ? section.name.replace(/^Character: /, "") : sec }),
      el("span", { class: "cite", text: `SUM p.${tables[0].page}` })
    ));
    const grid = el("div", { class: "btn-grid" });
    for (const t of tables) {
      add(grid, el("button", {
        class: "btn",
        onclick: () => {
          const r = rollSum({ tableId: t.id, bias });
          last = { result: r, tableId: t.id };
          journalRoll(r, { kind: "sum", title: `${t.name} — ${r.answer}`, detail: diceText(r.dice) });
          announce(r.answer);
          render();
        },
      }, t.name));
    }
    add(card, grid);
    add(host, card);
  }
  add(host, el("button", {
    class: "btn wide", onclick: () => go("play", "cast"),
  }, "Go to the cast →"));

  // The four depths are in the book's own order and the first is where a scene
  // that has just met someone begins. Every other rolling screen pins its
  // primary; this one left it inline, 521px down once the notes opened.
  const firstMeet = sumTable("meet-reaction");
  if (firstMeet) {
    actionBar({
      label: `Roll ${firstMeet.name}`,
      context: `d${firstMeet.die} · first contact${bias !== "none" ? " · bias " + bias : ""}`,
      onClick: () => {
        const r = rollSum({ tableId: "meet-reaction", bias });
        last = { result: r, tableId: "meet-reaction" };
        journalRoll(r, { kind: "sum", title: `${firstMeet.name} — ${r.answer}`, detail: diceText(r.dice) });
        announce(r.answer);
        render();
      },
    });
  }
}

export function currentBias() { return bias; }
function resetSceneState() { last = null; bias = "none"; }
registerClearer(resetSceneState);
