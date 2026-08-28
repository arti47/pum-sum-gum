// The tutorial, as content rather than markup (§10.2). One source, three
// renderings: src/tutorial.js draws it in-app, tests/tools/gen-tutorial.mjs
// emits docs/TUTORIAL.md from it, and that markdown is what gets published.
//
// Block types a renderer must handle:
//   { p }        a paragraph
//   { tap }      a route through the UI, e.g. "Play → Plot track → Confirm"
//   { steps }    an ordered list
//   { bullets }  an unordered list
//   { roll }     a worked die example: { what, die, value, result, page, then }
//   { table }    a whole printed table — IN-APP ONLY (see `inApp`)
//   { note }     rationale: why the rule is like that
//   { warn }     a trap worth naming
//
// `inApp: true` marks a block the shared renderings omit. The app already
// contains every row, so reproducing a table there discloses nothing; the doc
// and the published page quote only the single rows their examples land on.

export const TUTORIAL_META = {
  title: "Using Unfolding Machines",
  blurb: "A complete guide to every function of the app, for someone who owns the three books and has not run a solo game before.",
  // The same guide as a sibling page, served by whatever hosts the app and
  // cached with it, so the link works offline and wherever the app is deployed.
  page: "./tutorial.html",
  pageNote: "The same guide is also a page beside the app — easier to read on a laptop while you play on your phone. It is cached with the app, so it works offline too.",
  // The print rendering. Same content again, paginated: a title page, a
  // contents page, then one part per page break, so it can be read on a
  // tablet at the table or printed and kept beside the books.
  pdf: "./tutorial.pdf",
  pdfNote: "A PDF of the whole guide, paginated for reading away from the app or for printing.",
  // Where the app itself is deployed. A printed page cannot follow a relative
  // link, so the print rendering states the address instead of hiding it.
  site: "https://arti47.github.io/pum-sum-gum/",
  licence: "Plot Unfolding Machine, Scene Unfolding Machine and Game Unfolding Machine are by JeansenVaars, licensed CC BY-NC-SA 4.0. This guide quotes individual table rows to make its examples checkable against your own copy, and is shared under the same licence.",
};

// --- the fast path: playable tonight ---------------------------------------
export const QUICK_START = [
  {
    title: "1 · Prepare a game",
    why: "PUM asks for a little preparation so your head is in the right creative context before you start. Four steps: a universe, a plot scope, your protagonists, and a plot sheet.",
    act: "More → Home → Prepare a game. Name the world you want to play in, then say in one line what this thread is about — that is your plot scope.",
    to: { label: "Prepare a game", go: ["wizard"] },
  },
  {
    title: "2 · Choose a plot sheet, and understand what you chose",
    why: "The sheet is a pacing decision, not a theme. Its track length says how many beats stand between you and this thread resolving — more boxes means more of the universe pushing back.",
    act: "Standard (11 boxes) is the book's recommendation for a first game. Scenes and Dungeon give you one beat per scene or per room. Sandbox has no track at all.",
  },
  {
    title: "3 · Write a few plot nodes",
    why: "Plot nodes are your game's own content. When a random prompt says 'handle a potential problem', it rolls on the list you wrote — so a blank list makes the prompts generic.",
    act: "Three or four entries per list is plenty. Empty slots are not a failure: they are an invitation to invent, and whatever you invent becomes a permanent entry.",
    to: { label: "Plot nodes", go: ["play", "nodes"] },
  },
  {
    title: "4 · Decide the starting point",
    why: "The book asks you to decide where the game opens and what is introduced there. It suggests in medias res — a battle, a shock — so your characters must act immediately.",
    act: "Write it on the plot sheet. The Home screen keeps asking until you do, because a game that never opens never starts.",
  },
  {
    title: "5 · Open a scene",
    why: "SUM's scene opener exists for the moment you know a scene should happen but not how it begins. It is a d20 that tells you what to describe first.",
    act: "Scene → Roll a scene opener. If you already know how it opens, use 'Open it myself' — you never have to roll.",
    to: { label: "Scene arc", go: ["scene", "arc"] },
  },
  {
    title: "6 · Roleplay, and ask when you don't know",
    why: "Most of your time is state one: playing your characters. The oracles are for the moments you genuinely don't know, or would rather not decide.",
    act: "Oracles → Yes or No. Pick the register that matches who is answering. Keep it to one or two questions per matter.",
    to: { label: "Oracles", go: ["oracles", "yesno"] },
  },
  {
    title: "7 · Bias: two different rules, kept apart",
    why: "PUM's bias hands the choice to you: roll twice, pick the answer that fits. SUM's Rule of Bias is mechanical: roll twice, keep the lowest if you expect good and the highest if you expect trouble.",
    act: "On a PUM Yes/No the app shows both answers and waits for your tap. On a SUM table it keeps the die for you and marks the one it kept.",
  },
  {
    title: "8 · Call a plot beat",
    why: "This is the machine. A modified proposal twists an idea you already have; a random prompt tells you what happens when you don't have one.",
    act: "Play → the pinned button rolls a random prompt; the smaller one rolls a proposal. Then play the answer out for a while before deciding anything.",
    to: { label: "Plot sheet", go: ["play", "track"] },
  },
  {
    title: "9 · Confirm the beat — or don't",
    why: "Calling a beat authorises you to cross a box; it does not oblige you. Cross one only once the outcome turned out to matter.",
    act: "Confirm — cross a box, or Not this time. Both are journalled. The track in the header is the honest answer to 'how close is this to over?'",
  },
  {
    title: "10 · Close the scene",
    why: "SUM's closure asks how the world responds — fortunately or unfortunately — and hands you the hook into what comes next.",
    act: "Scene → Roll a scene closure. You get a summary of what changed, and a one-step undo if you closed it by mistake.",
    to: { label: "Scene arc", go: ["scene", "arc"] },
  },
  {
    title: "11 · Read it back",
    why: "Every roll landed in the journal with its dice, so you can re-derive any result later — and the Dice view counts every face, so you can check the app instead of arguing with it.",
    act: "Journal. Add your own entries too; that is where the story you are telling actually lives.",
    to: { label: "Journal", go: ["journal", "entries"] },
  },
];

