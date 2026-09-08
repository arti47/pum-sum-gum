# Playtest brief — Unfolding Machines

Written from the app before playing: its rules data (`data-pum-*.js`, `data-sum.js`,
`data-gum.js`), its own guide (`data-tutorial.js`, More → Tutorial) and its spec (`CLAUDE.md`).
Quotes are the app's words, not the books' and not memory.

## Resolution

**The app states that it has none, and that this is the design.** From its own guidance data:

> "PUM resolves nothing. It never says whether an action succeeded — it says what the world
> offers. Bring your own RPG's rules for task resolution, or narrate the outcome yourself."

So there is no success, no partial, no complication ladder to test. What the app resolves are
*questions* (oracles) and *what happens next* (plot beats). A playtest must judge it on those,
and must not report "no resolution mechanic" as a stall — the app says it up front, on Home, in
Settings and in the rules library.

## The loop

The app states it twice, and the two agree. Home → Rules → From the books gives PUM's three
play states; Part 1 of the guide gives the practical rhythm:

1. **Roleplay** — "narrate until you hit something you genuinely do not know".
2. **Ask the oracles** — "roll when both of these are true: you do not know, and the answer
   changes what happens next".
3. **Invoke a plot beat** — "a modified proposal twists an idea you already have; a random
   prompt tells you what happens when you don't have one".
4. Play the beat out, then **confirm it or not**: "Confirm — cross a box" / "Not this time".
5. Scenes wrap the whole thing: **Open a scene → Roll a scene opener → (Roll an intervention
   check) → Roll a scene closure**.

## Clocks and pressure

- **The plot track** — the only clock. Sections of boxes (Standard: Exposition 3 ·
  Confrontation 5 · Resolution 3 = 11). A *confirmed* beat crosses the next empty box; nothing
  else advances it. At full: "The scope has resolved."
- **Timed plot beats** — a box can be marked; arriving at it fires once.
- **The disruption die** (off by default) — an extra d10 on oracle rolls: 1 interrupts with a
  random prompt, 2 (or 2–5 when volatile) twists the scene.
- No health, no resources, no countdown that damages you. Pressure is narrative only.

## The oracle

Present and central. Yes/No in three registers (deterministic, subjective, conversation) at
1d10; a granular d100 variant against a declared likelihood band; six descriptive and six story
oracles at 1d10, each enriched by a d100 word; three quantifiers. Plus SUM's 24 scene and
character tables and GUM's 43 generators. Every roll shows its dice.

## The record

`localStorage` only, key `umState`, and the **Journal** tab is the surface: every roll lands
there with its dice, filterable by kind, plus the player's own entries ("Write an entry") and
session breaks. Exportable as JSON or as readable Markdown. This is what a playtest transcript
should be read against — if the journal disagrees with what happened, that is a finding of the
worst kind.

## Ending

Three endings, and the app names all three:

- **A scene** ends with "Roll a scene closure" — fortunately/unfortunately plus a hook.
- **A session** has no procedure in the books; the app says so and offers "Session break" as a
  marker for the player's own benefit.
- **A scope** ends when the track fills ("The scope has resolved") **or** when the player says
  it does ("End this scope") — the latter is the only ending a trackless sheet has.

Nothing is gated behind ending a session: there is no advancement, no currency, no XP. So the
end-of-session economy other apps hide behind a "go home" button does not exist here, and its
absence is not a finding.
