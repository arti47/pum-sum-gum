// The oracle console: Yes/No, descriptive, story, granular, quantifiers.

import { el, add, announce } from "./core.js";
import { explain, actionBar, resultCard, toast, promptModal, noGameNotice } from "./ui.js";
import * as store from "./store.js";
import { rollYesNo, rollGranular, rollOracle, enrichOracle, journalRoll, diceText, rollProposal, rollPrompt }
  from "./roller.js";
import { yesNoRegisters, granularBands, enrichmentFor } from "./rules.js";
import { sectionNav, render, go } from "./router.js";
import { openRule } from "./screens.js";
import { DESCRIPTIVE, STORY, QUANTIFIERS } from "../data-pum-oracles.js";
import { NO_TASK_RESOLUTION } from "../data-guidance.js";
import { setOpenBeat } from "./sheet.js";
import { registerClearer } from "./viewstate.js";
import { coachStrip } from "./coach.js";

// The last result, held so a re-render never re-rolls it.
let last = null;
let ynRegister = "deterministic";
let ynBias = false;
let grBand = "neutral";
let question = "";

export function renderOracles(host, section) {
  add(host, sectionNav("oracles", section));
  add(host, el("h1", { text: "Oracles" }));
  add(host, explain([
    "Ask a question, pick the oracle that fits, and read the answer as inspiration rather than instruction.",
    NO_TASK_RESOLUTION,
    "Dislike an answer? Re-roll it, ignore it, or read it against the grain. The journal keeps both rolls either way.",
  ], "no-resolution", openRule));

  if (store.activeGame()) add(host, coachStrip());

  if (!store.activeGame()) {
    add(host, noGameNotice({
      what: "any oracle here",
      onPrepare: () => go("more", "home"),
      onWalkthrough: () => go("more", "tutorial"),
    }));
  }

  const q = el("input", { type: "text", placeholder: "What are you asking? (optional)", value: question });
  q.addEventListener("input", () => { question = q.value; });
  add(host, el("label", { class: "field" },
    el("span", { class: "lbl", text: "Your question" }), q
  ));

  if (last) add(host, renderLast());

  if (section === "yesno") return renderYesNo(host);
  if (section === "granular") return renderGranular(host);
  if (section === "quantifiers") return renderList(host, QUANTIFIERS, "Quantifiers",
    "Set a baseline value in your head before rolling — the table answers relative to it.");
  if (section === "story") return renderList(host, STORY, "Story oracles",
    "Plot-related answers, enriched with a Focus word.");
  return renderList(host, DESCRIPTIVE, "Descriptive oracles",
    "What your characters can perceive, enriched with a Description word.");
}

// --- Yes / No ---------------------------------------------------------------
function renderYesNo(host) {
  const card = el("div", { class: "card" });
  add(card, el("h2", { text: "Yes or No" }));
  add(card, el("p", { class: "muted", text: "Three registers of the same question — pick the one that matches who is answering." }));

  for (const reg of yesNoRegisters()) {
    add(card, el("label", { class: "check" },
      el("input", {
        type: "radio", name: "ynreg", checked: ynRegister === reg.id || undefined,
        onchange: () => { ynRegister = reg.id; },
      }),
      el("span", { class: "ct" }, el("strong", { text: reg.name }), el("small", { text: reg.blurb }))
    ));
  }

  add(card, el("label", { class: "check" },
    el("input", {
      type: "checkbox", checked: ynBias || undefined,
      onchange: (e) => { ynBias = e.target.checked; },
    }),
    el("span", { class: "ct" },
      el("strong", { text: "I have a bias" }),
      el("small", { text: "Roll twice and pick the answer that fits best — your call, not the machine's." })
    )
  ));
  add(host, card);

  actionBar({
    label: "Ask",
    ariaLabel: `Ask the Yes or No oracle — 1d10, ${ynRegister} register${ynBias ? ", with bias: roll twice and pick" : ""}`,
    context: `1d10 · ${ynRegister}${ynBias ? " · bias" : ""}`,
    onClick: () => {
      const r = rollYesNo({ register: ynRegister, bias: ynBias, question });
      commit(r, r.needsChoice
        ? { title: `Yes/No (${ynRegister}) — bias, awaiting your pick`, detail: r.options.map((o) => `${o.roll}: ${o.answer}`).join(" | ") }
        : { title: `Yes/No (${ynRegister}) — ${r.options[0].answer}`, detail: question });
      if (!r.needsChoice) announce(r.options[0].answer);
    },
  });
}

