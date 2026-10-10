// Feature toggles. Every flag has a setter, a reader and a clearer (§10.14).
// The clearer for all of these is derived.normalize(), which restores the
// documented default for any flag missing or out of range in stored data.

import { getState, setSetting, setTheme, setTextScale } from "./store.js";

export const Settings = {
  // Disruption die (PUM p.9) — an explicitly optional rule, so it defaults OFF.
  // Defaults follow the fiction (§10.15): the book presents it as a variant you opt into.
  disruptionDie: () => !!getState().settings.disruptionDie,
  setDisruptionDie: (v) => setSetting("disruptionDie", !!v),

  // Widen the modified-proposal face range from 2 to 2-5 in a volatile situation.
  disruptionVolatile: () => !!getState().settings.disruptionVolatile,
  setDisruptionVolatile: (v) => setSetting("disruptionVolatile", !!v),

  // Enrichment is the book's default for descriptive and story oracles
  // ("roll 1d10 + 1d100"), so this defaults ON.
  autoEnrich: () => getState().settings.autoEnrich !== false,
  setAutoEnrich: (v) => setSetting("autoEnrich", !!v),

  // GUM is a separate book. The template defaults an expansion OFF (§8), but the
  // fiction here is that this player owns it — it was supplied to build against —
  // and a default-off toggle would make 1,580 extracted rows invisible (D-18).
  // Recorded as a deliberate deviation in CLAUDE.md §1.1; the toggle still exists
  // so a fork without the book can hide it.
  gum: () => getState().settings.gum !== false,
  setGum: (v) => setSetting("gum", !!v),

  // The per-screen "what this does" notes start EXPANDED and stay that way until
  // the player collapses one — then they stay collapsed everywhere. A stranger
  // reads the framing without having to know a fold is there; anyone who does
  // not want it silences it once, with the gesture they were already making.
  explainOpen: () => getState().settings.explainOpen !== false,
  setExplainOpen: (v) => setSetting("explainOpen", !!v),

  // Sound and vibration on rolls, crossed boxes, a sealed track and page turns.
  // Off by default: a play aid that makes noise unasked is one you stop opening.
  feel: () => !!getState().settings.feel,
  setFeel: (v) => setSetting("feel", !!v),

  // Simple view (the app's own, not a rule): a first game sees the tools a first
  // game needs — Yes or No among the oracles, no bias box, the main pages of
  // the Story and Setup — and every other tool is one "Show everything" away.
  // Nothing a book grants is removed: each screen that hides something says so
  // and offers the switch. It turns itself off once a first storyline is written.
  simple: () => !!getState().settings.simple,
  setSimple: (v) => setSetting("simple", !!v),

  seenTutorial: () => !!getState().settings.seenTutorial,
  setSeenTutorial: (v) => setSetting("seenTutorial", !!v),

  theme: () => getState().theme,
  setTheme: (t) => setTheme(t),

  textScale: () => getState().textScale,
  setTextScale: (n) => setTextScale(n),
};

export function applyTheme() {
  const t = Settings.theme();
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  root.style.setProperty("--scale", String(Settings.textScale()));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const dark = t === "dark" || t === "candle"
      || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    meta.setAttribute("content", t === "candle" ? "#211810" : dark ? "#1c1f28" : "#fffaf0");   // the header bar, which the status bar sits on
  }
}

export function cycleTheme() {
  const order = ["system", "light", "dark", "candle"];
  const next = order[(order.indexOf(Settings.theme()) + 1) % order.length];
  Settings.setTheme(next);
  applyTheme();
  return next;
}
