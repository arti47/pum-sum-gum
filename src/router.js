// Tab routing + section nav (two-level navigation, §6.3.1) + live-state badges.

import { el, add, clear, $ } from "./core.js";
import { clearActionBar, modal, closeModal } from "./ui.js";
import * as store from "./store.js";
import { crossed, trackLength, hasTrack, isResolved, isEnded, currentSection, sectionsOf } from "./derived.js";
import { plotSheet } from "./rules.js";
import { Settings } from "./settings.js";
import { cue } from "./feel.js";

// Three tabs a player sees: the Table, where play happens; the Story, which is
// the record of it — the journal and everything the plot reaches for; and Setup.
// Scene and Oracles are still routes of their own, but they are rooms off the
// Table rather than tabs beside it: you go to them from its three big buttons
// and come back, and the tab bar keeps the Table lit while you are there.
export const TABS = [
  { id: "play",    icon: "▤", label: "Table",   sections: ["track"] },
  { id: "scene",   icon: "◗", label: "Scene",   sections: ["arc", "sum"], parent: "play" },
  { id: "oracles", icon: "◇", label: "Ask",     sections: ["yesno", "descriptive", "story", "granular", "quantifiers"], parent: "play" },
  { id: "journal", icon: "✎", label: "Story",   sections: ["entries", "nodes", "cast", "files", "dice"] },
  { id: "more",    icon: "≡", label: "Setup",   sections: ["home", "forge", "tables", "library", "tutorial", "settings"], gatedSections: { forge: "gum" } },
];

// Simple view shows these pages in the strips; the rest are one "Show
// everything" away, and any of them can still be reached directly.
const SIMPLE = {
  oracles: ["yesno"],
  journal: ["entries", "nodes", "cast"],
  more: ["home", "tutorial", "settings"],
};

// Plot nodes, the cast and the files used to be sections of Play. They are
// pages of the Story now; an old route still lands on them.
const MOVED = { nodes: "journal", cast: "journal", files: "journal" };

const SECTION_LABELS = {
  track: "Plot track", nodes: "Plot nodes", cast: "Cast", files: "Files",
  forge: "Forge", tables: "My tables",
  seed: "Plot seed", world: "World", character: "Characters", grand: "Grand oracle",
  yesno: "Yes or No", descriptive: "Descriptive", story: "Story",
  granular: "Granular", quantifiers: "Quantifiers",
  arc: "This scene", sum: "Roll a table",
  entries: "Journal", dice: "Dice",
  home: "Home", library: "Rules", tutorial: "Tutorial", settings: "Settings",
};

let current = { tab: "play", section: "track" };
const renderers = new Map();

export function registerScreen(tab, fn) { renderers.set(tab, fn); }

// A tab's live sections: a gated one disappears with its toggle (§8).
export function liveSections(t) {
  if (!t.gatedSections) return t.sections;
  return t.sections.filter((s) => !t.gatedSections[s] || Settings[t.gatedSections[s]]());
}

export function go(tab, section = null) {
  if (tab === "play" && MOVED[section]) tab = MOVED[section];
  const t = TABS.find((x) => x.id === tab) || TABS[0];
  // A gated route reached directly explains itself rather than silently
  // redirecting (§8) — the screen renders and offers to switch the toggle on.
  current.tab = t.id;
  const live = liveSections(t);
  current.section = section && live.includes(section) ? section : live[0];
  render();
  const screen = $("#screen");
  if (screen) { screen.scrollTop = 0; window.scrollTo(0, 0); }
}

function goSection(section) { go(current.tab, section); }

// Simple view's way out, wherever it hides something.
export function showEverything(label = "Show everything") {
  return el("button", {
    class: "show-all",
    onclick: () => { Settings.setSimple(false); render(); },
  }, label);
}

// Live state that changes what to do next travels as a badge (§6.3.8).
function liveState() {
  const scope = store.currentScope();
  const game = store.activeGame();
  return {
    sceneOpen: !!(scope && scope.openScene),
    beatOpen: !!(scope && scope.lastBeat && scope.lastBeat.open),
    resolved: !!(scope && isEnded(scope)),
    needsStart: !!(scope && !scope.startingPoint),
    noGame: !game,
  };
}

