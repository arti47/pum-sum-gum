# Unfolding Machines

A solo-storytelling play aid for **PUM — Plot Unfolding Machine v9.0**, **SUM — Scene
Unfolding Machine v8.0 Rev2** and **GUM — Game Unfolding Machine v2.2** by JeansenVaars.

An installable PWA with no build step: clone it, serve the folder, and it runs. Everything is
stored in your browser's `localStorage`; nothing is sent anywhere.

## What it does

| | |
|---|---|
| **Game prep** | PUM's four steps — universe → plot scope → protagonists → plot sheet → plot nodes — plus the starting point |
| **The plot sheet** | All eleven plot tracks with their measured box counts, plot nodes, beat controls, timed beats |
| **Plot beats** | Modified proposals and random prompts, the ABCD random events, node invocation with add/choose/reroll, the disruption die |
| **Oracles** | Yes/No in three registers, the granular d100 variant, six descriptive and six story oracles with d100 enrichment, quantifiers |
| **Generators** | GUM's 43 tables (1,580 rows): plot seeds, world truths, factions, locations, objects, a nemesis, creatures, characters and the grand oracle — rollable singly or as the book's own combinations |
| **Scenes** | SUM's whole arc — opener, intervention check, closure — plus exploration, battle and discovery tables |
| **Characters** | SUM's four depths of acquaintance, rolled from a cast entry and stored with that person |
| **Journal** | Every roll with its dice, your own notes, filters, paging, and a per-face distribution view |
| **Teaching** | Four layers, for a reader who has opened none of the books. A plain-language **glossary** of 38 terms — starting from "what is a solo RPG" and "what is an oracle" — surfaced both in the rules library and as chips under each screen's own note, so a word is defined where you meet it. A "what this does" note on every screen, open until you close one. A searchable rules library citing the books' pages. And a complete guide, in the app, as a page, and as a PDF. |

## What it deliberately does not do

- **It never resolves a task.** PUM is system-agnostic: bring your own RPG's rules, or
  narrate the outcome. The app says what the world offers, never whether you succeeded.
- **No safety tools.** Neither book ships any, so none is invented and presented as theirs.
  Settings says so plainly.
- **No multiplayer.** PUM's group mode is one device passed around a table; there is no sync
  phase and no account.
- **No setting content.** Core rules only. Effect text is paraphrased, never reproduced.
- **No invented mechanics.** GUM has no bias rule, so the app offers none on its tables; where
  a book prints something twice, it stays printed twice and the erratum is recorded.

## Running it

```sh
python3 -m http.server 8000     # or any static server
# open http://localhost:8000
```

Service workers and installation need `http(s)://`, not `file://`.

## Development

No runtime dependencies. The harnesses are dev-only.

```sh
npm run cycle         # ALL of the below, in order, in one report — see below
npm run cycle:watch   # re-run the whole cycle on every change, until one comes back clean

npm test              # parse gate + data, engine and glossary invariants (seconds)
npm run deadcode      # the dead-data scan: rules extracted and never called
npm run smoke         # browser smoke: every route, three widths, the end-to-end walk
npm run audit         # interaction audit: clicks every control in isolation
npm run audit:modals  # every button inside every dialog
npm run audit:deep    # every plot sheet, every wizard step, every branch
npm run audit:novice  # could a stranger tell what each surface is for?
npm run audit:reach   # can they reach it — 20 routes across three states of the app
npm run audit:guide   # the shipped guide's wording against what the app renders
npm run audit:functions # every function in src/, reached by clicking (Chromium coverage)
npm run audit:hostile # oversized, malformed and adversarial input at every door
npm run jargon        # words the app says in its own voice that the glossary does not define
npm run probe         # measured layout table (a probe prints; it does not assert)
npm run probe:flow    # the book's own loop, walked without touching the tab bar
npm run probe:firstrun # a stranger, from a cold open to a scene played and journalled
node tests/make-fixtures.mjs   # regenerate the seed fixtures after a schema change
```

### Running until nothing is reported

The rule this project is held to is: **done when one complete cycle of every pass produces no
finding** — not "the pass I just fixed is green". `npm run cycle` enforces it. It runs all
fourteen passes in order, *never stops at the first failure* (a runner that bails hides how much
is broken), gathers every finding into one report, and exits non-zero unless the whole cycle
was clean.

To iterate until it is clean, leave `npm run cycle:watch` running: it re-runs the entire cycle
whenever a shipped file changes, and exits itself the moment one complete cycle reports
nothing. `--repeat 3` runs up to three cycles in a row, which is how a flaky pass shows itself;
`--only unit,reach` narrows it while you work.

`CLAUDE.md` is the project's canonical spec — the completed System Profile, the extraction
and traceability ledgers, and the rulings taken where the books were ambiguous. Change code,
change that file in the same commit. Any change to a shipped file bumps `CACHE_VERSION` in
`service-worker.js`.

`docs/rules/` holds the distilled per-subsystem reference the audit reads against the engine;
`docs/AUDIT.md` records numbered findings pass by pass.

## Documentation

**[docs/TUTORIAL.md](docs/TUTORIAL.md)** is the complete guide — every function of the app,
four worked scenarios on four structurally different plot sheets, and a screen-by-screen
reference. It is *generated* from `data-tutorial.js` by `npm run tutorial`; edit the data, not
the markdown, and the harness will tell you if the two drift apart.

The same guide is inside the app at **More → Tutorial**, where it opens with an eleven-step
quick start and reproduces the referenced tables in full; beside the app as `tutorial.html` —
a sibling page any static host serves, linked both ways and cached with the app so it works
offline too; and as `tutorial.pdf`, the paginated rendering, with a title page, a numbered
contents, PDF bookmarks and one part per page break. All four come from the one data file; the
harness fails if any of them drifts.

`npm run tutorial` writes the markdown and the page. `npm run pdf` prints the page to
`tutorial.pdf` — it needs a browser, so it is a separate script, and it records the hash of the
HTML it printed in `docs/tutorial-pdf.sha256` for the drift check. Run both after editing
`data-tutorial.js`.

## Hosting it

The app has no build step, so a static host can serve the repository root as it stands: the app
at `/`, the guide at `/tutorial.html`, the PDF at `/tutorial.pdf`. `.github/workflows/pages.yml` does this on every push to
`main`, after checking the generated guide is current and running the unit harness — a deploy
that would ship a stale page or a service worker missing a file fails instead.

**One setting has to be flipped by hand, once:** GitHub → *Settings* → *Pages* → *Source:
**GitHub Actions***. Until then the workflow runs and the deploy step fails. After that the app
is at `https://<owner>.github.io/<repo>/` and the guide at `.../tutorial.html`.

A `.nojekyll` file sits at the root so Pages serves the files as they are rather than running
them through Jekyll.

`CLAUDE.md` is the canonical spec and is updated in the same change as the code it describes.

## Licensing

PUM, SUM and GUM are © JeansenVaars, licensed **CC BY-NC-SA 4.0**, sold on
[itch.io](https://jeansenvaars.itch.io) and DriveThruRPG. Support the author — this app is not
a substitute for the books, and it assumes you own them.

This repository is a **personal play aid** built from those books. It carries numbers and
mechanics with page citations, paraphrased in its own words, and no setting, adventure or art
content. If you publish or distribute it, the licensing is your responsibility.