// --- Part 1: learning it in the order you will meet it ---------------------
const WALKTHROUGH = [
  {
    id: "machines",
    title: "The three machines, and which one you are using",
    blocks: [
      { p: "Three books, three jobs. Confusing them is the commonest way to get stuck, so it is worth ten seconds now." },
      { bullets: [
        "PUM — Plot Unfolding Machine. Manages the plot: what happens next, and how close this thread is to finishing. This is the game.",
        "SUM — Scene Unfolding Machine. A supplement. Once PUM says a beat happens, SUM tells you what the scene offers, how the fight goes, and how the people in it behave.",
        "GUM — Game Unfolding Machine. Prep. Worlds, factions, objects, a nemesis, characters as concepts. Use it before you play, and when a blank field stops you mid-play.",
      ] },
      { note: "The division that matters: GUM creates a character as a concept — an archetype, an edge, a flaw. SUM decides how that character behaves when you actually meet them. If you find yourself asking 'what is this person like', you want SUM. If you are asking 'who even is this person', you want GUM." },
      { p: "None of the three resolves a task. No book here tells you whether you picked the lock, hit the guard, or convinced the magistrate. Bring your own RPG's rules for that, or simply decide. The app will never report success or failure — it reports what the world offers." },
      { ref: "PUM p.2 · SUM p.3 · GUM p.3" },
    ],
  },
  {
    id: "prep",
    title: "Preparing a game — the five steps, field by field",
    blocks: [
      { tap: "More → Home → Prepare a game" },
      { p: "The wizard will not let you past a step whose answer it needs. When the pinned button is greyed out, the line beside it says which answer is missing — 'Name the game to continue', and so on. Steps you have already satisfied stay tappable in the row of step pills, so you can go back and change anything." },

      { p: "Step 1 · Universe. Four fields, and only the first is required." },
      { bullets: [
        "Name this game — a label for your library. 'The Neverwinter road'.",
        "Universe or RPG — which game or fiction you are playing in. 'D&D 5e', 'Blade Runner', 'my own'. This is the one field in the app with no inspiration roll: GUM generates worlds, but not the names of published ones.",
        "World, tone and theme — 'grim frontier fantasy, low magic'. Mystery or horror? Social or action? Narrow it down; the book asks you to.",
        "Inspiration — artbooks, films, lore, tarot. Anything you intend to draw on.",
      ] },

      { p: "Step 2 · Scope. A plot scope is one storyline with an end in sight — the thread this plot sheet is about, not the whole campaign. 'Find out who burned the caravan' is a scope. 'Become king' is a campaign." },
      { p: "This step asks two things about it, and they are not the same thing. The NAME is a short label — a handle of two to six words, which you will read at the top of every screen while you play. The MISSION is the paragraph underneath it: the situation you are starting in, and what your protagonists want out of it. 'Find out who burned the caravan' is a name; 'Caravans on the Triboar Trail keep burning, and a merchant house has hired the party to find out who is behind it' is a mission." },
      { bullets: [
        "Plot scope name — required.",
        "Mission — a pitch for the situation you start in, and the PCs' initial goals.",
        "Starting point — where this opens and what is introduced there. Optional now; the Home screen keeps asking until it is written.",
      ] },
      { note: "The mission field's inspiration block is GUM's plot seed exactly — a hook, a motivation, a mission, a lead, a caveat and the opposition. Open it and tap 'All 6 tables' and you have rolled the book's own six-table combination without leaving the field." },

      { p: "Step 3 · Protagonists. Your PCs are your eyes and ears. You are in full control of their thoughts, voice and actions — PUM never rolls for them, ever. At least one is required. The name is yours; the notes field beside it is where a rolled GUM archetype lands, because a concept does not belong in a name box." },

      { p: "Step 4 · Sheet. Ten plot sheets, each a pacing decision. The card shows the track drawn to scale, the box count, how many node slots it gives you, and whether it reaches the extension lists. Only Standard is shown at first, because choosing between ten pacing structures is not a decision you can make before your first game — PUM p.3 says as much. Show all ten plot sheets opens the rest, and once you have chosen one it stays on screen beside Standard." },
      { table: { name: "The ten plot sheets", page: "PUM pp.14–23", head: ["Sheet", "Track", "Nodes"], rows: [
        ["Standard", "11 boxes · 3/5/3", "4 lists × 5"],
        ["Journey", "20 · 3/7/4/3/3", "6 lists × 10"],
        ["Story-focus", "20 · same five acts", "6 × 5 · prompts are all nodes"],
        ["Scenes", "10 · one per scene", "4 × 5"],
        ["Dungeon", "7 · one per room", "4 × 5"],
        ["Exploration", "11 · 1/3/3/3/1", "6 × 10"],
        ["Story-parts", "5 · one per part", "4 × 5"],
        ["Improvised", "no track", "no nodes"],
        ["Sandbox", "no track", "6 × 10"],
        ["Customized", "you build it", "6 × 10 · you write the prompt column"],
      ] }, inApp: true },
      { warn: "More boxes is not 'better'. It is longer. Eleven boxes is a night or two; twenty is a campaign arc. Pick the one whose length matches the story you actually want to tell." },

      { p: "Step 5 · Nodes. Plot nodes are your game's own content — the things a random prompt reaches into. Each list shows three slots and an 'Add another slot' control; the rest exist on the plot sheet and appear as you fill them. Three or four entries per list is plenty to start." },
      { note: "A blank list is not broken. When a prompt lands on an empty slot the app offers you three things — add something new, choose an entry that fits, or reroll — and whatever you invent becomes a permanent entry in that list. The lists are meant to grow in play. This is why prep does not demand sixty boxes of content before you have played a minute." },
      { p: "On a sheet that pairs with the plot-node extension sheet (Journey, Story-focus, Exploration, Sandbox, Customized), a further card offers to name a list of your own: factions, rumours, omens, debts owed. Name it and it comes into being with the same ten slots and the same die rule." },
      { ref: "PUM p.3 · p.27 · p.28" },
    ],
  },
  {
    id: "sheet",
    title: "The plot sheet — what you are looking at",
    blocks: [
      { tap: "Play → Plot track" },
      { p: "This is the screen you will spend most of your time on. Top to bottom:" },
      { bullets: [
        "The persistent plot header, above everything, on every in-play screen: the scope's name, the section you are in, and the crossed/total count. This is the honest answer to 'how close is this to over?' and it is why it never scrolls away.",
        "This scope — a fold holding your mission, starting point and game notes. Context you re-read occasionally, not every beat.",
        "1 · Call a plot beat — the two beat controls, and the last beat you rolled.",
        "2 · Cross a box — the track itself, plus what the current section is for.",
        "What now — the book's own loop (PUM p.5), with the next step offered in place so you are not driving the game from the tab bar.",
        "3 · When to call which — the p.28 cheat sheet, folded.",
      ] },
      { p: "The pinned bar at the foot carries the primary action — Random prompt — with Proposal beside it, and the track position as its context line. Those two are the same actions the card above spells out; the card explains them, the bar performs them." },
    ],
  },
  {
    id: "scene-open",
    title: "Opening a scene",
    blocks: [
      { tap: "Scene → Scene arc → Roll a scene opener" },
      { p: "SUM's opener is for the exact moment you know a scene should happen but not how it starts. It is a d20 that tells you what to describe first." },
      { roll: { what: "Scene opener", die: "d20", value: 14, result: "Describe a sensory effect — smells, sounds, or feeling", page: "SUM p.4",
        then: "So the scene does not open on the door, or the guard, or the plan. It opens on the smell of wet ash in the stairwell. What the opener is doing is stopping you writing the same establishing shot every time." } },
      { p: "You never have to roll. 'Open it myself' takes a line of your own and opens the scene with it. Both routes write a journal entry and both put the scene into the open state, which lights a dot on the Scene tab and changes what the plot sheet's 'What now' card suggests." },
      { note: "Why the app makes you open a scene at all, when the books have no such requirement: an open scene is what an intervention check interrupts and what a closure closes. It is a container, not a rule. Nothing forces you to use it — you can play beats and oracles all night without opening one." },
    ],
  },
  {
    id: "oracles",
    title: "Asking the oracles",
    blocks: [
      { tap: "Oracles" },
      { p: "Two moments deserve an oracle: when you genuinely do not know, and when you would rather not decide. Avoid rolling if you already have a strong bias toward an answer, or if some outcome would leave you stuck. One or two questions per matter — more than that slows the pace and produces contradictions." },
      { ref: "PUM p.10" },
      { p: "The question field at the top of the tab is optional but worth using: whatever you type is stamped on the result card and into the journal, so an answer never floats free of what it answered." },

      { p: "Yes or No — 1d10. Three registers, and picking the right one is most of the skill:" },
      { bullets: [
        "Deterministic — the universe answering objectively. 'Is the bridge intact?'",
        "Subjective — a character's own view, which may answer 'don't know'. 'Does Vera think the captain is lying?'",
        "Conversation — a non-protagonist replying to you in dialogue. 'Will you take us across?'",
      ] },
      { table: { name: "Yes/No · Deterministic", page: "PUM p.12", head: ["d10", "Answer"], rows: [
        ["1", "Strong no"], ["2–4", "No"], ["5", "Weak no"], ["6", "Weak yes"], ["7–9", "Yes"], ["10", "Strong yes"],
      ] }, inApp: true },
      { roll: { what: "Yes or No · conversation", die: "d10", value: 8, result: "Yes, be careful", page: "PUM p.12",
        then: "Note what the Conversation register gives you that Deterministic never would: not just assent, but a warning attached to it. The ferryman will take you — and he is telling you something about the crossing. That rider is the answer, not decoration." } },
      { p: "Tick 'I have a bias' and the app rolls twice and shows you both answers as chips, committing neither until you tap one. That is PUM's bias rule and it deliberately hands the choice to you." },

      { p: "Descriptive oracles — Someone, Place, Object, Hazard, Mood, Notice. 1d10 for the answer, plus a d100 Description word to colour it." },
      { roll: { what: "Someone", die: "d10", value: 6, result: "Someone who knows the area", page: "PUM p.12",
        then: "enriched with Description d100 = 33, 'futuristic / far'. Read the pair, not the first line: a local guide who is somehow out of place — too well-equipped, or from much further away than they admit." } },
      { p: "Story oracles — Discovery, Problem, Intent, Activity, Reason, Explain. Same shape, enriched with a Focus word instead." },
      { p: "Quantifiers — how many, how good, how hard. Set a baseline in your head before rolling, because the table answers relative to it. Four faces in ten are 'as expected': most of the time the world is unremarkable, and that is deliberate." },
      { p: "Granular Yes or No — the d100 variant. Declare a likelihood first — no way, hardly, unlikely, neutral, likely, surely, certain — and the roll is read against that column. Use it when the odds genuinely are not even and you want the dice to know that." },

      { p: "Until you confirm the first beat of a game, the plot sheet carries one line above the beat card: roll a beat, say out loud what it means, and only then confirm it. It goes for good once a box is crossed — there is nothing to dismiss." },
      { p: "Every result card carries Re-roll, Note it and Dismiss. Re-rolling is not cheating; the book says so explicitly. Both rolls stay in the journal, linked, so the record remains honest." },
      { p: "A descriptive or story answer that arrived without its d100 word also carries Enrich it, which rolls the Description or Focus word for that answer alone and adds it to the same journal entry. You only see it if you switched the enrichment off in Settings — the book rolls it every time, so on it stays by default." },
      { ref: "PUM p.8" },
      { p: "After any Yes/No answer the card also offers 'It said yes — random prompt' and 'It said no — modified proposal'. Two of the p.28 triggers are answers rather than situations, and the app cannot know which question you asked — so it offers both and fires neither." },
    ],
  },
  {
    id: "beats",
    title: "Calling a plot beat",
    blocks: [
      { p: "A beat is the moment you stop deciding and let the machine decide. You will feel resistance to this the first few times. That resistance is the point." },
      { p: "Two kinds, both 1d10:" },
      { bullets: [
        "Modified proposal — you have an idea what happens next, and the table twists it.",
        "Random prompt — you do not have an idea, and the sheet's own column tells you what the story reaches for.",
      ] },
      { table: { name: "Modified proposals", page: "PUM p.14", head: ["d10", "Result"], rows: [
        ["1", "Increase the intensity and tension"], ["2", "Bring someone quite inconvenient"],
        ["3", "Add some trouble, or bad news"], ["4", "Make the location less favorable"],
        ["5", "Cause frustration, stress, or worry"], ["6", "Cause confusion, doubts, disarray"],
        ["7", "Make the location more favorable"], ["8", "Add some reward, or good news"],
        ["9", "Bring someone quite convenient"], ["10", "Decrease the intensity and tension"],
      ] }, inApp: true },
      { note: "The column is symmetric: 1–5 push against the PCs, 6–10 favour them. It is not a punishment table. The beat card also names the kind of modification that came up — location, emotion, an added element, someone arriving, intensity — and explains what the book means by it, because 'Bring someone quite inconvenient' is a category, not a person." },
      { roll: { what: "Modified proposal", die: "d10", value: 2, result: "Bring someone quite inconvenient", page: "PUM p.14",
        then: "You had already decided the party would bribe the gate sergeant. The proposal does not cancel that — it adds someone to it. The sergeant's superior is standing there. Use the Someone or Intent oracle if you need to know who they are." } },

      { p: "A random prompt rolls the ten faces your plot sheet prints. Some faces are ABCD random events; some invoke one of your plot node lists. Either way the app rolls the second die for you and shows both." },
      { roll: { what: "Random prompt", die: "d10", value: 3, result: "Deal with a difficult challenge", page: "PUM p.14",
        then: "That is an ABCD face, so a second d10 rolls on table C — Challenge — and comes up 9: 'A locked door, object, or path'. The book's advice on C is to let the kind of challenge inspire the whole situation, and to think of a reward." } },
      { p: "When a prompt invokes a node list, the die size depends on how full the list is: 1d10 while fewer than half the slots are filled, 1d20 from the halfway entry on. The pill above each list tells you which the app is about to roll." },
      { p: "Land on a written entry and it comes into play. Land on an empty slot and you get four controls, which are four permissions the book grants:" },
      { bullets: [
        "Add new — invent something. It becomes a permanent entry in that list.",
        "Choose — pick an entry that fits better than the one the die found.",
        "Reroll — try the die again.",
        "Leave it to destiny — reroll until a written entry comes up. This is the 'still stuck' rule, and it can never hand you an empty slot back.",
      ] },
      { ref: "PUM p.6" },
      { warn: "On an all-in-one sheet, faces 5 and 6 reach for a notable character and an interesting location — lists that sheet does not print. The app says so and offers to bring one in, recall one from your cast, or roll one from GUM. It does not quietly roll on a list you cannot see." },
      { p: "If a beat repeats the last one, the card flags it and offers a re-roll. Flagged, never forced: sometimes a repeat is exactly right." },
    ],
  },
];

