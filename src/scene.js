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
import { SCENE_PLAY_STEPS } from "../data-guidance.js";
import { registerClearer } from "./viewstate.js";
import { coachStrip, whichMachine, bookTag, nextMove } from "./coach.js";

let last = null;      // the last SUM roll, held so re-render never re-rolls it
let bias = "none";    // none | low | high — the Rule of Bias, declared before rolling

const SECTION_TABLES = {
  explore: ["location-features", "core-challenge", "challenge-conditions"],
  battle: ["terrain-features", "enemy-tactics", "enemy-composition"],
  discovery: ["type-of-clue", "revealing-finding", "opposition-activity"],
};

// The Scene tab has two screens: the scene you are in, and the SUM tables you
// roll inside it. The situation tables used to be four screens of their own
// (exploration, battle, discovery, characters), each repeating the same note,
// coach and bias card above three buttons; they are one list now, picked by
// the situation the scene is in. The tables, the dice and the Rule of Bias are
// unchanged — this is where they sit, not what they do.
const SITUATIONS = [
  ["explore", "Exploring"],
  ["battle", "Fighting"],
  ["discovery", "Discovering"],
  ["people", "Meeting someone"],
];
const PEOPLE = ["first-contact", "shallow", "trust", "deep"];
let situation = "explore";

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

  if (section === "sum") return renderTables(host);
  return renderArc(host, scope);
}

