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

  // ---------------------------------------------------------------------------------------
  // 4.3 The Stretched Heart — dilated cardiomyopathy (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pump-stretched-heart",
    unit: "pump",
    order: 3,
    difficulty: "medium",
    title: "The Stretched Heart",
    teaser: "Three months sober — so why is he more breathless every week?",
    patient: { name: "Russell Grant", age: 52, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** fatigue and deconditioning — endurance and strengthening. From his primary care physician, who has also referred him to a cardiologist.",
        { quote: "I quit drinking three months ago. I thought I'd feel better by now — instead I get winded just carrying the groceries in.", by: "Mr. Grant" }
      ],
      history: {
        list: [
          "**Past three months:** breathlessness on exertion that is slowly getting worse; tired all the time; ankles swell by evening; spells of a pounding, racing heartbeat; poor appetite.",
          "**Alcohol:** drank heavily for 25 years (about 10 beers a day); sober for three months and going to a support group.",
          "**Past medical history:** no known heart attack; blood pressure has always been normal.",
          "**Social:** truck mechanic; lives alone; has never smoked.",
          "**Dr. Okafor's evaluation note:** “Findings shared with his physician. Exercise on hold until the cardiology work-up is done.”"
        ]
      },
      medications: [
        { name: "Thiamine", dose: "100 mg once a day" },
        { name: "Folic acid", dose: "1 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 98, bp: "118/76", rr: 20, spo2: 95, temp: "98.4 °F", rhythm: "regular, with occasional early beats" },
      exam: {
        list: [
          "Breathless after walking 300 feet in the clinic hallway (RPE 15).",
          "1+ pitting edema at both ankles.",
          "A few crackles at both lung bases; an S3 at the apex."
        ]
      },
      tests: [
        {
          id: "cxr", type: "report", title: "Chest X-ray report",
          text: [
            "**Heart:** enlarged (cardiomegaly).",
            "**Lungs:** mild congestion at both bases."
          ]
        },
        {
          id: "echo", type: "report", title: "Echocardiogram report", sealed: true,
          text: [
            "**Left ventricle:** markedly dilated (enlarged chamber) with **thin walls**; the whole ventricle squeezes weakly.",
            "**Ejection fraction: 25 %** (normal more than 55 %).",
            "Both atria enlarged; mild leak of the mitral valve.",
            "**Impression:** dilated cardiomyopathy, probably alcohol-related. Coronary arteries still to be checked."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "test",
        prompt: "The chest X-ray shows a big heart, but not *why* it's big. Which test shows his chamber sizes, the thickness of his heart walls and how well he pumps?",
        options: [
          { text: "An echocardiogram", correct: true, reveals: ["echo"], why: "Yes. An echo shows the size and function of the ventricles, the thickness of the walls and septum, the valves and the ejection fraction." },
          { text: "A 12-lead ECG", why: "An ECG shows the rhythm and electrical signs such as ischemia — not chamber sizes or wall thickness." },
          { text: "A 48-hour Holter monitor", why: "A Holter could catch the arrhythmias behind his palpitations, but it doesn't show the heart's structure." },
          { text: "Pulmonary function tests", why: "Pulmonary function tests measure the lungs, not the heart." }
        ],
        hints: [
          "The lecture's test for chamber size and wall and septum thickness uses sound waves."
        ],
        explain: [
          "**Echocardiography** gives real-time pictures of the heart: the size and function of the ventricles, the thickness of the walls and septum, the valves, and the ejection fraction.",
          "His echo: a **markedly dilated left ventricle with thin walls**, squeezing weakly — an **ejection fraction of 25 %**."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "Which type of cardiomyopathy does his echo show?",
        options: [
          { text: "Dilated cardiomyopathy", correct: true, why: "Yes: an enlarged chamber with thin walls that squeezes weakly (EF 25 %)." },
          { text: "Hypertrophic cardiomyopathy", why: "Hypertrophic cardiomyopathy *thickens* the heart muscle, especially the left ventricle. His walls are thin." },
          { text: "Restrictive cardiomyopathy", why: "In restrictive cardiomyopathy fibrous tissue stiffens the walls so the heart can't expand and fill; the ventricles aren't dilated like his." },
          { text: "An athlete's heart", why: "Training enlarges the left ventricle but keeps a strong squeeze and normal-to-thick walls — not a weak, thin-walled ventricle with an EF of 25 %." }
        ],
        hints: [
          "Thin walls and a big chamber: is that heart stretched, thickened or stiff?"
        ],
        explain: [
          "**Cardiomyopathy** is a group of diseases of the heart muscle itself. When the myocardium is damaged it may **dilate** or **hypertrophy**.",
          "In **dilated cardiomyopathy** the muscle is **thinner than usual** and the chamber is enlarged, so each beat is weak. Long-term heavy drinking is a classic cause."
        ]
      },
      {
        id: "s3",
        type: "classify",
        prompt: "Match each feature to its type of cardiomyopathy.",
        categories: ["Dilated", "Hypertrophic", "Restrictive"],
        items: [
          { text: "Thin heart muscle and an enlarged chamber", category: 0 },
          { text: "A weak squeeze and a low ejection fraction", category: 0 },
          { text: "Thickened myocardium, especially in the left ventricle", category: 1 },
          { text: "Walls so thick that the chamber can be smaller than normal", category: 1 },
          { text: "Fibrous tissue stops the heart from expanding", category: 2 },
          { text: "Stiff walls that can't relax and fill, though they may be of near-normal thickness", category: 2 }
        ],
        hints: [
          "Think about what each name means: *dilated* (widened), *hypertrophic* (overgrown), *restrictive* (held back)."
        ],
        explain: [
          { table: { head: ["Type", "The muscle", "What goes wrong"], rows: [
            ["Dilated", "Thinner than usual; the chamber is enlarged", "A weak squeeze (low ejection fraction)"],
            ["Hypertrophic", "Thickened, especially the left ventricle", "A thick, stiff ventricle with a small chamber fills poorly"],
            ["Restrictive", "Stiffened by fibrous tissue", "The heart can't expand to fill"]
          ] } },
          "All three can lead to **heart failure** and **arrhythmias**. Hypertrophic cardiomyopathy is often inherited, and it is a known cause of sudden cardiac death in young athletes."
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "Which of these are causes of cardiomyopathy? Select all that apply.",
        options: [
          { text: "Long-term heavy drinking (alcoholism)", correct: true, why: "Alcohol is directly toxic to heart muscle — Mr. Grant's cause." },
          { text: "Previous heart attacks", correct: true, why: "Scarred, dead muscle after MIs weakens the ventricle." },
          { text: "Long-term, severe hypertension", correct: true, why: "Years of pumping against high pressure damage the myocardium." },
          { text: "Viral infections", correct: true, why: "Some viruses inflame the heart muscle (myocarditis), which can leave it dilated and weak." },
          { text: "Systemic lupus erythematosus (SLE)", correct: true, why: "This autoimmune disease is on the lecture's list of causes." },
          { text: "Varicose veins", why: "Varicose veins are a problem of the leg veins; they don't damage heart muscle." },
          { text: "Regular endurance training", why: "Training enlarges the heart in a healthy way (athlete's heart). It isn't a cause of cardiomyopathy." }
        ],
        hints: [
          "The lecture's list includes a drink, an infection, an autoimmune disease, a pressure problem and earlier heart damage.",
          "Two options don't damage heart muscle at all."
        ],
        explain: [
          "Causes of cardiomyopathy (Lecture 2, slide 43): **heart attacks; alcoholism; long-term, severe hypertension; systemic lupus erythematosus (SLE); end-stage renal disease; and viral infections**. Some forms are inherited, and sometimes no cause is found.",
          "Cardiomyopathy is serious and can get progressively worse; some patients eventually need a heart transplant."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Two weeks later",
          text: [
            "His cardiologist confirmed alcohol-related dilated cardiomyopathy (his coronary arteries are clear), started heart-failure medicines, and cleared him for supervised exercise.",
            { quote: "So the drinking did this. Can it get any better?", by: "Mr. Grant" }
          ],
          vitals: { hr: 84, bp: "108/70", rr: 18, spo2: 96 }
        },
        type: "single",
        prompt: "As his exercise sessions begin, what should you watch for most closely?",
        options: [
          { text: "Worsening heart failure and arrhythmias", correct: true, why: "Yes. These are the serious complications of cardiomyopathy: more breathlessness, swelling or weight gain; palpitations, dizziness, fainting, an irregular pulse." },
          { text: "Signs of bleeding and bruising", why: "That's the main concern with anticoagulants and antiplatelets — not the main risk of cardiomyopathy itself." },
          { text: "Calf pain on walking that eases with rest", why: "That's intermittent claudication from peripheral arterial disease, not a complication of cardiomyopathy." },
          { text: "Pain and stiffness in his knees", why: "Joint pain is worth noting, but it isn't the danger that cardiomyopathy brings." }
        ],
        hints: [
          "The lecture names two serious complications of cardiomyopathy: think pump, and think rhythm."
        ],
        explain: [
          "**Heart failure** and **arrhythmias** are the serious complications of cardiomyopathy. Its signs and symptoms include dyspnea, cough, palpitations, dependent edema, ascites, chest pain, dizziness and light-headedness, low urine output, changes in mental alertness, loss of appetite and general deconditioning.",
          "Check his vital signs, weight and symptoms at every session, and progress exercise gradually. Stop and notify the supervising PT for new palpitations, an irregular pulse, dizziness, more breathlessness, swelling or weight gain; call 911 for fainting, chest pain or collapse.",
          { tip: "Encourage him: staying sober is the most important thing he can do, and in alcohol-related cardiomyopathy the heart can recover partly once drinking stops." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Dilated cardiomyopathy related to long-term heavy alcohol use",
      summary: [
        "Twenty-five years of heavy drinking had damaged Mr. Grant's heart muscle. His echo showed **dilated cardiomyopathy** — a stretched, thin-walled left ventricle with an ejection fraction of 25 % — causing heart-failure symptoms (breathlessness, fatigue, ankle swelling) and palpitations.",
        "The serious complications of cardiomyopathy are heart failure and arrhythmias, so every session watches for both. Staying sober gives his heart its best chance to recover."
      ],
      takeaways: [
        "Cardiomyopathy is a group of heart-muscle diseases: dilated (thin muscle, enlarged chamber), hypertrophic (thickened muscle, especially the LV), restrictive (fibrous tissue; the heart can't expand).",
        "Causes: heart attacks, alcoholism, long-term severe hypertension, SLE, end-stage renal disease and viral infections.",
        "An echocardiogram shows chamber size, wall thickness and the ejection fraction.",
        "Watch for the complications in every session: heart failure and arrhythmias."
      ],
      sources: ["L2 s43–44 · Cardiomyopathy", "L1 s50 · Echocardiography", "L2 s34–36 · Congestive heart failure"]
    },
    casebook: ["cardiomyopathy", "heart-failure", "diagnostic-tests"]
  });

  // ---------------------------------------------------------------------------------------
  // 4.4 Pink Froth — acute pulmonary edema (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pump-pink-froth",
    unit: "pump",
    order: 4,
    difficulty: "hard",
    title: "Pink Froth",
    teaser: "Twenty feet into her walk, she grabs the rail and can't catch her breath.",
    patient: { name: "Gloria Simmons", age: 76, sex: "F" },
    setting: "Inpatient cardiac unit — hospital day 2",
    file: {
      referral: [
        "**Referral:** inpatient PT — mobility and gait training on day 2 of an admission for heart failure. From the admitting physician.",
        { quote: "I'm a little short of breath, but I want to get moving so I can go home to my cat.", by: "Mrs. Simmons" }
      ],
      history: {
        list: [
          "**This admission:** heart failure with fluid overload; IV furosemide since yesterday.",
          "**Past medical history:** heart failure (ejection fraction 35 %); hypertension; type 2 diabetes; a myocardial infarction eight years ago.",
          "**Social:** retired seamstress; lives alone with her cat; walks with a cane at home."
        ]
      },
      medications: [
        { name: "Furosemide", dose: "40 mg IV twice a day" },
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Carvedilol", dose: "6.25 mg twice a day" },
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" },
        { name: "Insulin lispro", dose: "sliding scale with meals" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 92, bp: "146/84", rr: 22, spo2: 93, temp: "98.1 °F", other: [{ label: "Oxygen", value: "room air" }] },
      exam: {
        list: [
          "Before the walk: sitting on the edge of the bed, mildly short of breath; crackles at both lung bases.",
          "1+ pitting edema at both ankles.",
          "Alert and keen to walk; cleared for hallway gait training by the physician."
        ]
      },
      tests: [
        {
          id: "nursing-note", type: "note", title: "Nursing note, 7:00 a.m.", author: "Night nurse",
          text: "Slept propped up on two pillows. Very short of breath when the head of the bed was lowered for a linen change; settled once sat up again. Good urine output overnight."
        },
        {
          id: "cxr", type: "report", title: "Portable chest X-ray report", sealed: true,
          text: [
            "**Lungs:** fluid throughout both lungs, worst near the center of the chest; small fluid collections at both bases.",
            "**Heart:** enlarged.",
            "**Impression:** acute pulmonary edema."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        update: {
          title: "Twenty feet down the hallway…",
          text: [
            "Mrs. Simmons stops, grabs the handrail and starts gasping. She's anxious and sweating, and coughing up **frothy, pink-tinged sputum**. You can hear a wet crackling with every breath.",
            { quote: "I can't… get… my breath!", by: "Mrs. Simmons" }
          ],
          vitals: { hr: 128, bp: "168/96", rr: 34, spo2: 84 }
        },
        type: "single",
        prompt: "Which condition best explains what's happening?",
        options: [
          { text: "Acute pulmonary edema", correct: true, why: "Yes: sudden extreme breathlessness, gasping, anxiety, a cough with frothy pink sputum and crackles, in a patient admitted with heart failure. Her failing left ventricle has let fluid flood her lungs." },
          { text: "A pulmonary embolism", why: "A PE causes sudden breathlessness too, but typically with sharp chest pain that's worse on breathing in, and often a swollen leg. It doesn't fill the lungs with crackles and frothy sputum." },
          { text: "An asthma attack", why: "Asthma causes wheezing and breathlessness, but not frothy pink sputum and crackles — and she has no history of asthma." },
          { text: "A panic attack", why: "She is anxious, but an oxygen saturation of 84 %, crackles and frothy sputum are objective signs of a medical emergency, not panic." }
        ],
        hints: [
          "Frothy sputum is air churned up with fluid. Where is the fluid coming from?",
          "She was admitted for heart failure — and the night nurse noted that lying flat made her breathless."
        ],
        explain: [
          "**Acute pulmonary edema** — fluid flooding the lungs — is a **medical emergency**. Its signs: extreme shortness of breath (especially lying down), wheezing or gasping, anxiety, a cough with **frothy sputum that may be tinged with blood**, chest pain and palpitations.",
          "The most common cause is left-sided heart failure. Others include high altitude, respiratory distress syndrome, pulmonary embolism, drug reactions, viral infections, smoke inhalation and toxins."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What are your first actions?",
        options: [
          { text: "Sit her upright, call the rapid response team, and stay with her", correct: true, why: "Yes. Sitting upright with her legs down eases her breathing and keeps some blood in her legs, away from her lungs. She needs the medical team now — start oxygen per your facility's protocol and monitor her until they arrive." },
          { text: "Help her lie flat in bed with her legs raised to rest her heart", why: "Lying flat — especially with the legs up — sends more blood back to the heart and lungs and makes pulmonary edema worse. Never lay her flat." },
          { text: "Walk her slowly back to her room, then let the nurse know", why: "Every step adds to the load on her failing heart, and the team is needed now. Bring help — and a wheelchair — to her." },
          { text: "Have her rest in the wheelchair for 10 minutes, then try the walk again", why: "This is an emergency, not ordinary exercise intolerance. She needs the rapid response team now." },
          { text: "Give her an extra dose of furosemide from the medication cart", why: "PTAs don't give medications. The medical team will decide on treatment, such as an IV diuretic." }
        ],
        hints: [
          "Which position makes breathing easiest for fluid-filled lungs — and which makes it worse?",
          "Is this a moment to manage on your own, or to bring the medical team to her?"
        ],
        explain: [
          "**Acute pulmonary edema is a medical emergency.** Get her into a chair or wheelchair and **sit her upright with her legs down** — never lay her flat. **Call for help** (the rapid response team in the hospital; 911 outside it), start **oxygen per protocol**, **stay with her** and **monitor** her vital signs and alertness until the team takes over. Then notify the supervising PT.",
          "Sitting up with the legs hanging down lets gravity hold some blood in the legs, so less returns to the heart and lungs, and it eases the work of breathing."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "While the team works, Dr. Okafor asks you: what is happening inside her chest?",
        options: [
          { text: "Her weak left ventricle backs pressure up into the lungs, forcing fluid into the alveoli", correct: true, why: "Yes. The left ventricle can't pump out what arrives from the lungs, so pressure rises in the lung capillaries and fluid is pushed into the air sacs." },
          { text: "Her right ventricle is failing, so fluid is backing up into her legs, her liver and her abdomen", why: "That's right-sided failure: edema, JVD, ascites. Fluid in the alveoli comes from the *left* side backing up." },
          { text: "A blood clot has blocked an artery in her lungs", why: "That's a pulmonary embolism: the lung tissue beyond the clot loses its blood supply — it doesn't flood with fluid." },
          { text: "An infection is filling her air sacs with pus", why: "That's pneumonia, which usually comes with a fever and colored sputum and develops over days." }
        ],
        hints: [
          "Follow the blood backward from a failing left ventricle. Where does it go first, and then where?"
        ],
        explain: [
          "When the **left ventricle** can't pump enough blood out to the body, blood backs up into the **left atrium** and then the **pulmonary circulation**. As pressure in the lung capillaries rises, fluid is pushed out of them into the **alveoli** (air sacs), and breathing becomes very difficult.",
          "Fluid in the air sacs stops oxygen getting into the blood — her SpO2 fell to 84 %. Coughing churns the fluid with air into froth, and leaking red blood cells tint it pink."
        ]
      },
      {
        id: "s4",
        type: "test",
        prompt: "Which test will confirm that her lungs are full of fluid?",
        options: [
          { text: "A chest X-ray", correct: true, reveals: ["cxr"], why: "Yes. A chest X-ray confirms fluid in the lungs." },
          { text: "A ventilation–perfusion (V/Q) scan", why: "A V/Q scan looks for a pulmonary embolism, not fluid in the lungs." },
          { text: "A Doppler ultrasound of her legs", why: "Doppler ultrasound of the legs looks for a deep vein thrombosis." },
          { text: "An ankle-brachial index", why: "The ABI screens for peripheral arterial disease." }
        ],
        hints: [
          "The lecture names one imaging test that confirms fluid in the lungs."
        ],
        explain: [
          "A **chest X-ray** confirms pulmonary edema. Hers shows fluid throughout both lungs and an enlarged heart.",
          "The team treats the cause — oxygen, sitting up, an IV diuretic and medicines that widen the blood vessels, such as nitroglycerin, to ease the load on her heart — and moves her to the cardiac intensive care unit."
        ]
      },
      {
        id: "s5",
        type: "multi",
        prompt: "Which findings point to pulmonary edema rather than a pulmonary embolism? Select all that apply.",
        options: [
          { text: "Frothy pink sputum", correct: true, why: "Froth is air mixed with edema fluid. A PE can cause blood-streaked sputum, but not large amounts of froth." },
          { text: "Crackles throughout both lungs", correct: true, why: "Crackles come from fluid in the air sacs. The lungs often sound clear in a PE." },
          { text: "Breathlessness that's worse lying flat", correct: true, why: "Orthopnea is a sign of left-sided failure and pulmonary edema." },
          { text: "Admitted with heart failure and fluid overload", correct: true, why: "Left-sided heart failure is the most common cause of pulmonary edema." },
          { text: "A sudden onset", why: "Both come on suddenly." },
          { text: "An oxygen saturation of 84 %", why: "Both cause low blood oxygen (hypoxia)." },
          { text: "A heart rate of 128", why: "Both cause a fast heart rate." }
        ],
        hints: [
          "Some findings fit both conditions equally well. Look for the ones that only fluid in the lungs explains.",
          "Does a PE flood the lungs, or cut off part of their blood supply?"
        ],
        explain: [
          { table: { head: ["Finding", "Acute pulmonary edema", "Pulmonary embolism"], rows: [
            ["Onset", "Sudden (acute) or gradual (chronic)", "Sudden"],
            ["Sputum", "Frothy, often pink", "May be blood-tinged, not frothy"],
            ["Chest pain", "May occur", "Typical: worse with deep breaths, coughing, eating or bending"],
            ["Lungs", "Crackles throughout; wheezing", "Often clear; sometimes wheezing"],
            ["Position", "Worse lying flat", "Not typically worse lying flat"],
            ["Clues", "Heart failure, S3, edema in both legs", "Recent surgery or immobility; one swollen, tender leg"],
            ["Confirming test", "Chest X-ray", "V/Q scan or CT"]
          ] } },
          "Both are emergencies: whichever you suspect, call for help, keep the patient sitting up and stay with them."
        ]
      }
    ],
    debrief: {
      diagnosis: "Acute pulmonary edema from left-sided heart failure",
      summary: [
        "During gait training, Mrs. Simmons's failing left ventricle couldn't keep up: pressure backed up into her lungs and pushed fluid into the alveoli. Sudden extreme breathlessness, gasping, anxiety, frothy pink sputum, crackles and an SpO2 of 84 % added up to **acute pulmonary edema** — a medical emergency.",
        "Sitting her upright with her legs down, calling the rapid response team, starting oxygen per protocol and staying with her was exactly right. A chest X-ray confirmed the fluid."
      ],
      takeaways: [
        "Acute pulmonary edema is an emergency: extreme breathlessness (worse lying down), gasping or wheezing, anxiety, frothy and often pink sputum, crackles.",
        "Sit the patient upright with the legs down — never flat — call for help, give oxygen per protocol, and stay and monitor.",
        "Mechanism: a failing left ventricle backs pressure up into the lung capillaries, pushing fluid into the alveoli.",
        "A chest X-ray confirms fluid in the lungs; a V/Q scan or CT confirms a pulmonary embolism.",
        "Frothy pink sputum, crackles throughout, orthopnea and known heart failure point to pulmonary edema rather than a PE."
      ],
      sources: ["L2 s41–42 · Pulmonary edema", "L2 s36–37 · Left-sided heart failure", "L2 s62 · Pulmonary embolism"]
    },
    casebook: ["pulmonary-edema", "heart-failure", "pe", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // 4.5 The Smoker's Right Heart — cor pulmonale (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "pump-smokers-right-heart",
    unit: "pump",
    order: 5,
    difficulty: "hard",
    title: "The Smoker's Right Heart",
    teaser: "Fifty-five pack-years and home oxygen — and now his ankles are swelling too.",
    patient: { name: "Walter Briggs", age: 68, sex: "M" },
    setting: "Outpatient pulmonary rehabilitation",
    file: {
      referral: [
        "**Referral:** pulmonary rehabilitation for COPD — breathing retraining, endurance and education. From his pulmonologist.",
        { quote: "The cough and the wheezing I'm used to. But these last two months my ankles swell up and my shoes are tight by suppertime.", by: "Mr. Briggs" }
      ],
      history: {
        list: [
          "**COPD** (emphysema and chronic bronchitis) for 12 years. Smoked 1½ packs a day for 37 years (55 pack-years); quit last year when he started home oxygen.",
          "**Long-standing symptoms:** a cough with sputum every morning, wheezing, breathless after one block, tires easily, weak.",
          "**Past two months (new):** swelling of both ankles and a 6-lb weight gain. His pulmonologist ordered the tests below, started furosemide three weeks ago, and cleared him to continue rehab.",
          "**Past medical history:** no heart attacks.",
          "**Social:** retired roofer; lives with his wife."
        ]
      },
      medications: [
        { name: "Tiotropium inhaler", dose: "1 inhalation once a day" },
        { name: "Albuterol inhaler", dose: "2 puffs as needed" },
        { name: "Oxygen", dose: "2 L/min by nasal cannula with activity and during sleep" },
        { name: "Furosemide", dose: "40 mg once a day (started three weeks ago)" },
        { name: "Digoxin", dose: "0.125 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 96, bp: "132/78", rr: 22, spo2: 90, temp: "98.0 °F", weight: "184 lb (178 lb two months ago)", other: [{ label: "Oxygen", value: "2 L/min by nasal cannula" }] },
      exam: {
        list: [
          "Barrel-shaped chest; breathes out through pursed lips at times; uses his neck muscles to breathe after walking.",
          "Wheezes throughout both lungs; no crackles.",
          "**Jugular venous distention** sitting up at 45°.",
          "2+ pitting edema of both ankles and shins.",
          "Lips and nail beds slightly bluish."
        ]
      },
      tests: [
        {
          id: "labs", type: "labs", title: "Blood tests",
          rows: [
            { name: "Hematocrit", value: 57, unit: "%", ref: "41–50", flag: "high" },
            { name: "Hemoglobin", value: 19.1, unit: "g/dL", ref: "13.5–17.5", flag: "high" },
            { name: "Red blood cell count", value: 6.6, unit: "million/µL", ref: "4.5–5.9", flag: "high" },
            { name: "White blood cell count", value: 7.8, unit: "thousand/µL", ref: "4.5–11.0", flag: null },
            { name: "Sodium", value: 139, unit: "mEq/L", ref: "135–145", flag: null },
            { name: "Potassium", value: 4.1, unit: "mEq/L", ref: "3.5–5.0", flag: null },
            { name: "BUN", value: 16, unit: "mg/dL", ref: "7–20", flag: null },
            { name: "Creatinine", value: 0.9, unit: "mg/dL", ref: "0.7–1.3", flag: null }
          ]
        },
        {
          id: "echo", type: "report", title: "Echocardiogram report",
          text: [
            "**Right ventricle:** enlarged, with a thickened (hypertrophied) wall.",
            "**Pulmonary artery pressure:** raised — estimated systolic pressure 58 mmHg (normal less than about 35).",
            "**Left ventricle:** normal size and function; ejection fraction 60 %."
          ]
        },
        {
          id: "ecg-report", type: "report", title: "12-lead ECG report",
          text: [
            "Sinus rhythm, 96 a minute.",
            "**Right ventricular hypertrophy**; right axis deviation; tall P waves in lead II (right atrial enlargement)."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which condition best explains his new ankle edema and JVD, together with his test results?",
        options: [
          { text: "Cor pulmonale", correct: true, why: "Yes. Right ventricular enlargement and hypertrophy from pulmonary hypertension caused by lung disease — now with signs of right-sided failure: ankle edema, JVD and weight gain. His left ventricle is normal." },
          { text: "Left-sided heart failure from coronary artery disease", why: "His left ventricle is normal (EF 60 %), he has had no heart attack, and his lungs have the wheezes of COPD, not the crackles of left-sided failure." },
          { text: "A COPD flare-up on its own", why: "A flare-up worsens cough, sputum and breathlessness, but on its own it doesn't enlarge the right ventricle or cause JVD and ankle edema." },
          { text: "A deep vein thrombosis in both legs", why: "A DVT usually affects one leg, with warmth, redness and pain — and it wouldn't explain his JVD or his enlarged right ventricle." }
        ],
        hints: [
          "Which side of his heart is enlarged on the echo — and which organ has been under strain for years?",
          "There is a special name for right-heart enlargement caused by lung disease."
        ],
        explain: [
          "**Cor pulmonale** (pulmonary heart disease) is **enlargement of the right ventricle secondary to pulmonary hypertension** caused by diseases of the lungs, chest wall or pulmonary circulation — most often COPD (emphysema and chronic bronchitis). It is most common in adult male smokers.",
          "Its symptoms are mostly those of the lung disease — a chronic productive cough, exertional dyspnea, wheezing, fatigue and weakness — until the right ventricle starts to fail and adds **ankle edema, JVD and weight gain**. Early on it may show only during exercise testing, when cardiac output falls and the ECG shows right ventricular hypertrophy."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What chain of events led to his enlarged right ventricle?",
        options: [
          { text: "Diseased lungs raised the pressure in his pulmonary arteries, and his right ventricle thickened pumping against it", correct: true, why: "Yes. Pulmonary hypertension makes the right ventricle work against high pressure for years; it hypertrophies, enlarges and eventually fails." },
          { text: "His left ventricle failed first, so fluid backed up through his lungs into the right side of his heart and his body", why: "That's how left-sided failure leads to right-sided failure — but his left ventricle is normal (EF 60 %)." },
          { text: "Smoking blocked the coronary artery that feeds his right ventricle", why: "A blocked right coronary artery causes an MI, which scars the muscle. He has had no MI, and his right ventricle is thick from working against high pressure." },
          { text: "His thick, sticky blood clogged the veins of his lungs", why: "His thicker blood adds to the heart's workload, but the pressure problem is in the pulmonary *arteries*, from lung disease." }
        ],
        hints: [
          "The echo shows a raised pulmonary artery pressure. Which ventricle pumps into the pulmonary artery?",
          "The right ventricle is normally thin-walled. What does muscle do when it must work against high pressure for years?"
        ],
        explain: [
          "Lung disease damages the small pulmonary blood vessels, and chronically **low oxygen makes the pulmonary arteries constrict**. Pressure in the pulmonary arteries rises: **pulmonary hypertension**.",
          "The right ventricle is normally thin-walled. Long-term pressure overload makes it **hypertrophy** (thicken) and enlarge — his ECG shows **right ventricular hypertrophy** — and eventually it fails, backing blood up into the body's veins."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "His hematocrit is 57 %. What does it show — and why?",
        options: [
          { text: "Polycythemia, from chronically low oxygen in his blood", correct: true, why: "Yes. Low oxygen stimulates the kidneys to release erythropoietin, and the bone marrow makes extra red blood cells to carry more oxygen." },
          { text: "Dehydration from his furosemide, which has concentrated his blood cells into less fluid", why: "Dehydration can raise the hematocrit a little, but his BUN, creatinine and sodium are normal and he has gained 6 lb of fluid — he's holding water, not dried out." },
          { text: "Anemia from a poor appetite", why: "Anemia means a *low* hematocrit. His is high." },
          { text: "An infection raising his blood counts", why: "Infection raises the white cell count. His white cells are normal, and he has no fever." }
        ],
        hints: [
          "Is 57 % high or low? What would his body make more of when his oxygen is always low?",
          "Check his kidney tests, his sodium and his weight before blaming dehydration."
        ],
        explain: [
          "**Polycythemia** — too many red blood cells — is a common laboratory finding in cor pulmonale from COPD. Chronically low oxygen stimulates the kidneys to release erythropoietin, so the bone marrow makes more red cells.",
          "The price is thicker blood. It's harder to pump, which adds to the right ventricle's workload, and it raises the risk of clots — polycythemia is one of the risk factors for DVT."
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "Which of these will you teach or do in his pulmonary rehab sessions? Select all that apply.",
        options: [
          { text: "Practice pursed-lip breathing with him", correct: true, why: "Breathing out slowly through pursed lips keeps the airways open longer and slows his breathing." },
          { text: "Practice diaphragmatic breathing with him", correct: true, why: "Diaphragmatic breathing should be reviewed with anyone who has COPD and practiced often through the day." },
          { text: "Teach him and his wife to check his ankles for edema by pressing on his shins for 1–2 seconds", correct: true, why: "A finger impression that lasts means edema. New or worsening edema gets reported." },
          { text: "Use his prescribed oxygen during exercise and monitor his SpO2", correct: true, why: "Oxygen is an essential part of his treatment, and monitoring shows how he tolerates the work." },
          { text: "Encourage him to drink plenty of extra fluids to thin his blood", why: "Salt and fluid restriction is part of his treatment. Questions about fluids go to his physician." },
          { text: "Tell him to turn his oxygen up as high as it goes whenever he's breathless", why: "His oxygen flow is prescribed. In some people with COPD, too much oxygen can be harmful. Follow the prescription or your facility's protocol, and report if he seems to need more." },
          { text: "Skip exercise entirely, because his heart is too weak for training", why: "His pulmonologist referred him for monitored, gradually progressed exercise, and cleared him to continue. Watch his symptoms and SpO2 as you go." }
        ],
        hints: [
          "The lecture's PT advice for cor pulmonale covers breathing exercises — and something to teach the family about his legs.",
          "Be wary of any option that changes his treatment — his fluids or his oxygen — on your own authority."
        ],
        explain: [
          "PT for cor pulmonale (Lecture 2, slides 71–72): **diaphragmatic and pursed-lip breathing** exercises, practiced often through the day; **teach the patient or family to check for ankle edema** (press over the shin for 1–2 seconds and look for a lasting impression); and, for bed-bound patients, **reposition frequently** to prevent atelectasis (collapse of part of a lung) and skin breakdown.",
          "Medical treatment includes **oxygen, salt and fluid restriction, and diuretics** — so don't encourage extra fluids, and don't change his oxygen flow beyond what is prescribed."
        ]
      },
      {
        id: "s5",
        type: "single",
        prompt: "He also takes digoxin. Which new complaint should make you stop and contact Dr. Okafor about possible digitalis toxicity?",
        options: [
          { text: "Loss of appetite, nausea, and yellow halos around lights", correct: true, why: "Yes. Anorexia, nausea, vomiting and yellow halos around visual images are the signs the lecture tells you to watch for." },
          { text: "Coughing up more sputum than usual in the mornings this week", why: "A change in his sputum belongs to his COPD — worth reporting, but not a sign of digitalis toxicity." },
          { text: "Bruising easily on his forearms", why: "Easy bruising is a concern with anticoagulants and antiplatelets. It isn't a sign of digitalis toxicity." },
          { text: "Feeling breathless walking up a hill", why: "Exertional dyspnea is part of his COPD and cor pulmonale. Worsening breathlessness should be reported, but it isn't a sign of digitalis toxicity." }
        ],
        hints: [
          "The lecture lists the signs of digitalis toxicity twice: with heart failure and again with cor pulmonale."
        ],
        explain: [
          "Watch for **digitalis toxicity** in anyone taking digoxin: **anorexia, nausea, vomiting**, an irregular or slow heartbeat, and visual changes such as **yellow halos around objects** — and confusion in older adults.",
          "His furosemide raises the risk: diuretics can lower potassium, and low potassium makes digoxin toxicity more likely. If you suspect toxicity: no exercise, stay with him, and contact the supervising PT and his physician promptly. Never adjust the medicine yourself."
        ]
      },
      {
        id: "s6",
        type: "single",
        prompt: "What is the main aim of his medical treatment?",
        options: [
          { text: "To lower his pulmonary artery pressure and so reduce his right ventricle's workload", correct: true, why: "Yes. That's the primary goal — with oxygen, salt and fluid restriction, diuretics and treatment of the lung disease." },
          { text: "To open a blocked coronary artery with a stent", why: "Stents treat coronary artery disease. Cor pulmonale is a pressure problem in the lungs' circulation." },
          { text: "To strengthen his left ventricle with a pacemaker", why: "His left ventricle is normal, and pacemakers treat slow rates and conduction problems, not pulmonary hypertension." },
          { text: "To remove the thickened part of his right ventricle with open-heart surgery right away", why: "There is no specific surgery for most chronic cor pulmonale; heart–lung transplantation is considered only late in the disease." }
        ],
        hints: [
          "What is his right ventricle pumping against?"
        ],
        explain: [
          "The primary goal of medical treatment is to **reduce the workload of the right ventricle by lowering pulmonary artery pressure**: **oxygen** (relieving low oxygen relaxes the pulmonary arteries), **salt and fluid restriction**, **diuretics**, and treatment of the underlying lung disease.",
          "There is no specific surgery for most chronic cor pulmonale; heart–lung transplantation may be considered late in the disease. The prognosis is poor once congestive signs appear (on average 2–5 years), though survival is longer when uncomplicated emphysema is the cause."
        ]
      }
    ],
    debrief: {
      diagnosis: "Cor pulmonale: right ventricular enlargement from pulmonary hypertension caused by COPD",
      summary: [
        "Decades of smoking-related COPD and chronically low oxygen had raised the pressure in Mr. Briggs's pulmonary arteries. His right ventricle thickened and enlarged pumping against it — **cor pulmonale** — and was starting to fail, adding ankle edema, JVD and weight gain to his cough, wheeze and breathlessness. His high hematocrit (polycythemia) was his body's response to low oxygen.",
        "Breathing retraining, teaching the edema check, using his oxygen as prescribed and watching for digitalis toxicity are the PTA's part of his care."
      ],
      takeaways: [
        "Cor pulmonale is enlargement of the right ventricle secondary to pulmonary hypertension caused by lung disease — most often COPD in adult male smokers.",
        "Its symptoms are mostly those of the lung disease (productive cough, exertional dyspnea, wheezing, fatigue) until right-sided failure adds edema, JVD and weight gain.",
        "Polycythemia (a high hematocrit) is common in cor pulmonale from COPD: the body makes extra red cells in response to low oxygen.",
        "Treatment aims to lower pulmonary artery pressure: oxygen, salt and fluid restriction, diuretics, and treating the lung disease.",
        "PTA: pursed-lip and diaphragmatic breathing, teach the shin-press edema check, reposition bed-bound patients, and watch for digitalis toxicity (anorexia, nausea, vomiting, yellow halos)."
      ],
      sources: ["L2 s68–72 · Cor pulmonale", "L2 s36–38 · Right-sided heart failure", "L2 s39 · Digitalis toxicity"]
    },
    casebook: ["cor-pulmonale", "heart-failure", "digoxin", "edema-scale", "diuretics"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook: conditions
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "heart-failure", kind: "condition", unit: "pump",
    title: "Congestive heart failure (left- and right-sided)",
    aka: ["CHF", "heart failure", "left ventricular failure", "right ventricular failure", "orthopnea", "paroxysmal nocturnal dyspnea", "jugular venous distention", "S3 gallop"],
    summary: "The heart can no longer pump enough blood to meet the body's needs. It is the result of disease of the heart muscle or valves, not a disease on its own, and fluid backs up behind the failing side.",
    sections: [
      { heading: "What it is", body: [
        "**Left-sided failure** (“forward” failure in the lecture): the left ventricle can't pump enough blood into the systemic circulation, so blood backs up into the left atrium and the **lungs** — pulmonary congestion and edema, and a low cardiac output.",
        "**Right-sided failure** (“backward” failure): the right ventricle can't pump all the returning blood on to the lungs, so it backs up into the **body's veins** — peripheral edema and congested organs.",
        "Either side can lead to the other; left-sided failure is the most common cause of right-sided failure."
      ] },
      { heading: "Causes", body: "A previous myocardial infarction; heart-valve incompetence; long-term hypertension; very slow or very fast heart rates; arrhythmias such as atrial fibrillation; pulmonary embolism; unstable angina; renal failure; high salt intake; severe anemia." },
      { heading: "Signs and symptoms", body: [
        { table: { head: ["Left-sided failure (lungs)", "Right-sided failure (body)"], rows: [
          ["Dyspnea (exertional first), orthopnea, paroxysmal nocturnal dyspnea", "Dependent pitting edema (ankles or shins first)"],
          ["Cough; crackles (rales); frothy pink sputum; pulmonary edema", "Jugular venous distention"],
          ["Fatigue, exercise intolerance, muscle weakness", "Weight gain; ascites and abdominal swelling"],
          ["Tachycardia, rapid breathing, sweating", "Right upper quadrant pain (liver congestion); jaundice"],
          ["Anxiety, restlessness, confusion, poor memory, poor sleep", "Loss of appetite and nausea; bluish nail beds"]
        ] } },
        "An early sign of heart failure is **tachycardia**. An **S3 gallop** in an adult over 40 suggests ventricular failure. **Jugular venous distention** reflects the right heart, because no valve separates the superior vena cava from the right atrium."
      ] },
      { heading: "Tests", body: "Urinalysis; blood tests (CBC, electrolytes, thyroid-stimulating hormone, BUN, creatinine); chest X-ray; ECG; and an **echocardiogram** — Doppler echo shows systolic and diastolic performance, the ejection fraction and the filling pressures." },
      { heading: "Treatment", body: "The lecture lists **diuretics, nitrates, cardiac glycosides (digoxin), analgesics and ACE inhibitors**; today's treatment also commonly includes beta blockers and newer medicines. The prognosis is poor: end-stage heart failure without medical or surgical treatment (such as a transplant) is fatal." },
      { heading: "What it means for the PTA", body: { list: [
        "Check weight, edema, breathing and vital signs before each session. Report **new or worsening edema, rapid weight gain (2–3 lb in a day or about 5 lb in a week), more breathlessness, orthopnea or night-time gasping** to the supervising PT, and hold exercise until it's sorted out.",
        "Exercise is individualized: **walking** is the usual start, progressed gradually by **heart rate and perceived exertion**, avoiding rapid increases in activity.",
        "Know the medication effects: diuretics (dizziness, falls, electrolyte imbalance — weakness, cramps), ACE inhibitors (dizziness, dry cough), beta blockers (blunted heart rate — use RPE), and **digitalis toxicity** (anorexia, nausea, vomiting, irregular heartbeat, yellow halos).",
        "Sudden severe breathlessness with frothy pink sputum is acute pulmonary edema — an emergency."
      ] } }
    ],
    sources: ["L2 s34–40 · Congestive heart failure", "L1 s22–23 · Heart sounds (S3)", "L1 s34–35 · Edema"]
  });

  CCF.defineEntry({
    id: "pulmonary-edema", kind: "condition", unit: "pump",
    title: "Pulmonary edema",
    aka: ["fluid in the lungs", "acute pulmonary edema", "frothy pink sputum"],
    summary: "Excess fluid in the lungs, usually because a failing left ventricle backs pressure up into the lung circulation. Acute pulmonary edema is a medical emergency.",
    sections: [
      { heading: "What it is", body: "When the left ventricle can't pump enough blood into the systemic circulation, fluid backs up into the left atrium and then the pulmonary circulation. As pressure in the lung capillaries rises, fluid moves into the **alveoli** (air sacs), making breathing difficult." },
      { heading: "Causes", body: "Most often **left-sided heart failure**. Others: living at high altitude, respiratory distress syndrome, pulmonary embolism, adverse drug reactions, viral infections, smoke inhalation and toxins." },
      { heading: "Signs and symptoms", body: { table: { head: ["Acute (an emergency)", "Chronic"], rows: [
        ["Extreme shortness of breath, especially lying down", "Shortness of breath that worsens lying down or with activity"],
        ["Wheezing or gasping; anxiety", "Wheezing"],
        ["Cough with frothy sputum, possibly blood-tinged (pink)", "Weight gain and swelling of the legs"],
        ["Chest pain; palpitations", "Fatigue"]
      ] } } },
      { heading: "Tests and treatment", body: "A **chest X-ray** confirms fluid in the lungs. Medical treatment targets the cause: oxygen, diuretics and medicines that ease the load on the heart." },
      { heading: "What it means for the PTA", body: [
        { warn: "Acute pulmonary edema is an emergency: sit the patient upright with the legs down — never lay them flat — call for help (the rapid response team, or 911 outside a hospital), give oxygen per protocol, and stay and monitor until the team takes over." },
        { list: [
          "Tell it apart from a pulmonary embolism: frothy pink sputum, crackles throughout the lungs, orthopnea and known heart failure point to pulmonary edema; sharp chest pain that's worse on breathing in, and one swollen leg, point to a PE. Both are emergencies.",
          "In chronic heart failure, watch for the early signs: increasing breathlessness, orthopnea, crackles, weight gain."
        ] }
      ] }
    ],
    sources: ["L2 s41–42 · Pulmonary edema", "L2 s36–37 · Left-sided heart failure"]
  });

  CCF.defineEntry({
    id: "cardiomyopathy", kind: "condition", unit: "pump",
    title: "Cardiomyopathy",
    aka: ["dilated cardiomyopathy", "hypertrophic cardiomyopathy", "restrictive cardiomyopathy", "heart muscle disease"],
    summary: "Not one disease but a group of serious diseases of the heart muscle. A damaged myocardium may dilate, thicken or stiffen, leading to heart failure, arrhythmias and sometimes the need for a heart transplant.",
    sections: [
      { heading: "The three types", body: { table: { head: ["Type", "The muscle", "What goes wrong"], rows: [
        ["Dilated", "Thinner than usual; the chamber is enlarged", "A weak squeeze (low ejection fraction)"],
        ["Hypertrophic", "Thickened, especially the left ventricle", "A thick, stiff ventricle fills poorly; often inherited"],
        ["Restrictive", "Stiffened by fibrous tissue", "The heart can't expand to fill"]
      ] } } },
      { heading: "Causes", body: "Heart attacks; alcoholism; long-term, severe hypertension; systemic lupus erythematosus (SLE); end-stage renal disease; viral infections. Some forms are inherited." },
      { heading: "Signs and symptoms", body: "Dyspnea, cough, palpitations, dependent edema (worse with the legs hanging down), ascites, angina, dizziness and light-headedness, low urine output, changes in mental alertness, loss of appetite and general deconditioning." },
      { heading: "Tests and outlook", body: "An **echocardiogram** shows chamber size, wall thickness and the ejection fraction; a chest X-ray may show an enlarged heart. The outlook depends on the cause, its severity and the response to drug therapy. It is serious and can get progressively worse; its serious complications are **heart failure and arrhythmias**, and some patients need a heart transplant. In alcohol-related cardiomyopathy, stopping drinking can let the heart recover partly." },
      { heading: "What it means for the PTA", body: { list: [
        "Watch every session for signs of worsening heart failure (more breathlessness, edema, weight gain) and of arrhythmias (palpitations, an irregular pulse, dizziness, fainting).",
        "Progress exercise gradually, guided by heart rate, RPE and symptoms.",
        "Stop and notify the supervising PT for new or worsening signs; call 911 for fainting, chest pain or collapse."
      ] } }
    ],
    sources: ["L2 s43–44 · Cardiomyopathy"]
  });

  CCF.defineEntry({
    id: "cor-pulmonale", kind: "condition", unit: "pump",
    title: "Cor pulmonale",
    aka: ["pulmonary heart disease", "right ventricular hypertrophy", "pulmonary hypertension"],
    summary: "Enlargement of the right ventricle secondary to pulmonary hypertension caused by disease of the lungs or their circulation — the effect of lung disease on the right side of the heart.",
    sections: [
      { heading: "What it is", body: [
        "Lung disease — most often COPD (emphysema and chronic bronchitis) — or pulmonary vascular disease raises the pressure in the pulmonary arteries (**pulmonary hypertension**). The normally thin-walled right ventricle must pump against it; long-term pressure overload makes it **hypertrophy** and enlarge, and eventually it fails (right-sided heart failure).",
        "Chronic cor pulmonale is most common in adult male smokers, and it is increasing in women."
      ] },
      { heading: "Signs and symptoms", body: "Mostly those of the lung disease: chronic productive cough, exertional dyspnea, wheezing, easy fatigue and weakness. Early on it may show only with exercise: the heart looks normal at rest, but during exercise cardiac output falls and the ECG shows right ventricular hypertrophy. Once the right ventricle fails: dependent edema, jugular venous distention, weight gain." },
      { heading: "Tests", body: "Physical examination, chest X-ray, ECG or echocardiogram (right ventricular hypertrophy, raised pulmonary artery pressure); pulmonary function tests confirm the lung disease. Blood tests may show **polycythemia** (extra red blood cells, a high hematocrit) when COPD is the cause. The ECG and chest X-ray may not be diagnostic early on." },
      { heading: "Treatment and outlook", body: "The aim is to **reduce the right ventricle's workload by lowering pulmonary artery pressure**: oxygen, salt and fluid restriction, diuretics, and treatment of the underlying lung disease (relieving low oxygen, high carbon dioxide and acidosis). There is no specific surgery for most causes; heart–lung transplantation is an option in late-stage disease. The prognosis is poor: once congestive signs appear, average life expectancy is 2–5 years (longer when uncomplicated emphysema is the cause)." },
      { heading: "What it means for the PTA", body: { list: [
        "Teach and practice **diaphragmatic and pursed-lip breathing**, often through the day.",
        "Teach the patient or family to **check for ankle edema**: press over the shin for 1–2 seconds and look for a lasting finger impression.",
        "**Reposition bed-bound patients frequently** to prevent atelectasis and skin breakdown.",
        "Use oxygen as prescribed and monitor SpO2; don't encourage extra fluids.",
        "Watch for **digitalis toxicity**: anorexia, nausea, vomiting, yellow halos around objects."
      ] } },
      { heading: "Note on the slides", body: "Lecture 2 (slide 68) says “pulmonary hypotension” once — a typo for pulmonary **hypertension**." }
    ],
    sources: ["L2 s68–72 · Cor pulmonale"]
  });
})();
