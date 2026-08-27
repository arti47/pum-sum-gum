# Audit log

Numbered findings, pass by pass, as **Rule / Target / Fix / Why it mattered**, plus a
verified-clean list so later passes do not re-litigate settled ground.

The stopping rule (template §11.4): the build is done when **one complete cycle of every pass
produces no finding**. A cycle producing only cosmetic findings is still a cycle that produced
findings.

---

## Cycle 1

### Pass 1 — Dead-data scan (mechanical)

**F-1 · The book's explanation of each modification kind was extracted and never shown.**
*Rule:* PUM p.6 explains what each *kind* of modified proposal means — a location change can
be a room or a galaxy; an emotion may hit the PCs, the NPCs, the scene, or the player; someone
arriving comes with a clear bias.
*Target:* `data-pum-plot.js` `PROPOSAL_NOTES` → nothing.
*Fix:* added `PROPOSAL_KINDS` mapping each d10 face to its kind, `rules.proposalNote(roll)`,
and the note now renders as the second line of every proposal beat card.
*Why it mattered:* the exact §0 defect — extracted faithfully, unit-checked, and never called.
The proposal card said "Bring someone quite inconvenient" and stopped, when the book has a
paragraph explaining how to read it.

**F-2 · Three Permissions had an engine and a test but no control.**
*Rule:* PUM p.9's custom sheet — "fill the Random Prompt column with a customized list" and
"pre-define the length and section of your track, or build it up as you go".
*Target:* `store.setCustomPrompts`, `store.addTrackBox`, `store.removeTrackSection` — all
reachable only from the harness.
*Fix:* a **Customize** dialog on the Customized sheet: add or remove sections, add a box to
any section, and a ten-row editor for the prompt column with a reset to the printed one.
*Why it mattered:* D-22. A permission the book grants that the app cannot perform has quietly
removed a rule, and this one is the whole point of the Customized sheet.

**F-3 · Game identity could be written once and never edited.**
*Target:* `store.updateGame` had no caller.
*Fix:* an **Edit** control on the Home game card for title, universe, tone and inspiration.

**F-4 · `SUM_SECTIONS` extracted; the character screen hardcoded its own section names.**
*Target:* `src/scene.js` carried a literal map of "First contact / Shallow interaction / …".
*Fix:* read `SUM_SECTIONS` instead.
*Why it mattered:* §10.2 — rules data belongs in `data-*.js` and is never restated in `src/`.
Two copies of one list is a disagreement with a delayed fuse.

**F-5 · Transient view state leaked across games and plot sheets.**
*Rule:* not a book rule — a seam (D-19). The open beat, the last oracle answer, the last SUM
roll and the journal's paging all live in module scope so a re-render cannot re-roll them
(§5.1). Nothing cleared them when the active game or scope changed.
*Target:* `sheet.js`, `oracles.js`, `scene.js`, `journal.js`.
*Fix:* new `src/viewstate.js` owning a clearer registry; each module registers its own; `main.js`
watches the `game/scope` key on every store change and fires them.
*Why it mattered:* a beat rolled on one plot sheet could be confirmed against another's track.
Every flag needs a setter, a reader **and a clearer** (§10.14) — these had no clearer.

**F-6 · Dead exports and unused imports.** `fmtRange`, `pairedRange`, `rerollLink`,
`isModalOpen`, `sectionCard`, `trackPercent`, `route`, `refresh`, `d20`, plus fourteen unused
named imports. Deleted, un-exported, or given the job they were written for (`fmtRange` now
renders the node-slot ranges; `defRow` now stacks the sentence-length values on Home).

**F-7 · The scan itself was wrong, and I acted on a false positive.**
*Target:* `tests/deadcode.mjs` used `\b${name}\b` to count uses. `\b` is not a word boundary
for `$`, so every `$` import read as unused — and I removed it from `router.js` and `main.js`
before checking, breaking both.
*Fix:* bound on the identifier charset with lookarounds instead; restored the imports.
*Why it mattered:* D-14 in reverse — a guard that lies in the other direction. Recorded because
the fix is the lesson: **verify a mechanical finding against the code before acting on it.**

### Pass 2 — Rules-file read-through

Read `docs/rules/*.md` sentence by sentence against the engine. No new findings: the two bias
mechanics are implemented separately (ruling A4), the node die follows list capacity and fill
(A7), the disruption die's 1-is-always-a-prompt rule holds when the range widens, and the
errata (A2, A3) are surfaced rather than silently corrected.

### Pass 3 — Permission sweep (re-aimed from the template's ability sweep)

This game has no abilities; it has eleven Permissions (§3.0), so the sweep asks of each one:
*where is its control?* All eleven now have one — see the traceability ledger in `CLAUDE.md`.
Three were missing at the start of this cycle and are F-2 and F-3 above.

### Pass 4 — Interaction audit

Every visible control on all nineteen routes, clicked in isolation with storage reset between
clicks. No JS errors, no unclickable controls, no no-ops.

### Pass 5 — Measured layout

**F-8 · Tap targets below the design target.** The measured table showed 32px track boxes and
36px section-nav pills and `.btn.small` controls. WCAG 2.2 SC 2.5.8 sets the floor at 24px
with spacing, so these passed the standard and missed the template's design-to-44 rule.
*Fix:* pills and small buttons to 40px, track boxes to 40px tall, `explain()` summaries to 44px.

**F-9 · Two primary actions below the fold.** Home's first primary action sat at 674px and
Settings' at 786px on a 780px viewport — off-screen on a smaller phone.
*Fix:* Home's primary action is now pinned in the action bar carrying the scope and track as
its context. Settings is reordered by frequency (§6.3.4) so **Your data** — the card a player
actually returns to — sits above Appearance; its first primary action is now at 582px.
*Why it mattered:* D-8. Four buried primary actions survived ten reading passes in the
reference build and fell out of one measured table. Same here: reading the screens found
nothing; the table found both.

### Pass 5b — Shipped-file sweep

**F-10 · A module was added without its service-worker app-shell entry.**
*Rule:* template §6.1 — adding a `src/` file updates the app-shell list and bumps
`CACHE_VERSION` in the same change.
*Target:* `src/viewstate.js` (added by the F-5 fix) was missing from `APP_SHELL`.
*Fix:* listed it, bumped the cache to `um-v2`, and added a harness check asserting the shell
lists every shipped file and no file that does not exist.
*Why it mattered:* the app would have booted fine online and failed completely offline — the
module 404s, the import chain breaks, nothing renders. A play aid that dies in a basement is
the specific failure the caching strategy exists to prevent, and only a mechanical check
finds it, because nothing looks wrong while you have a network.

### Pass 6 — Stress state

Re-probed against the `stress` fixture (3 plot sheets, 14 cast entries with rolled traits,
170 journal entries, two timed marks, a scene open with four interventions). No screen
exceeds 7.1 viewports; the journal pages at 40 entries; no horizontal overflow at 320, 360 or
390px.

### Pass 7 — Flow walk

Played a session end to end through the app. Terminal outcomes all offer an onward route: a
resolved scope offers a new plot sheet, a closed scene summarises and offers undo, an empty
journal links to the plot sheet, a nodeless sheet says so rather than showing an empty list.

---

## Cycle 2 — run after every cycle-1 fix

Two findings, both introduced by cycle-1 fixes. This is the reason for the stopping rule:
a clean pass proves nothing until the *whole cycle* is re-run against the fixed code.

**F-11 · The wizard hijacked every route on the More tab.**
*Target:* `renderMore` returned `renderWizard(host)` whenever a draft existed, ignoring the
requested section, so tapping Rules or Settings mid-preparation re-rendered the wizard and the
section nav read as broken.
*Fix:* the wizard renders on Home only; the other More sections render normally and carry a
"A game is half-prepared" card back to it. Found by the interaction audit, as four wizard
step-buttons that "changed nothing" on the *Rules* route.

**F-12 · The wizard's own step nav offered steps it would not go to.**
*Target:* `wizard.js` step buttons for not-yet-legal steps were rendered enabled and silently
did nothing when tapped.
*Fix:* they are `disabled` with a title naming the reason. §6.4 — a refusal explains the rule;
it does not fail silently.

