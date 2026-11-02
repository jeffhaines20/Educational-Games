/*
 * The Cardiac Case Files — Unit 3: Rhythm Cases.
 * Cases 3.1–3.5 and the unit's Casebook entries (pvc, afib, heart-block, vfib).
 * Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md. Where the game follows current
 * practice instead of a slide (digoxin, complete heart block, PVCs): docs/SOURCE-NOTES.md §0.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 3.1 Too Much Coffee — benign isolated PVCs (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "rhythm-too-much-coffee",
    unit: "rhythm",
    order: 1,
    difficulty: "easy",
    title: "Too Much Coffee",
    teaser: "Exam week, five espressos a day — and a heart that keeps “skipping” a beat.",
    patient: { name: "Maya Chen", age: 24, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right knee pain (patellofemoral pain) — evaluate and treat. From the campus health center.",
        { quote: "Can I ask you something random? All week my heart keeps doing this thump — like it skips a beat and then catches up. It's kind of freaking me out.", by: "Maya" }
      ],
      history: {
        list: [
          "**This week:** several times a day she feels a “thump” in her chest, as if her heart skipped a beat and then gave an extra-hard one. Each lasts a second. No chest pain, no fainting, no light-headedness, no breathlessness.",
          "**Exam week:** studying until 2 a.m.; about **five espressos a day** “to stay awake”; feels wired and anxious.",
          "**Social:** pharmacy student. Started **vaping nicotine** a month ago “to focus”. Doesn't drink alcohol.",
          "**Past medical history:** healthy; no known heart problems. Runs three times a week (paused because of her knee).",
          "**Family:** no heart disease and no sudden deaths in the family."
        ]
      },
      medications: [
        { name: "Ibuprofen", dose: "400 mg as needed for knee pain (about twice a week)", "class": "NSAID (anti-inflammatory pain reliever)" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 84, bp: "114/72", rr: 14, spo2: 99, temp: "98.2 °F", pain: "3/10 (right knee, on stairs)" },
      exam: {
        list: [
          "Right knee: pain on squatting and on stairs; no swelling.",
          "Radial pulse: regular, except for an early beat every 15–20 seconds, followed by a short pause.",
          "Alert and a little restless; breathing comfortable; skin warm and pink."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Maya calls them “skipped beats”. They're **palpitations** — one of the cardinal symptoms of heart disease. What are palpitations?",
        options: [
          { text: "An awareness of the heartbeat — a pounding, racing, irregular or “extra” beat", correct: true, why: "Yes. People aren't normally aware of their heartbeat; they notice it when it beats faster, harder or out of step — like Maya's thump and pause." },
          { text: "Chest pain from a shortage of oxygen to the heart muscle", why: "That's angina. Maya has no chest pain — she notices a thump and a pause." },
          { text: "Fainting, or nearly fainting, because too little oxygen-rich blood is reaching the brain", why: "That's syncope. She hasn't fainted or felt light-headed." },
          { text: "Shortness of breath that comes on with effort", why: "That's dyspnea on exertion. Her breathing is comfortable." }
        ],
        hints: [
          "Three of these options describe other cardinal symptoms: angina, syncope and dyspnea.",
          "Which option matches what Maya is *noticing*, rather than pain or breathlessness?"
        ],
        explain: [
          "**Palpitations** are an awareness of the heartbeat: pounding, racing, fluttering, or an irregular or “extra” beat. Another name for an abnormal rhythm is an *arrhythmia* (or dysrhythmia).",
          "They can come from benign causes — caffeine, anxiety, exercise, mitral valve prolapse, an athlete's heart — or from serious ones such as coronary artery disease, cardiomyopathy, complete heart block or valve disease. That's why new palpitations are always worth a closer look."
        ]
      },
      {
        id: "s2",
        update: {
          title: "Dr. Okafor clips on the monitor",
          text: [
            "While Maya rests on the treatment table, Dr. Okafor attaches the clinic's portable heart monitor. A few seconds later Maya says, “There — did you see that?”"
          ],
          exhibits: [
            {
              id: "strip-rest", type: "ecg", title: "Rhythm strip at rest (lead II)",
              rhythm: "pvc", rate: 80, pvc: { pattern: "isolated", count: 1 }, seconds: 6, lead: "II", seed: 3101,
              caption: "6 seconds, at rest. Maya felt her “thump” at the moment of the odd beat."
            }
          ]
        },
        type: "single",
        prompt: "Find the odd beat on Maya's strip. What is it?",
        options: [
          { text: "A premature ventricular contraction (PVC)", correct: true, why: "Yes: it comes early, has no P wave in front of it, and its QRS is wide (more than 0.12 s) and bizarre — the impulse started in a ventricle, not in the SA node. The pause after it is typical." },
          { text: "A dropped beat from second-degree heart block", why: "In second-degree block a P wave arrives on time but no QRS follows it — a beat is *missing*. Here an *extra*, early beat appears." },
          { text: "Atrial fibrillation", why: "In AFib there are no P waves at all and the whole rhythm is irregularly irregular. Maya's beats are regular, each with a P wave, apart from the one odd beat." },
          { text: "A run of ventricular tachycardia", why: "VT is a run of fast, wide beats one after another. Maya has a single early beat, and then her normal rhythm carries on." }
        ],
        hints: [
          "Does the odd beat come early or late? Is there a P wave in front of it? Is its QRS narrow or wide?",
          "A wide, strange-looking QRS means the impulse didn't travel down the normal conduction pathway — it started somewhere in the ventricles."
        ],
        explain: [
          "A **premature ventricular contraction (PVC)** is an early beat that starts in a ventricle instead of the SA node. On the ECG it is **early, has no P wave before it, and has a wide (more than 0.12 s), bizarre QRS**, usually followed by a pause before the next normal beat.",
          "That pause is the “skip” Maya feels. The next normal beat feels like a thump because the ventricle has had extra time to fill.",
          "PVCs are the most common arrhythmia. When several PVCs all look alike they are **unifocal**; when they look different from each other they are **multifocal** (they start from more than one place)."
        ]
      },
      {
        id: "s3",
        type: "multi",
        prompt: "Which things in Maya's story are known triggers for PVCs? Select all that apply.",
        options: [
          { text: "About five espressos a day", correct: true, why: "Caffeine is a classic trigger of PVCs and palpitations." },
          { text: "Exam stress and anxiety", correct: true, why: "Stress and anxiety raise adrenaline, which makes heart cells more excitable." },
          { text: "Vaping nicotine", correct: true, why: "Nicotine is a stimulant. Smoking — and vaping nicotine — can trigger PVCs." },
          { text: "Drinking alcohol", why: "Alcohol can trigger PVCs too, but Maya doesn't drink — it isn't one of *her* triggers." },
          { text: "Heart damage from a previous heart attack", why: "PVCs are common after an MI, but Maya is 24 with no heart disease. That's reassuring." }
        ],
        hints: [
          "Re-read her history: what is she drinking, inhaling and feeling this week?",
          "Three everyday triggers are in her story. The other two options aren't part of her life."
        ],
        explain: [
          "PVCs are seen in healthy people after **caffeine, smoking (nicotine), anxiety or alcohol**. They also occur with heart disease — after an MI, or with ischemia from CAD or heart failure — and with electrolyte imbalance, chronic lung disease and low blood oxygen (hypoxemia).",
          "In a young, healthy person with everyday triggers, isolated PVCs are usually **benign**. Cutting back on caffeine and nicotine and managing stress often settles them.",
          { tip: "Still tell Dr. Okafor about any new palpitations — and encourage Maya to mention them to her physician, who can decide whether she needs tests such as a Holter monitor." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Back to the knee",
          text: [
            "Dr. Okafor talks with Maya and agrees she can do her knee program on the stationary bike today, with the monitor on.",
            { quote: "So I'm not about to drop dead? Okay. But what should I watch out for?", by: "Maya" }
          ]
        },
        type: "single",
        prompt: "Which finding during her exercise would make you stop and get Dr. Okafor?",
        options: [
          { text: "PVCs coming in pairs — two in a row", correct: true, why: "Yes. Pairs (couplets) during exercise are one of the warning patterns, along with more than 5 PVCs a minute and multifocal PVCs. Stop, monitor and get Dr. Okafor." },
          { text: "An occasional single PVC — about one a minute, all the same shape", why: "Occasional single, unifocal PVCs like the ones she has at rest aren't a reason to stop. Keep watching how often they come and how she feels." },
          { text: "Her heart rate rising from 84 to 130 as she pedals harder", why: "A rising heart rate is the normal response to exercise." },
          { text: "Her PVCs becoming less frequent as her heart rate rises", why: "That's common — and reassuring. Benign PVCs often fade when the heart speeds up with exercise." }
        ],
        hints: [
          "The lecture names three PVC patterns that are a concern during exercise: how many per minute, how they're grouped, and whether they look alike.",
          "Only one option describes a warning pattern; the others are normal or even reassuring."
        ],
        explain: [
          "**During exercise, PVCs are a concern when there are more than 5 a minute, when they come in pairs, or when they are multifocal** (look different from one another). These patterns can progress to ventricular tachycardia or ventricular fibrillation. So can PVCs that come with symptoms: chest pain, dizziness, fainting or breathlessness.",
          "If you see them: stop the exercise, have the patient rest, keep monitoring, and notify the supervising PT.",
          "**Note on the slides:** Lecture 1 (slide 41) says PVCs are potentially life-threatening and need immediate attention from the physician. Today, isolated PVCs like Maya's are known to be common and usually benign; it's the warning patterns above — or PVCs with symptoms — that need urgent attention."
        ]
      }
    ],
    debrief: {
      diagnosis: "Isolated premature ventricular contractions (PVCs) triggered by caffeine, nicotine and stress",
      summary: [
        "Maya's “skipped beats” were palpitations from isolated, unifocal **PVCs** — early, wide, bizarre beats from a ventricle, each followed by a pause. In a healthy 24-year-old with no worrying symptoms, five espressos a day, nicotine and exam stress are the likely triggers.",
        "Isolated PVCs like hers are usually benign. During exercise, the patterns that matter are more than 5 a minute, pairs and multifocal PVCs — or PVCs with symptoms."
      ],
      takeaways: [
        "Palpitations are an awareness of the heartbeat: pounding, racing, irregular or “extra” beats.",
        "A PVC comes early, has no P wave before it, and has a wide (more than 0.12 s), bizarre QRS, usually followed by a pause.",
        "Everyday triggers are caffeine, nicotine (smoking or vaping), anxiety and alcohol; PVCs also follow MI and occur with ischemia, electrolyte imbalance and hypoxemia.",
        "During exercise, stop and notify the PT for PVCs more than 5 a minute, in pairs, multifocal, or with symptoms.",
        "Report new palpitations to the supervising PT, and encourage the patient to tell their physician."
      ],
      sources: ["L1 s3, s40 · Palpitations", "L1 s20 · Selected ECG abnormalities", "L1 s41–42 · Premature ventricular contractions"]
    },
    casebook: ["pvc", "cardinal-symptoms", "ecg-basics"]
  });

  // @@CASES-3.2-3.5@@

  // @@ENTRIES@@
})();