// --- granular ---------------------------------------------------------------
function renderGranular(host) {
  const card = el("div", { class: "card" });
  add(card, el("h2", { text: "Granular Yes or No" }));
  add(card, el("p", { class: "muted", text: "The finer-grained variant. Declare how likely the answer is, then roll d100 against that column." }));

  for (const reg of yesNoRegisters()) {
    add(card, el("label", { class: "check" },
      el("input", {
        type: "radio", name: "grreg", checked: ynRegister === reg.id || undefined,
        onchange: () => { ynRegister = reg.id; },
      }),
      el("span", { class: "ct" }, el("strong", { text: reg.name }))
    ));
  }

  const bandRow = el("div", { class: "btn-grid" });
  for (const b of granularBands()) {
    add(bandRow, el("button", {
      class: `btn small ${grBand === b ? "primary" : ""}`.trim(),
      onclick: () => { grBand = b; render(); },
    }, b));
  }
  add(card, el("h3", { text: "How likely is a yes?" }));
  add(card, bandRow);
  add(host, card);

  actionBar({
    label: "Ask",
    ariaLabel: `Ask the granular Yes or No oracle — 1d100, ${ynRegister} register, a yes is ${grBand}`,
    context: `1d100 · ${ynRegister} · ${grBand}`,
    onClick: () => {
      const r = rollGranular({ register: ynRegister, band: grBand, question });
      commit(r, { title: `Granular (${ynRegister}, ${grBand}) — ${r.answer}`, detail: question });
      announce(r.answer);
    },
  });
}

// --- oracle lists -----------------------------------------------------------
function renderList(host, tables, title, blurb) {
  const card = el("div", { class: "card" });
  add(card, el("h2", { text: title }));
  add(card, el("p", { class: "muted", text: blurb }));
  const grid = el("div", { class: "btn-grid" });
  for (const t of tables) {
    add(grid, el("button", {
      class: "btn",
      // The label is two lines of markup, so its own text reads back as one run
      // -on word ("Someonewho", "Objectwhat for"). Name it properly.
      "aria-label": `${t.name}${t.question ? " — " + t.question : ""}`,
      onclick: () => {
        const r = rollOracle({ oracleId: t.id, question });
        const second = r.enrichment ? `${r.enrichment.name}: ${r.enrichment.word}` : "";
        commit(r, {
          title: `${t.name} (${t.question}) — ${r.answer}`,
          detail: [question, second].filter(Boolean).join(" · "),
        });
        announce(`${r.answer}${second ? ", " + second : ""}`);
      },
    },
      el("span", null, el("strong", { text: t.name }),
        el("small", { style: "display:block;font-weight:400;color:var(--ink-3)", text: t.question || "" }))
    ));
  }
  add(card, grid);
  add(host, card);
}

// --- result -----------------------------------------------------------------
function commit(result, journal) {
  const entry = journalRoll(result, journal);
  last = { result, entryId: entry.id };
  render();
}