export function renderTabs() {
  const bar = $("#tab-bar");
  clear(bar);
  const live = liveState();
  const here = (TABS.find((x) => x.id === current.tab) || {}).parent || current.tab;
  for (const t of TABS) {
    if (t.parent) continue;
    const btn = el("button", {
      onclick: () => go(t.id),
      "aria-current": here === t.id ? "page" : null,
      "aria-label": t.label,
    },
      el("span", { class: "ti", "aria-hidden": "true", "data-tab": t.id, text: t.icon }),
      el("span", { text: t.label })
    );
    const badge = t.id === "play" && (live.sceneOpen || live.beatOpen || live.resolved);
    if (badge) add(btn, el("span", { class: "badge", "aria-hidden": "true" }));
    add(bar, btn);
  }
}

export function sectionNav(tabId, activeSection, badges = {}) {
  const t = TABS.find((x) => x.id === tabId);
  if (!t || t.sections.length < 2) return null;
  const nav = el("nav", { class: "section-nav", "aria-label": t.label + " sections" });
  const simple = Settings.simple() && SIMPLE[tabId];
  const shown = liveSections(t).filter((s) => !simple || SIMPLE[tabId].includes(s) || s === activeSection);
  for (const s of shown) {
    const btn = el("button", {
      onclick: () => goSection(s),
      "data-s": s,
      "aria-current": s === activeSection ? "true" : "false",
    }, SECTION_LABELS[s] || s);
    if (badges[s]) add(btn, el("span", { class: "dot", "aria-hidden": "true" }));
    add(nav, btn);
  }
  if (simple && shown.length < liveSections(t).length) add(nav, showEverything());
  keepCurrentInView(nav);
  return nav;
}

// A strip that scrolls sideways hides its far end, and the far end is often
// the section you are on. Once the strip is in the document, bring the current
// one into view without moving the page.
export function keepCurrentInView(nav) {
  requestAnimationFrame(() => {
    const on = nav.querySelector('[aria-current="true"]');
    if (!on || !nav.isConnected) return;
    const left = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
    nav.scrollLeft = Math.max(0, left);
    fadeEdges(nav);
  });
  nav.addEventListener("scroll", () => fadeEdges(nav), { passive: true });
}

function fadeEdges(nav) {
  const max = nav.scrollWidth - nav.clientWidth;
  nav.classList.toggle("more-left", nav.scrollLeft > 2);
  nav.classList.toggle("more-right", nav.scrollLeft < max - 2);
}

// The header's drawn track opens the whole track, from any screen. The Table
// owns the track card, so it registers what a tap does.
let headerTap = null;
export function registerHeaderTap(fn) { headerTap = fn; }

// Inside a room, a sideways swipe turns to the next page of it — the next
// oracle, or the other half of the scene. Fields, result cards (which have
// swipes of their own) and the strips are left alone.
export function installRoomSwipe() {
  const screen = $("#screen");
  if (!screen) return;
  let x0 = null, y0 = 0, t0 = 0;
  screen.addEventListener("touchstart", (e) => {
    x0 = null;
    if (!document.body.classList.contains("in-room") || e.touches.length !== 1) return;
    if (e.target.closest("input, textarea, select, .result, .section-nav, .room-grip, .seg-grid")) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  screen.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - t0 > 700) return;
    const t = TABS.find((x) => x.id === current.tab);
    const live = t ? liveSections(t) : [];
    const next = live[live.indexOf(current.section) + (dx < 0 ? 1 : -1)];
    if (next) go(current.tab, next);
  }, { passive: true });
}

