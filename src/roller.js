// The engine: oracle rolls, plot beats, node invocation, both bias mechanics,
// the disruption cascade. Every roll is produced once, stored, and journalled.

import { die, d10, d100 } from "./core.js";
import {
  rangeLookup, yesNoAnswer, granularLookup, oracle, oracleFamily, enrichmentFor,
  pairedLookup, proposalAt, promptAt, abcd, plotSheet, sumTable, gumTable, gumRow,
} from "./rules.js";
import { nodeDie, nodeList, slotForRoll, slotRange, nodeSlots, nodeUnavailableReason }
  from "./derived.js";
import { Settings } from "./settings.js";
import * as store from "./store.js";
import { DISRUPTION } from "../data-pum-plot.js";

// A die record renders as a face chip: { label, value, kept, size }.
const D = (label, value, size, kept = true) => ({ label, value, size, kept });

// ---------------------------------------------------------------------------
// Yes / No — PUM bias: roll twice, THE PLAYER picks (ruling A4).
// Returns both options and commits neither; the caller commits on tap.
// ---------------------------------------------------------------------------
export function rollYesNo({ register = "deterministic", bias = false, question = "" } = {}) {
  const rolls = bias ? [d10(), d10()] : [d10()];
  const options = rolls.map((r) => ({ roll: r, answer: yesNoAnswer(register, r) }));
  return {
    kind: "yesno", register, question, bias,
    options,
    dice: options.map((o, i) => D(bias ? `d10 #${i + 1}` : "d10", o.roll, 10)),
    needsChoice: bias,
    disruption: maybeDisrupt(),
  };
}

// ---------------------------------------------------------------------------
// Granular Yes / No — d100 against a declared likelihood band (PUM p.24).
// ---------------------------------------------------------------------------
export function rollGranular({ register = "deterministic", band = "neutral", question = "" } = {}) {
  const roll = d100();
  return {
    kind: "granular", register, band, question,
    roll,
    answer: granularLookup(register, band, roll),
    dice: [D("d100", roll, 100)],
    disruption: maybeDisrupt(),
  };
}

// ---------------------------------------------------------------------------
// Descriptive / story / quantifier oracles — 1d10, enriched by 1d100 (PUM p.8).
// ---------------------------------------------------------------------------
export function rollOracle({ oracleId, question = "", enrich = null } = {}) {
  const table = oracle(oracleId);
  if (!table) throw new Error("Unknown oracle " + oracleId);
  const family = oracleFamily(oracleId);
  const roll = d10();
  const out = {
    kind: "oracle", oracleId, family, question,
    name: table.name, sub: table.question,
    roll, answer: table.rows[roll - 1],
    dice: [D("d10", roll, 10)],
    enrichment: null,
    // Quantifiers, Description and Focus are excluded from the disruption die (PUM p.9).
    disruption: family === "quantifier" ? null : maybeDisrupt(),
  };
  const enrichTable = enrichmentFor(family);
  const wantEnrich = enrich === null ? Settings.autoEnrich() : enrich;
  if (enrichTable && wantEnrich) {
    const eroll = d100();
    out.enrichment = {
      name: enrichTable.name, sub: enrichTable.question,
      roll: eroll, word: pairedLookup(enrichTable, eroll),
    };
    out.dice.push(D("d100", eroll, 100));
  }
  return out;
}

// Roll only the enrichment word for an oracle answer that has none. PUM p.4
// makes the d100 part of the rule, so with auto-enrich switched off the player
// still needs a way to reach it for the one answer in front of them.
export function enrichOracle(result) {
  const table = enrichmentFor(result.family);
  if (!table || result.enrichment) return result;
  const roll = d100();
  return {
    ...result,
    enrichment: {
      name: table.name, sub: table.question,
      roll, word: pairedLookup(table, roll),
    },
    dice: [...result.dice, D("d100", roll, 100)],
  };
}

// ---------------------------------------------------------------------------
// SUM tables — the Rule of Bias is MECHANICAL here: keep low or keep high.
// ---------------------------------------------------------------------------
export function rollSum({ tableId, bias = "none" } = {}) {
  const table = sumTable(tableId);
  if (!table) throw new Error("Unknown SUM table " + tableId);
  const size = table.die;
  const rolls = bias === "none" ? [die(size)] : [die(size), die(size)];
  let kept = rolls[0];
  if (bias === "low") kept = Math.min(...rolls);
  if (bias === "high") kept = Math.max(...rolls);
  return {
    kind: "sum", tableId, table, bias,
    rolls, kept,
    answer: rangeLookup(table.rows, kept),
    dice: rolls.map((r, i) => D(`d${size}${rolls.length > 1 ? " #" + (i + 1) : ""}`, r, size, r === kept && rolls.indexOf(kept) === i)),
  };
}

// ---------------------------------------------------------------------------
// GUM — prep-time generators. Plain 1..N lists, no bias rule of their own; the
// book's method is to roll several and read them together (GUM p.3).
// ---------------------------------------------------------------------------
export function rollGum({ tableId } = {}) {
  const table = gumTable(tableId);
  if (!table) throw new Error("Unknown GUM table " + tableId);
  const roll = die(table.die);
  return {
    kind: "gum", tableId, table, roll,
    answer: gumRow(table, roll),
    dice: [D(`d${table.die}`, roll, table.die)],
  };
}

// Several tables read together as one result — the book's core technique.
export function rollGumSet(tableIds) {
  const parts = tableIds.map((id) => rollGum({ tableId: id }));
  return {
    kind: "gum-set", parts,
    dice: parts.flatMap((p) => p.dice),
  };
}