WALKTHROUGH.push(
  {
    id: "confirm",
    title: "Confirming a beat, and the track",
    blocks: [
      { p: "Calling a beat authorises you to cross a box. It does not oblige you to. Play the answer out in the fiction first — for minutes, not seconds — and cross a box only if the outcome turned out to matter to the bigger picture." },
      { ref: "PUM p.7" },
      { bullets: [
        "Confirm — cross a box. The box crosses, the header updates, the journal records it.",
        "Not this time — the beat is journalled as played, and the track stays where it is.",
        "Re-roll — try again.",
        "Add a note — write what actually happened onto the beat's journal entry.",
      ] },
      { note: "This is the single rule most likely to be skipped by someone used to progress clocks that tick automatically. The track is a compass against endless wandering, not a clock. If every beat crossed a box, the length of your story would be decided by how often you happened to roll, not by what happened." },
      { p: "The track card also carries three permissions the book grants and the app therefore makes controls, not sentences:" },
      { bullets: [
        "Advance without a beat — when an event was exceptionally impactful. The journal records that it was voluntary.",
        "Step back — undo a crossing.",
        "End this scope — a scope ends when you say it ends. On Sandbox and Improvised, which have no track, this is the only way one can ever finish. Reversible; nothing is deleted.",
      ] },
      { p: "Tap any box to mark a timed plot beat: an event you know is coming — a siege, a horde, an awakening. When play reaches that box it fires once, and counts as a random prompt. You still do not know the circumstances, so it can still surprise you." },
      { p: "Fill the last box and the scope has resolved. That is the Threshold the whole sheet is built around, and the app says so with a dialog rather than a quiet colour change." },
    ],
  },
  {
    id: "nodes-live",
    title: "Plot nodes in play",
    blocks: [
      { tap: "Play → Plot nodes" },
      { p: "Each list shows its first four written entries plus one empty slot, with 'Show all N slots' when you want the rest — it says how many written entries are still hidden. Nothing is out of reach either way: the die rolls across every slot, and 'Roll this list' can land on an entry you cannot currently see. The header carries the die the app will roll and how full the list is." },
      { bullets: [
        "Tap a slot to write, rewrite or clear it. Every text field here can roll three context-matched GUM words for inspiration.",
        "Invoke — on a written entry, brings it in deliberately as a beat, no die rolled. PUM p.9 allows this and says it counts as a beat for advancing the track.",
        "Roll this list — the other half of the same permission: you pick the list on purpose, the die picks the entry.",
        "Rename / Remove — on a list of your own. Removing it deletes its entries and any prompt face pointing at it falls back to the printed column.",
      ] },
      { note: "Deliberate invocation is how you steer without cheating. Travelling? Reach for world elements. Time for a confrontation? Reach for potential problems. The PCs have earned an answer? Reach for pending questions. You are choosing the category; the die still chooses the entry, and it still costs you a beat." },
      { ref: "PUM p.9" },
    ],
  },
  {
    id: "cast",
    title: "The cast, and SUM's character emulation",
    blocks: [
      { tap: "Play → Cast" },
      { p: "Three groups: your protagonists, notable characters, and interesting locations. Protagonists are yours entirely and nothing rolls for them. The other two are everyone and everywhere the story has actually met." },
      { p: "Open any character and SUM's twelve character tables are there, in four depths of acquaintance. Roll only the depth the scene has actually reached — you do not ask about someone's deep backstory the moment you meet them." },
      { bullets: [
        "First contact (p.8) — Meet reaction, Outside looks, Filler talks.",
        "Shallow interaction (p.9) — Personality type, Recent anecdote, Job or profession.",
        "Trust conversation (p.10) — Opinion or answer, Honesty check, Plot contribution.",
        "Deep relationship (p.11) — Parallel matters, Lingering backstories, Bonding relations.",
      ] },
      { roll: { what: "Meet reaction", die: "d20", value: 17, result: "Ignore you intentionally, avoiding any interaction", page: "SUM p.8",
        then: "Rolled from the person's own entry, so it is stored with them: next session the app still knows the archivist blanked you. That is the difference between rolling on the Scene tab and rolling from the cast — same table, but one result is attached to somebody." } },
      { note: "Every SUM table is ordered so low rolls favour your protagonists and high rolls bring trouble. That ordering is what makes the Rule of Bias work, and it is why 17 above is a cold reception rather than a warm one." },
      { p: "'Add to plot nodes' writes a cast member into the matching node list. Until a name sits in a list, a random prompt can never reach them — the cast is a record, the node lists are what the machine rolls on." },
    ],
  },
  {
    id: "scene-run",
    title: "Running and closing the scene",
    blocks: [
      { tap: "Scene → Scene arc" },
      { p: "Intervention check — roll it when the PCs are taking too long, tension is high, danger is near, or silence lingers. It is a d100, and it is SUM asking whether the world does something while you deliberate." },
      { roll: { what: "Intervention check", die: "d100", value: 40, result: "Places an element of interest behind a challenge", page: "SUM p.4",
        then: "Not an attack. The thing they want is now on the far side of something — which is more useful than another fight, and is the sort of answer you would not have written yourself at 11pm." } },
      { p: "The Rule of Bias sits above the roll: Neutral rolls once, Favourable rolls twice and keeps the lowest, Trouble rolls twice and keeps the highest. Declare it before you roll. The result card shows both dice and marks the one it kept." },
      { warn: "This is not PUM's bias rule. PUM's hands you both answers and lets you choose; SUM's keeps the die for you according to what you declared. The app implements them separately and deliberately — conflating them would hand your authorship to the machine." },
      { p: "Scene closure — a d20 asking how the world responds, fortunately or unfortunately, and handing you the hook into what comes next. Closing summarises what changed: how long the scene ran, how many interventions fired, what was written. One Undo puts the whole thing back." },
      { roll: { what: "Scene closure", die: "d20", value: 18, result: "That was a bad move — now things get much harder", page: "SUM p.4",
        then: "High roll, so trouble — the ordering again. Close on this and you know what the next scene opens into, which is exactly what a closure is for." } },
      { p: "The Scene tab also carries SUM's situation tables, three to a screen: Exploration (location features, core challenge, challenge conditions), Battle (terrain, enemy tactics, enemy composition), Discovery (type of clue, revealing finding, opposition activity). Each screen pins its first table as the primary action, and every table can be opened in full to read." },
    ],
  },
  {
    id: "journal",
    title: "The journal and the dice record",
    blocks: [
      { tap: "Journal" },
      { p: "Every roll the app makes lands here with its dice, so any result can be re-derived later. Thirteen filters cover every kind of entry the app writes. Entries page twenty at a time and cap at five hundred." },
      { bullets: [
        "Write an entry — your own narration. This is where the story you are telling actually lives.",
        "Session break — a bookmark for where you stopped. Neither book defines a session procedure, so nothing is reset or rolled; the app does not invent one.",
        "Per entry, behind Edit — add or change a note, or delete the entry.",
      ] },
      { p: "The Dice view counts every face the app has rolled in this game, grouped by die size, with d100 bucketed into tens. Digital dice are only worth trusting if you can check them; the app uses the browser's cryptographic random source, never Math.random." },
      { note: "One exception is stated on the screen rather than hidden: an inspiration roll beside a text field is only recorded when you keep a word from it. Words rolled and discarded are not counted, so that chart is a record of the dice you used." },
    ],
  },
  {
    id: "forge",
    title: "The Forge — GUM's generators",
    blocks: [
      { tap: "More → Forge" },
      { p: "Forty-three tables in four sections, for prep and for the moment a blank stops you." },
      { bullets: [
        "Plot seed — GUM's own six-table combination in the book's order: a hook, a motivation, a mission, the first lead, a caveat, and the opposition. Plus World truths: where this happens and what is already wrong there.",
        "World — factions, locations, objects, a nemesis, creatures. Eighteen tables.",
        "Characters — archetypes, edges, flaws, purposes, deeds. Fourteen tables.",
        "Grand oracle — an action, an adjective and a subject, for when nothing specific fits.",
      ] },
      { roll: { what: "Plot seed", die: "6 × d20", value: 0, result: "hook 6 · motivation 13 · mission 9 · lead 4 · caveat 11 · opposition 17", page: "GUM pp.6–7",
        then: "Reading them together: a formal request or royal mandate (6) to destroy an objective (9), driven by the wish to trigger a drastic world-changing element (13); there is a source of information nearby (4); too many uncertainties, stay low profile (11); and you have a friend or family on their side (17). That last one is what makes it a story rather than a job." } },
      { note: "GUM's stated method is combination — roll several tables for one subject, or the same table twice, and read the results as one thing. Every group offers 'Roll all of it' for exactly that reason. A single row is rarely the point." },
      { p: "'Keep it →' is what stops a good roll evaporating. Write it into any plot node list, add it as a protagonist or a cast entry, keep it in the journal — or, folded under 'Into this game's setting or plot sheet', add it to the universe, the tone, the game's inspiration, the plot sheet's mission, the starting point, or the game notes. Everything appends; nothing replaces what you already wrote." },
      { p: "With no game open — which is when a plot seed is most useful, since GUM is a prep tool — 'Prepare a game with this' carries the roll into the wizard, where it is offered against every field on the step that owns it. Rolling six tables and then retyping them by hand was the gap this closes." },
    ],
  },
  {
    id: "inspire",
    title: "Three words beside a blank",
    blocks: [
      { p: "Every text field the app can serve carries a collapsed line: 'Stuck? Roll three words'. Open it and three GUM tables roll, chosen by what the field is for — a character field pulls archetypes and flaws, a location field pulls features and purpose, the mission field pulls the whole plot seed." },
      { bullets: [
        "Each word is a chip that appends to what you have written. It never replaces it.",
        "Roll again rotates through the field's tables, so extras are not wasted.",
        "All N tables rolls the whole mapped set at once.",
        "Nothing rolls until you open the block — the books ask you not to roll when you already know.",
      ] },
      { warn: "Eight fields deliberately offer nothing, and Rules → 'Where the app does not roll' lists them with reasons. Every GUM row is a phrase about fiction, which is the wrong shape for a proper name or a real-world answer. A table pointed at the wrong question reads as noise." },
    ],
  },
  {
    id: "settings",
    title: "Settings, your data, and the library",
    blocks: [
      { tap: "More → Settings" },
      { p: "Your data. Everything lives in this browser's local storage and nothing is sent anywhere." },
      { bullets: [
        "Export JSON — the complete state, as text you can copy or download.",
        "Import JSON — replaces everything on this device. Export first.",
        "Export readable — a Markdown summary of the current game: protagonists, each plot sheet, its nodes, and the journal.",
        "Check my data — re-runs normalisation and reports what, if anything, needed repair.",
        "Undo — the last twenty actions, most recent first. You will rarely need it here: every mutating action raises a toast with its own Undo button.",
      ] },
      { p: "Optional rules." },
      { bullets: [
        "Disruption die — off by default, because PUM presents it as a variant. A d10 rides along with every oracle answer except quantifiers, Description and Focus: on a 1 a random prompt interrupts, on a 2 a proposal alters the scene. Read your answer first, then resolve the disruption.",
        "Volatile situation — widens the proposal range from 2 to 2–5. A 1 remains the only face for a prompt.",
        "GUM — on by default. Turn it off and the Forge section and every inspiration block disappear.",
        "Enrich descriptive and story oracles — on, because the books make it the default. With it off, a descriptive or story answer carries Enrich it instead.",
        "Show the \u201cWhat this does\u201d notes expanded — on for a new player. Every screen carries a short note saying what it is for; they start open, and collapse everywhere for good the first time you close one. This brings them back.",
      ] },
      { p: "Appearance: theme follows the system unless you override it, and a text-size slider runs 85% to 140%. Pinch-zoom is locked so a stray gesture cannot disturb a roll; the slider is what pays that back." },
      { p: "The library. One game holds many plot sheets — one per scope — and finished ones stay as a record. Home lets you switch scope, edit or delete one, add a new one, switch or archive whole games, and prepare another." },
      { warn: "Danger zone, at the foot of Settings and out of the thumb's resting arc: Delete the current game, and Erase everything. Both confirm and both name exactly what is lost." },
    ],
  },
);