// Quick find, on a keyboard: Ctrl or ⌘ + K lists every page of the app by the
// name it already has, and typing narrows it.
function openQuickFind() {
  const input = el("input", { type: "text", placeholder: "Type a page's name" });
  const list = el("div", { class: "qf-list" });
  const pages = [];
  for (const t of TABS) {
    for (const sec of liveSections(t)) {
      pages.push({ tab: t.id, section: sec, name: SECTION_LABELS[sec] || sec,
        where: t.parent ? (TABS.find((x) => x.id === t.parent) || t).label + " · " + t.label : t.label });
    }
  }
  const draw = () => {
    clear(list);
    const q = input.value.trim().toLowerCase();
    for (const p of pages.filter((p) => !q || `${p.name} ${p.where}`.toLowerCase().includes(q))) {
      add(list, el("button", { class: "qf-item", onclick: () => { closeModal(); go(p.tab, p.section); } },
        el("strong", { text: p.name }), el("span", { class: "cite", text: p.where })));
    }
  };
  input.addEventListener("input", draw);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const first = list.querySelector("button"); if (first) { e.preventDefault(); first.click(); } }
  });
  draw();
  modal({
    title: "Find a page", className: "quick-find",
    body: el("div", null,
      el("p", { class: "muted", text: "Every page of the app by name. Enter opens the first." }),
      el("label", { class: "field" }, el("span", { class: "lbl", text: "Page" }), input),
      list),
    actions: [{ label: "Close" }],
  });
}

export function installQuickFind() {
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); openQuickFind(); }
  });
}

// The persistent plot header: the game's Threshold, on every in-play screen (§6.2).
function renderPlotHeader() {
  const host = $("#plot-header");
  clear(host);
  const scope = store.currentScope();
  const game = store.activeGame();
  const inPlay = !!(game && scope && current.tab !== "more");
  document.body.classList.toggle("in-play", inPlay);
  if (!inPlay) { host.hidden = true; return; }
  host.hidden = false;
  host.setAttribute("role", "button");
  host.tabIndex = 0;
  host.onclick = () => { if (headerTap) headerTap(); };
  host.onkeydown = (e) => { if ((e.key === "Enter" || e.key === " ") && headerTap) { e.preventDefault(); headerTap(); } };

  const sheet = plotSheet(scope.sheetId);
  const sec = currentSection(scope);
  const resolved = isEnded(scope);

  const row = el("div", { class: "ph-row" },
    el("span", { class: "ph-name", text: scope.name }),
    el("span", { class: "ph-sec" },
      resolved
        ? el("span", { class: "ph-resolved", text: isResolved(scope) ? "Resolved" : "Ended" })
        : (sec ? sec.name : (sheet ? sheet.name : "")),
      hasTrack(scope) ? " " : null,
      hasTrack(scope)
        ? el("span", { class: "ph-count", text: `${crossed(scope)}/${trackLength(scope)}` })
        : el("span", { class: "ph-count", text: "no track" })
    )
  );
  add(host, row);

  if (hasTrack(scope)) {
    const mini = el("div", { class: "ph-mini", "aria-hidden": "true" });
    const total = trackLength(scope);
    const done = crossed(scope);
    // Where one act ends and the next begins, so the drawn track reads as the
    // printed one does: sections, not one undifferentiated run of boxes.
    const starts = new Set();
    let at = 0;
    for (const sec of sectionsOf(scope)) { if (at) starts.add(at); at += sec.boxes; }
    for (let i = 0; i < total; i++) {
      const cls = ["", i < done ? "on" : "", scope.track.marks[String(i)] ? "mark" : "",
        starts.has(i) ? "act" : ""]
        .filter(Boolean).join(" ");
      add(mini, el("i", { class: cls }));
    }
    add(host, mini);
    host.setAttribute("aria-label",
      `Plot track: ${done} of ${total} boxes crossed${sec ? ", currently " + sec.name : ""}`);
  } else {
    host.setAttribute("aria-label", `${sheet ? sheet.name : "Plot sheet"}: no plot track`);
  }
}

// The last route drawn: a new route turns the page, a re-render of the same one
// (a click that changes something on it) does not.
let lastRoute = "";
let turnTimer = 0;
let lastRouteSeen = false;   // the first screen drawn is not a page turned

