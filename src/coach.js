// The session coach — the answer to "I don't know how to start playing, keep
// playing, or end well, and I am not going to read the manual."
//
// Every other teaching surface in this app is a document you have to go and
// read: the walkthrough, the glossary, the rules library, the per-screen notes.
// This one reads no differently from the game itself, because it reads the
// SAME STATE the game does and says one thing: what is true right now, and the
// single next thing to do about it, with the button attached.
//
// It is deliberately not a mode, a wizard or a tutorial you can be "in". There
// is nothing to enable and nothing to finish. It is one card that is always
// correct, because it is derived, never remembered.

import { el, add } from "./core.js";
import { promptModal, toast } from "./ui.js";
import * as store from "./store.js";
import { isResolved, isEnded, hasTrack, crossed, trackLength } from "./derived.js";
import { go, render } from "./router.js";

// The beat controls are further down THIS screen, so "go to the beat" is a
// scroll, not a navigation. Three coach actions used go("play","track") from
// play/track — controls that changed nothing, which is exactly what the deep
// audit reported on all ten plot sheets.
function scrollToBeat() {
  const el = document.getElementById("beat-controls");
  if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
}
import { SESSION_STAGES, ENDING_PROMPTS } from "../data-guidance.js";

// Journal kinds that mean play actually happened, as opposed to preparing to
// play. A plot node written in the wizard is prep; a beat, a scene or an oracle
// answer is not.
const PLAY_KINDS = new Set(["beat", "scene", "oracle", "yesno", "granular", "sum", "track", "timed"]);

// Has this storyline's ending been written down? The epilogue is one journal
// entry of a known kind, so "have you finished finishing" is a question the
// store can answer rather than a flag to keep in sync.
function endingWritten(game, scope) {
  if (!game || !scope) return false;
  return game.journal.some((e) => e.kind === "ending" && e.scopeId === scope.id);
}

// Where the player is, derived. The order of these tests IS the arc of a
// session: nothing here is a preference and nothing is remembered.
function stageOf(game, scope) {
  if (!game) return "no-game";
  if (!scope) return "no-game";
  if (isEnded(scope)) {
    if (endingWritten(game, scope)) return "closed";
    return isResolved(scope) ? "resolved" : "ended";
  }
  if (!scope.startingPoint || !scope.startingPoint.trim()) return "no-start";
  if (scope.lastBeat && scope.lastBeat.open) return "beat-open";
  if (scope.openScene) return "scene-open";
  // One box left is the endgame, and saying so changes how the next beat is
  // played — which is the whole point of telling the player.
  if (hasTrack(scope) && trackLength(scope) - crossed(scope) === 1) return "endgame";
  // "Open your FIRST scene" is right for someone who has done nothing here and
  // wrong for someone eight scenes in. Two wrong tests were tried first:
  // looking for a SUM scene entry missed players who never use the optional
  // scene arc, and looking for ANY journal entry counted prep bookkeeping —
  // writing a plot node during the wizard made a brand-new game report as
  // mid-session. The test is whether PLAY has happened.
  const played = crossed(scope) > 0
    || game.journal.some((e) => e.scopeId === scope.id && PLAY_KINDS.has(e.kind));
  return played ? "scene-over" : "first-scene";
}

// The concrete action for a stage: a label and what it does. Kept beside the
// stage table rather than in it, because data files hold words and src/ holds
// behaviour (§10.2).
function actionFor(stage, game, scope) {
  switch (stage) {
    case "no-game":
      return { label: "Prepare a game", run: () => go("more", "home") };
    case "no-start":
      return { label: "Write the starting point", run: () => startingPointDialog(scope) };
    case "first-scene":
      return { label: "Open a scene", run: () => go("scene", "arc") };
    case "scene-over":
      return { label: "Open the next scene", run: () => go("scene", "arc") };
    case "scene-open":
      return { label: "Back to the scene", run: () => go("scene", "arc") };
    case "beat-open":
      return { label: "Go to the beat", run: scrollToBeat };
    case "endgame":
      return { label: "Call the beat that ends it", run: scrollToBeat };
    case "resolved":
    case "ended":
      return { label: "Write how it ended", run: () => endingDialog(game, scope) };
    case "closed":
      return { label: "Start the next plot sheet", run: () => go("more", "home") };
    default:
      return null;
  }
}

// Two more things worth offering at some stages, never more — a coach that
// lists five options is a menu, and a menu is what the player already had.
function extrasFor(stage) {
  if (stage === "scene-open") {
    return [
      { label: "Ask an oracle", run: () => go("oracles", "yesno") },
      { label: "Call a plot beat", run: scrollToBeat },
    ];
  }
  if (stage === "scene-over" || stage === "first-scene") {
    return [{ label: "Write it down", run: () => go("journal", "entries") }];
  }
  if (stage === "closed") {
    return [{ label: "Read the whole story", run: () => go("journal", "entries") }];
  }
  return [];
}

function startingPointDialog(scope) {
  promptModal({
    title: "Where does this open?",
    label: "Starting point",
    multiline: true,
    value: scope.startingPoint || "",
    inspire: "scope-start",
    placeholder: "The raid site, three days cold, with the lord's rider still waiting.",
    hint: "Two sentences: where the first scene happens and what is introduced there. The books suggest opening mid-action rather than with travel.",
    onSubmit: (v) => {
      if (!v) return;
      store.updateScope({ startingPoint: v });
      toast("Starting point written. Open a scene when you are ready.", { undo: true });
      render();
    },
  });
}

// Ending well. Neither book has an epilogue procedure — the app is not
// pretending otherwise — but a storyline that just stops is the commonest way a
// solo game feels unfinished, and the questions below are the app's own.
function endingDialog(game, scope) {
  promptModal({
    title: "How did it end?",
    label: "The ending",
    multiline: true,
    // no-inspire: this is your own story's ending. Rolling for it would be the
    // machine writing over the one part that was always yours.
    placeholder: ENDING_PROMPTS[0],
    hint: ENDING_PROMPTS.slice(1).join("  ·  "),
    onSubmit: (v) => {
      if (!v) return;
      store.transact("Write the ending", () => {
        store.addJournal({
          kind: "ending",
          title: `How “${scope.name}” ended`,
          detail: v,
          scopeId: scope.id,
        });
        if (!isEnded(scope)) store.setScopeClosed(true);
      });
      toast("Ending written. It is in the journal with the rest of the story.", { undo: true });
      render();
    },
  });
}

// The card. One stage, one sentence of where you are, one next action.
export function coachCard() {
  const game = store.activeGame();
  const scope = store.currentScope();
  const stage = stageOf(game, scope);
  const copy = SESSION_STAGES[stage];
  if (!copy) return null;

  const card = el("div", { class: "card coach-card" });
  add(card, el("div", { class: "card-head" },
    el("h2", { text: copy.title }),
    el("span", { class: "cite", text: "what now" })
  ));
  add(card, el("p", { text: copy.say }));
  add(card, el("p", { class: "coach-next" }, el("strong", { text: "Next: " }), copy.next));

  const act = actionFor(stage, game, scope);
  if (act) {
    add(card, el("button", {
      class: "btn primary wide", onclick: act.run,
    }, act.label));
  }
  const extras = extrasFor(stage);
  if (extras.length) {
    const row = el("div", { class: "btn-row", style: "margin-top:.4rem" });
    for (const e of extras) {
      add(row, el("button", { class: "btn small", onclick: e.run }, e.label));
    }
    add(card, row);
  }
  return card;
}
