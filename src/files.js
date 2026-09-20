// The file shelf, and the three places files attach to: a journal entry, a cast
// portrait, a protagonist's character sheet.
//
// What this is NOT: a character-stat model. PUM has none, and §1.0 omits the
// whole slot rather than inventing one. A "character sheet" here is the PDF you
// brought from your own RPG — the app files it, shows it, and hands it back. It
// does not read it.
//
// `media.js` owns the bytes; this owns the screens and the three attach points.

import { el, add } from "./core.js";
import { modal, confirmModal, promptModal, toast, emptyState, actionBar, explain } from "./ui.js";
import * as store from "./store.js";
import * as media from "./media.js";
import { go, render } from "./router.js";
import { openRule } from "./screens.js";

// What the shelf is divided into. Four drawers, because free-text tags become a
// second name for the file and nobody sorts by them.
const TAGS = [
  ["map", "Maps", "Battle maps, region maps, anything you point at while you play."],
  ["sheet", "Character sheets", "The sheets from your own RPG. The app files them; it does not read them."],
  ["portrait", "Portraits", "Faces for the cast."],
  ["note", "Other files", "Voice notes, reference pages, anything else."],
];

// --- putting a file in ------------------------------------------------------

// One code path for every way a file arrives, so the record and the blob store
// can never disagree about what exists.
async function store1(blob, name, tag) {
  const id = "file-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const ok = await media.putFile(id, blob);
  if (!ok) { toast(media.unavailableReason()); return null; }
  const meta = {
    id,
    name: name || "Untitled file",
    type: blob.type || "",
    form: media.formOf(blob.type, name),
    size: blob.size || 0,
    addedAt: Date.now(),
    tag: tag || "note",
  };
  store.addFile(meta);
  return meta;
}

let pickerEl = null;
let pending = null;

function picker() {
  if (pickerEl) return pickerEl;
  pickerEl = el("input", { type: "file", style: "position:fixed;left:-9999px;top:0" });
  pickerEl.addEventListener("change", async () => {
    const file = pickerEl.files && pickerEl.files[0];
    const job = pending;
    pending = null;
    if (!file || !job) return;
    const meta = await store1(file, file.name, job.tag);
    if (!meta) return;
    toast(`Added ${meta.name}.`, { undo: true });
    if (job.onDone) job.onDone(meta); else render();
  });
  document.body.appendChild(pickerEl);
  return pickerEl;
}

// The file picker. A hidden input, clicked: the only way a browser will open one,
// and it has to be in the document or Safari ignores the click.
function addFile({ tag = "note", accept = "", onDone = null } = {}) {
  if (!store.activeGame()) {
    toast("Prepare a game first — files are kept with the game they belong to.");
    return;
  }
  // One input, reused. Removing it on `change` looks tidier and is wrong twice
  // over: a cancelled picker fires no change, so the element would accumulate,
  // and removing it while the native dialog is open cancels that dialog in some
  // browsers.
  const input = picker();
  input.accept = accept || "";
  input.value = "";
  pending = { tag, onDone };
  input.click();
}

// --- recording a voice note -------------------------------------------------