**F-13 · Creating the game nulled the wizard's draft mid-`finish()`.**
*Rule:* not a book rule — the same seam again. `store.createGame` emits, `main.js` sees the
active game change and fires the clearers, the wizard's clearer nulls `draft`, and the next
line read `draft.universe` and threw.
*Fix:* `finish()` takes a local copy of the draft before creating anything.
*Why it mattered:* a **regression introduced by the F-5 fix**, and the reason the whole cycle
gets re-run rather than only the pass that found the original defect. The browser smoke walk
caught it on the first re-run: the wizard completed, threw, and never reached the plot sheet.

**F-14 · Track boxes measured 36px at 320px width.** Only visible at the narrowest supported
width, where eleven boxes flexed below the 40px target. `min-width` raised from 30px to 40px.

**F-15 · The action bar's context line wrapped.** Cosmetic, found by looking at a real render
rather than a number: "scene open · 1 check" broke to two lines on a 390px screen and grew the
bar. Truncated with an ellipsis, buttons no longer flexing.

### Cycle 2 result

After F-11 to F-14: unit harness 945 green, dead-data scan clean, browser smoke 304 green,
interaction audit 338 controls with no error, no unclickable control and no no-op, layout probe
clean at 320/360/390 under the stress fixture. **A full cycle with no new finding.**

---

## Cycle 3 — after adding GUM v2.2

**F-16 · A duplicate row — in the book, not the parser.** The harness's uniqueness check went
red on `evil-deeds`. Page 21 prints *Vandalism and destruction* at both 17 and 22.
*Fix:* recorded as `GUM_ERRATA` G1, surfaced in the rules library beside PUM's errata, and the
guard relaxed to "unique except for recorded errata" with an assertion pinning the duplicate to
exactly those two rows.
*Why it mattered:* the tempting fix is to dedupe. That would silently change a probability the
paper player does not get to change. A guard going red is not always a defect in the code —
here it was the code being right and the assertion being too strong.

**F-17 · Two Forge screens claimed a primary action they did not have.** The measured table put
`forge/world`'s first primary at 641px and `forge/character`'s at 770px on a 780px viewport. The
cause was the per-group "Roll all of X" buttons being styled primary — one per card, so none of
them is *the* screen's action.
*Fix:* demoted to ordinary full-width buttons. Those screens now honestly report no single
primary action, like the other browse surfaces.

**F-18 · The new toggle pushed Settings' primary action off the screen.** Adding the GUM row to
Optional rules moved Export JSON to 789px.
*Fix:* Your data moved to the top of Settings — it is the card that protects everything else,
and it now sits at 320px.
*Why it mattered:* the same defect as F-9, re-created by adding one row above it. Any screen
whose primary action is reached by scrolling is one edit away from being unreachable.

### Cycle 3 result

Unit harness 1,312 green · dead-data scan clean · browser smoke 362 green across 23 routes and
three fixtures · interaction audit 440 controls with no error, no unclickable control and no
no-op · layout probe clean at 320/360/390 under the stress fixture. **A full cycle with no new
finding.**

---

## Cycle 4 — sequence of play, completeness, and every button

Prompted by a report that the buttons did not follow the sequence of play. Eight findings.
Two are features the books have and the app did not; three are flow; three are hygiene.

**F-19 · The Forge sat inside the play loop.** Tab order was Play · Forge · Oracles · Scene.
GUM is prep-time by the book's own division of labour — "use GUM when setting a game up, and
SUM while playing it" — so the prep tool was sitting between the plot sheet and the oracles.
*Fix:* Play · Scene · Oracles · Forge · Journal · More. The three loop tabs are now adjacent
and in the order the loop runs.

**F-20 · The Play tab crossed a box above the control that calls the beat.** The track card
led, the beat controls followed. The procedure runs the other way: call a beat, play it, then
cross a box only if it mattered (§6.3.3).
*Fix:* the beat controls lead as **1 · Call a plot beat**, the track follows as **2 · Cross a
box**, the trigger reference is **3 ·** and folded — matching the Scene tab's existing 1/2/3.
The track's live position was never lost, because the persistent header carries it.

**F-21 · The loop of PUM p.5 crossed tabs with no onward route at any step.** The app had
every piece of the flowchart and no connective tissue: after confirming a beat nothing named
the scene, after closing a scene nothing named the next beat, and the oracles never led back.
Measured with the new flow probe: **every step of the loop needed the tab bar.**
*Fix:* a state-driven **What now** card on the plot sheet (open a scene / back to the scene /
ask an oracle / write it down, or "start another plot sheet" once resolved); a **While the
scene runs** card on the Scene screen (call a beat / ask an oracle / who is here); and the
scene-closed summary now offers the next scene and the plot sheet instead of a bare "Done".
The probe now reports every step offered in place.

**F-22 · The two player-named plot-node lists were missing.** PUM p.27's extension sheet
prints "My list: ____" twice, with the same ten slots and die rule as the printed categories.
*Fix:* two `custom` node categories that exist only once named, with rename and remove,
reachable by the Customized sheet's prompt column, offered GUM's grand oracle for filling, and
named by the player everywhere the app refers to them.
*Why it mattered:* D-22 again — a Permission the book grants and the app silenced. This one is
the difference between "the four categories PUM ships" and "the categories *this* game needs".

**F-23 · The Game notes area was missing.** Printed on both plot-node sheets.
*Fix:* `scope.notes`, folded under "This scope" on the plot sheet with the mission and the
starting point — which also moved that prep context out of the way of the beat controls.

**F-24 · A Yes/No answer did not offer the beat it triggers.** PUM p.28 turns two answers
straight into beats. The app had the trigger table on the Play tab as reference and never
applied it at the moment it fires.
*Fix:* after any Yes/No answer, both triggers are offered with the rule cited; choosing one
rolls the beat, journals it with the trigger that produced it, and opens it on the plot sheet.
Offered, never fired — the app cannot know which question was asked.
*Why it mattered:* §15 — a narrative game's app is judged on its prompts. This is the single
place the books' own procedure was legible to the app and it was not acting on it.

**F-25 · Journal filters covered eight of the thirteen kinds the app writes.** GUM rolls, prep
entries, node writes and timed beats could not be found again in a 500-entry log.
*Fix:* one filter per kind actually written, plus a **session break** marker — which the spec
claimed under ruling A6 and did not have. Nothing is reset or rolled at one; neither book
defines a session procedure, and the marker says so.

**F-26 · The Download button was silent when the browser blocked it.** Found by the new modal
audit: a page-initiated download in an embedded viewer neither downloads nor throws.
*Fix:* it now always reports, so the control is never one that appears to do nothing.

### Tooling added this cycle

**`tests/audit-modals.mjs`.** The interaction audit clicks top-level controls and discards
whatever dialog opens — so **284 in-dialog buttons had never been audited at all**. The new
pass opens each modal and clicks each of its buttons in isolation. Its first run produced 21
findings, 19 of which were its own false negatives: a dialog that closes itself and opens
another leaves the modal *count* at 1, so the swap read as "changed nothing". Fingerprinting
the dialog rather than counting dialogs left the two real ones (F-26).

**`tests/probe-flow.mjs`.** Walks the book's loop and reports, per step, whether the screen the
player was already on offered the next step — the measurement behind F-21.

### Cycle 4 result

Unit harness 1,323 · dead-data clean · browser smoke 362 · interaction audit 453 controls ·
modal audit 284 in-dialog buttons · flow probe: every loop step offered in place · layout clean
at 320/360/390 under stress. **A full cycle with no new finding.**

---

## Verified clean — do not re-litigate

- **Data values.** Every table's row count, range coverage and uniqueness is asserted in the
  unit harness (1,312 assertions). GUM's 43 tables each carry exactly `die` rows, every roll
  resolves, rows are unique but for the one recorded erratum, and no row carries an embedded
  list number — the signature a column-merge parse artifact would leave. The granular columns tile 1–100 in all 21 register/band
  combinations; all 24 SUM tables tile their die exactly; both d100 enrichment tables cover
  1–100 with 50 unique paired rows. Track box counts are measured from 300 dpi renders, not
  estimated, and pinned by `EXPECTED_TRACK`.
- **The two bias mechanics.** PUM's returns both answers and commits neither; SUM's keeps the
  minimum or maximum. Asserted over 300 rolls each.
- **The compulsion.** "Leave it to destiny" never returns an empty slot, and terminates
  against an all-empty list rather than hanging.
- **The threshold.** `isResolved` flips on exactly the final box, never before; crossing stops
  at the last box; a trackless sheet can never report a crossing.
- **Normalization.** An unknown sheet id falls back to Standard, non-string nodes are dropped,
  an over-long track is clamped, missing categories are back-filled, out-of-range settings
  return to their documented defaults.