// --- this scene --------------------------------------------------------------
function renderArc(host, scope) {
  add(host, el("h1", { text: "This scene" }));
  add(host, bookTag("scene"));
  add(host, explain([
    "SUM's three boundary rolls, in play order: an opener when you don't know how to start, an intervention check mid-scene, and a closure to see how the world responds.",
    "None of them fires on its own — you decide when a scene needs one. Each writes a journal entry you can undo in one step.",
    BIAS_NOTE,
  ], "scene-arc", openRule));
  add(host, whichMachine("scene"));
  if (store.activeGame()) add(host, coachStrip({ onScene: true }));

  if (!store.activeGame()) {
    add(host, emptyState("No game yet", "Scenes belong to a plot scope. Prepare a game first.",
      { label: "Prepare a game", onClick: () => go("more", "home") },
      { label: "Read the first-session walkthrough", onClick: () => go("more", "tutorial") }));
    return;
  }

  const open = scope && scope.openScene;
  const checks = open ? open.interventions.length : 0;

  // The arc as a stepper: where this scene is between open and close.
  const steps = el("ol", { class: "arc-path", "aria-label": "Scene arc" });
  [["Open", !!open], ["Intervene", checks > 0], ["Close", false]].forEach(([name, done], i) => {
    const here = open ? (checks ? i === 1 : i === 0) : i === 0;
    add(steps, el("li", { class: `${done ? "done" : ""}${here ? " here" : ""}`.trim() || null,
      "aria-current": here ? "step" : null, text: name }));
  });
  add(host, steps);

  // One card that is the scene: what opened it, what has interrupted it, and
  // the next roll it can take. Anchored so the coach's "Open a scene" can
  // scroll here rather than navigating to the screen its own strip is on.
  const card = el("div", { class: "card scene-card" });
  card.id = "scene-controls";
  if (open) {
    add(card, el("div", { class: "card-head" },
      el("h2", { text: "The scene" }),
      el("span", { class: "pill on", text: "open" })
    ));
    add(card, el("p", { class: "cite", text: "Opened " + fmtTime(open.openedAt) }));
    if (open.opener) add(card, el("p", { class: "scene-opener", text: open.opener }));
    if (checks) {
      add(card, el("h3", { text: `Interventions (${checks})` }));
      for (const iv of open.interventions) {
        add(card, el("div", { class: "entry" },
          el("div", { class: "entry-ts", text: fmtTime(iv.ts) }),
          el("div", { text: iv.text })
        ));
      }
    }
    if (last && last.result.table.section === "controller") add(card, renderLast());
    // While the scene runs: the moves in the order a player reaches for them,
    // each saying when, with its button beside it. Before this the card
    // offered two rolls and a row of links, and nothing said that most of a
    // scene is narrating with no roll at all.
    add(card, el("h3", { text: "While you play" }));
    const moves = {
      oracle: ["Ask an oracle", () => go("oracles", "yesno")],
      beat: ["Call a plot beat", () => go("play", "track")],
      table: ["Roll a SUM table", () => go("scene", "sum")],
      intervene: ["Roll an intervention check", intervene],
      close: ["Roll a scene closure", () => closeSceneFlow(open)],
    };
    // The first move needs no button; the rest are tiles — the moment it is
    // for, then the move — so a long label wraps inside its tile instead of
    // squeezing a button beside a sentence.
    const ol = el("ol", { class: "play-steps" });
    for (const st of SCENE_PLAY_STEPS) {
      const m = st.move && moves[st.move];
      if (!m) { add(ol, el("li", { class: "lead" }, el("span", { text: st.when }))); continue; }
      add(ol, el("li", { class: "tile", "data-move": st.move },
        el("button", { class: "play-tile", onclick: m[1] },
          el("span", { class: "when", text: st.when }),
          el("strong", { text: m[0] }))));
    }
    add(card, ol);
    add(card, biasRow());
    add(card, el("p", { class: "cite", text: "The Rule of Bias applies to the intervention and the closure." }));
  } else {
    add(card, el("div", { class: "card-head" }, el("h2", { text: "No scene open" })));
    if (last && last.result.table.section === "controller") add(card, renderLast());
    add(card, el("p", { class: "muted", text: "Stuck on where to begin, or would rather not decide? Let the opener choose your focus — or write it yourself." }));
    add(card, biasRow());
    add(card, el("div", { class: "btn-row" },
      el("button", { class: "btn primary", onclick: openByRoll }, "Roll a scene opener"),
      el("button", {
        class: "btn",
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
      }, "Open it myself")
    ));
  }
  add(host, card);

  if (open) {
    // The pinned call follows the coach (PUM p.10: one beat per scene is the
    // way in): until this scene has had its beat, that beat; once it has,
    // closing the scene. An intervention pinned here instead was a button a
    // newcomer could press forever without the scene going anywhere.
    const move = nextMove();
    if (move && move.stage === "scene-beat") {
      actionBar({
        label: "Call this scene's beat", context: "narrate first",
        secondary: { label: "Close", onClick: () => closeSceneFlow(open) },
        onClick: () => go("play", "track"),
      });
    } else if (move && move.stage === "beat-open") {
      actionBar({ label: "Go to the beat", context: "a beat is waiting", onClick: () => go("play", "track") });
    } else {
      actionBar({
        label: "Close the scene",
        context: `${checks} intervention${checks === 1 ? "" : "s"}`,
        secondary: { label: "Intervention", onClick: intervene },
        onClick: () => closeSceneFlow(open),
      });
    }
  } else {
    actionBar({ label: "Roll a scene opener", context: "no scene open", onClick: openByRoll });
  }
}

function openByRoll() {
  fire("scene-opener", (r) => {
    store.openScene(r.answer);
    store.addJournal({ kind: "scene", title: "Scene opened", detail: r.answer, dice: diceOf(r) });
  });
}