export function render() {
  const screen = $("#screen");
  clear(screen);
  const route = `${current.tab}/${current.section}`;
  if (route !== lastRoute) {
    lastRoute = route;
    screen.classList.remove("turn");
    // Only while the page is on screen: a hidden document pauses animations,
    // and a page turn frozen on its first frame is a screen drawn invisible.
    if (document.visibilityState === "visible") {
      void screen.offsetWidth;   // restart the animation
      screen.classList.add("turn");
      // …and take it off again on a timer, not on animationend: a page whose
      // compositor is not ticking never finishes an animation, and controls
      // left mid-animation are never still enough to press.
      clearTimeout(turnTimer);
      turnTimer = setTimeout(() => screen.classList.remove("turn"), 260);
      if (lastRouteSeen) cue("page");
      lastRouteSeen = true;
    }
  }
  clearActionBar();
  const fn = renderers.get(current.tab);
  renderTabs();
  renderPlotHeader();
  // The route, as a hook for the per-tab engraving beside each screen's title.
  document.body.dataset.tab = current.tab;
  // Ask and Scene are rooms off the Table, drawn as a sheet risen over it.
  const room = !!(TABS.find((x) => x.id === current.tab) || {}).parent;
  document.body.classList.toggle("in-room", room);
  document.body.classList.remove("in-prep");
  // A help sheet raised over the last screen goes with it.
  document.querySelectorAll("body > #help-drawer").forEach((d) => d.remove());
  document.body.classList.remove("help-up");
  document.body.dataset.section = current.section || "";
  if (fn) fn(screen, current.section);
  gatherHelp(screen);
  const sub = $("#brand-sub");
  const game = store.activeGame();
  if (sub) sub.textContent = game ? game.title : "PUM v9 · SUM v8";
}

// One help drawer per screen, at its foot. Every screen's teaching folds —
// "What this does", "Which do I need?", the track-and-beats loop — used to sit
// wherever each renderer put them, open above the content on some tabs and
// below it on others. They are gathered here after the screen is drawn, so no
// renderer has to know about the drawer and every screen ends the same way:
// the screen's own work first, then the help. The folds keep their shared
// open state (closed for good the first time one is closed), and every word
// in them is unchanged.
function gatherHelp(screen) {
  const btn = $("#btn-help");
  const folds = [...screen.querySelectorAll(":scope > details.explain:not(.stay), :scope > details.which, :scope > details.loop-fold")];
  if (btn) btn.hidden = !folds.length;
  if (!folds.length) return;
  // Folded to one line: the screen is for playing, and its teaching is a tap
  // away — here, or from the ? in the header — rather than a page of prose
  // under every screen.
  const drawer = document.createElement("details");
  drawer.className = "help-drawer";
  drawer.id = "help-drawer";
  const head = document.createElement("summary");
  head.className = "help-head";
  head.textContent = "Help on this screen";
  drawer.append(head, ...folds);
  screen.append(drawer);
}

// The ? in the header opens the screen's help and brings it into view.
// It rises as a sheet over the screen rather than sending you to its foot; its
// own line, or a tap outside it, puts it back.
export function openHelp() {
  const drawer = document.getElementById("help-drawer");
  if (!drawer) return;
  drawer.open = true;
  drawer.classList.add("as-sheet");
  document.body.classList.add("help-up");
  // Lifted out of the screen while it is up, so nothing on the page — the tab
  // bar included — can sit over it; put back where it was when it closes.
  const home = drawer.parentNode, before = drawer.nextSibling;
  document.body.append(drawer);
  const settle = () => {
    if (drawer.open) return;
    drawer.removeEventListener("toggle", settle);
    drawer.classList.remove("as-sheet");
    document.body.classList.remove("help-up");
    if (home && home.isConnected) home.insertBefore(drawer, before && before.parentNode === home ? before : null);
    else drawer.remove();
  };
  drawer.addEventListener("toggle", settle);
  setTimeout(() => {
    const away = (e) => {
      if (drawer.contains(e.target)) return;
      drawer.open = false;
      settle();
      document.removeEventListener("pointerdown", away, true);
    };
    document.addEventListener("pointerdown", away, true);
  }, 0);
}
