// The More tab: home, the rules library, the tutorial, and settings.

import { el, add, fmtTime, APP_VERSION } from "./core.js";
import { explain, modal, confirmModal, toast, emptyState, inlineRow, defRow, actionBar,
  inspireBlock } from "./ui.js";
import * as store from "./store.js";
import { Settings, applyTheme, cycleTheme } from "./settings.js";
import { plotSheet } from "./rules.js";
import {
  scopeSummary, crossed, trackLength, hasTrack, isResolved, nodeList, currentSection,
} from "./derived.js";
import { sectionNav, go, render } from "./router.js";
import { startWizard, inWizard, renderWizard, addScopeDialog } from "./wizard.js";
import { renderTutorial } from "./tutorial.js";
import { renderForge } from "./forge.js";
import { RULES_LIBRARY, GLOSSARY } from "../data-rules-library.js";
import { PLAY_STATES, FLOWCHART, ADVICE, ADVANCED, MACHINES, NEW_TO_SOLO } from "../data-guidance.js";
import { PUM_ERRATA, NODE_CATEGORIES } from "../data-pum-plot.js";
import { GUM_ERRATA, INSPIRE_ABSENT } from "../data-gum.js";

let ruleSearch = "";
let pendingRuleId = null;
let pendingTermId = null;

export function renderMore(host, section) {
  // The wizard lives on Home. It must not hijack the other More routes, or the
  // section nav reads as broken while a game is being prepared (§6.3.9).
  if (inWizard() && section === "home") return renderWizard(host);
  add(host, sectionNav("more", section));
  if (inWizard()) {
    add(host, el("div", { class: "card" },
      el("h3", { text: "A game is half-prepared" }),
      el("p", { class: "muted", text: "Your draft is still here — nothing is lost." }),
      el("button", { class: "btn primary wide", onclick: () => go("more", "home") },
        "Back to preparing it")
    ));
  }
  if (section === "forge") return renderForge(host);
  if (section === "library") return renderLibrary(host);
  if (section === "tutorial") return renderTutorial(host);
  if (section === "settings") return renderSettings(host);
  return renderHome(host);
}

// Open a rules-library entry, expanded and scrolled to (§6.6 layer 2).
export function openRule(id) {
  pendingRuleId = id;
  go("more", "library");
}

