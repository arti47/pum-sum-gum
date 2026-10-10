// The books' procedural framing, extracted as first-class content (template §3.20).
// Paraphrased from PUM pp.2-10 and p.28, and SUM p.3.

// --- The three play states (PUM p.4) ---------------------------------------
export const PLAY_STATES = [
  {
    id: "roleplay", n: 1, name: "Roleplaying & storytelling",
    text: "For as long as you like, play your characters, explore the universe, expand the world, enjoy the telling. You are both the author and the actors. Engage in dialogue, interact with the world, feel it.",
  },
  {
    id: "oracles", n: 2, name: "Asking the oracles",
    text: "In a group game you would ask the gamemaster. Here you ask the oracles. Pick the best-fitting one and ask away — then find the balance between asking too many questions and deciding every answer yourself.",
  },
  {
    id: "beat", n: 3, name: "Invoking a plot beat",
    text: "When something happens that should move the story, call a beat: a modified proposal if you have an idea what happens next, a random prompt if you don't. Play its answer for a while, then decide whether to confirm it.",
  },
];

// --- The playing flowchart (PUM p.5) ---------------------------------------
export const FLOWCHART = [
  { q: "Is the current event relevant for the plot?", no: "Ask the oracles any questions within the story, and continue storytelling.", yes: "Go on to the next question." },
  { q: "Is it a good time to advance the plot track?", no: "Continue storytelling and check again later.", yes: "Go on to the next question." },
  { q: "Do you have a clear idea of what is unfolding?", no: "Roll a random prompt to gather inspiration, then play on.", yes: "Roll a modified proposal, mix it in, and play on." },
  { q: "Was it in the end relevant for the story and plot?", no: "Play on. The track does not move.", yes: "Advance the plot track." },
];

// --- Beat trigger cheat sheet (PUM p.28) -----------------------------------
export const BEAT_TRIGGERS = {
  proposal: {
    name: "Use a modified proposal when...",
    items: [
      "You have some idea about what happens next",
      "You ask if things occur as expected, and PUM says NO",
      "The PCs visit or return to a known location",
      "The PCs failed a roll, or something went south",
      "The PCs work on something risky, complicated, or long",
      "The PCs engage in conversation with someone new",
      "Optional: your disruption d10 rolls a 2",
    ],
  },
  prompt: {
    name: "Use a random prompt when...",
    items: [
      "You don't know what happens next, or are uncertain",
      "You ask if something happens, and PUM says YES",
      "The PCs explore, travel through, or arrive at a new location",
      "The PCs face the unknown, or uncertainty is high",
      "The PCs decide to wait, or let significant time pass",
      "You would like to inject additional content into the scene",
      "Optional: your disruption d10 rolls a 1",
    ],
  },
  rule: "Play a plot beat when something relevant to the plot happens, when you run out of ideas, or when you wish to advance the plot track. A beat may, but need not, be confirmed. Confirming marks a box.",
};

// --- The advice chapter (PUM p.10) ----------------------------------------
export const ADVICE = [
  {
    id: "how-often", q: "How often should I ask an oracle?",
    a: "Limit yourself to one or two questions per matter. Asking too many slows your pace, breaks immersion, and produces conflicting results. Oracles are open and vague on purpose.",
  },
  {
    id: "when", q: "When are oracles the right tool?",
    a: "Two moments: when you genuinely don't know something, and when you would simply rather not decide. Avoid rolling if you already have a strong bias toward an answer, or if some outcome would get you stuck. Oracles guide; they do not dictate.",
  },
  {
    id: "stuck-start", q: "What do I do when I'm stuck at the start?",
    a: "Invoke a plot beat of the Random Prompt kind. If the prompt alone isn't enough, ask an oracle for detail — but keep it to one or two questions. Remember to take breaks too.",
  },
  {
    id: "stuck-interpreting", q: "I'm stuck interpreting an oracle answer.",
    a: "Re-roll for a more fitting answer. If you'd rather not, downplay it or go with whatever came to mind first, whether or not it matches. Tables, artwork, tarot cards and music all help here.",
  },
  {
    id: "beat-per-scene", q: "Should I play a plot beat every scene?",
    a: "When learning the system, matching one beat to one scene is the easiest way in. As you master it, detaching beats from scenes is powerful: a scene might invoke several prompts as you detail it, and other scenes proceed without any.",
  },
  {
    id: "prewritten", q: "How do I play pre-written adventures?",
    a: "Either read a little at a time and play carefully back and forth — use the Improvised sheet so PUM interferes least — or treat the adventure as a seed: read a chapter's synopsis, write what matters into your plot nodes, and play your own story with the Story-focus sheet.",
  },
  {
    id: "friends", q: "Can I play with friends?",
    a: "Yes, even without a GM. Two players make an easy session: one asks the oracle, the other interprets, then swap. Delegate disputes to PUM as referee and stay open to different ideas.",
  },
];