function renderLast() {
  const { result, entryId } = last;
  const wrap = el("div");

  if (result.kind === "yesno" && result.needsChoice) {
    // PUM bias: both answers offered, neither committed until the player taps one.
    const chips = el("div", { class: "chip-row" });
    for (const o of result.options) {
      add(chips, el("button", {
        class: "chip",
        onclick: () => {
          store.updateJournal(entryId, {
            title: `Yes/No (${result.register}) — ${o.answer}`,
            detail: `Chose ${o.roll} of ${result.options.map((x) => x.roll).join(" and ")}`,
          });
          last = { result: { ...result, needsChoice: false, chosen: o }, entryId };
          announce(o.answer);
          render();
        },
      },
        el("span", { class: "cd", text: `d10 ${o.roll}` }),
        el("span", { class: "cv", text: o.answer })
      ));
    }
    add(wrap, resultCard({
      kind: "Yes or No · bias",
      question: result.question,
      answer: "Two answers — you pick",
      second: "PUM's bias rule hands the choice to you, not to the machine.",
      dice: result.dice,
      extra: chips,
      actions: rerollActions(result),
    }));
    add(wrap, disruptionBlock(result));
    return wrap;
  }

  let kind = "Oracle", answer = "", second = null;
  if (result.kind === "yesno") {
    kind = `Yes or No · ${result.register}`;
    answer = result.chosen ? result.chosen.answer : result.options[0].answer;
  } else if (result.kind === "granular") {
    kind = `Granular · ${result.register} · ${result.band}`;
    answer = result.answer;
  } else {
    kind = `${result.name} · ${result.sub}`;
    answer = result.answer;
    if (result.enrichment) {
      second = el("span", null,
        el("span", { class: "cite", text: `${result.enrichment.name} ${result.enrichment.roll} — ` }),
        el("strong", { text: result.enrichment.word })
      );
    }
  }

  add(wrap, resultCard({
    kind, answer, second,
    question: result.question,
    dice: result.dice,
    actions: rerollActions(result),
  }));
  add(wrap, beatTriggerCard(result));
  add(wrap, disruptionBlock(result));
  return wrap;
}

// The two beat triggers a Yes/No answer can satisfy (PUM p.28). Offered, never
// fired: the app cannot know which question was asked, so the player decides
// whether the trigger applies.
function beatTriggerCard(result) {
  if (result.kind !== "yesno") return null;
  const answered = result.chosen ? result.chosen.answer : result.options[0].answer;
  if (result.needsChoice) return null;
  const scope = store.currentScope();
  if (!scope) return null;

  const card = el("div", { class: "card" });
  add(card, el("div", { class: "card-head" },
    el("h3", { text: "Does this call for a beat?" }),
    el("span", { class: "cite", text: "PUM p.28" })
  ));
  add(card, el("p", { class: "muted", text: `You were answered "${answered}". The cheat sheet turns two kinds of answer straight into a plot beat — if that is the question you asked.` }));
  const row = el("div", { class: "btn-row" });
  add(row, el("button", {
    class: "btn",
    onclick: () => fireBeatFromOracle("prompt", "asked if something happens, and PUM said yes"),
  }, "It said yes — random prompt"));
  add(row, el("button", {
    class: "btn",
    onclick: () => fireBeatFromOracle("proposal", "asked if things go as expected, and PUM said no"),
  }, "It said no — modified proposal"));
  add(card, row);
  return card;
}

function fireBeatFromOracle(kind, why) {
  const scope = store.currentScope();
  if (!scope) { toast("Prepare a game first."); return; }
  const beat = kind === "prompt" ? rollPrompt(scope) : rollProposal();
  const entry = journalRoll(beat, {
    kind: "beat",
    title: `${kind === "prompt" ? "Random prompt" : "Modified proposal"} — ${beat.text}`,
    detail: `Triggered because you ${why}. ${diceText(beat.dice)}`,
    linkedTo: last ? last.entryId : null,
  });
  setOpenBeat({ ...beat, journalId: entry.id });
  store.setLastBeat({ key: beat.key, text: beat.text, open: true });
  go("play", "track");
}