// ---------------------------------------------------------------------------
// Plot beats.
// ---------------------------------------------------------------------------
export function rollProposal() {
  const roll = d10();
  const text = proposalAt(roll);
  const last = lastBeatKey();
  return {
    kind: "beat", beatType: "proposal", roll, text,
    dice: [D("d10", roll, 10)],
    repeat: last === "proposal:" + roll,
    key: "proposal:" + roll,
  };
}

// A random prompt is 1d10 on the sheet's own column. It either names an ABCD
// event or invokes a plot node; the node roll is a SECOND die (PUM p.6).
export function rollPrompt(scope, { force = false } = {}) {
  const sheet = plotSheet(scope.sheetId);
  const roll = d10();
  const prompt = promptAt(sheet, roll, scope.customPrompts);
  const last = lastBeatKey();
  const out = {
    kind: "beat", beatType: "prompt", roll,
    text: prompt ? prompt.label : "(empty prompt slot)",
    prompt,
    dice: [D("d10", roll, 10)],
    repeat: last === "prompt:" + roll,
    key: "prompt:" + roll,
    event: null, node: null,
  };
  if (!prompt) return out;
  if (prompt.event) {
    const sub = abcd(prompt.event);
    const eroll = d10();
    out.event = {
      letter: sub.letter, name: sub.name, roll: eroll, text: sub.rows[eroll - 1], blurb: sub.blurb,
    };
    out.dice.push(D(`d10 ${sub.letter}`, eroll, 10));
  } else if (prompt.node) {
    out.node = invokeNode(scope, prompt.node, { force });
    out.dice.push(...out.node.dice);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Node invocation. An empty slot is a Permission, not a dead end: the caller is
// handed add / choose / reroll. `force` is the Compulsion — "leave it to
// destiny" re-rolls until a written entry comes up (PUM p.6).
// ---------------------------------------------------------------------------
export function invokeNode(scope, categoryId, { force = false, chosen = null } = {}) {
  const slots = nodeSlots(scope, categoryId);
  const list = nodeList(scope, categoryId);

  if (chosen !== null && chosen !== undefined) {
    // Deliberate invocation bypasses the die entirely (PUM p.9).
    return {
      categoryId, slots, chosen: true, slot: chosen,
      text: list[chosen] || "", empty: !(list[chosen] || "").trim(),
      dice: [], die: null, rolls: [],
    };
  }

  if (slots === 0) {
    return {
      categoryId, slots: 0, slot: -1, text: "", empty: true, unavailable: true,
      reason: nodeUnavailableReason(scope, categoryId),
      dice: [], die: null, rolls: [],
    };
  }

  const size = nodeDie(scope, categoryId);
  const rolls = [];
  let slot, text;
  const filled = list.some((s) => s && s.trim());
  do {
    const r = die(size);
    rolls.push(r);
    slot = slotForRoll(r);
    text = (list[slot] || "").trim();
    // Guard the compulsion so an all-empty list cannot loop forever.
  } while (force && filled && !text && rolls.length < 100);

  return {
    categoryId, slots, slot, text, empty: !text,
    die: size, rolls,
    forced: force,
    dice: rolls.map((r, i) => D(`d${size}${rolls.length > 1 ? " #" + (i + 1) : ""}`, r, size, i === rolls.length - 1)),
    range: slotRange(slot),
  };
}

// ---------------------------------------------------------------------------
// The disruption die — a Cascade, capped at one disruption per oracle roll.
// ---------------------------------------------------------------------------
function maybeDisrupt() {
  if (!Settings.disruptionDie()) return null;
  const roll = d10();
  const max = Settings.disruptionVolatile()
    ? DISRUPTION.proposalFaceMaxVolatile
    : DISRUPTION.proposalFaceMaxDefault;
  let fires = null;
  if (roll === DISRUPTION.promptFace) fires = "prompt";
  else if (roll >= DISRUPTION.proposalFaceMin && roll <= max) fires = "proposal";
  return { roll, fires, die: D("disruption d10", roll, 10, !!fires) };
}

function lastBeatKey() {
  const sc = store.currentScope();
  return sc && sc.lastBeat ? sc.lastBeat.key : null;
}

// ---------------------------------------------------------------------------
// Journal writes — exactly one entry per roll (§5.2).
// ---------------------------------------------------------------------------
export function diceText(dice) {
  return dice.map((d) => `${d.label} ${d.value}${d.kept === false ? " (dropped)" : ""}`).join(" · ");
}

export function journalRoll(result, extra = {}) {
  const sc = store.currentScope();
  const sceneId = sc && sc.openScene ? sc.openScene.id : null;
  return store.addJournal({
    kind: extra.kind || result.kind,
    title: extra.title || "",
    detail: extra.detail || "",
    dice: journalDice(result),
    sceneId,
    linkedTo: extra.linkedTo || null,
    pick: extra.pick || null,
  });
}

// The dice an entry records: every die the roll threw, the disruption d10
// included — it is a roll like any other, and the ledger's claim is that every
// roll is journalled with its dice. It is marked kept whether or not it fired,
// since "not kept" in the journal means a die the Rule of Bias dropped.
export function journalDice(result) {
  const dice = (result.dice || []).map((d) => ({ label: d.label, value: d.value, kept: d.kept }));
  if (result.disruption) dice.push({ label: result.disruption.die.label, value: result.disruption.roll, kept: true });
  return dice;
}
