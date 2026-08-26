// Boot.

import { $ } from "./core.js";
import { toast, registerUndo, registerExplainState } from "./ui.js";
import * as store from "./store.js";
import { applyTheme, cycleTheme, Settings } from "./settings.js";
import { registerScreen, go, renderTabs, render } from "./router.js";
import { renderPlay } from "./sheet.js";
import { renderOracles } from "./oracles.js";
import { renderScene } from "./scene.js";
import { renderJournal } from "./journal.js";
import { installGlossary } from "./glossary.js";
import { renderMore, openTerm } from "./screens.js";
import { clearTransient } from "./viewstate.js";

store.load();
applyTheme();

// Every mutating action can be taken back from the toast it raised (§14.1.2).
registerUndo({
  can: () => store.canUndo(),
  undo: () => { store.undo(); toast("Undone."); render(); },
});

// The "what this does" notes read their open state from Settings without ui.js
// importing the store (§6.1).
registerExplainState({
  isOpen: () => Settings.explainOpen(),
  set: (v) => Settings.setExplainOpen(v),
});

// Every "what this does" note in the app grows chips for the jargon its own text
// uses, from here on, without any screen opting in (§6.6 layer 0).
installGlossary({ openTerm });

registerScreen("play", renderPlay);
registerScreen("oracles", renderOracles);
registerScreen("scene", renderScene);
registerScreen("journal", renderJournal);
registerScreen("more", renderMore);

$("#btn-theme").addEventListener("click", () => {
  const next = cycleTheme();
  toast(`Theme: ${next}`);
});

$("#btn-home").addEventListener("click", () => go("more", "home"));

// Follow the system theme live while the app is set to "system".
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

renderTabs();
go(store.activeGame() ? "play" : "more", store.activeGame() ? "track" : "home");

// PWA: register the worker and offer the update rather than applying it mid-scene.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            const el = document.createElement("button");
            el.className = "toast";
            el.style.pointerEvents = "auto";
            el.textContent = "Update available — tap to reload";
            el.addEventListener("click", () => {
              sw.postMessage("skip-waiting");
              location.reload();
            });
            $("#toast-mount").append(el);
          }
        });
      });
    }).catch(() => { /* offline install is optional */ });
  });
}

// Switching game or plot sheet clears every module's transient view state, so a
// beat rolled in one scope can never be confirmed against another's track.
let context = contextKey();
function contextKey() {
  const g = store.activeGame();
  const s = store.currentScope();
  return `${g ? g.id : "-"}/${s ? s.id : "-"}`;
}
store.subscribe(() => {
  const next = contextKey();
  if (next !== context) { context = next; clearTransient(); }
});
