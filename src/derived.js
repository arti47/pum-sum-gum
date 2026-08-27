// Derived values over stored state, plus normalization/migration.
// Pure functions: they read state and return numbers, never mutate.

import { STATE_VERSION, uid } from "./core.js";
import { plotSheet, trackSections, trackTotal, sectionOfBox } from "./rules.js";
import { NODE_CATEGORIES, PLOT_SHEETS } from "../data-pum-plot.js";

export const NODE_IDS = NODE_CATEGORIES.map((c) => c.id);

// --- the plot track ---------------------------------------------------------
export function sectionsOf(scope) {
  const sheet = plotSheet(scope.sheetId);
  if (!sheet) return [];
  return trackSections(sheet, scope.track && scope.track.custom);
}

export function trackLength(scope) {
  return trackTotal(sectionsOf(scope));
}

export function crossed(scope) {
  return Math.min(scope.track ? scope.track.crossed || 0 : 0, trackLength(scope));
}

export function hasTrack(scope) {
  return trackLength(scope) > 0;
}

// Threshold: the track is full, so this scope has resolved. The point of the game.
export function isResolved(scope) {
  const total = trackLength(scope);
  return total > 0 && crossed(scope) >= total;
}

// Permission (PUM p.7, and the trackless sheets' whole premise): you may end a
// plot scope when you say it ends, track or no track. A scope is over when the
// Threshold is met OR when the player has declared it over.
export function isEnded(scope) {
  return !!(scope && scope.closedAt) || isResolved(scope);
}

// Where play currently stands: the section holding the next empty box.
export function currentSection(scope) {
  const sections = sectionsOf(scope);
  if (!sections.length) return null;
  const idx = Math.min(crossed(scope), trackTotal(sections) - 1);
  const hit = sectionOfBox(sections, idx);
  return hit ? hit.section : null;
}

function trackLabel(scope) {
  const total = trackLength(scope);
  if (total === 0) return "No track";
  return `${crossed(scope)}/${total}`;
}

// --- plot nodes -------------------------------------------------------------
export function nodeSlots(scope, categoryId) {
  const sheet = plotSheet(scope.sheetId);
  if (!sheet) return 0;
  const cat = NODE_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return 0;
  // The expanded categories are printed on the plot-node extension sheet, not on
  // the all-in-one sheets (PUM p.14 vs pp.26-27). A sheet that does not print a
  // list has no list: giving it slots would let the player fill a list that the
  // Nodes screen then hides, and writing where nothing can be read is worse than
  // an honest empty hand.
  if (cat.expanded && !sheet.expandedNodes) return 0;
  // A player-named list (PUM p.27) only exists once it has been named.
  if (cat.custom && !customListName(scope, categoryId)) return 0;
  return sheet.nodeSlots;
}

// Why a category has no slots, so a surface can say the true thing rather than
// one message for three different situations.
export function nodeUnavailableReason(scope, categoryId) {
  const sheet = plotSheet(scope.sheetId);
  const cat = NODE_CATEGORIES.find((c) => c.id === categoryId);
  if (!sheet || !cat) return "unknown";
  if (sheet.nodeSlots === 0) return "no-nodes";
  if (cat.expanded && !sheet.expandedNodes) return "not-on-this-sheet";
  if (cat.custom && !customListName(scope, categoryId)) return "unnamed-list";
  return null;
}

