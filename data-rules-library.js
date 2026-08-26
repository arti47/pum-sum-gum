// One entry per automated rule, in the app's own words, with the page cited.
// Every automated surface links here by id (template §6.6 layer 2).

// The rules library is organised rule by rule, which answers "how does this
// work" and not "what is this word". The glossary answers the second question.
//
// It runs in two layers, because a player arrives at one of two starting points.
// The first group assumes NOTHING — not that you have read the books, not that
// you have ever played a solo RPG, not that you know what a d20 is. The rest
// name the machinery.
//
// `aka` is the machine-checkable part. `src/glossary.js` reads it to put a chip
// under every screen's "what this does" note for the jargon that note actually
// uses, and tests/audit-reach.mjs fails if a term is defined and unreachable, or
// if two entries claim the same word. Put a word on a screen, put it here.
export const GLOSSARY = [
  // --- assumes nothing -----------------------------------------------------
  {
    id: "solo-rpg", group: "If this is your first solo game", term: "Solo roleplaying",
    aka: ["solo rpg", "solo play", "solo game", "played solo"], page: "PUM p.2",
    body: "Playing a roleplaying game with no other people and no gamemaster. You play the heroes, and you also decide what the world does — except that when you would rather not decide, you ask a table instead.",
    more: "That is all three of these books are: tables to ask, and a procedure saying when to ask them. You supply the story.",
  },
  {
    id: "gm", group: "If this is your first solo game", term: "Gamemaster (GM)",
    aka: ["gamemaster", "game master", "referee", "gme"], page: "PUM p.2",
    body: "In a group game, the person who describes the world, plays everyone the heroes meet, and decides what happens next. In solo play there isn't one.",
    more: "The oracles and plot beats do the GM's job of surprising you. They do not do the GM's job of judging whether you succeeded — that is still yours.",
  },
  {
    id: "dice-notation", group: "If this is your first solo game", term: "d10, d20, d100",
    aka: ["1d10", "1d20", "1d100", "d10", "d20", "d100", "dice notation"], page: "standard dice notation",
    body: "How many sides the die has. A d10 gives 1 to 10, a d20 gives 1 to 20, a d100 gives 1 to 100.",
    more: "You never need real dice: the app rolls them, shows every face it rolled, and writes the numbers into the journal so you can check its working.",
  },
  {
    id: "protagonist", group: "If this is your first solo game", term: "Protagonist",
    aka: ["protagonists", "player character", "the pcs"], page: "PUM p.3",
    body: "A character you play. Their thoughts, voice and choices are always yours — nothing here ever decides what your protagonist does.",
  },
  {
    id: "scene", group: "If this is your first solo game", term: "Scene",
    aka: ["scenes"], page: "SUM p.2",
    body: "One continuous chunk of story in one place — a conversation, a fight, a search of a room. Stories are built out of them the way a film is.",
    more: "SUM exists to help you start a scene when you don't know how it opens, shake it up when it stalls, and end it when it is over.",
  },
  {
    id: "in-medias-res", group: "If this is your first solo game", term: "In medias res",
    aka: ["in medias res"], page: "PUM p.3",
    body: "Latin for \"into the middle of things\": opening the story mid-action rather than with travel and preamble.",
    more: "PUM recommends it for a first scene — start with the ambush already happening, and work out afterwards how you got there.",
  },

  // --- PUM's machinery -----------------------------------------------------
  { id: "plot-scope", group: "The plot machine", term: "Plot scope", aka: ["plot scope"], page: "PUM p.3", body: "One defined mission, task or goal — the thread this plot sheet is about. A long game is several scopes, one after another." },
  { id: "plot-sheet", group: "The plot machine", term: "Plot sheet", aka: ["plot sheet", "plot sheets"], page: "PUM pp.14-23", body: "The pacing choice for a scope: how long the track is, how it is sectioned, and what the ten prompt faces reach for. Ten of them are printed; you pick one per scope." },
  { id: "plot-track", group: "The plot machine", term: "Plot track", aka: ["plot track"], page: "PUM p.7", body: "The row of boxes. Each confirmed beat crosses the next one, and a full track means the scope has resolved. It is a compass against wandering, not a clock." },
  { id: "plot-beat", group: "The plot machine", term: "Plot beat", aka: ["plot beat", "plot beats"], page: "PUM p.4", body: "The moment you hand the story to the machine. Two kinds: a modified proposal and a random prompt." },
  { id: "modified-proposal", group: "The plot machine", term: "Modified proposal", aka: ["modified proposal", "modified proposals"], page: "PUM p.14", body: "You have an idea what happens next; 1d10 twists it — the location, the mood, someone arriving, the intensity." },
  { id: "random-prompt", group: "The plot machine", term: "Random prompt", aka: ["random prompt", "random prompts"], page: "PUM p.14", body: "You do not have an idea; 1d10 on your sheet's own column tells you what the story reaches for — a random event, or one of your plot nodes." },
  { id: "plot-node", group: "The plot machine", term: "Plot node", aka: ["plot node", "plot nodes"], page: "PUM p.28", body: "Your game's own content, written in lists: world elements, potential problems, useful findings, pending questions, and on the extension sheet notable characters and interesting locations. A prompt rolls on one of these lists." },
  { id: "confirming", group: "The plot machine", term: "Confirming a beat", aka: ["confirming a beat", "confirm the beat", "cross a box"], page: "PUM p.7", body: "Deciding, after you have played the beat out, that it mattered enough to cross a box. Calling a beat permits this; it never requires it." },
  {
    id: "resolved", group: "The plot machine", term: "Resolved",
    // NOT "resolution": the books use that word for task resolution, the one
    // thing PUM explicitly does not do. Two meanings, one word.
    aka: ["resolved"], page: "PUM p.7",
    body: "Every box on the track is crossed, so this storyline has reached its ending. The header says so and the track stops there.",
    more: "It does not end your game. Start another plot sheet for the next storyline; the same cast and journal carry over.",
  },
  {
    id: "acts", group: "The plot machine", term: "Exposition, Confrontation, Resolution",
    // Found by tests/tools/harvest-jargon.mjs: "exposition" is on the busiest
    // screen in the app 34 times, and is story-structure vocabulary a beginner
    // has no reason to have met.
    aka: ["exposition", "confrontation", "rising", "climax", "falling action", "five-act"],
    page: "PUM pp.14-23",
    body: "The named stretches a plot track is divided into — borrowed from how stories are usually described. Exposition is the setting-up, Confrontation or Rising is where it gets harder, Climax is the worst of it, and Resolution is the aftermath.",
    more: "They are labels on the track, not rules: nothing changes mechanically when you cross from one into the next. They tell you what kind of scene tends to belong here, and nothing stops you ignoring that.",
  },
  {
    id: "abcd", group: "The plot machine", term: "ABCD tables",
    aka: ["abcd"], page: "PUM p.14",
    body: "Four small tables of generic story events, reached when a random prompt sends you to one instead of to your own plot nodes. They are deliberately vague — a hint, not a script.",
    more: "Read one and decide what it means here. If nothing suggests itself, roll again or take the other kind of beat.",
  },
  {
    id: "timed-beat", group: "The plot machine", term: "Timed beat",
    aka: ["timed beat", "timed beats"], page: "PUM p.9",
    body: "A note pinned to a box further along the track — something you have already decided will happen once the story gets that far. The app reminds you when you cross it.",
  },
  {
    id: "disruption", group: "The plot machine", term: "Disruption die",
    aka: ["disruption die"], page: "PUM p.9",
    body: "An optional extra die riding along with every oracle answer, which occasionally interrupts you with a plot beat. Off until you turn it on, because the book presents it as a variant rather than the normal way to play.",
  },

  // --- the oracles ---------------------------------------------------------
  { id: "oracle", group: "Asking the oracles", term: "Oracle", aka: ["oracles", "an oracle"], page: "PUM p.8", body: "A table you ask when you genuinely do not know, or would rather not decide. Yes/No, descriptive, story, quantifier and the granular variant." },
  { id: "register", group: "Asking the oracles", term: "Register", aka: ["register", "registers", "deterministic", "subjective"], page: "PUM p.12", body: "Who is answering a Yes/No question: the universe (Deterministic), a character's own view (Subjective), or someone talking to you (Conversation)." },
  {
    id: "pum-bias", group: "Asking the oracles", term: "Bias (PUM's version)",
    aka: ["bias", "biased"], page: "PUM p.12",
    body: "When you think one answer is likelier, roll the Yes/No twice and pick whichever of the two fits your story better. The choice is yours, not the machine's.",
    more: "SUM's Rule of Bias shares the name and is a different rule: there the app keeps the die for you.",
  },
  {
    id: "enrichment", group: "Asking the oracles", term: "Enrichment",
    aka: ["enrichment", "enriched", "description word", "focus word"], page: "PUM pp.12-13",
    body: "A second word rolled alongside a descriptive or story oracle, to stop the answer being bland. \"A guard\" plus \"desperate\" is a scene; read the pair together.",
  },
  {
    id: "granular", group: "Asking the oracles", term: "Granular Yes/No",
    aka: ["granular", "likelihood"], page: "PUM p.24",
    body: "The finer version of Yes/No. Say out loud how likely a yes actually is, then roll a d100 against that column. Saying \"unlikely\" before you roll is honesty about the fiction, not cheating.",
  },
  {
    id: "quantifier", group: "Asking the oracles", term: "Quantifier",
    aka: ["quantifier", "quantifiers"], page: "PUM p.13",
    body: "A table answering \"how many?\", \"how good?\" or \"how hard?\" — relative to a baseline you fix in your head first. Without that baseline, \"much more than expected\" means nothing.",
  },

  // --- SUM -----------------------------------------------------------------
  { id: "sum-bias", group: "The scene machine", term: "Rule of Bias", aka: ["rule of bias", "keep the lowest", "keep the highest"], page: "SUM p.3", body: "SUM's rule: roll twice and keep the lowest if you expect things to favour the PCs, the highest if you expect trouble. Distinct from PUM's bias, where you roll twice and choose." },
  { id: "scene-arc", group: "The scene machine", term: "Scene arc", aka: ["scene arc"], page: "SUM p.4", body: "SUM's three boundary rolls: an opener when you do not know how a scene begins, an intervention check when it stalls, and a closure to see how the world responds." },
  {
    id: "intervention", group: "The scene machine", term: "Intervention check",
    aka: ["intervention check", "intervention"], page: "SUM p.4",
    body: "The mid-scene roll for when things have stalled — the characters are dithering, the tension needs a push, a silence has gone on too long. Yours to fire, never automatic.",
  },
  {
    id: "closure", group: "The scene machine", term: "Scene closure",
    aka: ["scene closure", "scene opener"], page: "SUM p.4",
    body: "The roll that ends a scene: whether the world responds fortunately or unfortunately, and the hook into what comes next. Its sibling, the scene opener, tells you what to describe first when you do not know how a scene begins.",
  },
  {
    id: "emulation", group: "The scene machine", term: "Character emulation",
    aka: ["character emulation", "first contact", "shallow interaction", "trust conversation", "deep relationship"],
    page: "SUM pp.8-11",
    body: "Tables for playing someone your protagonist meets, at four depths: a first sighting, small talk, a real conversation, a long relationship. Roll at the depth you actually have with that person.",
    more: "Results stick to that cast entry, so the innkeeper you met twice stays recognisably the same innkeeper.",
  },

  // --- GUM -----------------------------------------------------------------
  {
    id: "gum", group: "The game machine", term: "GUM",
    aka: ["gum", "game unfolding machine", "the forge"], page: "GUM p.3",
    body: "The third book: 43 tables for inventing the raw material — worlds, factions, places, objects, villains, people — before or during play.",
    more: "Its method is combination: roll several tables about one subject and read the results as one idea. Switch it off in Settings if you do not own the book.",
  },
  {
    id: "plot-seed", group: "The game machine", term: "Plot seed",
    aka: ["plot seed"], page: "GUM pp.6-7",
    body: "Six GUM tables rolled together — a hook, a motive, a mission, a first lead, a catch and an opposition — which between them describe a whole starting situation. Read the six lines as one paragraph and keep the parts you like.",
  },
  {
    id: "grand-oracle", group: "The game machine", term: "Grand oracle",
    aka: ["grand oracle"], page: "GUM pp.22-24",
    body: "Three d100 words — an action, an adjective and a subject — for a moment when no specific table fits. \"Betray · hollow · the archive\" means nothing until you make it mean something; that act of interpretation is the answer.",
  },
  {
    id: "world-truths", group: "The game machine", term: "World truths",
    aka: ["world truths"], page: "GUM pp.4-5",
    body: "Two tables setting the ground everything else stands on: what kind of place this is, and what is already wrong with it.",
  },
  {
    id: "nemesis", group: "The game machine", term: "Nemesis",
    aka: ["nemesis"], page: "GUM p.12",
    body: "The opposition with a face — the one antagonist this story is really against. GUM builds one from their goal, their method and their weakness.",
  },

  // --- the app's own words -------------------------------------------------
  {
    id: "safety-tools", group: "This app's words", term: "Safety tools",
    // Settings names three of these in one breath — "no lines and veils, no
    // X-card, no debrief" — which says nothing at all to a first-time player.
    aka: ["safety tools", "x-card", "lines and veils", "debrief"],
    page: "absent from all three books",
    body: "Agreements a roleplaying group makes in advance about what the story will not include, and how to step back from it if it does. Lines and veils name what is off the table and what happens off-screen; an X-card is a way to stop a scene without explaining; a debrief is talking afterwards about how it landed.",
    more: "None of the three books ships any, so this app does not invent one and present it as theirs. Playing alone, the useful half is still the first: decide before you start what you would rather not write about tonight.",
  },
  {
    id: "universe", group: "This app's words", term: "Universe",
    aka: ["universe"], page: "PUM p.3",
    body: "The setting and rules you are borrowing — \"Blades in the Dark\", \"Dune\", \"my own dying-earth thing\". Written down mostly so your head starts in the right place.",
  },
  {
    id: "mission", group: "This app's words", term: "Mission",
    aka: ["mission"], page: "PUM p.3",
    body: "One line saying what the protagonists are trying to do in this plot scope. It keeps the machine's answers pointed somewhere.",
  },
  {
    id: "starting-point", group: "This app's words", term: "Starting point",
    aka: ["starting point"], page: "PUM p.3",
    body: "Where the very first scene opens and what is introduced there. PUM asks for it explicitly, and the app keeps nagging until you write it — a game that never opens never starts.",
  },
  {
    id: "cast", group: "This app's words", term: "Cast",
    aka: ["cast", "notable character"], page: "this app's word, for PUM p.28's notable characters",
    body: "Everyone and everywhere your game has met: people and places you can bring back later. SUM's character tables roll against a cast entry and stick their results to it.",
  },
  {
    id: "journal", group: "This app's words", term: "Journal",
    aka: ["journal"], page: "this app's word",
    body: "Every roll the app made, with the dice it rolled, plus whatever you write yourself. Both the record of the story and the way to check the app's working.",
  },
];