- **Guards proven to bite.** Three data guards (SUM tiling, granular tiling, the node die) and
  one layout guard were each watched failing against deliberately broken code, then restored.

## Known and accepted

- `derived.NODE_IDS`, `router.TABS` and `rules.granularColumn` are exported for the harnesses
  and read by no shipped surface. Kept deliberately: they are test-support API, and the scan
  reports them as notes rather than findings so the distinction stays visible.
- The PWA update path is implemented (an "Update available — tap to reload" toast on
  `updatefound`) but is **not** covered by an automated test. It is the one PWA behaviour that
  cannot be verified by looking at the running app; verifying it needs a deploy-and-reload
  cycle the harness does not perform.

---

## Cycle 5 — every tab, every button, every plot sheet

The stopping rule says a cycle counts only when it produces **no** finding. This cycle was
aimed at the question the previous four never asked: *the audits run one fixture — what about
the other nine plot sheets, and the wizard?*

### Pass 1 — coverage of the audits themselves

**F-14a · Two whole regions of the app had never been clicked.**
*Target:* `tests/interaction.mjs` and `tests/audit-modals.mjs` both boot the `mid-session`
fixture — a Standard sheet, mid-play — and the prep wizard only renders while a draft exists,
so it never appeared on any audited route.
*Fix:* new `tests/audit-deep.mjs`: a sheet matrix (all ten sheets × the three Play routes ×
every control, with the dialogs of the structurally distinct sheets swept button by button),
a wizard pass (every control on every step, re-entered in isolation), and a **write-back
invariant** asserting no click may put more into a plot-node list than the Nodes screen can
read back.
*Why it mattered:* every finding below except F-20 lives in the region those two audits could
not see.

### Pass 2 — the sheet matrix

**F-15 · Plot-node lists you could fill and never read again.**
*Rule:* the expanded categories — Notable characters, Interesting locations, and the two
player-named lists — are printed on the plot-node **extension** sheet (PUM pp.26-27), not on
the all-in-one sheets.
*Target:* `derived.nodeSlots` guarded them with
`if (cat.expanded && !sheet.expandedNodes) return sheet.nodeSlots > 0 ? sheet.nodeSlots : 0;`
— a branch that returns the same value as the line below it, so the guard did nothing. Both
the Nodes screen and the wizard *hid* those lists on such a sheet, so a Standard sheet's own
prompt column (face 5 reaches Notable characters, face 6 Interesting locations) rolled on a
list with five invisible slots. "Add new" on the beat card wrote into it; so did the Forge's
"Keep it →" and the cast's "Add to plot nodes". None of it could ever be seen or edited again.
*Fix:* the guard returns 0. `roller.invokeNode` reports **why** a list is unavailable, and the
beat card answers each reason properly — for a list the sheet does not print, the prompt
stands on its own and offers *Bring one in*, *Recall* from the cast, and *Roll from GUM*.
*Why it mattered:* this is worse than a missing feature. A missing feature is visible; a
write with no read looks like it worked.

**F-19 · A rules value hardcoded in `src/`.** `cast.addToNodes` computed the list length as
`Math.max((scope.nodes[catId] || []).length, 5)` — the sheet's slot count restated in a screen
module (§10.2), and wrong on a ten-slot sheet. Reads `derived.nodeSlots` now, and says so
plainly when the sheet prints no such list.

### Pass 3 — the wizard

**F-16 · The same black hole, one step earlier.** `wizard.stepNodes` skipped the expanded
categories on a sheet that does not print them but not the two *unnamed* player-named lists,
which `nodeSlots` correctly reports as having no slots until named (PUM p.27). Prep offered
ten slots in each of two lists called "My list"; everything typed there vanished on finish.
*Fix:* an unnamed list gets no slots in prep either, and naming one is now part of prep —
`draft.customNames` carried through `store.createGame` into the new scope.

**F-23 · Controls that silently did nothing with an empty field.** The wizard's
"Add protagonist", and the new "Add a plot node list" beside it, both read the name input and
returned when it was blank. Disabled until there is a name — a control that says why it cannot
act yet beats one that appears to work and doesn't (§6.4).

**F-24 · The plot-sheet picker had no selected-state semantics.** Ten visually distinct cards
and, to a screen reader, ten identical buttons with no indication of which was live. They
carry `aria-pressed` now; that also tells the audit that the chosen one is *meant* to do
nothing when tapped.

### Pass 4 — the permission sweep, re-run

**F-17 · The twelfth Permission was a sentence.**
*Rule:* a full track resolves a scope, but the scope is the player's to end — and Sandbox and
Improvised have no track at all, so on those sheets saying so is the *only* way a scope can
finish. The app said this in prose on the track card and offered no control (D-22).
*Fix:* `scope.closedAt`, `store.setScopeClosed`, `derived.isEnded`, End/Reopen on the track
card (mandatory on a trackless sheet), a rules-library entry, and normalization.

**F-18 · Half of a permission had a control.** PUM p.9 allows a specific plot node invocation
"rolled or chosen"; only *chosen* — the Invoke button on a written row — existed. Each node
card now also rolls its own list as a beat.

### Pass 5 — the audits' own detector

**F-20 · A dialog opened by a dialog action was closed again by that action.**
*Target:* `ui.modal`'s action wrapper ran `closeModal()` unconditionally after the handler.
When the handler had itself opened a follow-up dialog, `closeModal()` closed *that*. So a
**voluntary** track advance onto a marked box fired the timed beat, journalled it, and then
closed the modal announcing it before it could be read; the same for a scope resolving.
*Fix:* the wrapper closes its own dialog or nothing. Guarded in `audit-modals.mjs`, watched
failing before the fix.
*Why it mattered:* nothing mechanical could see it. The dialog *does* open, so every
"changed something" check passes. It was found by reading the wrapper's contract and then
proving it in a browser rather than trusting the reading (the F-7 lesson, applied).

**F-21 · The node die switched one entry late.**
*Rule:* PUM p.25 — "roll 1d10 in lists with less than half the entries filled; otherwise roll
1d20". Exactly half is already *otherwise*.
*Target:* `derived.nodeDie` used `fill > 5`, which implements "more than half". The app
therefore disagreed with the rule text quoted in its own ruling A7, and with its own
on-screen note ("1d10 while a list is less than half full"). At 5/10 filled — a common state
— it rolled a d10 and could not reach the second half of the list at all.
*Fix:* `fill >= slots / 2`. Ruling A7, the rules-library entry, `docs/rules/plot-beats.md` and
the on-screen note all reworded to agree.

**F-22 · The audits' change detector had a blind spot.** All three compared
`innerHTML.length`. Choosing a different plot sheet in the wizard swaps "Chosen" (6) for
"Choose this sheet" (17) on one card and back on another — a net length change of exactly
zero, reported as "changed nothing". They hash the markup now. Controls marked
`aria-current` / `aria-pressed` are excluded instead, because for those doing nothing *is*
the correct behaviour.

### Verified clean this cycle

- Every table in all three books is reachable from a screen — now asserted, not assumed:
  43 GUM tables, 24 SUM tables, 15 PUM oracles.
- Every journal kind the app writes has a filter that finds it — source-scanned.
- 3,339 write-back checks across ten sheets and the wizard: nothing written where nothing
  can read it.
- 1,480 controls and 1,857 in-dialog buttons clicked in isolation across the sheet matrix:
  no JS errors, no unclickable controls, no no-ops.
- The book's loop still walks without the tab bar; layout still clean at 320/360/390.

### The stopping rule

The first deep run produced thirty findings, twenty-seven of which were the detector's own
blind spot (F-22). The second produced three, all real (F-23, F-24). The third — with every
pass re-run after those fixes — produced none: 1,427 controls, 1,857 in-dialog buttons and
3,286 write-back checks across ten plot sheets and the wizard, plus unit, dead-data, smoke,
interaction, modal, flow and layout, all clean. **Cycle closed.**

---

## Phase 8 — inspiration prompts on every text field

Not an audit pass: a feature, recorded here because it retired a surface the audits had been
checking and changed what "every control" means.

**What was built.** Every text input in the app now carries a collapsed *Stuck? Roll three
words* line. Opening it rolls three GUM tables chosen by what the field is for; each word is a
chip that appends to the field. `GUM_FOR_FIELDS` maps 29 fields, with the grand oracle as the
fallback for anything unmapped — which is what the grand oracle is for.