function rerollActions(result) {
  const actions = [];
  // PUM p.4 rolls the d100 enrichment word with every descriptive or story
  // answer. Auto-enrich can be switched off in Settings, and before this there
  // was no way back to the rule for a single answer: the engine took an
  // `enrich` flag no surface ever set.
  if (result.kind === "oracle" && !result.enrichment && enrichmentFor(result.family)) {
    actions.push({
      label: "Enrich it",
      onClick: () => {
        const enriched = enrichOracle(result);
        if (!enriched.enrichment) return;
        store.updateJournal(last.entryId, {
          detail: `${question}${question ? " — " : ""}${enriched.enrichment.name} ${enriched.enrichment.roll}: ${enriched.enrichment.word}`,
          dice: enriched.dice.map((d) => ({ label: d.label, value: d.value, kept: d.kept })),
        });
        last = { result: enriched, entryId: last.entryId };
        announce(`${enriched.enrichment.name}: ${enriched.enrichment.word}`);
        render();
      },
    });
  }
  return actions.concat([
    {
      label: "Re-roll",
      onClick: () => {
        // Never silently: the new roll is journalled and linked to the old one.
        const prev = last.entryId;
        if (result.kind === "yesno") {
          const r = rollYesNo({ register: result.register, bias: result.bias, question });
          commitLinked(r, prev, `Yes/No (${result.register}) — re-rolled`);
        } else if (result.kind === "granular") {
          const r = rollGranular({ register: result.register, band: result.band, question });
          commitLinked(r, prev, `Granular — re-rolled: ${r.answer}`);
        } else {
          const r = rollOracle({ oracleId: result.oracleId, question });
          commitLinked(r, prev, `${r.name} — re-rolled: ${r.answer}`);
        }
      },
    },
    {
      label: "Note it",
      onClick: () => promptModal({
        // no-inspire: a note interprets the answer you already have.
        title: "Note this answer",
        label: "How did you read it?",
        multiline: true,
        onSubmit: (v) => { if (v) store.updateJournal(last.entryId, { note: v }); toast("Noted."); },
      }),
    },
    {
      label: "Dismiss",
      onClick: () => { last = null; render(); },
    },
  ]);
}

function commitLinked(result, previousId, title) {
  const entry = journalRoll(result, { title, detail: question, linkedTo: previousId });
  last = { result, entryId: entry.id };
  render();
}

// The disruption cascade: an oracle roll can fire a plot beat (PUM p.9).
function disruptionBlock(result) {
  const d = result.disruption;
  if (!d) return null;
  const card = el("div", { class: "card" });
  add(card, el("div", { class: "card-head" },
    el("h3", { text: "Disruption die" }),
    el("span", { class: "pill on", text: `d10 ${d.roll}` })
  ));
  if (!d.fires) {
    add(card, el("p", { class: "muted", text: "Nothing interrupts. Read your answer and play on." }));
    return card;
  }
  add(card, el("p", null,
    el("strong", { text: d.fires === "prompt" ? "A random prompt interrupts." : "A modified proposal alters the scene." }),
    " Read your answer first, then resolve this."
  ));
  add(card, el("button", {
    class: "btn primary wide",
    onclick: () => {
      const scope = store.currentScope();
      if (!scope) { toast("Prepare a game first."); return; }
      const beat = d.fires === "prompt" ? rollPrompt(scope) : rollProposal();
      const entry = journalRoll(beat, {
        kind: "beat",
        title: `Disruption → ${d.fires === "prompt" ? "random prompt" : "modified proposal"} — ${beat.text}`,
        detail: diceText(beat.dice),
      });
      setOpenBeat({ ...beat, journalId: entry.id });
      store.setLastBeat({ key: beat.key, text: beat.text, open: true });
      go("play", "track");
    },
  }, d.fires === "prompt" ? "Roll the random prompt" : "Roll the modified proposal"));
  return card;
}

function resetOracleState() { last = null; question = ""; }
registerClearer(resetOracleState);
