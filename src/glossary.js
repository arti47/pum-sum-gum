// The vocabulary layer — under `explain()` (what this screen does) and under the
// rules library (what this rule does). Both of those are written for a reader who
// already knows what a plot node, a register or a beat IS. This is the layer that
// does not assume that.
//
// The glossary itself lives in data-rules-library.js beside the rules, and is
// rendered on More → Rules. This module does the two things that make it reach
// the player rather than waiting to be looked up:
//
//   · `openTerm(id)` — a deep link that expands and scrolls to one entry;
//   · `installGlossary()` — registers a decorator so that EVERY `explain()` in
//     the app grows chips for the jargon its own text uses. Registered once at
//     boot, so no screen has to opt in and none can forget.

import { el, add } from "./core.js";
import { registerExplainDecorator } from "./ui.js";
import { GLOSSARY, GLOSSARY_INDEX } from "../data-rules-library.js";

// Longest alias first, so "plot node" wins over "node" and one phrase is never
// counted twice. Matching is on word boundaries, so "scope" cannot fire inside
// "telescope".
const ALIASES = [...GLOSSARY_INDEX.keys()].sort((a, b) => b.length - a.length);

// A chip row is a teaching aid, not an index: past four or five it stops reading
// as help and starts reading as clutter.
const MAX_CHIPS = 5;

function termsIn(text, limit = MAX_CHIPS) {
  let masked = " " + String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ") + " ";
  const found = new Map();               // id -> first position in the text
  for (const alias of ALIASES) {
    const needle = " " + alias.replace(/[^a-z0-9]+/g, " ").trim() + " ";
    const at = masked.indexOf(needle);
    if (at < 0) continue;
    const id = GLOSSARY_INDEX.get(alias);
    if (!found.has(id)) found.set(id, at);
    // Blank the match so a shorter alias inside it cannot match again.
    masked = masked.slice(0, at) + " ".repeat(needle.length) + masked.slice(at + needle.length);
  }
  // Reading order, not alias-length order: the chips should track the sentence.
  return [...found.entries()].sort((a, b) => a[1] - b[1]).slice(0, limit).map((e) => e[0]);
}

function glossaryEntry(id) {
  return GLOSSARY.find((e) => e.id === id) || null;
}

function chipRow(text) {
  const ids = termsIn(text);
  if (!ids.length) return null;
  const row = el("div", { class: "term-row" });
  add(row, el("span", { class: "term-lead", text: "Words used here:" }));
  for (const id of ids) {
    const e = glossaryEntry(id);
    if (!e) continue;
    add(row, el("button", {
      class: "chip term",
      "aria-label": `What does “${e.term}” mean?`,
      onclick: () => openTermFn(id),
    }, e.term));
  }
  return row;
}

// screens.js owns the Rules screen and the pending-term state, so it supplies the
// navigation. Registered rather than imported: glossary.js is below screens.js in
// the module order and must not reach back up (§10 D-19).
let openTermFn = () => {};

export function installGlossary({ openTerm }) {
  openTermFn = openTerm;
  registerExplainDecorator(chipRow);
}
