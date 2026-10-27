/*
 * Syntax & Sorcery — the prologue (shown once, before the map) and the epilogue
 * (shown after the final chapter). Speakers: ada, pip, glitch, hydra, narrator.
 * Each panel is 1–3 short sentences of RichText.
 */
(function () {
  "use strict";

  SS.defineStory({
    prologue: [
      {
        speaker: "narrator",
        text: "Far above the clouds, a tower coils into the sky like a sleeping serpent. This is **Coilspire Academy**, where wizards learn their craft, and tonight its newest apprentice has arrived at the gate: you."
      },
      {
        speaker: "ada",
        text: "Welcome, apprentice! I'm Archmage Ada, headmistress of Coilspire. Here, every spell is written in **Python**, the serpent's tongue."
      },
      {
        speaker: "ada",
        text: "Magic does *exactly* what you say: precisely that, no more and no less. Learn to say what you mean, and there's very little you can't do."
      },
      {
        speaker: "pip",
        text: "Hoo! I'm Pip, your owl familiar, and whenever a spell has you stumped, I'll whisper a hint. I give a hoot about every apprentice!"
      },
      {
        speaker: "glitch",
        text: "Hee hee! Shiny new spells… wouldn't it be a *shame* if someone sprinkled a few bugs in them?"
      },
      {
        speaker: "ada",
        text: "That was Glitch: gremlin, prankster, and the original bug. Don't worry, Python's error messages are clues, not curses. Now, off to the **Apprentice's Tower**, where your first words of power await!"
      }
    ],
    epilogue: [
      {
        speaker: "narrator",
        text: "The whole academy gathers at the top of the Apprentice's Tower, where your journey began. Far below, the tamed Hydra lies coiled around the tower's foot: a Hydra with no fresh subproblems is just a very large, very sleepy lizard."
      },
      {
        speaker: "hydra",
        text: "Sssso… you remembered every one of my headsss. Very well, little wizard: I shall nap. Wake me only for truly *new* problemsss."
      },
      {
        speaker: "glitch",
        text: "I'm sorry I woke the Hydra. And scrambled your spells, and most of the academy. Could I help *find* bugs instead of making them?"
      },
      {
        speaker: "ada",
        text: "Glitch, every great wizard needs someone who spots the mistakes first. Welcome to Coilspire, our very first official spell-tester."
      },
      {
        speaker: "ada",
        text: "As for you, apprentice: by the authority of Coilspire Academy, I name you **Archmage**. Precisely earned."
      },
      {
        speaker: "pip",
        text: "Hoo-ray! The real magic was never the wand: it's breaking big problems into small ones, testing every idea, and trying again when a trial fails. Owl always be proud of you!"
      }
    ]
  });
})();