// --- Advanced mechanics (PUM p.9) -----------------------------------------
export const ADVANCED = [
  {
    id: "breakthrough", name: "A well-deserved breakthrough",
    text: "When your characters earn a discovery, succeed at an important roll, or reach a milestone but you're unsure what they learned, voluntarily invoke \"Find answers to a pending question\" — rolled or chosen. The Discovery, Reason and Explain oracles do the same job.",
  },
  {
    id: "went-wrong", name: "Things didn't go as planned",
    text: "When characters fail or make a mistake and you're unsure of the consequence, roll an interrupting plot beat and fold it into the scene. The Problem (risk) oracle helps here too.",
  },
  {
    id: "specific-node", name: "Specific plot node invocations",
    text: "You may reference a plot node deliberately instead of rolling a random prompt, and count it as a beat for track purposes: world elements while travelling, potential problems when it's time for a confrontation, useful findings when the PCs have earned one, pending questions when the story justifies an answer.",
  },
  {
    id: "reroll-repeat", name: "Re-roll repeated plot beats",
    text: "You may re-roll a beat whenever the result is the same as last time. The idea is to promote variety.",
  },
  {
    id: "voluntary", name: "Voluntary plot track advances",
    text: "Sometimes the story's own events justify advancing the track. Combining such moments with a beat's randomness is recommended, but advancing without one is acceptable from time to time.",
  },
  {
    id: "timed", name: "Timed plot beats",
    text: "For events you know are coming — a zombie horde, a siege, a power awakening — mark a track box. When you reach it, the event unfolds. It counts as a random prompt for rule purposes, and since you don't know the circumstances in advance, it may still surprise you.",
  },
  {
    id: "custom", name: "Using the custom plot sheet",
    text: "Plot Focus: fill the Random Prompt column with your own list — more character entries for a social game, more challenges for an action one. Plot Track: pre-define its length and sections, or build it up as you go from what actually happens.",
  },
];

// --- For someone who has never played a solo RPG ---------------------------
// The app's own words, not the books'. PUM assumes you already know what solo
// play is; the first-run measurement said a stranger meets five book terms
// before anything tells them they are supposed to be talking.
export const NEW_TO_SOLO = {
  title: "Never played solo before?",
  points: [
    "You are the author and the actors. You describe what your characters do, out loud or on paper — the app never does that part.",
    "When you do not know what happens next, you ask this app instead of a gamemaster. It answers with a prompt, not a verdict, and you decide what the answer means.",
    "It does not resolve actions. Whether the lock opens or the sword lands is your own RPG's job, or yours.",
  ],
  loop: "Say what your characters do → ask when you are unsure → take the answer and keep telling the story.",
};

// The one-line coach on the plot sheet, shown until the first beat is confirmed.
export const FIRST_BEAT_COACH =
  "New here? Roll a beat, say out loud what it means in your story, and only then confirm it — or decide it did not matter and leave the track alone.";