function intervene() {
  fire("intervention", (r) => {
    store.addIntervention(r.answer);
    store.addJournal({ kind: "scene", title: "Intervention check", detail: r.answer, dice: diceOf(r) });
  });
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
// One row above the roll it modifies. The paragraph explaining it lives in the
// screen's note; the line under the row says what the chosen option does.
const BIAS = [
  ["none", "Neutral", "Rolls once."],
  ["low", "Favourable", "Rolls twice, keeps the lower — low favours your protagonists."],
  ["high", "Trouble", "Rolls twice, keeps the higher — high brings trouble."],
];
function biasRow() {
  const wrap = el("div", { class: "bias-row" });
  add(wrap, el("div", { class: "bias-head" },
    el("span", { class: "label", text: "Rule of Bias" }),
    el("span", { class: "cite", text: "SUM p.3" })
  ));
  const row = el("div", { class: "btn-row seg seg-inline", role: "group", "aria-label": "Rule of Bias" });
  for (const [id, label] of BIAS) {
    add(row, el("button", {
      class: "btn small",
      "aria-pressed": bias === id ? "true" : "false",
      onclick: () => { bias = id; render(); },
    }, label));
  }
  add(wrap, row);
  add(wrap, el("p", { class: "cite", text: BIAS.find(([id]) => id === bias)[2] }));
  return wrap;
}

function renderLast() {
  const { result } = last;
  return resultCard({
    variant: "slip",
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

// --- the SUM tables, by situation -------------------------------------------
function renderTables(host) {
  add(host, el("h1", { "data-situation": situation, text: "Roll a table" }));
  add(host, bookTag("scene"));
  add(host, explain([
    "SUM's tables for what happens inside a scene. Pick the situation the scene is in; its tables are listed in the book's order.",
    "Every SUM table is ordered so low rolls favour your protagonists and high rolls bring trouble. Declare your expectation before rolling and the app keeps the right die for you.",
    "Meeting someone reads a character in four depths of acquaintance — roll only the depth the scene has reached. To keep a result attached to someone, roll it from their entry in the cast instead.",
  ], "sum-bias", openRule));
  add(host, whichMachine("scene"));

  const chips = el("div", { class: "btn-row seg-grid sit-row", role: "group", "aria-label": "Situation" });
  for (const [id, label] of SITUATIONS) {
    add(chips, el("button", {
      class: "btn small",
      "aria-pressed": situation === id ? "true" : "false",
      onclick: () => { situation = id; render(); },
    }, label));
  }
  add(host, chips);

  const card = el("div", { class: "card sum-list" });
  add(card, biasRow());
  const groups = situation === "people"
    ? PEOPLE.map((sec) => [SUM_SECTIONS.find((s) => s.id === sec), SUM_TABLES.filter((t) => t.section === sec)])
    : [[null, SECTION_TABLES[situation].map((id) => sumTable(id)).filter(Boolean)]];
  for (const [section, tables] of groups) {
    if (!section) { for (const t of tables) add(card, tableRow(t)); continue; }
    // Four depths of acquaintance, and a scene is at one of them: each depth
    // folds, the first open, and a depth holding the last roll opens with it.
    const holds = last && tables.some((t) => t.id === last.tableId);
    const fold = el("details", { class: "acc sum-depth", open: (section.id === PEOPLE[0] || holds) || undefined },
      el("summary", null, section.name.replace(/^Character: /, ""),
        el("span", { class: "cite", text: `SUM p.${section.page}` })));
    for (const t of tables) add(fold, tableRow(t));
    add(card, fold);
  }
  add(host, card);

  if (situation === "people") {
    add(host, el("button", { class: "btn wide", onclick: () => go("play", "cast") }, "Go to the cast →"));
  }

  // The book presents each situation's tables in order, so the first is the
  // one the bar pins.
  const first = groups[0][1][0];
  if (first) {
    actionBar({
      label: `Roll ${first.name}`,
      context: `d${first.die}${bias !== "none" ? " · bias " + bias : ""}`,
      onClick: () => rollTable(first),
    });
  }
}

function rollTable(t) {
  const r = rollSum({ tableId: t.id, bias });
  last = { result: r, tableId: t.id };
  journalRoll(r, { kind: "sum", title: `${t.name} — ${r.answer}`, detail: diceText(r.dice) });
  announce(r.answer);
  render();
}

// One table as one row: its name and what it is for, its die, and Roll. The
// result lands under the row that rolled it.
function tableRow(t) {
  const row = el("div", { class: "sum-row" });
  add(row, el("div", { class: "sum-row-head" },
    el("div", { class: "sum-row-text" },
      el("strong", { text: t.name }),
      el("span", { class: "muted", text: t.blurb })
    ),
    el("span", { class: "pill", text: `d${t.die}` }),
    el("button", { class: "btn small", "aria-label": `Roll ${t.name}`, onclick: () => rollTable(t) }, "Roll")
  ));
  if (last && last.tableId === t.id) add(row, renderLast());
  add(row, tableDetails(t));
  return row;
}

function tableDetails(t, hitRoll = null) {
  const d = el("details", { class: "rows-fold" }, el("summary", null, `The whole table (${t.rows.length} rows)`));
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

export function currentBias() { return bias; }
function resetSceneState() { last = null; bias = "none"; situation = "explore"; }
registerClearer(resetSceneState);
