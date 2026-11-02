/*
 * The Cardiac Case Files — Unit 5: Pressure Cases (writer C).
 * Cases 5.1–5.5 and the Casebook entries hypertension, atherosclerosis and aneurysm
 * (conditions) and orthostatic-hypotension (concept).
 * Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md. Sources: docs/SOURCE-NOTES.md §5, §7–8.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 5.1 The Numbers Game — staging blood pressure; silent hypertension (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pressure-numbers-game",
    unit: "pressure",
    order: 1,
    difficulty: "easy",
    title: "The Numbers Game",
    teaser: "She feels perfectly fine. The blood pressure cuff disagrees.",
    patient: { name: "Carmen Ruiz", age: 49, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right shoulder pain (rotator cuff tendinopathy) — evaluate and treat. From her primary care physician's office.",
        { quote: "Honestly, I'm never sick. I haven't had a check-up in five years — it's just this shoulder.", by: "Ms. Ruiz" }
      ],
      history: {
        list: [
          "**This visit:** three months of right shoulder pain when she reaches overhead; no injury.",
          "**Past medical history:** nothing known — but she hasn't had a check-up in about five years.",
          "**Family:** her mother and her older brother both take medicine for high blood pressure.",
          "**Social:** office manager; sits at a desk most of the day and doesn't exercise. Two to three glasses of wine most evenings. Never smoked.",
          "**Diet:** takeout or canned food most days. 'I love salty things — chips, soy sauce, canned soup.'"
        ]
      },
      medications: [
        { name: "Ibuprofen (Advil)", dose: "200–400 mg as needed for shoulder pain, about 3 days a week", "class": "NSAID (anti-inflammatory pain reliever)" }
      ],
      allergies: "No known drug allergies",
      vitals: {
        hr: 78, bp: "146/94", rr: 14, spo2: 98, temp: "98.2 °F", pain: "3/10 (right shoulder)", weight: "181 lb",
        other: [{ label: "Repeat BP after 5 minutes of quiet sitting", value: "142/92 mmHg" }]
      },
      exam: {
        list: [
          "Right shoulder: painful arc between 70° and 120° of elevation; pain on resisted external rotation; full passive range of motion.",
          "Blood pressure taken twice in the left arm with a large adult cuff, seated with her back supported, feet flat and arm resting at heart level: **146/94**, then **142/92** after 5 minutes of quiet rest.",
          "She reports no headache, dizziness, vision changes, chest pain or shortness of breath.",
          "Height 5 ft 4 in; body mass index 31."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        keepOrder: true,
        prompt: "Using the American Heart Association chart, which category do her two blood pressure readings fall into?",
        options: [
          { text: "Normal", why: "Normal is below 120 systolic **and** below 80 diastolic. Both of her numbers are well above that." },
          { text: "Elevated", why: "Elevated means a systolic of 120–129 with the diastolic still below 80. Her diastolic alone (92–94) rules this out." },
          { text: "Stage 1 hypertension", why: "Stage 1 is a systolic of 130–139 or a diastolic of 80–89. Both of her numbers are higher than that." },
          { text: "Stage 2 hypertension", correct: true, why: "Right: a systolic of 142–146 is 140 or higher, and a diastolic of 92–94 is 90 or higher. Either number on its own would put her in Stage 2." },
          { text: "Hypertensive crisis", why: "A crisis is higher than 180 systolic and/or higher than 120 diastolic. Her readings are high, but nowhere near that." }
        ],
        hints: [
          "Check the systolic and the diastolic against the chart separately.",
          "If the two numbers land in different categories, the higher one counts. Do hers even disagree?"
        ],
        explain: [
          "**The AHA categories** (L2 s23): **Normal** below 120 *and* below 80 · **Elevated** 120–129 *and* below 80 · **Stage 1** 130–139 *or* 80–89 · **Stage 2** 140 or higher *or* 90 or higher · **Hypertensive crisis** higher than 180 *and/or* higher than 120.",
          "Mind the small words: Normal and Elevated need **both** numbers in range; each hypertension stage needs only **one**. When the two numbers disagree, use the higher category.",
          { tip: "One visit's readings put her in a category; they don't diagnose her. Her physician confirms hypertension with readings on separate occasions, often with home monitoring too." }
        ]
      },
      {
        id: "s2",
        type: "classify",
        keepOrder: true,
        prompt: "Dr. Okafor wants to be sure you can stage any reading. Sort these blood pressures into their AHA categories.",
        categories: ["Normal", "Elevated", "Stage 1 hypertension", "Stage 2 hypertension", "Hypertensive crisis"],
        items: [
          { text: "116/76", category: 0, why: "Both numbers are in range: below 120 and below 80." },
          { text: "124/78", category: 1, why: "A systolic of 120–129 with the diastolic still below 80." },
          { text: "126/84", category: 2, why: "The systolic alone would be Elevated, but a diastolic of 84 is Stage 1 — and the higher category wins." },
          { text: "136/72", category: 2, why: "A systolic of 130–139 is Stage 1, even with a normal diastolic." },
          { text: "128/94", category: 3, why: "A diastolic of 90 or higher is Stage 2, whatever the systolic." },
          { text: "158/86", category: 3, why: "A systolic of 140 or higher is Stage 2." },
          { text: "188/104", category: 4, why: "A systolic higher than 180 is a hypertensive crisis." },
          { text: "164/126", category: 4, why: "A diastolic higher than 120 is a crisis on its own." }
        ],
        hints: [
          "Stage each number on its own, then take the higher of the two categories.",
          "Normal and Elevated need both numbers in range; the other categories need only one."
        ],
        explain: [
          "Two readings were traps. **126/84** looks Elevated by its systolic, but its diastolic makes it Stage 1. **128/94** looks almost normal on top, but a diastolic of 90 or higher is Stage 2.",
          "The rule is printed on the AHA chart: *and* for Normal and Elevated, *or* for the hypertension stages, *and/or* for a crisis. The higher category always wins."
        ]
      },
      {
        id: "s3",
        update: {
          title: "Back to Ms. Ruiz",
          text: [
            "You show her the two readings.",
            { quote: "But I feel completely fine — no headaches, nothing. Doesn't high blood pressure make you feel bad?", by: "Ms. Ruiz" }
          ]
        },
        type: "single",
        prompt: "What is the best response?",
        options: [
          { text: "Explain that high blood pressure usually causes no symptoms, tell Dr. Okafor, and encourage her to see her physician soon", correct: true, why: "Yes. Hypertension is called 'silent' because most people feel nothing until it's very high or has already damaged organs. New Stage 2 readings go to the supervising PT, and her physician needs to confirm and manage them." },
          { text: "Reassure her that without headaches or dizziness her pressure isn't a real problem", why: "Feeling fine doesn't mean the pressure is safe. Hypertension usually causes no symptoms while it damages the arteries, heart, kidneys, brain and eyes." },
          { text: "Stop the session at once and send her to the emergency department today, before her blood pressure gets any higher", why: "Her readings are Stage 2, not a crisis, and she has no symptoms. She needs prompt follow-up with her physician, not emergency care — Dr. Okafor will decide how today's session goes ahead." },
          { text: "Suggest she borrow her brother's blood pressure pills until she sees a doctor", why: "Never. A PTA doesn't recommend, start or change medications — and someone else's prescription could be dangerous for her." }
        ],
        hints: [
          "How does hypertension usually announce itself — or doesn't it?",
          "Two jobs: what she needs to understand, and who else needs to know."
        ],
        explain: [
          "**Hypertension is usually silent** (L2 s22, s26). Symptoms — headache, vertigo, blurred vision, a flushed face, confusion, tinnitus, getting up at night to urinate — tend to appear only when the pressure is very high.",
          "Most adults have **primary hypertension**: no identifiable cause, developing slowly over years. **Secondary hypertension** comes from another condition (kidney disease, pre-eclampsia, congenital vessel defects, atherosclerosis, stress) or from a medication. Her physician will look for causes — regular NSAIDs such as ibuprofen can raise blood pressure too.",
          { tip: "PTA scope: measure carefully, report new readings to the supervising PT, educate, and encourage follow-up with the physician." }
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "Which of her risk factors for hypertension could she change? Select all that apply.",
        options: [
          { text: "Obesity (body mass index 31)", correct: true, why: "Modifiable: losing even a modest amount of weight lowers blood pressure." },
          { text: "Sitting most of the day with no regular exercise", correct: true, why: "Modifiable: a sedentary lifestyle is on the lecture's list. Regular aerobic exercise lowers blood pressure — and PT can help her start." },
          { text: "Two to three glasses of wine most evenings", correct: true, why: "Modifiable: excessive alcohol raises blood pressure. For women the usual advice is no more than one drink a day — and less is better." },
          { text: "Salty takeout, chips and canned food most days", correct: true, why: "Modifiable: excess dietary sodium is a classic contributor to high blood pressure." },
          { text: "Her mother and brother have high blood pressure", why: "Family history raises her risk, but she can't change it — one more reason to work on the factors she can." },
          { text: "Her age, 49", why: "Risk rises with age, but age isn't modifiable." }
        ],
        hints: [
          "Modifiable means she could change it through her habits.",
          "Two of these describe who she is, not how she lives."
        ],
        explain: [
          "**Modifiable risk factors** for hypertension (L2 s22): obesity, a sedentary lifestyle, stress, tobacco use, excessive alcohol and excess dietary sodium. **Not modifiable:** age and family history. Pregnancy, diabetes and sleep apnea also raise the risk.",
          "Treatment starts with these lifestyle changes, plus medicines when needed — diuretics, beta blockers, calcium channel blockers, ACE inhibitors (L2 s24). PT's part: progressive exercise and education."
        ]
      }
    ],
    debrief: {
      diagnosis: "Stage 2 blood pressure readings in a patient with no symptoms — undiagnosed, silent hypertension",
      summary: [
        "Ms. Ruiz came in for her shoulder and felt perfectly well, yet both careful readings (146/94, then 142/92) were in the **Stage 2** range. Hypertension is usually silent — which is exactly why blood pressure belongs in every intake.",
        "You staged the readings with the AHA chart, explained why feeling fine isn't reassurance, told Dr. Okafor, and encouraged a prompt visit to her physician, who will confirm the diagnosis and look for a cause."
      ],
      takeaways: [
        "AHA categories: Normal below 120 and 80; Elevated 120–129 and below 80; Stage 1 130–139 or 80–89; Stage 2 140+ or 90+; crisis above 180 and/or above 120.",
        "When the systolic and diastolic fall into different categories, the higher category wins.",
        "Hypertension is usually silent: no symptoms doesn't mean no problem.",
        "She can change obesity, inactivity, stress, tobacco, alcohol and salt — not her age or family history.",
        "New high readings: report to the supervising PT and encourage follow-up with the physician. PTAs don't diagnose or suggest medicines."
      ],
      sources: ["L2 s20–22 · Hypertension", "L2 s23 · AHA blood pressure categories", "L2 s24–26 · Management and clinical manifestations"]
    },
    casebook: ["hypertension", "bp-categories"]
  });

  // ---------------------------------------------------------------------------------------
  // 5.2 Dizzy at the Parallel Bars — orthostatic hypotension from medicines (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pressure-dizzy-at-the-bars",
    unit: "pressure",
    order: 2,
    difficulty: "medium",
    title: "Dizzy at the Parallel Bars",
    teaser: "Fifteen minutes on the mat went fine. Standing up did not.",
    patient: { name: "George Lindqvist", age: 72, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right total knee replacement 3 weeks ago — range of motion, strengthening and gait training. From his orthopedic surgeon.",
        { quote: "The knee's coming along. I've been a bit woozy getting out of bed this week, but I'm sure it's nothing.", by: "Mr. Lindqvist" }
      ],
      history: {
        list: [
          "**Right total knee replacement** 3 weeks ago; walking with a rolling walker at home.",
          "**Past medical history:** high blood pressure for 15 years; high cholesterol; enlarged prostate (benign prostatic hyperplasia).",
          "**New this month:** his urologist started doxazosin 8 days ago for his prostate symptoms. Since then he has felt light-headed a few times when getting out of bed.",
          "**Social:** retired machinist; lives with his wife; doesn't smoke.",
          "Because of the light-headedness, Dr. Okafor has asked you to check his blood pressure lying down and standing today."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day" },
        { name: "Hydrochlorothiazide", dose: "25 mg once a day" },
        { name: "Doxazosin (Cardura)", dose: "2 mg at bedtime — started 8 days ago" },
        { name: "Atorvastatin (Lipitor)", dose: "40 mg once a day" },
        { name: "Acetaminophen", dose: "650 mg every 6 hours as needed for knee pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 72, bp: "138/80", rr: 16, spo2: 97, temp: "98.1 °F", pain: "3/10 (right knee)" },
      exam: {
        list: [
          "Right knee: healing incision; flexion 0–95°; quadriceps strength 3+/5.",
          "Gait: rolling walker, step-to pattern.",
          "Both calves soft and non-tender; mild swelling around the right knee only.",
          "Alert and oriented; no chest pain or shortness of breath."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        update: {
          title: "Up from the mat…",
          text: [
            "After 15 minutes of exercises lying on the mat, you take his lying-down blood pressure: **136/82**, pulse 70. Before you can set up the walker, Mr. Lindqvist pushes himself up and stands at the parallel bars in one quick move. Your colleague slides a wheelchair behind him. The cuff is still on his arm: after one minute of standing it reads **108/66**, pulse 92.",
            "He grips the bars. His face has gone pale.",
            { quote: "Whoa… everything's going gray. I think I'm going to pass out.", by: "Mr. Lindqvist" }
          ],
          vitals: { hr: 92, bp: "108/66", rr: 18 },
          exhibits: [
            {
              id: "orthostatic-log", type: "table", title: "Lying and standing vital signs",
              head: ["Position", "Blood pressure (mmHg)", "Pulse (beats/min)"],
              rows: [
                ["Lying on the mat, after exercise", "136/82", "70"],
                ["Standing, 1 minute", "108/66", "92"]
              ]
            }
          ]
        },
        type: "single",
        prompt: "What do you do first?",
        options: [
          { text: "Lower him into the wheelchair behind him, stay with him and keep checking his blood pressure, pulse and symptoms until he recovers", correct: true, why: "Yes. A patient who is about to faint gets off his feet right where he is. Sitting (or lying with the legs raised, if he doesn't improve) brings blood back to his brain. Stay with him, monitor, and tell Dr. Okafor." },
          { text: "Have him keep standing and march in place to push the blood back up", why: "Calf pumping helps *before* standing, but a patient who is graying out needs to sit down now. Standing longer risks a faint and a fall." },
          { text: "Walk him quickly across the gym to the treatment table so he can lie down", why: "Walking a patient who is about to faint invites a fall. Sit him down where he is — the wheelchair is right behind him." },
          { text: "Call 911 — this is a stroke", why: "Graying vision and light-headedness right after standing up quickly, with a falling blood pressure, don't point to a stroke. Call 911 if he loses consciousness and doesn't come round promptly, or has chest pain, new weakness, a facial droop or slurred speech." }
        ],
        hints: [
          "What does his body need right now — more work against gravity, or less?",
          "Don't move someone who is about to faint any farther than you must."
        ],
        explain: [
          "**Safety first:** sit or lie the patient down right where he is — that's why a chair or wheelchair stays behind anyone at risk. If symptoms don't settle sitting, recline him or lie him down with the legs raised. Stay with him and recheck his blood pressure and pulse.",
          "Light-headedness or fainting during treatment is always reported to the supervising PT (L1 s44).",
          { warn: "Call 911 if he loses consciousness and doesn't recover promptly, or has chest pain, an irregular racing pulse, or stroke-like signs." }
        ]
      },
      {
        id: "s2",
        update: {
          title: "Two minutes later",
          text: [
            "Seated in the wheelchair, Mr. Lindqvist gets his color back.",
            { quote: "That's better. That's exactly how I feel when I get out of bed lately.", by: "Mr. Lindqvist" }
          ],
          vitals: { hr: 78, bp: "128/78", rr: 16 }
        },
        type: "numeric",
        prompt: "Look at the lying and standing readings in the table. By how many mmHg did his **systolic** pressure fall when he stood up?",
        answer: 28,
        tolerance: 0,
        unit: "mmHg",
        traps: [
          { value: 16, why: "That's the drop in his diastolic (bottom) number, 82 → 66. The question asks about the systolic (top) number." },
          { value: 22, why: "That's how much his pulse rose (70 → 92 beats per minute), not the change in blood pressure." },
          { value: 8, why: "That's lying versus seated after he recovered (136 → 128). Use the standing reading taken at one minute." }
        ],
        hints: [
          "Systolic is the top number of each reading.",
          "Subtract the standing systolic from the lying systolic."
        ],
        explain: [
          "136 − 108 = **28 mmHg** systolic — and 82 − 66 = 16 mmHg diastolic.",
          "By the usual definition, a fall of **20 mmHg or more systolic, or 10 mmHg or more diastolic, within 3 minutes of standing** is orthostatic hypotension. He meets both."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "Which condition best explains what happened at the bars?",
        options: [
          { text: "Orthostatic hypotension", correct: true, why: "Yes: his blood pressure fell 28/16 mmHg within a minute of standing, his pulse sped up to compensate, and his symptoms faded once he sat down." },
          { text: "Inner-ear vertigo (benign paroxysmal positional vertigo)", why: "Inner-ear vertigo is a spinning sensation brought on by head movements, and it doesn't make the blood pressure fall. His readings tell the story: a big drop on standing that recovered when he sat." },
          { text: "A hypertensive crisis", why: "A crisis is a pressure higher than 180 and/or 120. His pressure went down, not up." },
          { text: "A transient ischemic attack (mini-stroke)", why: "A TIA causes sudden focal signs — weakness of one side, a facial droop, slurred speech — not a gray-out on standing that ends when he sits." }
        ],
        hints: [
          "Compare his lying and standing numbers, then the seated ones.",
          "What did standing do to his blood pressure, and what did his heart rate do in response?"
        ],
        explain: [
          "**Orthostatic (postural) hypotension** is a fall in blood pressure on standing. When we stand, gravity pools blood in the legs. Normally the **baroreceptors** in the aorta and carotid arteries sense the drop at once, and the sympathetic system tightens the vessels and speeds the heart (L1 s10).",
          "When that response is blunted — by blood-pressure medicines, dehydration, age, or days in bed — the brain is briefly short of blood: light-headedness, graying vision, even fainting. His pulse rising from 70 to 92 was the reflex trying to catch up."
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "Which of his medicines can contribute to this drop in blood pressure? Select all that apply. (The Casebook lists each drug's class.)",
        options: [
          { text: "Doxazosin (Cardura)", correct: true, why: "An alpha blocker: it relaxes arterioles and veins. Orthostatic hypotension is a classic side effect — most of all in the first days of treatment, exactly when his light-headedness began." },
          { text: "Lisinopril", correct: true, why: "An ACE inhibitor: it lowers blood pressure, so sudden changes in posture can cause dizziness and fainting." },
          { text: "Hydrochlorothiazide", correct: true, why: "A diuretic: less plasma volume means lower blood pressure, and a higher risk of dizziness and falls on standing." },
          { text: "Atorvastatin (Lipitor)", why: "A statin lowers cholesterol; it doesn't lower blood pressure. The side effect to ask about is muscle aches." },
          { text: "Acetaminophen", why: "A pain reliever that doesn't affect blood pressure." }
        ],
        hints: [
          "Which of these were prescribed to lower blood pressure or relax his vessels?",
          "Look each one up in the Casebook: whose side effects include dizziness or orthostatic hypotension?"
        ],
        explain: [
          "**Alpha blockers, ACE inhibitors and diuretics** all lower blood pressure, and their PT implications say the same thing: rise slowly and watch for dizziness on position changes (L1 s51, s52, s58). Beta blockers, calcium channel blockers and nitrates can do it too.",
          "Several blood-pressure medicines add up, and a **newly started alpha blocker** is a classic trigger: the first doses often cause the biggest drop.",
          { tip: "Diuretics can also cause dehydration and electrolyte imbalance: report new muscle weakness, cramping or an irregular pulse." },
          "A PTA never tells a patient to skip or change a medicine. Report the pattern to the supervising PT, who can contact his physician."
        ]
      },
      {
        id: "s5",
        update: {
          title: "His next visit",
          text: "Dr. Okafor has let his physician know about the light-headedness. Until he hears back, Mr. Lindqvist's program continues — including standing and gait training."
        },
        type: "single",
        prompt: "How do you help prevent another episode when he gets up from the mat?",
        options: [
          { text: "Change position in stages: sit on the edge of the mat, do ankle pumps for a minute, then stand slowly with support and pause before walking", correct: true, why: "Yes. Each stage gives his circulation time to adjust, and ankle pumps push pooled blood back toward the heart. Keep a chair close and recheck his pressure if he feels light-headed." },
          { text: "Have him take a deep breath, hold it and bear down hard as he stands, to push his blood pressure up", why: "Breath-holding and straining (the Valsalva maneuver) make blood pressure swing and can bring on a faint. Teach him to breathe out as he stands." },
          { text: "Ask him to skip his blood pressure pills on therapy days", why: "Outside PTA scope — and stopping blood pressure medicines on your own can be dangerous. Medicine questions go to his physician through the PT." },
          { text: "Do all of his exercises lying down from now on", why: "He needs to stand and walk to recover from his knee replacement. The goal is to stand safely, not to stop standing." }
        ],
        hints: [
          "Give his circulation time to adjust between positions.",
          "What could his calf muscles do for him before he stands?"
        ],
        explain: [
          "**Preventing orthostatic hypotension:** lying → sitting → standing in stages; a minute or two sitting, with ankle pumps or seated marching, before standing; stand with support and pause before walking; keep a chair or wheelchair close; recheck blood pressure when symptoms appear.",
          "Teach him the same routine at home — especially getting out of bed at night — and to report light-headedness. Enough fluids (as his physician advises) help too, especially on a diuretic."
        ]
      }
    ],
    debrief: {
      diagnosis: "Orthostatic hypotension from blood pressure medicines (a new alpha blocker on top of an ACE inhibitor and a diuretic)",
      summary: [
        "Mr. Lindqvist stood up quickly after lying on the mat, and his pressure fell from 136/82 to 108/66 — a 28 mmHg systolic drop — with light-headedness and graying vision: **orthostatic hypotension**. A newly started alpha blocker (doxazosin), on top of lisinopril and hydrochlorothiazide, made it likely.",
        "You sat him down at once, monitored him until he recovered and reported to Dr. Okafor. Staged position changes and ankle pumps help prevent the next episode."
      ],
      takeaways: [
        "Orthostatic hypotension: a fall of 20 mmHg or more systolic, or 10 mmHg or more diastolic, within 3 minutes of standing — often with light-headedness or fainting.",
        "Alpha blockers, ACE inhibitors and diuretics (and beta blockers, calcium channel blockers and nitrates) can all cause it — especially new drugs and combinations.",
        "If a patient is about to faint: sit or lie them down where they are, stay, monitor until they recover, and tell the supervising PT.",
        "Prevent it with staged position changes, ankle pumps before standing, support and a chair close by — never by telling the patient to change a medicine."
      ],
      sources: ["L1 s51 · Alpha adrenergic antagonists", "L1 s52 · ACE inhibitors", "L1 s58 · Diuretics", "L1 s44 · Syncope", "L1 s10 · Baroreceptors and neural control"]
    },
    casebook: ["orthostatic-hypotension", "alpha-blockers", "ace-inhibitors", "diuretics"]
  });

  // ---------------------------------------------------------------------------------------
  // 5.3 The Stiff Aorta — isolated systolic hypertension, aortic atherosclerosis (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pressure-stiff-aorta",
    unit: "pressure",
    order: 3,
    difficulty: "medium",
    title: "The Stiff Aorta",
    teaser: "A high top number, a normal bottom one — and a scan that explains both.",
    patient: { name: "Edith Moore", age: 79, sex: "F" },
    setting: "Outpatient balance and falls-prevention program",
    file: {
      referral: [
        "**Referral:** two falls in the past year — balance and strength training. From her primary care physician.",
        "**Physician's note:** 'Blood pressure has been running high. Started amlodipine 3 weeks ago.'"
      ],
      history: {
        list: [
          "**Past medical history:** high blood pressure for 'a few years'; high cholesterol; osteoarthritis of both knees.",
          "**Smoking:** a pack a day for 40 years; quit 12 years ago.",
          "**Imaging:** a CT scan of her abdomen last month, done for a kidney stone, also showed heavy calcification of her aorta (see Tests).",
          "**Social:** widowed; lives alone; walks to the corner store most days."
        ]
      },
      medications: [
        { name: "Amlodipine", dose: "5 mg once a day — started 3 weeks ago" },
        { name: "Atorvastatin (Lipitor)", dose: "40 mg once a day" },
        { name: "Acetaminophen", dose: "500 mg as needed for knee pain" }
      ],
      allergies: "Penicillin (rash)",
      vitals: {
        hr: 74, bp: "172/74", rr: 16, spo2: 96, temp: "98.0 °F", pain: "2/10 (knees)",
        other: [{ label: "Repeat BP after 5 minutes of quiet sitting", value: "170/72 mmHg" }]
      },
      exam: {
        list: [
          "Timed Up and Go: 15 seconds. Sways when standing on foam with her eyes closed.",
          "Both knees: crepitus; mild pain on stairs.",
          "Radial and foot pulses present; feet warm.",
          "No ankle swelling. No chest pain, shortness of breath or headache."
        ]
      },
      tests: [
        {
          id: "ct-abdomen", type: "report", title: "CT of the abdomen (last month)",
          text: [
            "Done to look for a kidney stone: a 4 mm stone in the left kidney.",
            "**Incidental finding:** extensive calcified atherosclerotic plaque along the abdominal aorta and both iliac arteries. Aortic diameter 2.2 cm — **no aneurysm**.",
            "**Impression:** aortic atherosclerosis with calcification."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Her readings are 172/74 and 170/72. Which term best describes this blood pressure pattern?",
        options: [
          { text: "Isolated systolic hypertension", correct: true, why: "Yes: a high systolic (here in the Stage 2 range, 140 or higher) with a normal diastolic (below 80). It is common after age 50, as the large arteries stiffen." },
          { text: "Stage 1 hypertension, because her diastolic is still normal", why: "The higher category wins. A systolic of 170–172 is Stage 2, whatever the diastolic." },
          { text: "Hypertensive crisis", why: "A crisis is higher than 180 systolic and/or higher than 120 diastolic. Hers is high, but not that high." },
          { text: "Normal blood pressure for a 79-year-old", why: "The AHA categories don't change with age. Rising systolic pressure is common in older adults, but it still raises the risk of stroke, heart failure and kidney disease." }
        ],
        hints: [
          "Look at each number separately: which one is out of range?",
          "Lecture 2 names this pattern, which many people over 50 show."
        ],
        explain: [
          "**Isolated systolic hypertension (ISH):** a significantly raised systolic with a normal diastolic, common in people over 50 (L2 s22). On the AHA chart her readings are **Stage 2**: the systolic alone is 140 or higher.",
          "Her **pulse pressure** (systolic minus diastolic) is about 98 mmHg — very wide; around 40 is typical. A wide pulse pressure is a sign of stiff large arteries."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "Why does a calcified, rigid aorta push up the **systolic** pressure?",
        options: [
          { text: "It can't stretch to absorb each heartbeat's surge of blood, so the pressure peaks higher", correct: true, why: "Right. A healthy aorta balloons slightly with every beat and recoils between beats. A calcified one can't, so each surge drives the pressure higher in systole — and lets it fall lower in diastole." },
          { text: "Calcium from the plaque dissolves into the blood and makes it thicker, so the heart has to pump against sludge", why: "Plaque calcium stays in the artery wall. The problem is mechanical: a rigid tube instead of an elastic one." },
          { text: "The stiff aorta makes the heart beat faster", why: "Her heart rate is a normal 74. What changes is the pressure each beat creates, not the number of beats." },
          { text: "Plaque blocks the aortic valve, so blood leaks back into the heart", why: "Plaque in the aorta's wall doesn't make the valve leak. A rigid, narrowed aorta raises pressure because it can't stretch." }
        ],
        hints: [
          "Picture the aorta as a balloon that stretches with every beat. What if the balloon turned to stone?",
          "Systolic pressure is the peak pressure during each heartbeat."
        ],
        explain: [
          "In **aortic atherosclerosis**, fatty deposits turn into fibrous, calcified plaque. The aorta 'becomes rigid with calcification' and its lumen narrows, so it can no longer adjust to the normal changes of the cardiac cycle — and hypertension follows (L2 s12).",
          "A normal aorta works like a shock absorber: it stretches in systole and recoils in diastole, keeping blood moving between beats. Without that elasticity, systolic pressure climbs while diastolic stays normal or falls: isolated systolic hypertension.",
          "*Athero-* means fatty paste and *-sclerosis* hardening: plaque in the artery wall that hardens and narrows it. *Arteriosclerosis* is the broader term for thickened, stiff artery walls."
        ]
      },
      {
        id: "s3",
        type: "classify",
        prompt: "Atherosclerosis causes different symptoms depending on which artery it narrows. Match each symptom to the arteries most likely involved.",
        categories: ["Coronary arteries (heart)", "Cerebral arteries (brain)", "Peripheral arteries (legs)"],
        items: [
          { text: "Chest pressure climbing stairs that goes away with rest", category: 0, why: "Angina pectoris: the heart muscle runs short of oxygen when demand rises." },
          { text: "Tightness spreading to the jaw during exertion", category: 0, why: "Angina can radiate to the jaw, neck, shoulder or arm." },
          { text: "Sudden drooping of one side of the face", category: 1, why: "A stroke-like sign: part of the brain has lost its blood supply." },
          { text: "Slurred speech or trouble getting words out", category: 1, why: "Difficulty speaking points to the brain's arteries." },
          { text: "Sudden numbness or weakness of one arm", category: 1, why: "Numbness or weakness of an arm or leg comes from the cerebral arteries." },
          { text: "Calf cramping after two blocks of walking, eased by standing still", category: 2, why: "Intermittent claudication: the leg muscles are short of oxygen during exercise." },
          { text: "Aching buttock and thigh when walking, relieved by rest", category: 2, why: "Claudication can be felt in the hip or buttock when the narrowing is higher up." }
        ],
        hints: [
          "The lecture gives one pattern per territory: angina, stroke-like signs, claudication.",
          "Pain that comes with exercise and stops with rest can come from the heart or the legs — where is it felt?"
        ],
        explain: [
          "Atherosclerosis causes symptoms by narrowing the artery that feeds an organ (L2 s15): **coronary** → angina pectoris; **cerebral** → numbness or weakness of an arm or leg, slurred speech or difficulty speaking, a drooping face; **peripheral** → intermittent claudication.",
          { warn: "A sudden facial droop, arm weakness or slurred speech in any patient is a stroke warning: call 911 and note the time the symptoms started." }
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "Dr. Okafor asks: what can aortic atherosclerosis lead to? Select all that apply.",
        options: [
          { text: "High blood pressure", correct: true, why: "Yes: a rigid, narrowed aorta can't adjust to each heartbeat (L2 s12) — as in Mrs. Moore." },
          { text: "Emboli: fragments of plaque or clot that block smaller arteries downstream", correct: true, why: "Yes: emboli can break off the diseased aorta and lodge in the arteries it feeds — for example in the legs, feet or kidneys." },
          { text: "An aortic aneurysm", correct: true, why: "Yes: the weakened wall can balloon out under the pressure of the blood (L2 s12). Her CT shows none so far." },
          { text: "Severe narrowing of the aorta itself", correct: true, why: "Yes: as the disease progresses, massive plaque can almost obliterate the aorta's channel (L2 s12)." },
          { text: "A pulmonary embolism", why: "Emboli from the aorta travel downstream in the body's arteries; they can't reach the lungs. A pulmonary embolism usually starts as a clot in the leg veins." },
          { text: "Varicose veins in the legs", why: "Varicose veins come from faulty valves in the veins, not from plaque in the arteries." }
        ],
        hints: [
          "Plaque narrows, stiffens and weakens the aorta — and pieces of it can break off.",
          "Follow the blood: where can a fragment from the abdominal aorta travel?"
        ],
        explain: [
          "Aortic atherosclerosis is **'silent'** (L2 s12): found mostly in older men, and after age 50 most people have some. As it progresses it can cause **hypertension**, **emboli** to the arteries downstream, **near-obliteration** of the aorta, and an **aneurysm**.",
          "Arterial emboli travel *downstream* from where they form: from the abdominal aorta to the legs, kidneys or gut. Clots from the leg veins travel to the right heart and lungs."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Two weeks into the program",
          text: [
            "Mrs. Moore has stuck with her balance exercises, and her blood pressure today is lower. Then she points to her ankles.",
            { quote: "My ankles have been puffing up since I started the new blood pressure pill. Worse by suppertime, better in the morning.", by: "Mrs. Moore" },
            { list: [
              "1+ pitting edema of **both** ankles.",
              "Calves soft — not warm, red or tender.",
              "Breathing comfortable at rest and on the stairs; she sleeps flat on one pillow.",
              "Weight 141 lb — the same as at her first visit."
            ] }
          ],
          vitals: { hr: 72, bp: "146/72", rr: 16, spo2: 96, weight: "141 lb" }
        },
        type: "single",
        prompt: "What best explains her new ankle swelling, and what should you do?",
        options: [
          { text: "A side effect of amlodipine — report it, and watch for signs of heart failure", correct: true, why: "Yes. Calcium channel blockers widen the arterioles, and fluid seeps into the ankles: peripheral edema is a listed side effect. Report it so her physician hears, and keep watching for worsening edema, breathlessness or weight gain (L1 s57)." },
          { text: "Clots in both legs (deep vein thrombosis) — call 911", why: "A DVT usually affects one leg, with warmth, redness and tenderness. Her swelling is in both ankles, the calves are soft and not tender, and it began with a new medicine." },
          { text: "Heart failure — stop her program and send her to the emergency department right away", why: "Heart failure is what you watch for — but she isn't breathless, sleeps flat and hasn't gained weight. The timing points to the new medicine." },
          { text: "Normal at her age — no need to mention it", why: "New edema is always worth reporting, even when the cause seems clear. Her physician needs to know how the new medicine is working for her." },
          { text: "Tell her to stop the amlodipine until the swelling goes down", why: "Never. A PTA doesn't tell patients to stop or change medicines. Her physician decides, after the PT passes on your report." }
        ],
        hints: [
          "When did the swelling start — and what changed around then?",
          "Look up her new medicine's class and side effects in the Casebook."
        ],
        explain: [
          "**Calcium channel blockers** (amlodipine, nifedipine, diltiazem) relax vascular smooth muscle. Side effects: dizziness, headache, hypotension and **peripheral edema** (L1 s57).",
          "PT implications: heart rate and blood pressure rise less with exercise; watch for dizziness and orthostatic hypotension on standing — important in a balance program — and for signs of **congestive heart failure**: worsening peripheral edema, dyspnea or weight gain.",
          { tip: "Edema in both legs suggests a body-wide cause (heart failure, a medicine); edema in one leg points to a local cause such as a DVT (L1 s34)." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Isolated systolic hypertension from aortic atherosclerosis; ankle edema from a calcium channel blocker",
      summary: [
        "Mrs. Moore's readings (172/74) showed **isolated systolic hypertension**, and her CT explained why: a heavily calcified, rigid aorta that can't stretch with each heartbeat. Aortic atherosclerosis is usually silent, but it can lead to hypertension, emboli, near-obliteration of the aorta and aneurysm.",
        "Her new swelling of both ankles matched a known side effect of amlodipine. You reported it and kept watching for signs of heart failure."
      ],
      takeaways: [
        "Isolated systolic hypertension (high systolic, normal diastolic) is common after 50 and is staged by the higher number.",
        "A calcified, rigid aorta can't absorb each heartbeat's surge, so systolic pressure climbs and the pulse pressure widens.",
        "Atherosclerosis causes symptoms by territory: coronary → angina; cerebral → numbness or weakness, slurred speech, facial droop; peripheral → claudication.",
        "Aortic atherosclerosis can lead to hypertension, emboli, aneurysm and near-obliteration of the aorta.",
        "Calcium channel blockers can cause ankle edema: report it, and watch for worsening edema, breathlessness or weight gain."
      ],
      sources: ["L2 s12 · Aortic atherosclerosis", "L2 s13–15 · Atherosclerosis and arteriosclerosis", "L2 s22 · Isolated systolic hypertension", "L1 s57 · Calcium channel blockers", "L1 s34 · Edema"]
    },
    casebook: ["atherosclerosis", "hypertension", "calcium-channel-blockers", "bp-categories"]
  });

  // ---------------------------------------------------------------------------------------
  // 5.4 The Back Pain That Wasn't — ruptured abdominal aortic aneurysm (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pressure-back-pain-that-wasnt",
    unit: "pressure",
    order: 4,
    difficulty: "hard",
    title: "The Back Pain That Wasn't",
    teaser: "Same patient, same clinic, same old back pain. Until it isn't.",
    patient: { name: "Leonard Fisk", age: 74, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** chronic low back pain from lumbar arthritis — exercise and education. From his primary care physician. Today is visit 6 of 8.",
        "**Physician's note:** 'Known 5.2 cm abdominal aortic aneurysm, followed by vascular surgery. No massage or deep pressure over the abdomen. No heavy lifting or straining.'"
      ],
      history: {
        list: [
          "**Chronic low back pain** for 6 years: a dull ache across the low back, worse after standing, eased by moving and by heat. Usually 3/10.",
          "**Abdominal aortic aneurysm (AAA):** found 2 years ago. On his last check-up scan, 3 months ago, it measured 5.2 cm (4.8 cm the year before). He sees vascular surgery every 6 months.",
          "**Past medical history:** hypertension; high cholesterol; atherosclerotic plaque along the aorta seen on his scans.",
          "**Smoking:** a pack a day for 50 years — still smoking.",
          "**Social:** retired accountant. His wife drove him today and is in the waiting room."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day" },
        { name: "Amlodipine", dose: "5 mg once a day" },
        { name: "Atorvastatin (Lipitor)", dose: "40 mg once a day" },
        { name: "Acetaminophen", dose: "500 mg as needed for back pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 76, bp: "146/88", rr: 16, spo2: 96, temp: "98.2 °F", pain: "3/10 (low back — his usual ache)" },
      exam: {
        list: [
          "Lumbar spine: stiff into extension; tender paraspinal muscles; normal neurological screen.",
          "No abdominal palpation (aneurysm precaution).",
          "Today's plan: 10-minute warm-up on the recumbent bike, then lumbar stabilization and stretching on the mat."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "multi",
        prompt: "Before the session, you review his chart. Which factors in it raise the risk of an aneurysm forming and growing? Select all that apply.",
        options: [
          { text: "Smoking a pack a day for 50 years", correct: true, why: "Smoking damages and weakens artery walls. It is the most important risk factor he could change, and it speeds an aneurysm's growth." },
          { text: "High blood pressure", correct: true, why: "Higher pressure stretches a weakened wall further. Blood pressure control is part of treatment (L2 s5)." },
          { text: "Atherosclerosis in his aorta", correct: true, why: "Plaque weakens the aortic wall; an aneurysm is a known complication of aortic atherosclerosis (L2 s12)." },
          { text: "His age, 74", correct: true, why: "Advanced age is on the lecture's list of factors that weaken vessel walls." },
          { text: "Chronic low back pain from lumbar arthritis", why: "Arthritis doesn't cause aneurysms. But back pain can be a *symptom* of an AAA — which is why a change in his usual pain matters." },
          { text: "Taking atorvastatin", why: "A statin treats high cholesterol and atherosclerosis; it doesn't cause aneurysms." }
        ],
        hints: [
          "Think about what damages or weakens the wall of an artery.",
          "One distractor is something an AAA can cause, not something that causes one."
        ],
        explain: [
          "**Aneurysm:** a localized, balloon-like bulge where an artery wall has weakened and can no longer withstand the pressure of the blood (L2 s2). Factors that weaken the wall: **smoking, high blood pressure, atherosclerosis, infection, genetic conditions, trauma and advanced age.**",
          "Most aneurysms are in the aorta: thoracic (TAA) or abdominal (AAA). An AAA usually sits below the kidney arteries; before it ruptures it may cause lower abdominal pain and a dull low back pain — or nothing at all (L2 s3–4).",
          { tip: "Know which of your patients have an aneurysm, and their precautions: no massage or deep pressure over the abdomen, no heavy lifting, no breath-holding while straining." }
        ]
      },
      {
        id: "s2",
        update: {
          title: "Ten minutes into the warm-up…",
          text: [
            "Mr. Fisk stops pedaling and doubles over, both hands pressed to his lower back.",
            { quote: "Something's wrong. This isn't my back — it's a terrible deep pain, going into my belly and my groin. I feel sick.", by: "Mr. Fisk" },
            "You help him off the bike and down onto the mat. He is pale, cool and clammy, and says the room swims whenever he lifts his head."
          ],
          vitals: { hr: 124, bp: "86/52", rr: 24, spo2: 96, pain: "9/10 (low back, abdomen and left groin)" }
        },
        type: "single",
        prompt: "Which explanation best fits — and is the most dangerous?",
        options: [
          { text: "A ruptured abdominal aortic aneurysm", correct: true, why: "Yes. Sudden severe low back pain spreading to the abdomen and groin, nausea, light-headedness and a racing pulse with a falling blood pressure, in a man with a known 5.2 cm AAA: rupture until proven otherwise (L2 s4)." },
          { text: "A flare-up of his usual mechanical back pain", why: "Mechanical back pain changes with movement and position. It doesn't spread into the belly and groin, make him pale and clammy, or drop his blood pressure to 86/52." },
          { text: "A kidney stone", why: "A kidney stone can cause severe pain spreading to the groin, with nausea — but it doesn't cause shock. In a man with a known AAA, rupture must be assumed first; mistaking it for a kidney stone is a classic, deadly error." },
          { text: "Sciatica from a herniated lumbar disc", why: "Sciatica runs down the back of the leg, often with numbness or tingling. It doesn't spread into the abdomen or cause a racing pulse and a low blood pressure." }
        ],
        hints: [
          "Compare today's vital signs with his usual ones.",
          "Which item in his history could bleed?"
        ],
        explain: [
          "**Ruptured AAA** (L2 s4): low back, abdominal or groin pain, nausea and vomiting, light-headedness and a rapid heart rate. The internal bleeding leads to **hypovolemic shock** — too little blood volume — and is fatal in most cases. Survival depends on reaching surgery fast.",
          "The clues that this isn't his usual back pain: a sudden, severe onset; a new location (belly, groin); nausea; and a **change in vital signs** — pulse 76 → 124, blood pressure 146/88 → 86/52."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Call 911 now, keep him lying flat and still, stay with him and monitor him, and have someone get Dr. Okafor", correct: true, why: "Yes. A suspected ruptured aneurysm needs emergency surgery, so activate EMS at once. Keep him lying down and still, give nothing to eat or drink, keep him warm, watch his breathing and responsiveness, and be ready to start CPR." },
          { text: "Put a hot pack on his back and recheck his vital signs in 10 minutes", why: "Heat, massage or any manual therapy is wrong here — and waiting 10 minutes could cost him his life. This is a 911 call now." },
          { text: "Help him out to the car so his wife can drive him straight to the emergency department", why: "Sitting up and walking may make him collapse, and a car ride delays care. Paramedics can start treatment on the way and alert the surgical team." },
          { text: "Sit him up and give him some water and a snack to settle his stomach", why: "Sitting up sends even less blood to his brain, and he may need emergency surgery — nothing by mouth." },
          { text: "Phone his vascular surgeon's office to move his next scan up", why: "A scheduling call wastes time he doesn't have. Call 911." }
        ],
        hints: [
          "This can't wait for an appointment — or for a car ride.",
          "Would sitting him up help or hurt his blood pressure?"
        ],
        explain: [
          "**Call 911 immediately** for sudden severe back, abdominal or groin pain with light-headedness and a racing pulse in anyone with an aortic aneurysm (Casebook: red flags). Then:",
          { list: [
            "Keep him lying flat, as still and calm as possible; cover him with a blanket.",
            "Nothing to eat or drink.",
            "No heat, massage or manual therapy.",
            "Stay with him; recheck pulse, blood pressure, breathing and responsiveness. If he stops breathing normally, start CPR and get the AED.",
            "Tell Dr. Okafor; send someone to meet the paramedics and to fetch his wife."
          ] }
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "While you wait for the paramedics: which of his findings are signs of **shock** — his circulation failing to supply his tissues? Select all that apply.",
        options: [
          { text: "Pulse of 124 beats per minute", correct: true, why: "The heart races to make up for the lost blood volume." },
          { text: "Blood pressure of 86/52", correct: true, why: "Low — and far below his usual 146/88. A falling blood pressure means the body's compensation is failing." },
          { text: "Pale, cool, clammy skin", correct: true, why: "The skin's vessels clamp down to send blood to the vital organs; the sweating comes from the stress response." },
          { text: "Light-headed whenever he lifts his head", correct: true, why: "His brain isn't getting enough blood." },
          { text: "Breathing 24 times a minute", correct: true, why: "Fast breathing is an early sign of shock as the tissues run short of oxygen." },
          { text: "Pain spreading into his groin", why: "This points to the aneurysm and where it is bleeding — it isn't a sign of shock itself." },
          { text: "Oxygen saturation of 96 %", why: "That's a normal reading. In shock the problem is how much blood is circulating, not how well the lungs load oxygen — so a normal SpO2 is no reassurance." }
        ],
        hints: [
          "Shock is a problem of too little circulating blood. Which findings show the body compensating — or failing to?",
          "Two of the options don't describe a failing circulation."
        ],
        explain: [
          "**Hypovolemic shock** — the liquid part of the blood is too low (L2 s4). The body compensates by racing the heart, breathing faster and clamping down the vessels in the skin (pale, cool, clammy). When that fails, blood pressure falls and the brain runs short: light-headedness, confusion, collapse.",
          { warn: "A fast pulse with a falling blood pressure in a patient who looks pale and clammy is an emergency, whatever the cause." }
        ]
      },
      {
        id: "s5",
        update: {
          title: "Handed over",
          text: "The paramedics arrive within 8 minutes, start IV lines and leave with lights and sirens; his wife rides with him. That afternoon, Dr. Okafor sits down with you to review aneurysms.",
          exhibits: [
            {
              id: "ed-ultrasound", type: "report", title: "Emergency department and surgery report", sealed: true,
              text: [
                "**Bedside abdominal ultrasound (emergency department):** abdominal aortic aneurysm about 5.6 cm across, with blood outside the aorta behind the abdominal organs — a **ruptured AAA**.",
                "**Vascular surgery:** taken straight to the operating room; the ruptured section of aorta was replaced with a synthetic graft. Stable after surgery and recovering in intensive care.",
                "**Note to the clinic:** thank you for the immediate 911 call — with a rupture, every minute counts."
              ]
            }
          ]
        },
        type: "classify",
        prompt: "Aneurysms in different places cause different symptoms. Sort each symptom into the aneurysm it suggests.",
        categories: ["Abdominal aortic aneurysm (AAA)", "Thoracic aortic aneurysm (TAA)", "Brain aneurysm"],
        items: [
          { text: "Dull low back pain with lower abdominal pain", category: 0, why: "An unruptured AAA can cause lower abdominal and dull low back pain (L2 s3)." },
          { text: "Sudden low back, abdominal and groin pain with a racing pulse", category: 0, why: "The picture of a ruptured AAA — like Mr. Fisk's." },
          { text: "Jaw and neck pain", category: 1, why: "A TAA can cause jaw, neck, back or chest pain (L2 s4)." },
          { text: "Chest pain with a cough and shortness of breath", category: 1, why: "A TAA can press on the airways and lungs." },
          { text: "Loss of balance with speech and vision problems", category: 2, why: "An unruptured brain aneurysm can press on nearby brain tissue and nerves." },
          { text: "Sudden severe headache with double vision and vomiting", category: 2, why: "A ruptured brain aneurysm bleeds around the brain: a subarachnoid hemorrhage." },
          { text: "A seizure or a sudden change in mental status", category: 2, why: "Also signs of a ruptured brain aneurysm — a medical emergency." }
        ],
        hints: [
          "Think about what each aneurysm sits next to: the abdomen and low back, the chest, or the brain.",
          "Rupture symptoms come from bleeding into that same area."
        ],
        explain: [
          "**Where aneurysms form** (L2 s2–4): most are in the **aorta** — thoracic (TAA) or abdominal (AAA, the most common, usually below the kidney arteries). They also form in the **brain**, in the Circle of Willis, and in any peripheral artery; popliteal aneurysms (behind the knee) occur in 5–20 % of people with an AAA.",
          { table: { head: ["Aneurysm", "Symptoms", "If it ruptures"], rows: [
            ["AAA", "Often none; lower abdominal pain, dull low back pain", "Low back, abdominal or groin pain; nausea and vomiting; light-headedness; rapid heart rate → hypovolemic shock"],
            ["TAA", "Jaw, neck, back or chest pain; cough; shortness of breath", "Sudden severe chest or back pain; shock"],
            ["Brain", "Fatigue, loss of balance, speech and vision problems", "Subarachnoid hemorrhage: severe headache, loss of vision or double vision, vomiting, mental status change, seizure, loss of consciousness"]
          ] } }
        ]
      },
      {
        id: "s6",
        type: "test",
        prompt: "Which imaging test is the usual way to find and measure an AAA — the test behind his regular check-up scans, and the one done at his bedside in the emergency department?",
        options: [
          { text: "Abdominal ultrasound", correct: true, reveals: ["ed-ultrasound"], why: "Yes. Ultrasound is quick and painless and uses no radiation: it's the usual test to screen for an AAA and to follow its size, and it can be done at the bedside. CT, MRI and angiography add detail before a repair." },
          { text: "12-lead ECG", why: "An ECG records the heart's electrical activity. It can't show the aorta." },
          { text: "Ankle-brachial index", why: "The ABI screens the leg arteries for narrowing (peripheral arterial disease). It can't find or measure an aneurysm." },
          { text: "X-rays of the lumbar spine", why: "X-rays show bone. They sometimes catch calcium in the aortic wall by chance, but they can't reliably find or measure an aneurysm." }
        ],
        hints: [
          "His scans every 6 months used no radiation and no needles.",
          "Which of these four can actually show the aorta's size?"
        ],
        explain: [
          "**Imaging for aneurysms** (L2 s5): ultrasound, CT, MRI, echocardiography and angiography. Abdominal **ultrasound** is the usual screening and follow-up test for an AAA; CT angiography maps it before repair.",
          "**Treatment** (L2 s5): blood pressure control, and surgery for large aortic aneurysms — the weak section is replaced with a synthetic fabric graft, today often placed from inside the artery through a catheter (endovascular repair). His 5.2 cm aneurysm was approaching the size at which repair is usually offered (about 5.5 cm in men)."
        ]
      }
    ],
    debrief: {
      diagnosis: "Ruptured abdominal aortic aneurysm with hypovolemic shock",
      summary: [
        "Mr. Fisk's 'back pain' was different: sudden, severe and spreading to his abdomen and groin, with nausea, light-headedness, a pulse of 124 and a blood pressure of 86/52. In a man with a known 5.2 cm AAA, that is a **ruptured aneurysm** until proven otherwise — internal bleeding leading to hypovolemic shock.",
        "You called 911 at once, kept him lying flat and still, avoided heat and manual therapy, monitored him and got Dr. Okafor. He reached surgery in time."
      ],
      takeaways: [
        "An aneurysm is a balloon-like bulge of a weakened artery wall; smoking, hypertension, atherosclerosis, infection, genetics, trauma and age all contribute.",
        "Ruptured AAA: sudden low back, abdominal or groin pain, nausea, light-headedness and a racing pulse → hypovolemic shock. Call 911 immediately.",
        "A change in a patient's 'usual' pain, with a change in vital signs, is a red flag — always compare with the baseline.",
        "Shock: fast pulse, falling blood pressure, pale, cool, clammy skin, fast breathing, light-headedness. Keep the patient lying flat and still, with nothing by mouth.",
        "Ultrasound finds and follows an AAA (CT, MRI, echo and angiography are also used); large aortic aneurysms are repaired with a synthetic graft."
      ],
      sources: ["L2 s2–4 · Aneurysm", "L2 s5 · Imaging and treatment of aneurysms", "L2 s12 · Aortic atherosclerosis"]
    },
    casebook: ["aneurysm", "warning-signs", "diagnostic-tests", "procedures"]
  });

  // ---------------------------------------------------------------------------------------
  // 5.5 The Worst Headache — hypertensive crisis and a ruptured brain aneurysm (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pressure-worst-headache",
    unit: "pressure",
    order: 5,
    difficulty: "hard",
    title: "The Worst Headache",
    teaser: "She always gets a headache by the end of the day. This one is different.",
    patient: { name: "Anita Shah", age: 47, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** mechanical neck pain with forward head posture — posture and mobility exercises. From her primary care physician.",
        { quote: "My blood pressure prescription ran out last week. I just haven't had time to get to the pharmacy.", by: "Ms. Shah" }
      ],
      history: {
        list: [
          "**Neck pain** for 2 months from long hours at a laptop, with a dull, band-like ache at the base of her skull by the end of most workdays — her 'usual' headache.",
          "**Hypertension** for 6 years. Her lisinopril ran out 8 days ago.",
          "**Family:** her mother had a 'bleed in the brain' at 55 and recovered with some speech problems.",
          "**Social:** accountant; smokes about 5 cigarettes a day; two cups of coffee a day."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day — none taken for 8 days (prescription ran out)" }
      ],
      allergies: "Sulfa drugs (hives)",
      vitals: {
        hr: 84, bp: "158/98", rr: 16, spo2: 98, temp: "98.4 °F", pain: "4/10 (neck; dull ache at the base of the skull)",
        other: [{ label: "Repeat BP after 5 minutes of quiet sitting", value: "156/96 mmHg" }]
      },
      exam: {
        list: [
          "Forward head posture; neck rotation limited by about a quarter in both directions; tender upper trapezius and suboccipital muscles.",
          "Neurological screen normal: strength, sensation, speech and vision.",
          "Dr. Okafor reviewed the readings, asked Ms. Shah to call her physician's office today about the refill, and cleared a gentle session with blood pressure rechecks."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        update: {
          title: "Twenty minutes in…",
          text: [
            "Ms. Shah is sitting, doing gentle chin tucks, when she suddenly grabs the back of her head with both hands.",
            { quote: "Oh — my head! This is the worst headache of my life. It hit like a thunderclap.", by: "Ms. Shah" },
            "Moments later she vomits. She says she is seeing double, and when you ask what day it is, she isn't sure. The automatic cuff reads **196/122**, pulse 96."
          ],
          vitals: { hr: 96, bp: "196/122", rr: 20, spo2: 98, pain: "10/10 (sudden severe headache)" }
        },
        type: "single",
        keepOrder: true,
        prompt: "First, the numbers: which AHA category is her blood pressure in now?",
        options: [
          { text: "Elevated", why: "Elevated means a systolic of 120–129 with a diastolic below 80. She is far above that." },
          { text: "Stage 1 hypertension", why: "Stage 1 is 130–139 or 80–89. Both of her numbers are much higher." },
          { text: "Stage 2 hypertension", why: "Her arrival readings (158/98) were Stage 2. Now both numbers are past the crisis lines — and the higher category always wins." },
          { text: "Hypertensive crisis", correct: true, why: "Yes: a systolic higher than 180 and a diastolic higher than 120 (either one alone would do). With symptoms like hers, it's a 911 emergency." }
        ],
        hints: [
          "Her arrival readings were Stage 2. Has she crossed another line since?",
          "Check both numbers against every row of the chart, starting at the top."
        ],
        explain: [
          "**Hypertensive crisis:** higher than 180 systolic and/or higher than 120 diastolic — the AHA chart says to consult a doctor immediately (L2 s23). With symptoms of organ damage — severe headache, confusion, vision changes, chest pain, shortness of breath, weakness or trouble speaking — call 911.",
          "Running out of blood pressure medicine, as she did 8 days ago, is a common road to a crisis."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Call 911 now; help her lie down on her side, stay with her and monitor her, and send for Dr. Okafor", correct: true, why: "Yes. A sudden 'worst headache of my life' with vomiting, double vision and confusion is an emergency, whatever the cause. Lying on her side keeps her airway clear if she vomits again. Stay, watch her breathing and responsiveness, and note the time it started." },
          { text: "Dim the lights and let her lie down for 20 minutes, then recheck — it's probably her usual tension headache", why: "Her usual headache builds slowly and never brought vomiting, double vision or confusion. Waiting 20 minutes could cost her brain — or her life." },
          { text: "Massage her suboccipital muscles and put ice on her neck", why: "Manual therapy has no place here, and it wastes minutes that matter. This is a 911 call." },
          { text: "Phone her physician's office to ask for a same-day appointment and a refill", why: "Too slow and the wrong level of care: she needs emergency treatment within minutes, not an office visit." },
          { text: "Give her an acetaminophen tablet from the clinic with some water", why: "PTAs don't give medications — and with vomiting and a possible bleed in the brain, she should have nothing by mouth." }
        ],
        hints: [
          "Her usual headache never came like this. What do the new features add up to?",
          "Who can give her the care she needs within minutes?"
        ],
        explain: [
          "**Call 911** for a sudden severe headache with vomiting, double vision, confusion, a facial droop, arm weakness or slurred speech — and for a blood pressure above 180 systolic and/or 120 diastolic with symptoms (Casebook: red flags). Then:",
          { list: [
            "Stop the session and stay with her.",
            "Help her lie down, turned on her side while she is vomiting or drowsy, to protect her airway.",
            "Nothing to eat, drink or take by mouth.",
            "Recheck blood pressure, pulse, breathing and responsiveness, and note when the symptoms began.",
            "If she has a seizure: protect her head, move hard objects away, don't hold her down or put anything in her mouth, note how long it lasts; turn her on her side afterwards.",
            "Tell Dr. Okafor; send someone to meet the paramedics."
          ] }
        ]
      },
      {
        id: "s3",
        type: "multi",
        prompt: "Telling the causes apart is the emergency team's job, but it helps to know the possibilities. Which serious conditions could explain her sudden symptoms? Select all that apply.",
        options: [
          { text: "A hypertensive crisis affecting the brain", correct: true, why: "Yes. A pressure this high, days after stopping her medicine, can injure the brain and its blood vessels: severe headache, confusion, visual changes, vomiting." },
          { text: "A ruptured brain aneurysm (subarachnoid hemorrhage)", correct: true, why: "Yes. A sudden 'worst headache of my life' with vomiting, double vision and confusion is the classic picture (L2 s4), and her mother's brain bleed is a clue. The bleeding itself can also drive the blood pressure up." },
          { text: "A stroke from bleeding into the brain", correct: true, why: "Yes. Uncontrolled hypertension is a major cause of hemorrhagic stroke (CVA), which can begin with a sudden headache, vomiting and confusion." },
          { text: "A tension-type headache from her neck muscles", why: "Tension headaches build gradually as a dull, band-like ache. They don't strike like a thunderclap or bring vomiting, double vision or confusion." },
          { text: "Orthostatic hypotension", why: "She was sitting still, and her pressure is very high, not low." }
        ],
        hints: [
          "Think about the brain's blood vessels: what happens when pressure surges — or a weak spot bursts?",
          "Which options could explain a thunderclap headache with confusion and double vision?"
        ],
        explain: [
          "Her picture fits **more than one** emergency: a hypertensive crisis, a ruptured brain aneurysm (subarachnoid hemorrhage) or a bleeding stroke. Telling them apart takes a CT scan of the head. Your job is to recognize the emergency and call 911 — the same action for all three.",
          "**Ruptured brain aneurysm** (L2 s4): severe headache, loss of vision or double vision, loss of consciousness, vomiting, a change in mental status, seizure. A medical emergency."
        ]
      },
      {
        id: "s4",
        update: {
          title: "That evening",
          text: "The paramedics took Ms. Shah to the hospital within minutes. Dr. Okafor calls you with the news.",
          exhibits: [
            {
              id: "hospital-update", type: "report", title: "Hospital update",
              text: [
                "**CT of the head:** bleeding in the space around the brain (subarachnoid hemorrhage).",
                "**Angiography:** a ruptured aneurysm at a branch point of the Circle of Willis, at the base of the brain. The neurosurgery team sealed it off the same evening.",
                "**Now:** in intensive care, awake and talking; blood pressure being carefully controlled."
              ]
            }
          ]
        },
        type: "single",
        prompt: "Where do brain aneurysms most often form?",
        options: [
          { text: "In the Circle of Willis, the ring of arteries at the base of the brain", correct: true, why: "Yes. Aneurysms tend to form at the branch points of this ring, where the major arteries feeding the brain join (L2 s4)." },
          { text: "In the carotid arteries of the neck, just below the jaw where you can feel the pulse", why: "The carotid arteries in the neck can narrow with plaque, but brain aneurysms form inside the skull, mostly where the arteries meet in the Circle of Willis." },
          { text: "In the jugular veins that drain blood from the brain", why: "Aneurysms form in arteries, where the pressure is high — not in veins." },
          { text: "In the aorta, where it arches over the heart", why: "That's a thoracic aortic aneurysm. It causes chest, back, jaw or neck pain, cough and breathlessness — not a bleed around the brain." }
        ],
        hints: [
          "Lecture 2 names a ring of arteries that supplies the brain.",
          "Aneurysms form in arteries, where the pressure is high."
        ],
        explain: [
          "Brain aneurysms form mostly in the **Circle of Willis**, the ring of arteries at the base of the brain where the major arteries join and branch (L2 s4). A weak spot at a branch point can balloon out; uncontrolled high blood pressure and smoking raise the risk that it grows and bursts.",
          "Before it ruptures, a brain aneurysm may cause fatigue, loss of balance, and speech and vision problems — or nothing at all."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Eight weeks later",
          text: [
            "Ms. Shah is back in the clinic for her neck — and for her stamina after the hospital stay.",
            { quote: "I'll never let my pills run out again. But why does blood pressure matter so much if you can't even feel it?", by: "Ms. Shah" }
          ],
          vitals: { hr: 76, bp: "126/78", rr: 14, spo2: 98, pain: "2/10 (neck)" }
        },
        type: "multi",
        prompt: "Which conditions does poorly controlled hypertension make more likely? Select all that apply.",
        options: [
          { text: "Heart attack (myocardial infarction)", correct: true, why: "Yes: high pressure damages the arteries and speeds up coronary atherosclerosis." },
          { text: "Heart failure", correct: true, why: "Yes: years of pumping against high pressure (afterload) thicken and finally weaken the heart muscle." },
          { text: "Stroke (CVA)", correct: true, why: "Yes: from bleeding or from blocked arteries in the brain." },
          { text: "Kidney disease", correct: true, why: "Yes: the kidneys' small vessels are damaged by high pressure — and damaged kidneys raise blood pressure further." },
          { text: "Vision loss", correct: true, why: "Yes: the small vessels of the retina are damaged too." },
          { text: "Asthma", why: "Asthma is an airway disease; hypertension doesn't cause it." },
          { text: "Varicose veins", why: "Varicose veins come from faulty valves in the veins, not from high pressure in the arteries." }
        ],
        hints: [
          "High pressure damages every artery it touches — think about which organs depend on small, delicate vessels.",
          "Two of these have nothing to do with arterial pressure."
        ],
        explain: [
          "Poorly controlled hypertension raises the risk of **metabolic syndrome, myocardial infarction, heart failure, stroke (CVA), aneurysm, cognitive changes, kidney dysfunction and visual impairment** (L2 s25). The damage builds silently for years.",
          "Within PTA scope: explain why steady control matters, encourage her to take her medicine as prescribed and to raise any problems (refills, cost, side effects) with her physician or pharmacist, and check her blood pressure at every visit. Progressive exercise is part of managing hypertension (L2 s24)."
        ]
      }
    ],
    debrief: {
      diagnosis: "Ruptured brain aneurysm (subarachnoid hemorrhage) with a hypertensive crisis, after she stopped her blood pressure medicine",
      summary: [
        "Ms. Shah's usual end-of-day headache was replaced by a sudden, thunderclap 'worst headache of my life', with vomiting, double vision and confusion, and a blood pressure of 196/122 — a **hypertensive crisis** with signs of a brain emergency. The hospital found a **ruptured brain aneurysm** in the Circle of Willis.",
        "Whatever the cause, the response was the same: call 911, keep her safe on her side, monitor her and get Dr. Okafor. You didn't need to know which emergency it was to act on it."
      ],
      takeaways: [
        "Hypertensive crisis: higher than 180 systolic and/or higher than 120 diastolic. With symptoms, call 911.",
        "A sudden 'worst headache of my life' with vomiting, vision changes, confusion or a seizure is an emergency — never assume it's a tension headache.",
        "Brain aneurysms form mostly in the Circle of Willis; a rupture causes a subarachnoid hemorrhage.",
        "Uncontrolled hypertension leads to heart attack, heart failure, stroke, aneurysm, kidney disease, vision loss and cognitive changes.",
        "Encourage patients to take their blood pressure medicines as prescribed and to bring problems to their physician — never advise on doses."
      ],
      sources: ["L2 s4 · Brain aneurysm and subarachnoid hemorrhage", "L2 s22–23 · Hypertension classification", "L2 s24–26 · Management, complications and clinical manifestations"]
    },
    casebook: ["aneurysm", "hypertension", "bp-categories", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook entries for unit 5
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "hypertension", kind: "condition", unit: "pressure",
    title: "Hypertension",
    aka: ["high blood pressure", "HTN", "isolated systolic hypertension", "hypertensive crisis", "primary hypertension", "secondary hypertension"],
    summary: "Blood pressure that stays persistently raised. Usually silent for years, it damages the arteries and raises the risk of heart attack, heart failure, stroke, aneurysm and kidney disease.",
    sections: [
      { heading: "What it is", body: [
        "Blood pressure is the force of blood against the artery walls. The **systolic** (top) number is the peak pressure as the heart contracts; the **diastolic** (bottom) number is the lowest pressure, while the heart rests between beats.",
        { list: [
          "**Primary hypertension:** no identifiable cause; develops slowly over years. Most adults with hypertension have this type.",
          "**Secondary hypertension:** caused by another condition — pre-eclampsia, kidney disease, congenital vessel defects, atherosclerosis, stress — or by a medication.",
          "**Isolated systolic hypertension:** a high systolic with a normal diastolic; common after age 50 as the large arteries stiffen."
        ] }
      ] },
      { heading: "Categories (American Heart Association)", body: [
        { table: { head: ["Category", "Systolic", "and/or", "Diastolic"], rows: [
          ["Normal", "below 120", "and", "below 80"],
          ["Elevated", "120–129", "and", "below 80"],
          ["Stage 1 hypertension", "130–139", "or", "80–89"],
          ["Stage 2 hypertension", "140 or higher", "or", "90 or higher"],
          ["Hypertensive crisis", "higher than 180", "and/or", "higher than 120"]
        ] } },
        "When the two numbers fall into different categories, use the **higher** one. A diagnosis of hypertension is made by a physician from readings on separate occasions."
      ] },
      { heading: "Risk factors", body: { list: [
        "Age (the risk rises with age) and family history.",
        "Pregnancy, diabetes and sleep apnea.",
        "**Modifiable:** obesity, a sedentary lifestyle, stress, tobacco use, excessive alcohol, excess dietary sodium."
      ] } },
      { heading: "Signs and symptoms", body: [
        "Usually **none** — hypertension is 'silent', which is what makes it dangerous.",
        "When the pressure is very high: headache, vertigo, a flushed face, blurred vision or other visual changes, confusion, fatigue, an irregular heartbeat, tinnitus, getting up at night to urinate."
      ] },
      { heading: "Treatment and complications", body: { list: [
        "Lifestyle changes for the modifiable risk factors, plus medicines alone or combined: **diuretics, beta blockers, calcium channel blockers and ACE inhibitors** (alpha blockers are another option).",
        "PT: progressive exercise and education on risk factors; some patients qualify for cardiac rehab.",
        "Poorly controlled hypertension raises the risk of metabolic syndrome, myocardial infarction, heart failure, stroke (CVA), aneurysm, cognitive changes, kidney dysfunction and visual impairment.",
        "Running out of or stopping prescribed medicine can send the pressure up quickly."
      ] } },
      { heading: "What it means for the PTA", body: [
        { list: [
          "Measure blood pressure at intake and whenever symptoms appear: seated, back supported, feet flat, arm supported at heart level, the right cuff size, after 5 minutes of rest. Repeat a high reading.",
          "Report new or rising readings to the supervising PT, and encourage follow-up with the physician.",
          "Follow the PT's limits for exercising with high blood pressure. Teach breathing out on effort — breath-holding and straining (the Valsalva maneuver) spike the pressure.",
          "Know the side effects of the patient's blood pressure medicines: dizziness and orthostatic hypotension on standing; a blunted heart-rate response with beta blockers (use RPE).",
          "Encourage patients to take their medicines as prescribed; questions about doses go to the physician."
        ] },
        { warn: "Higher than 180 systolic and/or 120 diastolic: get the supervising PT and a physician's advice right away. With symptoms — severe headache, confusion, vision changes, chest pain, shortness of breath, weakness, trouble speaking — call 911." }
      ] }
    ],
    sources: ["L2 s20–22 · Hypertension", "L2 s23 · AHA blood pressure categories", "L2 s24–26 · Management, prognosis and clinical manifestations"]
  });

  CCF.defineEntry({
    id: "atherosclerosis", kind: "condition", unit: "pressure",
    title: "Atherosclerosis and aortic atherosclerosis",
    aka: ["arteriosclerosis", "hardening of the arteries", "plaque", "atheroma", "aortic calcification"],
    summary: "Fatty, cholesterol-rich plaque (atheroma) builds up in artery walls, narrowing and stiffening them. The symptoms depend on which artery is narrowed; in the aorta it is usually silent.",
    sections: [
      { heading: "What it is", body: [
        "*Athero-* means fatty paste and *-sclerosis* hardening. Fatty, cholesterol plaque (atheroma) is deposited on the inner wall of the artery; the wall thickens and loses its elasticity, flexibility and ability to contract and relax, and the plaque projects into the lumen, causing partial or total obstruction.",
        "**Arteriosclerosis** is the broader term for thickened, hardened artery walls; the lecture uses it for the small arteries and arterioles of the limbs and organs. Both narrow the lumen.",
        { tip: "Lecture 2 (slide 13) says atherosclerosis 'literally means hardening of the arteries'. Strictly, that is arteriosclerosis; atherosclerosis is the hardening and narrowing caused by fatty plaque." }
      ] },
      { heading: "Causes and risk factors", body: "Changes in the artery walls from **long-standing high blood pressure, diabetes and cigarette smoking**; also high cholesterol, inactivity, obesity, age and family history — the same risk factors as coronary artery disease and peripheral vascular disease." },
      { heading: "Signs and symptoms — by artery", body: [
        { table: { head: ["Arteries narrowed", "Possible symptoms", "Leads to"], rows: [
          ["Coronary", "Chest pressure or pain with exertion; shortness of breath; fatigue", "Angina, coronary artery disease, myocardial infarction"],
          ["Cerebral", "Numbness or weakness of an arm or leg; slurred speech or difficulty speaking; facial droop", "Stroke (CVA)"],
          ["Peripheral", "Leg pain on walking, relieved by rest", "Intermittent claudication, peripheral vascular disease"]
        ] } },
        "A clot that forms on plaque in an artery supplying a major organ, such as the brain or heart, can cut off its blood supply: ischemia, severe injury or death. Caught early, medical and surgical treatment improve the outlook."
      ] },
      { heading: "Aortic atherosclerosis", body: { list: [
        "A **'silent'** disease: plaque builds up in the aorta, rarely with outward signs or symptoms. Found mostly in older men; after age 50 most people have some.",
        "Mild disease: fatty deposits with some fibrous plaques. As it progresses, massive plaque can almost obliterate the aorta.",
        "The aorta calcifies and becomes rigid with a small lumen. It can't adjust to the cardiac cycle, which causes **hypertension** — typically a high systolic with a normal diastolic.",
        "**Emboli** can break off and block arteries downstream.",
        "An **aneurysm** often develops under the pressure of the blood."
      ] } },
      { heading: "Treatment", body: "Risk-factor control (stop smoking; control blood pressure, diabetes and cholesterol; exercise; weight); medicines such as statins and antiplatelets; procedures for narrowed arteries — angioplasty and stents, bypass grafts, endarterectomy." },
      { heading: "What it means for the PTA", body: [
        { list: [
          "Atherosclerosis in one place usually means it is elsewhere too: watch every patient for angina, stroke-like signs and claudication.",
          "Aerobic exercise is part of treatment — it raises HDL cholesterol and adds to the effect of statins.",
          "Report new exertional chest pain, new leg pain on walking, or a change in blood pressure pattern to the supervising PT."
        ] },
        { warn: "A sudden facial droop, arm weakness or slurred speech is a stroke warning: call 911 and note the time the symptoms started." }
      ] }
    ],
    sources: ["L2 s12 · Aortic atherosclerosis", "L2 s13–15 · Atherosclerosis and arteriosclerosis", "L2 s16–19 · Coronary artery disease", "L1 s54 · Statins"]
  });

  CCF.defineEntry({
    id: "aneurysm", kind: "condition", unit: "pressure",
    title: "Aneurysm",
    aka: ["abdominal aortic aneurysm", "AAA", "thoracic aortic aneurysm", "TAA", "brain aneurysm", "cerebral aneurysm", "subarachnoid hemorrhage", "Circle of Willis"],
    summary: "A localized, balloon-like bulge in a weakened artery wall. Most form in the aorta; they also form in the brain and in peripheral arteries. A rupture is a life-threatening emergency.",
    sections: [
      { heading: "What it is", body: [
        "An aneurysm forms when an artery wall weakens and can no longer withstand the pressure of the blood, so it bulges outward.",
        { list: [
          "**Abdominal aortic aneurysm (AAA):** the most common; usually below the kidney (renal) arteries.",
          "**Thoracic aortic aneurysm (TAA):** in the chest.",
          "**Brain aneurysm:** in the Circle of Willis, the ring of arteries at the base of the brain.",
          "**Peripheral arteries:** for example behind the knee — popliteal aneurysms occur in 5–20 % of people with an AAA."
        ] }
      ] },
      { heading: "Causes and risk factors", body: "Anything that damages or weakens the vessel wall: **smoking, high blood pressure, atherosclerosis, infection, genetic conditions, trauma and advanced age.** Aortic atherosclerosis often leads to an aneurysm." },
      { heading: "Signs and symptoms", body: { table: { head: ["Aneurysm", "Before rupture", "Rupture"], rows: [
        ["AAA", "Often none; lower abdominal pain, dull low back pain", "Low back, abdominal or groin pain; nausea and vomiting; light-headedness; rapid heart rate → hypovolemic shock, fatal in most cases"],
        ["TAA", "Jaw, neck, back or chest pain; coughing; shortness of breath", "Sudden severe chest or back pain; shock"],
        ["Brain", "Fatigue, loss of balance, speech and vision problems", "Subarachnoid hemorrhage: severe headache, loss of vision or double vision, vomiting, change in mental status, seizure, loss of consciousness — a medical emergency"]
      ] } } },
      { heading: "Tests and treatment", body: { list: [
        "**Imaging:** ultrasound (the usual screening and follow-up test for an AAA), CT, MRI, echocardiography and angiography.",
        "Blood pressure control with antihypertensive medicines; stopping smoking.",
        "**Large aortic aneurysms:** surgical repair — for an AAA usually at about 5.5 cm in men or 5.0 cm in women, or sooner if it grows quickly or causes symptoms — replacing the weak section with a synthetic fabric graft, today often placed from inside the artery through a catheter (endovascular repair)."
      ] } },
      { heading: "What it means for the PTA", body: [
        { list: [
          "Know which patients have an aneurysm, its size and their precautions.",
          "No massage or deep pressure over the abdomen of a patient with an AAA. Avoid heavy lifting, straining and breath-holding, which spike blood pressure, and keep the pressure within the limits the PT sets.",
          "A change in a patient's 'usual' back or abdominal pain is a red flag: check the vital signs and compare them with the baseline."
        ] },
        { warn: "Call 911 for sudden severe back, abdominal or groin pain with light-headedness and a racing pulse (ruptured AAA), or a sudden severe headache with vomiting, double vision, confusion or a seizure (ruptured brain aneurysm). Keep the patient lying still, give nothing by mouth, monitor, and notify the supervising PT." }
      ] }
    ],
    sources: ["L2 s2–4 · Aneurysm", "L2 s5 · Imaging and treatment of aneurysms", "L2 s12 · Aortic atherosclerosis"]
  });

  CCF.defineEntry({
    id: "orthostatic-hypotension", kind: "concept", unit: "pressure",
    title: "Orthostatic hypotension",
    aka: ["postural hypotension", "dizziness on standing", "orthostatic vital signs"],
    summary: "A fall in blood pressure when a person stands up, causing light-headedness, graying or blurred vision and sometimes fainting. A common side effect of heart and blood pressure medicines — and a common cause of falls.",
    sections: [
      { heading: "What it is", body: "By the usual definition, a drop of **20 mmHg or more systolic**, or **10 mmHg or more diastolic**, within 3 minutes of standing up. Symptoms come from too little blood reaching the brain: light-headedness, dizziness, graying or blurred vision, weakness, nausea, fainting." },
      { heading: "Why it happens", body: [
        "Standing pools blood in the legs. Normally the **baroreceptors** in the aorta and carotid arteries sense the fall, and within seconds the sympathetic nervous system tightens the vessels and speeds up the heart.",
        "That response is weaker with blood pressure medicines, dehydration or blood loss, older age, days of bed rest, and when the patient stands up quickly — especially after lying down to exercise, or in the heat."
      ] },
      { heading: "Medicines that can cause it", body: [
        { table: { head: ["Drug class", "Examples"], rows: [
          ["Alpha blockers", "doxazosin (Cardura), prazosin (Minipress)"],
          ["ACE inhibitors", "captopril, enalapril, lisinopril"],
          ["Diuretics", "furosemide (Lasix), hydrochlorothiazide"],
          ["Beta blockers", "atenolol, metoprolol"],
          ["Calcium channel blockers", "nifedipine, diltiazem, amlodipine"],
          ["Nitrates", "nitroglycerin"]
        ] } },
        "New medicines, higher doses and combinations carry the highest risk."
      ] },
      { heading: "Checking orthostatic vital signs", body: { olist: [
        "Have the patient lie down for about 5 minutes; take blood pressure and pulse.",
        "Have the patient stand, with support and a chair or wheelchair behind them.",
        "Repeat blood pressure and pulse at 1 and 3 minutes, asking about symptoms.",
        "A drop of 20 systolic or 10 diastolic or more — or symptoms — is a positive test: sit the patient down and report it to the supervising PT."
      ] } },
      { heading: "What to do, and how to prevent it", body: [
        { list: [
          "**If symptoms start:** sit or lie the patient down right where they are (legs raised if lying), stay with them, monitor blood pressure and pulse until they recover, and tell the supervising PT.",
          "**Prevention:** change position in stages (lying → sitting → standing); pause sitting, with ankle pumps, before standing; stand with support and pause before walking; keep a chair close; breathe out rather than hold the breath when rising; drink enough fluid, as the physician advises.",
          "Report repeated episodes: the physician may review the medicines. Never tell a patient to skip or change a medicine."
        ] },
        { warn: "Call 911 if the patient loses consciousness and doesn't recover promptly, or has chest pain, an irregular racing pulse, or stroke-like signs." }
      ] }
    ],
    sources: ["L1 s51 · Alpha adrenergic antagonists", "L1 s52 · ACE inhibitors", "L1 s56–59 · Beta blockers, calcium channel blockers, diuretics, nitrates", "L1 s44 · Syncope", "L1 s10 · Neural control and baroreceptors"]
  });
})();
