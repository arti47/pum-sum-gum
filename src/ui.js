// Themed UI primitives. No native alert/confirm/prompt anywhere in the app.

import { el, add, clear, $ } from "./core.js";

let openModal = null;

export function modal({ title, body, actions = [], onClose = null, dismissable = true }) {
  closeModal();
  const prevFocus = document.activeElement;

  const actionRow = el("div", { class: "modal-actions" });
  const box = el("div", {
    class: "modal", role: "dialog", "aria-modal": "true", "aria-label": title || "Dialog",
  });
  add(box, title ? el("h2", { text: title }) : null);
  add(box, body);
  // Actions are ordered primary-first, everywhere, without exception (§6.4).
  for (const a of actions) {
    add(actionRow, el("button", {
      class: `btn ${a.primary ? "primary" : ""} ${a.danger ? "danger" : ""}`.trim(),
      onclick: () => {
        const keep = a.onClick ? a.onClick() : undefined;
        // Close THIS dialog, not whatever is open now: a handler may have opened
        // a follow-up dialog (a timed beat firing, a resolved scope), and closing
        // that one instead makes the app look like it swallowed the news.
        if (keep !== true && openModal && openModal.back === back) closeModal();
      },
    }, a.label));
  }
  if (actions.length) add(box, actionRow);

  const back = el("div", {
    class: "modal-back",
    onclick: (e) => { if (dismissable && e.target === back) closeModal(); },
  }, box);

  function onKey(e) {
    if (e.key === "Escape" && dismissable) { e.preventDefault(); closeModal(); }
    if (e.key !== "Tab") return;
    const f = box.querySelectorAll(
      'button, [href], input, select, textarea, details > summary, [tabindex]:not([tabindex="-1"])'
    );
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", onKey);

  $("#modal-mount").append(back);
  openModal = { back, onKey, prevFocus, onClose };
  const focusTarget = box.querySelector("input, textarea, select") || box.querySelector("button");
  if (focusTarget) focusTarget.focus();
  return back;
}

export function closeModal() {
  if (!openModal) return;
  const { back, onKey, prevFocus, onClose } = openModal;
  document.removeEventListener("keydown", onKey);
  back.remove();
  openModal = null;
  if (onClose) onClose();
  if (prevFocus && prevFocus.focus) prevFocus.focus();
}

// Undo lives in one stack in the store, but ui.js is the primitive layer, so the
// boot registers the two functions it needs rather than ui.js importing them.
let undoProvider = null;

export function registerUndo(fn) { undoProvider = fn; }

// `undo: true` puts an Undo button in the toast. Before this, the only way back
// from a mis-tap was More → Settings → scroll → Undo, four moves away from the
// thing you were doing — which is not a safety net anyone reaches in play.
export function toast(text, { ms = 2600, undo = false } = {}) {
  const mount = $("#toast-mount");
  if (!mount) return;
  const t = el("div", { class: "toast" }, text);
  if (undo && undoProvider && undoProvider.can()) {
    // Only the button takes pointer events. Making the whole pill clickable
    // covered the action bar beneath it — the toast sits directly above it —
    // and the primary control became unclickable for as long as a toast showed.
    add(t, el("button", {
      class: "toast-undo",
      onclick: () => { undoProvider.undo(); t.remove(); },
    }, "Undo"));
    ms = Math.max(ms, 5200);   // long enough to notice, read and reach
  }
  mount.append(t);
  setTimeout(() => t.remove(), ms);
}

export function confirmModal({ title, message, confirmLabel = "Confirm", danger = false, onConfirm }) {
  // Destructive actions confirm AND name the loss (§6.4).
  return modal({
    title,
    body: el("p", { text: message }),
    actions: [
      { label: confirmLabel, primary: !danger, danger, onClick: onConfirm },
      { label: "Cancel" },
    ],
  });
}

// --- inspiration prompts ----------------------------------------------------
// Any text field can offer three rolled words. The words come from GUM, but
// ui.js is the primitive layer and must not know that (§6.1: core and ui import
// nothing above them), so the Forge registers a factory here at boot and this
// module only mounts whatever it returns.
let inspireFactory = null;

export function registerInspire(fn) { inspireFactory = fn; }

// Append rather than replace: the words are a nudge, not a verdict, and a stray
// tap must never cost the player a line they had already typed.
function appendToField(input, text) {
  const cur = input.value;
  const sep = cur.trim() ? (input.tagName === "TEXTAREA" ? "\n" : " · ") : "";
  input.value = cur + sep + text;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// The mountable block, or null when there is nothing to offer (no factory
// registered, or GUM switched off).
export function inspireBlock(fieldId, input) {
  if (!inspireFactory || !fieldId) return null;
  // A field that asks for a paragraph and one that asks for a handle want
  // different things from the same tables, so the block is told which it is.
  const multiline = !!(input && input.tagName === "TEXTAREA");
  return inspireFactory(fieldId, (text) => appendToField(input, text), multiline);
}

// `notes` adds a second field below the first. It exists because GUM builds a
// character as a concept and the concept does not belong in a Name box: the
// dialog asks for the name, and the rolled words land beside it.
export function promptModal({ title, label, value = "", multiline = false, placeholder = "", hint = "", inspire = null, notes = null, onSubmit }) {
  const input = multiline
    ? el("textarea", { placeholder })
    : el("input", { type: "text", placeholder });
  input.value = value;
  const body = el("div", null,
    el("label", { class: "field" },
      el("span", { class: "lbl", text: label }),
      input,
      hint ? el("div", { class: "hint", text: hint }) : null
    )
  );
  add(body, inspireBlock(inspire, input));

  let notesInput = null;
  if (notes) {
    notesInput = el("textarea", { placeholder: notes.placeholder || "" });
    notesInput.value = notes.value || "";
    add(body, el("label", { class: "field" },
      el("span", { class: "lbl", text: notes.label }),
      notesInput
    ));
    add(body, inspireBlock(notes.inspire, notesInput));
  }
  const submit = () => onSubmit(input.value.trim(), notesInput ? notesInput.value.trim() : "");
  if (!multiline && !notes) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); closeModal(); submit(); }
    });
  }
  return modal({
    title,
    body,
    actions: [
      { label: "Save", primary: true, onClick: submit },
      { label: "Cancel" },
    ],
  });
}

