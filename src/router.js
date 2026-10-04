// Tab routing + section nav (two-level navigation, §6.3.1) + live-state badges.

import { el, add, clear, $ } from "./core.js";
import { clearActionBar } from "./ui.js";
import * as store from "./store.js";
import { crossed, trackLength, hasTrack, isResolved, isEnded, currentSection, sectionsOf } from "./derived.js";
import { plotSheet } from "./rules.js";
import { Settings } from "./settings.js";

export const TABS = [
  { id: "play",    icon: "▤", label: "Play",    sections: ["track", "nodes", "cast", "files"] },
  { id: "scene",   icon: "◗", label: "Scene",   sections: ["arc", "explore", "battle", "discovery", "people"] },
  { id: "oracles", icon: "◇", label: "Oracles", sections: ["yesno", "descriptive", "story", "granular", "quantifiers"] },
  { id: "journal", icon: "✎", label: "Journal", sections: ["entries", "dice"] },
  // The Forge is prep, not play: it lives under More so the tab bar stays five
  // wide. At 320px six tabs are 53px each; five are 64px, and the tab bar is the
  // most-used control in the app.
  { id: "more",    icon: "≡", label: "More",    sections: ["home", "forge", "tables", "library", "tutorial", "settings"], gatedSections: { forge: "gum" } },
];

const SECTION_LABELS = {
  track: "Plot track", nodes: "Plot nodes", cast: "Cast", files: "Files",
  forge: "Forge", tables: "My tables",
  seed: "Plot seed", world: "World", character: "Characters", grand: "Grand oracle",
  yesno: "Yes or No", descriptive: "Descriptive", story: "Story",
  granular: "Granular", quantifiers: "Quantifiers",
  arc: "Scene arc", explore: "Exploration", battle: "Battle",
  discovery: "Discovery", people: "Characters",
  entries: "Entries", dice: "Dice",
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
  for (const t of TABS) {
    const btn = el("button", {
      onclick: () => go(t.id),
      "aria-current": current.tab === t.id ? "page" : null,
      "aria-label": t.label,
    },
      el("span", { class: "ti", "aria-hidden": "true", "data-tab": t.id, text: t.icon }),
      el("span", { text: t.label })
    );
    const badge = (t.id === "scene" && live.sceneOpen)
      || (t.id === "play" && (live.beatOpen || live.resolved));
    if (badge) add(btn, el("span", { class: "badge", "aria-hidden": "true" }));
    add(bar, btn);
  }
}

export function sectionNav(tabId, activeSection, badges = {}) {
  const t = TABS.find((x) => x.id === tabId);
  if (!t || t.sections.length < 2) return null;
  const nav = el("nav", { class: "section-nav", "aria-label": t.label + " sections" });
  for (const s of liveSections(t)) {
    const btn = el("button", {
      onclick: () => goSection(s),
      "aria-current": s === activeSection ? "true" : "false",
    }, SECTION_LABELS[s] || s);
    if (badges[s]) add(btn, el("span", { class: "dot", "aria-hidden": "true" }));
    add(nav, btn);
  }
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
    }
  }
  clearActionBar();
  const fn = renderers.get(current.tab);
  renderTabs();
  renderPlotHeader();
  // The route, as a hook for the per-tab engraving beside each screen's title.
  document.body.dataset.tab = current.tab;
  document.body.dataset.section = current.section || "";
  if (fn) fn(screen, current.section);
  const sub = $("#brand-sub");
  const game = store.activeGame();
  if (sub) sub.textContent = game ? game.title : "PUM v9 · SUM v8";
}