// --- Part 2: four scenarios, one per structural class ----------------------
const SCENARIOS = [
  {
    id: "vault",
    title: "Scenario A · “The Sunken Vault” — Dungeon sheet, dark fantasy",
    blocks: [
      { p: "Seven boxes, one per room. Four node lists of five slots each. No extension lists, which is the interesting part: this sheet's prompt column still reaches for a notable character and an interesting location, and has no list for either." },

      { p: "Prep. Universe: “Dolmenwood-ish folk horror, no high magic.” Scope: “Reach the reliquary before the flood does.” Starting point, written in medias res: “Waist-deep in the entry stair, the water still rising, the door above already jammed.”" },
      { p: "Four lists, three entries each — enough. Game or world elements: the flood is on a timer · lantern oil runs out · the vault answers to old vows. Potential problems: something is already down here · the stair is the only way out · Brother Aldo is lying. Useful findings: a dry ledger page · the sluice key · Aldo's rope. Pending questions: who broke the sluice? · is the reliquary still sealed?" },

      { p: "Scene one. Opener rolled rather than written, because you know a scene starts here but not how:" },
      { roll: { what: "Scene opener", die: "d20", value: 14, result: "Describe a sensory effect — smells, sounds, or feeling", page: "SUM p.4",
        then: "Cold to the sternum, and the sound of the water finding a new way in somewhere below you. Not the doorway you would have described." } },
      { p: "You explore. On the Scene tab, Exploration gives three tables; declare Trouble first, because you expect this place to be hostile — that is SUM's Rule of Bias, and it keeps the higher of two d20s." },
      { roll: { what: "Location features · bias high", die: "2d20 → 12", result: "Being watched or protected by an unseen entity", page: "SUM p.5",
        then: "Something is already down here — which is a node you wrote, arriving without a prompt asking for it. That is allowed and common: SUM's tables and PUM's nodes will agree with each other more often than chance suggests, because you wrote the nodes about this place." } },

      { p: "First beat. You do not know what happens next, so: a random prompt." },
      { roll: { what: "Random prompt", die: "d10", value: 3, result: "Deal with a difficult challenge", page: "PUM p.14",
        then: "ABCD table C, second d10 = 9: “A locked door, object, or path”. The book says to let the kind of challenge inspire the whole situation and to think of a reward." } },
      { p: "The reliquary door is sealed by a vow, not a lock — and the reward for solving it is the sluice key, which is on your findings list. You play that out for ten minutes of narration. It mattered. Confirm — cross a box. 1/7." },

      { p: "Second beat, and the awkward one. Prompt face 5:" },
      { roll: { what: "Random prompt", die: "d10", value: 5, result: "Meet or recall a notable character", page: "PUM p.14",
        then: "This sheet prints no notable-characters list. The app says so plainly and offers three things: bring one in, recall one from the cast, or roll one from GUM. It does not roll on a list you cannot see." } },
      { p: "You take “roll one from GUM” and get archetype 42, “Dark Jester: A joker hiding dark intentions in sarcasm”. Sixty metres down, in a flooding vault, in folk horror. A joker." },
      { note: "This is the moment the book's advice chapter exists for. PUM p.10: re-roll for a better fit, or downplay it, or go with whatever came to mind first whether or not it matches. What came to mind first was Brother Aldo — already on your problems list as a liar — and the realisation that his lying is not fear. He is enjoying this. The roll did not describe a new person; it re-described one you already had. Kept, named him in the cast, notes carry the archetype." },
      { p: "Confirm. 2/7." },

      { p: "Ask an oracle rather than a beat. Conversation register, because Aldo is answering you: “Do you know how the sluice broke?”" },
      { roll: { what: "Yes or No · conversation", die: "d10", value: 8, result: "Yes, be careful", page: "PUM p.12",
        then: "He does know, and the register tells you he is warning you as he says it. The card also offers “It said yes — random prompt”, which is one of the p.28 triggers. You decline it; one beat per interesting moment is plenty." } },

      { p: "Before the last room, mark a timed beat. Tap box 7 — “Way out” — and write “the stair collapses”. It will fire once when you reach it, and it counts as a random prompt. You still do not know the circumstances." },
      { p: "Close the scene. Bias left at Trouble:" },
      { roll: { what: "Scene closure", die: "2d20 → 18", result: "That was a bad move — now things get much harder", page: "SUM p.4",
        then: "The summary names what changed: how long the scene ran, how many intervention checks fired, and the two journal entries written. Undo is right there if you closed it by accident." } },
      { p: "Functions this scenario used: prep wizard all five steps · Dungeon sheet · four node lists · scene opener · SUM exploration with bias · random prompt · ABCD · unavailable-list handling · GUM inspiration · cast · Yes/No conversation register · beat trigger offered and declined · confirm · timed beat · scene closure · journal." },
    ],
  },
  {
    id: "ceres",
    title: "Scenario B · “Nine Hours to Ceres” — Journey sheet, sci-fi mystery",
    blocks: [
      { p: "Twenty boxes over five acts. Six node lists of ten slots each, because this sheet pairs with the plot-node extension sheet — so notable characters and interesting locations are real lists here, and you can name two more of your own." },

      { p: "Prep. Universe: “hard-ish SF, one ship, no FTL.” Scope: “Find out who killed the ship's doctor before we dock.” Mission seeded from GUM's plot seed, rolled from the mission field's own inspiration block — hook 6 “Formal request, a petition, royal mandate”, caveat 11 “Too many uncertainties, stay low profile”. A company mandate to investigate quietly. That is the whole premise in two rows." },
      { p: "In prep you name a list of your own: “Ship systems.” Entries: the recycler is failing · comms are logged · the medbay locks from inside. This is the p.27 blank list, and it is the one your Random Prompt column will keep reaching for on a ship." },
      { p: "Settings → Optional rules → Disruption die ON. This mystery wants the machine to interrupt you." },

      { p: "The node die. Your characters list has four entries out of ten, so the pill above it reads 1d10 — fewer than half filled, so the die only reaches the first five slots. Write two more and it becomes 1d20 and reaches all ten." },
      { note: "This trips people. It is not the app rationing your content: a d10 maps to five slots and a d20 to ten, so rolling a d20 on a mostly-empty list would point past the end of what you have written more often than not." },
      { ref: "PUM p.25" },

      { p: "Mid-investigation, an oracle rather than a beat — and the disruption die is on, so it rides along." },
      { roll: { what: "Granular Yes/No · deterministic · unlikely", die: "d100", value: 62, result: "No", page: "PUM p.24",
        then: "You declared it unlikely that the doctor's terminal was wiped remotely, and the d100 read against that column agrees. Then the disruption strip: the d10 came up 1, which is always and only a random prompt. Read your answer first, the book says, then resolve the disruption." } },
      { p: "The disruption's prompt lands on face 7, “Reflect a world or game element”, which rolls your world list and finds “the recycler is failing”. The lights brown out mid-interview. You did not choose that; you asked an unrelated question and the machine put a hand on the table." },

      { p: "Someone to interview. Open them from the cast so the answers stay attached to them, and roll only the depth this scene has reached — first contact, not deep relationship." },
      { roll: { what: "Meet reaction", die: "d20", value: 4, result: "Act with motivation, high energy, full engagement", page: "SUM p.8" } },
      { roll: { what: "Outside looks", die: "d20", value: 11, result: "Know what they're talking about — educated, informed", page: "SUM p.8",
        then: "Two low rolls: the ordering means the engineer is helpful and credible. Both are stored on her cast entry, so next session the app still knows." } },
      { p: "Later, once trust exists, the Trust depth:" },
      { roll: { what: "Honesty check", die: "d20", value: 16, result: "It's clear they aren't telling the real truth at all", page: "SUM p.10",
        then: "A high roll now, from the same person who read as credible at first contact. That is not a contradiction — it is the shape of a mystery, and it is why you roll the depth the scene has reached rather than everything at once." } },

      { p: "The awkward one. A beat, and it repeats:" },
      { roll: { what: "Modified proposal", die: "d10", value: 2, result: "Bring someone quite inconvenient", page: "PUM p.14",
        then: "Same as the previous beat. The card flags the repeat and offers a re-roll — flagged, never forced. You keep it, because a second inconvenient arrival in ten minutes is not repetition, it is a pattern: someone is steering people into your path. The re-roll was offered; declining it was the interesting move." } },
      { p: "Box 14 was marked at prep with “docking burn — no more free movement”. Confirming the beat that lands on it fires the timed beat once, in a dialog, and it counts as a random prompt." },
      { p: "Functions this scenario used: extension node lists · a player-named list · the 1d10/1d20 node die rule · disruption die and its cascade · granular oracle with a declared likelihood · SUM character emulation at two depths, stored on the cast · repeated-beat re-roll offered · timed beat firing · GUM plot seed via a field's inspiration block." },
    ],
  },
];