// --- the per-screen "what this does" note (§6.6 layer 1) --------------------
// Two to four sentences, in the app's own voice. Open until the player closes
// one. ui.js is the primitive layer and must not read the store, so the boot
// registers the reader and the setter, exactly as it does for undo and inspire.
let explainState = null;

export function registerExplainState(fns) { explainState = fns; }

// The glossary chips under each note are injected the same way, and for the same
// reason the open state is: a teaching surface each screen has to opt into is one
// some screen will forget (D-22). glossary.js registers a decorator at boot, and
// every explain() in the app gets chips for the jargon its own text uses, with no
// call site changed.
let explainDecorator = null;

export function registerExplainDecorator(fn) { explainDecorator = fn; }

export function explain(text, ruleId = null, onRuleLink = null) {
  const body = el("div", { class: "body" });
  const paras = Array.isArray(text) ? text : [text];
  for (const p of paras) add(body, el("p", { text: p }));
  if (ruleId && onRuleLink) {
    add(body, el("button", {
      class: "btn small ghost",
      onclick: () => onRuleLink(ruleId),
    }, "Read the rule →"));
  }
  if (explainDecorator) add(body, explainDecorator(paras.join(" ")));
  const open = explainState ? explainState.isOpen() : false;
  const d = el("details", { class: "explain" },
    el("summary", null, "What this does"),
    body
  );
  if (open) d.open = true;
  // Closing one closes them everywhere, and for good: a reader who has taken
  // the point should not have to take it again on every screen. Re-opening one
  // brings them all back, so the gesture is symmetrical.
  d.addEventListener("toggle", () => {
    if (!explainState) return;
    if (d.open !== explainState.isOpen()) explainState.set(d.open);
  });
  return d;
}

// --- the pinned action bar (§6.2) -------------------------------------------
// Returns the bar; the mount owns the body class that reserves its space, so a
// caller cannot forget the spacer.
export function actionBar({
  label, context = "", onClick, disabled = false, secondary = null, ariaLabel = null,
}) {
  const mount = $("#action-bar");
  clear(mount);
  const bar = el("div", { class: "action-bar" });
  add(bar, context ? el("span", { class: "ab-ctx", text: context }) : null);
  add(bar, secondary
    ? el("button", { class: "btn small", onclick: secondary.onClick }, secondary.label)
    : null);
  // The context line beside the button is visual only. A one-word primary
  // ("Ask") needs that context inside its own accessible name, or the button
  // says nothing at all to anyone who cannot see the two together.
  add(bar, el("button", {
    class: "btn primary", onclick: onClick, disabled: disabled || undefined,
    "aria-label": ariaLabel || (context && label.length < 8 ? `${label} — ${context}` : null),
  }, label));
  mount.append(bar);
  document.body.classList.add("has-actionbar");
  return bar;
}

