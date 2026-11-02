/*
 * The Cardiac Case Files — the intro (shown once, before the case board) and the finale
 * (after the last case is closed). Speakers: okafor, narrator. Format: docs/DESIGN.md §6.6.
 */
(function () {
  "use strict";

  CCF.defineStory({
    intro: [
      {
        speaker: "narrator",
        text: "Riverside Heart & Vascular Center, 7:45 a.m. The coffee is strong, your name badge is brand new, and a stack of manila folders is waiting on your desk."
      },
      {
        speaker: "okafor",
        text: "Welcome to the team! I'm Dr. Maya Okafor — your clinical instructor, and the physical therapist supervising your work as our newest **physical therapist assistant**."
      },
      {
        speaker: "okafor",
        text: "Every patient here arrives as a **case file**: the referral, the history, the medications, the vital signs, the exam and the test results. Read it like a detective. The clues are always in there."
      },
      {
        speaker: "okafor",
        text: "Your job is to notice what matters, keep the patient safe, and know when to keep going, when to stop and come get me, and when to **call for help**. We don't diagnose — but we're often the first to spot that something's wrong."
      },
      {
        speaker: "okafor",
        text: "Stuck? Ask me for a hint — it costs a star, but no one ever got hurt by asking. Every answer comes with an explanation, and the **Casebook** has your lecture notes on every condition, drug and test."
      },
      {
        speaker: "okafor",
        text: "Six drawers, six kinds of cases. Start with whatever your class is studying. Inside each drawer the cases get harder as you go. Ready? Let's open the first file."
      }
    ],
    finale: [
      {
        speaker: "narrator",
        text: "The last folder lands on the CLOSED pile with a satisfying thump. Thirty-four patients, thirty-four case files — every one of them in safe hands."
      },
      {
        speaker: "okafor",
        text: "Look at that stack. Angina and heart attacks, rhythm strips and pacemakers, failing pumps, dangerous pressures, clots and cold fingers — you've worked them all."
      },
      {
        speaker: "okafor",
        text: "What makes a great clinician isn't memorizing every fact. It's reading the whole chart, noticing when something doesn't fit, and acting quickly and calmly when it matters."
      },
      {
        speaker: "okafor",
        text: "So it's official: every case file in this building is **closed**. Your certificate is ready to print — and I'd trust you with any of my patients."
      }
    ]
  });
})();