SCENARIOS.push(
  {
    id: "lodger",
    title: "Scenario C · “The Lodger” — Sandbox sheet, modern horror",
    blocks: [
      { p: "No track at all. Six node lists of ten. The Sandbox sheet is for playing open-endedly, and it is the sheet that makes one permission load-bearing: a scope ends when you say it ends, because there is no Threshold to reach." },

      { p: "Prep. Universe: “present day, one street, nothing supernatural is confirmed.” Scope: “Work out what is wrong with the man in the upstairs room.” World truths rolled in the Forge before prep, from GUM's seeding section:" },
      { roll: { what: "Location archetype", die: "d20", value: 12, result: "Outskirts: Remote town, village, ghost town, old farms, wasteland", page: "GUM p.4" } },
      { roll: { what: "Background problem", die: "d20", value: 7, result: "Punishment: Plague, curse, damnation, sickness, disease, we are helpless, we are dying", page: "GUM p.5",
        then: "Read together: a failing edge-of-town street where something is making people ill and nobody official is coming. “Keep it →” wrote both into the world-elements list so a prompt can reach them later." } },

      { p: "Because there is no track, the beat controls behave differently: the beat card offers “Played it” instead of “Confirm — cross a box”, since there is no box to cross. Everything else is the same. Beats still shape what happens; they just do not measure progress." },

      { p: "The awkward roll, and the useful lesson in it. You have built to a confrontation on the landing and you want the house to do something. Intervention check, bias Trouble:" },
      { roll: { what: "Intervention check · bias high", die: "2d100 → 5", result: "Remains silent — nothing really happens (peaceful)", page: "SUM p.4",
        then: "Both d100s came in low, so even keeping the higher one you got the quietest answer on the table, at the exact moment you wanted the loudest." } },
      { note: "The temptation is to re-roll until the house cooperates. The book's advice is the better read: nothing happens is an answer, and in horror it is frequently the answer. You stood on the landing and the house did not oblige you. The silence went on slightly too long. That is worse than a noise, and you did not write it — the dice declined to." },
      { ref: "PUM p.10 · SUM p.4" },

      { p: "The cast does the heavy lifting on this sheet. Four depths on the lodger, rolled over four sessions rather than four minutes:" },
      { roll: { what: "Personality type", die: "d20", value: 9, result: "Very focused, goal-oriented and driven to succeed", page: "SUM p.9" } },
      { roll: { what: "Parallel matters", die: "d20", value: 3, result: "Develop a skill that requires constant training", page: "SUM p.11",
        then: "Rolled only once the relationship had reached Deep. Together: he is not ill, he is training for something, and the discipline looks like symptoms. The tables did not decide that — reading two of them together did." } },

      { p: "Session breaks. Journal → Session break marks where you stopped. Neither book defines a session procedure, so nothing is reset, nothing is rolled, and the app does not invent a ritual for it. It is a bookmark, and on a sheet with no track it is the only chronological landmark you get." },

      { p: "Ending it. Eleven sessions in, the lodger's story is told. There is no box to fill, so: Play → Plot track → End this scope. The app asks you to confirm, records it in the journal, and offers to start another plot sheet. Reopen is one tap if you were wrong." },
      { warn: "On Sandbox and Improvised this control is the only way a scope can ever finish. Without it those two sheets would be the only ones you could never complete — which is why it is a control and not a sentence." },
      { p: "Functions this scenario used: Forge world truths and “Keep it →” into a node list · a trackless sheet · “Played it” in place of confirm · SUM intervention with bias · reading an unhelpful roll rather than re-rolling it · character emulation across all four depths · session breaks · ending a scope by declaration, and reopening." },
    ],
  },
  {
    id: "levy",
    title: "Scenario D · “The Winter Levy” — Customized sheet, historical",
    blocks: [
      { p: "The Customized sheet starts with nothing: no track, and the standard prompt column until you change it. You build both. Use it when you already know the shape of the story — a pre-written adventure, or history." },

      { p: "Prep. Universe: “England, 1069, no fantasy.” Scope: “Get the village through the levy without losing the men.” The Customized sheet gives six lists of ten, so both player-named lists are available; you name them “Obligations” and “Rumours from the north”." },

      { p: "Pre-drawing the track. Play → Plot track → Customize → Add a section. You know this story has three movements, so you draw them: “The summons” 2 boxes, “The march” 4, “The reckoning” 3. Nine boxes, built by you rather than chosen from a menu." },
      { bullets: [
        "+ box adds one to any section, mid-play, when a movement turns out to have more in it than you thought.",
        "Remove deletes a section; if you had crossed past it the track steps back to fit.",
        "Or add nothing at prep and grow the track as you play, which is the other half of the same permission.",
      ] },
      { ref: "PUM p.9" },

      { p: "Editing the prompt column. Customize → Edit the prompt column gives ten dropdowns, one per d10 face. The printed column spends four faces on ABCD random events; this story is about obligation, not incident, so you re-point three of them:" },
      { bullets: [
        "Faces 1–2: keep A Complication and B Catalyst.",
        "Face 3: → Obligations (your list).",
        "Face 4: → Rumours from the north (your list).",
        "Faces 5–10: unchanged — character, location, world, problem, finding, question.",
      ] },
      { note: "This is PUM's Plot Focus rule and it is the strongest tool in the book for making a machine feel like it is about your story. A social game points more faces at characters; a dungeon points more at challenges. The app rolls exactly what you put there, and “Reset to the standard column” puts the printed one back." },

      { p: "In play, the column bites immediately:" },
      { roll: { what: "Random prompt", die: "d10", value: 3, result: "Obligations", page: "your column",
        then: "Which rolls that list — four entries of ten, so 1d10 — and lands on slot 2: “the reeve is owed a horse”. A face that would have been a Challenge on the printed sheet is now a debt coming due. Nothing about the engine changed; you changed what it points at." } },

      { p: "The awkward one. A prompt lands on an empty slot in Rumours:" },
      { roll: { what: "Random prompt → Rumours", die: "d10", value: 7, result: "(empty slot 4)", page: "PUM p.6",
        then: "Four controls appear. You do not want to invent — you want the machine to give you something. “Leave it to destiny” rerolls until a written entry comes up, which is the book's “still stuck” rule, and it can never hand back an empty slot." } },
      { p: "It found “they are burning the Riding”. Two sessions old, written when it seemed like colour. It is now the reason the levy cannot be refused." },

      { p: "Deliberate invocation. Later you want the story to answer something rather than complicate it. Play → Plot nodes → Pending questions → Roll this list. You chose the list on purpose; the die chose the entry; it still counts as a beat and can still cross a box. The alternative, Invoke on a specific written entry, skips the die entirely — also allowed, also a beat." },
      { ref: "PUM p.9" },

      { p: "Export before you stop. Settings → Export readable gives a Markdown summary of the game: protagonists, each plot sheet with its track position, every filled node list, and the whole journal in order. Export JSON gives the restorable copy. Downloads are blocked in some embedded viewers, so both dialogs also offer Copy, and say so." },
      { p: "Functions this scenario used: Customized sheet · pre-drawn track, sections added and removed · + box mid-play · the custom prompt column and its reset · both player-named lists · rolling a list you pointed a face at · the “leave it to destiny” compulsion · deliberate invocation, rolled and chosen · readable and JSON export." },
    ],
  },
);

