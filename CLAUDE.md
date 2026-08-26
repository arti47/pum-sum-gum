# Unfolding Machines — project spec (canonical)

A solo-storytelling play aid for the **Plot Unfolding Machine (PUM) v9.0**, the
**Scene Unfolding Machine (SUM) v8.0 Rev2** and the **Game Unfolding Machine (GUM) v2.2**
by JeansenVaars. Built to the
*RPG Player-Character App — Autonomous Build Instructions (v3)* template. This file is the
project's living spec: **every code change updates it in the same change.**

---

## 1. What this is

| | |
|---|---|
| **System** | PUM v9.0 (30pp) + SUM v8.0 Rev2 (12pp) + GUM v2.2 (26pp) — core rules only, no setting content |
| **Audience** | The solo player, who is simultaneously author, protagonist and referee |
| **Platforms** | Phone, browser, desktop — one installable PWA, no build step |
| **Core job** | Game-setup wizard + live plot sheet + oracle console + scene engine + generators + journal |
| **Backend** | `localStorage` only. No Firebase (§1.1) |
| **Theme** | Printed play-sheet: warm paper, ink type, one machine-orange accent — `--accent` fills, `--accent-text` reads (WCAG AA in both themes). Light + dark, follows system |

### 1.0 The adaptation ruling (read this first)

The template assumes a **character-stat RPG**. PUM/SUM is not one. It has no attributes, no
derived stats, no skills, no hit points, no death procedure, no rest, no inventory, no
initiative, no bestiary, no advancement and no character sheet. Per the template's
CONDITIONAL rule — *if the game lacks a subsystem, omit it entirely; never invent mechanics* —
every one of those slots is omitted, and the template's structural roles are re-homed onto
the subsystems this game actually has:

| Template role | PUM/SUM's actual subsystem |
|---|---|
| Character creation wizard (§3.7) | **Game prep**: universe → plot scope → protagonists → plot sheet → plot nodes (PUM p.3) |
| The character sheet / tracker (§9.2 Phase 2) | **The plot sheet**: plot track + plot nodes + beat controls |
| Derived stats / vitals (§3.5) | *(none)* — the header carries plot-track position instead |
| The Threshold that is the point of the game (§3.0) | **Plot-track completion** — how close this scope is to resolving |
| Generic progress tracker (§3.13) | **The plot track** — one component, ten sheet shapes |
| Meta-currency (§3.3) | *(none)* — PUM has no spendable economy |
| Scene/session lifecycle (§3.12) | **SUM's scene arc**: opener → intervention → closure |
| Bestiary / NPC compendium (§3.18) | **The cast**: notable-character plot nodes carried with their SUM-rolled traits |
| Dice engine (§3.1) | **The oracle + plot-beat engine** — the whole game |
| Solo mode (§3.20, CONDITIONAL) | *Not* a mode. Solo is the default and only mode |
| GM screen | *(omitted)* — there is no GM to screen anything from |
| Multiplayer party sync | *(omitted per §1.1)* — PUM's group mode is one device passed around |
| Expansion content (§2, CONDITIONAL) | **GUM**: its own `data-gum.js` and its own screen under More, behind a toggle — the template's expansion pattern, used as written |

**What this game is dense in** — see the shape census (§3.0) — is **Lookup** and
**Permission**. Per the template's §15 field guide, that puts it in the *narrative* family:
*"the app's job shifts from arithmetic to prompting… a narrative game's app is judged on its
prompts the way a crunchy game's app is judged on its maths."* Every design decision below
follows from that sentence.

### 1.1 Product decisions (Stage B)

| Question | Answer |
|---|---|
| Usage mode | **Single-device, local-first only.** No Firebase, no sync phase, no campaign join codes |
| User's seat | Solo player (no GM screen) |
| Dice input | **App rolls**, cryptographic RNG, every die face shown, both dice shown on a bias roll |
| Expansions | **GUM v2.2, committed tier.** SUM is not an expansion — it is a co-equal half of the app. GUM is a genuine third book and sits behind a content toggle (§8) that **defaults ON**, a recorded deviation: the book was supplied, so the fiction is that this player owns it, and a default-off switch would leave 1,580 extracted rows invisible (D-18). A fork without the book turns it off and the Forge section disappears |
| Table device | Phone-first |
| Theme default | Follow system, with an in-app override |
| One campaign or many | **Many.** A library of games; each game holds many plot sheets (plot scopes) |

---

## 2. Source and precedence

Sources: the three supplied PDFs. All are digitally-typeset (not scans), so page images were
available throughout and sit at the top of the precedence order.

**Extraction method (recorded because it decides how much to trust the data):**

1. `pdftotext -bbox` → word-level bounding boxes → a reconstruction script clustering words
   into rows by `yMax` and ordering by `xMin`. This is the authoritative pass: it pairs each
   two-column table's left and right halves **row by row**, which plain text extraction does
   not.
2. Plain extraction was checked against it. **It disagrees systematically** — plain
   extraction emits a table's *right* column before its *left*, so every "low result" list in
   SUM would have been transcribed as its opposite. That defect would have inverted the Rule
   of Bias across all twenty-four SUM tables. It was caught by the bbox pass.
3. Vector geometry (plot-track boxes) is not text at all. Pages were rendered at 300 dpi and
   the divider columns counted by pixel analysis (`tests/tools/` — retained), separating
   full-height section rules from half-height box dividers. Every track length in
   `data-pum-plot.js` is a measured count, not an estimate.

4. GUM's 43 tables are laid out two-per-row in narrow columns, so a long left-hand entry can
   end within 12pt of the right-hand entry's number and the two merge. The reconstruction
   forces a column break before any list number more than 150pt from its run's start, then
   validates every table's numbering is contiguous 1..N before transcription. 1,580 rows,
   zero malformed, sixteen values spot-checked against the printed pages.

**No blocked tables.** Every table in all three books is fully recovered and cited.

### 2.1 Rulings (ambiguities, with ids)

| id | Point | Ruling |
|---|---|---|
| **A1** | PUM p.12's Yes/No columns are headed *Deterministic · Subjective · Conversation*, but plain text extraction returns them in a different order | Column identity confirmed against the granular tables on p.24, which repeat the same answer lists under explicit headings. Deterministic = *Strong no…Strong yes*; Subjective = *No, definitely not…*; Conversation = *No, absolutely not…* |
| **A2** | PUM p.11's worked example reads *"Random prompt → 6 → Meet or recall a notable character"*, but on every plot sheet 6 is *Lead to an interesting location* and 5 is *Meet or recall a notable character* | **The plot sheet wins** (it is the play surface; the example is prose). Recorded as an erratum in `PUM_ERRATA`, surfaced in the rules library, never silently corrected |
| **A3** | PUM p.9 refers to *"(5) Trigger a game or world element"*; the sheets put world elements at 7 | Same ruling as A2; same erratum entry. Both are consistent with an earlier layout |
| **A4** | PUM's bias rule for Yes/No is *"roll twice and pick the result that best fits your judgment"*; SUM's is *"roll twice and keep the lowest / highest"* | **These are different mechanics and are implemented differently.** PUM bias = both results offered, player chooses. SUM bias = the engine keeps low or high per the declared expectation. Conflating them would hand the player's authorship to the machine |
| **A5** | SUM's Intervention check and PUM's plot beats can both interrupt a scene | Both are offered; neither fires automatically. The disruption die (PUM p.9) is the only automatic interrupter and is off by default, matching the book's "optional rule" framing |
| **A6** | Neither book names a scene/session boundary procedure beyond SUM's closure | The lifecycle engine owns **scene** boundaries only. There is no session-end bundle to fire, so none is invented; the journal marks sessions for the player's own reference |
| **A7** | Plot-node lists: *"Roll 1d10 in lists with less than half the entries filled; otherwise roll 1d20"* (PUM p.25) applies to the 10-slot expanded sheet; the in-sheet lists have 5 slots | Die size is derived from the list's own capacity and fill: 5-slot lists always roll 1d10 (a d20 would point past their end, since slot = ceil(roll/2)); 10-slot lists roll 1d10 while **fewer than half** the slots are filled and 1d20 from the fifth entry on — *otherwise* in the printed rule includes exactly half. One function, `derived.nodeDie()`. **Corrected in cycle 5 (F-21):** the first implementation switched at *more than* five, disagreeing with the rule text this ruling quotes and with the app's own on-screen note |
| **A9** | GUM p.21 prints "Vandalism and destruction" twice in one d100 table, at 17 and 22 | Kept as printed, so the app's odds match the book's, and recorded in `GUM_ERRATA` and the rules library. Correcting it would silently change a probability a paper player does not get to change |
| **A10** | GUM has no bias rule and no ordering convention — unlike SUM, low does not favour the protagonists | Recorded explicitly. GUM tables are rolled straight; no bias control is offered on them, because offering one would invent a mechanic the book does not have |
| **A11** | Five plot sheets print no plot node lists at all (Journey, Exploration, Improvised, Sandbox, Customized), yet four of them have a prompt column that reaches for nodes | They are printed alongside a **Plot Nodes sheet** (pp.25-27), which is ten slots and carries the extension lists — so those four are ten-slot, extension-capable sheets, and Improvised, which wants no nodes, is zero. The count of lists each page prints is recorded per sheet as `printedLists` and the model is held to it by the harness. **Corrected in the source re-read (F-35):** Exploration had been given five slots and no extension lists, a length no page prints and a denial of the two lists its own column reaches for |
| **A12** | SUM's contents page and its section headings disagree four times: *Investigation*/**Discovery**, *Challenge circumstance*/**Challenge conditions**, *Revealing discovery*/**Revealing finding**, *Lingering stories*/**Lingering backstories** | The page heading wins, as in A2 — the page is what you play from. The app already used all four page headings. Not surfaced as errata: no roll changes |
| **A8** | Neither book contains safety tools (§3.22) | Recorded as absent. Nothing invented; Settings says so plainly rather than shipping a house-aid X-card as if it were the book's |

