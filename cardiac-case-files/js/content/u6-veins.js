/*
 * The Cardiac Case Files — Unit 6: Vessel Cases, part 2 — veins and clots (writer C).
 * Cases 6.6–6.8 and the Casebook entries cvi, dvt (with thrombophlebitis) and pe.
 * Cases 6.1–6.5 (arteries) are in u6-arteries.js; both files use unit "vessels".
 * Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md. Sources: docs/SOURCE-NOTES.md §10–11.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 6.6 A Tale of Two Ulcers — chronic venous insufficiency vs arterial insufficiency (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-tale-of-two-ulcers",
    unit: "vessels",
    order: 6,
    difficulty: "medium",
    title: "A Tale of Two Ulcers",
    teaser: "A sore above the ankle that won't heal — and a leg that feels better with its feet up.",
    patient: { name: "Vera Castillo", age: 70, sex: "F" },
    setting: "Outpatient wound clinic",
    file: {
      referral: [
        "**Referral:** non-healing ulcer above the left inner ankle for 3 months — wound care and education. From her primary care physician.",
        { quote: "My left leg has been heavy and swollen for years, but this sore just won't heal.", by: "Mrs. Castillo" }
      ],
      history: {
        list: [
          "**Left leg:** a deep vein thrombosis (DVT) 10 years ago, treated with blood thinners for 6 months. Since then the leg swells a little more each day, aches and feels heavy — worse by the end of a shift, better with her feet up and first thing in the morning.",
          "**The ulcer:** appeared 3 months ago after she bumped her ankle; mildly painful; weeps onto her sock.",
          "**Work:** part-time cashier — on her feet 6 hours a shift, 4 days a week.",
          "**Past medical history:** osteoarthritis of the knees; underactive thyroid. No diabetes. Never smoked."
        ]
      },
      medications: [
        { name: "Levothyroxine", dose: "75 micrograms once a day" },
        { name: "Acetaminophen", dose: "500 mg as needed for leg aching" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 72, bp: "128/76", rr: 14, spo2: 98, temp: "98.2 °F", pain: "3/10 (left lower leg, aching)" },
      exam: {
        list: [
          "**Left lower leg:** brown, thickened skin (hemosiderin staining) from mid-shin to the ankle; dilated superficial veins; 2+ pitting edema to mid-calf by the afternoon.",
          "**Ulcer:** 3.5 × 2.5 cm, shallow, just above the medial malleolus; irregular edges; moist red base with a thin yellow film; moderate drainage.",
          "**Circulation:** dorsalis pedis and posterior tibial pulses easy to feel in both feet; feet warm, with normal hair growth.",
          "Calf soft — not warm, red or newly tender. Right leg: normal skin, no swelling."
        ]
      },
      tests: [
        {
          id: "abi-today", type: "table", title: "Ankle-brachial index (today)",
          head: ["Site", "Right (mmHg)", "Left (mmHg)"],
          rows: [
            ["Brachial", "130", "128"],
            ["Posterior tibial", "136", "132"],
            ["Dorsalis pedis", "132", "130"]
          ],
          note: "Left ABI = 132 ÷ 130 = 1.02. Right ABI = 136 ÷ 130 = 1.05. Both normal."
        },
        {
          id: "venous-duplex", type: "report", title: "Imaging of the left leg", sealed: true,
          text: [
            "**Left leg:** backward flow (reflux) through incompetent valves in the great saphenous vein and the popliteal vein; old, scarred (post-thrombotic) changes in the femoral and popliteal veins. **No new clot.**",
            "**Right leg:** normal.",
            "**Impression:** chronic venous insufficiency of the left leg after a previous DVT."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which condition best explains the changes in her left leg?",
        options: [
          { text: "Chronic venous insufficiency", correct: true, why: "Yes: years of swelling and heavy aching that ease with her legs up, brown hemosiderin staining, and a shallow, weeping, irregular ulcer above the medial malleolus — with normal pulses and a normal ABI." },
          { text: "Peripheral arterial disease (chronic arterial insufficiency)", why: "Her pulses are easy to feel, her feet are warm with normal hair, her ABI is 1.02, and her aching eases with her legs up. Arterial pain comes with walking and gets worse, not better, with elevation." },
          { text: "A new deep vein thrombosis", why: "A new DVT causes sudden swelling with warmth, redness and tenderness. Her changes built up over years — brown staining takes a long time to develop — and her calf is soft and not tender. Her old DVT is the likely *cause* of her problem, though." },
          { text: "A diabetic (neuropathic) foot ulcer", why: "Diabetic ulcers are painless and usually on the sole of the foot. She doesn't have diabetes, and her ulcer is above the inner ankle." }
        ],
        hints: [
          "Notice what makes her leg feel better, and how long the skin changes have been building.",
          "Her pulses and ABI tell you about the arteries. So where is the problem?"
        ],
        explain: [
          "**Chronic venous insufficiency (CVI)** (L2 s63–64): the vein valves are incompetent, so blood pools and the pressure in the leg veins stays high — **venous hypertension**. Fluid seeps into the tissues and eventually overloads the lymphatic system → edema. The protein-rich fluid causes inflammation, low oxygen and fibrosis → skin changes and **venous stasis ulcers** that heal slowly.",
          "Red blood cells that leak out break down into **hemosiderin**, staining the skin brown (L2 s66–67).",
          "Her DVT 10 years ago is the likely cause: a clot can scar the vein and wreck its valves (post-thrombotic syndrome)."
        ]
      },
      {
        id: "s2",
        update: {
          title: "Two ulcers, side by side",
          text: "To make the differences stick, Dr. Okafor pulls a second ulcer from the clinic's teaching file.",
          exhibits: [
            {
              id: "teaching-ulcer", type: "note", title: "Teaching file: ulcer B", author: "Dr. Okafor",
              text: [
                "A 76-year-old man who smokes, with calf pain after one block of walking that eases when he rests.",
                { list: [
                  "A small, round, punched-out ulcer on the tip of his second toe: pale base, black edge.",
                  "Foot cool, shiny and hairless; thick toenails.",
                  "No foot pulses can be felt.",
                  "Foot pale when raised, dusky red when hanging down.",
                  "ABI 0.45."
                ] }
              ]
            }
          ]
        },
        type: "classify",
        prompt: "Sort these findings — from Mrs. Castillo and from ulcer B — into arterial or venous insufficiency.",
        categories: ["Arterial insufficiency", "Venous insufficiency"],
        items: [
          { text: "Brown (hemosiderin) staining of the lower leg", category: 1, why: "Red cells leak out under high venous pressure and break down into brown hemosiderin." },
          { text: "Shallow, weeping ulcer with irregular edges above the medial malleolus", category: 1, why: "The classic venous ulcer: shallow, exudative, irregular, at the inner ankle." },
          { text: "Aching and swelling that ease with the legs raised", category: 1, why: "Elevation lets pooled venous blood drain." },
          { text: "Swelling that is worse after a long shift on her feet", category: 1, why: "Venous edema builds with prolonged dependency." },
          { text: "Round, punched-out ulcer on a toe with a pale base and a black edge", category: 0, why: "The classic arterial ulcer: regular, punched out, pale or yellow to black, on the toes or feet." },
          { text: "Pale when raised, dusky red when hanging down", category: 0, why: "Pallor on elevation and dependent rubor: too little arterial inflow." },
          { text: "Cool, shiny, hairless skin with no palpable pulses", category: 0, why: "The skin and hair are starved of arterial blood; the pulses are weak or absent." },
          { text: "Calf pain after one block of walking, relieved by rest", category: 0, why: "Intermittent claudication: the muscles outrun their arterial supply." }
        ],
        hints: [
          "Arterial disease starves the tissue of blood; venous disease traps blood in it.",
          "What does raising the leg do in each case — help blood drain out, or make it harder to get in?"
        ],
        explain: [
          "Lecture 2 compares the two side by side (L2 s65–66):",
          { table: { head: ["Feature", "Chronic arterial insufficiency", "Chronic venous insufficiency"], rows: [
            ["Cause", "Atherosclerosis, thrombosis, emboli, inflammation", "Thrombophlebitis, trauma, a clot, incompetent valves"],
            ["Pain", "Claudication: worse with exercise, relieved by rest; rest pain means severe disease", "Mild to moderate aching with prolonged standing or sitting"],
            ["Where", "Calf, lower leg, top of the foot; sometimes hip or buttock", "Superficial, along the course of the vein"],
            ["Vessels", "Decreased or absent pulses; pale on elevation; dependent rubor", "Dilated veins; moderate to severe edema after dependency"],
            ["Skin", "Pale, shiny, dry; hair loss; nail changes; cool", "Hemosiderin: dark, thickened brown skin; dermatitis, cellulitis"],
            ["Ulcers", "Feet, toes, sites of trauma; round, punched out; pale or yellow to black; gangrene possible", "Ankles, especially the medial malleolus; shallow, weeping, irregular; painful; no gangrene"]
          ] } }
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "Dr. Okafor quizzes you: where do venous stasis ulcers typically form?",
        options: [
          { text: "Around the ankle, especially over the medial malleolus", correct: true, why: "Yes. Venous ulcers form low on the leg around the ankle, especially over the inner (medial) malleolus, where venous pressure is highest when standing." },
          { text: "On the tips of the toes and between the toes", why: "That's typical of arterial ulcers: the toes are farthest from the arterial supply." },
          { text: "On the sole, under the ball of the big toe", why: "That's the typical spot for a diabetic (neuropathic) ulcer — painless, where pressure falls when walking." },
          { text: "Over the heel and the sacrum in patients who spend a long time in bed", why: "Those are pressure injuries, from lying on bony points — a different cause altogether." }
        ],
        hints: [
          "Where in the leg does pooled venous blood press hardest when she stands?",
          "Low on the leg — but not on a weight-bearing surface."
        ],
        explain: [
          "**Venous ulcers** form around the ankles, especially over the **medial malleolus** (L2 s66): shallow, exudative (weeping), with irregular borders and often painful. Gangrene doesn't develop.",
          "**Arterial ulcers** form on the feet, toes or sites of trauma: regular, 'punched out', with a pale or yellow to black (eschar) base, and gangrene may develop (L2 s65). **Diabetic ulcers** are painless and on the sole of the foot (L2 s54)."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "What positioning and activity advice fits her venous insufficiency?",
        options: [
          { text: "Raise her legs above heart level often, limit long standing, and keep walking with ankle pumps", correct: true, why: "Yes. Elevation drains the pooled blood and fluid, and walking and ankle pumps work the calf-muscle pump that pushes venous blood back toward the heart." },
          { text: "Let her legs hang down over the edge of the bed whenever she rests, to bring more blood to the ulcer", why: "Hanging the legs down can ease an arterial leg; in venous disease it adds to the pooling, swelling and pressure." },
          { text: "Rest in bed, with no walking, until the ulcer heals", why: "Walking works the calf-muscle pump. Bed rest weakens it — and immobility raises the risk of another DVT." },
          { text: "Sit with her knees crossed and a heating pad on the ankle for comfort", why: "Crossed legs press on the veins, and heat widens the vessels and adds to the swelling." }
        ],
        hints: [
          "What helps blood that's struggling to get back up the leg?",
          "Gravity and the calf muscles are your two tools."
        ],
        explain: [
          "**Elevation** lets gravity drain the pooled blood: the symptoms of CVI improve, and may resolve, with elevation and return with dependency (L2 s64). **Walking and ankle pumps** work the calf-muscle pump, which squeezes the deep veins and pushes blood toward the heart. Long standing — like her cashier shifts — does the opposite.",
          "**Compression** (bandages or stockings, as prescribed) is a mainstay of venous ulcer care, but only once arterial disease has been ruled out: squeezing a leg with poor arterial flow can damage it. That's one reason her normal ABI matters.",
          { tip: "Positioning is opposite for the two: arterial pain often eases with the leg hanging down; venous symptoms ease with the leg up." }
        ]
      },
      {
        id: "s5",
        type: "test",
        prompt: "Her physician wants to see how the veins themselves are working. Which test should you expect her to have?",
        options: [
          { text: "Venous duplex ultrasound of the left leg", correct: true, reveals: ["venous-duplex"], why: "Yes: venous ultrasonography shows the veins and the direction of blood flow in them — including blood falling back through leaky valves (L2 s64)." },
          { text: "Another ankle-brachial index", why: "The ABI checks arterial flow — hers is normal. It tells you nothing about the vein valves." },
          { text: "An arteriogram (contrast X-ray of the leg arteries)", why: "An invasive picture of the arteries, not needed when the pulses and ABI are normal — and it doesn't show venous reflux." },
          { text: "Echocardiogram", why: "That's an ultrasound of the heart, not the leg veins." }
        ],
        hints: [
          "Lecture 2 names one imaging test for CVI.",
          "Sound waves can show blood flowing the wrong way in a vein."
        ],
        explain: [
          "**Venous ultrasonography** (a duplex ultrasound) shows the veins' structure and the direction of flow: incompetent valves let blood fall back down the leg (reflux). It also checks for a new clot.",
          "Her result confirms CVI after her old DVT. Her physician's plan: compression, wound care, leg elevation and walking."
        ]
      }
    ],
    debrief: {
      diagnosis: "Chronic venous insufficiency with a venous stasis ulcer, after a DVT 10 years ago",
      summary: [
        "Mrs. Castillo's left leg told a venous story: years of swelling and heavy aching that eased with her legs up, brown hemosiderin staining, and a shallow, weeping, irregular ulcer above the medial malleolus — with normal pulses and a normal ABI. Her old DVT had damaged the vein valves, leaving **chronic venous insufficiency**.",
        "Comparing her ulcer with an arterial one shows why the difference matters: elevation, walking and compression help a venous leg, while an arterial leg needs a very different approach."
      ],
      takeaways: [
        "CVI: incompetent valves → venous hypertension → edema, hemosiderin staining, fibrosis and stasis ulcers.",
        "Venous: aching and swelling with dependency, better with elevation; shallow, weeping, irregular ulcers at the medial malleolus; pulses present; no gangrene.",
        "Arterial: claudication, pallor on elevation and dependent rubor, cool hairless skin, weak pulses; punched-out ulcers on the toes and feet; gangrene possible.",
        "Advise elevation, regular walking and ankle pumps, and avoiding long standing or sitting; compression only once arterial disease is ruled out.",
        "Venous duplex ultrasound shows the veins; the ABI checks the arteries."
      ],
      sources: ["L2 s63–64 · Chronic venous insufficiency", "L2 s65–66 · Arterial vs venous insufficiency", "L2 s67 · Hemosiderin deposits", "L2 s48–50 · ABI"]
    },
    casebook: ["cvi", "pvd", "abi", "dvt"]
  });

  // ---------------------------------------------------------------------------------------
  // 6.7 The Post-Op Calf — deep vein thrombosis and the Wells score (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-post-op-calf",
    unit: "vessels",
    order: 7,
    difficulty: "hard",
    title: "The Post-Op Calf",
    teaser: "Nine days after surgery he's finally ready to walk. His left calf has other ideas.",
    patient: { name: "Marcus Webb", age: 58, sex: "M" },
    setting: "Inpatient surgical floor",
    file: {
      referral: [
        "**Referral:** day 9 after open surgery to remove part of his colon for colon cancer — gait training and endurance before discharge home. From the surgical team.",
        { quote: "My left calf's been aching since last night. Probably all that lying around — I'm just glad to be getting my legs back.", by: "Mr. Webb" }
      ],
      history: {
        list: [
          "**Surgery:** 9 days ago, removal of part of the colon for colon cancer. Chemotherapy is planned to start in about 4 weeks.",
          "**Hospital course:** mostly in bed for the first 4 days (pain, nausea, a slow-to-wake bowel); walking the hallway with staff twice a day since day 5. He often took off his leg compression sleeves at night because they kept him awake.",
          "**Clot prevention:** enoxaparin injections started on day 5, once bleeding from the wound had settled.",
          "**Past medical history:** high cholesterol. No previous DVT or pulmonary embolism.",
          "**Social:** bus driver; lives with his partner in a two-story house."
        ]
      },
      medications: [
        { name: "Enoxaparin", dose: "40 mg injected under the skin once a day — started on day 5" },
        { name: "Acetaminophen", dose: "1,000 mg every 8 hours" },
        { name: "Oxycodone", dose: "5 mg every 4 hours as needed for pain" },
        { name: "Atorvastatin (Lipitor)", dose: "20 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 88, bp: "132/80", rr: 16, spo2: 97, temp: "99.9 °F", pain: "5/10 (left calf); 2/10 (incision)" },
      exam: {
        list: [
          "**Left calf:** swollen, warm and red; tender to the touch along the deep veins at the back of the calf.",
          "**Calf circumference**, 10 cm below the tibial tuberosity: left 41.5 cm, right 38.0 cm. **Thigh circumference**, 15 cm above the kneecap: 52 cm on both sides.",
          "**Pitting edema:** 2+ at the left ankle and shin; none on the right.",
          "No visible collateral (non-varicose) superficial veins. No weakness, paralysis or cast. Foot pulses strong and equal on both sides.",
          "**Night nurse's note:** 'Pain in the left calf when his foot was dorsiflexed (positive Homan's sign).'",
          "Breathing comfortably; no chest pain or cough."
        ]
      },
      tests: [
        {
          id: "leg-imaging", type: "report", title: "Imaging report — both legs", sealed: true,
          text: [
            "**Venous duplex ultrasound:** the left popliteal vein and the left posterior tibial veins don't compress and contain clot — **acute deep vein thrombosis of the left leg**. Right leg: normal.",
            "**Surgical team's plan:** enoxaparin increased to a full treatment dose. 'OK to walk with PT once anticoagulated — from tomorrow.'"
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "multi",
        prompt: "You came to walk Mr. Webb, but first you look at his left leg. Which of his findings are signs you can rely on as pointing to a deep vein thrombosis (DVT)? Select all that apply.",
        options: [
          { text: "Left calf 3.5 cm bigger than the right", correct: true, why: "Yes: calf swelling of more than 3 cm compared with the other leg is a Wells criterion." },
          { text: "Warmth and redness over the left calf", correct: true, why: "Yes: swelling, redness, warmth and pain are the signs to watch for (L2 s58)." },
          { text: "Tenderness along the deep veins of the calf", correct: true, why: "Yes: localized tenderness along the deep veins is a Wells criterion, and pain in the back of the calf fits a clot in the popliteal vein." },
          { text: "Pitting edema in the left leg only", correct: true, why: "Yes: edema in one leg points to a local cause such as a DVT (L1 s34), and pitting edema confined to the symptomatic leg is a Wells criterion." },
          { text: "Calf pain when his foot is dorsiflexed (Homan's sign)", why: "Not reliable: Homan's sign has low sensitivity and specificity (L2 s58). A positive or negative result doesn't change what you do — and pushing the foot up on a suspected clot is best avoided." },
          { text: "Strong, equal pulses in both feet", why: "Normal arterial pulses don't point to a DVT: a clot in a vein usually leaves the pulses alone. They don't rule a DVT out either." }
        ],
        hints: [
          "The lecture's four words for a DVT: swelling, redness, warmth, pain.",
          "One finding comes from a classic bedside test that the lecture calls unreliable."
        ],
        explain: [
          "**DVT signs** (L2 s58): swelling, redness, warmth and pain; tenderness and hardening (induration) over the vein; sometimes a fever. A clot in the popliteal vein causes pain in the middle of the back of the calf, often with swelling and acute tenderness.",
          "**Homan's sign** — calf pain when the foot is dorsiflexed — is **not a reliable test** for DVT. Don't rely on it either way.",
          "His risk factors fill the chart: cancer, major surgery, four days mostly in bed, and compression sleeves often off (L2 s57)."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do you do now?",
        options: [
          { text: "Hold the walk and any exercise of that leg, don't massage it, keep him resting, and notify his nurse and Dr. Okafor now", correct: true, why: "Yes. A suspected DVT needs medical evaluation today. Until then, nothing that could dislodge the clot: no walking or exercising the leg, no massage. Keep him resting and get his nurse (who calls the surgical team) and the supervising PT now." },
          { text: "Walk him as planned — walking is the best way to prevent clots after surgery", why: "Early walking *prevents* DVT in patients without a clot. With a suspected clot, hold exercise until he has been evaluated and treated; once he is fully anticoagulated, his team will get him walking again." },
          { text: "Massage the calf gently to ease the swelling and the ache", why: "Never massage a suspected DVT: kneading the calf could break off part of the clot and send it to the lungs." },
          { text: "Write it in his chart and bring it up at tomorrow's team meeting", why: "A suspected DVT needs evaluation today. The danger is a pulmonary embolism, which can kill — notify now." },
          { text: "Do ankle pumps with him and put a warm pack on the calf", why: "Exercising and warming the leg are for comfort and prevention, not for a suspected clot. Stop, and get him evaluated." }
        ],
        hints: [
          "What could happen if part of a clot broke loose?",
          "This needs his medical team today, not next week."
        ],
        explain: [
          "**Suspected DVT — what the PTA does:** stop exercising the leg, don't massage it, keep the patient resting, and notify the supervising PT and the nurse or physician right away. The PTA should note any lower-extremity pain, especially after surgery, and take any unusual sign seriously (L2 s60).",
          "This is a pause, not a prescription of bed rest. Lecture 2 (slide 60) says a DVT patient is 'required to have bed rest'; current practice is different — once anticoagulation is under way, early walking is encouraged. The pause lasts only until his team has evaluated and treated him."
        ]
      },
      {
        id: "s3",
        update: {
          title: "Dr. Okafor arrives",
          text: [
            "Dr. Okafor has called the surgical resident, who examined Mr. Webb and left a note. While they wait for imaging, Dr. Okafor hands you the Wells checklist.",
            { quote: "Score it with me — line by line, straight from his chart.", by: "Dr. Okafor" }
          ],
          exhibits: [
            {
              id: "resident-note", type: "note", title: "Surgical resident's note", author: "Surgical resident",
              text: "Day 9 after colectomy for colon cancer. Left calf swollen, warm and tender. **No other diagnosis is as likely as a DVT** — no sign of a muscle injury, cellulitis or a Baker's cyst. Imaging requested today. Hold PT exercise for the left leg until the result is back."
            },
            {
              id: "wells-table", type: "table", title: "Wells score for DVT — checklist",
              head: ["Criterion", "Points"],
              rows: [
                ["Active cancer (treatment within the last 6 months)", "+1"],
                ["Bedridden for more than 3 days, or major surgery within 12 weeks", "+1"],
                ["Calf swelling more than 3 cm compared with the other leg (measured 10 cm below the tibial tuberosity)", "+1"],
                ["Collateral (non-varicose) superficial veins", "+1"],
                ["Entire leg swollen", "+1"],
                ["Localized tenderness along the deep venous system", "+1"],
                ["Pitting edema confined to the symptomatic leg", "+1"],
                ["Paralysis, paresis or a recent cast on the leg", "+1"],
                ["Previously documented DVT", "+1"],
                ["An alternative diagnosis at least as likely as DVT", "−2"]
              ]
            }
          ]
        },
        type: "numeric",
        prompt: "Using the checklist and his chart, what is Mr. Webb's Wells score?",
        answer: 5,
        tolerance: 0,
        unit: "points",
        traps: [
          { value: 6, why: "One point too many. Did you count his fever or his positive Homan's sign? Neither is a Wells criterion. Or did you score surgery and time in bed separately? They share one line, worth 1 point." },
          { value: 7, why: "Two points too many. Fever and Homan's sign aren't on the Wells list, and surgery plus time in bed count once, as one line." },
          { value: 3, why: "You subtracted 2 for an alternative diagnosis — but the resident's note says no other diagnosis is as likely as a DVT. The −2 applies only when another diagnosis is at least as likely." },
          { value: 4, why: "One point short. Recheck each line: active cancer, surgery or bed rest, calf swelling over 3 cm, tenderness along the deep veins, pitting edema in that leg only." }
        ],
        hints: [
          "Go line by line. Some of his findings aren't on the list at all.",
          "Surgery and days in bed share one line. And read the resident's note before you subtract anything."
        ],
        explain: [
          { table: { head: ["Criterion", "Mr. Webb", "Points"], rows: [
            ["Active cancer (treatment within 6 months)", "Colon cancer: surgery 9 days ago, chemotherapy planned", "+1"],
            ["Bedridden more than 3 days, or major surgery within 12 weeks", "Both — but it's one line", "+1"],
            ["Calf swelling more than 3 cm", "41.5 − 38.0 = 3.5 cm", "+1"],
            ["Collateral superficial veins", "None", "0"],
            ["Entire leg swollen", "No — the thighs measure the same", "0"],
            ["Tenderness along the deep veins", "Yes", "+1"],
            ["Pitting edema in the symptomatic leg only", "Yes — left only", "+1"],
            ["Paralysis, paresis or a recent cast", "No", "0"],
            ["Previously documented DVT", "No", "0"],
            ["Alternative diagnosis at least as likely", "No, says the resident", "0"],
            ["**Total**", "", "**5**"]
          ] } },
          "**Not on the list:** fever and Homan's sign. Either may be present with a DVT, but neither scores."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "What does a Wells score of 5 mean?",
        options: [
          { text: "DVT is likely — he needs prompt imaging", correct: true, why: "Yes: a score of 2 or more means a DVT is likely (about 28 % in the original studies), so he needs prompt imaging to confirm or rule it out." },
          { text: "DVT is unlikely — the score is below the cut-off, so he can walk", why: "The cut-off is 2: below 2 is 'unlikely', 2 or more is 'likely'. His 5 is well above it." },
          { text: "DVT is confirmed — no test is needed", why: "The Wells score estimates a probability; it can't confirm a clot. Imaging decides." },
          { text: "A pulmonary embolism is likely and he needs a lung scan", why: "This Wells score estimates the chance of a DVT, not a PE. He has no breathlessness, chest pain or low oxygen — but you'll watch for them." }
        ],
        hints: [
          "The Wells cut-off is a single number. Where does 5 fall?",
          "A probability score and a diagnosis aren't the same thing."
        ],
        explain: [
          "**Wells score** (L2 s59): **below 2 — DVT unlikely** (about 6 %); **2 or more — DVT likely** (about 28 %). A 'likely' score means prompt imaging; an 'unlikely' score doesn't rule out a clot if the picture still worries you.",
          "The score is a communication tool too: 'swollen, warm, tender left calf, 3.5 cm bigger than the right, Wells 5' tells the team exactly why you're worried."
        ]
      },
      {
        id: "s5",
        type: "test",
        prompt: "Which test will confirm or rule out the clot?",
        options: [
          { text: "Doppler (duplex) ultrasound of the leg veins", correct: true, reveals: ["leg-imaging"], why: "Yes: Doppler ultrasound shows blood flow in the veins, and a vein that won't compress under the probe contains a clot (L2 s60)." },
          { text: "Ankle-brachial index", why: "The ABI checks the arteries for narrowing. A DVT is in the veins." },
          { text: "A V/Q (ventilation–perfusion) scan of the lungs", why: "A V/Q scan looks for a clot that has already reached the lungs. He has no breathing symptoms; the question is his leg." },
          { text: "An X-ray of the lower leg", why: "X-rays show bone; they can't show a clot in a vein." }
        ],
        hints: [
          "The lecture's first medical step for a suspected DVT is a study of blood flow.",
          "It uses sound waves — and the probe can press on the vein to see whether it collapses."
        ],
        explain: [
          "**Doppler (duplex) ultrasound** is the standard test for DVT: blood flow is shown in color, and a healthy vein squeezes flat under the probe while a vein full of clot does not.",
          "Medical treatment (L2 s60): **anticoagulants** — heparin, including low-molecular-weight heparins such as enoxaparin, or warfarin and newer oral agents — and compression. A clot in the popliteal vein is a 'proximal' DVT, the kind most likely to break off and travel to the lungs."
        ]
      },
      {
        id: "s6",
        update: {
          title: "The next day",
          text: [
            "Mr. Webb is on a full treatment dose of enoxaparin, and the surgical team has cleared him to walk with you.",
            { quote: "So I'm allowed up now? Yesterday you wouldn't let me take a step!", by: "Mr. Webb" }
          ],
          vitals: { hr: 84, bp: "128/78", rr: 16, spo2: 97, temp: "99.1 °F" }
        },
        type: "single",
        prompt: "As you walk him, which complication of his DVT are you watching for above all?",
        options: [
          { text: "Pulmonary embolism — sudden breathlessness and chest pain", correct: true, why: "Yes: a piece of the clot can break off, travel through the right heart and lodge in a lung artery. Sudden breathlessness, chest pain that's worse on a deep breath, coughing and a racing pulse mean an emergency call." },
          { text: "A venous stasis ulcer appearing at his ankle during the walk", why: "Venous insufficiency and ulcers can follow a DVT months or years later (post-thrombotic syndrome) — but they aren't an immediate danger on today's walk." },
          { text: "Intermittent claudication in his left calf", why: "Claudication comes from narrowed arteries, not from a clot in a vein." },
          { text: "A hypertensive crisis caused by the enoxaparin", why: "Anticoagulants don't raise blood pressure. The side effect to watch for with them is bleeding." }
        ],
        hints: [
          "Where does a piece of clot from a leg vein end up?",
          "The lecture says this complication can kill — and is sometimes the first sign of a DVT."
        ],
        explain: [
          "**Pulmonary embolism** is the dangerous complication of a DVT (L2 s60–61). Signs: **sudden dyspnea**, chest pain that worsens with deep breathing or coughing, a cough (sometimes with blood), low oxygen, sweating, fainting, a rapid or weak pulse (L2 s62). Stop, sit the patient up, and call for emergency help at once.",
          "Walking on full anticoagulation is encouraged: it eases the leg symptoms and doesn't raise the risk of PE. Remember the anticoagulant's own risk — **bleeding**: guard against falls and bumps, and report unusual bruising or bleeding (L1 s53).",
          { tip: "Prevention after surgery: early walking and exercise, compression stockings, and compression pumps during periods of immobility (L2 s60)." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Acute deep vein thrombosis of the left leg after cancer surgery",
      summary: [
        "Nine days after cancer surgery, four of them mostly in bed, Mr. Webb's left calf was 3.5 cm bigger than the right, warm, red and tender along the deep veins, with pitting edema in that leg only: a **Wells score of 5 — DVT likely**. A Doppler ultrasound confirmed a DVT in his popliteal vein.",
        "You held his walk, kept him resting with no massage or leg exercise, and got his nurse and Dr. Okafor involved at once. Once he was fully anticoagulated, walking resumed — with an eye out for the signs of a pulmonary embolism."
      ],
      takeaways: [
        "DVT signs: swelling, redness, warmth and pain or tenderness in one leg. Homan's sign is unreliable.",
        "Wells score: below 2 = DVT unlikely; 2 or more = likely. Fever and Homan's sign don't score; surgery and bed rest share one point; subtract 2 only when another diagnosis is at least as likely.",
        "Suspected DVT: stop exercising the leg, no massage, keep the patient resting, and notify the supervising PT and the nurse or physician now.",
        "Doppler ultrasound confirms a DVT; anticoagulants treat it — and once they're under way, early walking is encouraged.",
        "The danger is a pulmonary embolism: sudden breathlessness and chest pain mean an emergency call."
      ],
      sources: ["L2 s57–58 · DVT and thrombophlebitis", "L2 s59 · Wells score", "L2 s60 · DVT management and PT", "L2 s61–62 · Pulmonary embolism", "L1 s53 · Anticoagulants"]
    },
    casebook: ["dvt", "wells-dvt", "anticoagulants", "pe", "edema-scale"]
  });

  // ---------------------------------------------------------------------------------------
  // 6.8 Sudden Breathlessness — pulmonary embolism (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-sudden-breathlessness",
    unit: "vessels",
    order: 8,
    difficulty: "hard",
    title: "Sudden Breathlessness",
    teaser: "The cast is off and the ankle is mending. Then, mid-session, she can't catch her breath.",
    patient: { name: "Joan Mercer", age: 38, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right ankle fracture (lateral malleolus) treated in a below-knee cast for 6 weeks; cast removed 1 week ago — range of motion, strengthening, gait and balance. From her orthopedic surgeon.",
        { quote: "So glad that cast is off! Still stiff and a bit puffy around the ankle. And I'm jet-lagged — we flew back from my sister's wedding two days ago.", by: "Ms. Mercer" }
      ],
      history: {
        list: [
          "**Right ankle fracture** 7 weeks ago: 6 weeks in a below-knee cast, mostly on crutches; cast off 1 week ago.",
          "**Travel:** an 11-hour flight home 2 days ago, mostly sitting in a window seat.",
          "**Smoking:** about 10 cigarettes a day. Two cups of coffee a day.",
          "**Past medical history:** none. No previous clots; no heart or lung disease."
        ]
      },
      medications: [
        { name: "Ethinyl estradiol / levonorgestrel", dose: "one tablet daily — a combined (estrogen-containing) birth-control pill, for 10 years" },
        { name: "Ibuprofen", dose: "400 mg as needed for ankle pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 96, bp: "122/78", rr: 18, spo2: 97, temp: "98.6 °F", pain: "2/10 (right ankle)" },
      exam: {
        list: [
          "Right ankle: stiff (dorsiflexion 5°); mild puffiness around the ankle bones, as expected after a cast.",
          "Gait: limping slightly; walks without crutches.",
          "Breathing comfortably; no cough or chest pain."
        ]
      },
      tests: [
        {
          id: "ed-report", type: "report", title: "Emergency department report", sealed: true,
          text: [
            "**CT pulmonary angiogram:** large clots in both main pulmonary arteries — **bilateral pulmonary emboli** — with strain on the right ventricle.",
            "**Leg ultrasound:** clot in the right popliteal and calf veins (deep vein thrombosis), the likely source.",
            "**Course:** her blood pressure fell to 84/52 in the emergency department, so she was given **alteplase (Activase)** to dissolve the clots, followed by a heparin infusion. Her oxygen level and blood pressure improved, and she was moved to the cardiac step-down unit."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        update: {
          title: "Fifteen minutes in…",
          text: [
            "Ms. Mercer is doing heel raises at the parallel bars when she stops, gasping, and clutches the right side of her chest.",
            { quote: "I can't get my breath… it's a sharp, stabbing pain — worse when I breathe in.", by: "Ms. Mercer" },
            "She coughs into a tissue: it's streaked with blood. She is sweating and frightened. As you help her sit, you notice her right calf is visibly bigger than the left, and tender when you touch it."
          ],
          vitals: { hr: 122, bp: "118/76", rr: 30, spo2: 88, pain: "8/10 (right chest, sharp, worse on breathing in)" }
        },
        type: "single",
        prompt: "Which condition best explains what is happening?",
        options: [
          { text: "Pulmonary embolism", correct: true, why: "Yes: sudden breathlessness, sharp chest pain worse on breathing in, blood-streaked sputum, a racing pulse and low oxygen, plus a swollen, tender calf — after a cast, a long flight and estrogen." },
          { text: "Heart attack (myocardial infarction)", why: "A PE can mimic an MI, but her pain is sharp and worse with breathing and coughing, she's coughing up blood, and one calf is swollen. That pattern points to the lungs' arteries, not the coronary arteries." },
          { text: "A panic attack", why: "Anxiety can make breathing fast, but it doesn't drop the oxygen saturation to 88 %, streak the sputum with blood or swell a calf. Never put it down to panic when the numbers say otherwise." },
          { text: "Acute pulmonary edema from heart failure", why: "Pulmonary edema brings frothy, often pink sputum, crackles and breathlessness that's worse lying flat, usually in someone with heart failure. She has no heart disease, a sharp pain on breathing in, and a swollen calf." }
        ],
        hints: [
          "Put her history together with her new findings: what has been happening in her legs over the past weeks?",
          "Notice what makes her chest pain worse."
        ],
        explain: [
          "**Pulmonary embolism (PE)** (L2 s61): a clot — usually from the leg veins — breaks off, travels through the right heart and lodges in a pulmonary artery. The lung tissue beyond it loses its blood flow, and the body can't get enough oxygen.",
          "Signs (L2 s62): **sudden dyspnea** at rest and with activity, coughing, **hypoxia**, chest pain that **can mimic an MI** but typically **worsens with coughing or deep breathing**, eating or bending; blood-tinged sputum; one swollen leg; cyanosis, wheezing, sweating, fainting, a rapid or weak pulse."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Call 911; keep her sitting upright at rest, give oxygen per protocol, monitor her and get Dr. Okafor", correct: true, why: "Yes. A suspected PE is an emergency. Sitting upright makes breathing easiest; oxygen (if your clinic has it and your protocol allows) treats the hypoxia; stay with her and recheck her vital signs until the paramedics take over." },
          { text: "Have her lie flat with her legs raised to bring her blood pressure up", why: "Her blood pressure is holding; her breathing is the problem, and lying flat makes breathing harder. Keep her sitting upright, at rest." },
          { text: "Massage her calf to ease the cramp, then let her rest before trying again", why: "Never massage a calf that may hold a clot — more of it could break off. And this is an emergency, not a cramp." },
          { text: "Coach her to breathe slowly into a paper bag until the panic attack passes, then recheck her oxygen", why: "Her oxygen saturation is 88 %: she needs oxygen and emergency care, not to rebreathe her own air." },
          { text: "Help her out to a friend's car so she can go to urgent care", why: "She needs an ambulance: paramedics bring oxygen and can treat her on the way. Walking and a car ride waste minutes and add strain." }
        ],
        hints: [
          "Sudden breathlessness with chest pain and an SpO2 of 88 % — how urgent is that?",
          "In which position is it easiest to breathe?"
        ],
        explain: [
          "**A suspected PE is an emergency: call 911** (Casebook: red flags). While you wait: keep her at rest, **sitting upright**; give oxygen if your clinic has it and your protocol allows; stay with her; recheck pulse, blood pressure, breathing and SpO2; send someone to meet the paramedics; tell Dr. Okafor.",
          { warn: "If she becomes unresponsive and isn't breathing normally, start CPR and get the AED: a massive PE can stop the heart." }
        ]
      },
      {
        id: "s3",
        update: {
          title: "Waiting for the ambulance",
          text: "Ms. Mercer is sitting up with oxygen on, and her SpO2 has crept up to 92 %. Dr. Okafor is with her, and the paramedics are four minutes away. Dr. Okafor wants you ready to give them a clear report.",
          vitals: { hr: 118, bp: "116/74", rr: 28, spo2: 92 }
        },
        type: "multi",
        prompt: "Her chest pain could be mistaken for a heart attack. Which features point to a pulmonary embolism rather than an MI? Select all that apply.",
        options: [
          { text: "Sharp chest pain that's worse with deep breaths and coughing", correct: true, why: "Pain that's worse on breathing in or coughing is typical of a PE (L2 s62). The ischemic pain of an MI is a deep pressure or squeezing that breathing doesn't change." },
          { text: "Coughing up blood-streaked sputum", correct: true, why: "Blood-tinged sputum comes from the injured lung tissue (L2 s62)." },
          { text: "A swollen, tender right calf", correct: true, why: "One swollen, tender leg suggests a DVT — the usual source of a PE." },
          { text: "Sweating and anxiety", why: "Both happen with a PE and with an MI, so they don't help you tell them apart." },
          { text: "A racing heart rate", why: "A fast pulse occurs with both." },
          { text: "Pressure that spreads to the left arm and jaw", why: "That's the classic pattern of cardiac ischemia (angina, MI) — and she doesn't have it." }
        ],
        hints: [
          "Look for features that one condition has and the other usually doesn't.",
          "What makes her pain worse? And what did you find on her leg?"
        ],
        explain: [
          "**PE or MI?** Both can cause sudden chest pain, breathlessness, sweating, anxiety and a fast pulse. What tips the balance:",
          { table: { head: ["Feature", "Pulmonary embolism", "Myocardial infarction"], rows: [
            ["Chest pain", "Often sharp; worse with deep breathing, coughing, eating or bending", "Deep pressure or squeezing behind the breastbone; breathing doesn't change it"],
            ["Spreads to", "Usually nowhere", "Jaw, left arm, back"],
            ["Breathing", "Sudden dyspnea at rest and with activity; low SpO2", "Shortness of breath may come with the pain"],
            ["Sputum", "May be blood-tinged", "Usually none (frothy pink sputum if pulmonary edema develops)"],
            ["Legs", "One swollen, tender leg (DVT)", "Usually normal"],
            ["Risk factors", "Immobility, surgery, a cast, long travel, estrogen, smoking, cancer", "Smoking, hypertension, diabetes, high cholesterol, family history"]
          ] } },
          "Either way, the PTA's action is the same: call 911. Telling them apart helps you give the paramedics a clear report."
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "Which risk factors for a blood clot can you find in her file? Select all that apply.",
        options: [
          { text: "Six weeks in a below-knee cast", correct: true, why: "Immobility: in a cast and on crutches, the calf-muscle pump barely works. A recent cast is also a Wells criterion for DVT." },
          { text: "An 11-hour flight two days ago", correct: true, why: "Long hours of sitting — another form of immobility — slow the blood in the leg veins." },
          { text: "A combined birth-control pill", correct: true, why: "Estrogen-containing birth-control pills raise the risk of clotting (L2 s57)." },
          { text: "Smoking 10 cigarettes a day", correct: true, why: "Cigarette smoking is on the lecture's list. With estrogen, and after age 35, the risks add up." },
          { text: "Her ankle exercises in therapy", why: "Exercise and walking *lower* the risk of clots by working the calf-muscle pump." },
          { text: "Two cups of coffee a day", why: "Coffee isn't a risk factor for clots." }
        ],
        hints: [
          "Clots form when blood moves slowly, when a vessel is injured, or when the blood clots too easily.",
          "Which items slowed the blood in her legs for hours — or weeks?"
        ],
        explain: [
          "**Risk factors for venous clots** (L2 s57): prolonged immobility, recent surgery, pregnancy, obesity, cigarette smoking, medications such as birth-control pills and hormone replacement, 'thick' blood (polycythemia), clotting disorders, cancer and some autoimmune disorders.",
          "Ms. Mercer had four at once: six weeks in a cast, a long flight, estrogen and smoking. After a cast or long travel, take any calf pain or swelling seriously: tell the PT, and don't massage or exercise the leg until it has been checked. Sometimes the first sign of a DVT is the PE itself (L2 s60)."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Handed over",
          text: "The paramedics arrive, take over her oxygen and monitoring, and leave for the emergency department. Dr. Okafor calls later with the results."
        },
        type: "test",
        prompt: "Which test confirms a pulmonary embolism?",
        options: [
          { text: "CT pulmonary angiography or a V/Q scan", correct: true, reveals: ["ed-report"], why: "Yes: a V/Q (ventilation–perfusion) scan and CT can confirm a PE (L2 s62). A CT pulmonary angiogram — CT with contrast dye in the lungs' arteries — shows the clots directly." },
          { text: "12-lead ECG", why: "It's the first test for chest pain and may show a fast rate or strain on the right heart, but it can't show a clot in the lungs." },
          { text: "Chest X-ray", why: "It confirms fluid in the lungs (pulmonary edema) and shows other causes of breathlessness, but it's often normal in a PE and can't confirm one." },
          { text: "Doppler ultrasound of the veins in her right leg", why: "It can find the DVT in her leg — the likely source — but it can't show a clot in the lungs." }
        ],
        hints: [
          "The lecture names two scans that confirm a PE.",
          "The test has to show the blood supply of the lungs."
        ],
        explain: [
          "**A V/Q scan or CT confirms a PE** (L2 s62). Today a **CT pulmonary angiogram** is usually the first choice; a V/Q scan, which compares where the air goes with where the blood goes, is used when contrast dye isn't safe.",
          "Treatment: **anticoagulants** stop the clot growing and new ones forming; **thrombolytics** dissolve the clot when a PE is massive — for example with a falling blood pressure, as hers did. Both raise the risk of bleeding."
        ]
      },
      {
        id: "s6",
        update: {
          title: "Two days later",
          text: "Ms. Mercer is on the cardiac step-down unit, on heparin after her alteplase (Activase). Her vital signs are steady. Dr. Okafor asks you to help with her first session out of bed.",
          vitals: { hr: 94, bp: "116/74", rr: 18, spo2: 95, other: [{ label: "Oxygen", value: "2 L/min by nasal cannula" }] }
        },
        type: "single",
        prompt: "She received alteplase, a thrombolytic, two days ago and is now on heparin. What does that mean for your session?",
        options: [
          { text: "High bleeding risk: prevent falls and bumps, no vigorous manual work, and watch for bleeding", correct: true, why: "Yes. Her ability to clot is impaired, so avoid anything that could cause trauma, and watch for signs of bleeding — including a sudden headache or confusion, which could mean bleeding in the brain." },
          { text: "The clots are dissolved, so she can go straight back to full-intensity exercise", why: "Treatment doesn't make high-intensity exercise safe two days after a massive PE. Progress gradually by her symptoms, vital signs and SpO2 — and remember her bleeding risk." },
          { text: "Deep calf massage will help clear what's left of the clot in her leg", why: "Never: massage over a DVT risks dislodging clot, and deep pressure can cause bruising and bleeding." },
          { text: "Thrombolytics raise blood pressure, so check for a hypertensive crisis before each activity", why: "Thrombolytics don't raise blood pressure. Their danger is hemorrhage — including bleeding inside the skull." }
        ],
        hints: [
          "Thrombolytics dissolve clots. What happens if she is injured while her blood can't clot properly?",
          "Check the thrombolytics entry in the Casebook for the side effect to fear most."
        ],
        explain: [
          "**Thrombolytics** (alteplase/Activase, urokinase/Kinlytic) convert plasminogen to plasmin, which breaks clots down (L1 s60). Side effects: **hemorrhage, including bleeding inside the skull**, allergic reactions and arrhythmias. PT implication: avoid anything that could cause trauma while clotting is impaired.",
          { list: [
            "Guard closely against falls: clear the path, use a gait belt.",
            "No vigorous manual techniques, deep pressure or aggressive stretching.",
            "Watch for bleeding: oozing at IV sites, new bruising, blood in urine or stool, nosebleeds.",
            "Report at once a sudden severe headache, confusion, weakness or vision changes — possible bleeding in the brain."
          ] },
          "Heparin is an anticoagulant: the same bleeding precautions continue while she takes it (L1 s53)."
        ]
      }
    ],
    debrief: {
      diagnosis: "Pulmonary embolism from a right leg DVT, after a cast, a long flight, estrogen and smoking",
      summary: [
        "Mid-session, Ms. Mercer developed sudden breathlessness, sharp chest pain worse on breathing in, blood-streaked sputum, a pulse of 122 and an SpO2 of 88 % — with a swollen, tender right calf. Six weeks in a cast, an 11-hour flight, an estrogen-containing pill and smoking had set the stage for a DVT that broke off as a **pulmonary embolism**.",
        "You called 911, kept her sitting upright at rest with oxygen, and monitored her until the paramedics took over. CT confirmed clots in both lungs; she needed alteplase — and afterwards, strict bleeding precautions."
      ],
      takeaways: [
        "PE: sudden dyspnea, chest pain worse with breathing or coughing, cough with blood-tinged sputum, hypoxia, a fast pulse — often with one swollen leg.",
        "A PE can mimic an MI; pleuritic pain, blood in the sputum, a swollen calf and clot risk factors point to a PE. Either way, call 911.",
        "While you wait: rest, sitting upright, oxygen per protocol, monitoring, readiness for CPR. Never massage a suspect calf.",
        "Clot risk factors: immobility (casts, long travel, bed rest), surgery, pregnancy, obesity, smoking, estrogen, thick blood, clotting disorders, cancer.",
        "CT or a V/Q scan confirms a PE. After thrombolytics or anticoagulants, bleeding precautions: prevent falls and trauma."
      ],
      sources: ["L2 s61–62 · Pulmonary embolism", "L2 s57–60 · DVT risk factors and management", "L1 s60 · Thrombolytics", "L1 s53 · Anticoagulants"]
    },
    casebook: ["pe", "dvt", "thrombolytics", "anticoagulants", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook entries: veins and clots
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "cvi", kind: "condition", unit: "vessels",
    title: "Chronic venous insufficiency (CVI)",
    aka: ["venous insufficiency", "venous stasis ulcer", "venous ulcer", "hemosiderin staining", "post-thrombotic syndrome", "arterial vs venous insufficiency"],
    summary: "The valves of the leg veins fail, so blood pools and the pressure in the veins stays high. The result: swelling, aching, brown staining of the skin and slow-healing ulcers around the ankle.",
    sections: [
      { heading: "What it is", body: "Incompetent veins cause **venous hypertension**. Fluid builds up in the tissues and eventually overloads the lymphatic system, causing **edema**. The protein-rich fluid brings inflammation, low oxygen and fibrosis to the tissues — the setting for **venous stasis ulcers** and slow healing. It usually affects the lower legs." },
      { heading: "Causes", body: "Thrombophlebitis and previous DVT (a clot can scar a vein and destroy its valves — post-thrombotic syndrome), trauma, a vein blocked by clot, and incompetent valves. Long hours of standing or sitting make it worse." },
      { heading: "Signs and symptoms", body: { list: [
        "Edema, heaviness and a dull ache in the lower legs — better with elevation (it may resolve completely) and back once the legs hang down again.",
        "Mild to moderate aching with prolonged standing or sitting; pain along the course of the vein.",
        "Dilated veins; moderate to severe edema after long dependency.",
        "**Hemosiderin staining:** dark, thickened brown skin from broken-down red blood cells; thickened skin (hyperkeratosis); dermatitis or cellulitis.",
        "**Ulcers** around the ankles, especially the **medial malleolus**: shallow, weeping, with irregular borders; painful; no gangrene."
      ] } },
      { heading: "Arterial vs venous insufficiency", body: { table: { head: ["Feature", "Chronic arterial insufficiency", "Chronic venous insufficiency"], rows: [
        ["Cause", "Atherosclerosis, thrombosis, emboli, inflammation", "Thrombophlebitis, trauma, a clot, incompetent valves"],
        ["Pain", "Claudication: worse with exercise, relieved by rest; rest pain means severe disease", "Mild to moderate aching with prolonged standing or sitting"],
        ["Where", "Calf, lower leg, top of the foot; sometimes hip or buttock", "Superficial, along the course of the vein"],
        ["Vessels", "Decreased or absent pulses; pale on elevation; dependent rubor", "Dilated veins; moderate to severe edema after dependency"],
        ["Skin", "Pale, shiny, dry; hair loss; nail changes; cool", "Hemosiderin: dark, thickened brown skin; dermatitis, cellulitis"],
        ["Ulcers", "Feet, toes, sites of trauma; round, punched out; pale or yellow to black; gangrene possible", "Ankles, especially the medial malleolus; shallow, weeping, irregular; painful; no gangrene"]
      ] } } },
      { heading: "Tests and treatment", body: { list: [
        "**Venous ultrasonography** (duplex ultrasound) shows the veins and blood flowing backward through leaky valves, and checks for a new clot.",
        "The **ankle-brachial index** checks the arteries — needed before compression, which is unsafe when arterial flow is poor.",
        "Treatment: leg elevation, walking, compression as prescribed, skin care and wound care."
      ] } },
      { heading: "What it means for the PTA", body: [
        { list: [
          "Teach leg elevation above heart level several times a day, and avoiding long periods of standing, sitting or crossed legs.",
          "Encourage walking and ankle pumps: the calf-muscle pump pushes venous blood back toward the heart.",
          "Apply compression only as prescribed, and only once arterial disease has been ruled out.",
          "Protect the fragile skin; report new wounds, or spreading redness, warmth or fever (cellulitis)."
        ] },
        { warn: "New, sudden swelling of one leg with pain, warmth or redness could be a new DVT: stop exercising the leg and notify the supervising PT." }
      ] }
    ],
    sources: ["L2 s63–64 · Chronic venous insufficiency", "L2 s65–66 · Arterial vs venous insufficiency", "L2 s67 · Hemosiderin deposits"]
  });

  CCF.defineEntry({
    id: "dvt", kind: "condition", unit: "vessels",
    title: "Deep vein thrombosis (DVT) and thrombophlebitis",
    aka: ["DVT", "thrombophlebitis", "venous thrombosis", "blood clot in the leg", "Homan's sign", "venous thromboembolism"],
    summary: "A blood clot (thrombus) in a vein, usually a deep vein of the leg; thrombophlebitis is inflammation and clotting of a vein. The danger is a piece breaking off and lodging in the lungs — a pulmonary embolism.",
    sections: [
      { heading: "What it is", body: "**Thrombophlebitis** means inflammation and clotting of a vein. **Venous thrombosis** is a blood clot forming within a vein, usually in the deep or superficial veins of the legs. A clot in the deep veins — popliteal, femoral, iliac — can break loose and travel to the lungs." },
      { heading: "Risk factors", body: { list: [
        "Prolonged immobility: bed rest, a cast, long travel.",
        "Recent surgery.",
        "Pregnancy; obesity; cigarette smoking.",
        "Medications such as birth-control pills and hormone replacement.",
        "'Thick' blood (polycythemia), blood-clotting disorders, cancer and some autoimmune disorders."
      ] } },
      { heading: "Signs and symptoms", body: [
        "Watch for **swelling, redness, warmth and pain**; also tenderness over the vein, hardening of the tissue (induration), tightness, and sometimes a fever. A clot in the popliteal vein causes pain in the middle of the back of the calf, with swelling and acute tenderness.",
        "Some patients have no warning signs until a pulmonary embolism; occasionally there is a sudden, extreme pain around the hip.",
        { tip: "**Homan's sign** (calf pain when the foot is dorsiflexed) is **not a reliable test** for DVT: it has low sensitivity and specificity. Use the Wells score instead." }
      ] },
      { heading: "Wells score, tests and treatment", body: { list: [
        "**Wells score** (see the Casebook tool): below 2 — DVT unlikely; 2 or more — DVT likely, needing prompt imaging. Fever and Homan's sign are not criteria.",
        "**Doppler (duplex) ultrasound** confirms a DVT.",
        "**Anticoagulants** — heparin (including low-molecular-weight heparins such as enoxaparin), warfarin (Coumadin) and newer oral agents — and compression.",
        "Complication: a **pulmonary embolism**, which can kill."
      ] } },
      { heading: "Note on the slides", body: "Lecture 2 (slide 60) says the patient 'is required to have bed rest'. Current practice is different: once anticoagulation is under way, early walking is encouraged — it eases the symptoms and doesn't raise the risk of a pulmonary embolism. What the PTA does is stop exercising the leg until the patient has been evaluated and treated." },
      { heading: "What it means for the PTA", body: [
        { list: [
          "**Prevention:** early walking and exercise after surgery; compression stockings; compression pumps during periods of immobility; ankle pumps.",
          "Note any lower-extremity pain, especially after surgery or a cast, and take any unusual sign seriously.",
          "**Suspected DVT:** stop exercising the leg, don't massage it, keep the patient resting, and notify the supervising PT and the nurse or physician now.",
          "On anticoagulants: bleeding precautions — prevent falls and bumps, and report unusual bruising or bleeding."
        ] },
        { warn: "Sudden breathlessness, or chest pain that's worse on breathing in: suspect a pulmonary embolism and call 911." }
      ] }
    ],
    sources: ["L2 s57–58 · DVT and thrombophlebitis", "L2 s59 · Wells score", "L2 s60 · DVT management and PT", "L1 s53 · Anticoagulants"]
  });

  CCF.defineEntry({
    id: "pe", kind: "condition", unit: "vessels",
    title: "Pulmonary embolism (PE)",
    aka: ["pulmonary embolus", "blood clot in the lung", "V/Q scan", "CT pulmonary angiogram"],
    summary: "A clot — usually from the deep veins of the legs — lodges in a pulmonary artery and cuts off blood flow to part of the lung. It causes sudden breathlessness and chest pain that can mimic a heart attack, and it is a medical emergency.",
    sections: [
      { heading: "What it is", body: "Venous thrombi detach, travel through the right side of the heart and lodge in a pulmonary artery; often several clots are needed to cause symptoms. The lung tissue supplied by the blocked vessel loses its blood flow and becomes ischemic, and the body can't get enough oxygen." },
      { heading: "Risk factors", body: "The same as for DVT: immobility (bed rest, a cast, long travel), surgery, pregnancy, obesity, smoking, birth-control pills and hormone replacement, polycythemia, clotting disorders and cancer. Sometimes a PE is the first sign that a DVT was there." },
      { heading: "Signs and symptoms", body: { list: [
        "**Sudden dyspnea**, at rest and with activity.",
        "Coughing; hypoxia (low SpO2).",
        "**Chest pain that can mimic a heart attack** — typically worse with coughing, deep breathing, eating or bending.",
        "Blood-tinged sputum.",
        "Swelling of one leg; cyanosis, wheezing, sweating, fainting; a rapid or weak pulse."
      ] } },
      { heading: "PE or MI?", body: { table: { head: ["Feature", "Pulmonary embolism", "Myocardial infarction"], rows: [
        ["Chest pain", "Often sharp; worse with breathing, coughing, eating or bending", "Deep pressure or squeezing; breathing doesn't change it; may spread to the jaw, left arm or back"],
        ["Breathing", "Sudden dyspnea; low SpO2", "Shortness of breath may come with the pain"],
        ["Other clues", "Blood-tinged sputum; one swollen leg; clot risk factors", "Sweating, nausea; coronary risk factors; atypical signs in women and people with diabetes"]
      ] } } },
      { heading: "Tests and treatment", body: { list: [
        "**V/Q (ventilation–perfusion) scan or CT** confirms a PE; a CT pulmonary angiogram is usually the first choice today.",
        "**Anticoagulants** (heparin, then oral agents) stop the clot growing; **thrombolytics** such as alteplase dissolve it when a PE is massive. Both raise the risk of bleeding — thrombolytics including bleeding inside the skull.",
        "Oxygen for hypoxia."
      ] } },
      { heading: "What it means for the PTA", body: [
        { warn: "Suspected PE: call 911. Stop the activity, keep the patient at rest sitting upright, give oxygen if your protocol allows, monitor, notify the supervising PT, and be ready to start CPR and use the AED." },
        { list: [
          "Never massage a calf that may hold a clot.",
          "After treatment: bleeding precautions with thrombolytics and anticoagulants — prevent falls and trauma; report a sudden headache, confusion or unusual bleeding.",
          "Progress activity gradually, guided by symptoms, vital signs and SpO2, within the PT's plan."
        ] }
      ] }
    ],
    sources: ["L2 s61–62 · Pulmonary embolism", "L2 s60 · Complications of DVT", "L1 s53 · Anticoagulants", "L1 s60 · Thrombolytics"]
  });
})();