**No new content.** The same 43 tables, pointed at a blank. Nothing was authored, so §1.0's
*never invent* rule needed no deviation and the extraction ledger is unchanged.

**Three decisions worth recording, because each closed off a worse version:**

1. *ui.js must not know GUM exists.* `ui.js` is the primitive layer and imports only `core.js`;
   having it import `forge.js` would have made a cycle (`forge` already imports `ui`) and put
   book content in a module that has none. Instead `ui` exposes `registerInspire`, the Forge
   registers a factory at boot, and `ui` only mounts whatever it returns.

2. *The block had to render inside the dialog, not open one.* The obvious build was to reuse
   `gumSuggest()` — but a dialog opened from inside a dialog replaces it, taking whatever the
   player had typed. That constraint is what retired `gumSuggest` and its seven standalone GUM
   buttons: the block does the same job in place, including the *All N tables* roll that was
   `gumSuggest`'s only unique capability.

3. *Append, never replace.* A stray tap must not cost a line already written. The wizard's
   node lists made this sharp — one block serves ten slots, so its getter and setter have to
   agree on which slot they mean, or appending to a full list would overwrite the last entry
   instead of extending it.

**A stated cost, not a hidden one.** Only words the player keeps are journalled, by decision.
That makes the Dice view a record of the dice *used* rather than every die thrown, so the Dice
screen now says exactly that rather than presenting a partial count as complete.

**Coverage the feature forced.** The modal audit collected `.modal button` before clicking
anything, so controls behind a `<summary>` were invisible to it — every inspiration block would
have shipped unaudited. It now expands each dialog's folds first: 300 in-dialog buttons became
492. The deep audit expands `details.inspire` on the Play routes for the same reason. A
source-scanning unit test asserts every `promptModal` in the app names a field, so a dialog
added later without one fails the harness; it was watched failing before it was trusted.

### Phase 8a — the map was wrong on shape

Reported from play, not caught by any pass: rolling on *Name this game* and *Universe or RPG*
returned answers with nothing to do with the field.

**The bad premise.** Phase 8 assumed every text field could be served by *some* table, with the
grand oracle as a catch-all. It cannot. Every GUM row is a descriptive phrase about fiction;
that is the right shape for a piece of story and the wrong shape for a **proper name** or a
**real-world answer**. *Universe or RPG* wants "D&D 5e" — GUM generates worlds, not the names
of published ones. Pointing a table at it produced "Captive: prison, police station", which
reads as noise.

**Why no harness caught it.** Every guard asked *is a table wired here and does it exist* —
questions about plumbing. None asked *does what this table emits fit what this field wants*,
because that is a judgement about meaning. The guard now enforces the weaker but checkable
form: a dialog must either name a field or carry a `// no-inspire:` line saying why it does
not, so an unconsidered field fails rather than silently defaulting.

**Fixes.** Eight fields lost the block and gained a recorded reason (`INSPIRE_ABSENT`).
Name fields no longer take the concept into the name box — `promptModal` gained an optional
second field so "Add a character" asks for the name and the rolled archetype lands in the
notes beside it, restoring what the retired `gumSuggest` flow did and undoing a regression
Phase 8 had introduced. `game-title` now rolls only the two word-shaped grand tables, and
`game-tone` an adjective plus the world's state.

**The absence is shown, not merely recorded.** Data with no shipped surface is the §0 defect,
and a player who sees one blank offer three words and the next offer none deserves the reason:
Rules gains a *Where the app does not roll* card, listing all eight with their explanations.

---

## Phase 9 — friendliness, measured first

Ten routes profiled for height, control count, above-fold controls and jargon density before
anything changed (D-8: four buried primary actions once survived ten reading passes and fell
out of one measured table).

**F-25 · Undo was four moves from the thing it undid.** Measured: offered on exactly one
screen — Settings — at 417px scroll depth, while every mutating action pushes a snapshot.
*Fix:* thirteen actions raise a toast carrying an Undo button, through a `registerUndo` seam
that keeps `ui.js` ignorant of the store, matching the `registerInspire` pattern.

**F-26 · One player action was not one undo.** Exposed by F-25's own smoke test: a voluntary
track advance writes two snapshots — the crossing, then its journal entry — so tapping Undo
took back the entry and left the box crossed. *Fix:* `store.transact(label, fn)` suppresses
intermediate snapshots. The scene-close flow's hand-counted `store.undo(); store.undo();`
collapses into it, which is the same bug it had been working around.

**F-27 · The undo toast covered the action bar.** Making the toast pill clickable so its
button would work gave the whole pill pointer events; the toast mount sits directly above the
action bar, so the screen's primary control was unclickable for as long as a toast showed.
Caught by the interaction audit as *"Proposal" cannot be clicked*. *Fix:* the pill stays
inert, only the button is live.

**Density.** Journal entry tools fold behind the entry (two permanent buttons per entry, 40
controls of furniture: 7vh → 6.3vh). Rules groups collapse: 4.7vh → 2.7vh. Prep shows three
node slots per list with *add another* rather than up to sixty empty boxes.

**Teaching.** The track names what its current section is for, the way the beat card already
explains a proposal's kind — app voice, uncited, keyed to the section names the printed sheets
use. A twelve-term glossary answers "what is a plot scope", which a library organised rule by
rule structurally could not.

**Consistency.** Scene exploration, battle and discovery pin their primary action; they were
the only screens leaving it inline.

**Six tabs became five.** The Forge is prep, not play, so it is now a section of More carrying
its own second-level nav — the shape the Journal already uses for its filters. At 320px each
tab went from 53px to 64px. The gating moved with it: `gatedSections` hides the section when
GUM is off, where `gated` used to hide the whole tab.

---

## Phase 9a — orientation and width

Every harness in this project runs portrait at 320–390px. That is the right default for a
phone-first play aid and it meant two whole classes of viewport had never been looked at.

**F-28 · Landscape spent half the screen on furniture.** Measured at 740×360 — a phone turned
sideways — header + action bar + tab bar took **48%** of the viewport on seven of ten routes,
leaving a 187px window to scroll up to 5.6 screens through. *Fix:* the app header stops being
sticky, because brand, home and theme are the one piece of chrome carrying nothing you need
mid-scroll; the tab bar drops to icons with labels kept for assistive tech; the plot header
compacts and drops its drawn track, whose information is the count printed beside it. The
plot header itself stays pinned — it is the Threshold, which is the reason it exists. Worst
case 40%, and 25% where no action bar is pinned.

**F-29 · Desktop was a phone in the middle of a window.** 720px of content in 1440px, under a
tab bar stretched the full 1440px. *Fix:* cards flow two-up in a 1000px grid with every other
child spanning both columns, and the tab bar's buttons are padded to the column while its
background still spans. `play/nodes` 6.1 → 1.1 screens; the journal 6.3 → 2.2.

Both are now permanent smoke passes — a landscape sweep and a wide sweep across every route,
asserting a chrome budget, two-column flow, no overflow and 40px tab targets.

**F-30 · An oracle answer never said what it answered.** The typed question went into the
journal's detail and nowhere else, so the card read `Yes or No · deterministic / 2 / No` with
nothing attached. Ask, roll, get interrupted, come back — and the answer is a bare word. The
result card carries the question now; the rollers already returned it.

**F-31 · The Forge claimed to keep what it could not.** With no game open, "Keep it →" offered
*Add to the cast*, `store.addCast` found no active game and did nothing, and the toast said
"Added to the cast." Found while pinning the first-run primary action. *Fix:* with no game the
dialog says there is nowhere to keep it yet and offers to prepare one.

**Density and first run.** The Nodes screen reveals what is written plus one empty slot, with
*Show all N* — 6.1 → 2.3 screens, 104 → 32 controls at 390px, the same disclosure prep got in
Phase 9. And the first screen a new player sees was the only one in the app not pinning its
primary action; it pins *Prepare a game*.

**A refactor the fixes required.** Three bar heights were restated as literals inside five
`calc()` expressions. They are `--hdr-h`, `--tabbar-h` and `--actionbar-h` now, so a media
query can shrink a bar and every dependent spacer follows.

---

## Phase 9b — the palette, looked at rather than measured around