---

## 3. System Profile (completed)

### 3.0 Rule-shape census

The honest statement of what this app must be good at.

| Shape | Count | Where they are |
|---|---|---|
| **Lookup** | **86** | Every oracle, prompt and generator table. 19 PUM, 24 SUM, 43 GUM |
| **Permission** | **12** | Re-roll a result you dislike · ignore or reinterpret any answer · choose *not* to advance the track · advance it voluntarily without a beat · invoke a plot node deliberately — a chosen entry, or a chosen list rolled (p.9) · "add new, choose, or reroll" on any node slot · invent a plot node mid-play · re-roll a repeated beat · customise the Random Prompt column · pre-draw or grow a custom track · end a scope when you say it ends · name two plot-node lists of your own (p.27) |
| **Modifier** | 2 | SUM Rule of Bias (keep low/high) · PUM bias (roll twice, pick) — different mechanics, ruling A4 |
| **Escalation** | 1 | The plot track: each confirmed beat advances one box toward resolution |
| **Threshold** | 1 | Track full ⇒ the scope resolves. This is the game's stakes and it lives in the persistent header |
| **Cascade** | 1 | Disruption die: an oracle roll can fire a plot beat, which can itself be rolled again. Capped at one disruption per oracle roll |
| **Gate** | 1 | A plot beat may only be *confirmed* (mark a box) after its outcome has been played and judged relevant |
| **Compulsion** | 1 | Empty node slot + "still stuck" ⇒ re-roll until an entry comes up (PUM p.6) |
| **Conversion** | 1 | An invented node written into an empty slot becomes a permanent entry in that list |

**Consequence for the build:** twelve Permission rules is the largest count after Lookup.
Every one of them is a control in this app, never a sentence — that is the single biggest
correctness risk here (template D-22), and the ability sweep (§11.2.3) is re-aimed at
permissions rather than at abilities, which this game does not have.

### 3.1 Core resolution mechanic