function recordVoice({ tag = "note", onDone = null } = {}) {
  if (!store.activeGame()) {
    toast("Prepare a game first — files are kept with the game they belong to.");
    return;
  }
  const status = el("p", { class: "muted", text: "Nothing recorded yet." });
  const body = el("div", null,
    el("p", { text: "Say what happened, instead of typing it. The recording is kept with this game like any other file." }),
    status
  );
  let rec = null;
  let chunks = [];
  let blob = null;
  let stream = null;

  const stop = () => {
    if (rec && rec.state !== "inactive") rec.stop();
    if (stream) for (const t of stream.getTracks()) t.stop();
  };

  return modal({
    title: "Record a voice note",
    body,
    onClose: stop,
    actions: [
      {
        label: "Start recording", primary: true,
        onClick: async () => {
          // Asked for only when the button is pressed: a screen that demands the
          // microphone on arrival is a screen people back out of.
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia
              || typeof MediaRecorder === "undefined") {
            status.textContent = "This browser will not record audio. You can still add an audio file with Add a file.";
            return true;
          }
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            status.textContent = "No microphone, or permission was refused. You can still add an audio file with Add a file.";
            return true;
          }
          chunks = [];
          rec = new MediaRecorder(stream);
          rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = () => {
            blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
            status.textContent = `Recorded — ${media.fmtBytes(blob.size)}. Save it, or record again.`;
          };
          rec.start();
          status.textContent = "Recording. Press Stop when you are done.";
          return true;
        },
      },
      {
        label: "Stop", onClick: () => { stop(); return true; },
      },
      {
        label: "Save the recording",
        onClick: async () => {
          if (!blob) { status.textContent = "There is nothing recorded to save yet."; return true; }
          stop();
          const stamp = new Date().toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          const meta = await store1(blob, `Voice note, ${stamp}`, tag);
          if (!meta) return;
          toast("Voice note saved.", { undo: true });
          if (onDone) onDone(meta); else render();
        },
      },
      { label: "Cancel" },
    ],
  });
}

// --- showing a file ---------------------------------------------------------

// An image shows, audio plays, everything else is a link you open. The element
// is returned empty and filled when the blob arrives, because a screen that
// waits on IndexedDB is a screen that flashes blank.
export function filePreview(meta, { max = "10rem" } = {}) {
  const holder = el("div", { class: "file-preview" });
  media.objectUrl(meta.id).then((url) => {
    if (!url) {
      add(holder, el("p", { class: "cite", text: "This file is not in this browser. Import a bundle that carries it." }));
      return;
    }
    if (meta.form === "image") {
      const img = el("img", { src: url, alt: meta.name, loading: "lazy" });
      img.style.maxHeight = max;
      img.style.borderRadius = ".4rem";
      add(holder, img);
    } else if (meta.form === "audio") {
      const a = el("audio", { src: url, controls: "controls" });
      a.style.width = "100%";
      add(holder, a);
    }
  });
  return holder;
}

function openFile(meta) {
  media.objectUrl(meta.id).then((url) => {
    if (!url) { toast("This file is not in this browser."); return; }
    // A viewer can block this the way it blocks a download; say so rather than
    // leaving a control that appears to do nothing (§the Download precedent).
    const w = window.open(url, "_blank");
    if (!w) toast("Opening was blocked here. Long-press the preview to save it instead.");
  });
}

// --- choosing one that is already on the shelf ------------------------------

// The portrait and character-sheet dialogs both ask the same question, so they
// ask it the same way: what is already filed, or add something new.
export function chooseFile({ title, form = null, current = null, onPick, onClear = null }) {
  const game = store.activeGame();
  const all = (game ? game.files : []).filter((f) => !form || f.form === form);
  const body = el("div");
  add(body, el("p", { class: "muted", text: "Pick one already filed with this game, or add a new one. Files are shared: the same picture can be a portrait here and a map on the shelf." }));
  if (!all.length) {
    add(body, el("p", { class: "cite", text: "Nothing filed yet that fits here." }));
  } else {
    const list = el("div", { class: "node-list" });
    for (const f of all) {
      add(list, el("button", {
        class: `btn ghost wide${f.id === current ? " on" : ""}`,
        style: "text-align:left;justify-content:flex-start",
        onclick: () => { onPick(f); render(); },
      }, `${f.name} · ${media.fmtBytes(f.size)}`));
    }
    add(body, list);
  }
  const actions = [
    {
      label: "Add a file", primary: true,
      onClick: () => {
        addFile({
          tag: form === "image" ? "portrait" : "sheet",
          accept: form === "image" ? "image/*" : (form === "pdf" ? "application/pdf" : ""),
          onDone: (meta) => { onPick(meta); render(); },
        });
      },
    },
  ];
  if (current && onClear) actions.push({ label: "Remove", danger: true, onClick: () => { onClear(); render(); } });
  actions.push({ label: "Cancel" });
  return modal({ title, body, actions });
}

// --- the shelf screen -------------------------------------------------------

