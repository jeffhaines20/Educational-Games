/*
 * The Cardiac Case Files — Unit 6: Vessel Cases, part 1: the arteries.
 * Cases 6.1–6.5 and the Casebook entries pvd, raynauds, buergers and diabetic-angiopathy.
 * Cases 6.6–6.8 (veins and clots) are in u6-veins.js; both files use unit "vessels".
 * Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md. Sources: docs/SOURCE-NOTES.md §10.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 6.1 Two Blocks and a Bench — intermittent claudication and the walking program (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-two-blocks-and-a-bench",
    unit: "vessels",
    order: 1,
    difficulty: "easy",
    title: "Two Blocks and a Bench",
    teaser: "Two blocks to the bus-stop bench — then his right calf cramps up like a fist.",
    patient: { name: "Arthur Hollis", age: 68, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right calf pain with walking — evaluate and treat; supervised walking program, 3 times a week for 12 weeks. From his primary care physician.",
        { quote: "I get as far as the bus-stop bench on Elm Street — two blocks — and my right calf cramps up like a fist. I stand there a couple of minutes and I'm good to go again. My wife says I'm just getting old.", by: "Mr. Hollis" }
      ],
      history: {
        list: [
          "**Past 8 months:** a cramping ache in his right calf after about two blocks of walking — every time, and sooner when he walks fast or uphill. It eases after 2–3 minutes of standing still; he doesn't need to sit down or bend forward. No pain at rest or at night.",
          "**Past medical history:** type 2 diabetes for 12 years; high cholesterol; high blood pressure.",
          "**Social:** retired bus mechanic. Smokes about a pack a day, as he has since he was 18. Walks his dog less and less because of the leg.",
          "**Family:** his older brother had bypass surgery on a leg artery at 70."
        ]
      },
      medications: [
        { name: "Metformin", dose: "1000 mg twice a day", "class": "Oral diabetes medicine (biguanide)" },
        { name: "Lisinopril", dose: "10 mg once a day", "class": "ACE inhibitor" },
        { name: "Atorvastatin (Lipitor)", dose: "40 mg once a day", "class": "Statin (antihyperlipidemic)" },
        { name: "Aspirin", dose: "81 mg once a day", "class": "Antiplatelet" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 78, bp: "142/84", rr: 16, spo2: 96, temp: "98.2 °F", pain: "0/10 at rest" },
      exam: {
        list: [
          "**Right foot:** cooler to the touch than the left. The skin of the right shin and foot is thin, shiny, dry and hairless; the toenails are thick.",
          "**Pulses:** groin (femoral) pulses normal on both sides. Right popliteal, dorsalis pedis and posterior tibial pulses weak; left leg pulses normal.",
          "**Raising and lowering the leg:** lying down with his right leg raised for one minute, the sole turns pale. Sitting with the leg hanging down, the color returns slowly and then turns dusky red.",
          "No swelling of either leg; no wounds on the feet or between the toes; light-touch sensation normal.",
          "**Low back:** full, pain-free movement."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which explanation best fits Mr. Hollis's calf pain?",
        options: [
          { text: "Intermittent claudication from narrowed arteries", correct: true, why: "Yes: a cramping calf pain that arrives at a predictable distance and fades within minutes of standing still is intermittent claudication — the working muscle isn't getting enough blood through narrowed leg arteries." },
          { text: "Neurogenic claudication from lumbar spinal stenosis", why: "Spinal stenosis can also cause leg pain with walking, but it eases with sitting down or bending forward, not with simply standing still, and it usually comes with back pain or numbness. His back moves freely and standing still is enough." },
          { text: "A deep vein thrombosis in his right calf", why: "A DVT causes constant pain with swelling, warmth and redness. It doesn't switch on at two blocks and off after two minutes — and his leg isn't swollen." },
          { text: "Chronic venous insufficiency", why: "Venous insufficiency causes a heavy ache after long standing or sitting that's relieved by raising the legs, with swelling and brown skin staining. His pain comes with walking, and his legs aren't swollen." }
        ],
        hints: [
          "Notice what brings the pain on, how long it lasts and what makes it go away.",
          "Think supply and demand: what does walking ask of his calf muscles?"
        ],
        explain: [
          "**Intermittent claudication** is cramping pain in a muscle — usually the calf — that comes on with walking, exercise or long standing and is relieved by rest (L1 s38). It's the classic early symptom of **peripheral vascular disease (PVD)**: atherosclerotic plaque narrows the leg arteries, often in the thigh or behind the knee (the femoral and popliteal arteries), so working muscle can't get the extra blood it needs.",
          "It's a supply-and-demand problem, like angina in the heart: stopping lowers the muscle's demand, and the pain fades within minutes. As the disease progresses, the pain comes sooner and more often.",
          "His chart reads like the lecture's list of risk factors: smoking, diabetes, high cholesterol, high blood pressure, age and a family history.",
          { tip: "Leg pain that needs sitting down or bending forward to ease points to the spine (neurogenic claudication). Pain that eases when the patient simply stands still points to the arteries." }
        ]
      },
      {
        id: "s2",
        type: "multi",
        prompt: "Which of these signs of poor arterial blood supply can you find in his exam? Select all that apply.",
        options: [
          { text: "His right foot is cooler than the left", correct: true, why: "Less warm blood reaches the foot, so it feels cool." },
          { text: "Thin, shiny, hairless skin on his right shin", correct: true, why: "Skin that has been short of blood for a long time thins and loses its hair — classic arterial skin changes." },
          { text: "Weak pulses behind his right knee and in his right foot", correct: true, why: "A narrowing upstream weakens every pulse beyond it." },
          { text: "His sole turns pale when the leg is raised", correct: true, why: "Pallor on elevation: with the leg up, the weak arterial flow has to work against gravity." },
          { text: "A dusky red foot when the leg hangs down", correct: true, why: "Dependent rubor: the small vessels are widened as far as they can go from chronic ischemia, and gravity fills them with slow-moving blood." },
          { text: "Brown staining of the skin around the ankle", why: "Brown (hemosiderin) staining is a sign of chronic **venous** insufficiency — and it isn't in his exam." },
          { text: "Swelling that's worst at the end of the day", why: "Swelling that builds with standing is a venous (or heart-failure) sign. His legs aren't swollen." }
        ],
        hints: [
          "Work through his exam line by line: temperature, skin, pulses, and the color when the leg goes up and down.",
          "Poor arterial supply leaves a leg pale, cool and hairless. Which options describe blood pooling instead?"
        ],
        explain: [
          "His exam shows the arterial signs from the lecture's list (L2 s47, s65): **cool skin**; **pale, shiny, dry, hairless skin** with thick nails; **weak or absent pulses**; **pallor on elevation**; and **dependent rubor** — a dusky red color when the leg hangs down.",
          { table: { head: ["Feature","Arterial insufficiency", "Venous insufficiency"], rows: [
            ["Pain", "Claudication with walking, relieved by rest; pain at rest when severe", "Aching and heaviness with long standing or sitting; better with the legs raised"],
            ["Pulses and color", "Weak or absent pulses; pale when raised, dusky red when hanging down", "Dilated veins; swelling after long standing or sitting"],
            ["Skin", "Pale, shiny, dry, hairless and cool; nail changes", "Brown (hemosiderin) staining; thickened skin"],
            ["Ulcers", "Toes and feet; round, 'punched out'; gangrene possible", "Around the ankle, especially the inner (medial) ankle; shallow and weeping"]
          ] } }
        ]
      },
      {
        id: "s3",
        update: {
          title: "Ready to walk",
          text: [
            "The vascular lab report has arrived, and Dr. Okafor has finished her evaluation: Mr. Hollis is cleared for the walking program on the treadmill. She asks you to run today's session."
          ],
          exhibits: [
            {
              id: "vascular-lab", type: "report", title: "Vascular lab report",
              text: [
                "**Ankle-brachial index at rest:** right 0.68, left 0.96.",
                "**Arterial Doppler:** narrowing of the right superficial femoral artery (in the thigh).",
                "**Plan:** supervised exercise program; continue aspirin and atorvastatin; smoking cessation counseling."
              ]
            }
          ]
        },
        type: "single",
        prompt: "How should today's walking session go?",
        options: [
          { text: "Walk until the calf pain is near its maximum, rest until it eases, then walk again", correct: true, why: "Right — that's the lecture's walking program. Repeated bouts of walking into claudication pain are what improve his walking, so he can go longer with less rest, working toward 30 minutes of continuous walking." },
          { text: "Stop at the first twinge of calf pain and end the session for the day", why: "Stopping at the first twinge and going home gives his legs too little training. The program deliberately walks into near-maximal pain, with rests in between." },
          { text: "Skip walking for now — exercising on narrowed arteries could damage his calf muscle", why: "Rest is not the treatment. A walking program is the most effective treatment for claudication, and it's good for his heart as well." },
          { text: "Walk 30 minutes straight from day one, pushing through the pain without rests", why: "Thirty minutes of continuous walking is the goal, not the starting point. Without rest breaks the pain would become severe and he'd give up; the program builds up with walk–rest bouts." }
        ],
        hints: [
          "The lecture's program doesn't avoid claudication pain — it uses it.",
          "Think intervals — and think about where the program is heading."
        ],
        explain: [
          "**The walking program** (L2 s49): walk until the claudication pain is near maximal, rest until it's relieved, then walk again. Over the weeks the goal is longer walks with less rest — eventually **30 minutes of continuous walking**. After 4–6 weeks, isometric, active range-of-motion and resistive exercises are added.",
          "Supervised programs like his usually meet at least three times a week for 12 weeks or more. Walking into claudication pain trains the leg muscles to use oxygen better and improves blood flow, so the distance he can walk keeps growing.",
          { warn: "Claudication pain is expected in this program — chest pain, unusual breathlessness or dizziness are not. Many people with PVD also have coronary artery disease: stop the session and get the supervising PT for those." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Session one, done",
          text: [
            "Mr. Hollis finished today's walk–rest bouts and his cool-down without chest pain or breathlessness. Before he leaves, you go over Dr. Okafor's education plan with him."
          ],
          vitals: { hr: 80, bp: "144/82", rr: 16, spo2: 96, pain: "0/10" },
          exhibits: [
            {
              id: "session-log", type: "table", title: "Walking session log — week 1, day 1",
              head: ["Bout", "Walked", "Calf pain when he stopped", "Rest"],
              rows: [
                ["1", "4 min", "near maximal", "3 min"],
                ["2", "4 min", "near maximal", "3 min"],
                ["3", "3½ min", "near maximal", "4 min"],
                ["4", "3½ min", "near maximal", "4 min"]
              ],
              note: "Treadmill, level, 2.0 mph. 15 minutes of walking in a 35-minute session, including warm-up and cool-down. Heart rate at the end of each bout 96–100."
            }
          ]
        },
        type: "multi",
        prompt: "Which points belong in his education plan? Select all that apply.",
        options: [
          { text: "Stop smoking", correct: true, why: "Smoking is the strongest risk factor he can change. Quitting slows the disease and helps his walking — the single most important change he can make." },
          { text: "Look at his feet every day and keep the skin clean and moisturized", correct: true, why: "Foot and skin care: with poor circulation (and diabetes), small cuts heal slowly and can turn into ulcers. A daily check catches them early." },
          { text: "Wear well-fitting shoes and socks — never walk barefoot", correct: true, why: "Limb protection: avoid injuries that a poorly supplied foot can't heal well." },
          { text: "Keep his feet warm and avoid cold exposure", correct: true, why: "Cold narrows the already narrowed vessels. The lecture lists avoiding cold as part of risk-factor reduction." },
          { text: "Use a heating pad on his feet at night to boost the circulation", why: "Direct heat is risky on a poorly supplied foot: it raises the tissue's need for oxygen that his arteries can't meet, and burns heal badly. Warm socks, yes; heating pads and hot soaks, no." },
          { text: "Sleep with his legs raised on pillows to help the blood flow", why: "Raising the legs helps veins drain, but it makes it harder for arterial blood to reach the feet — that's why his sole turns pale when raised. With arterial disease, keep the legs level." },
          { text: "Rest his legs between sessions to save the arteries", why: "He should walk on most days, not only at sessions. Inactivity is a risk factor, and walking is the treatment." }
        ],
        hints: [
          "The lecture's education list for PVD: the disease, limb protection, foot and skin care, and risk-factor reduction.",
          "Remember what happened to the color of his foot when the leg was raised."
        ],
        explain: [
          "**Patient education is paramount** in PVD (L2 s49): the disease process, limb protection, foot and skin care, and risk-factor reduction — above all **stopping smoking** and **avoiding cold**.",
          "With diabetes as well, his feet need extra care: a daily look at both feet (a mirror helps), shoes that fit, no bare feet, and a podiatrist for nails and calluses. And he should keep walking on the days between sessions.",
          { warn: "Teach him to report pain at rest or at night, a sore that won't heal, or a foot that turns pale, blue or black. A **sudden** cold, pale, painful leg — with numbness or weakness — is an emergency: call 911." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Intermittent claudication from peripheral vascular disease of the right leg",
      summary: [
        "Mr. Hollis's cramping right-calf pain came on at a predictable distance and eased after a few minutes of standing still — **intermittent claudication**. A narrowed artery in his right thigh couldn't meet his working calf muscle's demand, and his exam showed the classic arterial signs.",
        "The treatment isn't rest but a walking program — walk to near-maximal pain, rest, repeat, building toward 30 minutes of continuous walking — plus education: stop smoking, inspect and protect the feet, and avoid cold."
      ],
      takeaways: [
        "Intermittent claudication: cramping calf pain with walking, relieved by standing still — often the first symptom of PVD.",
        "Arterial signs: cool, pale, shiny, hairless skin; weak or absent pulses; pallor on elevation and dependent rubor.",
        "Walking program: walk until the pain is near maximal, rest until it eases, repeat — building toward 30 minutes of continuous walking.",
        "Educate: stop smoking, daily foot and skin care, protective shoes, avoid cold. No heating pads, and don't raise the legs.",
        "Report rest pain or a sore that won't heal; a sudden cold, pale, painful leg is a 911 emergency."
      ],
      sources: ["L1 s38 · Intermittent claudication", "L2 s45–49 · Peripheral vascular disease", "L2 s65 · Chronic arterial insufficiency"]
    },
    casebook: ["pvd", "abi", "atherosclerosis", "antiplatelets", "statins"]
  });

  // ---------------------------------------------------------------------------------------
  // 6.2 Cold Fingers — Raynaud's phenomenon and a calcium channel blocker (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-cold-fingers",
    unit: "vessels",
    order: 2,
    difficulty: "easy",
    title: "Cold Fingers",
    teaser: "Her fingers turn white, then blue, every time she reaches into the freezer.",
    patient: { name: "Priya Nair", age: 31, sex: "F" },
    setting: "Outpatient hand therapy clinic",
    file: {
      referral: [
        "**Referral:** systemic sclerosis (scleroderma) with stiffness of both hands — range-of-motion and hand-function program. From her rheumatologist.",
        { quote: "The stiffness I can live with. It's my fingers going dead white that scares me — then they turn blue, and when they come back they throb like crazy.", by: "Ms. Nair" }
      ],
      history: {
        list: [
          "**Scleroderma (systemic sclerosis)** diagnosed a year ago: tight, thickened skin on her fingers and hands, and heartburn.",
          "**Color changes:** several times a week, one or more fingers turn white, then blue, and go cold and numb — in the freezer aisle, holding an iced coffee, walking to work on cold mornings, and on stressful days. Each episode lasts 10–20 minutes; as the fingers warm up they turn red, tingle and throb. Her toes do it now and then.",
          "**Work:** dental hygienist. Her fingers often blanch after long sessions with the ultrasonic scaler, a vibrating cleaning tool.",
          "**Social:** smokes a few cigarettes a week, mostly when she's stressed.",
          "Started **nifedipine** two weeks ago for the color changes."
        ]
      },
      medications: [
        { name: "Nifedipine extended-release (Procardia XL)", dose: "30 mg once a day — started 2 weeks ago", "class": "Calcium channel blocker" },
        { name: "Omeprazole", dose: "20 mg once a day", "class": "Proton pump inhibitor (acid reducer), for heartburn" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 76, bp: "112/72", rr: 14, spo2: 98, temp: "98.2 °F", pain: "2/10 (stiff fingers)" },
      exam: {
        list: [
          "**Hands:** the skin over her fingers is tight, shiny and thickened; she can't fully straighten her fingers or make a full fist.",
          "**Right now** her fingers are warm and pink, with normal capillary refill; radial pulses are strong at both wrists.",
          "**Fingertips:** skin intact — no ulcers or cracks.",
          "Light-touch sensation normal in all fingers."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which condition best explains the color changes in Ms. Nair's fingers?",
        options: [
          { text: "Raynaud's phenomenon", correct: true, why: "Yes: episodes of white, then blue, cold and numb fingers set off by cold and stress, turning red and throbbing as they rewarm — in a young woman with scleroderma. Because it comes with another disease, it's called Raynaud's phenomenon (secondary Raynaud's)." },
          { text: "Buerger's disease", why: "Buerger's mainly affects young men who use tobacco; the fingers stay cold and bluish, with ulcers and missing pulses. Her fingers recover completely between episodes, and her pulses are strong." },
          { text: "Peripheral arterial disease from atherosclerosis", why: "Atherosclerotic PAD mostly affects the legs of older adults, causing claudication and weak pulses all the time. Her problem comes and goes, in the fingers of a 31-year-old." },
          { text: "Carpal tunnel syndrome", why: "Carpal tunnel squeezes the median nerve at the wrist: numbness and tingling of the thumb, index and middle fingers, often at night — but no white-blue-red color changes with cold." }
        ],
        hints: [
          "Look at the order of the colors, what sets the episodes off, and what her fingers are like in between.",
          "Her scleroderma is a clue: which vascular condition often comes with connective-tissue diseases?"
        ],
        explain: [
          "**Raynaud's** is an exaggerated spasm of the small arteries of the fingers (sometimes the toes) in response to **cold** or **emotional stress**. The fingers turn **white** (blood flow stops), then **blue** (the trapped blood loses its oxygen), then **red** as blood rushes back — often with throbbing and tingling.",
          "**Raynaud's disease** (primary) has no known cause. **Raynaud's phenomenon** (secondary) happens with another condition — most often a connective-tissue disease such as scleroderma (systemic sclerosis) or rheumatoid arthritis, and it can appear before that disease is diagnosed. It affects women more than men, especially between ages 20 and 49 (L2 s55).",
          "It's usually not serious, but repeated attacks — especially with scleroderma — can damage the vessels and cause painful ulcers of the fingertips."
        ]
      },
      {
        id: "s2",
        type: "multi",
        prompt: "Which of these can set off her attacks? Select all that apply.",
        options: [
          { text: "Cold — the freezer aisle, iced drinks, cold mornings", correct: true, why: "Cold is the classic trigger: people with Raynaud's are acutely sensitive to it." },
          { text: "Stressful days at work", correct: true, why: "Emotional stress sets off the same spasm through the sympathetic nervous system." },
          { text: "Her occasional cigarettes", correct: true, why: "Nicotine narrows blood vessels. Smoking is a listed trigger, and quitting is part of treatment." },
          { text: "Long sessions with the ultrasonic scaler", correct: true, why: "Working with vibrating tools is a listed trigger, and years of vibration can damage the finger vessels." },
          { text: "Her nifedipine", why: "Nifedipine is part of her treatment: it relaxes and widens the vessels, so attacks become less frequent and less severe." },
          { text: "Washing dishes in warm water", why: "Warmth eases an attack — running warm (not hot) water over the fingers is one way to end one." }
        ],
        hints: [
          "Read her work and social history, not just what happens outdoors.",
          "One option in this list is part of her treatment, not a trigger."
        ],
        explain: [
          "The lecture's triggers (L2 s56): **cold**, **emotional stress**, **smoking** and **working with vibrating machinery** — she has all four.",
          "Teach her to keep her whole body warm, not just her hands (layers, a hat, gloves or mittens, insulated cups for cold drinks); to stop smoking; to find ways to manage stress; and to take breaks from the scaler and keep her hands warm at work.",
          { tip: "During an attack: get somewhere warm, swing the arms or tuck the hands into the armpits, or run warm — not hot — water over the fingers." }
        ]
      },
      {
        id: "s3",
        type: "single",
        prompt: "Dr. Okafor's plan of care includes 'modalities as needed to prepare the hands for exercise'. Which of these should you avoid for Ms. Nair?",
        options: [
          { text: "An ice pack on her hands after exercise", correct: true, why: "Right — no cold packs for anyone with Raynaud's. Cold is exactly what sets off the spasm, and a cold pack could trigger a severe attack." },
          { text: "A warm paraffin dip before her stretches", why: "Gentle warmth is welcome: warm hands loosen up better and her vessels relax. Check her skin and sensation first, as with any heat." },
          { text: "Exercise in the therapy pool, heated to body temperature", why: "Aquatic therapy is possible as long as the pool is at least body temperature. A cooler pool could set off an attack." },
          { text: "Active and gentle passive range-of-motion exercises", why: "Range-of-motion exercise is the heart of her program for scleroderma stiffness." }
        ],
        hints: [
          "Which of these would do to her fingers exactly what the freezer aisle does?"
        ],
        explain: [
          "**PT for Raynaud's** (L2 s56): **no cold packs** — the reaction to cold is severe. **Aquatic therapy** only if the pool is heated to at least body temperature. **No whirlpools at non-thermal (cool or neutral) temperatures.**",
          { tip: "Keep the treatment room and equipment warm. A cold room, a cold plinth or a fan blowing on her hands can set off an attack mid-session." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Twenty minutes later…",
          text: [
            "After her hand exercises, Ms. Nair stands up from the treatment table — and grabs its edge.",
            { quote: "Whoa — head rush. That keeps happening since I started the new pill. I've had a few headaches, too, and my ankles are puffy by the evening.", by: "Ms. Nair" },
            "Her blood pressure, taken as she stood: 94/62, pulse 96. She sits back down and the dizziness passes within a minute. Both ankles show mild (1+) pitting edema — no redness, warmth or calf tenderness — and she's breathing easily."
          ],
          vitals: { hr: 96, bp: "94/62", rr: 14 }
        },
        type: "single",
        prompt: "What best explains her light-headedness, headaches and puffy ankles?",
        options: [
          { text: "Side effects of her nifedipine", correct: true, why: "Yes: calcium channel blockers widen the arteries — that's how they help her fingers — but that also lowers blood pressure (dizziness on standing, headaches) and lets fluid collect in the ankles (peripheral edema)." },
          { text: "A Raynaud's attack spreading from her fingers to her legs", why: "Raynaud's changes the color of the fingers and toes; it doesn't cause dizziness, headaches or ankle swelling." },
          { text: "Blood clots in both legs (deep vein thrombosis)", why: "A DVT usually affects one leg, with pain, warmth, redness and tenderness. Hers is mild, painless swelling of both ankles that began with a new medicine." },
          { text: "Heart failure from her scleroderma — call 911 now", why: "Scleroderma can affect the heart and lungs, but she isn't breathless, and all three symptoms began with a new drug known for causing them. This needs a report to Dr. Okafor, not 911." }
        ],
        hints: [
          "When did these symptoms start?",
          "Look up her new medicine's class in the Casebook: what are its side effects?"
        ],
        explain: [
          "**Calcium channel blockers** (nifedipine, diltiazem) relax vascular smooth muscle. Side effects: **dizziness**, **headache**, **hypotension** and **peripheral edema** (L1 s57). Her pressure fell by 18/10 mmHg as she stood, with symptoms. The 10-point diastolic fall meets the definition of orthostatic hypotension: a fall of at least 20 systolic **or** 10 diastolic within 3 minutes of standing.",
          "**What you do:** keep her seated until the dizziness passes, recheck her blood pressure, and teach her to get up in stages — sit on the edge of the table first and pump her ankles a few times before standing.",
          "**Report** the dizziness and the new ankle swelling to Dr. Okafor, who will let her physician know. Never tell a patient to stop or change a medication.",
          { warn: "In anyone taking a calcium channel blocker, watch for signs of heart failure: worsening swelling, shortness of breath or rapid weight gain." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Raynaud's phenomenon secondary to scleroderma, with side effects of nifedipine (a calcium channel blocker)",
      summary: [
        "Ms. Nair's fingers turned white, then blue, then red with cold, stress, smoking and a vibrating tool — **Raynaud's phenomenon**, secondary to her scleroderma: the small arteries of her fingers go into spasm, then recover.",
        "In therapy: no cold packs, pools at least at body temperature, no non-thermal whirlpools — and watch for the side effects of her nifedipine, which caused her dizziness on standing, her headaches and her ankle swelling."
      ],
      takeaways: [
        "Raynaud's: white → blue → red fingers with cold or stress; mostly women aged 20–49; often with scleroderma or rheumatoid arthritis.",
        "Triggers: cold, emotional stress, smoking and vibrating machinery.",
        "No cold packs; aquatic therapy only in a pool at least at body temperature; no whirlpools at non-thermal temperatures.",
        "Calcium channel blockers widen vessels: watch for dizziness, orthostatic hypotension, headache and ankle edema — report them, and never change the medication."
      ],
      sources: ["L2 s55–56 · Raynaud's disease or syndrome", "L1 s57 · Calcium channel blocker agents"]
    },
    casebook: ["raynauds", "calcium-channel-blockers", "orthostatic-hypotension"]
  });

  // ---------------------------------------------------------------------------------------
  // 6.3 The Index Case — calculating and interpreting the ankle-brachial index (medium)
  // Right ABI = 90 ÷ 140 = 0.64; left ABI = 122 ÷ 140 = 0.87. The dorsalis pedis pressures
  // (76 and 110) are chosen so that every predictable mistake gives a different value.
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-the-index-case",
    unit: "vessels",
    order: 3,
    difficulty: "medium",
    title: "The Index Case",
    teaser: "Two arm pressures, four ankle pressures — and one number for each leg.",
    patient: { name: "Ingrid Larsen", age: 71, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** cramping calf pain with walking, right worse than left. Please measure ankle-brachial indexes and start an exercise program if appropriate. From her primary care physician.",
        { quote: "My right calf gives out after about three blocks. The left one lasts a bit longer. If I stand still for a few minutes, I can carry on.", by: "Mrs. Larsen" }
      ],
      history: {
        list: [
          "**Past 6 months:** cramping in the right calf after about 3 blocks, and in the left after about 5. Both ease within 2–3 minutes of standing still. No pain at rest or at night; no sores on her feet.",
          "**Past medical history:** high blood pressure and high cholesterol. **No diabetes**, and her kidney function is normal.",
          "**Social:** retired librarian. Smoked for 40 years; quit 5 years ago."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" },
        { name: "Clopidogrel", dose: "75 mg once a day" }
      ],
      allergies: "Penicillin (rash)",
      vitals: { hr: 72, bp: "138/80", rr: 16, spo2: 97, temp: "98.1 °F", pain: "0/10 at rest" },
      exam: {
        list: [
          "Both feet cool, the right more than the left; sparse hair on both shins; skin intact; no swelling.",
          "**Pulses:** femoral pulses normal on both sides. Right posterior tibial weak and right dorsalis pedis barely felt; left foot pulses weak.",
          "**Raising the leg:** her right sole pales within a minute; when she sits up, the color takes about 25 seconds to return.",
          "Sensation normal in both feet."
        ]
      },
      tests: [
        {
          id: "abi-pressures", type: "table", title: "Doppler systolic pressures (mmHg)",
          head: ["Site", "Right", "Left"],
          rows: [
            ["Brachial (arm)", 132, 140],
            ["Posterior tibial (ankle)", 90, 122],
            ["Dorsalis pedis (ankle)", 76, 110]
          ],
          note: "Measured by Dr. Okafor with a blood-pressure cuff and a handheld Doppler, after Mrs. Larsen had rested lying down for 10 minutes."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Dr. Okafor hands you the pressures and asks you to work out the indexes. Which pressures go into the **right-leg** ABI?",
        options: [
          { text: "The higher right-ankle pressure ÷ the higher of the two arm pressures", correct: true, why: "Yes: for each leg, use that leg's higher ankle pressure (posterior tibial or dorsalis pedis) over the higher of the two brachial pressures — whichever arm it comes from." },
          { text: "The higher right-ankle pressure ÷ the right-arm pressure", why: "Arm and leg aren't matched by side. Use the higher arm: a lower reading in one arm can come from a narrowed artery in that arm, which would make the leg look healthier than it is." },
          { text: "The lower right-ankle pressure ÷ the higher arm pressure", why: "The standard method uses the higher of the two ankle pressures in each leg. Using the lower one overstates the disease." },
          { text: "The higher arm pressure ÷ the higher right-ankle pressure", why: "That's upside down. The ankle pressure goes on top: healthy legs give about 1.0–1.3, and narrowed arteries push the index below 1." },
          { text: "The average of both ankle pressures ÷ the average of both arm pressures", why: "Averages blur the picture. Each leg gets its own index — its higher ankle pressure over the higher arm pressure." }
        ],
        hints: [
          "Each leg gets its own ABI — but both legs share the same arm number.",
          "A narrowed artery in one arm would give a falsely low reading there. Which arm reading is the better estimate of the pressure in the aorta?"
        ],
        explain: [
          "**ABI = the higher of that leg's two ankle pressures ÷ the higher of the two arm pressures** (L2 s50). Both are systolic pressures, taken with a cuff and a handheld Doppler after the patient has rested lying down (L2 s48).",
          "Why the higher arm? It's the best estimate of the pressure in the aorta; a lower reading in one arm may come from a narrowed artery in that arm. Why each leg separately? PVD is often worse on one side — as hers is."
        ]
      },
      {
        id: "s2",
        type: "numeric",
        prompt: "Calculate Mrs. Larsen's **right** ABI. Round to two decimal places.",
        answer: 0.64,
        tolerance: 0.01,
        traps: [
          { value: 0.68, tolerance: 0.01, why: "That's 90 ÷ 132 — the right arm. Use the higher of the two arm pressures (140), whichever side it's on." },
          { value: 0.54, tolerance: 0.01, why: "That's 76 ÷ 140 — the lower ankle pressure. Use the higher right-ankle pressure: the posterior tibial, 90." },
          { value: 0.58, tolerance: 0.01, why: "That's 76 ÷ 132 — the lower ankle pressure over the lower arm pressure. Use the higher of each: 90 ÷ 140." },
          { value: 0.61, tolerance: 0.01, why: "That looks like averages (83 ÷ 136). Don't average: use the higher right-ankle pressure over the higher arm pressure." },
          { value: 1.56, tolerance: 0.02, why: "That's upside down (140 ÷ 90). The ankle pressure goes on top." }
        ],
        hints: [
          "Pick the higher of the two right-ankle readings and the higher of the two arm readings.",
          "Divide, then round to two decimal places."
        ],
        explain: [
          "**Right ABI = 90 ÷ 140 = 0.64.** At the right ankle the posterior tibial (90) beats the dorsalis pedis (76); between the arms, the left (140) beats the right (132).",
          "Below 1.0 means the pressure at her right ankle is lower than in her arm: blood is losing pressure across a narrowing somewhere in the leg's arteries."
        ]
      },
      {
        id: "s3",
        type: "numeric",
        prompt: "Now calculate her **left** ABI. Round to two decimal places.",
        answer: 0.87,
        tolerance: 0.01,
        traps: [
          { value: 0.92, tolerance: 0.01, why: "That's 122 ÷ 132 — the right arm. The higher arm pressure is still 140, for both legs." },
          { value: 0.79, tolerance: 0.01, why: "That's 110 ÷ 140 — the lower (dorsalis pedis) pressure. Use the higher left-ankle pressure, 122." },
          { value: 0.83, tolerance: 0.01, why: "That's 110 ÷ 132 — the lower ankle and the lower arm pressure. Use the higher of each: 122 ÷ 140." },
          { value: 0.85, tolerance: 0.005, why: "That looks like averages (116 ÷ 136). Use the higher left-ankle pressure over the higher arm pressure." },
          { value: 1.15, tolerance: 0.02, why: "That's upside down (140 ÷ 122). Ankle over arm." }
        ],
        hints: [
          "Same arm pressure as before — this time with the left ankle."
        ],
        explain: [
          "**Left ABI = 122 ÷ 140 = 0.87.** Same denominator: the higher arm pressure is used for both legs.",
          "Her left leg has peripheral arterial disease too, just less of it — which is why her left calf holds out two blocks longer than the right."
        ]
      },
      {
        id: "s4",
        type: "single",
        keepOrder: true,
        prompt: "Using the lecture's table, how do you interpret her **right** ABI of 0.64?",
        options: [
          { text: "Above 1.30 — non-compressible (calcified) vessel", why: "That band is for readings above 1.30, when stiff arteries can't be squeezed shut. Hers is well below 1." },
          { text: "1.00–1.29 — normal", why: "Normally the ankle pressure equals or slightly exceeds the arm pressure, giving 1.00–1.29. Hers is much lower." },
          { text: "0.91–0.99 — borderline", why: "Borderline is 0.91–0.99. At 0.64 she's clearly below it." },
          { text: "0.41–0.90 — mild to moderate PAD", correct: true, why: "Right: 0.64 falls in the 0.41–0.90 band — mild to moderate peripheral arterial disease, with claudication that limits walking, just as she describes." },
          { text: "0.40 or less — severe PAD", why: "Severe PAD is 0.40 or less, with claudication early on and pain at rest. She has neither rest pain nor wounds." }
        ],
        hints: [
          "The ABI table is in the Casebook's ABI entry."
        ],
        explain: [
          { table: { head: ["ABI", "Meaning", "Claudication"], rows: [
            ["above 1.30", "Non-compressible (calcified) vessel — unreliable", "may be present"],
            ["1.00–1.29", "Normal", "none"],
            ["0.91–0.99", "Borderline", "none"],
            ["0.41–0.90", "Mild to moderate peripheral arterial disease (PAD)", "present, limiting"],
            ["0.00–0.40", "Severe PAD", "early, limiting; rest pain"]
          ] } },
          "Both her legs fall in the mild-to-moderate band — the right (0.64) more affected than the left (0.87), matching which calf gives out first. She's a good candidate for the walking program.",
          "An ABI of 0.40 or less, pain at rest or at night, or a wound that won't heal would mean severe disease — report it to the supervising PT promptly."
        ]
      },
      {
        id: "s5",
        update: {
          title: "A question from Dr. Okafor",
          text: [
            { quote: "Nicely done. Next week you'll help me with Mr. Osei — diabetes for 25 years, and he's on dialysis. Suppose his ABI comes back at 1.48. What would that tell us?", by: "Dr. Okafor" }
          ]
        },
        type: "single",
        prompt: "What would an ABI of 1.48 most likely mean?",
        options: [
          { text: "Stiff, calcified arteries — a falsely high, unreliable reading", correct: true, why: "Yes: in long-standing diabetes and kidney failure, calcium stiffens the artery walls. The cuff can't squeeze them shut, so the ankle pressure — and the ABI — read falsely high, and real disease can hide behind the number." },
          { text: "Better-than-normal circulation — a high ABI means strong blood flow to the feet", why: "A high ABI isn't extra-good circulation. Above 1.30 the lecture's table calls the vessel non-compressible: the number can't be trusted." },
          { text: "Normal circulation — no peripheral arterial disease", why: "Normal is 1.00–1.29. Above that the reading is unreliable, and he could have significant PAD hidden behind stiff arteries." },
          { text: "Severe peripheral arterial disease", why: "Severe PAD gives a low ABI (0.40 or less). A high value means the measurement itself is unreliable — it neither confirms nor rules out disease." }
        ],
        hints: [
          "What happens when the cuff can't squeeze an artery shut?",
          "Look at the top row of the ABI table."
        ],
        explain: [
          "**Above 1.30 = non-compressible vessel** (L2 s50). Calcium in the artery wall — common in long-standing diabetes and kidney failure — stops the cuff from closing the artery, so the ankle pressure reads falsely high.",
          "A high ABI can hide real disease, so other tests are used instead: arterial **Doppler** waveforms, **transcutaneous oximetry**, and **toe pressures** (toe arteries are much less often calcified).",
          { tip: "The lecture's table uses 1.30 as the cut-off; many vascular labs and current US guidelines use 1.40. Either way, a reading like 1.48 can't be trusted." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Peripheral arterial disease of both legs, worse on the right (ABI right 0.64, left 0.87)",
      summary: [
        "Mrs. Larsen's calf claudication, worse on the right, matched her numbers: right ABI 90 ÷ 140 = **0.64**, left 122 ÷ 140 = **0.87** — both in the 0.41–0.90 band of mild to moderate peripheral arterial disease.",
        "The method matters: each leg's higher ankle pressure over the higher of the two arm pressures. And a high ABI isn't good news: above 1.30 the arteries are too stiff to compress, and the reading can't be trusted."
      ],
      takeaways: [
        "ABI = each leg's higher ankle pressure (posterior tibial or dorsalis pedis) ÷ the higher of the two brachial pressures.",
        "The lecture's table: above 1.30 non-compressible · 1.00–1.29 normal · 0.91–0.99 borderline · 0.41–0.90 mild to moderate PAD · 0.40 or less severe PAD.",
        "The lower the ABI, the worse the disease — and the sooner claudication starts.",
        "A falsely high ABI from calcified arteries (common in diabetes and kidney disease) can hide PAD; Doppler, transcutaneous oximetry or toe pressures are needed instead."
      ],
      sources: ["L2 s48–50 · PVD tests and the ankle-brachial index", "L2 s45–47 · Peripheral vascular disease"]
    },
    casebook: ["abi", "pvd", "diagnostic-tests"]
  });

  // ---------------------------------------------------------------------------------------
  // 6.4 The Young Smoker's Fingertips — Buerger's disease (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-young-smokers-fingertips",
    unit: "vessels",
    order: 4,
    difficulty: "medium",
    title: "The Young Smoker's Fingertips",
    teaser: "Sent in for 'plantar fasciitis' — but his fingertips are cold, blue and sore.",
    patient: { name: "Tyler Brooks", age: 29, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right arch pain with walking — probable plantar fasciitis; evaluate and treat. From an urgent care clinic.",
        { quote: "My right arch cramps up after I've been walking the job site for ten minutes or so. And my fingers are freezing all the time now — look at this one.", by: "Mr. Brooks" }
      ],
      history: {
        list: [
          "**Past 4 months:** cramping pain in the right arch after about 10 minutes of walking at work; it eases 2–3 minutes after he stops. No pain with his first steps in the morning.",
          "**Hands and feet:** fingertips and toes cold, bluish and tingling most of the time, even indoors; his fingertips ache at night. A sore on the tip of his right index finger for 3 weeks — painful, and not healing.",
          "**Last month:** a tender, red, cord-like streak along a vein on his left calf that faded on its own after about a week.",
          "**Last week:** burned two fingertips on a coffee pot without realizing how hot it was.",
          "**Past medical history:** none. No diabetes; blood pressure and cholesterol normal at a work physical this spring.",
          "**Social:** framing carpenter. Smokes 1½ packs a day since age 15, and chews tobacco on job sites where he can't smoke. Two or three beers on weekends.",
          "**Family:** no early heart or vascular disease."
        ]
      },
      medications: [
        { name: "Ibuprofen", dose: "400 mg as needed for foot pain" }
      ],
      allergies: "No known drug allergies",
      vitals: {
        hr: 84, bp: "126/78", rr: 14, spo2: 97, temp: "98.4 °F", pain: "4/10 (right index fingertip)",
        other: [{ label: "SpO₂ sensor", value: "earlobe — no reading from his fingers" }]
      },
      exam: {
        list: [
          "**Hands:** the fingers of both hands are cool and bluish, the right more than the left; the color doesn't change after 15 minutes in the warm clinic. Capillary refill in the right fingertips about 4 seconds.",
          "**Right index fingertip:** a 4 mm painful ulcer with a dry, dark base and pale edges.",
          "**Pulses:** radial pulses strong at both wrists; the right ulnar pulse can't be felt. Femoral and popliteal pulses strong on both sides. Right dorsalis pedis and posterior tibial pulses absent; left ones weak.",
          "**Sensation:** light touch slightly reduced at the fingertips and toes, and he can't reliably tell a warm test tube from a cool one there. Normal elsewhere.",
          "**Feet:** toes cool and bluish. No tenderness at the heel or along the plantar fascia.",
          "**Left calf:** a faint brown line along the vein where the tender streak was; no swelling, warmth or tenderness."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which condition best explains Mr. Brooks's hands and feet?",
        options: [
          { text: "Buerger's disease (thromboangiitis obliterans)", correct: true, why: "Yes: a young man who smokes and chews tobacco, with cold, bluish, painful fingertips and toes, a fingertip ulcer, poor temperature sensation, missing pulses at the wrist and ankles, and an inflamed vein — the picture of Buerger's disease." },
          { text: "Raynaud's phenomenon", why: "Raynaud's comes in episodes set off by cold or stress, the fingers recover fully when warm, and it mostly affects women. His fingers stay cold and blue in a warm room, his pulses are missing, and he has an ulcer." },
          { text: "Atherosclerotic peripheral arterial disease (PAD)", why: "Plaque-driven PAD usually starts after 50, with diabetes, high blood pressure or high cholesterol, and narrows the larger arteries of the legs. It rarely reaches the hands, and it doesn't inflame veins." },
          { text: "Deep vein thrombosis", why: "A DVT swells one leg with warmth, redness and pain. It doesn't turn fingertips blue or cause fingertip ulcers — and the streak on his calf was along a superficial vein, with no swelling." },
          { text: "Plantar fasciitis, as the referral suggests", why: "Plantar fasciitis hurts at the heel, worst with the first steps in the morning, and the fascia is tender. His arch pain comes with walking and eases with rest — claudication — and it can't explain blue fingertips or missing pulses." }
        ],
        hints: [
          "Look at who he is — age, sex, habits — and where his symptoms start.",
          "Two vascular conditions in the lecture affect the fingers. Compare their Casebook entries."
        ],
        explain: [
          "**Buerger's disease (thromboangiitis obliterans)** is a chronic, inflammatory disease that blocks the small and medium arteries — and the veins — of the arms and legs, especially the hands and feet (L2 s52). It occurs mostly in young adults, largely men, who use tobacco, smoked or chewed. It begins distally and progresses proximally.",
          "The signs: pain or paresthesias, cold, cyanotic fingers and toes, diminished temperature sensation, fatigue, and a risk of ulcers and gangrene. Because the blockages are in the foot itself, his claudication is felt in the **arch** — which is why it was mistaken for plantar fasciitis.",
          { tip: "A referral diagnosis is a starting point, not a verdict. When the findings don't fit, tell the supervising PT — Dr. Okafor calls his physician the same day." }
        ]
      },
      {
        id: "s2",
        type: "multi",
        prompt: "Which findings point to Buerger's disease **rather than** atherosclerotic PAD? Select all that apply.",
        options: [
          { text: "He is 29 years old", correct: true, why: "Buerger's starts in young adults, usually before 45. Atherosclerotic PAD is mostly a disease of people over 50." },
          { text: "His hands are affected as well as his feet", correct: true, why: "Buerger's involves the arms as well as the legs. Atherosclerotic PAD rarely reaches the hands." },
          { text: "Problems start in his fingers and toes, while his groin and knee pulses are strong", correct: true, why: "Buerger's begins distally, in small arteries, and moves proximally, so the larger arteries higher up are spared at first. Atherosclerotic PAD usually narrows those larger arteries first." },
          { text: "A tender, red cord along a vein in his calf last month", correct: true, why: "Inflamed superficial veins (thrombophlebitis) that come and go are typical of Buerger's, which attacks veins as well as arteries. Plaque doesn't do that." },
          { text: "He smokes 1½ packs a day", why: "Smoking is a major risk factor for atherosclerotic PAD too, so it doesn't tell the two apart — though it's at the heart of Buerger's." },
          { text: "Foot pain with walking that eases within minutes of rest", why: "That's claudication, and it happens in both conditions." },
          { text: "No pulses at his right ankle", why: "Missing ankle pulses happen in both conditions." }
        ],
        hints: [
          "For each finding, ask: would I also expect this in a 70-year-old with plaque in his leg arteries?"
        ],
        explain: [
          "Buerger's and atherosclerotic PAD share **smoking**, **claudication** and **weak or missing pulses**, so those don't separate them. What does: **young age**, **hands as well as feet**, disease that **starts distally** while the larger arteries are normal, and **inflamed veins**.",
          { table: { head: ["Feature","Buerger's disease", "Atherosclerotic PAD", "Raynaud's"], rows: [
            ["Who", "Young adults, mostly men, who use tobacco", "Mostly over 50; smoking, diabetes, high cholesterol, hypertension", "Mostly women aged 20–49; often with scleroderma or rheumatoid arthritis"],
            ["Vessels", "Small and medium arteries and veins of the hands and feet", "Medium and large arteries, mostly in the legs", "Spasm of the small arteries of the fingers (and toes)"],
            ["Course", "Constant; starts in the fingers and toes and moves proximally", "Slowly progressive", "Comes in attacks with cold or stress; normal in between"],
            ["Danger", "Ulcers, gangrene, amputation", "Rest pain, ulcers, gangrene; heart attack and stroke", "Usually not serious; fingertip ulcers possible"]
          ] } }
        ]
      },
      {
        id: "s3",
        update: {
          title: "Two weeks later",
          text: [
            "Dr. Okafor called his physician the same day, and Mr. Brooks has now seen a vascular surgeon. Her note is in the file."
          ],
          exhibits: [
            {
              id: "vascular-note", type: "report", title: "Vascular surgery consultation",
              text: [
                "**Arteriogram:** arteries smooth and normal down to the elbows and knees. Many short blocked segments in the small arteries of both hands, both feet and the lower legs, bridged by corkscrew-shaped collateral vessels. No atherosclerotic plaque.",
                "**Blood tests:** no diabetes, clotting disorder or autoimmune disease.",
                "**Impression:** thromboangiitis obliterans (Buerger's disease).",
                "**Plan:** tobacco cessation; wound care for the right index fingertip; protect the hands and feet from cold, heat and injury; walking program with physical therapy; review in 4 weeks."
              ]
            }
          ]
        },
        type: "single",
        prompt: "If Mr. Brooks keeps using tobacco, how is his disease most likely to progress?",
        options: [
          { text: "Upward from his fingers and toes, with more ulcers and gangrene", correct: true, why: "Yes: Buerger's begins distally and progresses proximally. More vessels close, ulcers deepen, and tissue can die — fingertips or toes may be lost." },
          { text: "Outward from the large arteries near his heart toward his fingers", why: "That's backwards. Buerger's starts in the smallest, most distal vessels — his arteriogram shows normal large arteries — and moves toward the trunk." },
          { text: "It burns out by middle age, even if he keeps smoking", why: "Buerger's stays active as long as tobacco use continues. It settles down when tobacco stops." },
          { text: "It turns into a deep vein thrombosis, then a pulmonary embolism", why: "Buerger's inflames superficial veins, but its main danger is to the fingers and toes: ulcers, gangrene and amputation." },
          { text: "It changes into Raynaud's, which is harmless", why: "Buerger's doesn't turn into Raynaud's. People with Buerger's may have Raynaud-like color changes too, but the disease itself keeps blocking vessels." }
        ],
        hints: [
          "The lecture says where Buerger's begins and which way it travels.",
          "Think about his fingertip ulcer: what happens to tissue that loses its blood supply for good?"
        ],
        explain: [
          "Buerger's **begins distally and progresses proximally** in both the arms and the legs (L2 s52). As more small arteries close, ulcers deepen and tissue dies (**gangrene**). A dead fingertip or toe can blacken and separate on its own — **autoamputation** (L2 s53) — or need surgical amputation.",
          "Continued tobacco use keeps the disease active. Stopping all tobacco is the only thing proven to halt it."
        ]
      },
      {
        id: "s4",
        update: {
          title: "At his next visit…",
          text: [
            { quote: "The surgeon says I have to quit. I'm down to half a pack, and on the site I just chew instead. That counts, right?", by: "Mr. Brooks" }
          ]
        },
        type: "single",
        prompt: "What matters most for saving his fingers and toes?",
        options: [
          { text: "Stopping every form of tobacco, completely and for good", correct: true, why: "Yes. Stopping all tobacco is essential (L2 s52–53): it's the only treatment proven to stop Buerger's from progressing. Cutting down, or switching to chewing tobacco, keeps the disease active." },
          { text: "Cutting down to a few cigarettes a day", why: "Even a few cigarettes a day can keep the disease active. For Buerger's, the target is zero." },
          { text: "Switching to chewing tobacco only", why: "Chewing tobacco is still tobacco, and it's linked to Buerger's too. Every form has to stop." },
          { text: "Bypass surgery to reroute blood around the blockages", why: "Bypass is rarely possible — the blocked arteries are small and far out in the hands and feet — and no procedure can keep up while he keeps using tobacco." },
          { text: "Daily walking to grow new blood vessels, so he can keep smoking", why: "Walking helps his claudication, but nothing replaces quitting: while he uses tobacco, the disease keeps closing new vessels." }
        ],
        hints: [
          "Which item in his history drives this disease — and how much of it is safe?"
        ],
        explain: [
          "**Stopping all tobacco is essential** (L2 s52–53). People with Buerger's who quit completely usually stop the disease from progressing and are far less likely to need an amputation. Those who keep using tobacco — even a little, smoked or chewed — often lose fingers or toes.",
          "**Within PTA scope:** encourage him at every visit, share quit resources (such as the national quitline, 1-800-QUIT-NOW), and tell Dr. Okafor about his tobacco use so his physician can help. Nicotine itself may keep the disease active, so quit aids are his physician's choice — nicotine patches and gum are often avoided."
        ]
      },
      {
        id: "s5",
        update: {
          title: "A cold snap",
          text: [
            "It's 28 °F on the job site this week.",
            { quote: "My fingers ache like crazy in the cold. I'm thinking I'll warm them over the propane heater at work, and soak my feet in hot water at night. Good idea?", by: "Mr. Brooks" }
          ]
        },
        type: "single",
        prompt: "What's the safest advice for his hands and feet?",
        options: [
          { text: "Keep them warm with gloves and wool socks — no direct heat or cold", correct: true, why: "Right: protect his hands and feet from cold with loose, warm layers — and from heat, because he can't feel temperature well and his tissue can't meet the extra oxygen demand that heat creates." },
          { text: "Warm his hands over the propane heater until they feel warm", why: "He can't reliably feel heat in his fingertips — he already burned them on a coffee pot. By the time they 'feel warm' they may be burning, and burns on poorly supplied skin heal badly." },
          { text: "Soak his feet in hot water each night to open up the arteries", why: "Hot water can burn skin that can't sense temperature, and heat raises the tissue's need for oxygen that his blocked arteries can't deliver." },
          { text: "Ice packs on the fingertip ulcer to numb the pain", why: "Cold narrows blood vessels — the opposite of what an ischemic fingertip needs." },
          { text: "Contrast baths — alternating hot and cold water — to pump blood into his fingers", why: "Contrast baths combine both dangers: heat he can't feel and cold that narrows his vessels." }
        ],
        hints: [
          "He has two problems: poor circulation and poor temperature sensation. Which advice is safe with both?"
        ],
        explain: [
          "With poor circulation **and** diminished temperature sensation, his hands and feet need protection from both **cold** (which narrows the vessels) and **heat** (which he can't feel properly, and which raises the tissue's oxygen demand).",
          "**In the clinic:** no hot packs, paraffin, hot soaks, whirlpools or ice on his hands and feet. Check skin and sensation before using any modality anywhere.",
          "**Protection:** well-fitting work boots and gloves, careful nail care, a daily check of the fingers and toes — and report any new sore or color change promptly."
        ]
      }
    ],
    debrief: {
      diagnosis: "Buerger's disease (thromboangiitis obliterans)",
      summary: [
        "Mr. Brooks was sent in for 'plantar fasciitis', but his file told a different story: a 29-year-old man who smokes and chews tobacco, with cold, blue fingertips and toes, a painful fingertip ulcer, poor temperature sensation, an inflamed vein and claudication in the arch — **Buerger's disease**, an inflammatory blockage of the small arteries and veins of the hands and feet.",
        "It starts distally and moves proximally, toward ulcers, gangrene and amputation — unless he stops all tobacco, completely. Meanwhile his hands and feet need protecting from both cold and heat."
      ],
      takeaways: [
        "Buerger's disease: inflammatory occlusion of the small arteries and veins of the hands and feet, in young adults — mostly men — who use tobacco.",
        "It begins in the fingers and toes and progresses proximally: ulcers, gangrene, autoamputation.",
        "Look-alikes: Raynaud's comes and goes with cold or stress; atherosclerotic PAD affects older people's larger leg arteries; Buerger's is constant and distal, in a young tobacco user.",
        "Stopping all tobacco — smoked or chewed — is essential; cutting down isn't enough.",
        "Poor circulation plus poor temperature sensation: keep the hands and feet warm, but no direct heat or cold."
      ],
      sources: ["L2 s52–53 · Thromboangiitis obliterans (Buerger's disease)", "L2 s45–47 · Peripheral vascular disease", "L2 s55–56 · Raynaud's disease"]
    },
    casebook: ["buergers", "raynauds", "pvd"]
  });

  // ---------------------------------------------------------------------------------------
  // 6.5 The Painless Wound — diabetic angiopathy and a falsely high ABI (medium)
  // Right ABI = 196 ÷ 134 = 1.46; left = 202 ÷ 134 = 1.51 (above 1.40, so non-compressible
  // by the lecture's table and by current guidelines alike).
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "vessels-painless-wound",
    unit: "vessels",
    order: 5,
    difficulty: "medium",
    title: "The Painless Wound",
    teaser: "A wound the size of a dime on the sole of her foot — and she never felt it.",
    patient: { name: "Rosa Delgado", age: 63, sex: "F" },
    setting: "Outpatient wound care clinic",
    file: {
      referral: [
        "**Referral:** ulcer on the sole of the right foot — wound care and offloading. Type 2 diabetes with peripheral neuropathy. From her primary care physician.",
        { quote: "I never felt a thing. My granddaughter saw blood on my sock — that's the only reason I know it's there.", by: "Mrs. Delgado" }
      ],
      history: {
        list: [
          "**Type 2 diabetes** for 18 years. For about 5 years her feet have felt 'like they're wrapped in cotton'.",
          "**The ulcer:** found 3 weeks ago, when her granddaughter noticed blood on her sock. No pain, then or now.",
          "**Habits:** walks barefoot around the house; soaks her feet in hot water most nights 'because they're always cold'; trims her own calluses with a razor blade.",
          "**Past medical history:** high blood pressure, high cholesterol, mild chronic kidney disease.",
          "**Social:** retired school cafeteria cook; never smoked; lives with her daughter's family."
        ]
      },
      medications: [
        { name: "Metformin", dose: "1000 mg twice a day" },
        { name: "Insulin glargine", dose: "24 units at bedtime" },
        { name: "Lisinopril", dose: "20 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: {
        hr: 80, bp: "136/78", rr: 16, spo2: 98, temp: "98.6 °F", pain: "0/10",
        other: [{ label: "Fingerstick glucose", value: "212 mg/dL" }]
      },
      exam: {
        list: [
          "**Right foot ulcer:** under the first metatarsal head (the ball of the foot, behind the big toe). Round, 1.5 cm across and 0.3 cm deep, with a thick rim of callus; pink base; a little clear drainage; no odor; no redness or warmth around it.",
          "**Sensation:** she can't feel the 10-gram monofilament at 6 of 10 sites on each foot.",
          "**Circulation:** both feet cool; dorsalis pedis and posterior tibial pulses faint on both sides; thin, shiny skin with little hair on the shins; thick toenails.",
          "**Feet and shoes:** mild clawing of the toes on both feet; worn house slippers and a tight pair of dress shoes for church."
        ]
      },
      tests: [
        {
          id: "abi", type: "table", title: "Ankle-brachial index (this morning)",
          head: ["Site", "Right", "Left"],
          rows: [
            ["Brachial systolic (mmHg)", 134, 128],
            ["Posterior tibial (mmHg)", 196, 202],
            ["Dorsalis pedis (mmHg)", 190, 194],
            ["ABI", "1.46", "1.51"]
          ],
          note: "Measured by Dr. Okafor with a blood-pressure cuff and a handheld Doppler, after 10 minutes lying down."
        },
        {
          id: "labs", type: "labs", title: "Blood tests (last week)",
          rows: [
            { name: "Hemoglobin A1c", value: "8.9", unit: "%", ref: "below 5.7; usual target in diabetes below 7", flag: "high" },
            { name: "Fasting glucose", value: 186, unit: "mg/dL", ref: "70–99", flag: "high" },
            { name: "Creatinine", value: 1.2, unit: "mg/dL", ref: "0.5–1.1", flag: "high" },
            { name: "White blood cell count", value: 7.2, unit: "× 10³/µL", ref: "4.5–11.0", flag: null }
          ]
        },
        {
          id: "vascular-lab", type: "report", title: "Vascular lab report", sealed: true,
          text: [
            "**Arterial Doppler:** dampened (monophasic) waveforms at both ankles — narrowing of the arteries below the knee on both sides.",
            "**Toe pressures (great toe):** right 46 mmHg, left 52 mmHg. Toe-brachial index right 0.34, left 0.39 (normal: 0.70 or more).",
            "**Transcutaneous oximetry (TcPO2), right forefoot:** 32 mmHg. This lab: 40 or more, good healing potential; 30–39, reduced; below 30, poor.",
            "**Impression:** peripheral arterial disease below the knee, hidden on the ABI by calcified, non-compressible ankle arteries. Blood flow to the right forefoot is reduced but should allow healing with strict offloading, wound care and better glucose control. Refer to vascular surgery for review."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "A 1.5 cm open wound on the sole of her foot — and she never felt it. What best explains that?",
        options: [
          { text: "Diabetic neuropathy has taken away her protective sensation", correct: true, why: "Yes: years of high blood glucose have damaged her sensory nerves — she can't feel the monofilament at 6 of 10 sites. With no pain to warn her, she kept walking on the spot until the skin broke down." },
          { text: "Ulcers caused by poor arterial blood flow are always painless", why: "The opposite: ulcers from poor arterial flow are usually very painful, especially at night and with the leg raised. Hers is painless because of her nerves." },
          { text: "The callus around it cushions the wound from pressure", why: "Callus does the reverse: it's hard, raises the pressure on the spot and hides damage underneath. It's a sign of repeated pressure on skin she can't feel." },
          { text: "It's too shallow to reach the nerves that sense pain", why: "Even a shallow wound on the sole should hurt with every step. The monofilament test shows her nerves aren't carrying the message." }
        ],
        hints: [
          "Look at the sensation part of her exam.",
          "What does long-standing diabetes do to the nerves of the feet?"
        ],
        explain: [
          "**Diabetic angiopathy** combines high blood glucose with **accelerated atherosclerosis**, and **neuropathy is a major problem** (L2 s54). Without protective sensation, a pressure spot or blister gives no warning pain, so the patient keeps walking on it.",
          "That's why a typical diabetic ulcer is **painless** and sits on the **plantar surface** of the foot — under the ball of the foot or the big toe, where the pressure is highest with every step. Her clawed toes push the metatarsal heads down even harder.",
          { tip: "The 10-gram monofilament test: if a patient can't feel the filament bend against the skin, protective sensation is lost. From then on, the eyes have to do the job pain used to do." }
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "Her right ABI is 1.46. What does that mean?",
        options: [
          { text: "Her ankle arteries are too stiff to compress — the reading is unreliable", correct: true, why: "Yes: in long-standing diabetes (and kidney disease) calcium stiffens the artery walls, so the cuff can't squeeze them shut. The ankle pressure — and the ABI — read falsely high." },
          { text: "Better-than-normal circulation — the ulcer has plenty of blood supply to heal", why: "A high ABI isn't extra-good circulation. Above 1.30 the vessel is non-compressible and the number can't be trusted — her cool feet and faint pulses point the other way." },
          { text: "Normal circulation — her arteries can be ruled out", why: "Normal is 1.00–1.29. Above 1.30 the reading is unreliable, so it can't rule arterial disease in or out." },
          { text: "Severe peripheral arterial disease", why: "Severe PAD gives a low ABI (0.40 or less). Hers is high — a sign the measurement itself is unreliable." }
        ],
        hints: [
          "Look at the top row of the ABI table.",
          "Think about what years of diabetes and kidney disease do to the walls of the arteries."
        ],
        explain: [
          "**An ABI above 1.30 means a non-compressible vessel** (L2 s50). In long-standing diabetes and kidney disease, calcium builds up in the artery walls; the cuff can't close them, so the ankle pressure and the ABI read falsely high.",
          "Her 'high' ABI can't rule out arterial disease — and her cool feet, faint pulses, shiny hairless skin and thick nails suggest she has some. Another test is needed."
        ]
      },
      {
        id: "s3",
        type: "test",
        prompt: "Which test should you ask Dr. Okafor about, to show whether enough blood reaches her foot to heal the ulcer?",
        options: [
          { text: "Transcutaneous oximetry (TcPO2) on the foot", correct: true, reveals: ["vascular-lab"], why: "Yes: a sensor on the skin measures how much oxygen actually reaches the tissue — a direct look at healing potential that calcified arteries can't fool. The vascular lab adds toe pressures and Doppler waveforms." },
          { text: "Repeat the ABI, pumping the cuff higher until the signal disappears", why: "Stiff, calcified arteries won't close however hard you pump. The reading stays unreliable, and over-inflating the cuff hurts." },
          { text: "Venous duplex ultrasound of the leg veins", why: "That looks for clots and leaky valves in the veins. Her ulcer is on the sole, not around the ankle, and the question is the arterial supply." },
          { text: "A treadmill walking test", why: "A treadmill test measures how far someone can walk before claudication. It doesn't measure oxygen at the wound — and walking on an open plantar ulcer is exactly what she must avoid." },
          { text: "A hemoglobin A1c blood test", why: "Her A1c is already in the file (8.9%): it shows her average glucose over the past 2–3 months. It matters for healing, but it says nothing about blood flow to her foot." }
        ],
        hints: [
          "You need a test that calcified arteries can't fool.",
          "The lecture's list of PVD tests includes one that measures the tissue, not the pressure inside an artery."
        ],
        explain: [
          "**Transcutaneous oximetry** — one of the lecture's tests for PVD (L2 s48) — measures the oxygen reaching the skin through a small heated sensor, so calcified arteries don't affect it. Vascular labs usually pair it with **toe pressures** — toe arteries are much less often calcified — and **Doppler** waveforms.",
          "Her results: TcPO2 32 mmHg (reduced), toe-brachial index 0.34 (normal 0.70 or more), dampened Doppler waveforms. She **does** have peripheral arterial disease — the 'high' ABI was hiding it."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "Why is this ulcer likely to be slow to heal?",
        options: [
          { text: "Reduced blood flow, plus pressure on a sore she can't feel", correct: true, why: "Yes: diabetic ulcers combine arterial and neuropathic problems (L2 s54). Her TcPO2 and toe pressures show less oxygen reaching the foot, and without pain she keeps loading the wound with every step. High glucose (A1c 8.9%) slows healing further." },
          { text: "Her ABI is high, so extra pressure at the ankle keeps reopening it", why: "The high ABI is a measuring problem caused by stiff arteries, not extra pressure at the wound. Her TcPO2 shows less oxygen reaching the foot, not more." },
          { text: "Skin on the sole always heals slowly, however good the circulation", why: "Plantar wounds can heal well when the blood supply is adequate and the pressure is taken off. Hers is slowed by her circulation and by pressure she can't feel." },
          { text: "Metformin slows wound healing", why: "Metformin isn't the problem — it treats her diabetes. What slows healing is poor circulation, pressure on the wound and high blood glucose." }
        ],
        hints: [
          "Look at her vascular lab report — and remember what she can't feel.",
          "The lecture calls diabetic ulcers a combination of two kinds of problem."
        ],
        explain: [
          "**Diabetic ulcers are slow to heal because the circulation to the area is impaired** (L2 s54). Diabetes speeds up atherosclerosis — especially in the arteries below the knee — and the smallest vessels don't widen normally to bring extra blood to an injury.",
          "Add the neuropathy (constant pressure on a wound she can't feel) and high blood glucose (which weakens the white cells that fight infection), and a small wound can linger for months. Infection can then spread fast, toward **gangrene and amputation**.",
          { warn: "Report the same day: new redness, warmth or swelling around a diabetic foot wound, drainage that turns cloudy or smelly, black tissue, fever, or blood glucose that suddenly runs high — even when there's no pain." }
        ]
      },
      {
        id: "s5",
        update: {
          title: "Teaching time",
          text: [
            "Dr. Okafor has debrided the callus, dressed the wound and fitted Mrs. Delgado with an offloading walker boot for her right foot. Now it's your turn: she needs to learn how to look after her feet at home."
          ]
        },
        type: "multi",
        prompt: "Which points should you teach her? Select all that apply.",
        options: [
          { text: "Check both feet every day, with a mirror or her granddaughter's help", correct: true, why: "She can't rely on pain, so she must rely on her eyes: soles, heels and between the toes, looking for cuts, blisters, redness or drainage." },
          { text: "Test bath water with her elbow or a thermometer, never with her feet", correct: true, why: "Her feet can't sense heat. Water that feels fine to numb feet can scald them." },
          { text: "Wear shoes and socks at all times, even at home, and check inside shoes first", correct: true, why: "Bare feet and pebbles in shoes cause injuries she won't feel. Shoes should fit well — not the tight dress shoes." },
          { text: "Wear her offloading boot whenever she's on her feet", correct: true, why: "Taking the pressure off the ulcer is the most important part of healing a plantar wound. Every unprotected step loads it again." },
          { text: "Soak her feet in hot water each night to warm them up", why: "Hot soaks can burn feet that can't feel heat, and waterlogged skin breaks down and invites infection. Warm socks instead." },
          { text: "Shave down her calluses at home with a razor blade", why: "Cutting her own calluses risks a wound she won't feel. Callus care belongs to the wound team or a podiatrist." },
          { text: "Wait until a sore hurts before calling the clinic", why: "It won't hurt — that's the whole problem. Any new sore, blister, redness or drainage should be reported the same day." }
        ],
        hints: [
          "Go back to her habits in the history: which ones put her feet at risk?",
          "Every safe habit makes up for the sensation she has lost."
        ],
        explain: [
          "Daily foot care for anyone with diabetes, neuropathy or poor circulation — the lecture's **foot and skin care** and **limb protection** (L2 s49), put into practice:",
          { list: [
            "Look at both feet every day — a mirror helps, or a family member.",
            "Wash daily in lukewarm water (tested with an elbow or a thermometer) and dry well, especially between the toes.",
            "Moisturize dry skin, but not between the toes.",
            "Never go barefoot; wear well-fitting shoes and socks; check inside shoes before putting them on.",
            "No hot soaks, heating pads or hot-water bottles, and no home 'bathroom surgery' on corns, calluses or nails — see the podiatrist.",
            "Report any new sore, blister, redness, swelling, drainage or color change the same day."
          ] },
          "Better glucose control (her A1c of 8.9% is high) is part of healing too — her physician manages her medicines."
        ]
      }
    ],
    debrief: {
      diagnosis: "Painless neuropathic foot ulcer from diabetic angiopathy, with peripheral arterial disease hidden by a falsely high ABI",
      summary: [
        "Mrs. Delgado's ulcer under the first metatarsal head was painless because diabetic neuropathy had taken away her protective sensation. Her ABI of 1.46 looked 'better than normal', but it only meant her calcified ankle arteries couldn't be compressed.",
        "Transcutaneous oximetry and toe pressures showed the arterial disease the ABI had hidden. Neuropathy, poor circulation and high glucose together make diabetic ulcers slow to heal and put her at risk of gangrene and amputation — so offloading and daily foot care matter."
      ],
      takeaways: [
        "Diabetic angiopathy = high blood glucose + accelerated atherosclerosis; neuropathy is a major problem.",
        "Diabetic ulcers are painless, slow to heal and typically on the plantar surface of the foot.",
        "An ABI above 1.30 means non-compressible (calcified) arteries: the reading is falsely high and can hide PAD — use transcutaneous oximetry, toe pressures or Doppler instead.",
        "Teach daily foot inspection, no bare feet, testing water temperature, no hot soaks or home callus cutting — and report any new wound the same day."
      ],
      sources: ["L2 s54 · Diabetic angiopathy", "L2 s48–50 · PVD tests and the ankle-brachial index", "L2 s49 · Foot and skin care, limb protection"]
    },
    casebook: ["diabetic-angiopathy", "abi", "pvd", "diagnostic-tests"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook: condition entries for the arteries
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "pvd", kind: "condition", unit: "vessels",
    title: "Peripheral vascular disease (peripheral arterial disease)",
    aka: ["PVD", "PAD", "peripheral arterial disease", "arteriosclerosis obliterans", "intermittent claudication", "claudication", "chronic arterial insufficiency", "walking program"],
    summary: "Narrowing of the arteries that supply the limbs — usually the legs — mainly by atherosclerosis, sometimes made worse by a clot. The first symptom is often **intermittent claudication**: cramping pain with walking that's relieved by rest.",
    sections: [
      { heading: "What it is", body: [
        "Peripheral vascular disease (PVD), also called **arteriosclerosis obliterans**, is a narrowing of the lumen of the blood vessels that reduces circulation, usually because of atherosclerosis. An **embolus** (a clot carried in the bloodstream) or a **thrombus** (a clot stuck to the vessel wall) can make it worse. Over time the narrowing can progress to complete blockage of medium and large arteries.",
        "In this game PVD means this arterial disease — today usually called **peripheral arterial disease (PAD)**. Disease of the veins is covered under chronic venous insufficiency and DVT."
      ] },
      { heading: "Causes and risk factors", body: { list: [
        "**Atherosclerosis** — the primary factor",
        "**Smoking** — the strongest risk factor a patient can change",
        "Diabetes, high cholesterol (hyperlipidemia) and high blood pressure",
        "Inactivity and obesity",
        "Older age and a family history",
        "Also: phlebitis, injury or surgery, autoimmune disease"
      ] } },
      { heading: "Signs and symptoms", body: [
        "**Intermittent claudication** is the early symptom, and often the only one: cramping pain, usually in the calf, during walking, exercise or long standing, relieved by rest. Working muscle isn't getting enough blood through the narrowed artery — often the femoral or popliteal artery. It may also feel like the leg buckling or 'giving out'. As the disease progresses, it comes on sooner and more often.",
        { list: [
          "Tingling and numbness",
          "**Pain at rest and at night** — a sign of severe disease; patients often hang the foot over the side of the bed for relief",
          "Slow healing of small wounds",
          "**Pale on elevation, dusky red when hanging down** (dependent rubor)",
          "Cool, pale, shiny, dry, hairless skin; thick nails",
          "Weak or absent pulses"
        ] },
        "Complications: permanent numbness or pain, ulcers, gangrene and amputation. PVD also signals disease elsewhere: people with symptoms have a much higher risk of heart attack and stroke, and up to about 30% die within 5 years — mostly from one of the two."
      ] },
      { heading: "Arterial or venous?", body: { table: { head: ["Feature","Chronic arterial insufficiency", "Chronic venous insufficiency"], rows: [
        ["Cause", "Atherosclerosis, thrombosis, emboli, inflammation", "Thrombophlebitis, trauma, a clot in the vein, incompetent valves"],
        ["Pain", "Claudication — worse with exercise, relieved by rest; rest pain means severe disease", "Mild to moderate aching with long standing or sitting; better with the legs raised"],
        ["Where", "Calf, lower leg, top of the foot; sometimes hip or buttock", "Along the course of the vein"],
        ["Pulses and color", "Weak or absent pulses; pale on elevation; dependent rubor", "Dilated veins; moderate to severe edema after long dependency"],
        ["Skin", "Pale, shiny, dry, hairless, cool; nail changes", "Brown (hemosiderin) staining, thickened skin; dermatitis, cellulitis"],
        ["Ulcers", "Toes, feet and injured spots; regular, 'punched out'; pale or yellow base to black eschar; gangrene possible", "Around the ankle, especially the medial malleolus; shallow, weeping, irregular edges; painful; no gangrene"]
      ] } } },
      { heading: "Tests and treatment", body: { list: [
        "**Tests:** the ankle-brachial index (see the ABI entry); Doppler ultrasound, MRI or angiography; a rubor of dependency test, transcutaneous oximetry and a treadmill test for a baseline; routine blood tests (CBC, BUN, electrolytes).",
        "**Medicines:** an antiplatelet (aspirin or clopidogrel) and a statin for nearly everyone with PAD. Anticoagulants such as heparin, and thrombolytics, are used mainly when a clot suddenly blocks an artery; some patients also take a low-dose anticoagulant with aspirin.",
        "**Procedures** for severe or limiting disease: balloon angioplasty, a stent, or bypass surgery."
      ] } },
      { heading: "What it means for the PTA", body: [
        "**The walking program** (L2 s49): walk until the claudication pain is near maximal, rest until it's relieved, then walk again. The goal is longer walks with less rest — eventually **30 minutes of continuous walking**. After 4–6 weeks, add isometric, active range-of-motion and resistive exercise. Supervised programs usually run at least 3 times a week for 12 weeks or more.",
        "**Education is paramount:** the disease process; **stop smoking**; avoid cold; daily foot and skin care; well-fitting shoes and no bare feet (limb protection). No heating pads or hot soaks on poorly supplied feet, and don't raise the legs to 'help circulation' — elevation reduces arterial flow.",
        "Claudication pain is expected during the walking program; chest pain, unusual breathlessness or dizziness are not — many people with PVD also have coronary artery disease. Stop and notify the supervising PT.",
        { warn: "Report promptly: new pain at rest or at night, a wound that won't heal, or a color change. A **sudden** cold, pale, painful leg — with numbness, weakness or no pulse — is an emergency (an artery suddenly blocked): call 911." }
      ] }
    ],
    sources: ["L1 s38 · Intermittent claudication", "L2 s45–51 · Peripheral vascular disease", "L2 s65–66 · Arterial vs venous insufficiency"]
  });

  CCF.defineEntry({
    id: "raynauds", kind: "condition", unit: "vessels",
    title: "Raynaud's disease and Raynaud's phenomenon",
    aka: ["Raynaud's", "Raynaud's syndrome", "secondary Raynaud's", "vasospasm", "white fingers"],
    summary: "Spasm of the small arteries of the fingers (sometimes the toes) in response to cold or emotional stress: the fingers turn white, then blue, then red as blood returns. Usually not serious, but people with it cannot tolerate cold.",
    sections: [
      { heading: "What it is", body: [
        "Raynaud's can be classed as a peripheral vascular disease because it affects the blood vessels. During an attack the small arteries of the fingers clamp down (vasospasm); afterwards they relax again.",
        { list: [
          "**Raynaud's disease** (primary): no known cause. The most common form, and usually mild. A genetic component may exist.",
          "**Raynaud's phenomenon** (secondary, also called Raynaud's syndrome): occurs with another condition — most often a connective-tissue disease such as scleroderma (systemic sclerosis) or rheumatoid arthritis. It can appear years before that disease is diagnosed."
        ] }
      ] },
      { heading: "Who gets it, and what sets it off", body: [
        "Women more than men; common between ages 20 and 49.",
        { list: ["**Cold** — patients are acutely sensitive to it", "**Emotional stress**", "**Smoking**", "**Working with vibrating machinery**"] }
      ] },
      { heading: "Signs and symptoms", body: [
        "Pale (white) skin, especially of the hands, and cool skin — often followed by blue, then red as the fingers rewarm, with numbness, tingling or throbbing. Attacks last minutes to hours; in between, the color returns to normal and the pulses are strong.",
        "Repeated attacks — especially in secondary Raynaud's — can damage the vessels and cause painful ulcers of the fingertips."
      ] },
      { heading: "Treatment", body: [
        "Medical care aims to reduce the number of attacks and prevent vascular damage and finger ulcers. **Calcium channel blockers** such as nifedipine relax the vessel walls; their side effects are dizziness, headache, hypotension and ankle edema.",
        "Self-care: keep the whole body warm (layers, a hat, gloves or mittens), stop smoking, manage stress, limit vibrating tools. During an attack, move somewhere warm, swing the arms or tuck the hands into the armpits, or run warm — not hot — water over the fingers."
      ] },
      { heading: "What it means for the PTA", body: [
        { list: [
          "**No cold packs** — the reaction to cold is severe.",
          "**Aquatic therapy** only if the pool is heated to at least body temperature.",
          "**No whirlpools at non-thermal temperatures.**",
          "Keep the treatment room, equipment and the patient's hands warm; check the fingertips for ulcers.",
          "Report new fingertip sores, and fingers that stay white or blue after warming."
        ] },
        { tip: "Raynaud's or Buerger's? Raynaud's comes and goes with cold or stress, mostly in women, with normal pulses between attacks. Buerger's is constant, in young tobacco users, with missing pulses and ulcers." }
      ] }
    ],
    sources: ["L2 s55–56 · Raynaud's disease or syndrome", "L1 s57 · Calcium channel blocker agents"]
  });

  CCF.defineEntry({
    id: "buergers", kind: "condition", unit: "vessels",
    title: "Buerger's disease (thromboangiitis obliterans)",
    aka: ["thromboangiitis obliterans", "TAO", "Buerger disease"],
    summary: "A chronic inflammatory disease that blocks the small and medium arteries — and the veins — of the hands and feet, in young adults, mostly men, who use tobacco. It starts in the fingers and toes and can lead to ulcers, gangrene and amputation; stopping all tobacco is essential.",
    sections: [
      { heading: "What it is", body: "Thromboangiitis obliterans is a chronic, inflammatory, occlusive disease of the small and medium arteries and also the veins of the upper and lower extremities, especially the hands and feet. Inflammation and clots close the vessels, and the tissue beyond them is starved of blood. It isn't atherosclerosis: there's no fatty plaque. It **begins distally and progresses proximally**." },
      { heading: "Who gets it", body: "Young adults — usually under 45 — largely men, who smoke or use other tobacco, including chewing tobacco. Almost everyone diagnosed with it uses tobacco." },
      { heading: "Signs and symptoms", body: { list: [
        "Pain or paresthesias (tingling, numbness) in the fingers and toes",
        "Cold, cyanotic (bluish) fingers and toes",
        "Diminished temperature sensation; fatigue",
        "Claudication — often in the arch of the foot, where it can be mistaken for plantar fasciitis",
        "Tender, red cords along superficial veins that come and go (thrombophlebitis)",
        "Painful ulcers of the fingertips and toes; gangrene — a dead fingertip or toe can separate on its own (autoamputation)"
      ] } },
      { heading: "Telling it apart", body: { table: { head: ["Feature","Buerger's disease", "Atherosclerotic PAD", "Raynaud's"], rows: [
        ["Who", "Young adults, mostly men, who use tobacco", "Mostly over 50; smoking, diabetes, high cholesterol, hypertension", "Mostly women aged 20–49; often with scleroderma or rheumatoid arthritis"],
        ["Vessels", "Small and medium arteries and veins of the hands and feet", "Medium and large arteries, mostly in the legs", "Spasm of the small arteries of the fingers (and toes)"],
        ["Course", "Constant; starts in the fingers and toes and moves proximally", "Slowly progressive", "Comes in attacks with cold or stress; normal in between"],
        ["Danger", "Ulcers, gangrene, amputation", "Rest pain, ulcers, gangrene; heart attack and stroke", "Usually not serious; fingertip ulcers possible"]
      ] } } },
      { heading: "Treatment", body: [
        "**Stopping all tobacco is essential** — cigarettes, cigars, chewing tobacco and snuff. It's the only treatment proven to stop the disease from progressing; even a few cigarettes a day can keep it active. Nicotine itself may keep it active too, so quit aids are chosen by the physician, and nicotine patches and gum are often avoided.",
        "Also: wound care for ulcers; protecting the hands and feet from cold, heat and injury; medicines to widen the vessels or relieve pain; amputation if gangrene sets in."
      ] },
      { heading: "What it means for the PTA", body: { list: [
        "Support quitting at every visit and share quit resources (for example 1-800-QUIT-NOW); tell the supervising PT about continued tobacco use, new sores or color changes.",
        "No heat or cold modalities on the affected hands and feet: poor circulation plus poor temperature sensation means burns and cold injury. Keep them warm with loose gloves and socks instead.",
        "Check the fingers and toes for ulcers, and protect them from injury (well-fitting shoes and work gloves).",
        "A walking program can ease claudication — alongside quitting, never instead of it."
      ] } }
    ],
    sources: ["L2 s52–53 · Thromboangiitis obliterans (Buerger's disease)", "L2 s55–56 · Raynaud's (look-alike)"]
  });

  CCF.defineEntry({
    id: "diabetic-angiopathy", kind: "condition", unit: "vessels",
    title: "Diabetic angiopathy and diabetic foot ulcers",
    aka: ["diabetic foot", "diabetic ulcer", "neuropathic ulcer", "neurotrophic ulcer", "diabetic neuropathy", "monofilament test"],
    summary: "Blood-vessel disease caused by diabetes: persistently high blood glucose and accelerated atherosclerosis, with neuropathy as a major problem. Diabetic foot ulcers are painless, slow to heal and typically on the sole, and can lead to gangrene and amputation.",
    sections: [
      { heading: "What it is", body: "Diabetic angiopathy happens because of persistently high blood glucose and **accelerated atherosclerosis** — especially in the arteries below the knee — while the smallest vessels stop widening normally when tissue needs more blood. **Neuropathy** (nerve damage) is a major part of the problem." },
      { heading: "Why ulcers form", body: { list: [
        "**Neuropathy** takes away protective sensation: pressure spots, blisters and burns cause no warning pain, so the patient keeps walking on them. Toe deformities and dry, cracked skin add to the risk.",
        "**Angiopathy** reduces the blood supply, so wounds heal slowly and infection takes hold more easily.",
        "Diabetic ulcers are therefore a **combination of arterial and neuropathic problems**: painless, slow to heal, and typically on the **plantar surface** (the ball of the foot, the big toe, the heel). These neurotrophic ulcers can lead to gangrene and amputation."
      ] } },
      { heading: "Which ulcer is it?", body: { table: { head: ["Feature","Diabetic (neuropathic)", "Arterial", "Venous"], rows: [
        ["Where", "Sole: ball of the foot, big toe, heel — pressure points", "Toes, feet, injured spots", "Around the ankle, especially the medial malleolus"],
        ["Pain", "Painless (sensation lost)", "Painful, worse at night and with the leg raised", "Aching; better with the legs raised"],
        ["Look", "Round, with a thick callus rim", "Punched out; pale or yellow base to black eschar; gangrene possible", "Shallow, weeping, irregular edges; no gangrene"],
        ["Around it", "Numb, dry skin; pulses may be reduced", "Cool, pale, hairless skin; weak or absent pulses", "Edema and brown hemosiderin staining"]
      ] } } },
      { heading: "Tests", body: { list: [
        "**Sensation:** the 10-gram monofilament — if the patient can't feel it, protective sensation is lost.",
        "**Circulation:** pulses, skin and nails. The **ABI can be falsely high** (above 1.30) because calcified arteries can't be compressed; transcutaneous oximetry, toe pressures and Doppler waveforms are more reliable.",
        "**Blood tests:** glucose, and hemoglobin A1c (the average glucose over the past 2–3 months)."
      ] } },
      { heading: "Treatment", body: "Wound care, including sharp debridement of callus and dead tissue by the physical therapist, podiatrist or physician; **offloading** with a cast, boot or special shoe that takes pressure off the ulcer; better glucose control; treatment of infection; and a vascular procedure when blood flow is too poor to heal." },
      { heading: "What it means for the PTA", body: [
        { list: [
          "Teach daily foot care: look at both feet every day (a mirror or a family member helps); test bath water with an elbow or thermometer; never go barefoot; well-fitting shoes and socks, checked inside before wearing; moisturize, but not between the toes; no hot soaks, heating pads or home callus cutting.",
          "Reinforce the offloading device: every unprotected step loads the wound again.",
          "No heat modalities on feet that can't feel temperature."
        ] },
        { warn: "Report the same day: redness, warmth or swelling around a wound, cloudy or smelly drainage, black tissue, fever, or a sudden rise in blood glucose — even without pain." }
      ] }
    ],
    sources: ["L2 s54 · Diabetic angiopathy", "L2 s48–50 · PVD tests and the ankle-brachial index", "L2 s49 · Foot and skin care, limb protection"]
  });
})();
