/*
 * The Cardiac Case Files — Unit 4: Pump Failure.
 * Cases 4.1–4.5 and the unit's Casebook entries (heart-failure, pulmonary-edema,
 * cardiomyopathy, cor-pulmonale). Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 4.1 The Swollen Ankles — right-sided heart failure (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pump-swollen-ankles",
    unit: "pump",
    order: 1,
    difficulty: "easy",
    title: "The Swollen Ankles",
    teaser: "Three pounds in two days, shoes that won't fit, and a tight, full feeling under her ribs.",
    patient: { name: "Mae Thompson", age: 74, sex: "F" },
    setting: "Home health visit",
    file: {
      referral: [
        "**Referral:** home health PT after a 5-day hospital stay for heart failure — strengthening, walking and home safety. From the hospital physician.",
        { quote: "My shoes don't fit again, and my belly feels tight. I haven't been hungry at all.", by: "Mrs. Thompson" }
      ],
      history: {
        list: [
          "**Past medical history:** heart failure (hospital stay, discharged 10 days ago); hypertension for 25 years.",
          "**Past two days:** her ankles have swollen again, her abdomen feels full and tight, she has a dull ache under her right ribs, and she has little appetite.",
          "**Breathing:** no more breathless than usual; sleeps on one pillow; doesn't wake up short of breath.",
          "**Her daily weight log:** 156 lb two days ago; 159 lb this morning.",
          "**Social:** retired school cook; lives with her husband in a one-story house."
        ]
      },
      medications: [
        { name: "Furosemide (Lasix)", dose: "40 mg every morning", "class": "Diuretic" },
        { name: "Lisinopril", dose: "10 mg once a day", "class": "ACE inhibitor" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 94, bp: "134/80", rr: 18, spo2: 95, temp: "98.0 °F", weight: "159 lb [72 kg] (156 lb two days ago)" },
      exam: {
        list: [
          "Both ankles and shins: pitting edema. A firm press leaves a pit about 3 mm deep that fills back in within about 10 seconds.",
          "Neck veins: distended (bulging) while she sits propped up at 45°.",
          "Abdomen swollen and tight; tender under the right ribs.",
          "Lungs clear, no crackles; breathing comfortable at rest."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which kind of heart failure best explains Mrs. Thompson's findings?",
        options: [
          { text: "Right-sided heart failure", correct: true, why: "Yes: swollen ankles and shins, distended neck veins, a swollen abdomen, an aching liver under the right ribs, poor appetite and rapid weight gain — blood backing up in the body's veins. Her lungs are clear." },
          { text: "Left-sided heart failure", why: "Left-sided failure backs fluid up into the lungs: breathlessness, orthopnea, waking at night gasping, crackles. Her lungs are clear and she sleeps on one pillow." },
          { text: "Swelling from sitting too long, not her heart", why: "Sitting can puff up the ankles, but it doesn't distend the neck veins, swell the abdomen or add 3 lb in two days." },
          { text: "A deep vein thrombosis in both legs", why: "A DVT usually affects one leg, with warmth, redness and pain. Her swelling is in both legs and comes with neck-vein and abdominal signs — a heart problem." }
        ],
        hints: [
          "Where is the fluid collecting: in her lungs, or in her legs, belly and veins?",
          "Her lungs are clear. Which side of the heart backs up into the lungs?"
        ],
        explain: [
          "In **right-sided heart failure** the right ventricle can't pump all the blood returning from the body on to the lungs, so it backs up into the **systemic veins**: **dependent pitting edema** (ankles and shins first), **jugular venous distention**, an enlarged, aching liver (right upper quadrant pain), **ascites** (fluid in the abdomen), poor appetite and nausea, and **weight gain**.",
          "Her edema is **2+**: easily seen, 2–4 mm deep, filling back in within 15 seconds. Bilateral pitting edema, especially with breathlessness or fatigue, points to heart failure; one swollen leg points to a local cause.",
          { tip: "A gain of 2–3 lb in a day or about 5 lb in a week is a warning sign of fluid building up. Report it to the supervising PT, who will contact her physician." }
        ]
      },
      {
        id: "s2",
        type: "classify",
        prompt: "Dr. Okafor quizzes you on the two sides of heart failure. Sort each sign.",
        categories: ["Left-sided failure (backs up into the lungs)", "Right-sided failure (backs up into the body)"],
        items: [
          { text: "Orthopnea — breathless when lying flat", category: 0 },
          { text: "Crackles (rales) at the lung bases", category: 0 },
          { text: "Waking up at night gasping for breath (paroxysmal nocturnal dyspnea)", category: 0 },
          { text: "Frothy pink sputum", category: 0 },
          { text: "Jugular venous distention", category: 1 },
          { text: "Dependent pitting edema of the ankles and shins", category: 1 },
          { text: "Ascites (fluid in the abdomen)", category: 1 },
          { text: "An ache under the right ribs from a congested liver", category: 1 }
        ],
        hints: [
          "Left-sided failure backs blood up into the lungs; right-sided failure backs it up into the body's veins."
        ],
        explain: [
          { table: { head: ["Left-sided failure", "Right-sided failure"], rows: [
            ["Blood backs up into the left atrium and the lungs", "Blood backs up into the body's veins"],
            ["Dyspnea (on exertion first), orthopnea, paroxysmal nocturnal dyspnea", "Dependent pitting edema (ankles and shins first)"],
            ["Crackles (rales), cough, frothy pink sputum, pulmonary edema", "Jugular venous distention, ascites, abdominal swelling"],
            ["Fatigue, tachycardia, an S3, confusion, restlessness", "Weight gain, right upper quadrant pain (liver congestion), poor appetite and nausea"]
          ] } },
          "Either side can lead to the other — left-sided failure is the most common cause of right-sided failure — so many patients have signs of both."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "Why do distended neck veins tell you about the *right* side of her heart?",
        options: [
          { text: "No valve sits between the superior vena cava and the right atrium", correct: true, why: "Yes. The jugular veins empty into the superior vena cava, which opens straight into the right atrium. When the right heart backs up, the pressure shows in the neck." },
          { text: "The jugular veins carry blood straight from the left ventricle to the brain", why: "That's the job of the carotid arteries. The jugular veins carry blood *back* from the head toward the heart." },
          { text: "Fluid from her lungs drains into the veins of her neck", why: "Fluid in the lungs causes crackles and breathlessness; it doesn't drain into the neck veins. And her lungs are clear." },
          { text: "High blood pressure makes every blood vessel bulge", why: "Arterial blood pressure doesn't make the neck veins bulge. JVD reflects the pressure in the right atrium." }
        ],
        hints: [
          "Follow the blood from the neck veins down into the heart. Is there a valve on the way?"
        ],
        explain: [
          "**Jugular venous distention (JVD)** comes from fluid overload. The jugular veins drain into the superior vena cava, and **no valve separates the superior vena cava from the right atrium** — so the neck veins work like a pressure gauge for the right side of the heart.",
          "Look for JVD with the patient sitting up at about 45°: neck veins that stay distended at that angle mean raised right-heart pressure."
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "She takes furosemide (Lasix), a diuretic. Which precautions and actions fit? Select all that apply.",
        options: [
          { text: "Have her rise slowly, and steady her when she stands — dizziness and falls are more likely", correct: true, why: "Diuretics lower blood volume and blood pressure, so changing position can make her dizzy." },
          { text: "Watch for muscle weakness or cramps, and an irregular pulse", correct: true, why: "These are signs of electrolyte imbalance, such as low potassium — a common diuretic side effect." },
          { text: "Plan sessions around her bathroom needs after the morning dose", correct: true, why: "Furosemide makes her pass a lot of urine for a few hours after each dose; rushing to the bathroom is a common cause of falls." },
          { text: "Report her 3-lb weight gain to Dr. Okafor today", correct: true, why: "Rapid weight gain means fluid is building up despite the diuretic. Her physician may need to adjust her treatment." },
          { text: "Encourage her to drink extra water to replace what the pills remove", why: "In heart failure, fluids are often limited. Questions about how much she should drink go to her physician — don't change her fluid plan yourself." },
          { text: "Tell her to take an extra furosemide tablet when her ankles swell", why: "A PTA never advises changing a dose; that's her physician's decision." },
          { text: "Expect a dry, tickly cough from the furosemide", why: "A dry cough is a side effect of ACE inhibitors such as her lisinopril, not of diuretics." }
        ],
        hints: [
          "Furosemide removes sodium and water and lowers blood pressure. What can that do to her balance and her electrolytes?",
          "Two of the wrong options change her medicines or fluids; one belongs to her other drug."
        ],
        explain: [
          "**Diuretics** make the kidneys excrete more sodium and water, lowering plasma volume, blood pressure and edema. Side effects: **dehydration, hypotension, electrolyte imbalance** (for example low potassium), frequent urination, raised LDL cholesterol and arrhythmias.",
          "PT implications: position changes can cause **dizziness and falls**; watch for signs of electrolyte imbalance — **muscle weakness or cramping**.",
          { tip: "Daily weights are one of the best early warnings in heart failure. Ask about them at every visit." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Right-sided heart failure with fluid overload",
      summary: [
        "Mrs. Thompson's swollen ankles and shins (2+ pitting edema), distended neck veins, swollen abdomen, aching liver, poor appetite and 3-lb weight gain in two days were signs of **right-sided heart failure**: blood backing up into the body's veins. Her clear lungs showed that fluid wasn't backing up into her lungs.",
        "Reporting the rapid weight gain, and working safely around her diuretic, can keep her out of the hospital."
      ],
      takeaways: [
        "Right-sided failure backs blood up into the body: dependent pitting edema, JVD, ascites, liver congestion (right upper quadrant pain), poor appetite and weight gain.",
        "Left-sided failure backs blood up into the lungs: dyspnea, orthopnea, paroxysmal nocturnal dyspnea, crackles, frothy pink sputum.",
        "No valve separates the superior vena cava from the right atrium, so JVD reflects right-heart pressure.",
        "Report rapid weight gain (2–3 lb in a day or about 5 lb in a week) and new or worsening edema to the supervising PT.",
        "Diuretics: rise slowly (dizziness and falls), and watch for muscle weakness or cramping from electrolyte imbalance."
      ],
      sources: ["L2 s34–38 · Congestive heart failure", "L1 s34–35 · Edema and its grading", "L1 s58 · Diuretic agents"]
    },
    casebook: ["heart-failure", "diuretics", "edema-scale", "ace-inhibitors"]
  });

  // ---------------------------------------------------------------------------------------
  // 4.2 Three Pillows — left-sided heart failure (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pump-three-pillows",
    unit: "pump",
    order: 2,
    difficulty: "medium",
    title: "Three Pillows",
    teaser: "He props himself up on three pillows — and still wakes up gasping.",
    patient: { name: "Victor Hale", age: 67, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** generalized weakness and deconditioning — strengthening and endurance. From his primary care physician. Dr. Okafor evaluated him last week; today is your first session with him.",
        { quote: "I'm worn out all the time. Can't walk a block without stopping to catch my breath — and it's worse than last week.", by: "Mr. Hale" }
      ],
      history: {
        list: [
          "**Past medical history:** myocardial infarction two years ago; hypertension for 20 years; high cholesterol.",
          "**Getting worse since his evaluation:** now sleeps propped up on **three pillows** (one, until a month ago); **wakes at night gasping** and has to sit on the edge of the bed; breathless after one block; a dry cough at night; tired all the time.",
          "**Social:** retired accountant; never smoked; lives with his wife."
        ]
      },
      medications: [
        { name: "Enalapril (Vasotec)", dose: "5 mg twice a day" },
        { name: "Furosemide", dose: "20 mg once a day" },
        { name: "Metoprolol succinate", dose: "50 mg once a day" },
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 102, bp: "112/70", rr: 22, spo2: 93, temp: "98.2 °F" },
      exam: {
        list: [
          "Sitting upright, breathing a little fast at rest; speaks in full sentences.",
          "Crackles at both lung bases that don't clear with coughing.",
          "Dr. Okafor listens to his heart: an extra sound just after S2, loudest at the apex with him lying on his left side — an **S3**.",
          "Neck veins not distended at 45°; no ankle swelling."
        ]
      },
      tests: [
        {
          id: "echo", type: "report", title: "Echocardiogram report", sealed: true,
          text: [
            "**Left ventricle:** dilated. The anterior wall is thin and scarred (old infarct) and barely moves; overall squeeze is poor.",
            "**Ejection fraction: 30 %** (normal more than 55 %).",
            "Doppler: raised left-sided filling pressures. Mild mitral regurgitation. Right ventricle normal.",
            "**Impression:** heart failure with reduced ejection fraction after an old anterior MI."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which problem best explains his three pillows, his night-time gasping and the crackles?",
        options: [
          { text: "Left-sided heart failure", correct: true, why: "Yes. Orthopnea (needing pillows to breathe), paroxysmal nocturnal dyspnea (waking up gasping), crackles at both bases, exertional dyspnea, a dry night-time cough, fatigue and a fast heart rate: fluid backing up into his lungs." },
          { text: "Right-sided heart failure", why: "Right-sided failure backs fluid up into the body's veins: ankle edema, JVD, ascites. He has none of these; his fluid is in his lungs." },
          { text: "A chest infection (pneumonia)", why: "Pneumonia usually brings fever and colored sputum, often on one side. His temperature is normal, the crackles are at both bases, and he has an S3 and orthopnea." },
          { text: "Simple deconditioning", why: "Being out of shape makes exercise tiring, but it doesn't cause orthopnea, night-time gasping, crackles or an S3." }
        ],
        hints: [
          "Why would lying flat make breathing harder? Where is the extra fluid going?",
          "Which side of the heart backs up into the lungs?"
        ],
        explain: [
          "In **left-sided heart failure** the left ventricle can't pump out all the blood arriving from the lungs, so pressure backs up into the left atrium and the lungs, and fluid leaks into the lung tissue.",
          "Lying flat brings more blood back from the legs to the struggling heart and lungs — so he needs pillows (**orthopnea**) and wakes up gasping after a few hours in bed (**paroxysmal nocturnal dyspnea**). Breathlessness on exertion usually comes first. A fast resting heart rate is an early sign of heart failure."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What does his S3 suggest in a 67-year-old — and what should happen next?",
        options: [
          { text: "Ventricular failure — hold exercise until his physician has seen him", correct: true, why: "Yes. An S3 is normal in children and young adults but abnormal over 40, where it points to ventricular failure. With worsening orthopnea, night-time gasping and crackles, he needs his physician before he exercises." },
          { text: "A normal sound at any age — carry on with his strengthening", why: "An S3 can be normal in children and young adults, but not in adults over 40." },
          { text: "A sign of fitness, like an athlete's heart — no action needed", why: "An athlete's heart is larger and slower, without orthopnea, crackles or night-time gasping." },
          { text: "Atrial contraction against a stiff ventricle (an S4) — nothing to report", why: "That describes an S4, heard just *before* S1 — and an S4 is abnormal too. His extra sound comes just *after* S2." }
        ],
        hints: [
          "An S3 is normal in some age groups but not in others. Which group is he in?",
          "His symptoms are getting worse. Is today the day to push his exercise?"
        ],
        explain: [
          "An **S3** is the sound of blood rushing into the ventricles in early diastole, just after S2. It's best heard at the apex with the patient lying on the left side. It is normal in children and young adults but **abnormal in adults over 40**, where it suggests **left ventricular failure** (also tachycardia, mitral regurgitation or congestive heart failure) — the *S3 gallop* of heart failure.",
          "New or worsening heart-failure signs mean **no exercise today**: tell the supervising PT, who contacts his physician.",
          { warn: "Call 911 if his breathlessness becomes severe at rest, or he has chest pain, frothy pink sputum or confusion — signs of acute pulmonary edema." }
        ]
      },
      {
        id: "s3",
        type: "test",
        prompt: "His physician wants to know how well his left ventricle pumps. Which test measures his ejection fraction?",
        options: [
          { text: "An echocardiogram", correct: true, reveals: ["echo"], why: "Yes. An echo shows the chambers, walls and valves in real time and measures the ejection fraction; Doppler echo adds the filling pressures." },
          { text: "A chest X-ray", why: "A chest X-ray shows fluid in the lungs and the size of the heart, but not how much blood each beat ejects." },
          { text: "A 12-lead ECG", why: "An ECG shows the rhythm and signs of ischemia or an old infarct — not the ejection fraction." },
          { text: "A 48-hour Holter monitor", why: "A Holter records the rhythm for 24–48 hours. It doesn't measure pumping." }
        ],
        hints: [
          "Which test makes moving pictures of the heart with sound waves?"
        ],
        explain: [
          "**Echocardiography** uses ultrasound to show the heart in real time: chamber size, wall and septum thickness, the valves — and the **ejection fraction** (normal more than 55 %).",
          "His EF is **30 %**: a dilated left ventricle whose old, scarred anterior wall hardly moves. A low EF reduces aerobic capacity, so he will tire quickly with exercise.",
          "Other heart-failure tests: blood tests (electrolytes, BUN, creatinine, TSH, CBC), urinalysis, a chest X-ray and an ECG."
        ]
      },
      {
        id: "s4",
        update: {
          title: "Three weeks later",
          text: [
            "His physician increased his furosemide and his enalapril. He sleeps on one pillow, the night-time gasping has stopped, the crackles are gone, and he's cleared to start exercising.",
            { quote: "Breathing's much better. But this dry, tickly cough just won't quit — day and night.", by: "Mr. Hale" }
          ],
          vitals: { hr: 78, bp: "106/66", rr: 16, spo2: 96 }
        },
        type: "single",
        prompt: "His lungs are clear now. Which of his medicines can cause a persistent dry cough?",
        options: [
          { text: "Enalapril", correct: true, why: "Yes. A dry, persistent cough is a well-known side effect of ACE inhibitors. He should tell his physician, who may switch him to a different medicine — he shouldn't simply stop taking it." },
          { text: "Furosemide", why: "Furosemide's side effects are dehydration, low blood pressure, electrolyte imbalance and frequent urination — not a cough." },
          { text: "Metoprolol", why: "Metoprolol can cause fatigue, a slow pulse and dizziness; a dry cough isn't one of its typical effects." },
          { text: "Atorvastatin", why: "Statins can cause muscle aches, headache and stomach upset — not a dry cough." }
        ],
        hints: [
          "One drug class in the lecture lists “dry cough” among its side effects.",
          "His night-time cough came from fluid in his lungs — but his lungs are clear now."
        ],
        explain: [
          "**ACE inhibitors** — Vasotec (enalapril), Capoten (captopril), lisinopril — lower blood pressure and afterload and are a mainstay of heart-failure treatment. Side effects: hypotension, dizziness, a **dry cough**, high potassium and low sodium.",
          "A cough in heart failure can also mean fluid in the lungs, so ask when it happens and check his breathing. Report it either way — and never suggest stopping the medicine.",
          "PT implications of ACE inhibitors: avoid sudden changes in posture (dizziness, fainting), and heart-failure patients should avoid rapid increases in activity."
        ]
      },
      {
        id: "s5",
        type: "single",
        prompt: "Dr. Okafor asks you to start his exercise program. What's the best way to begin?",
        options: [
          { text: "Gentle walking, progressed slowly by heart rate and RPE", correct: true, why: "Yes. Walking is the usual way to start in heart failure. Progress gradually, guided by his heart rate, perceived exertion and symptoms — no sudden jumps in activity." },
          { text: "Treadmill interval sprints to push his ejection fraction back up quickly", why: "Intense, sudden efforts are exactly what heart-failure patients should avoid. Progress gradually." },
          { text: "Heavy weight training first, to rebuild the muscle he has lost", why: "Heavy lifting and straining raise blood pressure and afterload sharply — hard on a weak left ventricle. Start with walking and light, progressive exercise." },
          { text: "Bed rest until his ejection fraction is back to normal", why: "His EF may never be normal, and inactivity worsens deconditioning. Individualized, gradually progressed exercise is part of heart-failure care." },
          { text: "Exercise at 85 % of his age-predicted maximum heart rate", why: "Far too intense to start with — and metoprolol blunts his heart-rate response, so a heart-rate target alone isn't reliable. Use RPE and symptoms too." }
        ],
        hints: [
          "The lecture names the usual way to start exercise in heart failure, and what guides the progression.",
          "Think about what the ACE-inhibitor slide says about heart failure and increases in activity — and what metoprolol does to his heart rate."
        ],
        explain: [
          "Exercise in heart failure is **individualized**: the cause, the medications and the patient's overall health all shape the plan. **Walking** is the usual starting point, and patients progress their endurance **following their heart rate and perceived exertion**.",
          "Avoid rapid increases in activity. On a beta blocker such as metoprolol, the heart rate rises less, so **RPE** and symptoms matter more.",
          { tip: "Before each session, check for signs of worsening failure: weight gain, new edema, more breathlessness, orthopnea or night-time gasping." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Left-sided heart failure with reduced ejection fraction (EF 30 %) after an old MI",
      summary: [
        "Mr. Hale's three pillows (orthopnea), night-time gasping (paroxysmal nocturnal dyspnea), crackles, fast heart rate and S3 were signs of **left-sided heart failure**: his scarred, dilated left ventricle couldn't keep up, and fluid backed up into his lungs. The echocardiogram showed an ejection fraction of 30 %.",
        "Holding exercise while the signs were getting worse, then starting with gentle walking progressed by heart rate and RPE, kept him safe. His new dry cough pointed to his ACE inhibitor."
      ],
      takeaways: [
        "Left-sided failure: exertional dyspnea, orthopnea, paroxysmal nocturnal dyspnea, crackles, cough, fatigue, tachycardia and an S3.",
        "An S3 is normal in children and young adults but suggests ventricular failure in adults over 40.",
        "An echocardiogram measures the ejection fraction (normal more than 55 %); a low EF limits aerobic capacity.",
        "ACE inhibitors can cause a dry cough, dizziness and hypotension; report side effects, and never suggest stopping a medicine.",
        "Exercise in heart failure: start with walking, progress gradually by heart rate and RPE, avoid sudden increases — and hold it when the signs are getting worse."
      ],
      sources: ["L2 s34–39 · Congestive heart failure", "L1 s22–23 · Heart sounds (S3)", "L1 s50 · Echocardiography", "L1 s52 · ACE inhibitor agents", "L1 s56 · Beta blocker agents"]
    },
    casebook: ["heart-failure", "ace-inhibitors", "diagnostic-tests", "auscultation", "beta-blockers"]
  });

  // @@CASES-4.3-4.5@@

  // @@ENTRIES@@
})();