// Open one glossary entry, the same way. This is what every chip under every
// "what this does" note taps into (§6.6 layer 0).
export function openTerm(id) {
  pendingTermId = id;
  go("more", "library");
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
function renderHome(host) {
  const game = store.activeGame();
  add(host, el("h1", { text: "Unfolding Machines" }));
  add(host, el("p", { class: "lede", text: "A play aid for the Plot Unfolding Machine v9 and the Scene Unfolding Machine v8." }));

  if (!game) {
    add(host, explain([
      "Two machines in one app. PUM manages your plot: what happens next, and how close this thread is to resolving. SUM fills in the scene PUM opened, and the people in it.",
      "Neither book resolves tasks — bring your own RPG for that, or narrate the outcome yourself.",
    ]));
    // Above the fold, and not behind a fold: measured on the first run, a
    // stranger met five book terms before anything said they were the one who
    // had to talk. This is the app's shortest possible answer to "what is a
    // solo RPG", and it is only ever shown before the first game exists.
    add(host, newToSoloCard());
    add(host, emptyState(
      "No game yet",
      "PUM starts with a little preparation: a universe, a plot scope, your protagonists, and a plot sheet.",
      { label: "Prepare a game", onClick: () => startWizard() }
    ));
    add(host, el("button", {
      class: "btn wide", onclick: () => go("more", "tutorial"),
    }, "Read the first-session walkthrough"));
    add(host, machinesCard());
    // Every other screen pins its primary action; the very first screen a new
    // player sees was the one that did not.
    actionBar({
      label: "Prepare a game",
      context: "four steps, then play",
      secondary: { label: "Walkthrough", onClick: () => go("more", "tutorial") },
      onClick: () => startWizard(),
    });
    return;
  }

  const scope = store.currentScope();
  add(host, explain([
    "Everything about this game in one place: which plot sheet is live, how far its track has run, and whether a scene is open.",
    "A longer game is several plot sheets, one per plot scope. Finished ones stay here as a record.",
  ]));

  // The named next step (§6.3.7): the book's own prep list, until it is done.
  const todo = [];
  if (!scope.startingPoint) todo.push({ text: "Decide the starting point and what is introduced there", to: () => go("play", "track") });
  if (!game.protagonists.length) todo.push({ text: "Create your protagonists", to: () => go("play", "cast") });
  const sheet = plotSheet(scope.sheetId);
  // Count only the lists this sheet actually prints: a legacy save can carry
  // entries in a list the current sheet hides, and those are not prep done.
  const writtenNodes = NODE_CATEGORIES.some((c) =>
    nodeList(scope, c.id).some((s) => s && s.trim()));
  if (sheet && sheet.nodeSlots && !writtenNodes) {
    todo.push({ text: "Write some plot nodes for this scope", to: () => go("play", "nodes") });
  }
  if (todo.length) {
    const card = el("div", { class: "card" });
    add(card, el("h2", { text: "Before you play" }));
    for (const t of todo) {
      add(card, el("button", { class: "btn wide", onclick: t.to }, t.text));
    }
    add(host, card);
  }

  const cur = el("div", { class: "card" });
  add(cur, el("div", { class: "card-head" },
    el("h2", { text: game.title }),
    el("span", { class: "cite", text: game.universe || "" })
  ));
  add(cur, inlineRow("Plot sheet", sheet ? sheet.name : "—"));
  add(cur, inlineRow("Scope", scope.name));
  // Long values stack; short values sit inline (§6.5).
  if (scope.mission) add(cur, defRow("Mission", scope.mission));
  if (scope.startingPoint) add(cur, defRow("Starting point", scope.startingPoint));
  if (hasTrack(scope)) {
    add(cur, inlineRow("Track", `${crossed(scope)}/${trackLength(scope)}${currentSection(scope) ? " · " + currentSection(scope).name : ""}`));
  }
  add(cur, inlineRow("Scene", scope.openScene ? "open" : "none open"));
  add(cur, inlineRow("Journal", `${game.journal.length} entries`));
  add(cur, el("div", { class: "btn-row", style: "margin-top:.5rem" },
    el("button", { class: "btn primary", onclick: () => go("play", "track") }, "Go to the plot sheet"),
    el("button", { class: "btn", onclick: () => go("scene", "arc") }, scope.openScene ? "Continue the scene" : "Open a scene"),
    el("button", { class: "btn small ghost", onclick: () => editGame(game) }, "Edit")
  ));
  add(host, cur);

  // The scopes of this game
  const scopes = el("div", { class: "card" });
  add(scopes, el("div", { class: "card-head" },
    el("h3", { text: "Plot sheets in this game" }),
    el("span", { class: "cite", text: String(game.scopes.length) })
  ));
  for (const s of game.scopes) {
    const active = s.id === game.activeScopeId;
    add(scopes, el("div", { class: "entry" },
      el("div", { class: "entry-head" },
        el("span", { class: "entry-title", text: s.name }),
        active ? el("span", { class: "pill on", text: "active" }) : null,
        el("span", { class: "entry-ts", text: scopeSummary(s) })
      ),
      el("div", { class: "btn-row", style: "margin-top:.3rem" },
        active ? null : el("button", {
          class: "btn small",
          onclick: () => { store.setActiveScope(s.id); go("play", "track"); },
        }, "Switch to this"),
        el("button", {
          class: "btn small ghost",
          onclick: () => editScope(s),
        }, "Edit"),
        game.scopes.length > 1 ? el("button", {
          class: "btn small ghost",
          onclick: () => confirmModal({
            title: `Delete "${s.name}"?`,
            message: "Its track, plot nodes and open scene are deleted. Journal entries stay. This can be undone once from Settings.",
            confirmLabel: "Delete", danger: true,
            onConfirm: () => { store.deleteScope(s.id); render(); },
          }),
        }, "Delete") : null
      )
    ));
  }
  add(scopes, el("button", { class: "btn wide", onclick: () => addScopeDialog() }, "New plot sheet"));
  add(host, scopes);

  add(host, gamesCard(game));
  add(host, machinesCard());

  actionBar({
    label: "Go to the plot sheet",
    context: hasTrack(scope)
      ? `${scope.name} · ${crossed(scope)}/${trackLength(scope)}`
      : scope.name,
    secondary: {
      label: scope.openScene ? "Scene" : "Open scene",
      onClick: () => go("scene", "arc"),
    },
    onClick: () => go("play", "track"),
  });
}

function editGame(game) {
  const title = el("input", { type: "text", value: game.title });
  const universe = el("input", { type: "text", value: game.universe });
  const tone = el("input", { type: "text", value: game.tone });
  const inspiration = el("textarea", null);
  inspiration.value = game.inspiration || "";
  modal({
    title: "This game",
    body: el("div", null,
      el("p", { class: "muted", text: "The world you are playing in, and what you are drawing on. None of it is locked — a game's tone can change once you have played a scene in it." }),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Name this game" }), title),
      inspireBlock("game-title", title),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Universe or RPG" }), universe),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "World, tone and theme" }), tone),
      inspireBlock("game-tone", tone),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Inspiration" }), inspiration),
      inspireBlock("game-inspiration", inspiration)
    ),
    actions: [
      {
        label: "Save", primary: true,
        onClick: () => {
          store.updateGame({
            title: title.value.trim() || game.title,
            universe: universe.value.trim(),
            tone: tone.value.trim(),
            inspiration: inspiration.value,
          });
          render();
        },
      },
      { label: "Cancel" },
    ],
  });
}

function editScope(s) {
  const name = el("input", { type: "text", value: s.name });
  const mission = el("textarea", null);
  mission.value = s.mission || "";
  const start = el("textarea", null);
  start.value = s.startingPoint || "";
  modal({
    title: "Plot sheet",
    body: el("div", null,
      el("p", { class: "muted", text: "One thread of the story: the goal this sheet is about, how it began, and what you are trying to find out. A game can hold several, one after another." }),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Scope name" }), name),
      inspireBlock("scope-name", name),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Mission" }), mission),
      inspireBlock("scope-mission", mission),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Starting point" }), start),
      inspireBlock("scope-start", start)
    ),
    actions: [
      {
        label: "Save", primary: true,
        onClick: () => {
          const was = store.activeGame().activeScopeId;
          store.setActiveScope(s.id);
          store.updateScope({
            name: name.value.trim() || s.name,
            mission: mission.value,
            startingPoint: start.value,
          });
          if (was !== s.id) store.setActiveScope(was);
          render();
        },
      },
      { label: "Cancel" },
    ],
  });
}

function gamesCard(current) {
  const card = el("div", { class: "card" });
  // Archiving is a shelving action, so an archived game sinks below the live
  // ones rather than sitting among them wearing a label.
  const all = [...store.games()].sort((a, b) => (a.archivedAt ? 1 : 0) - (b.archivedAt ? 1 : 0));
  add(card, el("div", { class: "card-head" },
    el("h3", { text: "Your games" }),
    el("span", { class: "cite", text: String(all.length) })
  ));
  for (const g of all) {
    const active = current && g.id === current.id;
    add(card, el("div", { class: "entry" },
      el("div", { class: "entry-head" },
        el("span", { class: "entry-title", text: g.title }),
        g.archivedAt ? el("span", { class: "pill", text: "archived" }) : null,
        active ? el("span", { class: "pill on", text: "open" }) : null
      ),
      el("div", { class: "entry-detail", text: [g.universe, `${g.scopes.length} plot sheet${g.scopes.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ") }),
      el("div", { class: "btn-row", style: "margin-top:.3rem" },
        active ? null : el("button", {
          class: "btn small", onclick: () => { store.setActiveGame(g.id); go("play", "track"); },
        }, "Open"),
        el("button", {
          class: "btn small ghost",
          onclick: () => { store.archiveGame(g.id, !g.archivedAt); render(); },
        }, g.archivedAt ? "Restore" : "Archive")
      )
    ));
  }
  add(card, el("button", { class: "btn wide primary", onclick: () => startWizard() }, "Prepare another game"));
  return card;
}

function newToSoloCard() {
  const card = el("div", { class: "card" });
  add(card, el("div", { class: "card-head" },
    el("h2", { text: NEW_TO_SOLO.title }),
    el("span", { class: "cite", text: "the app's own words" })
  ));
  const ul = el("ul", { class: "plain" });
  for (const p of NEW_TO_SOLO.points) add(ul, el("li", { text: p }));
  add(card, ul);
  add(card, el("p", { class: "loop", text: NEW_TO_SOLO.loop }));
  return card;
}

function machinesCard() {
  const card = el("div", { class: "card" });
  add(card, el("h3", { text: "The machines" }));
  for (const m of MACHINES) {
    const d = el("details", { class: "acc" }, el("summary", null, m.name));
    add(d, el("div", { class: "acc-body" },
      el("p", { text: m.text }),
      el("p", { class: "cite", text: m.version })
    ));
    add(card, d);
  }
  return card;
}

// ---------------------------------------------------------------------------
// Rules library
// ---------------------------------------------------------------------------
function renderLibrary(host) {
  add(host, el("h1", { text: "Rules" }));
  add(host, explain([
    "One entry per rule the app automates, in the app's own words, with the page cited.",
    "Entries marked 'guidance only' are things the books say that the app deliberately does not enforce.",
  ]));

  const search = el("input", { type: "text", placeholder: "Search the rules…", value: ruleSearch });
  search.addEventListener("input", () => { ruleSearch = search.value; render(); search.focus(); });
  add(host, el("label", { class: "field" },
    el("span", { class: "lbl", text: "Search" }), search
  ));

  const q = ruleSearch.trim().toLowerCase();
  let hits = 0;
  add(host, glossaryCard(q));
  for (const group of RULES_LIBRARY) {
    const entries = group.entries.filter((e) =>
      !q || e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q));
    if (!entries.length) continue;
    // Forty collapsed entries still made a 4.7-screen wall. The groups fold too,
    // and a search opens whatever it matched.
    const card = el("div", { class: "card" });
    const groupBody = el("div");
    const groupFold = el("details", { class: "acc group" , open: (!!q) || undefined },
      el("summary", null,
        group.group,
        el("span", { class: "pill", text: String(entries.length) })
      ),
      groupBody
    );
    add(card, groupFold);
    for (const e of entries) {
      hits += 1;
      const open = (!!q) || pendingRuleId === e.id;
      const d = el("details", { class: "acc", id: "rule-" + e.id, open: open || undefined },
        el("summary", null,
          e.title,
          e.automated === false ? el("span", { class: "pill", text: "guidance" }) : null
        ),
        el("div", { class: "acc-body" },
          el("p", { text: e.body }),
          el("p", { class: "cite", text: e.page })
        )
      );
      if (pendingRuleId === e.id) { d.classList.add("flash"); groupFold.open = true; }
      add(groupBody, d);
    }
    add(host, card);
  }

  if (!hits) {
    add(host, emptyState("Nothing matches", `No rule mentions “${ruleSearch}”.`,
      { label: "Clear the search", onClick: () => { ruleSearch = ""; render(); } }));
  }

  add(host, guidanceCard());
  add(host, errataCard());
  if (Settings.gum()) add(host, noRollCard());

  if (pendingTermId) {
    const target = pendingTermId;
    pendingTermId = null;
    requestAnimationFrame(() => {
      const node = document.getElementById("term-" + target);
      if (node) node.scrollIntoView({ block: "center" });
    });
  }

  if (pendingRuleId) {
    const target = pendingRuleId;
    pendingRuleId = null;
    requestAnimationFrame(() => {
      const node = document.getElementById("rule-" + target);
      if (node) node.scrollIntoView({ block: "center" });
    });
  }
}

// "What is a plot scope?" has no answer in a library organised rule by rule.
// The glossary answers it, in two layers: a first group that assumes the reader
// has never played a solo RPG at all, then the machinery.
function glossaryCard(q) {
  const terms = GLOSSARY.filter((g) => !q
    || g.term.toLowerCase().includes(q)
    || g.body.toLowerCase().includes(q)
    || (g.more || "").toLowerCase().includes(q)
    || (g.aka || []).some((a) => a.includes(q)));
  if (!terms.length) return null;
  const card = el("div", { class: "card glossary" });
  const body = el("div");
  // The one card in the library whose whole job is to answer "what does that
  // word mean". Folded shut it answered nothing, so it opens by default; the
  // rule groups below it stay folded, which is what keeps the screen short.
  const fold = el("details", { class: "acc group", open: true },
    el("summary", null, "Glossary", el("span", { class: "pill", text: String(terms.length) })),
    body
  );
  for (const group of [...new Set(terms.map((g) => g.group || "Terms"))]) {
    add(body, el("h4", { class: "term-group", text: group }));
    for (const g of terms.filter((x) => (x.group || "Terms") === group)) {
      const row = el("div", { class: "defrow", id: "term-" + g.id },
        el("span", { class: "k", text: g.term }),
        el("span", { class: "v" },
          g.body,
          g.more ? el("span", { class: "muted", text: " " + g.more }) : null,
          el("span", { class: "cite", text: " " + g.page })
        )
      );
      if (pendingTermId === g.id) row.classList.add("flash");
      add(body, row);
    }
  }
  add(card, fold);
  return card;
}

function guidanceCard() {
  const card = el("div", { class: "card" });
  // Grouped like the rule sections below it: the library is a place you look
  // something up in, and four chapters of prose left permanently open pushed
  // the glossary — the card people actually arrive for — off the screen.
  const group = el("details", { class: "acc group" },
    el("summary", null, "From the books", el("span", { class: "pill", text: "4" })));
  const inner = el("div");
  add(group, inner);
  add(card, group);
  const shelf = { append: (n) => add(inner, n) };

  const states = el("details", { class: "acc" }, el("summary", null, "The three play states"));
  const sBody = el("div", { class: "acc-body" });
  for (const s of PLAY_STATES) {
    add(sBody, el("p", null, el("strong", { text: `${s.n}. ${s.name} — ` }), s.text));
  }
  add(sBody, el("p", { class: "cite", text: "PUM p.4" }));
  add(states, sBody);
  shelf.append(states);

  const flow = el("details", { class: "acc" }, el("summary", null, "The playing flowchart"));
  const fBody = el("div", { class: "acc-body" });
  for (const f of FLOWCHART) {
    add(fBody, el("p", null,
      el("strong", { text: f.q }), el("br"),
      el("span", { class: "muted", text: `Yes → ${f.yes}` }), el("br"),
      el("span", { class: "muted", text: `No → ${f.no}` })
    ));
  }
  add(fBody, el("p", { class: "cite", text: "PUM p.5" }));
  add(flow, fBody);
  shelf.append(flow);

  const adv = el("details", { class: "acc" }, el("summary", null, "Advice"));
  const aBody = el("div", { class: "acc-body" });
  for (const a of ADVICE) {
    add(aBody, el("p", null, el("strong", { text: a.q + " " }), a.a));
  }
  add(aBody, el("p", { class: "cite", text: "PUM p.10" }));
  add(adv, aBody);
  shelf.append(adv);

  const mech = el("details", { class: "acc" }, el("summary", null, "Advanced mechanics"));
  const mBody = el("div", { class: "acc-body" });
  for (const m of ADVANCED) {
    add(mBody, el("p", null, el("strong", { text: m.name + " — " }), m.text));
  }
  add(mBody, el("p", { class: "cite", text: "PUM p.9" }));
  add(mech, mBody);
  shelf.append(mech);

  return card;
}

// The fields the app deliberately does not roll on, and why. Recorded the way
// ruling A8 records the absent safety tools: a player who notices that one blank
// offers three words and the next does not deserves the reason, not a shrug.
function noRollCard() {
  const card = el("div", { class: "card" });
  const fields = Object.entries(INSPIRE_ABSENT);
  const group = el("details", { class: "acc group" },
    el("summary", null, "Where the app does not roll",
      el("span", { class: "pill", text: String(fields.length) })));
  const inner = el("div");
  add(inner, el("p", { class: "muted", text: "Most text fields offer three GUM words. These do not, because every GUM row is a phrase about fiction — the right shape for a piece of story, the wrong shape for a proper name or a real-world answer. A table pointed at the wrong question reads as noise, so the app says nothing instead." }));
  add(inner, el("p", { class: "cite", text: "GUM p.3" }));
  for (const [field, why] of fields) {
    const d = el("details", { class: "acc" }, el("summary", null, field.replace(/-/g, " ")));
    add(d, el("div", { class: "acc-body" }, el("p", { text: why })));
    add(inner, d);
  }
  add(group, inner);
  add(card, group);
  return card;
}

function errataCard() {
  const card = el("div", { class: "card" });
  const errata = [
    ...PUM_ERRATA.map((e) => ({ ...e, book: "PUM" })),
    ...(Settings.gum() ? GUM_ERRATA.map((e) => ({ ...e, book: "GUM" })) : []),
  ];
  const group = el("details", { class: "acc group" },
    el("summary", null, "Errata", el("span", { class: "pill", text: String(errata.length) })));
  const inner = el("div");
  add(inner, el("p", { class: "muted", text: "Where the books disagree with themselves, or print something twice. The app records the discrepancy rather than quietly correcting it — the printed table is what you would roll on paper." }));
  for (const e of errata) {
    const d = el("details", { class: "acc" }, el("summary", null, `${e.id} · ${e.book} p.${e.page}`));
    add(d, el("div", { class: "acc-body" },
      el("p", { text: e.text }),
      el("p", null, el("strong", { text: "Ruling: " }), e.ruling)
    ));
    add(inner, d);
  }
  add(group, inner);
  add(card, group);
  return card;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
function renderSettings(host) {
  add(host, el("h1", { text: "Settings" }));
  add(host, explain([
    "Optional rules are off unless the books present them as the default. Everything here is stored on this device only.",
  ]));

  // Data
  const data = el("div", { class: "card" });
  add(data, el("h2", { text: "Your data" }));
  add(data, el("p", { class: "muted", text: "Everything lives in this browser's local storage. Nothing is sent anywhere. Export regularly — a game you cannot take with you is a rental." }));
  add(data, el("div", { class: "btn-row" },
    el("button", { class: "btn", onclick: exportData }, "Export JSON"),
    el("button", { class: "btn", onclick: importData }, "Import JSON")
  ));
  add(data, el("div", { class: "btn-row", style: "margin-top:.4rem" },
    el("button", { class: "btn small", onclick: exportReadable }, "Export readable"),
    el("button", {
      class: "btn small",
      onclick: () => {
        const r = store.checkData();
        modal({
          title: "Data check",
          body: el("div", null,
            el("p", { text: r.changed
              ? "Some records needed repair and have been normalized."
              : "Everything checked out — nothing needed repair." }),
            el("p", { class: "muted", text: `${r.games} game(s) · ${r.scopes} plot sheet(s) · ${r.entries} journal entries.` })
          ),
          actions: [{ label: "Close", primary: true }],
        });
      },
    }, "Check my data")
  ));
  add(data, el("div", { class: "btn-row", style: "margin-top:.4rem" },
    el("button", {
      class: "btn small", disabled: !store.canUndo() || undefined,
      onclick: () => {
        const label = store.undoLabel();
        store.undo();
        toast(`Undone: ${label}`);
        render();
      },
    }, store.canUndo() ? `Undo: ${store.undoLabel()}` : "Nothing to undo")
  ));
  add(host, data);

  // Optional rules
  const rules = el("div", { class: "card" });
  add(rules, el("h2", { text: "Optional rules" }));
  add(rules, toggle(
    "Disruption die",
    "Roll a d10 alongside every oracle answer. On a 1 a random prompt interrupts; on a 2 a modified proposal alters the scene. PUM presents this as an optional variant, so it starts off.",
    Settings.disruptionDie(), (v) => { Settings.setDisruptionDie(v); render(); }
  ));
  if (Settings.disruptionDie()) {
    add(rules, toggle(
      "Volatile situation",
      "Widen the modified-proposal range from 2 to 2–5. A 1 is always the only face for a random prompt.",
      Settings.disruptionVolatile(), (v) => { Settings.setDisruptionVolatile(v); render(); }
    ));
  }
  add(rules, toggle(
    "Game Unfolding Machine (GUM v2.2)",
    "The third book's 43 prep tables — plot seeds, factions, locations, objects, a nemesis, creatures, characters, and the grand oracle. Adds a Forge tab. On by default because you supplied the book; turn it off to hide it entirely.",
    Settings.gum(), (v) => { Settings.setGum(v); render(); }
  ));
  add(rules, toggle(
    "Show the \u201cWhat this does\u201d notes expanded",
    "Every screen carries a short note explaining what it is for. They start open and close for good the first time you collapse one — this brings them back.",
    Settings.explainOpen(), (v) => { Settings.setExplainOpen(v); render(); }
  ));
  add(rules, toggle(
    "Enrich descriptive and story oracles",
    "Roll the d100 Description or Focus word with every 1d10 oracle answer. This is the books' default, so it starts on.",
    Settings.autoEnrich(), (v) => { Settings.setAutoEnrich(v); render(); }
  ));
  add(host, rules);

  // Appearance
  const look = el("div", { class: "card" });
  add(look, el("h2", { text: "Appearance" }));
  add(look, inlineRow("Theme", el("button", {
    class: "btn small", onclick: () => { cycleTheme(); render(); },
  }, Settings.theme())));
  const scale = el("input", {
    type: "range", min: "0.85", max: "1.4", step: "0.05", value: String(Settings.textScale()),
    style: "width:100%",
  });
  scale.addEventListener("change", () => {
    Settings.setTextScale(Number(scale.value));
    applyTheme();
    render();
  });
  add(look, el("label", { class: "field" },
    el("span", { class: "lbl", text: `Text size — ${Math.round(Settings.textScale() * 100)}%` }),
    scale,
    el("div", { class: "hint", text: "Pinch-zoom is locked so a stray gesture cannot disturb a roll. This is the control that pays that back." })
  ));
  add(host, look);

  // About the books — including what they do not contain (ruling A8)
  const about = el("div", { class: "card" });
  add(about, el("h2", { text: "About the books" }));
  add(about, el("p", { class: "muted", text: "Plot Unfolding Machine v9.0, Scene Unfolding Machine v8.0 Rev2 and Game Unfolding Machine v2.2 by JeansenVaars, CC BY-NC-SA 4.0. This app is a personal play aid built from those books; it reproduces no rules prose and carries no setting content." }));
  add(about, el("h3", { text: "Safety tools" }));
  add(about, el("p", { class: "muted", text: "Neither book ships any — no lines and veils, no X-card, no debrief. The app does not invent one and present it as theirs. If your table wants them, bring them from elsewhere; solo play still benefits from deciding in advance what you would rather not write about tonight." }));
  add(about, el("h3", { text: "Task resolution" }));
  add(about, el("p", { class: "muted", text: "PUM resolves nothing. It never says whether an action succeeded — it says what the world offers. Bring your own RPG's rules, or narrate it yourself." }));
  add(about, el("p", { class: "cite", text: `App version ${APP_VERSION}` }));
  add(host, about);

  // Danger zone at the end of the scroll, out of the thumb's resting arc (§6.3.11)
  const danger = el("div", { class: "card" });
  add(danger, el("h2", { text: "Danger zone" }));
  const game = store.activeGame();
  if (game) {
    add(danger, el("button", {
      class: "btn danger wide",
      onclick: () => confirmModal({
        title: `Delete "${game.title}"?`,
        message: `Its ${game.scopes.length} plot sheet(s), ${game.cast.length} cast entries and ${game.journal.length} journal entries are deleted. Export first if you want to keep them.`,
        confirmLabel: "Delete this game", danger: true,
        onConfirm: () => { store.deleteGame(game.id); toast("Game deleted.", { undo: true }); go("more", "home"); },
      }),
    }, "Delete the current game"));
  }
  add(danger, el("button", {
    class: "btn danger wide", style: "margin-top:.4rem",
    onclick: () => confirmModal({
      title: "Erase everything?",
      message: `All ${store.games().length} game(s), every plot sheet, every journal entry and every setting on this device are erased. Export first if you want to keep them.`,
      confirmLabel: "Erase everything", danger: true,
      onConfirm: () => { store.resetAll(); applyTheme(); toast("Erased.", { undo: true }); go("more", "home"); },
    }),
  }, "Erase everything"));
  add(host, danger);

  // Settings was the last screen with a primary that only sat inline — 390px
  // down, below the toggles. Export is the one action here with a consequence
  // ("a game you cannot take with you is a rental"), so it is the one pinned;
  // the copy in the Data card is a plain button now, not a second accent.
  actionBar({
    label: "Export JSON",
    context: `${store.games().length} game(s) on this device`,
    onClick: exportData,
    secondary: { label: "Import", onClick: importData },
  });
}

function toggle(label, description, checked, onChange) {
  return el("label", { class: "check" },
    el("input", { type: "checkbox", checked: checked || undefined, onchange: (e) => onChange(e.target.checked) }),
    el("span", { class: "ct" }, el("strong", { text: label }), el("small", { text: description }))
  );
}

// The viewer sandbox blocks downloads a page starts itself, so the export is
// offered as selectable text as well as a download attempt.
function exportData() {
  const json = store.exportJSON();
  showTextDump("Export", json, "unfolding-machines.json");
}

function exportReadable() {
  const game = store.activeGame();
  if (!game) { toast("No game to export."); return; }
  const lines = [];
  lines.push(`# ${game.title}`, "");
  if (game.universe) lines.push(`Universe: ${game.universe}`);
  if (game.tone) lines.push(`Tone: ${game.tone}`);
  lines.push("");
  lines.push("## Protagonists");
  for (const p of game.protagonists) lines.push(`- ${p.name}${p.notes ? " — " + p.notes : ""}`);
  lines.push("");
  for (const s of game.scopes) {
    const sheet = plotSheet(s.sheetId);
    lines.push(`## Plot sheet: ${s.name} (${sheet ? sheet.name : "?"})`);
    if (s.mission) lines.push(`Mission: ${s.mission}`);
    if (s.startingPoint) lines.push(`Starting point: ${s.startingPoint}`);
    if (hasTrack(s)) lines.push(`Track: ${crossed(s)}/${trackLength(s)}${isResolved(s) ? " — resolved" : ""}`);
    if (s.closedAt && !isResolved(s)) lines.push("Ended by the player.");
    for (const [key, list] of Object.entries(s.nodes)) {
      const filled = list.filter((x) => x && x.trim());
      if (filled.length) lines.push(`  ${key}: ${filled.join(" · ")}`);
    }
    lines.push("");
  }
  lines.push("## Journal");
  for (const e of [...game.journal].reverse()) {
    lines.push(`- [${fmtTime(e.ts)}] ${e.kind}: ${e.title || e.detail}`);
    if (e.title && e.detail) lines.push(`    ${e.detail}`);
    if (e.note) lines.push(`    "${e.note}"`);
  }
  showTextDump("Readable export", lines.join("\n"), `${game.title}.md`);
}

function showTextDump(title, text, filename) {
  const area = el("textarea", { readonly: true, style: "min-height:12rem;font-family:ui-monospace,monospace;font-size:.75rem" });
  area.value = text;
  modal({
    title,
    body: el("div", null,
      el("p", { class: "muted", text: "Select all and copy, or use the download button. Downloads are blocked in some embedded viewers — copying always works." }),
      area
    ),
    actions: [
      {
        label: "Copy", primary: true,
        onClick: () => {
          area.select();
          navigator.clipboard ? navigator.clipboard.writeText(text).then(() => toast("Copied.")) : document.execCommand("copy");
          return true;
        },
      },
      {
        label: "Download",
        onClick: () => {
          // Some embedded viewers block a page-initiated download silently: the
          // click neither downloads nor throws. Always report, so the button is
          // never a control that appears to do nothing.
          try {
            const blob = new Blob([text], { type: "application/json" });
            const href = URL.createObjectURL(blob);
            const a = el("a", { href, download: filename });
            document.body.append(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
            toast(`Saving ${filename} — if nothing arrives, copy the text instead.`);
          } catch (err) {
            toast("Download blocked here — copy the text instead.");
          }
          return true;
        },
      },
      { label: "Close" },
    ],
  });
}

function importData() {
  const area = el("textarea", { placeholder: "Paste an exported JSON file here", style: "min-height:10rem" });
  const file = el("input", { type: "file", accept: "application/json,.json" });
  file.addEventListener("change", () => {
    const f = file.files && file.files[0];
    if (!f) return;
    f.text().then((t) => { area.value = t; }).catch(() => toast("Could not read that file."));
  });
  modal({
    title: "Import",
    body: el("div", null,
      el("p", { class: "muted", text: "Importing replaces everything currently on this device. Export first if you want to keep it." }),
      file, area
    ),
    actions: [
      {
        label: "Import", primary: true,
        onClick: () => {
          try {
            const n = store.importJSON(area.value);
            applyTheme();
            toast(`Imported ${n} game${n === 1 ? "" : "s"}.`);
            go("more", "home");
          } catch (err) {
            toast("That doesn't look like an export file.");
            return true;
          }
        },
      },
      { label: "Cancel" },
    ],
  });
}