// --- Part 3: complete reference, screen by screen --------------------------
// Every labelled control and dialog in the app appears here. tests/harness.mjs
// scans src/ for control labels and asserts each one is named in this part, so
// "nothing is left out" is checked rather than claimed.
const REFERENCE = [
  {
    id: "ref-frame",
    title: "The frame — header, plot header, tabs",
    blocks: [
      { bullets: [
        "◈ Home (top left) — jumps to More → Home from anywhere.",
        "◐ Switch theme (top right) — cycles system → light → dark.",
        "The persistent plot header — scope name, current section, crossed/total, and the drawn track. Hidden on More; compacted in landscape, where it drops the drawn track and keeps the count.",
        "Tabs: Play · Scene · Oracles · Journal · More. A dot on Scene means a scene is open; a dot on Play means a beat is waiting or the scope has finished.",
        "Every screen offers a folded “What this does” note, and many link on to the matching rules-library entry with “Read the rule →”.",
      ] },
    ],
  },
  {
    id: "ref-play",
    title: "Play",
    blocks: [
      { p: "Plot track" },
      { bullets: [
        "Random prompt (pinned) / Proposal — the two beat controls. The card above repeats them as Modified proposal and Random prompt.",
        "On a beat card: Confirm — cross a box · Not this time (or Played it, on a trackless sheet) · Re-roll · Add a note · Re-roll the beat when a repeat is flagged.",
        "On a node result: Add new · Choose · Reroll · Leave it to destiny · Name it and roll, on an unnamed list · Bring one in · Recall (N), on a list this sheet does not print — the count is how many are in the cast.",
        "Track: any box opens Box N — Mark a timed beat / Edit the timed beat / Clear the mark / Close.",
        "Advance without a beat · Step back · End this scope · Reopen this scope.",
        "Customize (Customized sheet only) → Add a section · + box · Remove · Edit the prompt column → Save the column / Reset to the standard column · Done.",
        "Add track section dialog: Section name, Boxes, Add.",
        "This scope fold → Add game notes / Edit game notes.",
        "Next step: decide the starting point → Write the starting point.",
        "What now → Open a scene / Back to the scene · Ask an oracle · Write it down · Start another plot sheet when the scope has finished.",
        "Dialogs that can fire on confirming: A timed plot beat fires (Play it) · The scope has resolved (Start another plot sheet / Stay here) · The scope is finished.",
      ] },
      { p: "Plot nodes" },
      { bullets: [
        "Per list: the 1d10 or 1d20 pill, the fill count, Roll this list — 1d10 or 1d20, a “What goes in here” fold, the first four written slots plus one empty as buttons, Invoke on written entries, Show all N slots.",
        "Player-named lists add Rename and Remove.",
        "Add a plot node list — names one of the two blank lists from the extension sheet.",
        "Invoke this node → Invoke as a beat / Cancel.",
      ] },
      { p: "Cast" },
      { bullets: [
        "Add a protagonist (name + notes) · Edit → Save / Remove / Cancel.",
        "Add a character · Add a location (name + what GUM says about them).",
        "Open a cast entry → Notes, the twelve SUM character tables on a character, Save · Rename · Add to plot nodes · Remove. Rolled traits list with Remove per trait.",
        "Add to plot nodes → Write it in / Cancel, or an explanation and Back to the cast when this sheet prints no such list.",
      ] },
    ],
  },
  {
    id: "ref-scene",
    title: "Scene",
    blocks: [
      { bullets: [
        "Scene arc — the Rule of Bias as three buttons: Neutral — roll once / Favourable — keep lowest / Trouble — keep highest · Roll a scene opener · Open it myself · Roll an intervention check · Roll a scene closure. While a scene runs the pinned action becomes Intervention check with Close beside it.",
        "Scene closed dialog — Open the next scene · Back to the plot sheet · Write it down · Undo.",
        "While the scene runs: Call a plot beat · Ask an oracle · Who is here?",
        "Exploration · Battle · Discovery — three SUM tables each, the first pinned as the primary, each with the whole table readable in a fold.",
        "Characters — the twelve character tables grouped by depth, and Go to the cast →.",
        "Every result card: Re-roll · Dismiss.",
      ] },
    ],
  },
  {
    id: "ref-oracles",
    title: "Oracles",
    blocks: [
      { bullets: [
        "Your question — optional, stamped on the result card and into the journal.",
        "Yes or No — three registers, an “I have a bias” checkbox, Ask.",
        "Granular — three registers, seven likelihood bands, Ask.",
        "Descriptive · Story · Quantifiers — one button per oracle.",
        "Result card: Re-roll · Note it · Dismiss; Enrich it when a descriptive or story answer has no d100 word yet; on a bias roll, two answer chips to choose between.",
        "Does this call for a beat? — It said yes — random prompt · It said no — modified proposal.",
        "Disruption die — the card under an answer when the setting is on: reports the d10 and offers Roll the random prompt / Roll the modified proposal.",
      ] },
    ],
  },
  {
    id: "ref-journal",
    title: "Journal",
    blocks: [
      { bullets: [
        "Entries — thirteen filters, Write an entry (pinned), Session break, Show N more of M.",
        "Per entry, behind Edit: Add note / Edit note · Delete.",
        "Dice — distribution per die size, and Clear the journal.",
      ] },
    ],
  },
  {
    id: "ref-more",
    title: "More",
    blocks: [
      { p: "Home" },
      { bullets: [
        "Before you play — the outstanding prep steps, each a link.",
        "The current game card: Go to the plot sheet · Open a scene / Continue the scene · Edit → Name this game, Universe or RPG, World, tone and theme, Inspiration.",
        "Plot sheets in this game: Switch to this · Edit (scope name, mission, starting point) · Delete · New plot sheet.",
        "Your games: Open · Archive / Restore · Prepare another game.",
        "The machines — what PUM, SUM and GUM each do.",
        "With no game: Never played solo before? — three lines saying you narrate, the app answers, and your own RPG resolves · Prepare a game (pinned) · Read the first-session walkthrough.",
      ] },
      { p: "Forge (hidden when GUM is off)" },
      { bullets: [
        "Plot seed · World · Characters · Grand oracle.",
        "Roll a whole plot seed (pinned) · World truths · Roll all three · per-table dN buttons · Roll all of <group>.",
        "Result card: Re-roll · Keep it → · Dismiss · Re-roll this one — on a set, it re-rolls just that table.",
        "Keep this → Write into <list> · Add as a protagonist · Add to the cast as a character · Add to the cast as a location · Just keep it in the journal.",
        "Keep this, folded under 'Into this game's setting or plot sheet' → Add to the universe · Add to the world, tone and theme · Add to the game's inspiration · Add to this plot sheet's mission · Add to the starting point · Add to the game notes. Every one appends; none replaces what you wrote.",
        "Keep this with no game open → Prepare a game with this, or Take it back to prep if you are already mid-way through it. Either way the roll is carried and offered against each field, rather than discarded, and nothing you have typed is touched.",
        "Name your protagonist — asked after 'Add as a protagonist', so the rolled text becomes the notes and you supply the name.",
        "Rolled in the Forge (in game prep) → one button per field on that step, plus Dismiss.",
        "Do not know yet? → Invent one in the Forge → — on prep steps 1 and 2, when nothing has suggested itself. The draft is kept while you go and look.",
        "What a rolled seed looks like — a fold on Forge → Plot seed: one real roll of the six, read as one situation, and where each of the six lines ended up.",
      ] },
      { p: "Rules" },
      { bullets: [
        "Search, then collapsible groups of rule entries, each page-cited; “guidance” marks the ones the app deliberately does not enforce.",
        "Glossary — twelve terms.",
        "The glossary, open by default — twelve terms, a line each.",
        "From the books (folded) — the three play states, the playing flowchart, the advice chapter, advanced mechanics.",
        "Errata (folded) — where the books disagree with themselves.",
        "Where the app does not roll (folded) — the eight fields with no inspiration block, and why.",
      ] },
      { p: "Tutorial — this document. Settings — see Part 1." },
      { bullets: [
        "Your data: Export JSON (also pinned, with Import beside it) · Import JSON · Export readable · Check my data · Undo.",
        "Export and import dialogs: Copy · Download · Close · Import · Cancel.",
        "Optional rules: Disruption die · Volatile situation · Game Unfolding Machine (GUM v2.2) · Enrich descriptive and story oracles · Show the \u201cWhat this does\u201d notes expanded.",
        "Appearance: Theme · Text size — N%, which the label carries as you drag it.",
        "About the books, including what they do not contain.",
        "Danger zone: Delete the current game · Erase everything.",
      ] },
    ],
  },
  {
    id: "ref-dialogs",
    title: "Every dialog, by name",
    blocks: [
      { p: "Each of these opens over the screen, traps focus, closes on Escape, and returns focus where it was. Primary action first, always." },
      { bullets: [
        "Prepare a game (the wizard) — five steps; “Back to preparing it” returns to a half-finished draft from anywhere in More.",
        "Starting point — “Where does this open, and what is introduced?”",
        "Game notes — “Notes for this plot sheet”.",
        "Timed plot beat — “What is waiting at this box?”; Box N carries Mark / Edit / Clear the mark.",
        "Add a track section — Section name and Boxes. Customize this sheet holds it, alongside Your prompt column.",
        "Advance without a beat · A timed plot beat fires · The scope has resolved · The scope is finished — the four dialogs the track can raise.",
        "Add a new plot node · Name your list (“What is this list of?”) · Rename this list · Invoke this node.",
        "Note this beat / Note this answer (“How did you read it?”) / Note — the three note dialogs.",
        "Add a protagonist (the wizard's inline form uses “Add protagonist”, disabled until there is a name) · Protagonist · Remove this protagonist? (its notes field is labelled “A line about them (optional)”) · Add a character / Add a location · Rename · Add to plot nodes, which offers “Back to the cast” when the sheet prints no such list.",
        "Open a scene — “How does it open?”",
        "Scene closed — Open the next scene / Back to the plot sheet / Write it down / Undo.",
        "Keep this (the Forge) — Name them / Name the place, or “Open Settings” when GUM is off.",
        "Write in the journal · Mark a session break (“A line about where you stopped (optional)”) · Delete this entry? · Clear the journal?",
        "This game · Plot sheet — the two edit dialogs on Home.",
        "Export / Readable export — Copy, Download, Close. Import. Data check. Erase everything?",
        "Rules → “Clear the search” when a search matches nothing. Journal → “Go to the oracles” and “Go to the plot sheet” when it is empty. Plot nodes → “Back to the track” on a sheet with no nodes.",
        "Tutorial → “Mark as read”, which stops the quick start offering it again; “Open the guide as a page →”, which opens this same guide as a web page for a second screen; and “Download the guide as a PDF”, the same guide paginated — a title page, a numbered contents, bookmarks, one part per page break — for a tablet at the table or for paper. Both ship with the app and are cached with it, so both work offline.",
      ] },
    ],
  },
  {
    id: "ref-journal-kinds",
    title: "What the journal calls things",
    blocks: [
      { p: "Every entry carries a kind, and the filter row uses it. Knowing the titles the app writes makes the filters worth using." },
      { bullets: [
        "prep — “Game prepared”, “Starting point set”, “New plot sheet”, “New plot node list”.",
        "beat — the beat's own text, plus “Beat played, track unchanged” when you decline to cross, and “Plot node invoked deliberately” / “Plot node list invoked deliberately”.",
        "node — “Plot node invented”, “Plot node chosen”, “Recalled from the cast”, “Character brought in” / “Location brought in”.",
        "track — “Advanced without a beat”, “Beat confirmed — <the beat>”, “Plot scope ended”, “Plot scope reopened”.",
        "timed — “Timed plot beat”, written when a marked box fires.",
        "scene — “Scene opened”, “Intervention check”, “Scene closed”.",
        "yesno · granular · oracle — one per oracle roll, titled with the register and the answer.",
        "sum — SUM table rolls, titled with the table and its result.",
        "gum — Forge rolls and any inspiration word you kept.",
        "note â your own entries, and anything kept from the Forge, titled “Kept from GUM — <table>”.",
        "session — “— session break —”.",
      ] },
      { note: "A re-roll writes a second entry linked to the first rather than replacing it, so the record shows what you rolled and what you decided to use instead. That is the point of keeping both." },
    ],
  },
  {
    id: "ref-everywhere",
    title: "Controls that appear everywhere",
    blocks: [
      { bullets: [
        "Save · Cancel · Close · Done · Add · Remove · Delete · Edit · Open · Rename — the standard dialog verbs.",
        "Undo — in the toast raised by any mutating action, and in Settings as a fallback. One player action is one undo, however many things it changed.",
        "Stuck? Roll three words — the inspiration block, in every text field GUM can serve. Use this · Use all three · Roll again · All N tables.",
        "What this does — the folded per-screen note, with Read the rule → where a rules entry matches.",
      ] },
    ],
  },
];

