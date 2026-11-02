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
        { quote: "Can I ask you something random? All week my heart keeps doing this thump — like it skips a beat and then catches up. It's kind of freaking me out.", by: "Ms. Chen" }
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
        prompt: "Ms. Chen calls them “skipped beats”. They're **palpitations** — one of the cardinal symptoms of heart disease. What are palpitations?",
        options: [
          { text: "An awareness of the heartbeat — a pounding, racing, irregular or “extra” beat", correct: true, why: "Yes. People aren't normally aware of their heartbeat; they notice it when it beats faster, harder or out of step — like Ms. Chen's thump and pause." },
          { text: "Chest pain from a shortage of oxygen to the heart muscle", why: "That's angina. Ms. Chen has no chest pain — she notices a thump and a pause." },
          { text: "Fainting, or nearly fainting, because too little oxygen-rich blood is reaching the brain", why: "That's syncope. She hasn't fainted or felt light-headed." },
          { text: "Shortness of breath that comes on with effort", why: "That's dyspnea on exertion. Her breathing is comfortable." }
        ],
        hints: [
          "Re-read her words: what exactly is she feeling her heart do?",
          "Which option matches what Ms. Chen is *noticing*, rather than pain or breathlessness?"
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
            "While Ms. Chen rests on the treatment table, Dr. Okafor attaches the clinic's portable heart monitor. A few seconds later Ms. Chen says, “There — did you see that?”"
          ],
          exhibits: [
            {
              id: "strip-rest", type: "ecg", title: "Rhythm strip at rest (lead II)",
              rhythm: "pvc", rate: 80, pvc: { pattern: "isolated", count: 1 }, seconds: 6, lead: "II", seed: 3101,
              caption: "6 seconds, at rest. Ms. Chen felt her “thump” at the moment of the odd beat."
            }
          ]
        },
        type: "single",
        prompt: "Find the odd beat on Ms. Chen's strip. What is it?",
        options: [
          { text: "A premature ventricular contraction (PVC)", correct: true, why: "Yes: it comes early, has no P wave in front of it, and its QRS is wide (more than 0.12 s) and bizarre — the impulse started in a ventricle, not in the SA node. The pause after it is typical." },
          { text: "A dropped beat from second-degree heart block", why: "In second-degree block a P wave arrives on time but no QRS follows it — a beat is *missing*. Here an *extra*, early beat appears." },
          { text: "Atrial fibrillation", why: "In AFib there are no P waves at all and the whole rhythm is irregularly irregular. Ms. Chen's beats are regular, each with a P wave, apart from the one odd beat." },
          { text: "A run of ventricular tachycardia", why: "VT is a run of fast, wide beats one after another. Ms. Chen has a single early beat, and then her normal rhythm carries on." }
        ],
        hints: [
          "Does the odd beat come early or late? Is there a P wave in front of it? Is its QRS narrow or wide?",
          "A wide, strange-looking QRS means the impulse didn't travel down the normal conduction pathway — it started somewhere in the ventricles."
        ],
        explain: [
          "A **premature ventricular contraction (PVC)** is an early beat that starts in a ventricle instead of the SA node. On the ECG it is **early, has no P wave before it, and has a wide (more than 0.12 s), bizarre QRS**, usually followed by a pause before the next normal beat.",
          "That pause is the “skip” Ms. Chen feels. The next normal beat feels like a thump because the ventricle has had extra time to fill.",
          "PVCs are the most common arrhythmia. When several PVCs all look alike they are **unifocal**; when they look different from each other they are **multifocal** (they start from more than one place)."
        ]
      },
      {
        id: "s3",
        type: "multi",
        prompt: "Which things in Ms. Chen's story are known triggers for PVCs? Select all that apply.",
        options: [
          { text: "About five espressos a day", correct: true, why: "Caffeine is a classic trigger of PVCs and palpitations." },
          { text: "Exam stress and anxiety", correct: true, why: "Stress and anxiety raise adrenaline, which makes heart cells more excitable." },
          { text: "Vaping nicotine", correct: true, why: "Nicotine is a stimulant. Smoking — and vaping nicotine — can trigger PVCs." },
          { text: "Drinking alcohol", why: "Alcohol can trigger PVCs too, but Ms. Chen doesn't drink — it isn't one of *her* triggers." },
          { text: "Heart damage from a previous heart attack", why: "PVCs are common after an MI, but Ms. Chen is 24 with no heart disease. That's reassuring." }
        ],
        hints: [
          "Re-read her history: what is she drinking, inhaling and feeling this week?",
          "Three everyday triggers are in her story. The other two options aren't part of her life."
        ],
        explain: [
          "PVCs are seen in healthy people after **caffeine, smoking (nicotine), anxiety or alcohol**. They also occur with heart disease — after an MI, or with ischemia from CAD or heart failure — and with electrolyte imbalance, chronic lung disease and low blood oxygen (hypoxemia).",
          "In a young, healthy person with everyday triggers, isolated PVCs are usually **benign**. Cutting back on caffeine and nicotine and managing stress often settles them.",
          { tip: "Still tell Dr. Okafor about any new palpitations — and encourage Ms. Chen to mention them to her physician, who can decide whether she needs tests such as a Holter monitor." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Back to the knee",
          text: [
            "Dr. Okafor explains that occasional single PVCs like these are common and usually harmless, encourages Ms. Chen to tell her physician about them, and agrees she can do her knee program on the stationary bike today with the monitor on.",
            { quote: "Okay, that's a relief. So what would be a bad sign?", by: "Ms. Chen" }
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
          "**During exercise, PVCs are a concern when there are more than 5 a minute, when they come in pairs, or when they are multifocal** (look different from one another). These patterns show an irritable ventricle that can go on to ventricular tachycardia or ventricular fibrillation. PVCs that come with symptoms — chest pain, dizziness, fainting or breathlessness — need attention too.",
          "If you see them: stop the exercise, have the patient rest, keep monitoring, and notify the supervising PT.",
          "**Note on the slides:** Lecture 1 (slide 41) says PVCs are potentially life-threatening and need immediate attention from the physician. Today, isolated PVCs like Ms. Chen's are known to be common and usually benign; it's the warning patterns above — or PVCs with symptoms — that need urgent attention."
        ]
      }
    ],
    debrief: {
      diagnosis: "Isolated premature ventricular contractions (PVCs), most likely triggered by caffeine, nicotine and stress",
      summary: [
        "Ms. Chen's “skipped beats” were palpitations from isolated, unifocal **PVCs** — early, wide, bizarre beats from a ventricle, each followed by a pause. In a healthy 24-year-old with no worrying symptoms, five espressos a day, nicotine and exam stress are the likely triggers.",
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

  // ---------------------------------------------------------------------------------------
  // 3.2 The Irregularly Irregular Pulse — new atrial fibrillation (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "rhythm-irregular-pulse",
    unit: "rhythm",
    order: 2,
    difficulty: "medium",
    title: "The Irregularly Irregular Pulse",
    teaser: "A new flutter in his chest — and a pulse with no pattern at all.",
    patient: { name: "Frank Morales", age: 76, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right total hip replacement six weeks ago — gait training and strengthening. From his orthopedic surgeon.",
        { quote: "My chest has been doing a funny flutter since the weekend. And walking in from the parking lot I felt a bit woozy.", by: "Mr. Morales" }
      ],
      history: {
        list: [
          "**Since the weekend (new):** a fluttering feeling in his chest on and off, mild breathlessness when walking, and dizziness after a few minutes on his feet. No chest pain, no fainting.",
          "**Hip:** right total hip replacement six weeks ago; uneventful recovery; walks with a cane.",
          "**Past medical history:** hypertension for 15 years; COPD (former smoker, quit 10 years ago).",
          "**At Dr. Okafor's evaluation two weeks ago:** pulse 74 and regular, BP 132/80, SpO2 95 %.",
          "**Social:** retired carpenter; lives with his wife; one flight of stairs at home."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day" },
        { name: "Tiotropium inhaler (Spiriva)", dose: "1 inhalation once a day" },
        { name: "Acetaminophen", dose: "650 mg as needed for hip pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 112, bp: "126/78", rr: 20, spo2: 94, temp: "98.1 °F", pain: "2/10 (right hip)", rhythm: "irregularly irregular" },
      exam: {
        list: [
          "Radial pulse counted for a full minute: 112, **irregularly irregular** — no two beats the same distance apart, and no pattern.",
          "Alert and talking normally; a little anxious; breathing slightly faster than usual.",
          "Lungs: scattered wheezes, as at his evaluation; no crackles.",
          "No leg swelling; right hip incision well healed."
        ]
      },
      tests: [
        {
          id: "ecg-strip", type: "ecg", title: "Physician's ECG — rhythm strip (lead II)", sealed: true,
          rhythm: "afib", rate: 110, seconds: 6, lead: "II", seed: 3201,
          caption: "6 seconds, recorded at his physician's office the same afternoon."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "His pulse is 112 and **irregularly irregular** — the beats come at random, with no pattern — and that's new since his evaluation. Which rhythm problem best fits?",
        options: [
          { text: "Atrial fibrillation", correct: true, why: "Yes. AFib is the classic cause of an irregularly irregular pulse — often fast, with fluttering, breathlessness and dizziness. His hypertension and COPD are both risk factors." },
          { text: "Atrial flutter", why: "Flutter is fast too, but the atria beat in a *regular* sawtooth rhythm and the pulse is usually regular. His has no pattern at all." },
          { text: "Sinus tachycardia from hip pain or anxiety", why: "Sinus tachycardia is fast but regular, every beat evenly spaced. His pain is only 2/10, and his pulse has no pattern." },
          { text: "Occasional PVCs", why: "PVCs give a regular pulse interrupted now and then by an early beat and a pause. His pulse is irregular all the time." },
          { text: "Complete (third-degree) heart block", why: "Complete block causes a slow, regular pulse — often 20–40 a minute — not a fast, chaotic one." }
        ],
        hints: [
          "Fast and regular? Regular with an occasional early beat? Or irregular with no pattern at all? Decide which kind of pulse he has.",
          "Of the two atrial rhythms in the options, only one is regular."
        ],
        explain: [
          "In **atrial fibrillation** the atria receive far too many impulses — 300 to 600 a minute — and **quiver** instead of contracting. The AV node lets only some of them through, at random, so the ventricles beat **irregularly irregularly**, often fast.",
          "AFib is seen with hypertension, rheumatic heart disease, cardiomyopathy, heart failure, after an MI, with COPD and diabetes, and with illicit drugs or digoxin toxicity. Signs: palpitations, an irregular pulse, dyspnea, chest discomfort, dizziness, weakness and anxiety.",
          { tip: "Always count an irregular pulse for a full 60 seconds — a 15-second count multiplied by 4 can be badly off." }
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "He's alert, his blood pressure is 126/78 and he has no chest pain — but the rhythm is new and he's dizzy. What do you do?",
        options: [
          { text: "Stop, have him sit and rest, monitor him, and consult Dr. Okafor right away", correct: true, why: "Yes. If the PTA suspects atrial fibrillation, the supervising PT should be consulted immediately. She will contact his physician, who will want to see him today." },
          { text: "Carry on with the gait training at a slower pace, rechecking his pulse every 5 minutes", why: "A new arrhythmia with dizziness needs a medical evaluation before exercise continues. Slowing down doesn't make it safe." },
          { text: "Finish the session, then note the irregular pulse so Dr. Okafor sees it tomorrow", why: "Suspected AFib needs the supervising PT *immediately*, not tomorrow." },
          { text: "Call 911 and get the AED — atrial fibrillation stops the heart pumping", why: "AFib lowers the heart's output but doesn't stop it: he's alert and talking, with a stable blood pressure. Call 911 if he faints, has chest pain or becomes unresponsive — and start CPR if he is unresponsive and not breathing normally." },
          { text: "Suggest he take an extra lisinopril tonight to slow his heart down", why: "A PTA never advises changing a medication — and lisinopril lowers blood pressure, not the heart rate." }
        ],
        hints: [
          "He's stable, but the rhythm is new and he has symptoms. Who needs to know, and how soon?",
          "The lecture says what a PTA should do on suspecting atrial fibrillation — and the word it uses is “immediately”."
        ],
        explain: [
          "**If you suspect atrial fibrillation, stop the activity and consult the supervising PT immediately.** New AFib needs a medical evaluation: the physician confirms the rhythm, looks for a cause, controls the heart rate and decides how to prevent clots.",
          { warn: "Call 911 if a patient with AFib faints, has chest pain or severe breathlessness, or becomes unresponsive — and start CPR if they become unconscious and aren't breathing normally." }
        ]
      },
      {
        id: "s3",
        type: "test",
        prompt: "Dr. Okafor calls his physician, who sees him the same afternoon. Which test will confirm the rhythm?",
        options: [
          { text: "An electrocardiogram (ECG)", correct: true, reveals: ["ecg-strip"], why: "Yes — atrial fibrillation is detected through an ECG. Even a single-lead rhythm strip shows its signature." },
          { text: "An echocardiogram", why: "An echo shows the chambers, walls, valves and ejection fraction. His physician may order one to look for a cause, but the rhythm itself is confirmed on an ECG." },
          { text: "A chest X-ray", why: "A chest X-ray shows fluid in the lungs and the size of the heart, not its rhythm." },
          { text: "Cardiac catheterization with coronary angiography", why: "Catheterization shows narrowed coronary arteries. It's invasive and doesn't diagnose a rhythm." }
        ],
        hints: [
          "Which test records the heart's electrical activity?"
        ],
        explain: [
          "Atrial fibrillation is confirmed on an **ECG**. On his strip: **no recognizable P waves**, a wavy, irregular (**fibrillatory**) **baseline**, and **RR intervals that are irregular with no pattern**. The ventricular rate averages about 110 a minute.",
          "Compare **atrial flutter**: the atria beat very fast but *regularly*, drawing a **sawtooth** baseline, and the QRS complexes usually come at regular intervals."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "Dr. Okafor points at the strip: “Notice what's missing before each QRS.” Why does AFib leave him dizzy and breathless?",
        options: [
          { text: "His ventricles lose the atrial kick, and the fast rate leaves them less time to fill", correct: true, why: "Yes. With no P waves, the atria are only quivering — they no longer top up the ventricles. Less filling means less blood per beat, so cardiac output falls: dizziness, breathlessness, weakness." },
          { text: "His ventricles are quivering as well, so almost no blood is leaving his heart with each beat", why: "That's ventricular fibrillation — no effective contraction, no pulse, and collapse within seconds. Mr. Morales has a pulse and is talking." },
          { text: "The irregular rhythm is squeezing and narrowing his coronary arteries", why: "AFib doesn't narrow the coronary arteries. His symptoms come from the heart pumping less blood each minute." },
          { text: "His COPD inhaler is lowering the oxygen level in his blood", why: "Tiotropium opens the airways; it doesn't lower oxygen. His SpO2 (94 %) is close to his usual 95 %." }
        ],
        hints: [
          "Normally the atria contract just before the ventricles, topping them up. What happens to that top-up when the atria only quiver?",
          "Cardiac output = stroke volume × heart rate. A very fast, irregular rate leaves less time to fill, so each beat pumps less."
        ],
        explain: [
          "Normally the atria contract just before the ventricles, adding the last part of their filling — the **atrial kick**. In AFib the atria only quiver, so the kick is lost, and the fast, irregular rate shortens the time the ventricles have to fill. Less blood per beat means a **lower cardiac output**: dizziness, breathlessness, weakness and fatigue.",
          "There's a second danger. Blood moves sluggishly in the quivering atria and can form **clots**, which can travel to the brain and cause a stroke. That's why most people with AFib take an anticoagulant."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Two weeks later",
          text: [
            "Mr. Morales is back. His physician confirmed **atrial fibrillation**, started **metoprolol** to slow his heart rate and **warfarin (Coumadin)** to prevent clots, and cleared him to continue therapy.",
            { quote: "The doctor says I'll bleed more easily now. What does that mean for my exercises?", by: "Mr. Morales" }
          ],
          vitals: { hr: 78, bp: "124/76", rr: 16, spo2: 95, rhythm: "irregularly irregular" }
        },
        type: "multi",
        prompt: "Which precautions fit his new medicines? Select all that apply.",
        options: [
          { text: "Guard closely against falls: clear the path, use a gait belt, practice safe turns", correct: true, why: "A fall on warfarin can cause serious bleeding, including inside the skull. Fall prevention comes first." },
          { text: "Use gentle manual techniques and avoid anything that could bruise or injure him", correct: true, why: "Bleeding and bruising come easily on an anticoagulant." },
          { text: "Teach him which bleeding signs to report: unusual bruising, blood in urine or stools, nosebleeds that won't stop", correct: true, why: "Educating the patient about side effects is part of the PT implications of anticoagulants." },
          { text: "Stop all exercise for as long as he takes warfarin", why: "Exercise is still safe and helpful with precautions — and warfarin for AFib is usually long-term." },
          { text: "Tell him to skip his warfarin on days with harder sessions", why: "Never advise a patient to skip or change a medicine; questions go to his physician. Missed doses raise his stroke risk." },
          { text: "Judge his effort by his target heart rate alone", why: "Metoprolol blunts his heart-rate response to exercise, and the rate in AFib is irregular anyway. Use his rating of perceived exertion (RPE) and his symptoms as well." }
        ],
        hints: [
          "Warfarin slows clotting. What could make him bleed during a session?",
          "Good precautions protect him from injury and teach him what to watch for. They never change his medicines."
        ],
        explain: [
          "**Anticoagulants** such as warfarin (Coumadin) and heparin reduce clotting. In AFib they prevent clots forming in the quivering atria. The main side effect is **bleeding**.",
          "PT implications: avoid injury — falls, bumps, vigorous manual techniques — and **educate** the patient about the bleeding signs to report.",
          { tip: "Metoprolol is a beta blocker: his heart rate will rise less with exercise, so use RPE and symptoms to guide intensity." }
        ]
      }
    ],
    debrief: {
      diagnosis: "New atrial fibrillation with a fast ventricular rate",
      summary: [
        "Mr. Morales's new irregularly irregular pulse of 112, with fluttering, breathlessness and dizziness, was **atrial fibrillation**: the atria quiver at 300–600 impulses a minute, P waves disappear, and the ventricles beat irregularly with no pattern. Losing the atrial kick, plus a fast rate, lowered his cardiac output.",
        "Stopping and consulting the supervising PT immediately was exactly right. Once he was on warfarin, fall prevention and bleeding precautions became part of every session."
      ],
      takeaways: [
        "An irregularly irregular pulse suggests atrial fibrillation; count it for a full minute.",
        "AFib on the ECG: no recognizable P waves, a wavy fibrillatory baseline, and irregular RR intervals with no pattern. Atrial flutter is fast but regular, with a sawtooth baseline.",
        "Losing the atrial kick, plus a fast rate, can lower cardiac output: dizziness, dyspnea, weakness.",
        "If you suspect AFib, stop and consult the supervising PT immediately; call 911 and start CPR if the patient becomes unresponsive and isn't breathing normally.",
        "Anticoagulants such as warfarin prevent clots in AFib but raise the bleeding risk: prevent falls and injury, and teach the bleeding warning signs."
      ],
      sources: ["L1 s27–31 · Atrial fibrillation and flutter", "L1 s53 · Anticoagulant agents", "L1 s56 · Beta blocker agents"]
    },
    casebook: ["afib", "anticoagulants", "beta-blockers", "ecg-basics", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // 3.3 The Fainting Grandfather — complete heart block, then a pacemaker (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "rhythm-fainting-grandfather",
    unit: "rhythm",
    order: 3,
    difficulty: "medium",
    title: "The Fainting Grandfather",
    teaser: "Two faints in one week and a pulse of 36. His granddaughter is worried — so are you.",
    patient: { name: "Earl Jackson", age: 82, sex: "M" },
    setting: "Home health visit",
    file: {
      referral: [
        "**Referral:** home health PT — strengthening and walking after a hospital stay for pneumonia a month ago. From his primary care physician.",
        { quote: "Grandpa fainted twice this week. He says he's just tired, but he went down hard on Tuesday.", by: "Keisha, his granddaughter" }
      ],
      history: {
        list: [
          "**This week:** fainted twice without warning — once getting up from his recliner, once walking to the mailbox. Came round within a minute each time. More tired than usual for a month; light-headed on and off. No chest pain.",
          "**Past medical history:** hypertension; high cholesterol; pneumonia last month (recovered).",
          "**At Dr. Okafor's evaluation ten days ago:** pulse 66 and regular, BP 138/76.",
          "**Social:** retired bus driver; lives with his granddaughter; walks with a cane; four great-grandchildren."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" },
        { name: "Acetaminophen", dose: "500 mg as needed" }
      ],
      allergies: "Penicillin (rash)",
      vitals: { hr: 36, bp: "104/60", rr: 18, spo2: 96, temp: "97.9 °F", rhythm: "slow and regular" },
      exam: {
        list: [
          "Sitting in his recliner: alert and oriented, but pale. Says he feels “woozy” when he leans forward.",
          "Radial pulse: 36 a minute, slow and regular, counted for a full minute.",
          "A bruise on the left forearm from Tuesday's fall; no other injuries found.",
          "Lungs clear; no ankle swelling."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Two faints this week, a pulse of 36, and light-headed right now. What is your priority?",
        options: [
          { text: "Hold the session, keep him seated, and alert Dr. Okafor and his physician now", correct: true, why: "Yes. Fainting with a very slow pulse is cardiac syncope until proven otherwise, and the PT, nurse or physician must be alerted immediately. Keep him seated or lying down so he can't fall, and stay with him." },
          { text: "Start his walking program gently — activity should bring his heart rate up", why: "Exercise could make him faint again — and fall. A heart rate of 36 with fainting needs a medical evaluation before any exercise." },
          { text: "Do seated exercises today and mention the fainting in your visit note", why: "Seated exercise doesn't remove the danger, and a note isn't fast enough: the PT, nurse or physician must be alerted immediately." },
          { text: "Stand him up quickly so you can check his blood pressure for orthostatic hypotension", why: "Standing him up quickly could make him faint again. His pulse of 36 already explains a lot — get help first." }
        ],
        hints: [
          "Fainting plus a very slow pulse: is the brain getting enough blood — and why not?",
          "The lecture says who must be alerted, and how quickly, when a patient faints or is light-headed."
        ],
        explain: [
          "**Syncope** is fainting caused by too little oxygen reaching the brain. When an arrhythmia or coronary artery disease causes it, it's **cardiac syncope** — and the PT, nurse or physician must be alerted **immediately**.",
          "A pulse of 36 can't keep enough blood flowing to his brain, especially when he stands up or walks.",
          { warn: "Call 911 if he faints again, has chest pain or breathlessness, becomes confused or doesn't respond, or if you can't reach the PT or his physician right away — and start CPR if he is unresponsive and isn't breathing normally." }
        ]
      },
      {
        id: "s2",
        update: {
          title: "In the emergency department",
          text: [
            "Dr. Okafor reaches his physician, who sends Mr. Jackson to the emergency department by ambulance. His granddaughter follows in her car. The ED monitor records this strip."
          ],
          exhibits: [
            {
              id: "ed-strip", type: "ecg", title: "Emergency department rhythm strip (lead II)",
              rhythm: "av-block-3", rate: 36, atrialRate: 80, qrs: 0.14, seconds: 6, lead: "II", seed: 3301,
              caption: "6 seconds, recorded on arrival."
            }
          ]
        },
        type: "single",
        prompt: "Which rhythm does the strip show?",
        options: [
          { text: "Third-degree (complete) heart block", correct: true, why: "Yes. The P waves march along regularly at about 80 a minute, while wide QRS complexes come slowly and regularly at about 36 a minute — with no fixed relationship between them. No atrial impulse is getting through; a slow escape rhythm in the ventricles has taken over." },
          { text: "Second-degree heart block, with occasional dropped beats", why: "In second-degree block some P waves are conducted and some are dropped, and the conducted beats follow a predictable PR pattern — lengthening beat by beat (Mobitz I) or fixed (Mobitz II). Here no P wave has a consistent relationship to a QRS." },
          { text: "First-degree heart block, with a long PR interval", why: "In first-degree block every P wave is followed by a QRS, just after a longer-than-normal PR interval (more than 0.20 s). Here the P waves and QRS complexes ignore each other." },
          { text: "Sinus bradycardia from a slow sinus node", why: "In sinus bradycardia each slow beat starts with a P wave, followed at a normal PR interval by a narrow QRS. Here there are about twice as many P waves as QRS complexes, and they don't line up." }
        ],
        hints: [
          "Count the P waves and the QRS complexes separately. Is each P wave followed by a QRS?",
          "Measure from each P wave to the next QRS. Does that distance stay the same, grow steadily, or change at random?"
        ],
        explain: [
          "In **third-degree (complete) heart block** no impulse from the atria reaches the ventricles. The SA node keeps firing — the P waves march on at their own rate — while a backup pacemaker lower down produces a **slow escape rhythm**, here about 36 a minute with wide QRS complexes. P waves and QRS complexes have **no fixed relationship**.",
          "**Note on the slides:** Lecture 1 (slide 37) says complete heart block makes the heart “skip” a beat. Dropped (“skipped”) beats are the sign of **second-degree** block. In complete block *no* atrial impulses get through, and the slow escape rhythm is what keeps the heart beating.",
          "Common causes include age-related scarring of the conduction system, a heart attack, and medicines that slow conduction."
        ]
      },
      {
        id: "s3",
        type: "classify",
        prompt: "Sort these descriptions into the three degrees of heart block.",
        categories: ["First degree", "Second degree", "Third degree (complete)"],
        items: [
          { text: "Every P wave is followed by a QRS, but the PR interval is longer than 0.20 s", category: 0, why: "Impulses are slowed at the AV node, but every one gets through." },
          { text: "Impulses are slowed, but all of them reach the ventricles", category: 0 },
          { text: "Now and then a P wave isn't followed by a QRS — a beat is dropped", category: 1 },
          { text: "The PR interval grows longer and longer until a beat drops, then the cycle repeats", category: 1, why: "This is Mobitz type I (Wenckebach), a form of second-degree block." },
          { text: "The PR interval stays the same, but some P waves are suddenly not conducted", category: 1, why: "This is Mobitz type II, a form of second-degree block that can progress to complete block." },
          { text: "No atrial impulses reach the ventricles", category: 2 },
          { text: "P waves and QRS complexes beat independently; a slow escape rhythm keeps the heart going", category: 2 }
        ],
        hints: [
          "For each description, ask: are all impulses getting through (just slowly), only some of them, or none?"
        ],
        explain: [
          { table: { head: ["Degree", "What happens", "On the ECG"], rows: [
            ["First", "Impulses are slowed, but all reach the ventricles", "Every P wave followed by a QRS; PR interval longer than 0.20 s"],
            ["Second", "Impulses are occasionally blocked", "Some P waves not followed by a QRS (dropped beats): the PR lengthens until a beat drops (Mobitz I), or stays the same with sudden drops (Mobitz II)"],
            ["Third (complete)", "No impulses reach the ventricles", "P waves and QRS complexes independent; a slow escape rhythm"]
          ] } },
          "First-degree block usually causes no symptoms. Mobitz II and complete block can slow the heart enough to cause fatigue, light-headedness and fainting, and usually need a pacemaker."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "What is the usual treatment for complete heart block like his?",
        options: [
          { text: "A permanent pacemaker", correct: true, why: "Yes. A pacemaker is the standard treatment for slow heart rates and conduction problems such as complete heart block." },
          { text: "Defibrillation (an electric shock to the heart)", why: "Defibrillation stops a chaotic rhythm such as ventricular fibrillation. His rhythm is organized but far too slow — a shock wouldn't help." },
          { text: "Digoxin to strengthen each heartbeat", why: "Digoxin slows conduction through the AV node — the last thing a heart with complete block needs." },
          { text: "Coronary artery bypass graft surgery", why: "Bypass surgery reroutes blood around blocked coronary arteries. His problem is electrical, not a blocked artery." }
        ],
        hints: [
          "His heart rate is far too slow. Which treatment makes sure the ventricles get enough impulses?"
        ],
        explain: [
          "Complete heart block usually needs a **pacemaker**: a battery-powered device implanted under the skin, usually in the **upper left chest**, with one to three leads to the heart (single-chamber, dual-chamber or biventricular).",
          "By preventing a slow heart rate, a pacemaker relieves **fatigue, light-headedness and fainting**."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Home again",
          text: [
            "Mr. Jackson had a **dual-chamber pacemaker** implanted in his upper left chest and came home two days later. No more fainting.",
            { quote: "Feel that pulse? Steady as a clock now.", by: "Mr. Jackson" }
          ],
          vitals: { hr: 70, bp: "132/74", rr: 16, spo2: 97, rhythm: "regular" },
          exhibits: [
            {
              id: "paced-strip", type: "ecg", title: "Rhythm strip after the implant (lead II)",
              rhythm: "paced", rate: 70, seconds: 6, lead: "II", seed: 3302,
              caption: "6 seconds, from his pacemaker check."
            },
            {
              id: "discharge-note", type: "note", title: "Discharge instructions (excerpt)", author: "Cardiology nurse",
              text: { list: [
                "For the next 4 weeks: don't raise your left elbow above shoulder height, and don't lift more than 10 lb with your left arm.",
                "Keep the incision clean and dry; report redness, swelling, drainage or fever.",
                "Report dizziness, fainting or a pulse slower than usual."
              ] }
            }
          ]
        },
        type: "single",
        prompt: "What are the sharp, narrow spikes just before each wide QRS on his new strip?",
        options: [
          { text: "Pacing spikes from his pacemaker", correct: true, why: "Yes. Each spike is the pacemaker firing; the wide QRS right after it shows the ventricles responding." },
          { text: "P waves from his SA node", why: "P waves are small, rounded bumps from the atria — not tall, sharp, narrow spikes." },
          { text: "Premature ventricular contractions", why: "PVCs come early, with no spike in front of them. These beats arrive on time, each one led by a spike." },
          { text: "Interference from his muscles moving", why: "Movement makes a fuzzy, irregular baseline — not one neat spike before every beat." }
        ],
        hints: [
          "What new device does he have, and what does it send to his heart?"
        ],
        explain: [
          "On a **paced** rhythm strip, each **pacing spike** (a sharp vertical line) is the pacemaker's electrical impulse. The QRS that follows is wide because the impulse starts in the ventricle wall rather than travelling down the normal conduction pathway.",
          "Pacemaker checks — and Holter monitoring — confirm the device is working.",
          { tip: "After an implant, follow the physician's arm precautions (like his: no raising the elbow on the pacemaker side above shoulder height and no heavy lifting for several weeks — the details vary between hospitals), and check with the supervising PT before using electrical stimulation, which can interfere with a pacemaker." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Third-degree (complete) heart block causing cardiac syncope, treated with a dual-chamber pacemaker",
      summary: [
        "Mr. Jackson's fainting, fatigue and pulse of 36 came from **complete heart block**: no impulses from his atria reached his ventricles, and a slow escape rhythm kept his heart going — too slowly to keep his brain supplied when he stood or walked.",
        "Cardiac syncope means alerting the PT, nurse or physician immediately. A pacemaker in his upper left chest now keeps his rate up, and the fainting has stopped."
      ],
      takeaways: [
        "Fainting or light-headedness with a slow pulse is cardiac syncope until proven otherwise: stop, keep the patient safe, and alert the PT, nurse or physician immediately.",
        "First-degree block: every impulse gets through, slowly (PR longer than 0.20 s). Second-degree: some impulses are blocked (dropped beats). Third-degree: none get through.",
        "In complete block the P waves and QRS complexes are independent and a slow escape rhythm takes over — the heart doesn't just “skip” beats.",
        "Pacemakers treat slow rates and conduction problems, relieving fatigue, light-headedness and fainting; pacing spikes appear just before the paced beats."
      ],
      sources: ["L1 s37 · Heart block", "L1 s44 · Syncope", "L1 s63–64 · Cardiac pacemaker", "L1 s48 · Holter monitoring"]
    },
    casebook: ["heart-block", "procedures", "ecg-basics", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // 3.4 Yellow Halos — digitalis toxicity (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "rhythm-yellow-halos",
    unit: "rhythm",
    order: 4,
    difficulty: "hard",
    title: "Yellow Halos",
    teaser: "Off her food, queasy and weak — and every lamp in the room wears a yellow ring.",
    patient: { name: "Beatrice Novak", age: 81, sex: "F" },
    setting: "Home health visit",
    file: {
      referral: [
        "**Referral:** home health PT — strengthening and fall prevention; heart failure. Twice-weekly visits; today is your fourth.",
        { quote: "I haven't felt like eating for three days, dear. And it's the strangest thing — all the lamps have a yellow ring around them.", by: "Mrs. Novak" }
      ],
      history: {
        list: [
          "**Past three days:** poor appetite, nausea, vomited twice yesterday (no blood); weak and tired. Sees yellow halos around lights. No chest pain, no fever, no diarrhea.",
          "**Past medical history:** heart failure (ejection fraction 35 %); atrial fibrillation; hypertension; mild chronic kidney disease.",
          "**Two weeks ago:** her physician doubled her furosemide for ankle swelling.",
          "**At your last visit (four days ago):** pulse 76 and irregular, BP 124/70, weight 138 lb; walked 150 feet with her walker.",
          "**Social:** widowed; lives alone in a first-floor apartment; her son visits daily and fills her pill organizer every Sunday."
        ]
      },
      medications: [
        { name: "Digoxin", dose: "0.125 mg once a day" },
        { name: "Furosemide (Lasix)", dose: "40 mg twice a day (was once a day until two weeks ago)" },
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Warfarin", dose: "3 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 52, bp: "106/62", rr: 18, spo2: 95, temp: "97.8 °F", weight: "134 lb (138 lb four days ago)", rhythm: "irregular" },
      exam: {
        list: [
          "Sitting in her armchair, pale and tired. Knows who and where she is, but isn't sure of the day — new since your last visit.",
          "Pulse 52 and irregular, counted for a full minute (usually about 76).",
          "No facial droop; speech clear; grips equal; moves all limbs normally.",
          "Lungs clear; trace ankle edema, unchanged; mouth dry.",
          "No bruising; she says her stools are a normal brown."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which explanation best fits Mrs. Novak's new symptoms?",
        options: [
          { text: "Digitalis (digoxin) toxicity", correct: true, why: "Yes. Loss of appetite, nausea and vomiting, a slower irregular pulse, new confusion and — the giveaway — yellow halos around lights, in someone taking digoxin." },
          { text: "Worsening heart failure", why: "Worsening failure brings weight *gain*, more swelling and more breathlessness. She has lost 4 lb, her lungs are clear and her ankles are unchanged." },
          { text: "A stroke caused by her atrial fibrillation", why: "AFib does raise the risk of stroke, but a stroke comes on suddenly, with signs such as facial droop, arm weakness or slurred speech. Hers came on over three days, with nausea, and her neuro checks are normal." },
          { text: "A stomach virus", why: "A virus can cause nausea and vomiting, but not yellow halos or a pulse that has slowed from 76 to 52. She has no fever or diarrhea either." },
          { text: "Internal bleeding from her warfarin", why: "Bleeding would show as bruising, blood in the vomit or black stools — she has none of these — and it wouldn't explain the yellow halos." }
        ],
        hints: [
          "One of her symptoms is almost unique to one of her medicines.",
          "Check each option against her weight, her lungs, her neuro checks and her pulse."
        ],
        explain: [
          "**Digitalis toxicity** happens when digoxin builds up in the blood. Its signs: **loss of appetite (anorexia), nausea and vomiting, an irregular or slow heartbeat**, and visual changes — classically **yellow halos around objects**, or blurred vision. Older adults often become confused or weak.",
          "The gap between a helpful dose of digoxin and a toxic one is small, so a change in the kidneys, the potassium level or the body's fluids can tip a patient over."
        ]
      },
      {
        id: "s2",
        type: "multi",
        prompt: "Which findings in her file fit digitalis toxicity? Select all that apply.",
        options: [
          { text: "Three days of poor appetite", correct: true, why: "Anorexia is often one of the first signs." },
          { text: "Nausea and vomiting", correct: true, why: "A classic sign of digitalis toxicity." },
          { text: "Yellow halos around lights", correct: true, why: "Yellow (or green) halos and blurred vision are typical of digitalis toxicity." },
          { text: "Pulse 52 and irregular (usually 76)", correct: true, why: "Too much digoxin slows conduction through the AV node too much; it can also cause other arrhythmias." },
          { text: "New confusion about the day", correct: true, why: "Confusion is a common sign of digitalis toxicity in older adults." },
          { text: "Trace ankle edema, unchanged", why: "That's her chronic heart failure — and it hasn't changed." },
          { text: "Clear lungs", why: "Clear lungs argue against worsening left-sided heart failure; they aren't a sign of toxicity." }
        ],
        hints: [
          "Go through the lecture's list of digitalis toxicity signs and look for each one in her file.",
          "Two of the options describe her heart failure, not her medicine."
        ],
        explain: [
          "Lecture 2 lists the signs of digitalis toxicity as **nausea, vomiting and an irregular heartbeat** (slide 39) and **anorexia, nausea, vomiting and yellow halos around visual images** (slide 72). In older adults, **confusion and weakness** are common too.",
          "Any of these in a patient taking digoxin should make you think of toxicity — long before anyone checks a blood level."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "You suspect digitalis toxicity. What do you do?",
        options: [
          { text: "Skip the exercise, stay with her, and contact Dr. Okafor and her physician now", correct: true, why: "Yes. Toxicity needs prompt medical attention — usually blood tests the same day. Stay with her and keep checking her; her physician decides about the medicine." },
          { text: "Tell her to stop taking her digoxin until she feels better", why: "Never tell a patient to stop or change a medicine. Her physician decides — after checking her digoxin and potassium levels." },
          { text: "Do a short, gentle session to lift her energy, then report at the end of the day", why: "Exercise isn't safe with a slow, irregular pulse and suspected toxicity, and the report can't wait until the end of the day." },
          { text: "Encourage her to drink extra fluids and recheck her at Thursday's visit", why: "Fluids won't fix a toxic digoxin level, extra fluid can be harmful in heart failure, and she needs medical attention today — not on Thursday." }
        ],
        hints: [
          "Who decides what happens to her medicines — and how soon do they need to know?"
        ],
        explain: [
          "Suspected digitalis toxicity needs **prompt medical attention**: no exercise today, stay with her, keep monitoring her pulse and symptoms, and contact the supervising PT and her physician (or the agency nurse) right away.",
          "A PTA never adjusts or stops a medication — but reporting possible side effects quickly is part of the job.",
          { warn: "Call 911 if she faints, has chest pain, or becomes more confused or unresponsive." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Results from the hospital",
          text: [
            "Her physician sends her to the hospital for blood tests and an ECG. Dr. Okafor shares the results with you."
          ],
          exhibits: [
            {
              id: "hospital-labs", type: "labs", title: "Blood tests",
              rows: [
                { name: "Digoxin level", value: 3.1, unit: "ng/mL", ref: "0.5–2.0", flag: "high" },
                { name: "Potassium", value: 2.9, unit: "mEq/L", ref: "3.5–5.0", flag: "low" },
                { name: "Sodium", value: 136, unit: "mEq/L", ref: "135–145", flag: null },
                { name: "BUN", value: 38, unit: "mg/dL", ref: "7–20", flag: "high" },
                { name: "Creatinine", value: 1.6, unit: "mg/dL", ref: "0.6–1.1", flag: "high" },
                { name: "INR", value: 2.6, unit: "", ref: "2.0–3.0 (target on warfarin)", flag: null }
              ],
              note: "Her creatinine was 1.2 mg/dL three months ago."
            },
            {
              id: "hospital-strip", type: "ecg", title: "Hospital rhythm strip (lead II)",
              rhythm: "afib", rate: 52, seconds: 6, lead: "II", seed: 3401,
              caption: "6 seconds, on arrival."
            }
          ]
        },
        type: "single",
        prompt: "Her potassium is low, and low potassium makes digoxin toxicity much more likely. Which of her other medicines most likely lowered it?",
        options: [
          { text: "Furosemide", correct: true, why: "Yes. Furosemide is a diuretic: it flushes potassium out along with sodium and water — and her dose was doubled two weeks ago. Vomiting added to the loss, and dehydration strained her kidneys, so less digoxin was cleared." },
          { text: "Lisinopril", why: "ACE inhibitors tend to *raise* potassium (hyperkalemia), not lower it." },
          { text: "Warfarin", why: "Warfarin affects clotting, not potassium. Her INR is in its target range." }
        ],
        hints: [
          "Which of her medicines makes the kidneys get rid of more sodium and water — and what goes out with them?",
          "Her chart shows that one dose was recently increased."
        ],
        explain: [
          "**Diuretics** such as furosemide cause **electrolyte imbalance**, especially low potassium. Low potassium makes the heart far more sensitive to digoxin, so toxicity can appear even at a usual dose. Dehydration and weaker kidneys (her creatinine has risen) let digoxin build up too.",
          "Her strip shows atrial fibrillation with a **slow** ventricular rate, about 50 a minute: the high digoxin level is slowing the AV node too much. That adds to her weakness and fatigue.",
          { tip: "For any patient taking digoxin and a diuretic, watch for muscle weakness or cramps and an irregular or slow pulse — and report them." }
        ]
      },
      {
        id: "s5",
        update: {
          title: "A week later",
          text: [
            "Her physician held the digoxin, corrected her potassium and fluids, adjusted her furosemide and restarted digoxin at a lower dose. The halos and the nausea are gone, and she's eating again.",
            { quote: "What is that digoxin supposed to do for my heart rhythm, anyway?", by: "Mrs. Novak" }
          ],
          vitals: { hr: 74, bp: "120/70", rr: 16, spo2: 96, rhythm: "irregular" }
        },
        type: "single",
        prompt: "Which answer to Mrs. Novak's question is correct?",
        options: [
          { text: "It slows conduction through the AV node, so the ventricles beat more slowly", correct: true, why: "Yes. Digoxin controls the *ventricular rate*. Her atria keep fibrillating — the rhythm is still AFib, just at a safer rate." },
          { text: "It stops the atria from fibrillating, so her heart returns to a normal sinus rhythm", why: "A common misconception — and the way Lecture 1 (slide 31) words it. Digoxin doesn't convert AFib: her atria are still fibrillating, with the ventricular rate under control." },
          { text: "It thins her blood so clots can't form in her atria", why: "That's what her warfarin does." },
          { text: "It removes extra fluid so her heart has less to pump", why: "That's her furosemide, a diuretic." }
        ],
        hints: [
          "In AFib, the AV node is the gatekeeper between the quivering atria and the ventricles.",
          "Her hospital strip still showed atrial fibrillation — just slower."
        ],
        explain: [
          "**Digoxin** slows conduction through the AV node (and strengthens the heart's contraction). In atrial fibrillation, fewer of the chaotic atrial impulses reach the ventricles, so the **ventricular rate** is slower. It **does not restore sinus rhythm**.",
          "**Note on the slides:** Lecture 1 (slide 31) says digitalis slows the atrial contractions and restores them to functional contraction. Current understanding: digoxin controls how fast the ventricles beat; the atria keep fibrillating.",
          "That's also why too much digoxin shows up as a **slow** (and irregular) pulse — like her 52."
        ]
      }
    ],
    debrief: {
      diagnosis: "Digitalis (digoxin) toxicity, made more likely by low potassium from furosemide",
      summary: [
        "Mrs. Novak's loss of appetite, nausea and vomiting, slow irregular pulse, new confusion and yellow halos were **digitalis toxicity**. A doubled dose of furosemide had lowered her potassium and dried her out, so her usual digoxin dose built up to a toxic level.",
        "Skipping the exercise, staying with her and getting the PT and her physician involved right away was the right call — and so was leaving every decision about her medicines to her physician."
      ],
      takeaways: [
        "Digitalis toxicity: anorexia, nausea and vomiting, an irregular or slow pulse, yellow halos or blurred vision — and confusion in older adults.",
        "Diuretics such as furosemide can lower potassium; low potassium, dehydration and kidney disease all raise the risk of digoxin toxicity.",
        "Suspected toxicity: no exercise, stay with the patient, contact the supervising PT and the physician promptly; call 911 for fainting, chest pain or unresponsiveness.",
        "In atrial fibrillation, digoxin slows the ventricular rate at the AV node — it does not restore sinus rhythm.",
        "A PTA never tells a patient to stop or change a medicine; report possible side effects instead."
      ],
      sources: ["L2 s39 · CHF management and digitalis toxicity", "L2 s72 · Signs of digitalis toxicity", "L1 s31 · Atrial fibrillation treatment", "L1 s58 · Diuretic agents"]
    },
    casebook: ["digoxin", "diuretics", "afib", "heart-failure", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // 3.5 Collapse in the Gym — ventricular fibrillation and the emergency response (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "rhythm-collapse-in-the-gym",
    unit: "rhythm",
    order: 5,
    difficulty: "hard",
    title: "Collapse in the Gym",
    teaser: "Five weeks after his heart attack he's pedaling well — until the monitor alarm sounds.",
    patient: { name: "Robert Hayes", age: 61, sex: "M" },
    setting: "Cardiac rehabilitation gym (phase II, telemetry-monitored)",
    file: {
      referral: [
        "**Referral:** phase II cardiac rehabilitation after an anterior myocardial infarction five weeks ago. Today is session 9 of 36.",
        { quote: "Feeling good today. My wife says I'm finally getting my color back.", by: "Mr. Hayes" }
      ],
      history: {
        list: [
          "**Five weeks ago:** anterior STEMI; a stent was placed in his proximal left anterior descending (LAD) artery the same day. Echo before discharge: ejection fraction 40 %.",
          "**Sessions 1–8:** uneventful; treadmill and bike at RPE 11–13; an occasional single PVC on telemetry.",
          "**This week:** a 48-hour Holter monitor, ordered after he felt “flip-flops” in his chest at home (report below). His cardiologist reviewed it, adjusted his medicines, booked him to see a heart-rhythm specialist next week, and approved continuing monitored rehab.",
          "**Risk factors:** former smoker (quit after the MI); high cholesterol; his brother had an MI at 55."
        ]
      },
      medications: [
        { name: "Metoprolol succinate", dose: "50 mg once a day" },
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Clopidogrel (Plavix)", dose: "75 mg once a day" },
        { name: "Atorvastatin", dose: "80 mg once a day" },
        { name: "Lisinopril", dose: "5 mg once a day" },
        { name: "Nitroglycerin", dose: "0.4 mg under the tongue as needed for chest pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 64, bp: "124/78", rr: 14, spo2: 98, rhythm: "regular, with an occasional early beat" },
      exam: {
        list: [
          "Before exercise: alert, chatty, no symptoms.",
          "Warm-up telemetry: sinus rhythm with an occasional single PVC.",
          "Lungs clear; no ankle swelling."
        ]
      },
      tests: [
        {
          id: "holter-report", type: "report", title: "48-hour Holter monitor report",
          text: [
            "**Underlying rhythm:** sinus rhythm, 52–118 a minute.",
            "**Ventricular ectopy:** frequent PVCs — about 2,900 in 48 hours — of three different shapes (**multifocal**), with **18 couplets** (pairs). One 3-beat run of ventricular tachycardia at 2:14 a.m., without symptoms.",
            "**Diary:** “flip-flops” at 7 p.m. on day 1 matched runs of PVCs.",
            "**Impression:** frequent multifocal ventricular ectopy after a recent anterior MI."
          ]
        },
        {
          id: "holter-strip", type: "ecg", title: "Holter sample strip (lead II)",
          rhythm: "pvc", rate: 72, pvc: { pattern: "multifocal", count: 2 }, seconds: 6, lead: "II", seed: 3501,
          caption: "6 seconds from day 1, 7:02 p.m."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        update: {
          title: "Minute 12 on the bike",
          text: [
            "Mr. Hayes has been pedaling steadily at RPE 12. The telemetry alarm sounds. You look up from the monitor to see him slump forward over the handlebars. He doesn't respond when you shout his name, and he is making only occasional gasping breaths."
          ],
          exhibits: [
            {
              id: "alarm-strip", type: "ecg", title: "Telemetry at the alarm (lead II)",
              rhythm: "vfib", seconds: 6, lead: "II", seed: 3502,
              caption: "6 seconds, printed by the monitor when the alarm sounded."
            }
          ]
        },
        type: "single",
        prompt: "Which rhythm is on the monitor?",
        options: [
          { text: "Ventricular fibrillation", correct: true, why: "Yes: chaotic, irregular waves with no recognizable P waves, QRS complexes or T waves. The ventricles are quivering, not contracting — no blood is being pumped." },
          { text: "Ventricular tachycardia", why: "VT shows wide QRS complexes in a fast, *regular* row. This strip has no QRS complexes at all." },
          { text: "Atrial fibrillation", why: "In AFib the baseline is wavy, but clear QRS complexes still appear, irregularly. Here there are none — and the patient has collapsed." },
          { text: "A loose electrode (artifact)", why: "Artifact can look chaotic — that's why you always check the patient, not just the monitor. But he is unresponsive and only gasping: this is cardiac arrest." }
        ],
        hints: [
          "Can you find a single QRS complex on the strip?",
          "Look at the patient as well as the monitor: unresponsive, with only occasional gasps."
        ],
        explain: [
          "**Ventricular fibrillation (VF)** is chaotic electrical activity in the ventricles: they quiver instead of contracting, so there is **no effective pumping, no pulse and no blood pressure**. Within seconds the person collapses.",
          "VF is fatal unless it is treated immediately — with **CPR and defibrillation**.",
          { warn: "Occasional gasps are *not* normal breathing. Unresponsive and not breathing normally means cardiac arrest: start the emergency response at once." }
        ]
      },
      {
        id: "s2",
        type: "order",
        prompt: "Put your emergency actions in the right order.",
        items: [
          "Check that he's unresponsive and not breathing normally (in no more than 10 seconds)",
          "Shout for help: activate the emergency response and have someone bring the AED",
          "Get him onto the floor and start chest compressions — hard and fast in the center of the chest",
          "Attach the AED pads and deliver a shock when the AED advises one",
          "Resume CPR immediately after the shock, starting with compressions"
        ],
        hints: [
          "Help and the AED should be on their way before you start compressions — but you don't wait for them to arrive.",
          "After a shock, don't pause to check the monitor: what the heart needs next is blood flow."
        ],
        explain: [
          { olist: [
            "**Check** responsiveness and breathing: tap and shout, and look for normal breathing. Healthcare providers check for a pulse at the same time — for no more than 10 seconds.",
            "**Shout for help**, activate the emergency response (the code team or 911), and send someone for the **AED**.",
            "**Start chest compressions** on a firm surface: hard (at least 2 inches deep) and fast (100–120 a minute), letting the chest recoil fully, with as few pauses as possible — 30 compressions to 2 breaths.",
            "**Attach the AED** as soon as it arrives and follow its prompts. Deliver a shock if it advises one, with no one touching him.",
            "**Resume CPR immediately** after the shock, starting with compressions; the AED rechecks the rhythm every 2 minutes."
          ] },
          "Every minute without CPR and defibrillation lowers the chance of survival. That's why all clinicians — PTAs included — are trained in CPR and the AED."
        ]
      },
      {
        id: "s3",
        update: {
          title: "The AED arrives",
          text: [
            "A nurse runs in with the AED. You keep compressing while she attaches the pads. “Analyzing heart rhythm… Shock advised. Stand clear.”"
          ]
        },
        type: "single",
        prompt: "What does the shock do?",
        options: [
          { text: "It stops the chaos, so the heart's own pacemaker can restart a normal rhythm", correct: true, why: "Yes. The shock depolarizes the whole heart at once, briefly stopping the chaotic activity, so the SA node has a chance to take over again with an organized rhythm." },
          { text: "It jump-starts a heart that has stopped beating altogether and shows a flat line", why: "A flat line (asystole) is not shockable — there is no chaotic activity to reset. It needs CPR and medications. Shocks are for VF (and pulseless VT)." },
          { text: "It makes every heart muscle fiber contract harder, so each beat pumps more blood around the body", why: "A shock doesn't strengthen contraction; it resets the electrical chaos. Until an organized rhythm returns, your compressions are the only thing moving blood." },
          { text: "It speeds up a heart that's beating too slowly", why: "That's what a pacemaker does for slow rhythms such as complete heart block." }
        ],
        hints: [
          "The lecture says the shock overrides the abnormal rhythm and stops the heartbeat. What is that meant to allow?"
        ],
        explain: [
          "**Defibrillation** sends a strong electric current through the heart. It stops the chaotic rhythm — briefly stopping the heart — so the SA node can take over again with an organized rhythm. In the lecture's words, it aims to override the abnormal rhythm, stop the heartbeat and stimulate a return to the normal rhythm.",
          "That's why CPR goes on around it: compressions keep blood flowing to the heart and brain, which makes a shock more likely to work, and they restart straight after it while the heart recovers."
        ]
      },
      {
        id: "s4",
        update: {
          title: "Handover",
          text: [
            "Two minutes after the shock, the AED rechecks: no shock advised. Mr. Hayes coughs, moves and starts breathing on his own, with a pulse. The code team takes over and moves him to the cardiac intensive care unit.",
            "That afternoon, Dr. Okafor talks the event through with the team."
          ]
        },
        type: "multi",
        prompt: "Which of these are common causes of ventricular fibrillation? Select all that apply.",
        options: [
          { text: "Ischemia or an acute heart attack", correct: true, why: "The most common cause. After an MI, scarred and recovering heart muscle is electrically irritable." },
          { text: "Respiratory failure with severe hypoxia", correct: true, why: "A heart starved of oxygen becomes electrically unstable." },
          { text: "A massive pulmonary embolism", correct: true, why: "A massive PE is on the lecture's list of VF causes." },
          { text: "An electric shock, such as electrocution", correct: true, why: "An outside electric current can throw the ventricles into fibrillation." },
          { text: "Advanced heart block", correct: true, why: "Advanced heart block is on the lecture's list of VF causes." },
          { text: "A cup of coffee before the session", why: "Caffeine can trigger isolated PVCs, which are usually harmless in a healthy heart. A cup of coffee is not a cause of VF." },
          { text: "The slower heart rate from his beta blocker", why: "Beta blockers actually *lower* the risk of dangerous ventricular arrhythmias after an MI — one reason he takes metoprolol." }
        ],
        hints: [
          "The lecture's list includes heart causes, lung causes and one cause from outside the body.",
          "Two options don't cause VF — and one of them helps to prevent it."
        ],
        explain: [
          "Common causes of VF (Lecture 1, slide 47): **ischemia, acute infarction and CAD; respiratory failure (hypoxia); massive pulmonary embolism; electric shock; cardiac pacing; and advanced heart block**.",
          "After an MI, scarred and recovering heart muscle is electrically irritable — the setting for frequent PVCs, runs of ventricular tachycardia and VF."
        ]
      },
      {
        id: "s5",
        type: "single",
        prompt: "Looking back at his file, which finding was the earlier warning that his ventricles were electrically unstable?",
        options: [
          { text: "Frequent multifocal PVCs and couplets on his Holter", correct: true, why: "Yes. After an MI, PVCs that are frequent, paired or multifocal — and runs of VT — show irritable ventricles, and PVCs can progress to VT or VF. That's why he exercised on telemetry, with an AED close by." },
          { text: "A resting heart rate of 64 while taking metoprolol", why: "A resting rate in the 60s is the expected effect of a beta blocker." },
          { text: "Exercising at RPE 11–13 in his first eight sessions", why: "That's the planned light-to-moderate intensity for phase II cardiac rehab." },
          { text: "His wife saying his color is coming back", why: "That's good news — a sign of recovery, not a warning." }
        ],
        hints: [
          "Which result in his file showed his ventricles misbehaving before today?",
          "Think about the PVC patterns that are a concern."
        ],
        explain: [
          "PVCs **can progress to ventricular tachycardia or ventricular fibrillation**, especially after an MI. The warning patterns are **more than 5 a minute during exercise, pairs, and multifocal PVCs** — and runs of VT.",
          "That's why patients like Mr. Hayes exercise on telemetry, with staff trained in CPR and an AED within reach. Here it worked: CPR straight away and a shock within minutes.",
          { tip: "Before each session, check the file for new results — and tell the supervising PT about any new or increasing PVCs you see on the monitor." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Cardiac arrest from ventricular fibrillation after a recent MI, treated with CPR and defibrillation",
      summary: [
        "Five weeks after an anterior MI, Mr. Hayes's irritable ventricles — frequent multifocal PVCs and couplets on his Holter — degenerated into **ventricular fibrillation** on the bike. With no effective contraction there was no pulse, and he collapsed.",
        "Recognizing cardiac arrest, calling for help and the AED, starting compressions, shocking when advised and resuming CPR straight away gave him the best chance. He was handed over to the code team breathing on his own."
      ],
      takeaways: [
        "VF is chaotic ventricular activity with no QRS complexes, no effective contraction and no pulse — fatal without immediate CPR and defibrillation.",
        "Unresponsive and not breathing normally (gasping is not normal breathing) means cardiac arrest.",
        "The sequence: check responsiveness and breathing → shout for help, activate the emergency response, get the AED → start compressions → shock when the AED advises → resume CPR immediately.",
        "Defibrillation stops the chaotic rhythm so the heart's own pacemaker can restart an organized one.",
        "PVCs can progress to VT and VF: frequent, paired or multifocal PVCs after an MI are a warning sign."
      ],
      sources: ["L1 s45–47 · Ventricular fibrillation", "L1 s41–42 · Premature ventricular contractions", "L1 s20 · PVCs during exercise", "L1 s48 · Holter monitoring"]
    },
    casebook: ["vfib", "pvc", "procedures", "mi", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook: conditions
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "pvc", kind: "condition", unit: "rhythm",
    title: "Premature ventricular contractions (PVCs)",
    aka: ["PVC", "ventricular ectopy", "extra beats", "skipped beats", "unifocal", "multifocal", "couplets", "bigeminy"],
    summary: "An early beat that starts in a ventricle instead of the SA node. PVCs are the most common arrhythmia: often harmless, but frequent, paired or multifocal PVCs signal an irritable heart.",
    sections: [
      { heading: "What it is", body: [
        "A ventricle fires before the next normal impulse arrives, so the beat comes **early**. The impulse spreads through the ventricle muscle instead of the normal conduction pathway, so the QRS is **wide (more than 0.12 s) and bizarre**, with **no P wave** in front of it. A pause usually follows — people often feel it as a “skipped” beat and then a thump.",
        { list: [
          "**Unifocal:** the PVCs all look alike (one starting point).",
          "**Multifocal:** they look different from each other (more than one starting point).",
          "**Couplet:** two PVCs in a row. **Bigeminy:** every other beat is a PVC.",
          "Three or more in a row at a fast rate: a run of **ventricular tachycardia**."
        ] }
      ] },
      { heading: "Causes and triggers", body: { list: [
        "In healthy people: **caffeine, smoking or nicotine, anxiety, alcohol**.",
        "Heart disease: after a **myocardial infarction**; ischemia from **CAD**; heart failure.",
        "**Electrolyte imbalance**, chronic lung disease, **hypoxemia** (low blood oxygen)."
      ] } },
      { heading: "Signs and symptoms", body: "Often none. Palpitations — a skipped beat, a thump, a flutter. Frequent PVCs can cause light-headedness or fatigue." },
      { heading: "Tests and treatment", body: "An ECG shows them; a **Holter monitor** counts them over 24–48 hours and matches them to a symptom diary. Treatment depends on the cause, frequency and severity: removing everyday triggers is often enough, while frequent or complex PVCs with heart disease may need medication or further treatment. PVCs **may progress to ventricular tachycardia or ventricular fibrillation**." },
      { heading: "What it means for the PTA", body: { list: [
        "**During exercise, PVCs are a concern when there are more than 5 a minute, when they come in pairs, or when they are multifocal** — or when they come with symptoms (chest pain, dizziness, fainting, breathlessness). Stop the exercise, have the patient rest, keep monitoring, and notify the supervising PT.",
        "Occasional single, unifocal PVCs without symptoms are common: keep monitoring, and report new palpitations to the supervising PT.",
        "Take PVCs seriously after a recent MI: frequent or complex ones mean the ventricles are irritable."
      ] } },
      { heading: "Note on the slides", body: "Lecture 1 (slide 41) calls PVCs potentially life-threatening, needing immediate attention from the physician. Current understanding: isolated PVCs are common and usually benign; the warning patterns above, or PVCs with symptoms, are what need urgent attention." }
    ],
    sources: ["L1 s20 · Selected ECG abnormalities", "L1 s41–42 · Premature ventricular contractions", "L1 s3, s40 · Palpitations"]
  });

  CCF.defineEntry({
    id: "afib", kind: "condition", unit: "rhythm",
    title: "Atrial fibrillation and atrial flutter",
    aka: ["AFib", "AF", "atrial flutter", "irregularly irregular pulse", "atrial kick"],
    summary: "In atrial fibrillation the atria quiver instead of contracting, and the ventricles beat irregularly with no pattern. In atrial flutter the atria beat very fast but regularly.",
    sections: [
      { heading: "What it is", body: [
        "**Atrial fibrillation:** far too many impulses (300–600 a minute) bombard the atria, which **quiver** instead of beating in a coordinated way, so they pump blood into the ventricles poorly. The AV node passes only some of the impulses on, at random, so the ventricles beat **irregularly irregularly**, often fast.",
        "**Atrial flutter:** the atria beat too fast, but in a **regular** pattern."
      ] },
      { heading: "On the ECG", body: { table: { head: ["Feature", "Atrial fibrillation", "Atrial flutter"], rows: [
        ["P waves", "None recognizable; a wavy, irregular (fibrillatory) baseline", "Regular sawtooth (flutter) waves"],
        ["Atrial rate", "300–600 a minute", "About 300 a minute"],
        ["Ventricular rhythm (RR intervals)", "Irregular, with no pattern", "Usually regular"]
      ] } } },
      { heading: "Causes and risk factors", body: "Hypertension, rheumatic heart disease, cardiomyopathy, heart failure, after an MI, COPD and diabetes; illicit drugs and digoxin toxicity." },
      { heading: "Signs and symptoms", body: [
        { list: ["Palpitations; an **irregularly irregular pulse**", "Dyspnea, chest discomfort, dizziness, weakness", "Anxiety from feeling a fast or irregular heartbeat"] },
        "Losing the **atrial kick** — the atria's final push of blood into the ventricles — plus a fast rate can **lower cardiac output**. Blood pooling in the quivering atria can also form **clots** that travel to the brain and cause a stroke."
      ] },
      { heading: "Tests and treatment", body: { list: [
        "Confirmed on an **ECG**.",
        "Anti-arrhythmic drugs, and medicines that **control the ventricular rate**, such as beta blockers or **digoxin**. Digoxin slows conduction through the AV node; it does not restore sinus rhythm.",
        "**Anticoagulants** (for example warfarin) to prevent clots and stroke."
      ] } },
      { heading: "What it means for the PTA", body: [
        { list: [
          "Count an irregular pulse for a full minute.",
          "**If you suspect atrial fibrillation, stop and consult the supervising PT immediately.**",
          "On an anticoagulant: prevent falls and injury, be gentle with manual techniques, and teach the bleeding warning signs.",
          "When rate-control drugs blunt the heart rate (beta blockers), use RPE and symptoms to guide intensity."
        ] },
        { warn: "If the patient becomes unconscious and isn't breathing normally, call for help and start CPR." }
      ] },
      { heading: "Note on the slides", body: "Lecture 1 (slide 31) says digitalis restores the atria to functional contraction. Current understanding: digoxin controls the ventricular rate; the atria keep fibrillating." }
    ],
    sources: ["L1 s27–31 · Atrial fibrillation and flutter", "L1 s53 · Anticoagulant agents"]
  });

  CCF.defineEntry({
    id: "heart-block", kind: "condition", unit: "rhythm",
    title: "Heart block (AV block) and pacemakers",
    aka: ["AV block", "complete heart block", "third-degree heart block", "Mobitz", "Wenckebach", "pacemaker", "escape rhythm"],
    summary: "The impulse from the atria is slowed or blocked on its way to the ventricles. Complete (third-degree) block usually needs a pacemaker.",
    sections: [
      { heading: "What it is", body: "The normal impulses that make the heart contract are interrupted between the atria and the ventricles — at the AV node or below it. Causes include age-related scarring of the conduction system, a heart attack, and medicines that slow conduction." },
      { heading: "The three degrees", body: { table: { head: ["Degree", "What happens", "On the ECG"], rows: [
        ["First", "Impulses are slowed, but every one gets through", "Every P wave followed by a QRS; PR interval longer than 0.20 s"],
        ["Second", "Impulses are occasionally blocked", "Some P waves not followed by a QRS (dropped beats). Mobitz I: the PR lengthens until a beat drops. Mobitz II: the PR stays the same and beats drop suddenly"],
        ["Third (complete)", "No impulses reach the ventricles", "P waves and QRS complexes independent; a slow escape rhythm (often 20–40 a minute, with wide QRS complexes) keeps the heart beating"]
      ] } } },
      { heading: "Signs and symptoms", body: "First-degree block usually causes none. Higher degrees can slow the heart enough to cause **fatigue, light-headedness and fainting (cardiac syncope)**." },
      { heading: "Treatment: the pacemaker", body: [
        "A **pacemaker** is a battery-powered device implanted under the skin, usually in the **upper left chest**, with leads to the heart: **single-chamber** (one lead, in an upper or a lower chamber), **dual-chamber** (one in each) or **biventricular** (three leads). By preventing a slow heart rate it relieves fatigue, light-headedness and fainting.",
        "On the ECG, **pacing spikes** — sharp vertical lines — appear just before the paced beats; paced ventricular beats are wide."
      ] },
      { heading: "What it means for the PTA", body: { list: [
        "Fainting or light-headedness with a slow pulse: stop, keep the patient safe, and alert the PT, nurse or physician immediately.",
        "After a pacemaker implant, follow the physician's arm precautions (often no raising the elbow on the device side above shoulder height, and no heavy lifting, for several weeks; the details vary between hospitals).",
        "Check with the supervising PT before using electrical stimulation on a patient with a pacemaker: it can interfere with the device.",
        "Holter monitoring can check how a pacemaker is working."
      ] } },
      { heading: "Note on the slides", body: "Lecture 1 (slide 37) says complete heart block makes the heart “skip” a beat. Dropped beats describe second-degree block; in complete block no atrial impulses get through, and a slow escape rhythm takes over." }
    ],
    sources: ["L1 s37 · Heart block", "L1 s44 · Syncope", "L1 s63–64 · Cardiac pacemaker", "L1 s48 · Holter monitoring"]
  });

  CCF.defineEntry({
    id: "vfib", kind: "condition", unit: "rhythm",
    title: "Ventricular fibrillation (VF)",
    aka: ["VF", "V-fib", "cardiac arrest", "ventricular tachycardia", "VT", "defibrillation", "AED", "CPR"],
    summary: "Chaotic electrical activity makes the ventricles quiver instead of contracting: no pulse, no blood flow, collapse within seconds. Fatal unless it is treated immediately with CPR and defibrillation.",
    sections: [
      { heading: "What it is", body: [
        "The ventricles' electrical activity becomes chaotic, and the heart muscle loses all coordinated contraction. No blood is pumped: this is **cardiac arrest**.",
        "On the ECG: irregular, chaotic waves with **no recognizable P waves, QRS complexes or T waves**. **Ventricular tachycardia (VT)** — a fast, regular row of wide QRS complexes — can lead to VF."
      ] },
      { heading: "Common causes", body: { list: [
        "**Ischemia, acute MI, CAD**",
        "Respiratory failure (**hypoxia**); **massive pulmonary embolism**",
        "**Electric shock**",
        "Cardiac pacing; **advanced heart block**",
        "PVCs can progress to VT or VF — especially after an MI"
      ] } },
      { heading: "Recognizing it", body: "The person collapses, is **unresponsive** and **not breathing normally** (occasional gasps are not normal breathing), with no pulse. Always check the patient as well as the monitor — a loose electrode can look chaotic too." },
      { heading: "Treatment: CPR and defibrillation", body: [
        { olist: [
          "Check responsiveness and breathing (healthcare providers check a pulse at the same time, for no more than 10 seconds).",
          "Shout for help, activate the emergency response (the code team or 911) and get the AED.",
          "Start chest compressions: hard (at least 2 inches deep) and fast (100–120 a minute), with full recoil and as few pauses as possible.",
          "Attach the AED and shock when it advises, with no one touching the patient.",
          "Resume CPR immediately after the shock, starting with compressions."
        ] },
        "**Defibrillation** stops the chaotic rhythm — briefly stopping the heart — so the heart's own pacemaker can restart an organized rhythm. Oxygen and medications follow."
      ] },
      { heading: "What it means for the PTA", body: "All medical personnel, PTAs included, are trained in CPR and the defibrillator (AED). Know where the AED is, keep your CPR certification current, and watch for the warning signs that can come first: frequent, paired or multifocal PVCs and runs of VT." }
    ],
    sources: ["L1 s45–47 · Ventricular fibrillation", "L1 s41 · PVCs can progress to VT or VF"]
  });
})();