// --- What each machine is for ---------------------------------------------
export const MACHINES = [
  {
    id: "pum", name: "PUM — Plot Unfolding Machine", version: "v9.0",
    text: "The core system. It manages the plot and the game's progress through modified proposals, random prompts and plot-oriented beats. It brings no setting and no task resolution: pick up any RPG from your shelf for that, or narrate it yourself.",
  },
  {
    id: "sum", name: "SUM — Scene Unfolding Machine", version: "v8.0 Rev2",
    text: "A supplement, not a standalone game. Once PUM has told you a beat happens, SUM tells you what the scene offers, how the battle unfolds, who the enemy is, and how the people in it behave, speak and remember.",
  },
  {
    id: "gum", name: "GUM — Game Unfolding Machine", version: "v2.2",
    text: "The third machine: game creation, world-building and prep. It lays the groundwork the other two play on — plot seeds, factions, locations, objects, a nemesis, creatures and characters. Use GUM when setting a game up, and SUM while playing it: GUM creates a character as a concept, SUM decides how they behave when you meet them.",
  },
];

// --- Which machine do I need? ----------------------------------------------
// The app's own words, not either book's. PUM and SUM each say what they are
// for; neither says, at the moment you are stuck, which one to reach for. The
// one line is the whole distinction; the rows are it applied. `go` is where in
// the app each answer lives.
export const WHICH_MACHINE = {
  title: "Which do I need?",
  line: "PUM moves the story; SUM fills in the scene you are in. A beat decides that a fight breaks out — SUM decides how it goes.",
  rows: [
    {
      ask: "What happens next in the story? I am stuck, or drifting. Is this storyline nearly over?",
      use: "PUM · a plot beat", go: ["play", "track"], button: "Call a plot beat",
    },
    {
      ask: "Where am I in the story? How long until this storyline ends?",
      use: "PUM · the plot track", go: ["play", "track"], button: "See the track",
    },
    {
      ask: "One question I cannot answer myself — is it true? what is it like?",
      use: "PUM · an oracle", go: ["oracles", "yesno"], button: "Ask an oracle",
    },
    {
      ask: "How does this scene start, what is here, how does the fight, the clue or the person play out, how does it end?",
      use: "SUM · the scene", go: ["scene", "arc"], button: "Go to the scene",
    },
    {
      // Shown only while the GUM toggle is on (§1.1): a player without the book
      // has no Forge to be sent to.
      ask: "I need a person, a place, a faction or a whole starting situation — before play, or to fill a blank.",
      use: "GUM · the Forge", go: ["more", "forge"], button: "Open the Forge", gum: true,
    },
  ],
  // Appended to the line while GUM is on.
  gumLine: "GUM invents what you prepare — people, places, a starting situation.",
};

// --- The beat and the track, in the app's own words -----------------------
// PUM p.9 and p.11 state the gate — a beat crosses a box only once it has been
// played and judged relevant — but no surface said it where the beat is. These
// are the three steps printed on the beat card itself, above its two answers.
export const BEAT_STEPS = [
  "Read it. Decide what it means in your story — a vague line is doing its job; you supply the specifics.",
  "Play it out. Say what happens now that this is true.",
  "Did it change where the story is going?",
];

// Under the track. {n} is the track's length.
export const TRACK_CAPTION = "Each box is one beat that mattered. Cross all {n} and this storyline ends.";

// The loop that joins the two, drawn as stations beside the track.
export const TRACK_LOOP = [
  { k: "Play", text: "Narrate the scene. Most of the game is this — no roll needed." },
  { k: "Call a beat", text: "Stuck, drifting, or a moment that should matter? Roll a modified proposal or a random prompt." },
  { k: "Play it out", text: "Say what the beat means and what happens because of it." },
  { k: "Judge it", text: "Did it change where the story is going? Yes crosses one box; no leaves the track alone." },
  { k: "The end", text: "When every box is crossed, this storyline is over. Tell its ending." },
];