// --- Part 4: what the app deliberately does not do -------------------------
const LIMITS = [
  {
    id: "limits",
    title: "What it will not do, and why",
    blocks: [
      { bullets: [
        "Resolve a task. No book here says whether you succeeded. Bring your own RPG's rules, or decide. The app reports what the world offers and never reports success.",
        "Cross a box for you. Confirming is a judgement about whether the beat mattered, and judgements are yours.",
        "Roll for your protagonists. You control their thoughts, voice and actions entirely.",
        "Fire a beat automatically. The one exception is the disruption die, which is off by default because the book presents it as a variant you opt into.",
        "Define a session. Neither book has a session procedure, so nothing is reset or rolled at a session break — it is a bookmark.",
        "Ship safety tools. Neither book contains any. The app says so in Settings rather than inventing an X-card and presenting it as the books'.",
        "Invent table content. Every row in the app is from the printed books; where a book disagrees with itself the app records the erratum instead of correcting it.",
        "Send anything anywhere. Everything is in this browser's local storage. There is no account, no sync and no server.",
      ] },
      { note: "Two of these are worth sitting with. The app not resolving tasks is not an omission — it is what makes PUM work with any rulebook you own. And the app not crossing boxes for you is what keeps the plot track a compass rather than a clock." },
    ],
  },
];

export const PARTS = [
  { id: "walkthrough", title: "Part 1 · Learning it in play order",
    blurb: "Every function, introduced where you would first meet it, with the reason the rule exists.",
    sections: WALKTHROUGH },
  { id: "scenarios", title: "Part 2 · Four scenarios",
    blurb: "Four games on four structurally different plot sheets. Every quoted result is the real row at that die value.",
    sections: SCENARIOS },
  { id: "reference", title: "Part 3 · Complete reference",
    blurb: "Every screen and every control, for looking something up.",
    sections: REFERENCE },
  { id: "limits", title: "Part 4 · What the app does not do",
    blurb: "The deliberate omissions, and the reasoning behind each.",
    sections: LIMITS },
];