// Flat index: every alias → its entry id. Read by the chip decorator and by the
// reachability audit; a second copy of the term list would drift.
export const GLOSSARY_INDEX = (() => {
  const m = new Map();
  for (const e of GLOSSARY) {
    m.set(e.term.toLowerCase(), e.id);
    for (const a of e.aka || []) m.set(a.toLowerCase(), e.id);
  }
  return m;
})();

export const RULES_LIBRARY = [
  {
    group: "Playing the game",
    entries: [
      {
        id: "three-states", title: "The three play states", page: "PUM p.4",
        body: "At any moment you are doing one of three things: roleplaying freely, asking an oracle, or invoking a plot beat. The app gives each its own surface — the journal, the Oracles tab, and the beat controls on your plot sheet — and none of them takes a turn from you.",
      },
      {
        id: "no-resolution", title: "PUM resolves nothing", page: "PUM p.2",
        body: "PUM is system-agnostic and expects you to bring a rulebook for task resolution. The app never reports success or failure — it reports what the world offers. If you want a hit-or-miss answer, roll it in your own game and use a Yes/No oracle for the fiction around it.",
        automated: false,
      },
      {
        id: "oracle-restraint", title: "One or two questions per matter", page: "PUM p.10",
        body: "Asking too many oracle questions slows the pace, breaks immersion and produces conflicting answers. The app never limits you — this is advice, not a rule — but the journal shows how many questions a scene has cost you.",
        automated: false,
      },
    ],
  },
  {
    group: "Oracles",
    entries: [
      {
        id: "yes-no", title: "Yes or No — 1d10", page: "PUM p.12",
        body: "Three registers of the same question. Deterministic is the universe answering objectively. Subjective is a character's own point of view, and may answer \"don't know\". Conversation is a non-protagonist replying to you in dialogue.",
      },
      {
        id: "pum-bias", title: "PUM bias — roll twice, you pick", page: "PUM p.12",
        body: "If you have a bias, roll once more and choose the answer that fits best. This is your call, not the machine's: the app shows you both answers and commits neither until you tap one. Note this is a different rule from SUM's Rule of Bias.",
      },
      {
        id: "enrichment", title: "Enrichment — 1d10 plus 1d100", page: "PUM pp.12-13",
        body: "Descriptive oracles (who, where, what for, hazard, mood, notice) are enriched with a Description word; story oracles (find, risk, wants, doing, why, how) with a Focus word. Roll both and read them together — the pair is the answer, not the first line alone. Settings can switch the second die off; an answer that came without one carries Enrich it, which rolls the word for that answer alone.",
      },
      {
        id: "granular", title: "Granular Yes or No — 1d100 at a likelihood", page: "PUM p.24",
        body: "The finer-grained variant. Declare how likely the answer is — no way, hardly, unlikely, neutral, likely, surely, certain — and roll d100 against that column. The bands tile the whole range, so every roll lands on exactly one answer.",
      },
      {
        id: "quantifiers", title: "Quantifiers — set a baseline first", page: "PUM p.13",
        body: "How many, how good, how hard. Every system measures differently, so the table answers relative to a baseline you set before rolling. Four faces out of ten are \"as expected\" — most of the time the world is unremarkable.",
      },
      {
        id: "reroll", title: "Re-roll, ignore, or reinterpret", page: "PUM p.8",
        body: "Oracle answers are not to be taken to heart. If you dislike one, re-roll it, ignore it, or read it however sparks your imagination — even against what it says. The app puts a Re-roll on every result card and journals both rolls so the record stays honest.",
      },
    ],
  },
  {
    group: "Plot beats",
    entries: [
      {
        id: "beat-kinds", title: "Two kinds of beat", page: "PUM p.4",
        body: "A modified proposal when you have an idea of what happens next and want it twisted. A random prompt when you don't. Both are 1d10 on your plot sheet's own column; the sheet decides what the column contains.",
      },
      {
        id: "beat-triggers", title: "When to call a beat", page: "PUM p.28",
        body: "Six triggers each. Proposals: you have an idea; PUM said NO to \"does it go as expected\"; the PCs return somewhere known; a roll went south; long or risky work; a new conversation. Prompts: you don't know; PUM said YES to \"does anything happen\"; a new location; the unknown; time passing; you want more in the scene.",
      },
      {
        id: "abcd", title: "The ABCD random events", page: "PUM p.6",
        body: "Four sub-tables the prompt column can reach: A Complication sets back the PCs' intentions; B Catalyst pauses to explore the world; C Challenge defies them and deserves a reward; D Situation is the world, factions and non-protagonists acting on their own.",
      },
      {
        id: "node-invoke", title: "Prompts that invoke plot nodes", page: "PUM p.6",
        body: "A node-invoking prompt rolls a second die on that node list. An already-written entry comes into play. An empty slot means: add something new and unexpected, choose an entry that fits perfectly, or re-roll — the app offers all three.",
      },
      {
        id: "node-die", title: "Which die a node list uses", page: "PUM p.25",
        body: "Roll 1d10 in lists with less than half the entries filled; otherwise roll 1d20. Exactly half is already \"otherwise\", so a ten-slot list switches at its fifth entry. Five-slot lists always use 1d10: a d20 would point past their end. The app shows which die it is about to roll above each list.",
      },
      {
        id: "still-stuck", title: "Still stuck? Leave it to destiny", page: "PUM p.6",
        body: "If you are unsure, still stuck, or simply prefer to leave it to chance on an empty slot, re-roll until an entry comes up. The app's \"Leave it to destiny\" button does exactly that and can never hand you an empty slot back.",
      },
      {
        id: "reroll-repeat", title: "Re-roll a repeated beat", page: "PUM p.9",
        body: "You may re-roll whenever a beat repeats the last one, to promote variety. The app flags the repeat and offers the re-roll; it never forces it, because a repeat can be exactly right.",
      },
      {
        id: "disruption", title: "The disruption die", page: "PUM p.9",
        body: "An optional variant. Roll a distinctly coloured d10 with any oracle roll except quantifiers, Description and Focus. On a 1, a random prompt interrupts. On a 2, a modified proposal alters the scene. Read your answer first, then resolve the disruption. In a volatile situation you may widen the proposal range up to 5 — but 1 is always the only face for a random prompt.",
      },
    ],
  },
  {
    group: "The plot track",
    entries: [
      {
        id: "track", title: "What the track is for", page: "PUM p.7",
        body: "Left-to-right boxes that show where you stand in the story. It is a compass against endless wandering, not a clock: at some point the PCs should find answers, make discoveries and reach their goals.",
      },
      {
        id: "confirm", title: "Confirming a beat", page: "PUM p.7",
        body: "Calling a beat authorises you to cross a box — it does not oblige you. Play the beat's answer out first, then cross the next empty box only if the outcome proved relevant and significant. The app keeps a beat open until you decide.",
      },
      {
        id: "voluntary", title: "Advancing without a beat", page: "PUM p.9",
        body: "If an event is exceptionally impactful you may advance the track at will, and equally you may decline to advance after a beat that fell flat. Both are yours to choose; the journal records which happened.",
      },
      {
        id: "timed", title: "Timed plot beats", page: "PUM p.9",
        body: "Mark a future box with an event you know is coming — a horde, a siege, an awakening. When play reaches that box, the event unfolds and counts as a random prompt. You still don't know the circumstances, so it can still surprise you.",
      },
      {
        id: "end-scope", title: "Ending a plot scope", page: "PUM p.7",
        body: "A full track resolves the scope — that is the Threshold the sheet is built around. But the scope is yours: you may call it finished whenever you judge the thread told, with boxes still empty, and on Sandbox and Improvised there is no track to fill, so saying so is the only way it ends. The app records the ending and lets you reopen it.",
      },
      {
        id: "sheets", title: "Choosing a plot sheet", page: "PUM p.7",
        body: "Each sheet is a pacing decision: how long the track is, how it is sectioned, and how often you invoke beats. More boxes means more randomness and more of the universe pushing back. Sandbox and Improvised have no track at all; Customized lets you draw one as you play.",
      },
      {
        id: "custom-column", title: "A plot focus of your own", page: "PUM p.9",
        body: "On the Customized sheet you may fill the Random Prompt column with your own list of ten: more character entries for a social game, more challenges for an action one. The app rolls whatever you put there.",
      },
    ],
  },
  {
    group: "Plot nodes",
    entries: [
      {
        id: "nodes", title: "What plot nodes are", page: "PUM p.3",
        body: "The game-specific content your prompts reach into — world elements, potential problems, useful findings and pending questions, plus notable characters and interesting locations on expanded sheets. Defined at the start and kept alive as you play.",
      },
      {
        id: "invent-node", title: "Inventing a node mid-play", page: "PUM p.6",
        body: "When an empty slot comes up, consider introducing something new or unexpected at this point and write it into the next empty field. From then on it is a permanent entry that later rolls can hit.",
      },
      {
        id: "deliberate-node", title: "Invoking a node deliberately", page: "PUM p.9",
        body: "You may reference a node because it makes sense, without rolling for it, and still count it as a beat for track purposes. The app's Invoke button on any node row does this and journals it as a chosen invocation, not a rolled one.",
      },
    ],
  },
  {
    group: "Scenes (SUM)",
    entries: [
      {
        id: "sum-bias", title: "SUM's Rule of Bias", page: "SUM p.3",
        body: "Every SUM table is ordered so that lower rolls favour the protagonists and higher rolls bring conflict, resistance or trouble. Neutral? Roll once. Expecting something favourable? Roll twice and keep the lowest. Expecting trouble? Keep the highest. Unlike PUM's bias, this one is mechanical — the app keeps the die for you and shows you both.",
      },
      {
        id: "scene-arc", title: "The scene arc", page: "SUM p.4",
        body: "Open with a Scene opener when you don't know where to start. Fire an Intervention check mid-scene when the PCs are taking too long, tension is high, danger is near, or silence lingers. Close with a Scene closure to see how the world responds. All three are yours to fire; none happens automatically.",
      },
      {
        id: "sum-scope", title: "What SUM is and isn't", page: "SUM p.3",
        body: "SUM is a supplement, not a standalone game. PUM says a beat happens; SUM tells you what the scene contains, how the fight is shaped, what is discovered, and how the people behave. It assumes you already know how to run a solo game.",
        automated: false,
      },
      {
        id: "sum-characters", title: "Character emulation in four depths", page: "SUM pp.8-11",
        body: "First contact — how they react, how they look, what they were talking about. Shallow interaction — personality, a recent anecdote, their profession. Trust conversation — their opinion, their honesty, what they bring to the plot. Deep relationship — their parallel goals, their backstory, what bonds them to someone. Roll only the depth the scene has actually reached.",
      },
    ],
  },
  {
    group: "Game seeding (GUM)",
    entries: [
      {
        id: "gum-what", title: "What GUM is for", page: "GUM p.3",
        body: "The third machine, and a prep tool rather than a play tool. PUM manages the plot and SUM brings the scene to life; GUM lays the groundwork both of them assume you already have — where this happens, what is wrong there, who wants what, and who stands in the way.",
      },
      {
        id: "gum-combine", title: "Combination is the method", page: "GUM p.3",
        body: "GUM's strength is combining tables: roll several for one subject, or the same table twice, and read the results together. Its tables are abstract on purpose — the interpretation is yours, and that is what makes each use different.",
      },
      {
        id: "gum-inspire", title: "Three words beside any blank", page: "GUM p.3",
        body: "Most text fields can roll three GUM words for inspiration. Which tables they roll depends on what the field is for — a character field reaches for archetypes and flaws, a location field for features and purpose, the mission field for GUM's own six-table plot seed. Some fields offer nothing, and that is deliberate: every GUM row is a phrase about fiction, which is the wrong shape for a proper name or a real-world answer like which RPG you are playing. See \"Where the app does not roll\". Words are appended to what you have written, never substituted for it, and nothing is rolled until you open the block: the books ask you not to roll when you already know. Only words you keep are journalled.",
      },
      {
        id: "gum-nodes", title: "GUM fills a plot sheet", page: "GUM p.3",
        body: "PUM's plot nodes are exactly what GUM generates. Every empty node slot in this app offers a Roll from GUM button pointed at the tables that suit that category, and whatever you keep is written into the slot as a permanent entry.",
      },
      {
        id: "gum-seed", title: "The plot seed", page: "GUM pp.6-7",
        body: "Six tables in the book's own order — a hook, a motivation, a mission, the initial lead, a caveat, and the opposition. Rolled as a set they describe one situation. Keep the parts that spark something and re-roll or ignore the rest.",
      },
      {
        id: "gum-grand", title: "The grand oracle", page: "GUM pp.22-24",
        body: "An action, an adjective and a subject, each d100, for the moment when no specific oracle fits. Three words and your reading of them. It answers nothing on its own — that is the point.",
      },
    ],
  },
  {
    group: "About this app",
    entries: [
      {
        id: "dice", title: "How the dice are rolled", page: "app",
        body: "Every die uses the browser's cryptographic random source, never Math.random. Each roll shows its individual faces, and on a bias roll both dice with the kept one marked. Rolls are stored once and rendered from the stored value, so nothing is ever silently re-rolled.",
      },
      {
        id: "safety", title: "Safety tools", page: "not in either book",
        body: "Neither PUM nor SUM ships safety tools — no lines and veils, no X-card, no debrief. The app does not invent one and present it as the books'. If your table wants them, bring them from elsewhere; solo play still benefits from knowing what you would rather not write about tonight.",
        automated: false,
      },
      {
        id: "errata", title: "Where the books disagree with themselves", page: "PUM pp.9, 11",
        body: "Two worked examples cite prompt numbers that do not match the printed plot sheets. The sheets are the play surface and win. The app rolls the sheet's ordering and records the discrepancy rather than quietly correcting it.",
      },
    ],
  },
];