// --- While a scene is open: the moves, in the order you reach for them -----
// PUM p.5's loop as it plays inside one SUM scene. The first is the game and
// needs no button; each of the rest says when, and carries the button.
export const SCENE_PLAY_STEPS = [
  { when: "Narrate. Say what your character does, two sentences at a time. Most of the game is this — no roll needed." },
  { when: "Not sure of a fact?", move: "oracle" },
  { when: "Stuck, or the story drifting?", move: "beat" },
  { when: "Need detail — what is here, how the fight goes, how someone reacts?", move: "table" },
  { when: "The scene stalling, or tension high?", move: "intervene" },
  { when: "Something changed and the moment is over?", move: "close" },
];

// The book each in-play tab belongs to, on its title line.
export const BOOK_TAGS = {
  play: "PUM · the story",
  oracles: "PUM · one question",
  scene: "SUM · this scene",
  forge: "GUM · invent and prepare",
};

// The app must not pretend to resolve tasks.
export const NO_TASK_RESOLUTION =
  "PUM resolves nothing. It never says whether an action succeeded — it says what the world offers. Bring your own RPG's rules for task resolution, or narrate the outcome yourself.";

// --- The session coach (§6.6 layer -1) --------------------------------------
//
// Every teaching surface this app had was a DOCUMENT: a walkthrough, a glossary,
// a rules library, per-screen notes. All of them ask the player to go and read,
// and the report from play was "I still don't know how to start, sustain, or end
// a game — I'm too lazy to read the manual, I want to play straight from the
// app."
//
// That is a fair request and none of the reading surfaces answer it. This one
// does: the app knows exactly where you are in a session, so it can say the ONE
// next thing and hand you the button. Ordered by the arc of a session, and read
// by src/coach.js against live state — never by the player choosing a stage.
//
// `say` is what is true right now. `next` is the single thing to do about it.
export const SESSION_STAGES = {
  "no-game": {
    title: "Start here",
    say: "Nothing exists yet.",
    steps: [
      "Tap Prepare a game. It asks four short things and every one can be changed later.",
      "If you have no idea what to play, use the Forge on step 1 — it invents a whole starting situation in one roll.",
    ],
    next: "Prepare a game.",
  },
  "no-start": {
    title: "One thing left before you play",
    say: "The game exists, but you have not said where it opens — and a story with no first scene never gets one.",
    steps: [
      "Tap Write the starting point.",
      "Two sentences: where the first scene happens, and what is already going on there.",
      "Open in the middle of something. Do not write the journey to the place; write the moment you arrive.",
    ],
    example: "The raid site, three days cold. The lord's rider is still waiting for an answer.",
    next: "Write the starting point.",
  },
  "first-scene": {
    title: "Ready. Open your first scene",
    say: "A scene is one continuous stretch of story in one place — a conversation, a search, a fight.",
    steps: [
      "Tap Open a scene.",
      "If you know how it begins, write it. If you do not, roll the opener — it names what to describe first.",
      "Then say one or two sentences of what your protagonist sees and does. Out loud, in your head, or typed into the journal. That is you playing.",
    ],
    example: "Nell reins in at the burned wagons. Ash still lifting. Nobody has been here in days.",
    next: "Open a scene and say the first two sentences.",
  },
  "scene-open": {
    title: "This scene has had its beat",
    say: "Keep playing it out. When the moment is over — something changed, or the scene has nowhere left to go — close it and see how the world responds.",
    steps: [
      "Say what your protagonist does. Two sentences is plenty.",
      "Ask yourself one question: do I know what happens next?",
      "If you DO — say it, and go back to step 1. If you DO NOT — Ask an oracle. If you are stuck, you may Call a plot beat again.",
      "When the moment is over, close the scene.",
    ],
    example: "“The smoke clears and the stranger is gone.” The moment is over — close the scene.",
    next: "Play it out, then close the scene when the moment is over.",
  },
  // The app's own split of the scene, from PUM p.10's advice: "When learning
  // the system, matching one beat to one scene is the easiest way in." Until
  // this scene has had its beat, the one next move is that beat; after it, the
  // next move is to close the scene. Nothing forces either — it is the path
  // the pinned button follows.
  "scene-beat": {
    title: "You are in the scene. Play toward its beat",
    say: "Narrate first — the machine stays quiet until you need it. When a moment might matter, or nothing is pulling the story anywhere, call this scene's beat. One beat per scene is the easiest way in.",
    steps: [
      "Say what your protagonist does. Two sentences is plenty.",
      "Not sure of a fact? Ask an oracle. Otherwise keep narrating — you do not need to roll.",
      "When a moment might matter, or you are stuck, call this scene's beat: a random prompt if you have no idea, a modified proposal if you have one.",
      "Play the beat out, then judge it: did it change where the story is going?",
    ],
    example: "“Nell pushes the door open and steps into the smoke.” Something should happen here — call the beat.",
    next: "Narrate, then call this scene's beat when a moment might matter.",
  },
  "beat-open": {
    title: "A beat is on the table",
    say: "The machine has offered something. It is a prompt, not an instruction.",
    steps: [
      "Read it and decide what it means in YOUR story. A vague line is doing its job — you supply the specifics.",
      "Play it out: say what happens now that this is true.",
      "Then ask: did that change where the story is going? It mattered crosses a box. It didn't matter does not. Both are correct answers.",
    ],
    next: "Play the beat out in the fiction, then confirm it or say it did not matter.",
  },
  "scene-over": {
    title: "Between scenes",
    say: "That scene is closed and what happened is in the journal.",
    steps: [
      "Decide where to cut to: later that night, the next town, the confrontation you have been circling.",
      "Open the next scene there. You never have to play the travel in between.",
      "Or stop here for today — a closed scene is the cleanest place in the world to leave a story.",
    ],
    next: "Pick where to cut to, and open the next scene.",
  },
  "endgame": {
    title: "One box left. This is your ending",
    say: "Whatever the next confirmed beat turns out to be, it is the climax of this storyline.",
    steps: [
      "Stop introducing new things. Bring the threads you already have to a head.",
      "Play toward the question this storyline asked — and answer it.",
      "Confirm the last beat when it lands.",
    ],
    next: "Play the ending you can now see, then confirm the last beat.",
  },
  "resolved": {
    title: "The story has reached its end",
    say: "The track is full. That is the machine saying this storyline is over — not that your game is.",
    steps: [
      "Tap Write how it ended. A sentence is enough; a page is fine too.",
      "Say who got what they wanted and who did not, and what is different in the world now.",
      "Leave one thing unfinished if you can — that is where the next storyline starts.",
    ],
    next: "Write how it ended.",
  },
  "ended": {
    title: "You called this one finished",
    say: "Ending a storyline by saying so is always allowed, and it is the only way a sheet with no track ends.",
    steps: [
      "Tap Write how it ended, so the story has a last page rather than just stopping.",
      "Then start the next storyline, or leave the game here.",
    ],
    next: "Write how it ended.",
  },
  "closed": {
    title: "Finished, and written down",
    say: "This storyline is over and its ending is in the journal with the rest of it.",
    steps: [
      "Start another plot sheet to keep going in the same world — the cast, the journal and the game all carry over.",
      "Or leave it here. Everything stays readable, and you can come back whenever.",
    ],
    next: "Start the next plot sheet, or leave the game as it stands.",
  },
};

// What the app asks for when a storyline ends. Not a rule from any book — the
// books have no epilogue procedure (a deliberate absence, like ruling A6's
// missing session boundary) — but ending well is a third of what a player needs
// and no surface offered it.
export const ENDING_PROMPTS = [
  "How did it end? One sentence is enough.",
  "Who got what they wanted, and who did not?",
  "What is different in the world now?",
  "What is still unfinished — a thread you might pick up in the next storyline?",
];