// Which sheets pair with the plot-node extension sheet, as a sentence. Read from
// the sheet table rather than restated in a surface (§10.2) — three screens
// listed these by hand and one of them would have gone stale the moment a
// sheet's own entry changed.
export function expandedSheetSentence() {
  const names = PLOT_SHEETS.filter((s) => s.expandedNodes).map((s) => s.name);
  if (!names.length) return "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

// The two blank lists on the extension sheet carry whatever name you write on them.
export function customListName(scope, categoryId) {
  return (scope.customNames && scope.customNames[categoryId]) || "";
}

export function categoryName(scope, categoryId) {
  const cat = NODE_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return categoryId;
  return cat.custom ? (customListName(scope, categoryId) || cat.name) : cat.name;
}

export function nodeList(scope, categoryId) {
  const list = (scope.nodes && scope.nodes[categoryId]) || [];
  const slots = nodeSlots(scope, categoryId);
  const out = list.slice(0, slots);
  while (out.length < slots) out.push("");
  return out;
}

export function nodeFill(scope, categoryId) {
  return nodeList(scope, categoryId).filter((s) => s && s.trim()).length;
}

// Ruling A7 / PUM p.25: roll 1d10 in lists with LESS THAN half the entries
// filled; otherwise 1d20. "Otherwise" includes exactly half, so a ten-slot list
// switches at the fifth entry, not the sixth.
//
// A d10 reaches five slots and a d20 reaches ten (slot = ceil(roll/2)), so a
// five-slot list can only ever be rolled with a d10 — a d20 would point past its
// end. That is why the die follows the list's capacity as well as its fill.
export function nodeDie(scope, categoryId) {
  const slots = nodeSlots(scope, categoryId);
  if (slots <= 5) return 10;
  return nodeFill(scope, categoryId) >= slots / 2 ? 20 : 10;
}

// A node die result maps to a slot: ranges are 1-2, 3-4, ... so slot = ceil(roll/2).
export function slotForRoll(roll) {
  return Math.ceil(roll / 2) - 1;
}

export function slotRange(index) {
  return [index * 2 + 1, index * 2 + 2];
}

// --- scope helpers ----------------------------------------------------------
export function scopeSummary(scope) {
  const sheet = plotSheet(scope.sheetId);
  const bits = [sheet ? sheet.name : "Unknown sheet"];
  if (hasTrack(scope)) bits.push(trackLabel(scope));
  if (isResolved(scope)) bits.push("resolved");
  else if (isEnded(scope)) bits.push("ended");
  return bits.join(" · ");
}

export function activeScope(game) {
  if (!game || !game.scopes || !game.scopes.length) return null;
  return game.scopes.find((s) => s.id === game.activeScopeId) || game.scopes[0];
}

// --- normalization / migration (§7: never crash on old data) ---------------
//
// normalize() is TOTAL: it returns a usable state for any input at all, because
// it stands between `JSON.parse(localStorage)` and the whole app. If it throws,
// the app does not boot — a blank screen, and a player whose campaign looks
// deleted. The hostile-input audit found it throwing on six shapes, every one of
// which a corrupted write or a hand-edited export can produce:
//
//   · `null` — a default parameter covers `undefined`, never `null`;
//   · a `null` element inside games, scopes, protagonists, cast or journal.
//
// Two helpers do the whole job. Use them for every field read out of raw data.

// An object, whatever was actually there. null, a string, a number and an array
// all become {} — reading a field off that yields undefined, which every
// `|| default` below already handles.
function obj(v) {
  return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
}

// A string, whatever was actually there. An object title would otherwise reach
// the screen as the literal text "[object Object]": not a null leaking through
// (D-1) but a type nobody checked.
function str(v, fallback = "") {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

function blankNodes() {
  const n = {};
  for (const id of NODE_IDS) n[id] = [];
  return n;
}

export function normalizeScope(input = {}) {
  const raw = obj(input);
  const track = obj(raw.track);
  const scene = obj(raw.openScene);
  const scope = {
    id: str(raw.id) || uid("scope"),
    name: str(raw.name) || "Untitled scope",
    mission: str(raw.mission),
    sheetId: (typeof raw.sheetId === "string" && plotSheet(raw.sheetId)) ? raw.sheetId : "standard",
    startingPoint: str(raw.startingPoint),
    createdAt: Number(raw.createdAt) || Date.now(),
    track: {
      crossed: Math.max(0, Number(track.crossed) || 0),
      marks: { ...obj(track.marks) },
      fired: { ...obj(track.fired) },
      custom: Array.isArray(track.custom) ? track.custom : null,
    },
    customPrompts: Array.isArray(raw.customPrompts) && raw.customPrompts.length === 10
      ? raw.customPrompts.map((p) => str(p)) : null,
    customNames: {
      custom1: str(obj(raw.customNames).custom1),
      custom2: str(obj(raw.customNames).custom2),
    },
    notes: str(raw.notes),
    closedAt: Number(raw.closedAt) > 0 ? Number(raw.closedAt) : null,
    nodes: blankNodes(),
    openScene: scene.id ? {
      id: str(scene.id),
      openedAt: Number(scene.openedAt) || Date.now(),
      opener: str(scene.opener),
      interventions: Array.isArray(scene.interventions) ? scene.interventions : [],
    } : null,
    lastBeat: (raw.lastBeat && typeof raw.lastBeat === "object") ? raw.lastBeat : null,
  };
  for (const id of NODE_IDS) {
    const src = Array.isArray(obj(raw.nodes)[id]) ? obj(raw.nodes)[id] : [];
    scope.nodes[id] = src.map((x) => str(x));
  }
  // A crossed count can never exceed the track it belongs to.
  const total = trackLength(scope);
  if (total > 0 && scope.track.crossed > total) scope.track.crossed = total;
  if (total === 0) scope.track.crossed = 0;
  return scope;
}

export function normalizeGame(input = {}) {
  const raw = obj(input);
  const game = {
    id: str(raw.id) || uid("game"),
    title: str(raw.title) || "Untitled game",
    universe: str(raw.universe),
    tone: str(raw.tone),
    inspiration: str(raw.inspiration),
    createdAt: Number(raw.createdAt) || Date.now(),
    archivedAt: Number(raw.archivedAt) || null,
    activeScopeId: str(raw.activeScopeId) || null,
    scopes: Array.isArray(raw.scopes) ? raw.scopes.map((s) => normalizeScope(obj(s))) : [],
    protagonists: Array.isArray(raw.protagonists)
      ? raw.protagonists.map((x) => {
          const p = obj(x);
          return { id: str(p.id) || uid("pc"), name: str(p.name) || "Unnamed", notes: str(p.notes) };
        })
      : [],
    cast: Array.isArray(raw.cast)
      ? raw.cast.map((x) => {
          const c = obj(x);
          return {
            id: str(c.id) || uid("cast"),
            kind: c.kind === "location" ? "location" : "character",
            name: str(c.name) || "Unnamed",
            notes: str(c.notes),
            traits: Array.isArray(c.traits)
              ? c.traits.map((y) => {
                  const t = obj(y);
                  return {
                    table: str(t.table), label: str(t.label), text: str(t.text),
                    roll: Number(t.roll) || 0,
                  };
                })
              : [],
          };
        })
      : [],
    journal: Array.isArray(raw.journal)
      ? raw.journal.map((x) => {
          const e = obj(x);
          return {
            id: str(e.id) || uid("j"),
            ts: Number(e.ts) || Date.now(),
            kind: str(e.kind) || "note",
            title: str(e.title),
            detail: str(e.detail),
            dice: Array.isArray(e.dice) ? e.dice : [],
            note: str(e.note),
            scopeId: str(e.scopeId) || null,
            sceneId: str(e.sceneId) || null,
            linkedTo: str(e.linkedTo) || null,
          };
        })
      : [],
  };
  if (!game.scopes.length) game.scopes = [normalizeScope({ name: game.title })];
  if (!game.scopes.some((s) => s.id === game.activeScopeId)) {
    game.activeScopeId = game.scopes[0].id;
  }
  return game;
}

export function normalize(input = {}) {
  const raw = obj(input);
  const set = obj(raw.settings);
  const state = {
    version: STATE_VERSION,
    theme: ["light", "dark", "system"].includes(raw.theme) ? raw.theme : "system",
    textScale: Number(raw.textScale) >= 0.85 && Number(raw.textScale) <= 1.4
      ? Number(raw.textScale) : 1,
    settings: {
      disruptionDie: !!set.disruptionDie,
      disruptionVolatile: !!set.disruptionVolatile,
      autoEnrich: typeof set.autoEnrich === "boolean" ? set.autoEnrich : true,
      gum: typeof set.gum === "boolean" ? set.gum : true,
      explainOpen: typeof set.explainOpen === "boolean" ? set.explainOpen : true,
      seenTutorial: !!set.seenTutorial,
    },
    activeGameId: str(raw.activeGameId) || null,
    games: Array.isArray(raw.games) ? raw.games.map((g) => normalizeGame(obj(g))) : [],
  };
  if (state.games.length && !state.games.some((g) => g.id === state.activeGameId)) {
    state.activeGameId = state.games[0].id;
  }
  if (!state.games.length) state.activeGameId = null;
  return state;
}
