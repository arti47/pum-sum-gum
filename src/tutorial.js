// The tutorial screen. A screen, not a modal sequence, so a player can come
// back to it mid-session (§6.6 layer 3). The content lives in data-tutorial.js
// and is rendered here, in docs/TUTORIAL.md by tests/tools/gen-tutorial.mjs,
// and on the published page — one source, three renderings.

import { el, add } from "./core.js";
import { explain, toast } from "./ui.js";
import { Settings } from "./settings.js";
import { go } from "./router.js";
import { startWizard } from "./wizard.js";
import { TUTORIAL_META, QUICK_START, PARTS } from "../data-tutorial.js";

function block(b) {
  if (b.p) return el("p", { text: b.p });
  if (b.tap) return el("p", { class: "tut-tap", text: b.tap });
  if (b.note) return el("p", { class: "tut-note" }, el("strong", { text: "Why. " }), b.note);
  if (b.warn) return el("p", { class: "tut-warn" }, el("strong", { text: "Watch out. " }), b.warn);
  if (b.ref) return el("p", { class: "cite", text: b.ref });
  if (b.bullets) {
    const ul = el("ul");
    for (const t of b.bullets) add(ul, el("li", { text: t }));
    return ul;
  }
  if (b.steps) {
    const ol = el("ol");
    for (const t of b.steps) add(ol, el("li", { text: t }));
    return ol;
  }
  if (b.roll) {
    const r = b.roll;
    const box = el("div", { class: "tut-roll" });
    add(box, el("div", { class: "tut-roll-head" },
      el("span", { class: "tut-roll-what", text: r.what }),
      el("span", { class: "cite", text: r.die + (r.value ? " = " + r.value : "") })
    ));
    add(box, el("div", { class: "tut-roll-result" }, "“" + r.result + "”"));
    add(box, el("div", { class: "cite", text: r.page }));
    if (r.then) add(box, el("p", { class: "tut-roll-then", text: r.then }));
    return box;
  }
  if (b.table) {
    // In-app only: the app already contains every row, so nothing is disclosed
    // here that the reader does not already have. The shared renderings quote
    // only the single rows their examples land on.
    const t = b.table;
    const wrap = el("div", { class: "table-scroll" });
    const table = el("table", { class: "rows" });
    if (t.head) {
      const tr = el("tr");
      for (const h of t.head) add(tr, el("th", { text: h }));
      add(table, tr);
    }
    for (const row of t.rows) {
      const tr = el("tr");
      row.forEach((cell, i) => add(tr, el("td", { class: i === 0 ? "r" : null, text: cell })));
      add(table, tr);
    }
    add(wrap, table);
    return el("div", null,
      el("p", { class: "cite", text: `${t.name} — ${t.page}` }),
      wrap
    );
  }
  return null;
}

export function renderTutorial(host) {
  add(host, el("h1", { text: TUTORIAL_META.title }));
  add(host, el("p", { class: "lede", text: TUTORIAL_META.blurb }));
  add(host, explain([
    "The quick start below gets a first session played tonight. Everything under it is the complete guide: every function, four worked scenarios, and a screen-by-screen reference.",
    "It is a screen, not a wizard — come back to any part mid-session.",
    "The books' vocabulary — plot beat, plot node, plot track, plot scope, bias — is defined a line each in the glossary at More \u2192 Rules, which opens on that glossary.",
  ]));

  // --- the fast path ------------------------------------------------------
  const quick = el("div", { class: "card" });
  add(quick, el("h2", { text: "Your first session in ten minutes" }));
  // The first step opens by default until the walkthrough has been marked as
  // read: eleven closed rows told a stranger nothing about what was inside them.
  QUICK_START.forEach((s, i) => {
    const d = el("details", {
      class: "acc",
      open: (i === 0 && !Settings.seenTutorial()) || undefined,
    }, el("summary", null, s.title));
    const body = el("div", { class: "acc-body" });
    add(body, el("p", null, el("strong", { text: "Why: " }), s.why));
    add(body, el("p", null, el("strong", { text: "Do: " }), s.act));
    if (s.to) {
      add(body, el("button", {
        class: "btn small",
        onclick: () => (s.to.go[0] === "wizard" ? startWizard() : go(s.to.go[0], s.to.go[1])),
      }, `${s.to.label} →`));
    }
    add(d, body);
    add(quick, d);
  });
  if (!Settings.seenTutorial()) {
    add(quick, el("button", {
      class: "btn wide",
      onclick: () => { Settings.setSeenTutorial(true); toast("Marked as read."); },
    }, "Mark as read"));
  }
  add(host, quick);

  // --- the complete guide -------------------------------------------------
  for (const part of PARTS) {
    const card = el("div", { class: "card part-card" });
    const body = el("div");
    // The blurb sits OUTSIDE the fold: four collapsed rows of book vocabulary
    // told a stranger nothing about what was inside them, and the sentence that
    // does was itself folded away.
    add(card, el("p", { class: "muted", text: part.blurb }));
    add(card, el("details", { class: "acc group" },
      el("summary", null, part.title, el("span", { class: "pill", text: String(part.sections.length) })),
      body
    ));
    for (const sec of part.sections) {
      const d = el("details", { class: "acc" }, el("summary", null, sec.title));
      const sb = el("div", { class: "acc-body" });
      for (const b of sec.blocks) add(sb, block(b));
      add(d, sb);
      add(body, d);
    }
    add(host, card);
  }

  // The same content lives as a page and as docs/TUTORIAL.md in the repo. The
  // app works offline without either; this is for reading on a second screen.
  if (TUTORIAL_META.page) {
    const card = el("div", { class: "card" });
    add(card, el("h3", { text: "Read it on a bigger screen" }));
    add(card, el("p", { class: "muted", text: TUTORIAL_META.pageNote }));
    add(card, el("a", {
      class: "btn wide", href: TUTORIAL_META.page, target: "_blank", rel: "noopener",
    }, "Open the guide as a page →"));
    // The PDF ships with the app and is cached with it, so this works offline
    // too — it is the same guide, paginated, for a tablet or for paper.
    if (TUTORIAL_META.pdf) {
      add(card, el("p", { class: "muted", text: TUTORIAL_META.pdfNote }));
      add(card, el("a", {
        class: "btn wide", href: TUTORIAL_META.pdf, target: "_blank", rel: "noopener",
      }, "Download the guide as a PDF"));
    }
    add(host, card);
  }

  add(host, el("div", { class: "card" },
    el("h3", { text: "The books" }),
    el("p", { class: "muted", text: TUTORIAL_META.licence })
  ));
}