export function renderFiles(host) {
  add(host, el("h1", { text: "Files" }));
  add(host, explain([
    "Maps, character sheets, portraits and voice notes, kept with this game.",
    "The app files them and shows them; it does not read them. PUM models no stats, so a character sheet here is the one from your own RPG, exactly as you brought it.",
    "Files live in this browser, not in the JSON export — use Export everything in Settings to carry them to another device.",
  ], "files", openRule));

  const game = store.activeGame();
  if (!game) {
    add(host, emptyState("No game yet", "Files are kept with the game they belong to.",
      { label: "Prepare a game", onClick: () => go("more", "home") }));
    return;
  }

  media.available().then((ok) => {
    if (ok || !host.isConnected) return;
    const warn = el("div", { class: "card" },
      el("h3", { text: "Files are not available here" }),
      el("p", { class: "muted", text: media.unavailableReason() }),
      el("p", { class: "cite", text: "Everything else in the app still works — the record is kept separately." })
    );
    host.insertBefore(warn, host.children[2] || null);
  });

  if (!game.files.length) {
    add(host, emptyState(
      "Nothing filed yet",
      "Add the map you are playing on, the character sheet from your own RPG, a portrait, or a voice note instead of typing.",
      { label: "Add a file", onClick: () => addFile({}) },
      { label: "Record a voice note", onClick: () => recordVoice({}) }
    ));
  }

  for (const [tag, label, blurb] of TAGS) {
    const list = game.files.filter((f) => f.tag === tag);
    if (!list.length) continue;
    const card = el("div", { class: "card" });
    add(card, el("div", { class: "card-head" },
      el("h2", { text: label }),
      el("span", { class: "cite", text: String(list.length) })
    ));
    add(card, el("p", { class: "muted", text: blurb }));
    for (const f of list) add(card, fileRow(f));
    add(host, card);
  }

  const total = game.files.reduce((n, f) => n + f.size, 0);
  actionBar({
    label: "Add a file",
    context: game.files.length
      ? `${game.files.length} file${game.files.length === 1 ? "" : "s"} · ${media.fmtBytes(total)}`
      : "maps, sheets, portraits, voice notes",
    secondary: { label: "Record a voice note", onClick: () => recordVoice({}) },
    onClick: () => addFile({}),
  });
}

function fileRow(f) {
  const row = el("div", { class: "entry" });
  add(row, el("div", { class: "entry-head" },
    el("span", { class: "entry-title", text: f.name }),
    el("span", { class: "entry-ts", text: media.fmtBytes(f.size) })
  ));
  if (f.form === "image" || f.form === "audio") add(row, filePreview(f));
  const tools = el("div", { class: "btn-row", style: "margin-top:.3rem" });
  add(tools, el("button", { class: "btn small", onclick: () => openFile(f) }, "Open"));
  add(tools, el("button", {
    class: "btn small ghost",
    onclick: () => promptModal({
      // no-inspire: a file's name is the one you gave the file.
      title: "Rename", label: "Name", value: f.name,
      onSubmit: (v) => { if (v) { store.updateFile(f.id, { name: v }); render(); } },
    }),
  }, "Rename"));
  add(tools, el("button", {
    class: "btn small ghost",
    onclick: () => fileItUnder(f),
  }, "File it under"));
  add(tools, el("button", {
    class: "btn small ghost",
    onclick: () => confirmModal({
      title: `Remove ${f.name}?`,
      message: "The file is deleted from this browser, and anything showing it — a portrait, a character sheet, a journal attachment — loses it too.",
      confirmLabel: "Remove", danger: true,
      onConfirm: () => {
        store.removeFile(f.id);
        media.deleteFile(f.id);
        toast("Removed.");
        render();
      },
    }),
  }, "Remove"));
  add(row, tools);
  return row;
}

function fileItUnder(f) {
  return modal({
    title: "File it under",
    body: el("p", { class: "muted", text: "Which drawer this belongs in. It changes nothing but where you find it." }),
    actions: [
      ...TAGS.map(([tag, label]) => ({
        label,
        primary: tag === f.tag,
        onClick: () => { store.updateFile(f.id, { tag }); render(); },
      })),
      { label: "Cancel" },
    ],
  });
}
