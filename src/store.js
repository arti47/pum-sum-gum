// Persistence, the campaign library, the journal (this game's roll log), and
// export/import. One undo snapshot stack shared by every mutating action (§14.1.2).

import { STORAGE_KEY, uid } from "./core.js";
import { normalize, normalizeGame, normalizeScope, activeScope, trackLength, crossed }
  from "./derived.js";

let state = null;
const listeners = new Set();
const undoStack = [];
const UNDO_LIMIT = 20;
const JOURNAL_CAP = 500;

// --- load / save ------------------------------------------------------------
export function load() {
  let raw = {};
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) raw = JSON.parse(text);
  } catch (err) {
    console.warn("Stored state unreadable, starting fresh.", err);
    raw = {};
  }
  state = normalize(raw);
  return state;
}

export function getState() {
  if (!state) load();
  return state;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Could not save.", err);
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  persist();
  for (const fn of listeners) fn(state);
}

// --- undo -------------------------------------------------------------------
// Every mutating action pushes a snapshot. Reversibility is inventoried (§10.18).
// Inside a transaction the group's own snapshot already covers what follows, so
// intermediate ones are suppressed: one player action must be one undo, or the
// Undo button beside it takes back only the journal entry and leaves the box
// crossed.
let groupDepth = 0;

function snapshot(label) {
  if (groupDepth > 0) return;
  undoStack.push({ label, json: JSON.stringify(state), ts: Date.now() });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

// One snapshot for the whole of `fn`, however many mutations it performs.
export function transact(label, fn) {
  snapshot(label);
  groupDepth += 1;
  try { return fn(); } finally { groupDepth -= 1; }
}

export function canUndo() { return undoStack.length > 0; }
export function undoLabel() {
  return undoStack.length ? undoStack[undoStack.length - 1].label : null;
}

export function undo() {
  const snap = undoStack.pop();
  if (!snap) return false;
  state = normalize(JSON.parse(snap.json));
  emit();
  return true;
}

function mutate(label, fn) {
  snapshot(label);
  fn(state);
  emit();
}

// A preference is not a move in the game. It is its own inverse — the same
// control sets it back — and the undo stack is capped, so letting toggles onto
// it evicts real play history. Closing a "what this does" note is a preference
// write, and one player collapsing folds across five screens would otherwise
// have pushed out five undoable actions.
function prefer(fn) {
  fn(state);
  emit();
}

// --- games ------------------------------------------------------------------
export function games() { return getState().games; }

export function activeGame() {
  const s = getState();
  return s.games.find((g) => g.id === s.activeGameId) || null;
}

export function currentScope() {
  return activeScope(activeGame());
}

export function createGame(data) {
  const game = normalizeGame({
    id: uid("game"),
    title: data.title || "Untitled game",
    universe: data.universe || "",
    tone: data.tone || "",
    inspiration: data.inspiration || "",
    protagonists: data.protagonists || [],
    scopes: [normalizeScope({
      name: data.scopeName || data.title || "Main plot",
      mission: data.mission || "",
      sheetId: data.sheetId || "standard",
      startingPoint: data.startingPoint || "",
      customNames: data.customNames || {},
      nodes: data.nodes || {},
    })],
  });
  mutate("Create game", (s) => {
    s.games.unshift(game);
    s.activeGameId = game.id;
  });
  return game;
}

export function setActiveGame(id) {
  mutate("Switch game", (s) => { s.activeGameId = id; });
}

export function updateGame(patch) {
  mutate("Edit game", () => {
    const g = activeGame();
    if (g) Object.assign(g, patch);
  });
}

export function archiveGame(id, archived = true) {
  mutate(archived ? "Archive game" : "Restore game", (s) => {
    const g = s.games.find((x) => x.id === id);
    if (g) g.archivedAt = archived ? Date.now() : null;
  });
}

export function deleteGame(id) {
  mutate("Delete game", (s) => {
    s.games = s.games.filter((g) => g.id !== id);
    if (s.activeGameId === id) s.activeGameId = s.games.length ? s.games[0].id : null;
  });
}

// --- scopes (plot sheets) ---------------------------------------------------
export function addScope(data) {
  const scope = normalizeScope(data);
  mutate("Add plot sheet", () => {
    const g = activeGame();
    if (!g) return;
    g.scopes.push(scope);
    g.activeScopeId = scope.id;
  });
  return scope;
}

export function setActiveScope(id) {
  mutate("Switch plot sheet", () => {
    const g = activeGame();
    if (g && g.scopes.some((s) => s.id === id)) g.activeScopeId = id;
  });
}

export function updateScope(patch) {
  mutate("Edit plot sheet", () => {
    const sc = currentScope();
    if (sc) Object.assign(sc, patch);
  });
}

export function deleteScope(id) {
  mutate("Delete plot sheet", () => {
    const g = activeGame();
    if (!g || g.scopes.length <= 1) return;
    g.scopes = g.scopes.filter((s) => s.id !== id);
    if (g.activeScopeId === id) g.activeScopeId = g.scopes[0].id;
  });
}

// --- the plot track ---------------------------------------------------------
// Gate: a beat authorises a crossing; it does not perform one (PUM p.7).
// Returns { crossed, total, resolved, mark } so the caller can report the change.
export function confirmBeat({ voluntary = false, label = "" } = {}) {
  let outcome = null;
  mutate(voluntary ? "Advance track (no beat)" : "Confirm beat", () => {
    const sc = currentScope();
    if (!sc) return;
    const total = trackLength(sc);
    if (total === 0) return;
    const now = crossed(sc);
    if (now >= total) { outcome = { crossed: now, total, resolved: true, mark: null }; return; }
    sc.track.crossed = now + 1;
    const idx = String(sc.track.crossed - 1);
    // A timed beat on a marked box fires exactly once (PUM p.9).
    let mark = null;
    if (sc.track.marks[idx] && !sc.track.fired[idx]) {
      mark = sc.track.marks[idx];
      sc.track.fired[idx] = true;
    }
    outcome = {
      crossed: sc.track.crossed, total, resolved: sc.track.crossed >= total, mark, label,
    };
  });
  return outcome;
}

export function uncrossBox() {
  mutate("Step the track back", () => {
    const sc = currentScope();
    if (sc && crossed(sc) > 0) sc.track.crossed -= 1;
  });
}

// Permission: end a plot scope when you say it ends — the only way to finish a
// trackless sheet, and always available on a tracked one (PUM p.7).
export function setScopeClosed(closed, id = null) {
  mutate(closed ? "End the plot scope" : "Reopen the plot scope", () => {
    const g = activeGame();
    const sc = id ? (g && g.scopes.find((s) => s.id === id)) : currentScope();
    if (sc) sc.closedAt = closed ? Date.now() : null;
  });
}

export function setMark(index, text) {
  mutate(text ? "Mark a timed beat" : "Clear a timed beat", () => {
    const sc = currentScope();
    if (!sc) return;
    const key = String(index);
    if (text) sc.track.marks[key] = text;
    else { delete sc.track.marks[key]; delete sc.track.fired[key]; }
  });
}

// Customized sheet: grow the track in play (PUM p.9).
export function addTrackSection(name, boxes) {
  mutate("Add a track section", () => {
    const sc = currentScope();
    if (!sc) return;
    if (!Array.isArray(sc.track.custom)) sc.track.custom = [];
    sc.track.custom.push({ name: name || `Part ${sc.track.custom.length + 1}`, boxes: Math.max(1, boxes | 0) });
  });
}

export function addTrackBox(sectionIndex = -1) {
  mutate("Add a track box", () => {
    const sc = currentScope();
    if (!sc || !Array.isArray(sc.track.custom) || !sc.track.custom.length) return;
    const i = sectionIndex < 0 ? sc.track.custom.length - 1 : sectionIndex;
    if (sc.track.custom[i]) sc.track.custom[i].boxes += 1;
  });
}

export function removeTrackSection(index) {
  mutate("Remove a track section", () => {
    const sc = currentScope();
    if (!sc || !Array.isArray(sc.track.custom)) return;
    sc.track.custom.splice(index, 1);
    const total = trackLength(sc);
    if (sc.track.crossed > total) sc.track.crossed = total;
  });
}

export function setCustomPrompts(list) {
  mutate("Edit the prompt column", () => {
    const sc = currentScope();
    if (!sc) return;
    sc.customPrompts = Array.isArray(list) && list.length === 10 ? list : null;
  });
}

// --- plot nodes -------------------------------------------------------------
export function setNode(categoryId, index, text) {
  mutate(text ? "Write a plot node" : "Clear a plot node", () => {
    const sc = currentScope();
    if (!sc) return;
    if (!Array.isArray(sc.nodes[categoryId])) sc.nodes[categoryId] = [];
    const list = sc.nodes[categoryId];
    while (list.length <= index) list.push("");
    list[index] = text;
  });
}

// Conversion: an invented node becomes a permanent entry in the first empty slot.
export function writeNodeToFirstEmpty(categoryId, text, slots) {
  let index = -1;
  mutate("Invent a plot node", () => {
    const sc = currentScope();
    if (!sc) return;
    if (!Array.isArray(sc.nodes[categoryId])) sc.nodes[categoryId] = [];
    const list = sc.nodes[categoryId];
    while (list.length < slots) list.push("");
    for (let i = 0; i < slots; i++) {
      if (!list[i] || !list[i].trim()) { list[i] = text; index = i; return; }
    }
  });
  return index;
}

export function setCustomListName(categoryId, name) {
  mutate(name ? "Name a plot node list" : "Clear a list name", () => {
    const sc = currentScope();
    if (!sc) return;
    if (!sc.customNames) sc.customNames = { custom1: "", custom2: "" };
    sc.customNames[categoryId] = name;
    if (!name && Array.isArray(sc.nodes[categoryId])) sc.nodes[categoryId] = [];
  });
}

export function setScopeNotes(text) {
  mutate("Write game notes", () => {
    const sc = currentScope();
    if (sc) sc.notes = text;
  });
}

// --- protagonists & cast ----------------------------------------------------
export function addProtagonist(name, notes = "") {
  mutate("Add a protagonist", () => {
    const g = activeGame();
    if (g) g.protagonists.push({ id: uid("pc"), name, notes });
  });
}

export function updateProtagonist(id, patch) {
  mutate("Edit a protagonist", () => {
    const g = activeGame();
    const p = g && g.protagonists.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  });
}

export function removeProtagonist(id) {
  mutate("Remove a protagonist", () => {
    const g = activeGame();
    if (g) g.protagonists = g.protagonists.filter((p) => p.id !== id);
  });
}

export function addCast(kind, name, notes = "") {
  const entry = { id: uid("cast"), kind, name, notes, traits: [] };
  mutate("Add to the cast", () => {
    const g = activeGame();
    if (g) g.cast.push(entry);
  });
  return entry;
}

export function updateCast(id, patch) {
  mutate("Edit a cast entry", () => {
    const g = activeGame();
    const c = g && g.cast.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  });
}

export function addCastTrait(id, trait) {
  mutate("Add a trait", () => {
    const g = activeGame();
    const c = g && g.cast.find((x) => x.id === id);
    if (c) c.traits.push(trait);
  });
}

export function removeCastTrait(id, index) {
  mutate("Remove a trait", () => {
    const g = activeGame();
    const c = g && g.cast.find((x) => x.id === id);
    if (c) c.traits.splice(index, 1);
  });
}

export function removeCast(id) {
  mutate("Remove a cast entry", () => {
    const g = activeGame();
    if (g) g.cast = g.cast.filter((c) => c.id !== id);
  });
}

// --- the journal (the roll log + narration) --------------------------------
export function addJournal(entry) {
  const rec = {
    id: uid("j"),
    ts: Date.now(),
    kind: entry.kind || "note",
    title: entry.title || "",
    detail: entry.detail || "",
    dice: entry.dice || [],
    note: entry.note || "",
    scopeId: entry.scopeId || (currentScope() ? currentScope().id : null),
    sceneId: entry.sceneId || null,
    linkedTo: entry.linkedTo || null,
  };
  mutate("Journal entry", () => {
    const g = activeGame();
    if (!g) return;
    g.journal.unshift(rec);
    if (g.journal.length > JOURNAL_CAP) g.journal.length = JOURNAL_CAP;
  });
  return rec;
}

export function updateJournal(id, patch) {
  mutate("Edit journal entry", () => {
    const g = activeGame();
    const e = g && g.journal.find((x) => x.id === id);
    if (e) Object.assign(e, patch);
  });
}

export function removeJournal(id) {
  mutate("Delete journal entry", () => {
    const g = activeGame();
    if (g) g.journal = g.journal.filter((e) => e.id !== id);
  });
}

export function clearJournal() {
  mutate("Clear the journal", () => {
    const g = activeGame();
    if (g) g.journal = [];
  });
}

// --- the scene (SUM's arc) --------------------------------------------------
export function openScene(opener) {
  const scene = { id: uid("scene"), openedAt: Date.now(), opener: opener || "", interventions: [] };
  mutate("Open a scene", () => {
    const sc = currentScope();
    if (sc) sc.openScene = scene;
  });
  return scene;
}

export function addIntervention(text) {
  mutate("Intervention check", () => {
    const sc = currentScope();
    if (sc && sc.openScene) sc.openScene.interventions.push({ ts: Date.now(), text });
  });
}

export function closeScene() {
  let closed = null;
  mutate("Close the scene", () => {
    const sc = currentScope();
    if (sc && sc.openScene) { closed = sc.openScene; sc.openScene = null; }
  });
  return closed;
}

// The beat currently on the table, written so it survives a reload — and the
// same call closes it again once it has been judged. This is a re-record of
// something the player has already done (the roll took its own snapshot, and
// confirming happens inside `transact`), so like a preference it emits without
// pushing onto a capped undo stack: choosing a node inside one beat must not
// evict a real action.
export function markBeat(beat) {
  prefer(() => {
    const sc = currentScope();
    if (sc) sc.lastBeat = beat;
  });
}

// --- settings & theme -------------------------------------------------------
export function setSetting(key, value) {
  prefer((s) => { s.settings[key] = value; });
}

export function setTheme(theme) {
  prefer((s) => { s.theme = theme; });
}

export function setTextScale(scale) {
  prefer((s) => { s.textScale = scale; });
}

// --- export / import (a supported feature, not a debug hatch — §5.1) --------
export function exportJSON() {
  return JSON.stringify({ app: "unfolding-machines", exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  const incoming = parsed && parsed.state ? parsed.state : parsed;
  const next = normalize(incoming);
  if (!next.games.length) throw new Error("That file contains no games.");
  snapshot("Import");
  state = next;
  emit();
  return next.games.length;
}

// Data-integrity action: re-run normalization and report what moved (§14.1.9).
export function checkData() {
  const before = JSON.stringify(state);
  const after = normalize(JSON.parse(before));
  const changed = JSON.stringify(after) !== before;
  if (changed) {
    snapshot("Repair data");
    state = after;
    emit();
  }
  return {
    changed,
    games: after.games.length,
    scopes: after.games.reduce((n, g) => n + g.scopes.length, 0),
    entries: after.games.reduce((n, g) => n + g.journal.length, 0),
  };
}

export function resetAll() {
  snapshot("Reset everything");
  state = normalize({});
  emit();
}
