/*
 * The Cardiac Case Files — Unit 1: Heart Basics.
 * Cases 1.1–1.5 and the unit's concept entries (blood-flow, conduction-system,
 * cardiac-output, cardinal-symptoms). Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 1.1 The Marathoner's Slow Heart — sinus bradycardia from training (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "basics-marathon-heart",
    unit: "basics",
    order: 1,
    difficulty: "easy",
    title: "The Marathoner's Slow Heart",
    teaser: "A resting pulse of 48 — and she's never felt better. Cause for worry, or for wonder?",
    patient: { name: "Tessa Morgan", age: 29, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right ankle sprain (rolled it on a trail run 10 days ago) — evaluate and treat; return to running. From her sports medicine physician.",
        { quote: "Your machine says my heart rate is 48? That's normal for me. Can I run next week?", by: "Ms. Morgan" }
      ],
      history: {
        list: [
          "**This injury:** pain and swelling on the outside of the right ankle, improving every day.",
          "**Training:** runs about 50 miles a week and has finished six marathons. Her running watch shows her heart rate climbing into the 170s on hard runs.",
          "**Past medical history:** none. A physician noticed her slow pulse last spring and sent her for a sports-cardiology screening (see Tests); she was cleared to keep training.",
          "**Today:** no dizziness, light-headedness, fainting, chest pain, palpitations or unusual tiredness.",
          "**Social:** elementary school teacher; doesn't smoke; one or two cups of coffee a day."
        ]
      },
      medications: [
        { name: "Ibuprofen", dose: "400 mg as needed for ankle pain (none taken today)", "class": "NSAID (anti-inflammatory pain reliever)" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 48, bp: "108/68", rr: 12, spo2: 99, temp: "98.2 °F", pain: "2/10 (right ankle)", rhythm: "regular" },
      exam: {
        list: [
          "Right ankle: mild swelling and tenderness over the outer (lateral) ligaments; walks without a limp.",
          "Pulse at the wrist: 48 beats a minute, regular and strong (counted for a full minute).",
          "Skin warm and pink; alert and chatty; no light-headedness when she stands up from the treatment table."
        ]
      },
      tests: [
        {
          id: "screening-report", type: "report", title: "Sports-cardiology screening (last spring)",
          text: [
            "**Echocardiogram:** left ventricle mildly enlarged, with normal wall thickness and strong, normal pumping. Ejection fraction 62 %. **Stroke volume 105 mL.** Valves normal.",
            "**ECG:** sinus bradycardia, 50 beats a minute; otherwise normal.",
            "**Conclusion:** normal findings for a trained endurance athlete. Cleared for full training."
          ]
        },
        {
          id: "screening-strip", type: "ecg", title: "Rhythm strip from her screening ECG (lead II)",
          rhythm: "sinus-brady", rate: 50, seconds: 6, lead: "II", seed: 1101,
          caption: "A 6-second strip; the marks along the top are 3 seconds apart."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Ms. Morgan's pulse is slow but perfectly regular. Which structure sets the pace of each heartbeat?",
        options: [
          { text: "The sinoatrial (SA) node in the right atrium", correct: true, why: "Yes. The SA node is the heart's natural pacemaker: every normal beat starts there, which is why a normal rhythm is called *sinus* rhythm." },
          { text: "The atrioventricular (AV) node", why: "The AV node is the gatekeeper between the atria and the ventricles: it briefly delays each impulse so the ventricles can fill. It doesn't normally start the beat." },
          { text: "The bundle of His and the Purkinje fibers", why: "These carry the impulse quickly through the ventricles so both contract together. They conduct the beat; they don't set its pace." },
          { text: "The cardiac control center in the medulla", why: "The medulla adjusts the rate through the sympathetic and parasympathetic (vagus) nerves, but each impulse is generated in the heart itself — a transplanted heart, with no nerve supply, still beats." }
        ],
        hints: [
          "A normal rhythm is called *sinus* rhythm. That name points to where each impulse starts."
        ],
        explain: [
          "The **sinoatrial (SA) node**, in the wall of the right atrium, is the pacemaker. Its normal pace — **normal sinus rhythm** — is about 70 beats a minute (60–100 is the usual normal range).",
          "Each impulse spreads across both atria (they contract), pauses briefly at the **AV node**, then races down the **bundle of His** to the **Purkinje fibers**, and both ventricles contract.",
          "The nervous system tunes the SA node: sympathetic nerves (epinephrine, norepinephrine) speed it up; the vagus nerve (parasympathetic, acetylcholine) slows it. Endurance athletes have a strong vagal “brake” at rest — part of the reason Ms. Morgan's rate is low."
        ]
      },
      {
        id: "s2",
        type: "numeric",
        prompt: [
          "Open the rhythm strip from her screening ECG. Use the **6-second method** to estimate her heart rate.",
          { tip: "The marks along the top of the strip are 3 seconds apart." }
        ],
        answer: 50,
        tolerance: 10,
        unit: "beats/min",
        traps: [
          { value: 5, tolerance: 1, why: "That's the number of QRS complexes on the strip. The strip shows 6 seconds, so multiply by 10 to get beats per minute." },
          { value: 25, tolerance: 5, why: "It looks as if you counted only half the strip (3 seconds). Count the QRS complexes across all 6 seconds, then multiply by 10." }
        ],
        hints: [
          "Count the tall, narrow spikes (the QRS complexes) across the whole strip.",
          "6 seconds × 10 = 60 seconds."
        ],
        explain: [
          "**6-second method:** count the QRS complexes on a 6-second strip and multiply by 10. Her strip shows 5 complexes → about **50 beats a minute**, close to the 48 you counted at her wrist over a full minute.",
          "Every QRS has a P wave in front of it and the beats are evenly spaced: a **sinus rhythm**. A sinus rhythm **below 60** is called **sinus bradycardia**; above 100, sinus tachycardia.",
          { tip: "The 6-second method is a quick estimate that works for regular and irregular rhythms. For an exact rate, count the pulse for a full minute." }
        ]
      },
      {
        id: "s3",
        type: "numeric",
        prompt: "Her screening echo measured a **stroke volume of 105 mL**. Using her resting heart rate of 48 beats/min, what is her cardiac output, in liters per minute?",
        answer: 5.04,
        tolerance: 0.25,
        unit: "L/min",
        traps: [
          { value: 5040, tolerance: 300, why: "Right numbers, wrong unit: 105 mL × 48 = 5,040 **mL** per minute. Divide by 1,000 to get liters." },
          { value: 153, tolerance: 1, why: "Cardiac output is stroke volume **times** heart rate, not the two added together." },
          { value: 2.19, tolerance: 0.1, why: "That's stroke volume divided by heart rate. Cardiac output = stroke volume × heart rate." }
        ],
        hints: [
          "Cardiac output = stroke volume × heart rate. Watch your units: mL or liters?"
        ],
        explain: [
          "**Cardiac output (CO) = stroke volume (SV) × heart rate (HR)** = 105 mL × 48/min = 5,040 mL/min ≈ **5.0 L/min**.",
          "That's a perfectly normal resting output: the lecture gives 4.5–5.0 L/min for an adult man at rest, with women slightly less. Compare the textbook example: 70 mL × 70 beats/min = 4,900 mL/min.",
          "Her heart moves as much blood each minute as anyone's — it just does it with fewer, bigger beats. In exercise, cardiac output can rise up to about 25 L/min."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "Why is a resting heart rate of 48 expected for Ms. Morgan rather than a warning sign?",
        options: [
          { text: "Training has enlarged her left ventricle, so each beat pumps more blood", correct: true, why: "Yes. Endurance training builds a bigger, stronger left ventricle — “athlete's heart”. With a stroke volume of 105 mL, 48 beats a minute already deliver a normal cardiac output." },
          { text: "Years of high-mileage running have worn out her SA node", why: "A failing SA node causes symptoms — dizziness, fainting, fatigue — and a rate that can't rise. Her rate climbs into the 170s when she runs, and she feels well." },
          { text: "Her heart muscle is too weak to beat faster, so it beats slowly instead", why: "Her echo shows strong pumping (ejection fraction 62 %). A weak heart usually beats *faster*, to make up for a small stroke volume." },
          { text: "Impulses are being blocked between her atria and her ventricles", why: "That would be heart block. Her strip shows a P wave before every QRS, evenly spaced — a sinus rhythm that is simply slow." }
        ],
        hints: [
          "Look back at her cardiac output. How can a slow heart still deliver a normal amount of blood every minute?"
        ],
        explain: [
          "**Athlete's heart:** intensive endurance training increases the mass and size of the left ventricle. Each beat ejects more blood (hers is 105 mL; the usual stroke volume is 60–80 mL), so fewer beats are needed — and a strong vagal tone at rest slows the SA node as well. The lecture lists athlete's heart among the benign causes of an unusual heartbeat.",
          "Her slow rate is reassuring because the rest of the picture fits: she feels well, her rate rises normally with effort, and her screening was normal.",
          { warn: "A slow pulse becomes a concern when it comes with **dizziness or light-headedness, fainting, unusual fatigue, chest pain or breathlessness**, or when the rate doesn't rise with activity. Stop the activity and report it to the supervising PT; fainting or near-fainting from a heart cause (cardiac syncope) means alerting the PT, nurse or physician immediately." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Sinus bradycardia from endurance training (athlete's heart) — a normal finding",
      summary: [
        "Ms. Morgan's heart beats about 48–50 times a minute at rest, in a regular sinus rhythm set by her SA node. Training has enlarged her left ventricle, so each beat ejects about 105 mL and her cardiac output is a normal 5.0 L/min.",
        "A slow rate in a fit, symptom-free athlete whose rate rises normally with exercise is expected. The same number in someone who is dizzy, faint or unusually tired would need reporting right away."
      ],
      takeaways: [
        "The SA node in the right atrium is the heart's pacemaker; normal sinus rhythm is about 70 beats a minute (60–100).",
        "6-second method: count the QRS complexes on a 6-second strip and multiply by 10.",
        "Cardiac output = stroke volume × heart rate (about 5 L/min at rest). A bigger stroke volume allows a slower rate.",
        "Athlete's heart — a larger left ventricle from training — is a benign cause of a slow resting rate.",
        "Report a slow pulse that comes with dizziness, fainting, unusual fatigue, chest pain or breathlessness."
      ],
      sources: [
        "L1 s3 · Palpitations and athlete's heart",
        "L1 s10–11 · Neural control and the conduction system",
        "L1 s14–15 · Stroke volume and cardiac output",
        "L1 s44 · Syncope"
      ]
    },
    casebook: ["conduction-system", "cardiac-output", "ecg-basics"]
  });

  // ---------------------------------------------------------------------------------------
  // 1.2 Listening Posts — auscultation, S1/S2, the path of blood, a new S3 (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "basics-listening-posts",
    unit: "basics",
    order: 2,
    difficulty: "easy",
    title: "Listening Posts",
    teaser: "Five spots on the chest, two normal sounds — and one that shouldn't be there.",
    patient: { name: "Ruth Alvarez", age: 73, sex: "F" },
    setting: "Home-health visit",
    file: {
      referral: [
        "**Referral:** home physical therapy after a 6-day hospital stay for pneumonia — strengthening, walking and stair safety. From the hospital physician.",
        "Today is a joint visit: Dr. Okafor wants you to practice listening to the heart, and to know what Mrs. Alvarez's heart sounds like now, for comparison later."
      ],
      history: {
        list: [
          "**Hospital stay:** pneumonia, treated with antibiotics; home for 4 days.",
          "**Past medical history:** high blood pressure for 25 years; a heart attack 7 years ago, treated with a stent.",
          "**Since coming home:** tires easily; walks around the house with a cane.",
          "**Social:** widowed; lives alone in a two-story house with her bedroom upstairs; her daughter visits every day."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day", "class": "ACE inhibitor" },
        { name: "Metoprolol succinate", dose: "50 mg once a day", "class": "Beta blocker" },
        { name: "Aspirin", dose: "81 mg once a day", "class": "Antiplatelet" },
        { name: "Atorvastatin", dose: "40 mg once a day", "class": "Statin (antihyperlipidemic)" }
      ],
      allergies: "Penicillin (rash)",
      vitals: { hr: 76, bp: "136/80", rr: 18, spo2: 95, temp: "98.1 °F", pain: "0/10" },
      exam: {
        list: [
          "Alert and cheerful; a little breathless after climbing her 14 stairs, recovers within 2 minutes.",
          "Pulse regular. Lungs clear. No ankle swelling.",
          "Heart: you will listen with Dr. Okafor, using the five points on the diagram in Tests."
        ]
      },
      tests: [
        {
          id: "listening-points", type: "diagram", name: "auscultation", labels: "numbers",
          title: "Where to listen: five points on the chest",
          caption: "Point 1: 2nd intercostal space, right sternal border. Point 2: 2nd intercostal space, left sternal border. Point 3: 3rd intercostal space, left sternal border. Point 4: 4th intercostal space, left sternal border. Point 5: 5th intercostal space, left midclavicular line."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        keepOrder: true,
        prompt: "Dr. Okafor hands you her stethoscope: “Start where the mitral valve is heard best.” Which point on the diagram do you choose?",
        options: [
          { text: "Point 1 — 2nd intercostal space, right sternal border", why: "That's the aortic area: the aortic valve is heard best just to the right of the upper sternum." },
          { text: "Point 2 — 2nd intercostal space, left sternal border", why: "That's the pulmonic area, for the pulmonary valve." },
          { text: "Point 3 — 3rd intercostal space, left sternal border", why: "That's Erb's point, a good spot for hearing both S1 and S2." },
          { text: "Point 4 — 4th intercostal space, left sternal border", why: "That's the tricuspid area, low on the left edge of the sternum." },
          { text: "Point 5 — 5th intercostal space, left midclavicular line", correct: true, why: "Yes. The mitral area is at the apex of the heart — the 5th intercostal space, in line with the middle of the left collarbone. S1 is loudest here." }
        ],
        hints: [
          "The mitral valve is heard at the apex — where the tip of the heart touches the chest wall, low on the left."
        ],
        explain: [
          {
            table: {
              head: ["Area", "Where"],
              rows: [
                ["Aortic", "2nd intercostal space, right sternal border"],
                ["Pulmonic", "2nd intercostal space, left sternal border"],
                ["Erb's point", "3rd intercostal space, left sternal border"],
                ["Tricuspid", "4th intercostal space, left sternal border"],
                ["Mitral (apex)", "5th intercostal space, left midclavicular line"]
              ]
            }
          },
          "**Technique:** the bell or diaphragm goes directly on bare skin, with enough pressure to make a seal, while the patient breathes quietly through the nose.",
          { tip: "The numbers on this diagram are only labels — the figure in your lecture numbers the points in a different order. Learn the names and the places." }
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: [
          "At the mitral area you hear a steady **lubb–dupp**, with the *lubb* loudest.",
          "What makes the first heart sound, S1 (“lubb”)?"
        ],
        options: [
          { text: "The mitral and tricuspid valves closing", correct: true, why: "Right. As the ventricles start to contract, the pressure inside them snaps the atrioventricular (AV) valves shut — that's S1, loudest at the apex." },
          { text: "The aortic and pulmonary valves closing", why: "That's S2, the “dupp”: the semilunar valves close when the ventricles finish ejecting." },
          { text: "The mitral and tricuspid valves opening", why: "Healthy valves open silently. Normal heart sounds come from valves closing." },
          { text: "Blood rushing into the ventricles early in diastole", why: "That's what makes an S3 — an extra sound just after S2 — not the normal first sound." }
        ],
        hints: [
          "Heart sounds come from valves snapping shut. Which valves close as the ventricles begin to squeeze?"
        ],
        explain: [
          "**S1 (“lubb”)** = closing of the **mitral and tricuspid** (atrioventricular) valves at the start of ventricular systole; loudest at the apex.",
          "**S2 (“dupp”)** = closing of the **aortic and pulmonary** (semilunar) valves at the end of systole; heard best at the base of the heart (the 2nd intercostal spaces).",
          "Valves always open toward the next chamber to let blood move forward, and close behind the contracting chamber to stop it flowing back."
        ]
      },
      {
        id: "s3",
        type: "order",
        prompt: "On the drive back, Dr. Okafor quizzes you: “Trace the blood that made those sounds.” Put its path in order, starting where blood returns from the body.",
        items: [
          "Right atrium",
          "Right ventricle",
          "Pulmonary artery",
          "Lungs",
          "Pulmonary veins",
          "Left atrium",
          "Left ventricle",
          "Aorta"
        ],
        hints: [
          "The right side of the heart pumps to the lungs; the left side pumps to the body.",
          "Blood leaves each ventricle through an artery and comes back to each atrium through veins."
        ],
        explain: [
          {
            olist: [
              "The **right atrium** receives deoxygenated blood from the superior and inferior venae cavae.",
              "Through the **tricuspid valve** (three cusps) into the **right ventricle**.",
              "Through the **pulmonary (semilunar) valve** into the **pulmonary artery** — the only artery that carries deoxygenated blood — to the **lungs**.",
              "The **pulmonary veins** — the only veins that carry oxygenated blood — return it to the **left atrium**.",
              "Through the **mitral (bicuspid) valve** into the **left ventricle**, whose thick muscular wall pumps it through the **aortic valve** into the **aorta**."
            ]
          },
          "The four valves on that path are the four you listened to: the tricuspid and mitral close to make S1; the pulmonary and aortic close to make S2."
        ]
      },
      {
        id: "s4",
        update: {
          title: "Three days later, on your own",
          text: [
            "Mrs. Alvarez is more tired than last time. She stops halfway up the stairs to catch her breath and has started sleeping propped up on two pillows. You hear a few crackles at the bottom of both lungs.",
            "With her lying on her left side, you listen at the mitral area again. Now there's a soft, low extra sound just **after** S2: *lubb–dupp–ta… lubb–dupp–ta.*"
          ],
          vitals: { hr: 94, bp: "142/86", rr: 22, spo2: 93 }
        },
        type: "single",
        prompt: "What is the extra sound most likely to be, and what should you do about it?",
        options: [
          { text: "An S3 — at 73 it suggests ventricular failure; report it today", correct: true, why: "Yes. An S3 comes just after S2 and is heard at the apex with the patient on her left side. It's normal in children and young adults, but over 40 it suggests the left ventricle is failing — and she has new fatigue, breathlessness, crackles and pillows to go with it." },
          { text: "An S3 — a normal filling sound, so carry on with her exercises", why: "An S3 is normal in children and young adults. In an adult over 40 it is abnormal — and she has new symptoms to go with it." },
          { text: "An S4 — the atrial gallop, a harmless sound in older adults", why: "An S4 comes just *before* S1, as the atria push blood into a stiff ventricle, and it is abnormal at any age. Her extra sound comes after S2." },
          { text: "A heart attack in progress — call 911 right away", why: "Nothing suggests a heart attack: no chest pain or pressure, no sweating, and her vital signs are stable. This needs prompt reporting, not an ambulance — unless she develops severe breathlessness, chest pain or confusion." }
        ],
        hints: [
          "Where in the cycle is the extra sound — before S1, or after S2?",
          "A sound that is normal in a 20-year-old can mean something very different at 73."
        ],
        explain: [
          "**S3 (ventricular gallop):** the ventricles filling rapidly in early diastole, just after S2; best heard at the apex with the patient lying on the left side. Normal in children and young adults; **abnormal in adults over 40** — left ventricular failure, congestive heart failure, mitral regurgitation, tachycardia.",
          "**S4 (atrial gallop):** just before S1, as the atria contract into a stiff ventricle — left ventricular hypertrophy, chronic hypertension, cardiomyopathy, myocardial infarction.",
          "**What you do:** a PTA doesn't diagnose, but this is a new finding with new symptoms. Report it to the supervising PT today — what you heard, where, and in which position — so her physician can be contacted. Keep today's activity light and watch her breathing.",
          { warn: "Call 911 if she becomes severely breathless at rest, develops chest pain, coughs up frothy sputum or becomes confused." }
        ]
      }
    ],
    debrief: {
      diagnosis: "A new S3 gallop — possible ventricular failure, reported to the supervising PT",
      summary: [
        "You found the five listening points, heard S1 (the mitral and tricuspid valves closing) and S2 (the aortic and pulmonary valves closing), and traced blood through the heart.",
        "Three days later a new S3 — just after S2, at the apex, with her on her left side — came with new fatigue, breathlessness, crackles and extra pillows. In a 73-year-old with hypertension and a past heart attack, that suggests her left ventricle is failing, so it went to the supervising PT the same day."
      ],
      takeaways: [
        "Aortic: 2nd ICS, right sternal border · pulmonic: 2nd ICS, left · Erb's point: 3rd ICS, left · tricuspid: 4th ICS, left · mitral: 5th ICS, left midclavicular line (the apex).",
        "S1 = the mitral and tricuspid valves closing; S2 = the aortic and pulmonary valves closing.",
        "Blood flows right atrium → right ventricle → pulmonary artery → lungs → pulmonary veins → left atrium → left ventricle → aorta.",
        "An S3 is normal in children and young adults but suggests ventricular failure or CHF after 40; an S4 (just before S1) is always abnormal."
      ],
      sources: [
        "L1 s6–8 · Chambers, valves and the path of blood",
        "L1 s21–26 · Heart sounds and auscultation",
        "L2 s36 · S3 gallop in heart failure"
      ]
    },
    casebook: ["blood-flow", "auscultation", "heart-failure"]
  });

  // ---------------------------------------------------------------------------------------
  // 1.3 The Ankle Imprint — grading edema; bilateral edema + dyspnea + fatigue → CHF (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "basics-ankle-imprint",
    unit: "basics",
    order: 3,
    difficulty: "easy",
    title: "The Ankle Imprint",
    teaser: "A press of the thumb leaves a dent that won't go away. What is his body telling you?",
    patient: { name: "Samuel Price", age: 70, sex: "M" },
    setting: "Inpatient rehabilitation unit",
    file: {
      referral: [
        "**Referral:** day 3 of inpatient rehab after surgical repair of a left hip fracture (a fall at home 8 days ago) — gait training with a walker, transfers, strengthening. Weight-bearing as tolerated.",
        { quote: "My shoes don't fit anymore — both feet have puffed right up. And I'm worn out just walking to the bathroom.", by: "Mr. Price" }
      ],
      history: {
        list: [
          "**Past medical history:** high blood pressure for 20 years; a heart attack 6 years ago.",
          "**Since surgery:** less and less energy each day; breathless after short walks — “more than a hip should do,” he says.",
          "**Nursing weights:** 181 lb (82 kg) when he was admitted to the hospital last week; 185½ lb (84 kg) this morning.",
          "**Social:** retired bus driver; quit smoking 10 years ago; lives with his wife in a single-story house."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "10 mg once a day", "class": "ACE inhibitor" },
        { name: "Enoxaparin", dose: "40 mg injection once a day", "class": "Anticoagulant (to prevent clots after surgery)" },
        { name: "Acetaminophen", dose: "650 mg every 6 hours", "class": "Pain reliever" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 96, bp: "146/86", rr: 22, spo2: 93, temp: "98.6 °F", pain: "3/10 (left hip, when walking)", weight: "185½ lb (84 kg)" },
      exam: {
        list: [
          "**Both** ankles and lower shins are swollen, the left and the right about the same.",
          "Pressing firmly over the shin for 2 seconds leaves a pit about **5 mm** deep that takes about **20 seconds** to fill back in — on both legs.",
          "Calves soft, not tender, and equal in size.",
          "Left hip incision clean and dry; bruising over the outer left thigh.",
          "Walked 50 feet with the walker, then had to stop: breathless (RR 26); recovered after 3 minutes seated."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        keepOrder: true,
        prompt: "Use the edema grading scale. How would you grade the pitting edema in his shins?",
        options: [
          { text: "1+", why: "1+ is barely perceptible — a pit of up to 2 mm. His is about 5 mm." },
          { text: "2+", why: "2+ is easily seen, 2–4 mm deep, and rebounds within 15 seconds. His pit is deeper and slower to fill." },
          { text: "3+", correct: true, why: "Right: 3+ is a pit of 4–6 mm that takes 15–30 seconds to rebound. His is 5 mm and fills in about 20 seconds." },
          { text: "4+", why: "4+ is a pit of 6–8 mm that lasts more than 30 seconds." }
        ],
        hints: [
          "Use both numbers: how deep the pit is, and how long it takes to fill back in."
        ],
        explain: [
          {
            table: {
              head: ["Grade", "Pit", "Rebound"],
              rows: [
                ["1+ (mild)", "barely perceptible, up to 2 mm", "immediate"],
                ["2+ (moderate)", "easily seen, 2–4 mm", "within 15 seconds"],
                ["3+ (severe)", "4–6 mm", "15–30 seconds"],
                ["4+ (very severe)", "6–8 mm", "more than 30 seconds"]
              ]
            }
          },
          { tip: "Record the grade, which side(s), and how far up the leg the swelling goes, so the next person can tell whether it's getting better or worse." }
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "The swelling is in **both** legs, not just the one that had surgery. What does that pattern point to?",
        options: [
          { text: "A body-wide cause, such as congestive heart failure", correct: true, why: "Yes. Bilateral pitting edema points to a systemic cause — most often congestive heart failure. Fluid backs up in the veins and settles in the lowest parts of the body." },
          { text: "A blood clot (DVT) in the veins of the operated leg", why: "A DVT usually swells one leg — the one with the clot — often with warmth, redness and calf pain. His calves are soft and equal. (After hip surgery he's still at risk of a DVT, so keep watching for those signs.)" },
          { text: "Normal swelling after hip surgery, which can safely be ignored", why: "Swelling from the operation would be around the operated hip and thigh. Both ankles swelling, with breathlessness, fatigue and weight gain, is a different story." },
          { text: "Poor arterial circulation in his legs (peripheral vascular disease)", why: "Local causes such as peripheral vascular disease usually affect one leg, and blocked arteries cause pale, cool skin, weak pulses and leg pain on walking — not soft, pitting swelling of both ankles." }
        ],
        hints: [
          "Is the cause local — something wrong in one leg — or something affecting his whole circulation?"
        ],
        explain: [
          "**Bilateral pitting edema** is associated with **congestive heart failure (CHF)**. **Unilateral** edema points to local factors: thrombophlebitis or DVT, peripheral vascular disease, an injury.",
          "Edema collects in the lowest parts of the body: the ankles and shins in someone who is up and about, the lower back (sacrum) in someone who spends most of the day in bed."
        ]
      },
      {
        id: "s3",
        type: "multi",
        prompt: "Which other findings in his file, together with the edema, point to congestive heart failure? Select all that apply.",
        options: [
          { text: "Breathlessness after a short walk", correct: true, why: "Yes. Dyspnea on exertion is a cardinal symptom; with edema and fatigue it makes CHF likely." },
          { text: "Unusual fatigue", correct: true, why: "Yes. Fatigue out of proportion to what he's doing is another cardinal symptom." },
          { text: "A weight gain of about 4½ lb (2 kg) in a week", correct: true, why: "Yes. A quick weight gain is retained fluid, not fat — a key sign of heart failure." },
          { text: "Pain around his hip incision when he walks", why: "Expected after hip surgery; it doesn't point to the heart." },
          { text: "Bruising on the outside of his left thigh", why: "Common after hip surgery (and more likely with an anticoagulant such as enoxaparin). It isn't a sign of heart failure." }
        ],
        hints: [
          "Look for the symptoms that, in the lecture, travel together with edema."
        ],
        explain: [
          "Edema is often accompanied by **shortness of breath (dyspnea) and fatigue**. When they occur together, there is a **high probability of a cardiac problem such as CHF**.",
          "A weight gain over a few days, rather than months, is fluid building up in the body. Heart-failure patients are taught to weigh themselves every morning for exactly this reason."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Report the edema, weight gain and breathlessness to Dr. Okafor now", correct: true, why: "Yes. Together these new findings suggest heart failure. The supervising PT needs to know now so his physician can be contacted — tell his nurse too. Meanwhile keep activity light, let him rest as needed and monitor his breathing and vital signs." },
          { text: "Raise his legs for 10 minutes, then walk him farther than yesterday", why: "Elevation may ease the swelling for a while, but it doesn't treat the cause — and progressing his exercise before anyone has looked into possible heart failure isn't safe." },
          { text: "Wrap both legs firmly in compression bandages to push the fluid out", why: "Compression pushes fluid back into the circulation, which can overload a failing heart. It needs the physician's and the PT's go-ahead first." },
          { text: "Ask his nurse to give him a water pill (diuretic) before your session", why: "Medicines are prescribed by his physician. A PTA reports what he or she has found and doesn't recommend medications." }
        ],
        hints: [
          "You've found several new things that fit together. Who needs to know before his rehab goes any further?"
        ],
        explain: [
          "**Report new or worsening edema, a quick weight gain or new breathlessness** to the supervising PT, who will contact the physician. The PTA documents and reports; the physician decides on tests (such as a chest X-ray or an echocardiogram) and treatment.",
          "Until then: keep activity light, allow rest breaks, watch for dyspnea and check his vital signs.",
          { warn: "Severe breathlessness at rest, frothy pink sputum or chest pain is an emergency: call for help immediately." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Bilateral 3+ pitting edema with dyspnea, fatigue and weight gain — possible congestive heart failure",
      summary: [
        "Mr. Price had 3+ pitting edema in both legs (a 5 mm pit that took about 20 seconds to fill), along with breathlessness, unusual fatigue and a quick weight gain. Together, in a man with hypertension and a past heart attack, these point to congestive heart failure rather than a problem in one leg.",
        "You graded it, put the picture together and reported it, so his physician could act before his rehab went any further."
      ],
      takeaways: [
        "Edema grades: 1+ up to 2 mm · 2+ 2–4 mm, back within 15 s · 3+ 4–6 mm, 15–30 s · 4+ 6–8 mm, more than 30 s.",
        "Bilateral pitting edema points to a body-wide cause such as CHF; unilateral edema to a local one (DVT, thrombophlebitis, PVD).",
        "Edema + dyspnea + fatigue together → a high probability of heart failure. A quick weight gain is fluid.",
        "Report new or worsening edema, weight gain or breathlessness to the supervising PT; don't treat it yourself with compression or medication advice."
      ],
      sources: [
        "L1 s33 · Dyspnea",
        "L1 s34–35 · Edema and its grading",
        "L1 s36 · Fatigue",
        "L2 s34 · Heart failure"
      ]
    },
    casebook: ["edema-scale", "cardinal-symptoms", "heart-failure"]
  });

  // ---------------------------------------------------------------------------------------
  // 1.4 Numbers on the Echo — stroke volume, ejection fraction, cardiac output, afterload (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "basics-pump-numbers",
    unit: "basics",
    order: 4,
    difficulty: "medium",
    title: "Numbers on the Echo",
    teaser: "Two volumes and a heart rate — everything you need to know about his pump.",
    patient: { name: "Gerald Fontaine", age: 64, sex: "M" },
    setting: "Cardiac rehabilitation gym (outpatient)",
    file: {
      referral: [
        "**Referral:** phase II cardiac rehabilitation, six weeks after an anterior myocardial infarction treated with a stent in the left anterior descending (LAD) artery. From his cardiologist.",
        { quote: "The cardiologist said something about my “pump numbers”. I didn't follow a word of it.", by: "Mr. Fontaine" }
      ],
      history: {
        list: [
          "**Six weeks ago:** heart attack at home; emergency angioplasty and a stent in the LAD.",
          "**Since then:** gets tired after about 10 minutes of walking; no chest pain.",
          "**Past medical history:** high blood pressure for 18 years; high cholesterol.",
          "**Social:** retired machinist; quit smoking the day of his heart attack; wants to get back to fishing and to his grandchildren's soccer games."
        ]
      },
      medications: [
        { name: "Metoprolol succinate", dose: "50 mg once a day" },
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Clopidogrel", dose: "75 mg once a day" },
        { name: "Atorvastatin", dose: "80 mg once a day" },
        { name: "Nitroglycerin", dose: "0.4 mg under the tongue as needed for chest pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 72, bp: "138/86", rr: 16, spo2: 97, temp: "98.0 °F", pain: "0/10", rhythm: "regular" },
      exam: {
        list: [
          "Comfortable at rest; pulse regular.",
          "Lungs clear; no ankle swelling.",
          "Walked 6 minutes at an easy pace before asking to rest; no chest pain."
        ]
      },
      tests: [
        {
          id: "echo-measurements", type: "table", title: "Echocardiogram measurements (hospital echo lab)",
          head: ["Measurement", "Result"],
          rows: [
            ["Left ventricular end-diastolic volume (EDV)", "160 mL"],
            ["Left ventricular end-systolic volume (ESV)", "112 mL"],
            ["Heart rate during the echo", "72 beats/min"],
            ["Left ventricle", "mildly enlarged; the front wall and the tip (apex) move poorly since the heart attack"],
            ["Valves", "no significant disease"]
          ],
          note: "Dr. Okafor has folded the summary page over. Her sticky note says: *Work the numbers out yourself first.*"
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "numeric",
        prompt: "Start with his **stroke volume**: how much blood does his left ventricle eject with each beat?",
        answer: 48,
        tolerance: 1,
        unit: "mL",
        traps: [
          { value: 272, tolerance: 2, why: "You added the two volumes. Stroke volume is what leaves the ventricle: the volume at the end of filling minus the volume left at the end of the squeeze." },
          { value: 112, tolerance: 0, why: "112 mL is what's still in the ventricle after it contracts (the end-systolic volume). Stroke volume is what was pumped out." },
          { value: 160, tolerance: 0, why: "160 mL is how full the ventricle was before it contracted (the end-diastolic volume). Not all of it leaves." }
        ],
        hints: [
          "Stroke volume = how full the ventricle was before it contracted, minus what was left behind afterwards."
        ],
        explain: [
          "**Stroke volume (SV) = end-diastolic volume − end-systolic volume** = 160 − 112 = **48 mL**.",
          "A normal stroke volume is **60–80 mL**. The damaged front wall of his ventricle can't squeeze as hard, so less blood leaves with each beat — even though the ventricle has stretched (mildly enlarged) to hold more."
        ]
      },
      {
        id: "s2",
        type: "numeric",
        prompt: "Now his **ejection fraction**: what percentage of the blood in his left ventricle is pumped out with each beat?",
        answer: 30,
        tolerance: 1,
        unit: "%",
        traps: [
          { value: 70, tolerance: 1, why: "That's the share left **behind** (112 ÷ 160). Ejection fraction is the share pumped **out**: stroke volume ÷ end-diastolic volume." },
          { value: 43, tolerance: 1, why: "You divided by the end-systolic volume. Divide the stroke volume by the end-**diastolic** volume — how full the ventricle was before it contracted." },
          { value: 0.3, tolerance: 0.01, why: "Right idea — 0.30 is the fraction. Multiply by 100 to give it as a percentage." }
        ],
        hints: [
          "Ejection fraction = stroke volume ÷ end-diastolic volume, as a percentage."
        ],
        explain: [
          "**Ejection fraction (EF) = SV ÷ EDV** = 48 ÷ 160 = 0.30 = **30 %**.",
          "A normal EF averages **more than 55 %** (about 58 %). The lower the EF, the more impaired the left ventricle."
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "What does an ejection fraction of 30 % mean for Mr. Fontaine?",
        options: [
          { text: "His left ventricle is significantly weakened, which limits his aerobic capacity", correct: true, why: "Yes. Only 30 % of the blood leaves with each beat, against a normal of more than 55 %. A reduced EF lowers the ability to do aerobic activity — one reason he tires after 10 minutes of walking." },
          { text: "It's normal: a healthy left ventricle ejects only about a third of the blood it holds", why: "A healthy left ventricle pumps out more than half of its blood each beat (normal EF above 55 %, about 58 %)." },
          { text: "It shows that the heart attack left no lasting damage to his pumping", why: "The opposite: the front wall and apex move poorly where the muscle was damaged, and his EF is well below normal." },
          { text: "It means his heart rate is too slow to pump enough blood", why: "EF is the share of blood ejected with each beat; it doesn't depend on how fast the heart beats. His rate of 72 is normal." }
        ],
        hints: [
          "Compare his 30 % with the normal value from the lecture."
        ],
        explain: [
          "**Reduced ejection fraction:** when heart muscle is damaged, the left ventricle can't pump as effectively, so the ability to perform aerobic activity drops. The lecture names CHF, hypertension, CAD and **MI** as the conditions where it matters.",
          "For cardiac rehab that means: start at a low level, progress gradually, and monitor vital signs and symptoms throughout — including signs of heart failure such as breathlessness, swelling or a quick weight gain."
        ]
      },
      {
        id: "s4",
        type: "numeric",
        prompt: "What is his resting **cardiac output**, in liters per minute? (His heart rate is 72 beats/min.)",
        answer: 3.46,
        tolerance: 0.15,
        unit: "L/min",
        traps: [
          { value: 3456, tolerance: 50, why: "That's mL per minute: 48 mL × 72 = 3,456 mL/min. Divide by 1,000 for liters." },
          { value: 11.52, tolerance: 0.3, why: "You used the end-diastolic volume (160 mL). Cardiac output uses the stroke volume — the blood actually pumped out with each beat." },
          { value: 8.06, tolerance: 0.3, why: "You used the end-systolic volume (112 mL) — the blood left behind. Use the stroke volume." }
        ],
        hints: [
          "Cardiac output = stroke volume × heart rate. Then convert mL to liters."
        ],
        explain: [
          "**CO = SV × HR** = 48 mL × 72/min = 3,456 mL/min ≈ **3.5 L/min**.",
          "A normal resting output is **4.5–5 L/min** (about 70 mL × 70 beats/min = 4.9 L/min). His heart moves less blood every minute — and has much less in reserve for exercise, when a healthy heart can raise its output up to about 25 L/min."
        ]
      },
      {
        id: "s5",
        type: "single",
        prompt: "Mr. Fontaine has had high blood pressure for 18 years. Which term describes the force his left ventricle must overcome to open the aortic valve and eject blood?",
        options: [
          { text: "Afterload", correct: true, why: "Yes. Afterload is what opposes ejection — mainly the pressure in the aorta and peripheral arteries. Years of hypertension raise it, so his weakened ventricle has to work harder with every beat." },
          { text: "Preload", why: "Preload is the stretch of the ventricle at the end of filling (its end-diastolic volume) — the blood coming *in*, not the resistance the ventricle pushes against." },
          { text: "Stroke volume", why: "Stroke volume is the result — the blood ejected with each beat — not the resistance the ventricle works against." },
          { text: "Venous return", why: "Venous return is the blood coming back to the right atrium each minute; over time it equals the cardiac output." }
        ],
        hints: [
          "One of these terms describes the filling before the beat; another describes the resistance during it."
        ],
        explain: [
          "**Preload:** the stretch on the ventricular wall at the end of diastole (the end-diastolic volume). By the **Frank–Starling law**, more filling stretches the muscle fibers and gives a stronger contraction and a bigger stroke volume.",
          "**Afterload:** the forces that impede ejection — mainly peripheral (aortic) pressure, the stiffness of the aorta, and the mass and viscosity of the blood. It is the force the left ventricle must generate to open the aortic valve.",
          "That's one reason his lisinopril matters: ACE inhibitors lower blood pressure **and afterload**, making every beat easier for a damaged ventricle."
        ]
      }
    ],
    debrief: {
      diagnosis: "Reduced ejection fraction (30 %) after an anterior myocardial infarction",
      summary: [
        "Mr. Fontaine's echo measured an end-diastolic volume of 160 mL and an end-systolic volume of 112 mL: a stroke volume of 48 mL, an ejection fraction of 30 % and a resting cardiac output of about 3.5 L/min — all below normal since the heart attack damaged the front wall of his left ventricle.",
        "A reduced EF limits aerobic capacity, so his rehab starts low and progresses gradually with close monitoring. His long-standing hypertension raises afterload, the resistance his weakened ventricle must overcome with every beat."
      ],
      takeaways: [
        "Stroke volume = end-diastolic volume − end-systolic volume (normal 60–80 mL).",
        "Ejection fraction = stroke volume ÷ end-diastolic volume (normal above 55 %).",
        "Cardiac output = stroke volume × heart rate (normal 4.5–5 L/min at rest; up to about 25 L/min in exercise).",
        "Preload is the filling and stretch before the beat; afterload is the resistance to ejection — raised by hypertension.",
        "A reduced EF (CHF, hypertension, CAD, MI) lowers aerobic capacity: start low, progress gradually, monitor."
      ],
      sources: [
        "L1 s13–14 · Preload, afterload and stroke volume",
        "L1 s15–16 · Cardiac output and ejection fraction",
        "L1 s43 · Reduced ejection fraction",
        "L2 s28 · Infarction of the LAD territory"
      ]
    },
    casebook: ["cardiac-output", "mi", "cardiac-rehab", "diagnostic-tests"]
  });

  // ---------------------------------------------------------------------------------------
  // 1.5 Reading the Strip — ECG waves, selected abnormalities, exertional ischemia (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "basics-reading-the-strip",
    unit: "basics",
    order: 5,
    difficulty: "medium",
    title: "Reading the Strip",
    teaser: "Her first walk since the chest pressure — with a heart monitor watching every beat.",
    patient: { name: "Lena Park", age: 58, sex: "F" },
    setting: "Inpatient cardiac telemetry unit",
    file: {
      referral: [
        "**Order:** physical therapy — evaluate and treat; walk in the hallway on telemetry. Activity cleared by cardiology.",
        "Dr. Okafor evaluated her yesterday. Today you're taking her for her first walk."
      ],
      history: {
        list: [
          "**Admitted yesterday** after 20 minutes of chest pressure while carrying groceries up her stairs; it eased with rest before she reached the hospital.",
          "**In hospital:** two troponin tests normal (no sign of heart-muscle damage); 12-lead ECG at rest normal. An exercise stress test is booked for tomorrow.",
          "**Past medical history:** high cholesterol; prediabetes. Her mother had a heart attack at 61.",
          "**Social:** accountant; walks her dog every day; has never smoked."
        ]
      },
      medications: [
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Metoprolol tartrate", dose: "25 mg twice a day" },
        { name: "Atorvastatin", dose: "80 mg once a day" },
        { name: "Nitroglycerin", dose: "0.4 mg under the tongue as needed for chest pain (given by nursing)" }
      ],
      allergies: "Sulfa drugs (hives)",
      vitals: { hr: 70, bp: "128/78", rr: 16, spo2: 98, temp: "98.4 °F", pain: "0/10" },
      exam: {
        list: [
          "Alert, comfortable and keen to get moving.",
          "Telemetry: a wireless monitor on her chest, watched by the monitor technician at the nurses' station.",
          "Lungs clear; no ankle swelling."
        ]
      },
      tests: [
        {
          id: "troponins", type: "labs", title: "Blood tests",
          rows: [
            { name: "Troponin T (high-sensitivity), on arrival", value: 6, unit: "ng/L", ref: "under 14", flag: null },
            { name: "Troponin T (high-sensitivity), 3 hours later", value: 7, unit: "ng/L", ref: "under 14", flag: null }
          ],
          note: "Troponin is released into the blood when heart muscle is damaged. Two normal results make a heart attack unlikely."
        },
        {
          id: "rest-strip", type: "ecg", title: "Telemetry strip at rest this morning (lead II)",
          rhythm: "nsr", rate: 70, seconds: 6, lead: "II", seed: 1501,
          caption: "A 6-second strip; the marks along the top are 3 seconds apart."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Look at her resting strip. Which part of each beat shows **ventricular depolarization** — the electrical signal that makes the ventricles contract?",
        options: [
          { text: "The QRS complex", correct: true, why: "Yes. The tall, narrow QRS is the ventricles depolarizing — the big electrical event that sets off their contraction." },
          { text: "The P wave", why: "The small, rounded P wave is atrial depolarization: the atria contracting." },
          { text: "The T wave", why: "The T wave is ventricular *repolarization* — the ventricles recovering, ready for the next beat." },
          { text: "The PR interval", why: "The PR interval is the time the impulse takes to travel from the atria through the conduction system to the Purkinje fibers." },
          { text: "The ST segment", why: "The ST segment marks the beginning of ventricular repolarization. Normally it's flat, level with the baseline." }
        ],
        hints: [
          "The ventricles are the heart's biggest muscle mass — and they make the biggest spike."
        ],
        explain: [
          {
            table: {
              head: ["Part", "What it shows"],
              rows: [
                ["P wave", "Atrial depolarization (atrial contraction)"],
                ["PR interval", "Time for the impulse to travel from the atria through the conduction system to the Purkinje fibers"],
                ["QRS complex", "Ventricular depolarization (ventricular contraction)"],
                ["ST segment", "Beginning of ventricular repolarization"],
                ["T wave", "Ventricular repolarization"],
                ["QT interval", "Electrical systole"]
              ]
            }
          },
          "Her resting strip: a P wave before every QRS, evenly spaced, about 70 a minute, with a flat ST segment — **normal sinus rhythm**."
        ]
      },
      {
        id: "s2",
        type: "classify",
        prompt: "Before you set off, Dr. Okafor quizzes you on changes you might see on a monitor. Sort each ECG finding by what it suggests.",
        categories: ["Ischemia", "Injury (a new infarct)", "Infarction (dead muscle)", "Conduction problem"],
        items: [
          { text: "ST depression, downsloping 2–3 mm", category: 0, why: "Downsloping ST depression of 2–3 mm may indicate ischemia — heart muscle short of oxygen." },
          { text: "Inverted T waves in leads V2–V6", category: 0, why: "T-wave inversion is the sign of ischemia; in V2–V6 it is always abnormal." },
          { text: "ST elevation", category: 1, why: "ST elevation marks injury — a new infarct in progress (it can also come from pericarditis)." },
          { text: "Pathological Q waves", category: 2, why: "Q waves come from dead, electrically silent muscle: an infarction." },
          { text: "A wide QRS (0.12 seconds or more)", category: 3, why: "A wide QRS means the impulse spreads slowly through the ventricles — a bundle branch block." },
          { text: "A PR interval longer than 0.20 seconds", category: 3, why: "A long PR interval means the impulse is held up between the atria and the ventricles — first-degree heart block." }
        ],
        hints: [
          "Picture the zones around a heart attack: dead muscle at the center, injured muscle around it, ischemic muscle on the outside. Each shows up differently on the ECG.",
          "QRS width and PR length are about timing — how fast the impulse travels."
        ],
        explain: [
          "**Selected ECG abnormalities:** ST elevation — new infarct or injury (or pericarditis) · ST depression, downsloping 2–3 mm — ischemia · inverted T wave — ischemia · Q wave — infarction · wide QRS — bundle branch block · P waves different or absent — atrial or ventricular arrhythmias.",
          "The **zones of infarction** use the same signs: ischemia (T inversion) on the outside, injury (ST elevation) next, infarction (Q waves) at the center."
        ]
      },
      {
        id: "s3",
        update: {
          title: "Halfway down the hallway…",
          text: [
            "Two minutes into the walk, Mrs. Park slows down and rests a hand flat on her chest.",
            { quote: "It's that pressure again — like yesterday on the stairs.", by: "Mrs. Park" },
            "At the same moment the monitor technician calls your phone: her ST segments have changed."
          ],
          vitals: { hr: 92, bp: "146/88", rr: 20, spo2: 97, pain: "chest pressure 3/10" }
        },
        type: "single",
        prompt: "What do you do first?",
        options: [
          { text: "Stop the walk, sit her down, stay with her and call her nurse", correct: true, why: "Yes. Stopping takes the extra demand off her heart. Sit her down where she is, stay with her, call her nurse and monitor her symptoms and vital signs. The nurse gives the ordered nitroglycerin and contacts the physician; you let Dr. Okafor know." },
          { text: "Slow the pace and finish the lap so she isn't stranded in the hallway", why: "Any walking keeps her heart's oxygen demand up. Stop now and bring help to her — a chair or wheelchair can come to you." },
          { text: "Fetch a nitroglycerin tablet from the nurses' station for her", why: "Medications are given by her nurse, under the physician's orders — not by the PTA." },
          { text: "Walk her briskly back to her room so she can lie flat", why: "Walking briskly raises the demand on her heart — and she doesn't need to lie flat. Sit her down right where she is." }
        ],
        hints: [
          "Your first job is to take the extra demand off her heart.",
          "On a hospital unit, who gives her medications?"
        ],
        explain: [
          "**Chest pressure during activity:** stop the activity, have the patient sit and rest, monitor symptoms and vital signs, and get help — on a hospital unit, her nurse, who gives the ordered nitroglycerin — then notify the supervising PT.",
          { warn: "If the pressure doesn't ease within a few minutes of rest and nitroglycerin, gets worse, or comes with sweating, nausea or breathlessness, the nurse calls the rapid response team." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Seated, five minutes later",
          text: "The pressure is easing. Her nurse prints the strip the monitor recorded at the moment the pressure began and hands it to you.",
          exhibits: [
            {
              id: "walk-strip", type: "ecg", title: "Telemetry strip when the pressure began (lead II)",
              rhythm: "nsr", rate: 90, seconds: 6, lead: "II", seed: 1502,
              st: "depression", stMm: 2, stSlope: "downsloping",
              caption: "A 6-second strip; the marks along the top are 3 seconds apart."
            }
          ]
        },
        type: "single",
        prompt: "Compare this strip with her resting strip. What does the change suggest?",
        options: [
          { text: "Downsloping ST depression — myocardial ischemia", correct: true, why: "Yes. The ST segment now sits about 2 mm below the baseline and slopes downward. With chest pressure during exertion, that's the picture of myocardial ischemia." },
          { text: "ST elevation — injury from a heart attack in progress", why: "The ST segment is below the baseline, not above it. ST elevation would mean injury — an infarct in progress." },
          { text: "Pathological Q waves — an old, completed heart attack", why: "There are no deep, wide Q waves. The change is in the ST segment." },
          { text: "A wide QRS — a bundle branch block", why: "The QRS is as narrow as it was at rest. The change comes after it, in the ST segment." },
          { text: "No real change — a dip like this is normal with exercise", why: "A small, quickly upsloping dip can be normal with exercise. A 2 mm *downsloping* depression that comes with chest pressure is not." }
        ],
        hints: [
          "Look at the stretch between the end of the QRS and the start of the T wave. Is it above, level with or below the baseline — and which way does it slope?"
        ],
        explain: [
          "Her ST segment sits about **2 mm below the baseline and slopes downward**. On the lecture's terms, ST depression **may indicate ischemia if downsloping 2–3 mm** — and with chest pressure brought on by walking, this is **myocardial ischemia**: demand has outrun supply.",
          "The P waves and the QRS look the same as at rest. There's no ST elevation (injury) and there are no Q waves (dead muscle) — and her troponin tests were normal.",
          "Ischemia that comes with effort and settles with rest is exactly what tomorrow's stress test is designed to find. Her cardiology team now has a strong clue."
        ]
      },
      {
        id: "s5",
        type: "numeric",
        prompt: "What was her heart rate on that strip? Use the 6-second method.",
        answer: 90,
        tolerance: 10,
        unit: "beats/min",
        traps: [
          { value: 9, tolerance: 1, why: "That's the number of QRS complexes. On a 6-second strip, multiply by 10 to get beats per minute." },
          { value: 45, tolerance: 5, why: "Half the strip (3 seconds) × 10 gives only half the rate. Count all 6 seconds, then multiply by 10." }
        ],
        hints: [
          "Count every QRS complex on the 6-second strip, then multiply by 10."
        ],
        explain: [
          "9 QRS complexes in 6 seconds × 10 ≈ **90 beats a minute** (the monitor read 92) — up from about 70 at rest, as you'd expect with walking, and still a sinus rhythm.",
          "Her metoprolol (a beta blocker) limits how high her rate climbs. Symptoms and the monitor tell you far more about her heart than any target heart rate."
        ]
      }
    ],
    debrief: {
      diagnosis: "Exertional myocardial ischemia: chest pressure with downsloping ST depression",
      summary: [
        "On her first walk, Mrs. Park's chest pressure came back, and the monitor showed 2 mm of downsloping ST depression at a rate of about 90 — the ECG sign of myocardial ischemia.",
        "You stopped the walk, sat her down, called her nurse and stayed with her. The strip went to her cardiology team, who now have a clear clue for tomorrow's stress test."
      ],
      takeaways: [
        "P wave = atrial depolarization · PR = conduction from the atria to the Purkinje fibers · QRS = ventricular depolarization · ST = start of ventricular repolarization · T = ventricular repolarization.",
        "ST elevation = injury (new infarct) · downsloping ST depression of 2–3 mm and inverted T waves = ischemia · Q waves = infarction · wide QRS = bundle branch block.",
        "6-second method: QRS complexes on a 6-second strip × 10.",
        "Chest pressure during activity: stop, sit, stay, get help (her nurse, in hospital) and notify the supervising PT."
      ],
      sources: [
        "L1 s18–20 · The ECG and selected abnormalities",
        "L2 s9 · Ischemia and inverted T waves",
        "L2 s28–29 · Zones of infarction",
        "L2 s6–7 · Angina pectoris"
      ]
    },
    casebook: ["ecg-basics", "angina", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook: concept entries for Heart Basics
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "blood-flow", kind: "concept", unit: "basics",
    title: "Blood flow through the heart",
    aka: ["circulation", "heart chambers", "heart valves", "cardiac cycle", "coronary arteries"],
    summary: "The right side of the heart pumps deoxygenated blood to the lungs; the left side pumps oxygenated blood to the body. Four valves keep the blood moving one way.",
    sections: [
      {
        heading: "The path of one drop of blood",
        body: {
          olist: [
            "The **superior and inferior venae cavae** bring deoxygenated blood from the upper and lower body to the **right atrium**.",
            "Through the **tricuspid valve** (three cusps) into the **right ventricle**.",
            "Through the **pulmonary (semilunar) valve** into the **pulmonary artery** — the only artery that carries deoxygenated blood — and on to the **lungs**.",
            "The **pulmonary veins** — the only veins that carry oxygenated blood — bring it back to the **left atrium**.",
            "Through the **mitral (bicuspid) valve** into the **left ventricle**, whose thick muscular wall pumps it…",
            "…through the **aortic (semilunar) valve** into the **aorta** and out to the whole body."
          ]
        }
      },
      {
        heading: "Chambers and valves",
        body: {
          list: [
            "The atria receive blood; the ventricles pump it out. The **interatrial** and **interventricular septa** separate the right side from the left.",
            "Valves **open toward the next chamber** to let blood flow forward and **close behind the contracting chamber** to stop backflow.",
            "The mitral and tricuspid (atrioventricular) valves closing make **S1**; the aortic and pulmonary (semilunar) valves closing make **S2**."
          ]
        }
      },
      {
        heading: "The cardiac cycle",
        body: "**Systole** is contraction; **diastole** is relaxation and filling. In diastole the atria fill and empty into the ventricles. As the ventricles begin to contract, the AV valves close; rising pressure then opens the aortic and pulmonary valves and blood is ejected. When ejection ends those valves close and diastole begins again."
      },
      {
        heading: "The heart's own blood supply",
        body: {
          list: [
            "The **right and left coronary arteries** branch from the ascending aorta, just above the aortic valve.",
            "The **left main** coronary artery divides into the **left anterior descending (LAD)** and the **circumflex**; together they mainly supply the left atrium and left ventricle. The **right coronary artery** mainly supplies the right atrium and right ventricle.",
            "**Coronary veins** drain into the **coronary sinus**, which empties into the right atrium."
          ]
        }
      },
      {
        heading: "What it means for the PTA",
        body: {
          list: [
            "Knowing the path tells you where blood backs up when one side fails: a failing **left** ventricle backs blood up into the **lungs** (breathlessness, crackles); a failing **right** ventricle backs it up into the **body's veins** (ankle edema, distended neck veins).",
            "The valve areas are where you listen with a stethoscope — see the auscultation entry."
          ]
        }
      }
    ],
    sources: ["L1 s6–8 · Chambers, valves and the direction of blood flow", "L1 s9 · Coronary arteries and veins", "L1 s12, s17 · The cardiac cycle", "L2 s16–17 · The coronary arteries"]
  });

  CCF.defineEntry({
    id: "conduction-system", kind: "concept", unit: "basics",
    title: "The conduction system",
    aka: ["SA node", "sinoatrial node", "AV node", "bundle of His", "Purkinje fibers", "sinus rhythm", "pacemaker of the heart"],
    summary: "Every normal heartbeat starts in the sinoatrial (SA) node, the heart's natural pacemaker, and travels a fixed path that makes the atria and then the ventricles contract.",
    sections: [
      {
        heading: "The path of each impulse",
        body: {
          olist: [
            "The **SA node** in the right atrium fires — normally about 70 times a minute (**normal sinus rhythm**; 60–100 is the usual normal range).",
            "The impulse spreads across both **atria**, which contract (the P wave on the ECG).",
            "It **pauses briefly at the AV node**, at the base of the right atrium, giving the ventricles time to fill (part of the PR interval).",
            "It travels down the **bundle of His** (the AV bundle) to the **Purkinje fibers**…",
            "…and both **ventricles** contract together (the QRS complex)."
          ]
        }
      },
      {
        heading: "What sets the rate",
        body: {
          list: [
            "The **cardiac control center in the medulla** adjusts the rate and force of contraction, using information from **baroreceptors** in the walls of the aorta and carotid arteries.",
            "**Sympathetic** nerves (epinephrine and norepinephrine) make the heart beat faster and more forcefully — with exercise, stress or fear.",
            "**Parasympathetic** nerves (acetylcholine from the **vagus nerve**) slow the heart, mainly through the SA node. Endurance athletes have a strong vagal influence at rest."
          ]
        }
      },
      {
        heading: "Too slow, too fast, out of step",
        body: {
          table: {
            head: ["Finding", "What it can mean"],
            rows: [
              ["Sinus rhythm below 60 (sinus bradycardia)", "Normal in trained athletes (athlete's heart) and common with beta blockers; a concern with dizziness, fainting, fatigue or chest pain"],
              ["Sinus rhythm above 100 (sinus tachycardia)", "Exercise, stress, fever, pain — and an early sign of heart failure"],
              ["Impulses slowed or blocked between the atria and ventricles", "Heart block: first, second or third degree"],
              ["Early, wide beats starting in the ventricles", "Premature ventricular contractions (PVCs)"],
              ["Atria quivering instead of contracting; irregular pulse", "Atrial fibrillation"]
            ]
          }
        }
      },
      {
        heading: "What it means for the PTA",
        body: {
          list: [
            "Check that the pulse is regular, that the rate rises with activity and that it settles with rest.",
            "A slow or irregular pulse with **dizziness, light-headedness, fainting, unusual fatigue or chest pain**: stop the activity and report it right away.",
            "A new irregular pulse may be atrial fibrillation: consult the supervising PT immediately."
          ]
        }
      }
    ],
    sources: ["L1 s10 · Neural control of the heart", "L1 s11 · Cardiac conduction system", "L1 s18–19 · The ECG", "L1 s3 · Athlete's heart", "L1 s31, s37, s44 · Atrial fibrillation, heart block and syncope"]
  });

  CCF.defineEntry({
    id: "cardiac-output", kind: "concept", unit: "basics",
    title: "Cardiac output, stroke volume and ejection fraction",
    aka: ["CO", "SV", "EF", "preload", "afterload", "Frank–Starling law", "venous return", "end-diastolic volume"],
    summary: "How much blood the heart pumps: with each beat (stroke volume), every minute (cardiac output), and as a share of what the ventricle holds (ejection fraction).",
    sections: [
      {
        heading: "The numbers",
        body: {
          table: {
            head: ["Measure", "How it's worked out", "Normal"],
            rows: [
              ["Stroke volume (SV)", "End-diastolic volume − end-systolic volume", "60–80 mL"],
              ["Cardiac output (CO)", "SV × heart rate", "4.5–5 L/min at rest (women slightly less); up to 25 L/min in exercise"],
              ["Ejection fraction (EF)", "SV ÷ end-diastolic volume × 100", "above 55 % (about 58 %)"]
            ]
          }
        }
      },
      {
        heading: "Worked example",
        body: [
          "A left ventricle holds 120 mL at the end of filling and 50 mL after it contracts, beating 70 times a minute:",
          { list: ["SV = 120 − 50 = **70 mL**", "EF = 70 ÷ 120 = **58 %**", "CO = 70 mL × 70/min = 4,900 mL/min ≈ **4.9 L/min**"] },
          { tip: "Cardiac output comes out in mL per minute — divide by 1,000 to get liters." }
        ]
      },
      {
        heading: "Preload, afterload and venous return",
        body: {
          list: [
            "**Preload:** the stretch on the ventricle at the end of diastole — its end-diastolic volume, set by venous filling. **Frank–Starling law:** more filling → more stretch → a stronger contraction and a larger stroke volume (as when venous return rises during exercise).",
            "**Afterload:** the forces that oppose ejection — mainly the pressure in the aorta and peripheral arteries, the stiffness of the aorta, and the mass and viscosity of the blood. Hypertension raises afterload; ACE inhibitors lower it.",
            "**Venous return:** the blood returning to the right atrium each minute. Over time it equals the cardiac output."
          ]
        }
      },
      {
        heading: "Reduced ejection fraction",
        body: "When heart muscle is damaged — in **CHF, hypertension, CAD and MI** — the left ventricle ejects less of its blood and the patient's capacity for aerobic activity falls. The lower the EF, the more impaired the ventricle."
      },
      {
        heading: "What it means for the PTA",
        body: {
          list: [
            "A low EF means low exercise tolerance: start at a low level, progress gradually, and monitor vital signs and symptoms.",
            "A slow heart rate can still give a normal output if the stroke volume is large (athlete's heart). A weak ventricle often beats faster to compensate.",
            "Beta blockers lower heart rate and contractility, so heart rate rises less with exercise — use the rating of perceived exertion (RPE)."
          ]
        }
      }
    ],
    sources: ["L1 s13–14 · Preload, afterload and stroke volume", "L1 s15–16 · Cardiac output and ejection fraction", "L1 s43 · Reduced ejection fraction"]
  });

  CCF.defineEntry({
    id: "cardinal-symptoms", kind: "concept", unit: "basics",
    title: "Cardinal signs and symptoms of heart disease",
    aka: ["warning symptoms", "chest pain", "dyspnea", "palpitations", "syncope", "cyanosis", "edema", "fatigue", "claudication"],
    summary: "The symptoms that most often signal heart and vessel disease — and what the PTA does when one shows up during a session.",
    sections: [
      {
        heading: "The cardinal symptoms",
        body: {
          list: [
            "**Chest, neck or arm pain or discomfort** — including angina: pressure, squeezing or tightness behind the breastbone that may spread to the arm, shoulder, neck, jaw, throat or back, and can be mistaken for indigestion.",
            "**Palpitations** — a noticeably strong, fast or irregular heartbeat.",
            "**Dyspnea** — difficulty breathing, especially on exertion.",
            "**Syncope** — light-headedness or fainting from too little oxygen reaching the brain.",
            "**Fatigue**, **cough**, and **cyanosis** (a bluish color from too little oxygen in the blood).",
            "From the vessels: **edema** and leg pain on walking (**intermittent claudication**) are the most common symptoms."
          ]
        }
      },
      {
        heading: "By body system",
        body: {
          table: {
            head: ["System", "Symptoms"],
            rows: [
              ["General", "Weakness, fatigue, weight change, poor exercise tolerance"],
              ["Skin", "Pressure ulcers, loss of body hair, cyanosis of the lips and nail beds"],
              ["Nervous system", "Headaches, impaired vision, light-headedness or syncope"],
              ["Respiratory", "Labored breathing (dyspnea), productive cough"],
              ["Cardiovascular", "Chest, shoulder, neck, jaw or arm pain; palpitations; peripheral edema; claudication"],
              ["Genitourinary", "Frequent urination, urinating at night (nocturia), concentrated urine, low urine output"],
              ["Musculoskeletal", "Muscle fatigue, myalgia, chest, shoulder or arm pain, peripheral edema, claudication"],
              ["Gastrointestinal", "Nausea and vomiting, ascites (a swollen abdomen)"]
            ]
          }
        }
      },
      {
        heading: "Clues in the details",
        body: {
          list: [
            "**Cyanosis:** central cyanosis (lips, tongue, ears, mucous membranes) goes with lung disease and low oxygen saturation; peripheral cyanosis (fingertips, nail beds, toes, nose) with low cardiac output.",
            "**Edema:** bilateral pitting edema with breathlessness and fatigue points to congestive heart failure; one swollen leg points to a local cause such as a DVT or peripheral vascular disease. Grade it with the edema scale.",
            "**Referred pain:** heart pain can be felt in the left shoulder, along the inner arm to the elbow, in the neck and jaw, or between the shoulder blades — sometimes there and nowhere else.",
            "**Palpitations** can be benign (caffeine, anxiety, exercise, mitral valve prolapse, athlete's heart) or serious (CAD, cardiomyopathy, complete heart block, valve disease)."
          ]
        }
      },
      {
        heading: "What the PTA does",
        body: {
          table: {
            head: ["When…", "Do this"],
            rows: [
              ["Fatigue comes with dyspnea, headache, chest pain or an arrhythmia", "Stop the activity, have the patient rest, consult the PT"],
              ["Dyspnea is severe or occurs at rest", "Stop; the patient needs a physician — call for emergency help if it is sudden and severe"],
              ["The patient faints or becomes light-headed (possible cardiac syncope)", "Alert the PT, nurse or physician immediately"],
              ["A new irregular pulse (possible atrial fibrillation)", "Consult the supervising PT immediately"],
              ["New or worsening edema, or a quick weight gain", "Report to the supervising PT"],
              ["Chest pain at rest, or not relieved by rest or nitroglycerin", "Emergency: call 911 / activate the emergency response"]
            ]
          }
        }
      }
    ],
    sources: ["L1 s2–5 · Cardinal symptoms by system", "L1 s32–36 · Cyanosis, dyspnea, edema and fatigue", "L1 s38–40 · Claudication, pain and palpitations", "L1 s44 · Syncope", "L2 s10 · Referred pain in angina"]
  });
})();