Every previous pass measured *structure* — heights, control counts, overflow, taps. None of
them rendered the app and looked at it. This one did: screenshots in both themes at 390×780,
740×360 and 1440×900, plus a contrast audit of every visible text node against whatever is
actually painted behind it (not the theme's nominal paper — most text sits on a card).

**F-32 · The palette had never met WCAG AA.** 145 failing text nodes in light, 41 in dark.

| | ratio | needs |
|---|---|---|
| label on the primary action | **3.52** | 4.5 |
| accent as text (`2/11`, section names) | **3.12** | 4.5 |
| `--ink-3` on paper (`.muted`, `.cite`, hints) | 4.07 | 4.5 |
| `--ink-3` on a card, dark theme | 4.48 | 4.5 |

*Fix:* split the accent rather than repaint the app. `--accent` stays the identity colour for
fills; a new `--accent-text` (#b64d30) carries anything read as words; `--accent-ink` becomes
ink instead of white, which fixes the primary button at 4.57 **without** darkening the orange
that §1 builds the whole theme around. `--ink-3` moves to #656d87 light, #8c8678 dark.

The alternative — darkening the fill to #c35334 — also reaches 4.56, and was rejected because
it repositions the app's one accent colour to fix a label.

**F-33 · Two equal-weight primaries, one of them a duplicate.** The plot sheet's "Call a plot
beat" card offered *Modified proposal* and *Random prompt* both in accent, while the pinned bar
carried *Random prompt* again — the same label twice on one screen, three accent buttons
competing. The card's pair are secondary now; the pinned bar is the call.

**F-34 · The `explain` fold had no open/closed state**, while `.acc` folds have carried `+`/`–`
since Phase 6. It has one now. And because the inspiration block reuses `.explain`, it wore the
`?` that means "explanation" — reading as *"? Stuck? Roll three words"*. Dropped.

**The gate.** A contrast sweep over both themes and every route joins the smoke harness, with
two decimal places of slack for sub-pixel colour rounding. Watched failing on the old tokens
before the new ones were trusted.

**Stopping here.** Three friendliness rounds have run: the structural pass, orientation and
width, and now colour. What remains is preference rather than defect, and the honest thing is
to say so rather than keep generating lists.

---

## Source re-read — the three books, read again against the shipped data

The books were supplied a second time and read cover to cover, then checked mechanically
rather than by eye: every table row in `data-*.js` was matched against the text of the page it
cites, and every row's *position* in its table against the printed numbering.

**What held.** All 1,580 GUM rows appear verbatim on the page they cite **and at the printed
number** — the coordinate reconstruction's numbering survived a second, independent check.
Every PUM oracle row, quantifier, granular answer, Description and Focus word, ABCD row,
modified proposal and per-sheet prompt column matched its page exactly. All 24 SUM tables tile
their die with no gap or overlap, and — the thing that would have inverted the Rule of Bias
across the whole supplement — **not one table is transposed**: for all 24, the app's low half
is the half the book prints as the favourable one. The granular d100 bands were re-checked
number by number against p.24 and are exact. G1 (the duplicate at 17 and 22, GUM p.21) is real
and is still kept as printed.

Fifty-six SUM rows differ from the printed string by a word — "Remind **us** what exactly
**brought** the characters here" for the book's "Remind what exactly bought", em dashes for
commas, a dropped filler word. All fifty-six were read against the page: every one is a
transcription of the same row, several of them fixing a typo in the book. Nothing changed.

**F-35 · The Exploration sheet was given plot node slots it does not print.** PUM p.19 prints
no plot node lists — checked by counting the `Add new, choose, or reroll` placeholders on every
sheet page: Standard 20, Story-focus 30, Scenes 20, Dungeon 20, Story-parts 20, and **zero** on
Journey, Exploration, Improvised, Sandbox and Customized. Journey, Sandbox and Customized were
already modelled as what they are — sheets that pair with a Plot Nodes sheet, which is ten
slots and carries the extension lists. Exploration was modelled as a five-slot, base-lists-only
sheet, which is neither of the two things the book prints: it invented a list length, and it
denied the sheet the two lists its own printed prompt column reaches for at 5 and 6, so a
*Meet or recall a notable character* prompt on an Exploration game could never reach a list.
Now 10 slots and `expandedNodes: true`, exactly like Journey, whose printed page is identical
in this respect.

**F-36 · "Enrich it" — a rule with an engine and no control.** PUM p.4 states the descriptive
and story oracles as *1d10, then 1d100 on the enrichment table*. Settings can switch the d100
off wholesale (it defaults on, as the book has it), and `roller.rollOracle` has always taken an
`enrich` flag — but no surface ever set it, so with the toggle off there was no way to reach
the book's own second half for the answer in front of you. The result card now offers **Enrich
it** whenever a descriptive or story answer has no d100 word yet; it rolls only the enrichment
die and folds it into the same journal entry rather than re-rolling the answer.

**F-37 · Three screens spelled out which sheets carry the extension lists.** `src/cast.js`,
`src/sheet.js` and the tutorial each named "Journey, Story-focus, Sandbox and Customized" by
hand — content restated in `src/` (§10.2), and a list that F-35 would have made wrong in two
places. Now read from the sheet table through `derived.expandedSheetSentence()`. The same line
in `sheet.js` cited the extension sheet as PUM p.26; p.26 is the *base* node sheet and p.27 is
the extension. Corrected.

**Recorded, not changed.** SUM's contents page (p.2) and its section headings disagree three
times — *Investigation* / **Discovery** (p.7), *Challenge circumstance* / **Challenge
conditions** (p.5), *Revealing discovery* / **Revealing finding** (p.7), *Lingering stories* /
**Lingering backstories** (p.11). The app already follows the page headings in all four cases,
which is the same ruling as A2: the surface you play from wins. GUM p.12 numbers itself "12 of
28" in a 26-page book. Neither affects a roll, so neither is surfaced as an erratum.

---

## Phase 11 — the never-played-solo pass

The friendliness rounds measured **reachability**: can the player find the next thing. This one
measured **comprehension**: at each step of the first run, the DOM was captured with the
contents of every closed `<details>` stripped out, because an unopened fold is not read.

| step | words a stranger sees | hidden in folds | book terms on screen |
|---|---|---|---|
| cold open | 54 | 15 (22%) | plot scope, PUM, SUM, GUM |
| prep 1–3 | 45–125 | 12–20% | universe, protagonist, mission |
| prep 4 · sheet picker | **444** | 121 (21%) | plot beat, random prompt, plot node, plot track, bias |
| the plot sheet | 149 | 54 (27%) | + modified proposal, oracle |
| an oracle answer | 114 | 29 (20%) | bias, PUM p.28 |
| a beat on the table | 166 | 63 (28%) | d10, confirm |

**What the numbers said.** The app teaches well *at the point of use* — the beat card names
the node category, explains what an empty slot means, and says in plain words "play it out in
the fiction, then confirm it above — or decide it did not matter". But the framing that makes
any of it make sense is folded shut on all twelve screens, and the single sentence a newcomer
most needs — *this app never tells you whether you succeeded; bring your own RPG or narrate
it* — was inside the cold-open fold. Nothing on any screen said the player is the one who has
to talk.

**F-38 · The teaching was collapsed by default.** `explain()` now starts **open** and collapses
everywhere, permanently, the first time the player closes one — re-opening one brings them all
back. The gesture is the setting: a reader who has taken the point never takes it twice, and
nobody has to discover that a fold exists. `ui.js` stays free of Settings through a third
registration seam, `registerExplainState`, alongside `registerInspire` and `registerUndo`. A
Settings toggle restores them, and the smoke harness's old assertion — *explain() starts
collapsed*, now false by design — is replaced by the round trip: close one, the next screen is
collapsed too, the choice is in `localStorage`, re-open one and they all return.

**F-39 · Nothing said what a solo RPG is.** `NEW_TO_SOLO` (`data-guidance.js`, the app's own
words, not the books') sits above the fold on the cold-open Home and only there: you are the
author and the actors; you ask the app instead of a gamemaster; it does not resolve actions.
Plus the loop in one line.

**F-40 · Nothing said the loop out loud.** `FIRST_BEAT_COACH` runs above the beat card until
the first beat of a game is confirmed — "roll a beat, say out loud what it means, and only then
confirm it — or decide it did not matter". It disappears for good when a box is crossed, so
there is nothing to dismiss and no state to store.

**F-41 · The sheet picker was the wall.** Ten pacing structures, 444 words, at step 4 of 5,
before the player has rolled anything. PUM p.3 answers this itself — *"if this is your first
time, the standard Plot Sheet is a good start"* — so Standard leads alone, carrying that
citation, with the other nine behind *Show all ten plot sheets* (and the chosen sheet always
stays on screen). The step goes from 17 controls to 9, and the first run loses a tap because
Standard is already selected.

**Verified after.** The first-run probe still walks cold open → prepared game → open scene →
oracle → beat → confirm → close → journal in 18 taps with every step offered in place.

---

## Phase 11b — the novice audit, applied to every function

Phase 11 fixed the first-run path. This pass asks the same question of **every** surface:
`tests/audit-novice.mjs` walks all 20 routes and opens all 71 dialogs, checking four things
that can be checked mechanically.

1. every route carries its *what this does* note, and it is open on a fresh install;
2. every route leads with a sentence, not a control (the section nav is chrome, not content);
3. every book term a screen displays is either written out in prose on that screen or the
   screen offers a route to the rule that defines it;
4. **every dialog says what it does before it asks** — one sentence of eight words or more, or
   a labelled field with a hint.

First run: **40 findings**. After: **0**.

**F-42 · Thirteen dialogs asked for typing and explained nothing.** The worst were the four
plot-node lists: a dialog titled *Pending questions* with an empty box and a Save button, to a
player who has never read PUM p.28. Each now carries the book's own definition and examples,
read from `NODE_CATEGORIES` rather than restated (§10.2). Also fixed: *Add a protagonist*
(p.3's "your eyes and ears… you control their thoughts, voice and actions"), *Add a character*
and *Add a location* (why keeping them matters — a prompt can bring them back), the protagonist
and cast entry dialogs, both journal-writing dialogs (a note sits beside the dice; it does not
change them), and Home's *This game* and *Plot sheet* editors.

**F-43 · Four screens used the books' vocabulary with no route to a definition.** Cast said
"plot node" while explaining nothing about them — it now links to the rule and says the thing
that actually matters: being in the cast does not put someone in the story's reach, only a plot
node does. Journal named its filters after roll kinds and now says what an oracle and a beat
are, linking to the rule.

**F-44 · The glossary was folded shut.** The rules library is where "what does that word mean"
is answered, and its glossary card — the only card on the screen that answers it — was
collapsed. It opens by default now; the rule groups below stay folded, which is what keeps the
screen navigable. The screen goes 2.9 → 4.7vh, which is accepted here: this is the reference
screen, and a glossary you must expand before it defines anything is the §0 defect in miniature.

**F-45 · The guide's parts were four closed rows of jargon.** Each part's blurb moved outside
its fold, so the screen says what each part covers without opening anything, and the first
quick-start step opens by default until the walkthrough is marked read. The screen's note also
names the vocabulary and points at the glossary.

**What the audit cannot check.** Whether the sentences are any good. It checks that a sentence
is there, in the right place, at the moment the app asks something of the player — which was
the failure mode in every one of the 40 findings.

### Phase 11c — the residuals

Three things the novice pass left standing, each measured.

**F-46 · A preference was a move in the game.** `setSetting`, `setTheme` and `setTextScale`
each took an undo snapshot. The stack is capped at twenty, so a player collapsing the *what
this does* notes across five screens — which is one setting write per screen — silently pushed
five real, undoable actions off the end of it. Preferences now go through `store.prefer()`,
which emits without snapshotting. They are their own inverse: the control that set one sets it
back, and Settings holds all of them. The guard was watched failing before the fix was trusted.

**F-47 · One rolling screen still had an inline primary.** `scene/people` left its first action
521px down the page once the notes opened, while Arc, Exploration, Battle and Discovery all pin
theirs. It pins *Roll Meet reaction* — first contact is the book's own first depth and the one
a scene that has just met someone starts from.

**F-48 · The journal was the tallest screen in the app.** Forty entries a page came to 97
controls and 6.6vh under the stress fixture. Twenty pages it to 57 and 3.8vh; the *Show N more
of M* control already told the reader how much was left, so nothing is hidden that was not
already one tap away.

### Phase 11d — the three that were named and left

**F-49 · The rules library buried its glossary.** 4.7vh, and measuring the screen said why: the
glossary is 1300px, but *Where the app does not roll* was 514px, *Errata* 251px and *From the
books* 231px, all permanently open — three chapters of prose wrapped around the one card a
player arrives at this screen to read. All three now group-fold with a count, like the eight
rule sections already beside them, and the glossary runs each term into its own definition
rather than stacking term above body. **4.7 → 3.4vh**, with nothing removed.

**F-50 · The node screen showed every written entry.** Each written entry carries its own
Invoke (PUM p.9's chosen half), so a full eight-list sheet was 89 controls across 5.3 screens —
the second-tallest screen in the app. It now shows four written entries plus one empty per
list, and *Show all N slots* reports how many written ones remain behind it. **5.3 → 4.7vh, 89
→ 77 controls.** No permission is lost: the rolled half (*Roll this list*) still reaches every
slot including hidden ones, the die size and fill count are still on the header, and one tap
brings the rest back. This revises the Phase 9 decision to show everything written — that was
measured on a five-slot Standard sheet, and does not survive a ten-slot sheet with eight lists.

**F-51 · Settings' primary was inline at 390px.** Export is the one action on that screen with
a consequence — the card says so itself ("a game you cannot take with you is a rental") — so it
is pinned with Import as its secondary, and the inline copy drops to a plain button so the
screen carries one accent rather than two.

---

## Cycle 6 — reachability, vocabulary, and the stopping rule as a command

Prompted by two questions. *How idiot-proof is it, for someone who never read the manuals and
does not know how to play a solo RPG — and is anything missing that a user cannot reach?* And:
*how do I make the test keep running until nothing is reported?*

Cycle 5 asked whether a stranger could tell what each surface is FOR. This one asks whether
they can **get to it**, whether the words mean anything, and whether each surface is honest
about what it is doing. It runs in three states — no game, a game in play, a resolved scope —
and the first of those is the one no audit had ever visited, because every browser pass boots
the `mid-session` fixture.

**F-27 · Nine rolling surfaces worked with no game and silently discarded the result.**
*Target:* the five oracles, the four SUM table screens, and the Forge all render and roll
perfectly with nothing prepared. `store.addJournal` → `mutate` → `activeGame()` returns null →
return. The entry is dropped without a word, while the Journal tab's own empty state promised
"the journal fills itself as you play".
*Fix:* `ui.noGameNotice()` on all of them, stating it **before** the roll with the way out
beside it.
*Guard:* `audit-reach.mjs` asserts both halves — the notice is present, **and** rolling with no
game really does leave the store empty. A notice that lied would be worse than none.

**F-28 · 44 controls whose entire accessible name was a die size.** Every Forge table row
renders `<button>d20</button>` beside its name: unambiguous to the eye, forty-four identical
buttons to a screen reader. The same defect in two more shapes — the descriptive and story
oracles' two-line `<strong>`+`<small>` label, which reads back as "Someonewho" and
"Objectwhat for"; and the action bar's one-word primary "Ask", whose qualifying context
("1d10 · deterministic") lives in a sibling span its name never reaches. All three named
properly; `actionBar` now folds its context into the name automatically when the label is short.

**F-29 · The glossary stopped where a beginner starts.** The twelve terms added in cycle 5
define PUM and SUM's machinery — and assume the reader knows what a solo RPG is, what a
gamemaster does, what a d20 is, and what a scene is. Extended to **38 terms in six groups**,
opening with a group that assumes nothing, and covering GUM and the app's own words. Every
entry now carries an `id`, a `group` and an `aka` list.

**F-30 · The glossary waited to be looked up.** It answered "what does that word mean" only
for a player who already knew to go to Rules and open the fold. New `src/glossary.js`
registers a decorator with `ui.explain()`, so **every** "what this does" note in the app grows
chips for the jargon its own text uses, each landing on that specific entry. Registered once
in `main.js`; not one call site changed, so no screen can forget to teach its own vocabulary
(D-22). `audit-novice.mjs` was widened to recognise a chip as the per-term route it already
counted a generic "read the rule" link as — which is what its own comment describes.

**F-31 · One destination, two labels.** Home said "Read the first-session walkthrough"; the
new first-run notices said "I've never played solo". Unified: one label for one destination.

**F-33 · The layout probe's verdict had to be inferred from its own table.** Tooling, not the
app — found the moment the new runner read the probe's output and matched the word "overflow"
in its **column header**. Same class as F-7. All three probes now end with one `VERDICT:` line
and the runner reads only that.

**F-34 · Two probes started measuring the chips instead of the loop.** Introduced by F-30 and
caught by the same cycle. The flow and first-run probes tap by visible-label substring, and
the glossary entry "Confirming a beat" renders a chip at the top of the Play screen — so
"Confirm" matched the chip, the walk landed on Rules, and the next four steps failed from the
wrong screen. A definition link is not a step of play: the probes now exclude `.chip.term`.
Verified by re-running — the walk lands on Play → Scene → Journal exactly as before the chips
existed, which is what distinguishes this fix from making a test pass.

### The stopping rule, executable

The template's rule is *done when one complete cycle of every pass produces no finding*, and
running twelve passes by hand makes it easy to fake: fix A, re-run A, ship, never notice the
fix broke B. F-34 is that failure mode caught by the new runner on its first outing. New
`tests/cycle.mjs`:

- `npm run cycle` runs all twelve passes in order, **never stopping at the first failure** — a
  runner that bails hides how much is broken — gathers every finding into one report, and
  exits 0 only if the whole cycle was clean;
- `npm run cycle:watch` re-runs the entire cycle on every shipped-file change and exits itself
  the first time one complete cycle reports nothing;
- `--repeat N` re-runs up to N cycles, which is how a flaky pass shows itself;
- `--only unit,reach` narrows it while iterating.

Two report-only passes were made able to fail so the rule can see them: `audit-novice.mjs` and
`audit-guide.mjs` now exit non-zero on findings, matching `audit-deep`'s stated convention and
their own comments ("findings are fixed, not tolerated"; a phrase in a shipped guide the app
never says is a lie to the reader).

### What this cycle does NOT prove

`audit-reach.mjs` checks that every word **in the glossary** which appears on screen is
defined, reachable and correctly anchored, and that no two entries claim the same word. It
cannot detect jargon nobody thought to add — there is no external dictionary of "words a
beginner would not know". That direction stays a human judgement, and the contract is written
at the top of the glossary: put a word on a screen, put it in the glossary.

---

## Cycle 7 — every function, reached by clicking

Two questions the twelve existing passes could not answer, both asked directly:
*is anything in this app unreachable?* and *is anything on screen a word a beginner would not
know?* Each needed a new instrument.

### The jargon harvest

`tests/tools/harvest-jargon.mjs` — a tool, not a pass, because the judgement at the end of it
is human. It renders every route, opens every fold and every dialog, harvests the strings the
app actually puts on screen, then subtracts four things: the commonest English words, UI
furniture, every alias already in the glossary, the books' own table rows (a rolled result is
fiction, not the app's voice), and the fixture's own plot nodes (those are the *player's*
words). What is left is the app speaking in its own voice, ranked by frequency.

Three real gaps, all now in the glossary — 38 terms to 41:

**F-35 · The act names.** Every plot track is divided into *Exposition · Confrontation ·
Resolution*, or the five-act *Rising · Climax · Falling*. "Exposition" alone is on screen 34
times, on the busiest surface in the app, and nothing anywhere said what it meant — or, more
usefully, that crossing from one into the next changes nothing mechanically. Story-structure
vocabulary a first-time player has no reason to have met.

**F-36 · ABCD tables.** Named on the beat card whenever a prompt lands on one; defined nowhere.

**F-37 · "No lines and veils, no X-card, no debrief."** Settings named three safety tools in
one breath in order to say the books ship none. To a reader who has never played, that sentence
carries no information at all: it lists three things they cannot picture. Now the sentence says
what safety tools *are* before saying these books do not have them, and the glossary defines
them — including the half that still applies to someone playing alone.

The harvest also caught a defect in itself: `x-card` tokenises to `x` and `card`, so a
hyphenated word already in the glossary read as undefined.

### The function-reachability audit

`tests/audit-functions.mjs` runs the app under Chromium's precise coverage counter, clicks
every control on every route across **nine states** — including one per structurally distinct
plot sheet — follows every dialog, drives twelve scripted journeys, and then asks the browser
which of the 281 functions in `src/` never executed. The dead-data scan proves a name is
*imported*; this proves a player can *reach* it.

**Result: 275/281 reachable by clicking. Six triaged with reasons** — three destructive
controls the sweep must not press, the import dialog that needs a pasted file, and
`rules.granularColumn`, which docs/AUDIT.md already records as a test-only export. **No
unreachable feature.**

### What this cycle actually cost, and the lesson in it

The pass reported 43, then 25, then 12, then 8, then 2, then 1 finding across six runs.
**Every single one was a defect in the instrument, not in the app.** They are worth listing,
because each is a distinct way a reachability audit can lie:

1. **Offset-keyed coverage.** Matching a source declaration to the *tightest* coverage range
   containing it picks the enclosing closure, not the function. Keyed by name instead.
2. **One click per dialog.** Clicking only a dialog's first button never reaches a commit
   action sitting behind a body button — which is why the whole prep wizard, `store.setNode`,
   `addCast` and `addProtagonist` all read as unreachable while the app plainly reaches them.
3. **One fixture, one sheet.** "Customize" renders only when `sheet.customizable`, so four
   fixtures on a Standard sheet reported the entire custom-track permission as dead. Same
   lesson `audit-deep` learned in cycle 5, arrived at again the hard way.
4. **Folds closed.** A player opens a disclosure and clicks what is inside it; a sweep that
   re-renders between clicks never gets there.
5. **Sequences are not clicks.** The wizard will not leave the protagonists step until a name
   is typed **and** Add is pressed. The Customized sheet ships with no track, so Customize
   appears only after a section exists. Nearly every remaining surface is a *result card*,
   which exists only after a roll.
6. **The glossary chip collision, again.** `tapText(/random prompt/)` matched the chip at the
   top of the Play screen rather than the beat control, so forty consecutive "rolls" rolled
   nothing and the audit concluded the node line was unreachable. This is F-34 exactly,
   reintroduced inside the new tool within a day of being fixed in the probes — which is the
   argument for the collision being excluded in one shared place rather than three.

The instrument is only trustworthy because it was watched failing: the "Choose" control was
deleted from `src/sheet.js`, `chooseNodeDialog` was reported unreachable, and the control was
restored.

### Cycle 7 result

`npm run cycle`, thirteen passes: unit 1,790 · dead-data clean · smoke · interaction · modals ·
deep · novice 0 findings · reach 20×3 routes, 41 terms · guide 0 drift · **functions 275/281
reachable, 0 findings** · firstrun, flow and layout VERDICT clean.

---

## Cycle 8 — LENS: hostile input

Run from the audit-prompts playbook: converge first (Prompt A), then widen with **one** named
lens (Prompt B). The lens chosen was **hostile input**, the highest-yield entry in the
catalogue that this project had no pass for at all.

Every other pass feeds the app data it wrote itself — fixtures shaped exactly the way the app
shapes them. This one asks what happens when the input is not like that. The app has two doors
that take input it did not write: every text field, and Import JSON, which is parsed and
installed as the entire application state with everything downstream of `normalize()` trusting
it.

`tests/audit-hostile.mjs`, 832 checks, all findings reported in one run. **21 findings, in two
clusters.**

### F-38 · `normalize()` was not total, and the app would not boot

`store.load()` is `JSON.parse(localStorage)` → `normalize(raw)`. If that throws, the app does
not render at all: a blank screen, and a player whose entire campaign appears to have been
deleted. It threw on six shapes, every one of which a corrupted write, a truncated save or a
hand-edited export can produce:

| Input | What happened |
|---|---|
| `null` | `Cannot read properties of null (reading 'theme')` — a default parameter covers `undefined`, never `null` |
| `{games:[null]}` | `reading 'id'` |
| a `null` scope | `reading 'id'` |
| a `null` protagonist | `reading 'id'` |
| a `null` cast entry | `reading 'id'` |
| a `null` journal entry | `reading 'id'` |

Plus a seventh, quieter one: a `title` that is an object put the literal text
**"[object Object]"** on Home. Not a null leaking through — D-1's cousin, a *type* nobody
checked. `str()` now coerces, and a finite number becomes its digits rather than vanishing.

Fixed with two helpers — `obj()` and `str()` — applied to every field read out of raw data, so
the property is impossible to get wrong one field at a time. `normalize()` is now total by
construction: it returns a usable state for any input at all.

### F-39 · One long word destroyed the layout

The app is phone-first and asserts zero horizontal overflow at 320/360/390 — but only against
fixtures containing ordinary prose. A player pastes a URL, or types a compound word, and:

| Payload | Overflow at 390px |
|---|---|
| a 4,000-character unbroken word | **83,214px** |
| a 50,000-character value | **942,358px** |
| `<img src=x onerror="…">` | 58px |
| `${constructor.constructor(…)()}` | 290px |

The last two matter most: those are not adversarial at all, they are just *long tokens with no
spaces*, and a pasted link is the same shape. Fixed with `overflow-wrap: anywhere` on the five
containers that hold player text, with tables and `<pre>` exempted to scroll instead — breaking
a die row mid-number would make the books' own tables unreadable.

### What the lens did NOT find

Worth recording, because a clean result is only meaningful if the check could have failed:

- **Injection: nothing.** Script tags, `onerror` handlers, tag-closers, HTML entities and
  template-literal syntax in every text field, on every route — none executed, none was parsed
  into an element. `el()` writes user values through `textContent` and `add()` through
  `createTextNode`; the `html:` escape hatch in `el()` exists but has **no call site anywhere in
  the app**. The discipline holds.
- **Unicode: nothing.** RTL, bidi overrides, zalgo, astral pairs, ZWJ sequences, combining
  marks and NUL all render and survive a store round trip byte for byte.
- **Round trip: nothing.** Export → import is lossless with every payload in place at once.
- **`importJSON` rejection: nothing.** Seven junk strings all rejected with a message, and none
  left the store half-written.

### The coverage boundary

A clean run now prints what it covered **and what it deliberately does not**, so "clean" is a
bounded claim. This lens does not cover: storage quota exhaustion, permission denial or two
tabs writing at once (lens: storage failure); records written by an older schema version (lens:
migration); or the input size at which the app becomes slow rather than wrong (lens:
performance envelope). Those are the next three lenses if they are ever worth their cost.

### Guards, watched failing

Both, before either fix was trusted. Reverting `normalize()` to the non-total form produced
`✗ normalize(null) does not throw`; removing the `overflow-wrap` rule produced 14 overflow
findings. The unit harness carries the cheap half — 19 hostile shapes through `normalize()` in
two seconds — so a regression does not wait for the ninety-second browser pass to be noticed.

### Cycle 8 result

`npm run cycle`, fourteen passes, one contiguous run over the committed tree: unit 1,861 ·
dead-data clean · smoke · interaction · modals · deep · novice 0 findings · reach 20x3 routes,
41 terms · guide 0 drift · **hostile 832 checks, 0 findings** · functions 275/281 · firstrun,
flow and layout VERDICT clean. **One complete cycle, no findings.**

---

## Reported from play — a Forge result could not reach the thing it was for

GUM is a prep tool by the books' own division of labour, and its six-table plot seed is *a
hook, a motivation, a **mission**, a first lead, a caveat, an opposition*. "Keep it →" offered
plot-node lists, the cast and the journal — and nothing else. Not one of those six lines could
reach the plot sheet's Mission, the game's universe, its tone, its inspiration, the starting
point, the game notes, or a protagonist.

**F-40 · The moment a plot seed is most useful, the result was discarded.** With no game open
the dialog said "there is no game open yet, so there is nowhere to keep this" and offered
"Prepare a game" — which threw the roll away and opened a blank wizard. Rolling six tables and
then retyping them by hand was the whole experience of using GUM for its stated purpose.
*Fix:* `startWizard(after, seed)` carries the result into prep, and a "Rolled in the Forge"
strip on each step offers it against every field that step owns, one button per field, with
Dismiss. It appends, never substitutes.

**F-41 · With a game open, six of the fields it was for were not destinations.** *Fix:* 14
destinations, the six setting/scope fields folded under "Into this game's setting or plot
sheet" because the node lists are the commoner answer mid-play. All of them append.

### Two tooling defects the change exposed

Both latent, both found by the passes doing their job on a change that touched real surfaces.

**F-42 · The guide audit could never verify a label containing an apostrophe.** `addClaim()`
strips quotes and apostrophes from the guide's claims, because the guide writes its labels
inside quotation marks. The on-screen set kept its apostrophes. So the two sides were
normalised differently and every label with an apostrophe read as a phrase the app never says —
"Add to the game's inspiration" was reported as drift while the app was rendering it. Nothing
in the app had an apostrophe in its label until now. Fixed by comparing like with like in both
`says()` and `inSource()`; the second matters because `inSource()` is what sorts a finding into
*drift* rather than *the sweep never reached this state*. Guard re-verified by replacing a real
label with "Summon the ancient one" and watching it report.

**F-43 · A closed fold hides its buttons from the function audit.** The six new destinations
sit inside a `<details>`, and a shut fold's buttons have no `offsetParent`, so `followDialog`
skipped every one and the append helper behind them read as unreachable. Same class as the
fold problem cycle 7 hit on the route sweep, in a place cycle 7 did not reach. That journey
opens the fold now.

### Result

`npm run cycle`, fourteen passes in one contiguous run: unit 1,861 · dead-data clean · smoke ·
interaction · modals · deep · novice 0 findings · reach clean · **guide 0 drift** · hostile 832
checks · **functions 275/281** · firstrun, flow and layout VERDICT clean. Both directions were
also walked by hand in a real browser: no game → carry → field, and game open → all 14
destinations listed with the mission write confirmed in the store.

---

## Reported from play — the wizard's roller offered content of the wrong shape

**F-44 · "Name this game" offered to paste a thesaurus entry into it.** The field asks for a
title — "The Neverwinter road". It was mapped to the grand oracle's adjective and subject
tables on a premise stated in `data-gum.js`'s own comment:

> A title is a name, so only the two **word-shaped** grand tables apply — an adjective and a
> subject can be read as a title ("Abundant" + "Frontier"); a plot hook cannot.

That premise is false, and measurably so: **not one of those 200 rows is a single word.** Every
row is a cluster of four to eight synonyms — `"Abundant, plentiful, loaded, rich, wealthy,
charged"`, `"An audience, conference, meeting, council, reunion"`. Median five segments, minimum
four, maximum eight. So the offer on the title field was to append a thesaurus entry.

This is the same defect the 2026-08-17 changelog row claims to have fixed. That pass correctly
diagnosed the *class* of problem — GUM emits fiction, not proper names — and then picked the
"two word-shaped grand tables" without checking whether any row was actually word-shaped.
A wrong premise, corrected by a fix built on the same wrong premise.

*Fix:* `game-title` moves to `INSPIRE_ABSENT`, beside `game-universe` and `protagonist-name`,
which already say the honest thing. The entry names the real reason and points somewhere
useful: roll the world and the tone, then name the game after what you find.

**F-45 · "Plot scope name" offered a reason and an event where a goal belongs.** The field's
own placeholder is "Find out who burned the caravan" — a goal, in a line. It rolled `plot-hook`
("Someone made a big sacrifice today" — an event), `motivation` ("A matter of money, debt,
wrong people" — a reason) and `mission`. Only the third answers "what is this story about?".
*Fix:* `scope-name: ["mission"]`. One table is not too few — rolling several times within one
table is GUM p.3's own stated method, and it yields three candidate goals rather than three
different kinds of answer to three different questions.

**F-46 · "World, tone and theme" led with a synonym cluster.** It asked for "grim frontier
fantasy, low magic" and offered `grand-adjective` first. GUM has two tables that answer this
question directly — what kind of place this is, and what is already wrong with it.
*Fix:* `game-tone: ["location-archetype", "background-problem", "faction-society"]`.

### Verified in the running app, per field

| Field | Now offers |
|---|---|
| Name this game | *nothing, with a stated reason* |
| Universe or RPG | *nothing, with a stated reason* (unchanged) |
| World, tone and theme | "Urban: Metropolis, city, lively place…" · "Voice: Uprising, rebellion…" · "Blend of multiple cultures into a unique identity" |
| Inspiration | the grand-oracle triple — what a free notes field is for (unchanged) |
| Plot scope name | "Retrieve an important or unique artifact" · "Spy on someone to confirm suspicion" · "Stop someone from doing wrong" |
| Mission | the six plot-seed tables (unchanged, and correct: GUM's seed IS the mission's context) |
| Starting point | hook · initial lead · location archetype (unchanged) |

### The lesson worth keeping

A mapping is a claim about the *shape* of the rows on the other end of it. This one was written
from the table's name and blurb rather than from its contents, and no pass could catch it: the
harness checks that every field either maps to real tables or states why it does not, which
this satisfied perfectly while being wrong. Checking the rows takes one command.