export function clearActionBar() {
  clear($("#action-bar"));
  document.body.classList.remove("has-actionbar");
}

// --- rows (§6.5: long values stack, short values sit inline) ----------------
export function defRow(k, v) {
  return el("div", { class: "defrow" },
    el("span", { class: "k", text: k }),
    el("span", { class: "v" }, v)
  );
}

export function inlineRow(k, v) {
  return el("div", { class: "inlinerow" },
    el("span", { class: "k", text: k }),
    el("span", { class: "v" }, v)
  );
}

export function emptyState(title, message, action = null, secondary = null) {
  // Empty states name the thing to do and link to it (§6.4).
  return el("div", { class: "empty" },
    el("h3", { text: title }),
    el("p", { class: "muted", text: message }),
    action ? el("button", { class: "btn primary", onclick: action.onClick }, action.label) : null,
    secondary ? el("button", { class: "btn", onclick: secondary.onClick }, secondary.label) : null
  );
}

// --- the first-run notice on a rolling surface ------------------------------
// Every oracle, SUM table and generator rolls perfectly well with no game
// prepared — and silently drops the journal entry, because addJournal has
// nowhere to put it. A control that appears to work and quietly does half its
// job is worse than one that refuses, so the surface says so before you roll
// rather than leaving you to notice an empty journal an hour later.
export function noGameNotice({ what, onPrepare, onWalkthrough }) {
  return el("div", { class: "card notice" },
    el("h3", { text: "Nothing here is being saved yet" }),
    el("p", { text: `You can roll ${what} right now and read the answers — but with no game prepared there is no journal to write them into, so nothing is kept.` }),
    el("p", { class: "muted", text: "Preparing a game takes about a minute, and you can change every answer later." }),
    el("div", { class: "btn-row" },
      el("button", { class: "btn primary", onclick: onPrepare }, "Prepare a game"),
      onWalkthrough
        ? el("button", { class: "btn", onclick: onWalkthrough }, "Read the first-session walkthrough")
        : null
    )
  );
}

// --- the result card --------------------------------------------------------
// Shows the dice, the working and the consequence (§6.4). Takes plain data so it
// stays free of engine imports; every roller surface renders through this one.
function diceRow(dice) {
  const row = el("div", { class: "dice" });
  for (const d of dice) {
    add(row, el("span", {
      class: `die ${d.kept === false ? "dropped" : "kept"}`,
      title: `${d.label}: ${d.value}`,
    }, String(d.value)));
  }
  return row;
}

export function resultCard({ kind, answer, second, question = "", dice = [], strip = null, actions = [], extra = null }) {
  const card = el("div", { class: "result", role: "group", "aria-label": kind });
  const head = el("div", { class: "result-head" },
    el("span", { class: "result-kind", text: kind })
  );
  if (dice.length) add(head, diceRow(dice));
  add(card, head);

  const body = el("div", { class: "result-body" });
  // An answer with no question on it is a word floating free: you ask, roll,
  // get interrupted, and nothing on screen says what "No" was answering.
  if (question) add(body, el("div", { class: "result-q", text: "\u201c" + question + "\u201d" }));
  add(body, el("div", { class: "result-answer", text: answer }));
  if (second) add(body, el("div", { class: "result-second" }, second));
  if (extra) add(body, extra);
  if (strip) {
    add(body, el("div", { class: "strip" },
      el("div", { class: "strip-k", text: strip.label }),
      el("div", null, strip.text)
    ));
  }
  add(card, body);

  if (actions.length) {
    const foot = el("div", { class: "result-foot" });
    for (const a of actions) {
      add(foot, el("button", {
        class: `btn small ${a.primary ? "primary" : ""}`.trim(),
        onclick: a.onClick,
      }, a.label));
    }
    add(card, foot);
  }
  return card;
}