**There is none, and that is load-bearing.** PUM resolves nothing — it is explicitly
system-agnostic and expects you to bring a rulebook for task resolution ("*pick up any
tabletop RPG from your shelf*"). What the app provides instead:

- **Oracle rolls**: 1d10 for Yes/No; 1d10 + 1d100 enrichment for descriptive and story
  oracles; 1d100 against a likelihood band for the granular Yes/No variant.
- **Plot beats**: 1d10 on either the Modified Proposal or the Random Prompt column.
- **SUM tables**: 1d20 or 1d100 with the Rule of Bias.

No crit, no fumble, no push economy, no success counting. The app therefore never says
whether an action succeeded — it says what the world offers. Surfaces must not imply
otherwise.

### 3.2–3.6, 3.8–3.11, 3.14–3.19 — omitted

No opposed tests, meta-currencies, attributes, derived stats, skills, group entity,
conditions, health/damage/death, rest, powers, advancement, inventory, combat structure,
bestiary or pregens exist in either book. Nothing is invented to fill them (§1.0).

### 3.7 Creation options → **game prep** (PUM p.3)

Four rule-legal steps, in order:

1. **Pick a universe and gather inspiration** — which RPG or fiction, and the world, tone
   and theme.
2. **Draft a plot scope and mission** — what story you want to unfold, plus a pitch for the
   starting situation and initial goals.
3. **Create your protagonists** — PCs; the player controls their thoughts, voice, actions.
4. **Pick a plot sheet and write plot nodes** — the sheet sets pacing; the nodes are the
   game-specific content the Random Prompt column reaches into.

The book names a fifth thing the app must not forget (template §6.3.7): the scope's
*starting point* — "decide on the game's starting point and what is introduced there",
optionally *in medias res*. The home screen names it as the next step until it is written.

**Plot node categories** — four base, two expanded. The expanded pair (and the two
player-named lists) are printed on the plot-node **extension** sheet, so they exist only on the
sheets that pair with it — `expandedNodes: true`: Journey, Story-focus, Exploration, Sandbox,
Customized. Those five are exactly the sheets whose own page prints no node lists at all (bar
Improvised, which prints none *and* wants none), so a Plot Nodes sheet is appended and that
sheet is ten slots. On an all-in-one sheet the prompt column still reaches for a notable
character and an interesting location; with no list to roll, the beat card offers to bring one
in or recall one from the cast. No surface spells out which sheets these are — they are read
from the sheet table by `derived.expandedSheetSentence()`.

| Category | What goes in it (PUM p.28) |
|---|---|
| Game or world elements | World events and features, world truths, system-specific events |
| Potential problems | Encounters, people good or bad, traps, dangers, discoveries |
| Useful findings | Items, artifacts, a MacGuffin, clues, hard-to-find people, tools |
| Pending questions | Open threads, unresolved leads, mysteries |
| Notable characters *(expanded)* | People in scope who can appear, be mentioned or recalled |
| Interesting locations *(expanded)* | Places in scope that can be discovered or referenced |
| *My list* ×2 *(expanded, p.27)* | Two blank lists the player names — whatever this game keeps reaching for |

### 3.12 Scene lifecycle → **SUM's scene arc**

The app owns three boundary events, all player-fired, none automatic:

- **Open a scene** — SUM Scene opener (1d20).
- **Mid-scene** — SUM Intervention check (1d100), fired when "PCs are taking too long,
  tension is high, danger is near, or silence lingers".
- **Close a scene** — SUM Scene closure (1d20), *fortunately / unfortunately*.

Each boundary writes a journal entry, is summarised on commit, and is undoable in one step.
There is **no session or adventure boundary** in either book (ruling A6).

### 3.13 Progress tasks → **the plot track**

One component, ten configurations. A track is an ordered list of **sections**, each
holding a measured number of **boxes**. A confirmed plot beat crosses the next empty box.

| Sheet | Track | Boxes | Notes |
|---|---|---|---|
| Standard | Exposition 3 · Confrontation 5 · Resolution 3 | 11 | All-in-one quick game; 4 node categories × 5 slots |
| Journey | Exposition 3 · Rising 7 · Climax 4 · Falling 3 · Resolution 3 | 20 | Five-act; pairs with a Plot Nodes sheet |
| Story-focus | same five acts as Journey | 20 | Random Prompt column is **all plot nodes**, no ABCD |
| Scenes | Intro · Scene 1–8 · Wrap-up, 1 box each | 10 | One beat per scene |
| Dungeon | Entrance · Room 1–5 · Way out, 1 box each | 7 | One beat per room |
| Exploration | Arrival 1 · 1st/2nd/3rd Area 3 each · Conclusion 1 | 11 | Triple beats per area; pairs with a Plot Nodes sheet |
| Story-parts | Intro · Part 1–3 · Wrap-up, 1 box each | 5 | Sparse beats over large chunks |
| Improvised | *(none)* | 0 | No track, no nodes; ABCD only |
| Sandbox | *(none)* | 0 | No track; nodes supported |
| Customized | *(player-defined)* | 0+ | Sections and boxes added in play or pre-drawn |

### 3.20 Solo rules

The entire system is the solo procedure. Its **procedural framing** (template §3.20) is
extracted as first-class content, not just its tables: the three play states (roleplay ·
ask the oracles · invoke a plot beat), the playing flowchart (PUM p.5), the six triggers for
each beat type (p.28 cheat sheet), and the advice chapter (p.10) — all surfaced in-app,
because guidance extracted and never shown is the §0 defect wearing a different coat.

### 3.21 GM tables

All of PUM's oracles and all of SUM's tables are, in a solo game, exactly this. There is no
separate GM reference panel; the Oracles and Scene tabs are it.

### 3.22 Safety tools

**Absent from both books** (ruling A8). Settings states this rather than inventing one.

---

## 4. Architecture

Per template §5, unchanged: no build step, native ES modules, `localStorage`, themed UI
primitives, null-safe DOM helpers, `crypto.getRandomValues` for every die, phone-first with
zero horizontal overflow at 320/360/390px, WCAG 2.2 AA target sizes, reduced motion honoured,
text-size control paying back the zoom lock.

### 4.1 File map

| File | Purpose |
|---|---|
| `index.html` | Shell: app header, persistent plot header, section nav mount, screen mount, tab bar |
| `styles.css` | Printed-play-sheet theme (light + dark) + every component style |
| `data-pum-oracles.js` | Yes/No ×3 · granular ×3 · descriptive ×6 · story ×6 · Description d100 · Focus d100 · quantifiers ×3 |
| `data-pum-plot.js` | Modified proposals · random-prompt columns · ABCD ×4 · 10 plot sheets · node categories · `TRACK_SECTION_NOTES` · `PUM_ERRATA` |
| `data-sum.js` | All 24 SUM tables, grouped by the book's own sections |
| `data-gum.js` | All 43 GUM tables (1,580 rows) + `GUM_FOR_FIELDS`, `INSPIRE_ABSENT`, `GUM_PLOT_SEED`, `GUM_GRAND`, `INSPIRE_WORDS`, `GUM_ERRATA` |
| `data-guidance.js` | The books' procedural framing: play states, flowchart, beat triggers, advice — plus the app's own `NEW_TO_SOLO` and `FIRST_BEAT_COACH`, which teach what neither book stops to explain |
| `data-rules-library.js` | One entry per automated rule, in the app's own words, page-cited, plus the 38-term `GLOSSARY` — six groups, opening with one that assumes the reader has never played a solo RPG — and the `GLOSSARY_INDEX` of aliases the chips and the reachability audit read |
| `data-tutorial.js` | The complete guide: quick start + four parts. One source, four renderings |
| `src/*.js` | Modules, §4.2 |
| `manifest.json`, `service-worker.js`, `icon.svg` | PWA |
| `tutorial.html` | **Generated.** The guide as a sibling page any static host serves beside the app; in the app shell, so it works offline |
| `tutorial.pdf` | **Generated** from `tutorial.html` by `tests/tools/gen-pdf.mjs`: the paginated rendering — title page, numbered contents, PDF bookmarks, one part per page break. In the app shell, so the download works offline |
| `docs/tutorial-pdf.sha256` | The hash of the HTML the PDF was printed from. A PDF cannot be byte-diffed (its bytes carry a build timestamp), so this is what the drift guard compares |
| `.github/workflows/pages.yml`, `.nojekyll` | Publishes the repository root to GitHub Pages on every push to `main` |
| `tests/` | Harnesses (`harness`, `smoke`, `interaction`, `audit-modals`, `audit-deep`, `audit-novice`, `audit-reach`, `audit-guide`, `audit-functions`, `deadcode`), probes (`probe-layout`, `probe-flow`, `probe-firstrun`), `cycle.mjs` — the stopping-rule runner (§7.2) — seed fixtures, and `tests/tools/` — the extraction scripts, the two guide generators (`gen-tutorial`, `gen-pdf`), and `harvest-jargon` (§7.3) |
| `docs/AUDIT.md` | Numbered findings per pass + the verified-clean list |
| `docs/rules/*.md` | Distilled per-subsystem reference the audit reads against the engine |
| `docs/TUTORIAL.md` | **Generated** from `data-tutorial.js` by `tests/tools/gen-tutorial.mjs`; the harness regenerates and diffs it. The published page is a third rendering of the same data, the PDF a fourth |

### 4.2 Module map

| Module | Responsibility |
|---|---|
| `core.js` | Constants, DOM helpers (`el`, null-safe `add`), crypto dice. No imports |
| `ui.js` | `modal/toast/confirmModal/promptModal`, `explain()`, `actionBar()`, `defRow()`, and three registration seams — `registerInspire` (a field can roll without ui.js knowing GUM exists), `registerUndo` (a toast can offer Undo without ui.js knowing the store) and `registerExplainState` (the notes read their open state without ui.js knowing Settings) |
| `rules.js` | Pure lookups over the data files: range lookup, granular band lookup, sheet lookup |
| `derived.js` | Track position/percentage, `nodeDie()`, node fill, normalization + migration |
| `settings.js` | Toggles: disruption die, volatile range, auto-enrich, GUM, text size, theme |
| `store.js` | Campaign library, plot sheets, nodes, cast, journal, export/import, undo stack, `transact()` — one player action is one undo |
| `roller.js` | Oracle engine, plot-beat engine, bias handling, disruption cascade, journal writes |
| `sheet.js` | The plot sheet screen: track, beats, nodes; the persistent plot header |
| `oracles.js` | The oracle console |
| `scene.js` | SUM: scene arc lifecycle + exploration/battle/discovery tables |
| `forge.js` | GUM: the Forge screen (a section of More, with its own second-level nav), the plot seed, the grand oracle, and the inspiration block mounted inside every text field it can serve |
| `cast.js` | Characters & locations roster + SUM character emulation |
| `journal.js` | The journal: entries, narration, filters, paging, dice distribution |
| `wizard.js` | The four-step game prep |
| `screens.js` | Home, rules library (which holds the glossary), settings |
| `glossary.js` | The chip decorator: every `explain()` in the app grows links to the jargon its own text uses, registered once at boot |
| `tutorial.js` | Renders `data-tutorial.js`: the quick start, then the complete guide in collapsible parts |
| `router.js` | Tab routing, section nav, live-state badges, the persistent plot header |
| `viewstate.js` | The clearer registry for transient view state (the open beat, the last answer, paging). `main.js` fires it whenever the active game or scope changes |
| `main.js` | Boot |

### 4.3 Data model (`localStorage`)

```
umState
  version, theme, textScale
  settings{ disruptionDie, disruptionVolatile, autoEnrich, gum, explainOpen, seenTutorial }
  activeGameId
  games[ {
    id, title, universe, tone, inspiration, createdAt, archivedAt|null,
    activeScopeId,
    scopes[ {                              // one per plot sheet in play
      id, name, mission, sheetId, startingPoint, notes, createdAt,
      closedAt|null,                       // "it ends when I say it ends" (PUM p.7)
      customNames: { custom1, custom2 },   // the extension sheet's two blank lists
      customPrompts: [10 prompts]|null,    // the Customized sheet's own column
      track: {
        crossed:int,
        marks:{ index -> label },          // timed beats (PUM p.9)
        fired:{ index -> true },           // each mark fires exactly once
        custom:[ {name,boxes} ]|null,      // a track grown or pre-drawn in play
      },
      nodes: { world[], problems[], findings[], questions[], characters[], locations[],
               custom1[], custom2[] },     // only the lists the sheet prints are read
      openScene: { id, openedAt, opener, interventions[] } | null,
      lastBeat: { key, text, open } | null
    } ],
    protagonists[ { id, name, notes } ],
    cast[ { id, kind:'character'|'location', name, notes, traits[{table,label,text,roll}] } ],
    journal[ { id, ts, kind, title, dice[], detail, note, scopeId, sceneId, linkedTo } ]
  } ]
```

Every field addition ships a normalization path in `derived.normalize()` and a fixture test.

---

## 5. Ledgers

### 5.1 Data Extraction Ledger

All ticked boxes are extracted, cited and unit-checked for row count and range coverage.

- [x] **T1** Yes/No ×3 (PUM p.12) → `oracles.js`
- [x] **T2** Granular Yes/No ×3 × 7 bands (PUM p.24) → `oracles.js`
- [x] **T3** Descriptive oracles ×6 (PUM p.12) → `oracles.js`
- [x] **T4** Description d100, 50 rows (PUM p.12) → `oracles.js`
- [x] **T5** Story oracles ×6 (PUM p.13) → `oracles.js`
- [x] **T6** Focus d100, 50 rows (PUM p.13) → `oracles.js`
- [x] **T7** Quantifiers ×3 (PUM p.13) → `oracles.js`
- [x] **T8** Modified proposals, 10 rows (PUM p.14) → `roller.js`
- [x] **T9** Random prompt columns ×3 variants (PUM pp.14/16/21) → `roller.js`
- [x] **T10** ABCD tables ×4 (PUM p.14) → `roller.js`
- [x] **T11** 10 plot sheets: track sections + measured box counts + printed node-list counts → `sheet.js`
- [x] **T12** Plot node categories + definitions (PUM p.28) → `sheet.js`
- [x] **T13** SUM Controller ×3 (p.4) → `scene.js`
- [x] **T14** SUM Exploration ×3 (p.5) → `scene.js`
- [x] **T15** SUM Battle ×3 (p.6) → `scene.js`
- [x] **T16** SUM Discovery ×3 (p.7) → `scene.js`
- [x] **T17** SUM First contact ×3 (p.8) → `cast.js`
- [x] **T18** SUM Shallow interaction ×3 (p.9) → `cast.js`
- [x] **T19** SUM Trust conversation ×3 (p.10) → `cast.js`
- [x] **T20** SUM Deep relationship ×3 (p.11) → `cast.js`
- [x] **T21** Beat triggers cheat sheet (PUM p.28) → `sheet.js`, `tutorial.js`
- [x] **T22** Play states + flowchart (PUM pp.4–5) → `screens.js`, `tutorial.js`
- [x] **T23** Advice chapter (PUM p.10) → `screens.js`
- [x] **T24** Rules-library entries, one per automated rule → `screens.js`
- [x] **T25** GUM game seeding ×8 (pp.4-7) → `forge.js`
- [x] **T26** GUM world generator ×18 (pp.8-13) → `forge.js`
- [x] **T27** GUM character builder ×14 (pp.14-21) → `forge.js`
- [x] **T28** GUM grand oracle ×3 (pp.22-24) → `forge.js`

### 5.2 Rules Traceability Ledger

| Rule | Shape | Data | Engine | Surface | Test |
|---|---|---|---|---|---|
| Oracle answer = 1d10 row | Lookup | `YES_NO` | `roller.rollYesNo` | Oracles → result card | `every d10 row is reachable` |
| Granular Yes/No = d100 vs likelihood band | Lookup | `GRANULAR` | `rules.granularLookup` | Oracles → granular | `bands tile 1–100 with no gap` |
| Descriptive/story oracle enriched by d100 word | Lookup | `DESCRIPTION`,`FOCUS` | `roller.rollOracle` | Result card, second line | `enrichment table covers 1–100` |
| Reach the enrichment die for one answer | Lookup | `DESCRIPTION`,`FOCUS` | `roller.enrichOracle` | Result card → Enrich it | `enriching adds the word without re-rolling the answer` |
| PUM bias: roll twice, **player picks** | Modifier | — | `roller.rollYesNo({bias:true})` | Two answer chips, player taps one | `bias returns both, commits neither` |
| SUM bias: roll twice, keep low/high | Modifier | — | `roller.rollSum({bias})` | Result shows both dice, kept one marked | `keep-low returns min; keep-high returns max` |
| Plot beat = 1d10 on proposal or prompt column | Lookup | `PLOT_SHEETS[].prompts` | `roller.rollProposal`/`rollPrompt` | Play → beat card | `each sheet's column has 10 rows` |
| Each proposal face is a *kind* of modification the book explains | Lookup | `PROPOSAL_KINDS`, `PROPOSAL_NOTES` | `rules.proposalNote` | Beat card, second line | `proposal 2/5/6/7 match the p.11 examples` |
| Node-invoking prompt rolls a node | Lookup | node lists | `roller.invokeNode` | Beat card → node line | `an empty slot offers add/choose/reroll` |
| Node die is d10 or d20 by list fill | Lookup | — | `derived.nodeDie` | Node list header shows the die | `d20 only past half of a 10-slot list` |
| Empty node slot ⇒ add, choose, or reroll | Permission | — | `roller.invokeNode` | Three buttons on the beat card | `all three paths are offered` |
| Still stuck ⇒ reroll until an entry comes up | Compulsion | — | `roller.invokeNode({force:true})` | "Leave it to destiny" button | `force never returns an empty slot` |
| A beat may be confirmed or not | Gate | — | `store.confirmBeat` | Confirm / Not this time on the beat card | `an unconfirmed beat leaves the track` |
| Confirming crosses the next empty box | Escalation | `PLOT_SHEETS[].track` | `store.confirmBeat` | Plot track + header | `crossing stops at the last box` |
| Track full ⇒ scope resolved | Threshold | — | `derived.isResolved` | Persistent header | `predicate flips on the final box` |
| Voluntary track advance without a beat | Permission | — | `store.confirmBeat({voluntary:true})` | Track → Advance without a beat | `voluntary advance is journalled as such` |
| Deliberate node invocation without a roll | Permission | — | `roller.invokeNode({chosen})` | Node row → Invoke | `chosen node bypasses the die` |
| Deliberate invocation of a whole list, rolled | Permission | — | `roller.invokeNode` | Node card → Roll this list | `a chosen list still rolls its own die` |
| A list the sheet does not print has no slots | Lookup | `PLOT_SHEETS[].expandedNodes` | `derived.nodeSlots`, `derived.nodeUnavailableReason` | Beat card → bring one in / recall / GUM | `slots only where the sheet prints the list` |
| A scope ends when you say it ends | Permission | `scope.closedAt` | `store.setScopeClosed`, `derived.isEnded` | Track → End this scope / Reopen | `declaring it ended finishes it without pretending the track resolved` |
| Re-roll a repeated beat | Permission | — | `roller.rollBeat` flags a repeat | "Same as last time — reroll?" | `a repeat is flagged, not forced` |
| Re-roll / ignore any oracle answer | Permission | — | `roller.reroll` | Reroll on every result card | `reroll writes a linked journal entry` |
| Timed plot beat on a marked box | Lookup | `track.marks` | `store.confirmBeat` | Track box badge + modal on arrival | `arriving at a marked box fires once` |
| Disruption die: 1 ⇒ random prompt, 2 ⇒ proposal | Cascade | `DISRUPTION` | `roller.rollOracle` | Result card → disruption strip | `range widens to 2–5; 1 stays sole prompt` |
| Scene opener / intervention / closure | Lookup | `SUM_CONTROLLER` | `scene.open/intervene/close` | Scene tab, in play order | `closing a scene requires an open one` |
| Custom Random Prompt column | Permission | `scope.customPrompts` | `store.setCustomPrompts` | Track → Customize → Edit the prompt column | `custom column persists and rolls` |
| Custom track grown in play | Permission | `track.custom` | `store.addTrackSection/addTrackBox/removeTrackSection` | Track → Customize | `boxes persist and cross in order; removing a section clamps` |
| Two plot-node lists the player names | Permission | `NODE_CATEGORIES[].custom` | `store.setCustomListName` | Nodes → Add a plot node list | `an unnamed list has no slots; naming brings it into being` |
| A Yes/No answer can trigger a beat | Lookup | `BEAT_TRIGGERS` | `oracles.fireBeatFromOracle` | Result card → "It said yes / no" | `the trigger is offered, never fired` |
| Every roll is journalled with its dice | Lookup | — | `store.addJournal` | Journal tab | `a roll writes exactly one entry` |
| GUM table = a plain 1..N roll, no bias | Lookup | `GUM_TABLES` | `roller.rollGum` | Forge → result card | `every GUM roll returns a row; 1,580 rows` |
| GUM's method is combining several tables | Lookup | `GUM_PLOT_SEED`, `GUM_GRAND` | `roller.rollGumSet` | Forge → "Roll a whole plot seed" | `the plot seed is six tables; the grand oracle three` |
| GUM fills PUM's plot nodes | Lookup | `GUM_FOR_FIELDS` | `forge.inspireTables` | Every empty node slot, the cast, the wizard | `every node category has GUM tables offered` |
| A blank GUM can serve asks it for three words | Lookup | `GUM_FOR_FIELDS`, `INSPIRE_WORDS` | `forge.inspireTables`, `roller.rollGum` | A collapsed block in 21 fields | `every text dialog either rolls or says why it does not` |
| A blank GUM cannot serve says so | *guidance only* | `INSPIRE_ABSENT` | — | Rules → Where the app does not roll | `every absent field states a reason` |
| Combination is GUM's method | Lookup | `GUM_FOR_FIELDS` | `forge.inspireFor` | "All N tables" inside the block | `the mission field reaches the whole plot seed` |
| GUM prints one duplicate row | *erratum* | `GUM_ERRATA` | — | Rules → Errata | `the duplicate is kept as printed` |
| Books contain no safety tools | *guidance only* | — | — | Settings → About the books | — |
| Task resolution is your own RPG's job | *guidance only* | — | — | `explain()` on Oracles + rules library | — |

---

## 6. Roadmap

- [x] **Phase 0 — Foundations**: files scaffolded; complete verified data library; theme; PWA
      shell; router with two-level nav; local storage.
- [x] **Phase 1 — Game prep wizard**: the four steps + starting point, legality per step,
      plot-sheet picker with track previews.
- [x] **Phase 2 — The plot sheet**: track, nodes, cast, persistent plot header,
      JSON export/import, normalization.
- [x] **Phase 3 — Oracle + beat engine**: every oracle, both bias mechanics, plot beats,
      node invocation, disruption die, journal.
- [x] **🏁 First Session Playable**: prep a game → open a scene → roll beats and oracles →
      advance the track → close the scene → read it back in the journal.
- [x] **Phase 4 — In-play systems**: scene lifecycle with summary + undo, SUM scene and
      character emulation, cast roster, timed beats, custom sheets.
- [x] **Phase 5 — Multiplayer**: *dropped at Stage B (§1.1).*
- [x] **Phase 6 — Teaching surfaces**: `explain()` everywhere, rules library, tutorial,
      guidance chapters.
- [x] **Phase 7 — GUM v2.2**: all 43 generator tables, the Forge tab, and GUM wired into every
      blank-filling point the app already had.
- [x] **Phase 8 — Inspiration everywhere**: every text field GUM can serve rolls three
      context-matched words, appended not imposed, behind one collapsed line.
- [x] **Phase 9 — Friendliness**: undo beside the action that raised it, five tabs, folded
      journal tools, a collapsible rules library with a glossary, progressive prep.
- [x] **Phase 9a — Orientation and width**: landscape and desktop measured for the first time
      and fixed; the question restated on every oracle answer.
- [x] **Phase 9b — Contrast**: the palette measured and brought to WCAG AA in both themes,
      with a smoke pass so it stays there.
- [x] **Phase 10 — The complete guide**: `data-tutorial.js` rendered in-app, as `docs/TUTORIAL.md`,
      as a published page and as a paginated PDF; every one of the app's 221 controls named,
      checked by the harness.
- [x] **Hardening**: harnesses, accessibility, layout/stress probes, audit to a clean cycle.
- [x] **Phase 11 — the never-played-solo pass**: the first run measured for jargon rather than
      reachability, then four changes aimed at the reader who has never played a solo RPG and
      never opened the books. See §8.
- [x] **Audit cycle 5 — every tab, every button, every sheet**: the audit matrix widened from
      one fixture to all ten plot sheets and the prep wizard (`tests/audit-deep.mjs`), which is
      where the write-back defect and the two missing controls were found. See §8.
- [x] **Audit cycle 6 — reachability and vocabulary**: the matrix widened again, from one state
      of the app to three, including the empty one no browser pass had ever booted
      (`tests/audit-reach.mjs`); the glossary taken from 12 terms to 38 and pushed to where the
      words are met rather than waiting to be looked up (`src/glossary.js`); and the stopping
      rule itself made a command rather than a habit (`tests/cycle.mjs`, §7.2). See §8.

---

## 7. Process rules

Template §10 in force, unchanged. In particular: this file is canonical and updates in the
same change; all rules values live in `data-*.js` and are never hardcoded in `src/`; every
shipped-file change bumps `CACHE_VERSION`; a permission the books grant is a control, never a
sentence; every flag has a setter, a reader and a clearer.

### 7.1 Git workflow — standing instruction

**Work lands on `main`.** Develop on a branch if it helps, but every finished change is merged
into `main` and pushed — do not leave completed work parked on a feature branch waiting for a
pull request. No permission is needed for this: it is the standing instruction recorded here.

**The feature branch is deleted once merged**, locally and on the remote. A merged branch left
standing is a second copy of the same history that will drift; `main` is the only long-lived
branch in this repo. Reconfirmed by the owner on 2026-08-17 after audit cycle 5, when a
session-level rule had held the work on its branch pending permission — that permission is
standing, and does not need asking again.

*Known environment limit:* the sandboxed git proxy used by Claude Code sessions accepts pushes
but **silently drops a delete refspec** — `git push origin --delete <branch>` reports
"Everything up-to-date" and the ref survives, and the GitHub MCP tool set has no
delete-branch call. So from a session, the local branch goes and the remote one has to be
deleted from GitHub's own UI. Say so rather than reporting a deletion that did not happen.

**`CLAUDE.md` is updated in the same change, every time.** This is the template's §10.1 rule
and it is not optional: a code change with a stale spec is an incomplete change. In practice
that means, for any change worth committing:

- the file tables (§4.1, §4.2) if a file was added, moved or removed;
- the data model (§4.3) if a stored field changed, together with its normalization path;
- the extraction ledger (§5.1) and the traceability ledger (§5.2) for any new rule or table;
- the roadmap (§6) and a dated changelog row (§8) recording what, why, how it was verified,
  and the cache version.

**Merge only green work.** Before merging to `main`: `npm test`, `npm run deadcode`, and
`npm run smoke` at minimum; the full cycle (§11 of the template) at the end of a phase.

### 7.2 The stopping rule is a command, not a habit

The template's rule — *done when one complete cycle of every pass produces no finding* — is
easy to fake by hand across twelve passes: fix A, re-run A, ship, never notice the fix broke B.
So the rule is executable:

```sh
npm run cycle          # all thirteen passes, in order, never stopping at the first failure;
                       # one report; exits 0 only if the whole cycle was clean
npm run cycle:watch    # re-runs the whole cycle on every shipped-file change, and exits
                       # itself the first time one complete cycle reports nothing
npm run cycle -- --repeat 3        # up to 3 cycles; how a flaky pass shows itself
npm run cycle -- --only unit,reach
```

### 7.3 Two questions no pass can answer alone

- **"Is any word on screen jargon nobody defined?"** There is no dictionary of "words a
  beginner would not know", so this cannot be asserted. `npm run jargon` does the mechanical
  half — it harvests every string the app renders and subtracts common English, UI furniture,
  the glossary, the books' table rows and the fixture's own fiction, leaving the app's own
  voice ranked by frequency. Reading that list is a person's job. The contract is: put a word
  on a screen, put it in the glossary.
- **"Can a player reach everything?"** `npm run audit:functions` runs the app under Chromium's
  precise coverage counter and asks which of `src/`'s functions never executed while clicking
  everything. Anything it cannot reach by clicking is either a finding or goes in that pass's
  `EXPECTED_UNREACHED` **with a sentence saying why** — a list without reasons is a place to
  hide an unreachable feature.

Three consequences the runner forces, all of them corrections to how the passes were written:

- **A pass whose findings are "fixed, not tolerated" must be able to fail.** `audit-novice`
  and `audit-guide` printed findings and exited 0, so nothing could see them. Both exit
  non-zero now.
- **A probe must state its verdict in one line.** The runner reads that line, never a word
  that also appears in a column header — matching "overflow" in the layout probe's own heading
  made the first version report a finding against a table reading "none" in every row.
- **A new guard is not trusted until it has been watched failing.** Break the thing it guards,
  see the finding, restore, see it green. `docs/AUDIT.md` names which guards were verified that
  way in each cycle.

## 8. Changelog

| Date | Change | Verification | Cache |
|---|---|---|---|
| 2026-08-26 | **Audit cycle 7 — every function reached by clicking, and the jargon a beginner meets undefined.** Two instruments for the two questions the twelve existing passes could not answer. `tests/tools/harvest-jargon.mjs` renders every route, fold and dialog and subtracts common English, UI furniture, the glossary, the books' table rows and the fixture's own plot nodes, leaving the app's own voice: three real gaps, all now defined. F-35 the plot tracks' act names — "Exposition" is on screen 34 times on the busiest surface in the app and nothing said what it meant, or that crossing between acts changes nothing mechanically. F-36 ABCD tables, named on the beat card and defined nowhere. F-37 Settings named three safety tools ("no lines and veils, no X-card, no debrief") to say the books ship none, which tells a first-time player nothing at all; the sentence now says what they are first. Glossary 38 → 41 terms. `tests/audit-functions.mjs` runs the app under Chromium's coverage counter across nine states — one per structurally distinct plot sheet — with twelve scripted journeys, and asks which of 281 functions never ran: **275 reachable by clicking, six triaged with reasons, no unreachable feature.** Its own six false-finding rounds are recorded in docs/AUDIT.md as the six distinct ways a reachability audit can lie; the last of them was the F-34 glossary-chip collision reintroduced inside the new tool a day after being fixed in the probes. Guard watched failing by deleting the "Choose" control. | `npm run cycle`, thirteen passes: unit 1,790 · dead-data clean · smoke · interaction · modals · deep · novice 0 findings · reach 20×3 routes, 41 terms · guide 0 drift · functions 275/281 · firstrun, flow, layout VERDICT clean — **one complete cycle, no findings** | v25 |
| 2026-08-26 | **Audit cycle 6 — reachability, vocabulary, and the stopping rule made executable.** Cycle 5 asked whether a stranger could tell what each surface is for; this asks whether they can reach it, whether the words mean anything, and whether each surface is honest. New `tests/audit-reach.mjs` runs 20 routes × **three states** — no game, in play, resolved — the first of which no browser pass had ever visited, since they all boot the mid-session fixture. Six findings. F-27: nine rolling surfaces (5 oracles, 4 SUM tables, the Forge) rolled with no game and silently discarded every journal entry, while the Journal promised it "fills itself as you play" — `ui.noGameNotice()` says so before the roll, and the audit asserts both that it says so and that the claim is true. F-28: 44 Forge buttons named only "d20", twelve run-together oracle labels, and a one-word action-bar primary whose context sat outside its name. F-29: the glossary grew from 12 terms to 38 in six groups, opening with one that assumes the reader has never played a solo RPG. F-30: it also stopped waiting to be looked up — `src/glossary.js` registers a decorator so every `explain()` grows chips for its own jargon, with no call site changed; `audit-novice` widened to count a chip as the per-term route its own comment describes. F-31: one destination, two labels. F-33: the layout probe's verdict had to be inferred from its column header. F-34: the flow and first-run probes started matching the chip "Confirming a beat" for "Confirm" — introduced by F-30 and caught by the new runner on its first outing, which is the argument for having it. Plus `tests/cycle.mjs`, and `audit-novice`/`audit-guide` made able to fail. | `npm run cycle`: unit 1,775 · dead-data clean · smoke · interaction · modals · deep · novice 0 findings · reach 20×3 routes, 38 terms · guide 0 drift · firstrun, flow and layout VERDICT clean — **one complete cycle, no findings** | v25 |
| 2026-08-21 | **The guide audited against what the app actually renders, not against its source.** Reported from play again: the wording still did not match. Every previous check compared the guide with string literals in `src/`, which flatters a paraphrase and misses anything the app composes at runtime. New `tests/audit-guide.mjs` drives the real app — 20 routes, 73 dialogs, every fold opened — harvests the **805 strings actually on screen**, and tests the guide's 101 claims against them, separating *seen on screen* from *the app can render it but this sweep never reached that state* from *the app never says this*. Nine real drifts, all in Part 3's reference: the journal's node kind listed "Plot node from GUM" (the app writes "Kept from GUM — <table>", and files it under `note`), "Beat confirmed" is really "Beat confirmed — <the beat>", "Character brought in" has a "Location brought in" twin, the beat card's "Recall" carries a count — "Recall (N)" — the Forge's is "Re-roll this one" not "Re-roll this one on a set", the Forge's no-game fallback is "Prepare a game →", the GUM toggle is "Game Unfolding Machine (GUM v2.2)", the text-size slider labels itself "Text size — N%", the node header's pill reads "1d10"/"1d20" rather than "1dN", the journal pager says "Show N more of M", and the Scene tab's bias is three labelled buttons ("Neutral — roll once" and its two siblings), not the bare words. | guide audit: 805 strings harvested, 101 claims, **0 the app never says** (was 9 after the extractor stopped mistaking prose for labels) · unit 1568 · dead-data clean · smoke 464 · novice audit 0 findings · first-run probe clean · guide, page and PDF regenerated | v24 |
| 2026-08-21 | **One stored field was called two different things.** Reported from play: the guide named a field the app does not show. It was right on one screen and wrong on the other — the scope's mission is *Mission and initial goals* in the prep wizard and *Mission* in both dialogs that edit the same stored value, and the game's title is *Name this game* in prep and *Title* on Home. A field a player meets twice must be called the same thing both times, so both are unified on the friendlier label (**Mission**, **Name this game**) with the extra words moved into the wizard's hint, where guidance belongs (§6.6). New harness guard: every stored text field carries one label across `wizard.js`, `screens.js`, `sheet.js` and `cast.js` — watched failing on the restored *Title*. This is the defect class the previous row's tap-route guard could not see: both spellings existed, so both passed a "does the app say this?" check. | unit 1575 · guard watched failing · dead-data clean · smoke 464 · novice audit 0 findings · interaction, modal audits clean · first-run probe clean · guide, page and PDF regenerated | v23 |
| 2026-08-21 | **The guide's wording checked against the app's, in both directions.** The harness already proved every control is *named* somewhere in the guide; it could not see the opposite drift — the guide sending a reader somewhere the app does not have, or spelling a control differently after a rename. Every `tap:` route in `data-tutorial.js` is a path a reader follows literally, so each segment must now resolve to a real tab, a real section, or a real control label, with template labels matched as wildcards and near-empty templates skipped (`.{1,28}` alone would match anything). Watched failing on a renamed tab and on an invented control. The sweep that motivated it found the shipped guide **already in sync**: 117 quoted on-screen strings, 135 control phrases in the Part 3 reference and all 14 tap routes resolve. | unit 1581 · guard watched failing twice · dead-data clean · no shipped file changed, so no cache bump | v22 |
| 2026-08-18 | **The three screens the last pass named and left.** **F-49** the rules library was 4.7vh because four chapters of prose (*From the books*, *Errata*, *Where the app does not roll* — 231, 251 and 514px) sat permanently open above and below the glossary that people actually arrive for. All three now group-fold with a count, exactly as the eight rule sections beside them already did; the glossary stays open. 4.7 → **3.4vh**, and the glossary itself runs each term into its own definition instead of stacking it — same words, twelve fewer lines. **F-50** the plot-node lists showed *every* written entry, each with its own Invoke, so a full eight-list sheet was 89 controls over 5.3 screens. Four written entries plus one empty now show per list, and *Show all N slots* says how many written ones are still behind it. 5.3 → **4.7vh**, 89 → 77 controls; nothing is unreachable — the die rolls across every slot and *Roll this list* can still land on a hidden entry. **F-51** Settings was the last screen whose primary only sat inline, 390px down: **Export JSON** is pinned with Import beside it, and the inline copy drops to a plain button so there is one accent, not two. | novice audit 20 routes / 72 dialogs / 0 findings · unit 1569 · dead-data clean · smoke 464 · interaction, modal and deep audits clean · first-run probe 18 taps · flow probe clean · layout at 320/360/390: library 4.7 → 3.4vh, nodes 5.3 → 4.7vh, settings now pinned, nothing else moved | v22 |
| 2026-08-18 | **Three residuals from the novice pass, all measured rather than felt.** **F-46** a preference was a move in the game: `setSetting`, `setTheme` and `setTextScale` all took an undo snapshot, and the stack is capped at 20 — so a player collapsing the *what this does* notes across five screens silently evicted five undoable actions. Preferences now write through `store.prefer()`, which emits without snapshotting; they are their own inverse and the control that set them sets them back. Guard watched failing. **F-47** `scene/people` was the last rolling screen with an inline primary, 521px down once the notes opened; it pins *Roll Meet reaction*, the book's own first depth, like its three sibling screens. **F-48** the journal paged forty entries at a time — 97 controls and 6.6vh, the tallest screen in the app; twenty pages it to 57 controls and 3.8vh, and the *Show N more of M* line already said how much was left. | novice audit 20 routes / 71 dialogs / 0 findings · unit 1562 · dead-data clean · smoke 464 · interaction, modal and deep audits clean · first-run probe 18 taps · flow probe clean · layout at 320/360/390: journal 6.6 → 3.8vh, `scene/people` now pinned, nothing else moved | v21 |
| 2026-08-18 | **Every surface audited for the stranger, not just the first-run path.** New `tests/audit-novice.mjs` sweeps all 20 routes and opens all 71 dialogs, asking four mechanical questions: does the screen carry its note, does it lead with a sentence rather than a control, is every book term it displays either written out in prose there or one tap from the rule that defines it, and **does every dialog say what it does before it asks**. First run: 40 findings. Thirteen dialogs asked for typing with no explanation at all — the four plot-node lists (now carrying the book's own definition and examples from `NODE_CATEGORIES`), Add a protagonist / character / location and the two entry dialogs, both journal-writing dialogs, and Home's game and plot-sheet editors. Four screens used book vocabulary with no route to a definition: Cast and Journal gain rule links, the rules library's **glossary now opens by default** (it is the one card whose whole job is answering "what does that word mean", and folded shut it answered nothing — the screen goes 2.9 → 4.7vh, accepted on a reference screen), the guide's four part blurbs move outside their folds, and its first quick-start step opens until the walkthrough is marked read. | novice audit: 20 routes, 71 dialogs, **0 findings** (was 40) · unit 1562 · dead-data clean · smoke 464 · interaction, modal and deep audits clean · first-run probe 18 taps, every step in place · flow probe clean · layout clean at 320/360/390 | v20 |
| 2026-08-18 | **The first run measured for jargon, not just for reachability — four changes for a player who has never played solo.** Stripping closed folds from the DOM and counting only what a stranger actually reads: 12–28% of every first-run screen's words sat behind a collapsed *What this does*, the sheet picker was 444 words and five unglossed book terms at step 4 of 5, and **no screen anywhere said that the player is the one who has to narrate** — the app's own honest position (it resolves nothing) was itself inside a fold. (1) `NEW_TO_SOLO` — three lines above the fold on the cold-open Home, shown only until the first game exists: you narrate, the machine answers, your own RPG resolves. (2) The *What this does* notes now **start open and collapse everywhere for good the first time one is closed**, re-opening the same way; the gesture *is* the setting, so nothing is dismissed twice, with a Settings toggle to bring them back and a `registerExplainState` seam keeping `ui.js` free of Settings. (3) `FIRST_BEAT_COACH` — one line above the beat card until the first beat of a game is confirmed, naming the loop the app had never spelled out. (4) The sheet picker leads with **Standard alone** (PUM p.3: *"if this is your first time, the standard Plot Sheet is a good start"*) behind *Show all ten plot sheets*, taking that step from 17 controls to 9. The first-run probe still walks the whole arc with every step offered in place. | first-run probe clean, 18 taps · unit ~1560 · dead-data clean · smoke 464 (new: the close-one-closes-all round trip, and the explain assertion inverted to the new rule) · interaction · modal · deep audits clean · flow probe clean · layout clean at 320/360/390 | v19 |
| 2026-08-18 | **The first-run path measured for the first time.** Every previous probe started from a fixture — a game already prepared, a scene already open — so the walk a stranger actually takes had never been instrumented. `tests/probe-firstrun.mjs` opens an empty app and drives the whole arc: prepare a game → write a node → open a scene → roll the opener → ask an oracle → take the beat the answer triggers → confirm it → close the scene → read it back. **Eighteen taps, every step offered by the screen the player was already on** — after one fix: the scene-closure summary said "two journal entries were written" and was the only step of the loop with no route to them, so it gains **Write it down**. | first-run probe clean · unit ~1570 · dead-data clean · smoke 461 · interaction 326 controls · modal audit 278 in-dialog buttons · flow probe clean · layout clean at 320/360/390 | v18 |
| 2026-08-18 | **The three books re-read, and the shipped data checked against them mechanically.** Every row in `data-*.js` was matched to the text of the page it cites, and every GUM row to its printed *number*: 1,580 GUM rows verbatim and in position, every PUM oracle row, quantifier, granular band, enrichment word, ABCD row, proposal and prompt column exact, and all 24 SUM tables tiling their die with **no transposition** — the defect that would have inverted the Rule of Bias is absent everywhere. Three findings. **F-35** the Exploration sheet had five node slots and no extension lists; p.19 prints **no** node lists (counted: Standard 20 placeholders, Story-focus 30, Scenes/Dungeon/Story-parts 20, and zero on Journey, Exploration, Improvised, Sandbox, Customized), so like Journey it pairs with a Plot Nodes sheet — ten slots, extension lists included, which is also what its own prompt column reaches for at 5 and 6. Each sheet now records `printedLists`, measured from its page, and the harness holds the node model to it; the guard was watched failing before the fix was trusted. **F-36** PUM p.4 makes the d100 enrichment part of the rule and Settings can switch it off, but `rollOracle`'s `enrich` flag had no surface — so the result card gains **Enrich it**, rolling only the enrichment die into the same journal entry. **F-37** three surfaces spelled out "Journey, Story-focus, Sandbox and Customized" by hand (§10.2) — a list F-35 made wrong in two of them — now read from the sheet table via `derived.expandedSheetSentence()`; the same line mis-cited the extension sheet as p.26 (it is p.27). Rulings A11 and A12 added. | unit ~1570, 0 failed (the count moves by a few between runs: some assertions are conditioned on rolled fixture state) · dead-data clean · smoke 461 · interaction 326 controls · modal audit 278 in-dialog buttons · deep audit 941 controls · 1,398 write-back checks across 10 sheets · flow probe clean · layout clean at 320/360/390 · guide, page and PDF regenerated. Three independent source checks written for this pass — row text against the cited page, GUM row position against the printed numbering, and SUM low/high orientation — plus the `printedLists` guard, watched failing | v17 |
| 2026-08-17 | **The guide is a PDF too.** A fourth rendering of `data-tutorial.js`, printed from the page that already existed rather than laid out again: `tests/tools/gen-pdf.mjs` drives Chromium over `tutorial.html` with a new `@media print` block, so pagination is stated in CSS beside the screen styles and cannot drift from them. The print block drops what cannot work on paper — the sticky reading track, the sticky contents rail, and the *Open the app* link, replaced by the app's address in print, since a printed link cannot be followed — and repaginates the rest: a title page, a contents page in two columns, one page break per part, and `break-inside: avoid` on every roll figure, aside, tap chip and list item, so nothing that reads as a unit is split. **The contents carries page numbers, which needed a fixed point**: Chromium does not implement CSS `target-counter`, so the first print is a measurement — its named destinations say which page each section landed on — the numbers are written into the contents, and it prints again until two consecutive prints agree, because adding the numbers can itself move a boundary. Also set here, being things CSS cannot say in Chromium: A4, margins, a running header, `n / 26` footers, PDF bookmarks and a tagged structure tree. **Drift is guarded differently from the other three**: a PDF cannot be byte-diffed (its bytes carry a build timestamp and a font subset), so the generator records the SHA-256 of the HTML it printed in `docs/tutorial-pdf.sha256` and the harness compares — watched failing before it was trusted. The check imports no dependency, because the Pages workflow installs none and now gates the deploy on it. | unit 1535 · dead-data clean · smoke 461 · interaction 326 controls · modal audit clean · 26 pages read back in a PDF viewer: no blank page, no split figure, no stranded heading, every contents number verified against the page it names | v16 |
| 2026-08-17 | **The guide is hosted beside the app.** `tutorial.html` is generated into the repository root, so a static host serves the app at `/` and the guide at `/tutorial.html`; the app links to the sibling path rather than to an external URL, and the page links back. It joins the service-worker app shell, so the link works offline like everything else. **A real defect fell out of adding a second page:** the service worker cached *every* navigation response under `./index.html`, so visiting the guide would have overwritten the app's shell in the cache and served the guide's markup as the app offline — navigations are now cached against the URL actually requested. `.github/workflows/pages.yml` deploys the root on every push to `main`, gated on the generated guide being current and the unit harness passing, so a stale page or an app shell missing a file fails the deploy instead of shipping. `.nojekyll` keeps Pages from processing the files. The drift guard now covers the page as well as the doc, and was watched failing; the harness also stopped crashing when the generator exits non-zero and reports it as a failure instead. | unit 1518 · dead-data clean · smoke 461 · interaction clean · both pages served side by side from one root with no failed requests and the round trip working in both directions | v15 |
| 2026-08-17 | **The guide is linked in three directions.** The content shipped in all three renderings but nothing pointed at anything: the app's Tutorial screen did not mention the published page, the generated doc did not mention the app, and the README did not mention the guide at all — so the only way to find any of it was to already know it existed. The Tutorial screen gains “Open the guide as a page →”; the generated doc and page each name the other two renderings; the README gains a Documentation section saying which file is generated from what. Nothing about the app's offline behaviour changes — the whole guide is in the app either way. | unit 1521 · dead-data clean · smoke 461 · the control-completeness guard caught the new link before it shipped undocumented | v14 |
| 2026-08-17 | **The tutorial became the complete guide.** The eleven-step walkthrough was the only documentation of the app, and it covered about a fifth of it. Replaced by `data-tutorial.js` — content, not markup (§10.2) — rendered three ways from one source: `src/tutorial.js` draws it in-app as collapsible parts, `tests/tools/gen-tutorial.mjs` emits `docs/TUTORIAL.md`, and that generator also emits the published page. The eleven steps survive as the quick start on top, so the first-run path is no worse than it was. Four parts under it: a play-order walkthrough of every function with the reason each rule exists; four scenarios on four structurally different sheets (Dungeon, Journey, Sandbox, Customized) so nothing is left unreachable; a screen-by-screen reference; and what the app deliberately does not do. **Twenty-seven worked examples, every one a real row at a real die value** with its page, including deliberately awkward rolls worked through with PUM p.10's advice — a tutorial that only shows results landing well teaches a false expectation. Completeness is checked, not claimed: the harness scans `src/` for all 221 labelled controls and dialogs and fails if any is unnamed in the tutorial, and regenerates the doc to catch drift. Table rows are reproduced in full in-app only; the doc and the page quote just the rows their examples land on, with CC BY-NC-SA attribution on all three. | unit 1528 · dead-data clean · smoke 461 · interaction 324 controls · modal audit clean · deep audit clean · flow probe clean · layout clean at 320/360/390; `more/tutorial` 1.4 → 1.9 screens collapsed. The contrast gate caught the new tutorial CSS at 4.17 before it shipped | v13 |
| 2026-08-17 | **The palette had never been contrast-checked.** Rendered the app in both themes at all three viewport classes and measured every visible text node against whatever is actually painted behind it: **145 failing nodes in light, 41 in dark**. The worst was the label on the primary action — white on machine orange, **3.52:1** — followed by the accent used as text (2/11, section names) at 3.12:1, and `--ink-3` on paper at 4.07. Fixed by splitting the accent in two rather than repainting the app: `--accent` stays the identity colour for fills, a new `--accent-text` (#b64d30, 4.56) carries anything read as words, and `--accent-ink` becomes ink rather than white (4.57 on the orange) so the primary button keeps the orange §1 builds the whole theme around. `--ink-3` moves to #656d87 light and #8c8678 dark. Also: the plot sheet showed **two equal-weight primaries and the label "Random prompt" twice** — the card's pair are secondary now, since the pinned bar carries the call; the `explain` fold gains the open/closed marker `.acc` folds already had, and the inspiration block stops wearing the `?` that means "explanation". A contrast pass over both themes and every route joins the smoke harness, so the palette cannot regress; it was watched failing on the old tokens before the new ones were trusted. | unit 1516 · dead-data clean · smoke 461 (new: WCAG AA sweep, both themes) · interaction 321 controls · modal audit 278 in-dialog buttons · deep audit clean · flow probe clean · layout clean at 320/360/390 | v12 |
| 2026-08-17 | **Friendliness round two: the ground the probes had never covered.** Every harness ran portrait at 320-390px, so orientation and desktop had never been measured at all. **Landscape** at 740×360 spent **48%** of the viewport on fixed chrome, leaving a 187px window to scroll five screens through; the app header stops being sticky (brand, home and theme carry nothing you need mid-scroll), the tab bar drops to icons with the labels kept for assistive tech, the plot header compacts and drops its drawn track — the count it duplicates is still there — and the bars shrink. Worst case is now 40%, and 25% where no action bar is pinned. **Desktop** was a 720px column in a 1440px window under a tab bar stretched the full width: cards now flow two-up in a 1000px grid with everything else spanning, and the tab bar's buttons are held to the column while its background still spans. `play/nodes` went **6.1 → 1.1 screens** at 1440px, the journal 6.3 → 2.2. Three bar heights became CSS variables so every `calc()` follows an override instead of restating 56px. **An oracle answer never said what it answered** — the question was journalled but not put on the card, so a re-roll or an interruption left a bare "No" with nothing attached; the result card carries it now. **The Nodes screen** reveals what is written plus one empty slot, with *Show all N*: 6.1 → 2.3 screens and 104 → 32 controls at 390px, the same progressive disclosure prep got last round. **First run** pins *Prepare a game* — the one screen in the app that did not pin its primary was the first one a new player sees. **The Forge no longer claims to keep what it cannot**: with no game open `store.addCast` silently did nothing while the toast said "Added to the cast"; it now says there is nowhere to keep it yet and offers to prepare a game. | unit 1502 · dead-data clean · smoke 459 (new: a landscape pass and a wide-viewport pass across every route, neither previously tested) · interaction 321 controls · modal audit 278 in-dialog buttons · deep audit clean · flow probe clean · layout clean at 320/360/390 | v11 |
| 2026-08-17 | **Friendliness pass, measured first.** Ten routes profiled for height, control count, above-fold controls and jargon density; the changes follow the table, not a reading. **Undo left Settings**: it was offered on exactly one screen at 417px scroll depth, four moves from whatever you were undoing. Thirteen mutating actions now raise a toast carrying an Undo button, via a `registerUndo` seam that keeps `ui.js` free of store knowledge. That exposed a real defect — a track advance writes two snapshots (the crossing and its journal entry), so one undo left the box crossed; `store.transact()` makes one player action one undo, and the scene-close flow's hand-counted double undo collapses into it. **Journal** entry tools fold behind the entry (was two permanent buttons per entry, 40 controls of furniture; 7vh → 6.3vh). **Rules** groups collapse and a twelve-term glossary answers "what is a plot scope", which a library organised rule-by-rule could not (4.7vh → 2.7vh). **Prep** shows three node slots per list with "add another" instead of up to sixty empty boxes. **The track** names what its current section is for, the way the beat card explains a proposal's kind (`TRACK_SECTION_NOTES`, app voice, uncited). **Scene** exploration, battle and discovery pin their primary action like every other screen. **Six tabs became five**: the Forge is prep, not play, so it is a section of More with its own second-level nav — at 320px the tab bar went from 53px to 64px per tab. Caught in the pass: the undo toast's `pointer-events:auto` covered the action bar beneath it and made the primary control unclickable while any toast showed. | unit 1500 · dead-data clean · smoke 337 (new: Forge sub-nav at 320px, five-tab geometry, undo-from-toast round trip) · interaction 325 controls · modal audit 342 in-dialog buttons · deep audit 1,067 controls · 749 in-dialog buttons · 1,818 write-back checks · flow probe clean · layout clean at 320/360/390 | v10 |
| 2026-08-17 | **The inspiration map was wrong on shape, and is now matched to it.** Reported from play: rolling on "Name this game" and "Universe or RPG" returned answers that had nothing to do with the field. The cause was a bad premise in the previous change — that every text field could be served by *some* table, with the grand oracle as a catch-all. It cannot. Every GUM row is a descriptive phrase about fiction ("Humid: wilderness, jungle, raining"), which is the right shape for a piece of story and the wrong shape for a **proper name** or a **real-world answer**. Three corrections. (1) Eight fields lost the block entirely and are recorded in `INSPIRE_ABSENT` with a reason each — *Universe or RPG* most of all, since GUM generates worlds but not the names of published ones. (2) Name fields no longer take the concept into the name box: `promptModal` gained an optional second field, so "Add a character" asks for the name and the rolled archetype lands in the notes beside it — which is what the retired `gumSuggest` flow did, and a regression this change had introduced. (3) `game-title` now rolls only the two word-shaped grand tables and `game-tone` an adjective and the world's state, instead of plot hooks and location archetypes. The absences are **surfaced**, not just recorded: Rules gains a "Where the app does not roll" card, because data with no shipped surface is the §0 defect and a player who sees one blank offer three words and the next offer none deserves the reason. The harness guard changed with it — a dialog must now either name a field or carry a `// no-inspire:` line saying why, so silence fails. | unit 1495 · dead-data clean · smoke 362 · interaction 430 controls · modal audit 402 in-dialog buttons · deep audit 1,051 controls · 749 in-dialog buttons · 1,802 write-back checks · flow probe clean · layout clean at 320/360/390 | v9 |
| 2026-08-17 | **Inspiration prompts on every text field.** Every text input can now roll three words for inspiration: a collapsed "Stuck? Roll three words" line that expands, rolls three context-matched GUM tables, and offers each word as a chip that **appends** to the field rather than replacing it. The tables are chosen by what the field is for (`GUM_FOR_FIELDS`, 29 fields) — a character field pulls archetypes and flaws, a location field pulls features and purpose, the mission field is exactly GUM's six-table plot seed — with the grand oracle as the fallback for anything unmapped. **No new content:** the same 43 tables, pointed at a blank. A field with more than three tables rotates through them on a re-roll; one with fewer rolls repeatedly within them, which GUM p.3 names as its own method; "All N tables" rolls the whole mapped set inline. Nothing rolls until the block is opened (PUM p.10: do not roll when you already know), and only words you actually keep are journalled — the Dice tab now says so plainly rather than presenting a partial count as complete. `gumSuggest()` and its seven standalone GUM buttons are retired: the block does the same job inside the dialog the player is already in, where a nested dialog would have replaced it and taken the typed text with it. `ui.js` stays free of GUM knowledge through a `registerInspire` seam. | unit 1513 · dead-data clean · smoke 362 · interaction 421 controls · modal audit 492 in-dialog buttons (folds expanded, up from 300) · deep audit clean · flow probe clean · layout clean at 320/360/390. The dialog-coverage guard was watched failing before its fix | v8 |
| 2026-08-17 | **Audit cycle 5 — every tab, every button, every plot sheet.** The interaction and modal audits had only ever run one fixture (a Standard sheet), so nine plot sheets and the whole prep wizard were unaudited; new `tests/audit-deep.mjs` sweeps all ten sheets, the wizard step by step, and a write-back invariant. Five findings. F-15 `derived.nodeSlots` gave the extension-sheet lists slots on sheets that do not print them, so the wizard, the beat card, the Forge's "Keep it" and the cast's "Add to plot nodes" could all write into a list the Nodes screen then hid — data with no way back. F-16 the wizard offered the two player-named lists before they were named (`nodeSlots` returns 0 for those), the same black hole; naming now happens in prep and `customNames` is carried into the new scope. F-17 the twelfth Permission — *end a scope when you say it ends* — was a sentence on the track card, and on the trackless Sandbox and Improvised sheets it was the only way a scope could ever finish; now `scope.closedAt` with End/Reopen controls and a rules-library entry. F-18 PUM p.9's specific plot node invocation is allowed "rolled or chosen" and only *chosen* had a control; each node card now rolls its own list as a beat. F-19 `cast.addToNodes` hard-coded a five-slot list in `src/` (§10.2) and mis-read the list length. F-20 a dialog opened from inside a dialog action was closed again by the action wrapper, so a *voluntary* advance onto a marked box fired the timed beat and swallowed the modal announcing it — `ui.modal` now closes its own dialog rather than whatever is open, and `audit-modals` carries a guard that was watched failing. F-21 `derived.nodeDie` switched a ten-slot list to 1d20 at *more than* five entries; PUM p.25 says 1d10 with **less than** half filled, "otherwise" 1d20, and exactly half is already otherwise — the app disagreed with the rule text quoted in its own ruling A7 and with its own on-screen note. Corrected at fill ≥ half, ruling A7 reworded. F-22 the audits compared `innerHTML.length`, so a symmetric swap (which plot-sheet card is chosen) read as a no-op; all three now hash the markup, and controls marked `aria-current`/`aria-pressed` are excluded because doing nothing is their correct behaviour. F-23 the wizard's "Add protagonist" and "Add a plot node list" silently did nothing with an empty name; both are disabled until there is one. F-24 the plot-sheet picker had no selected-state semantics — ten identical buttons to a screen reader — and now carries `aria-pressed`. Plus: the Scene arc and Characters screens showed a result card left over from an unrelated SUM table; Home counted hidden node lists as prep done; archived games sink below live ones. | Closed on a no-finding cycle: unit 1490 · dead-data clean · smoke 362 · interaction 435 controls · modal audit 300 in-dialog buttons · deep audit 1,427 controls · 1,857 in-dialog buttons · 3,286 write-back checks across 10 sheets and the wizard · flow probe clean · layout clean at 320/360/390. Three guards (write-back, dialog survival, node die) each watched failing before their fix · merged to `main`, branch deleted | v7 |
| 2026-08-16 | Instantiated from template v3. Stage A extraction complete (bbox reconstruction + 300 dpi vector measurement); Stage B decisions recorded; full build of Phases 0–4 and 6. | `npm test` 930 assertions green; parse gate clean | v1 |
| 2026-08-16 | Audit cycle 1: nine findings, all fixed. F-1 proposal notes extracted and never shown (the §0 defect) → `PROPOSAL_KINDS` + `rules.proposalNote`, surfaced on the beat card. F-2 three custom-sheet Permissions with an engine and no control → the Customize dialog. F-3 `updateGame` unreachable → Edit on the Home game card. F-4 SUM section names hardcoded in `src/` → read `SUM_SECTIONS`. F-5 transient view state leaked across scopes → new `src/viewstate.js` clearer registry. F-6 dead exports and unused imports removed. F-7 the dead-data scan's own `\b$\b` bug, which I acted on before verifying. F-8 tap targets raised to 40px. F-9 two primary actions below the fold → Home pinned, Settings reordered by frequency. F-10 `viewstate.js` missing from the service-worker app shell (offline boot failure) → listed, cache bumped to v2, and a harness check added. | `npm test` · `npm run deadcode` · `npm run smoke` (304 checks) · `npm run audit` · layout probe at 320/360/390 under the stress fixture; three data guards and one layout guard each watched failing before restore | v2 |
| 2026-08-16 | Audit cycle 2, run against the cycle-1 fixes: four findings, three of them regressions the fixes introduced. F-11 the wizard hijacked every More route → it renders on Home only. F-12 illegal wizard steps were enabled and inert → disabled with a reason. F-13 `store.createGame` fired the clearers and nulled the draft mid-`finish()` → local copy taken first. F-14 track boxes 36px at 320px → min-width raised. Re-ran the full cycle afterwards with no new finding. | unit 945 · dead-data clean · smoke 304 · interaction audit 338 controls · layout probe clean at 320/360/390 under stress | v3 |
| 2026-08-17 | Audit cycle 4, aimed at sequence of play and completeness. Eight findings. Two features the books have and the app did not: the extension sheet's two player-named plot-node lists (PUM p.27) and its Game notes area. Flow: the Forge (prep) sat between the plot sheet and the oracles in the tab bar; the Play tab crossed a box above the control that calls the beat; the loop of PUM p.5 crossed tabs with no onward route at any step, so the player drove it from the tab bar. Fidelity: a Yes/No answer now offers the beat p.28 says it triggers. Plus journal filters that missed five of the kinds the app writes, a session-break marker the spec claimed and did not have, and a Download button that was silent when the browser blocked it. New `tests/audit-modals.mjs` (284 in-dialog buttons, never previously audited) and `tests/probe-flow.mjs`. | unit 1323 · dead-data clean · smoke 362 · interaction 453 controls · modal audit 284 in-dialog buttons · flow probe: every loop step offered in place · layout clean at 320/360/390 | v6 |
| 2026-08-17 | **GUM v2.2 added** as the committed third book: all 43 tables (1,580 rows) parsed by coordinate reconstruction rather than hand-transcribed, every table validated contiguous before transcription; new `data-gum.js`, `src/forge.js` and a sixth tab; GUM wired into every blank-filling point (empty node slots, the cast, the wizard's scope step) through one shared `gumSuggest()` dialog; erratum G1 recorded rather than corrected; rulings A9 and A10 added. Audit cycle 3: three findings — two Forge screens with a mis-classed primary action, and Settings' primary pushed off a small screen by the new toggle. | unit 1312 · dead-data clean · smoke 362 · interaction audit 440 controls · layout probe clean at 320/360/390 under stress | v5 |
| 2026-08-16 | Cosmetic: the pinned action bar's context line wrapped to two lines on a narrow screen, growing the bar. Truncated with an ellipsis; the buttons no longer flex. Verified in light and dark on a real render. | smoke 304 green; layout probe clean at 320 | v4 |
