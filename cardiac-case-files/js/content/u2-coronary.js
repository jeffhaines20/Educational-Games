/*
 * The Cardiac Case Files — Unit 2: Coronary Cases.
 * Case 2.1 (The Snow Shoveler) is the worked example for every content writer; keep it first.
 * Format: docs/DESIGN.md §6. Plan: docs/CASE-PLAN.md.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------------------------------
  // 2.1 The Snow Shoveler — stable angina (easy)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "coronary-snow-shoveler",
    unit: "coronary",
    order: 1,
    difficulty: "easy",
    title: "The Snow Shoveler",
    teaser: "Chest tightness that arrives with the snow — and leaves when he rests.",
    patient: { name: "Harold Brenner", age: 62, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** low back strain after shoveling snow — evaluate and treat. From his primary care physician.",
        { quote: "My back's sore from all that shoveling. Funny thing — my chest gets tight out there too, but it goes away once I stop. Never mentioned it to my doctor.", by: "Mr. Brenner" }
      ],
      history: {
        list: [
          "**This month:** a squeezing tightness in the middle of his chest when he shovels snow or hurries up stairs, sometimes spreading into his left arm. It fades within 3–5 minutes of resting. Never at rest, never at night.",
          "**Past medical history:** high blood pressure for 10 years; high cholesterol.",
          "**Social:** retired mail carrier; smokes about 10 cigarettes a day; mostly inactive since he retired.",
          "**Family:** his father had a heart attack at 66."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "20 mg once a day", "class": "ACE inhibitor" },
        { name: "Atorvastatin (Lipitor)", dose: "20 mg once a day", "class": "Statin (antihyperlipidemic)" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 76, bp: "148/88", rr: 16, spo2: 97, temp: "98.4 °F", pain: "4/10 (low back)" },
      exam: {
        list: [
          "Low back: tender, guarded lumbar muscles; pain bending forward.",
          "Pulse regular; breathing comfortable at rest; lungs clear.",
          "No ankle swelling.",
          "Body mass index 31."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Which explanation best fits the chest tightness Mr. Brenner describes?",
        options: [
          { text: "Stable angina", correct: true, why: "Yes: brought on by exertion and cold, felt as pressure, spreading to the left arm, and gone within minutes of rest — the textbook pattern of stable angina." },
          { text: "Unstable angina", why: "Unstable angina comes on at rest or without an obvious trigger, and often isn't relieved by rest or nitroglycerin. His episodes are predictable and settle with rest." },
          { text: "A heart attack (myocardial infarction)", why: "The pain of an MI doesn't go away with rest and can last for hours. His tightness fades within 3–5 minutes." },
          { text: "A strained chest-wall muscle from shoveling", why: "A strained muscle hurts when it's moved or pressed, not as a squeezing pressure that spreads to the arm with any exertion — including climbing stairs." }
        ],
        hints: [
          "Notice what brings the tightness on, how long it lasts and what makes it go away.",
          "A heart attack, or unstable angina, doesn't reliably settle after a few minutes of rest."
        ],
        explain: [
          "**Stable angina** happens predictably when the heart works harder — exercise, stress, cold weather, a large meal. It usually lasts no more than 15 minutes and is relieved by rest or nitroglycerin.",
          "Shoveling snow is a classic trigger: heavy arm work, straining, and cold air that narrows blood vessels — all at once."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What is happening in his heart during these episodes?",
        options: [
          { text: "His narrowed coronary arteries can't meet the heart's extra oxygen demand", correct: true, why: "Right: the myocardium needs more oxygen during exertion, and plaque-narrowed coronary arteries can't keep up. That temporary shortage is ischemia, and angina is its symptom." },
          { text: "A clot has suddenly and completely blocked one of his coronary arteries", why: "A complete, lasting blockage causes a myocardial infarction — the muscle starts to die, and the pain doesn't settle with rest." },
          { text: "One of his heart valves is leaking, so blood flows backwards each beat", why: "Valve problems can cause breathlessness and murmurs, but his pattern — tightness with effort, relief with rest — points to the coronary arteries." },
          { text: "Breathing cold air while working hard is tightening his airways", why: "Cold air can trigger angina by narrowing vessels and raising blood pressure, but the pain itself comes from the heart muscle, not the lungs." }
        ],
        hints: [
          "Think supply and demand: what does shoveling snow ask of his heart muscle?",
          "Angina is a symptom of ischemia."
        ],
        explain: [
          "Angina pectoris is **not a disease by itself** — it's a symptom of myocardial ischemia: oxygen demand is greater than the coronary arteries can supply.",
          "The usual cause is **coronary artery disease**: atherosclerotic plaque narrowing the arteries. His risk factors are all over the chart: hypertension, high cholesterol, smoking, inactivity, a father with an early heart attack."
        ]
      },
      {
        id: "s3",
        update: {
          title: "Six minutes into the warm-up…",
          text: [
            "Mr. Brenner is on the recumbent bike when he stops pedaling and presses a clenched fist against the middle of his chest.",
            { quote: "There it is again. That tightness.", by: "Mr. Brenner" }
          ],
          vitals: { hr: 104, bp: "162/94", rr: 20, spo2: 97, pain: "chest tightness 4/10" }
        },
        type: "single",
        prompt: "What should you do first?",
        options: [
          { text: "Stop the exercise, sit him down, monitor his symptoms and vitals, and get Dr. Okafor", correct: true, why: "Yes. Removing the extra demand is what relieves ischemia. And this is a new symptom his doctor doesn't know about, so the supervising PT needs to know now — and if it doesn't ease within a few minutes, it's a 911 call." },
          { text: "Encourage him to keep pedaling slowly so the tightness can work itself out", why: "Exercise is what's causing the ischemia. Continuing makes the oxygen shortage worse." },
          { text: "Let him rest for a few minutes, then finish the session as planned — it always passes", why: "It passed before, but chest pain during exercise must be reported. He also needs a medical evaluation: his physician doesn't know about it yet." },
          { text: "Have him walk a few laps of the gym to loosen up his back and chest", why: "Walking is still exertion. The heart, not stiffness, is the problem." }
        ],
        hints: [
          "Your first job is to take the extra demand off his heart.",
          "A new symptom, or a worsening one, always goes to the supervising PT."
        ],
        explain: [
          "His clenched fist over the chest is **Levine's sign** — patients with ischemic chest pain often make it without being asked.",
          "**When angina starts during a session:** stop the activity, have the patient sit and rest, monitor symptoms and vital signs, and tell the supervising PT. Patients who have nitroglycerin use it as prescribed.",
          { warn: "Call 911 if the pain doesn't ease within a few minutes, gets worse, or comes with sweating, nausea or breathlessness — it may not be stable angina." },
          { tip: "Better still, catch it before exercise starts: chest symptoms a patient mentions at check-in that his physician hasn't evaluated — like Mr. Brenner's — go to the supervising PT first." }
        ]
      },
      {
        id: "s4",
        update: {
          title: "Two weeks later",
          text: [
            "The tightness eased after three minutes of rest. Dr. Okafor called his physician, who sent him for testing that week: stable angina from coronary artery disease. He now carries **sublingual nitroglycerin** (Nitrostat).",
            { quote: "I used one of those little pills last week. Gave me a pounding headache — and I nearly keeled over when I stood up!", by: "Mr. Brenner" }
          ],
          exhibits: [
            {
              id: "cardiology-note", type: "report", title: "Cardiology note",
              text: [
                "Exercise stress test: chest tightness at 7 minutes, with 2 mm downsloping ST depression; both resolved within 3 minutes of rest.",
                "**Impression:** stable angina pectoris; coronary artery disease.",
                "**Plan:** nitroglycerin 0.4 mg under the tongue as needed for chest pain; start aspirin 81 mg daily; increase atorvastatin to 40 mg; stop smoking; cardiac rehabilitation."
              ]
            }
          ]
        },
        type: "single",
        prompt: "What explains his headache and light-headedness — and what should you teach him?",
        options: [
          { text: "Expected nitroglycerin side effects — teach him to take it seated and to stand up slowly", correct: true, why: "Right. Nitrates dilate blood vessels: the ones in the head (headache) and the ones in the legs, so blood pressure drops when he stands (orthostatic hypotension)." },
          { text: "An allergic reaction to the nitroglycerin — he should stop taking it and tell his doctor", why: "Headache and dizziness are expected side effects, not an allergy. And a PTA never tells a patient to stop a medication; questions about it go to his physician." },
          { text: "Warning signs of a mini-stroke — call 911 now and keep him lying flat", why: "The symptoms were brief, matched the moment he took the pill, and are gone. That points to an expected drug effect, not a stroke." },
          { text: "Dehydration from shoveling — he should drink more water before going out", why: "Fluids don't explain a headache and dizziness that started right after the pill. The medicine's effect on his blood vessels does." }
        ],
        hints: [
          "Nitroglycerin works by widening blood vessels. What does that do to blood pressure — and to the vessels in the head?"
        ],
        explain: [
          "**Nitrates** relax vascular smooth muscle. Side effects: **headache**, dizziness, **orthostatic hypotension**, a faster heart rate, nausea.",
          "Teach patients to sit down to take sublingual nitroglycerin, to stand up slowly afterwards, and to carry it with them — it's the preferred treatment for an acute angina attack.",
          { tip: "Before exercising a patient with angina, ask where their nitroglycerin is." }
        ]
      }
    ],
    debrief: {
      diagnosis: "Stable angina pectoris from coronary artery disease",
      summary: [
        "Mr. Brenner's chest tightness came on predictably with exertion and cold, felt like pressure, spread to his left arm and faded within minutes of rest — the classic pattern of **stable angina**. His narrowed coronary arteries couldn't supply enough oxygen when his heart worked harder.",
        "Because the symptom was new, it needed a physician's evaluation. During the episode, stopping, resting, monitoring and getting the supervising PT was exactly right."
      ],
      takeaways: [
        "Stable angina is triggered by exertion, stress, cold or a big meal, usually lasts under 15 minutes, and is relieved by rest or nitroglycerin.",
        "Unstable angina comes on at rest or without a clear trigger and may not respond to nitroglycerin — treat it as an emergency.",
        "If angina starts in a session: stop, sit and rest, monitor, and get the supervising PT; call 911 if it doesn't ease within a few minutes or gets worse.",
        "Nitroglycerin widens blood vessels: expect headache and orthostatic hypotension, so take it seated and stand up slowly."
      ],
      sources: ["L2 s6–8 · Angina pectoris", "L2 s11 · Levine's sign", "L1 s59 · Nitrate agents"]
    },
    casebook: ["angina", "cad", "nitrates", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // 2.2 Plaque in the Pipes — coronary artery disease, angiography, LAD, stent (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "coronary-plaque-in-the-pipes",
    unit: "coronary",
    order: 2,
    difficulty: "medium",
    title: "Plaque in the Pipes",
    teaser: "He came in for his knee. It's the stairs to his office that have him worried.",
    patient: { name: "Dennis Kowalski", age: 55, sex: "M" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** right knee pain from osteoarthritis — evaluate and treat; strengthening and a home program. From his primary care physician.",
        { quote: "It's not just the knee. Two flights of stairs to my office and I'm puffing like a steam engine — and wiped out for the rest of the morning. I'm just out of shape, right?", by: "Mr. Kowalski" }
      ],
      history: {
        list: [
          "**For two months:** breathless and unusually tired climbing the two flights to his office; he has to stop halfway, and it settles within a few minutes of rest. No chest pain; no symptoms at rest or at night.",
          "**Past medical history:** high blood pressure and high LDL cholesterol, both found 3 years ago.",
          "**Social:** sales manager — “the stress never stops”; has smoked a pack a day for 30 years; no regular exercise; two beers on weekends.",
          "**Family:** his father had a heart attack at 52."
        ]
      },
      medications: [
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Atorvastatin", dose: "20 mg once a day" },
        { name: "Ibuprofen", dose: "400 mg as needed for knee pain" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 84, bp: "146/92", rr: 16, spo2: 97, temp: "98.6 °F", pain: "4/10 (right knee)" },
      exam: {
        list: [
          "Right knee: tender along the inner joint line; mild swelling; stiff after sitting.",
          "Stair test (one flight, 14 steps): stopped at the top — breathless, RR 26, HR 122, BP 172/96. No chest pain. Back to his resting values after 4 minutes seated.",
          "Pulse regular; lungs clear; no ankle swelling."
        ]
      },
      tests: [
        {
          id: "cath-report", type: "report", title: "Cardiac catheterization report", sealed: true,
          text: [
            "**Procedure:** a catheter passed from the right radial (wrist) artery to the heart; contrast dye injected into the coronary arteries under X-ray (coronary angiography).",
            {
              table: {
                head: ["Artery", "Narrowing"],
                rows: [
                  ["Left main", "none"],
                  ["Left anterior descending (LAD), proximal", "85 %"],
                  ["Left circumflex", "20 %"],
                  ["Right coronary artery (RCA)", "40 %"]
                ]
              }
            },
            "**Left ventricle:** normal size and normal contraction (ejection fraction 60 %).",
            "**Impression:** coronary artery disease — severe narrowing of the proximal LAD."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "multi",
        prompt: "Before you look at his heart, look at his life. Which of Mr. Kowalski's risk factors for coronary artery disease are **modifiable** — habits he can change himself? Select all that apply.",
        options: [
          { text: "Smoking a pack a day", correct: true, why: "Yes. Quitting is the most powerful single change he can make." },
          { text: "No regular exercise", correct: true, why: "Yes. Physical inactivity is on the lecture's list of modifiable risk factors; regular aerobic activity helps blood pressure, cholesterol, weight and the heart itself." },
          { text: "A stressful job", correct: true, why: "Yes. Stress is on the lecture's list of modifiable risk factors, and stress management is part of cardiac rehab." },
          { text: "His father's heart attack at 52", why: "A family history raises his risk, but he can't change it. It's a reason to work harder on the factors he *can* change." },
          { text: "Being a man in his fifties", why: "Risk rises with age, and men tend to develop CAD earlier than women — but neither can be changed." }
        ],
        hints: [
          "For each one, ask: could he change this through his own choices and effort?"
        ],
        explain: [
          "The lecture lists the risk factors for CAD as hypertension, diabetes, obesity, chronic kidney disease, high cholesterol and triglycerides, and family history — and names **smoking, inactivity, alcohol abuse and stress** as the **modifiable** ones.",
          "His blood pressure and LDL are being treated with medicines, and they improve further with the same lifestyle changes.",
          "Physical therapy helps with exactly these: a supervised exercise program, education, and support for quitting smoking and managing stress."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do his breathlessness and fatigue on the stairs most likely reflect?",
        options: [
          { text: "Narrowed coronary arteries that can't keep up when his heart works harder", correct: true, why: "Yes. A partial blockage of the coronary arteries often first shows up as breathlessness, weakness or angina on exertion — sometimes with no chest pain at all. With his risk factors, he needs a medical evaluation." },
          { text: "Simply being out of shape — he should push through it to build up his fitness", why: "Deconditioning is possible, but assuming it is dangerous. New breathlessness on exertion in a smoker with hypertension, high LDL and a father with an early heart attack must be reported, not pushed through." },
          { text: "Peripheral artery disease limiting blood flow to his legs", why: "Peripheral artery disease causes cramping leg pain on walking (claudication). His problem is breathlessness and fatigue." },
          { text: "A heart attack happening right now", why: "His symptoms come with effort and settle within minutes of rest. The symptoms of a heart attack don't settle with rest." }
        ],
        hints: [
          "What happens to his heart's need for oxygen on the stairs — and what could be limiting the supply?"
        ],
        explain: [
          "**Coronary artery disease (CAD)** is atherosclerotic plaque — fatty deposits containing cholesterol — building up inside the coronary arteries. It develops slowly and often goes unnoticed for years.",
          "A **partial occlusion** may cause **exertion-related shortness of breath, weakness or angina**, and that is often the first sign. In some people the first sign is a heart attack.",
          "**Your action:** report it to the supervising PT, who contacts his physician. Until he has been evaluated, keep his exercise light and stop at the first sign of breathlessness or discomfort."
        ]
      },
      {
        id: "s3",
        update: {
          title: "Two weeks later",
          text: "Dr. Okafor called his physician the same day. An exercise stress test was abnormal, and the cardiologist now wants a precise map of his coronary arteries before deciding on treatment."
        },
        type: "test",
        prompt: "Which test shows exactly **where** his coronary arteries are narrowed, and **how badly**?",
        options: [
          { text: "Cardiac catheterization with coronary angiography", correct: true, reveals: ["cath-report"], why: "Yes. Contrast dye injected through a catheter outlines the inside of each coronary artery on X-ray. It's the most accurate test for both the location and the severity of CAD." },
          { text: "Echocardiogram", why: "An echo shows the chambers, walls, valves and ejection fraction — how well the heart pumps — but not the inside of the coronary arteries." },
          { text: "Holter monitor (a 24–48-hour ECG)", why: "A Holter monitor records the heart's rhythm over a day or two. It can't show where an artery is narrowed." },
          { text: "Chest X-ray", why: "A chest X-ray shows the lungs and the size of the heart. The coronary arteries can't be seen without contrast dye." },
          { text: "Ankle-brachial index", why: "The ankle-brachial index screens for narrowed arteries in the legs, not the heart." }
        ],
        hints: [
          "To see the inside of an artery on an X-ray, you need to fill it with something that shows up."
        ],
        explain: [
          "**Cardiac catheterization with coronary angiography:** a thin catheter is threaded from an artery in the leg or arm to the coronary arteries, and contrast dye is injected. It gives the most accurate information about the **location and severity** of CAD, and it can measure pressures and oxygen inside the heart.",
          "**CT and MR coronary angiograms** are less invasive alternatives, with the dye given through a vein.",
          "His result: an **85 % narrowing of the proximal LAD**, plus milder plaque in the other arteries."
        ]
      },
      {
        id: "s4",
        type: "single",
        prompt: "The cardiologist calls his LAD lesion a “widow maker”. Why is a blockage in the left anterior descending artery so dangerous?",
        options: [
          { text: "It feeds much of the left ventricle and is a very common site of heart attacks", correct: true, why: "Yes. The LAD runs down the front of the heart and feeds a large part of the left ventricle — the main pump. Your lecture names it the most common site of a heart attack, and a blockage near its start causes a large one." },
          { text: "It supplies the right ventricle, the chamber that pumps blood out to the whole body", why: "The right coronary artery mainly supplies the right atrium and right ventricle — and the right ventricle pumps blood to the lungs, not the body." },
          { text: "It's the heart's only coronary artery, so nothing else can feed the heart", why: "There are two main coronary arteries, right and left, both branching from the aorta. The left main divides into the LAD and the circumflex." },
          { text: "It carries blood from the heart muscle back to the right atrium", why: "That's the job of the coronary veins, which drain into the coronary sinus and then the right atrium." }
        ],
        hints: [
          "Which chamber does the left coronary system mainly supply — and how important is that chamber?"
        ],
        explain: [
          "The **right and left coronary arteries** branch from the ascending aorta. The **left main** divides into the **left anterior descending (LAD)** and the **circumflex**, which mainly supply the left atrium and ventricle; the **right coronary artery (RCA)** mainly supplies the right atrium and ventricle.",
          "The lecture names **thrombosis of the LAD as the most common location of a heart attack** (the right coronary artery is close behind). Because the LAD feeds so much of the left ventricle, a blockage near its start (proximal, like his) causes a large and often fatal heart attack — hence the nickname “widow maker”.",
          "His 40 % RCA narrowing is milder: for now it is treated with medicines and lifestyle change."
        ]
      },
      {
        id: "s5",
        update: {
          title: "A week later",
          text: [
            "During the same catheterization, the cardiologist widened his LAD with a balloon and left a stent in place. Mr. Kowalski has been referred to cardiac rehab — and is back with you for his knee.",
            { quote: "They put a little spring in my artery. So now it's fixed for good, right?", by: "Mr. Kowalski" }
          ]
        },
        type: "single",
        prompt: "What does the stent actually do?",
        options: [
          { text: "Props the widened artery open, so it's less likely to narrow again", correct: true, why: "Yes. The balloon widens the narrowed segment; the stent — a small metal mesh tube — stays behind to prop it open and reduce the chance of restenosis (narrowing again)." },
          { text: "Dissolves the plaque so the artery wall heals completely", why: "Neither the balloon nor the stent removes plaque — they press it against the artery wall. The disease is still there, in this artery and in others, which is why his risk factors still matter." },
          { text: "Reroutes blood around the blockage through a vein taken from his leg", why: "That's coronary artery bypass graft surgery (CABG), which uses the saphenous vein, the internal thoracic (mammary) artery or the radial artery to carry blood around a blockage." },
          { text: "Paces his heart if its rate drops too low", why: "That's a pacemaker, which treats slow heart rates and conduction problems." }
        ],
        hints: [
          "The balloon widens the artery. What's left behind to keep it that way?"
        ],
        explain: [
          "**Balloon angioplasty** widens a narrowed artery from the inside, and is usually combined with a **stent** to prop it open and decrease restenosis. **CABG** instead bypasses blockages with a graft (the saphenous vein, the internal thoracic/mammary artery or the radial artery).",
          "A stent fixes one narrowing, not the disease. Mr. Kowalski will take antiplatelet medicines to stop clots forming in the stent — so watch for bleeding and bruising — and he still needs to quit smoking, get active and manage his stress.",
          "**Next:** a multiphase **cardiac rehabilitation** program, with his knee exercises alongside it."
        ]
      }
    ],
    debrief: {
      diagnosis: "Coronary artery disease — 85 % proximal LAD narrowing, treated with angioplasty and a stent",
      summary: [
        "Mr. Kowalski's two months of breathlessness and fatigue on the stairs were not just being out of shape: partly blocked coronary arteries were limiting blood flow whenever his heart worked harder. Coronary angiography mapped the plaque — a severe narrowing in the proximal LAD, the “widow maker” — and a stent now props it open.",
        "Your report started it all: new symptoms on exertion in a patient with risk factors always go to the supervising PT."
      ],
      takeaways: [
        "CAD is atherosclerotic plaque in the coronary arteries; it develops slowly and is often silent for years.",
        "Partial blockage can first show up as breathlessness, weakness or angina on exertion — and sometimes the first sign is a heart attack.",
        "The modifiable risk factors on the slide: smoking, inactivity, alcohol abuse and stress.",
        "Cardiac catheterization with coronary angiography is the most accurate test for where CAD is and how severe it is.",
        "A stent props an artery open after angioplasty; CABG bypasses a blockage with a vein or artery graft."
      ],
      sources: [
        "L2 s16–19 · Coronary artery disease",
        "L2 s28 · The LAD, the “widow maker”",
        "L1 s48–49 · Angiography and cardiac catheterization",
        "L1 s61–66 · Angioplasty, stent and CABG"
      ]
    },
    casebook: ["cad", "procedures", "diagnostic-tests", "angina", "cardiac-rehab"]
  });

  // ---------------------------------------------------------------------------------------
  // 2.3 Chest Pain at Rest — unstable angina, an emergency (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "coronary-chest-pain-at-rest",
    unit: "coronary",
    order: 3,
    difficulty: "medium",
    title: "Chest Pain at Rest",
    teaser: "Her angina usually behaves. This morning it woke her up — and it isn't leaving.",
    patient: { name: "Lorraine Whitaker", age: 69, sex: "F" },
    setting: "Inpatient rehabilitation unit",
    file: {
      referral: [
        "**Referral:** inpatient rehab, day 4 after a right total knee replacement — gait training with a walker, knee range of motion and strengthening, twice a day.",
        "You arrive at 7:41 a.m. for her 7:45 session. Her nurse has just written a note."
      ],
      history: {
        list: [
          "**Coronary artery disease** with **stable angina** for 5 years: chest pressure when she hurries uphill or carries heavy bags, gone within 5 minutes of rest. A stent in her right coronary artery 5 years ago.",
          "**Past medical history:** high blood pressure; high cholesterol; osteoarthritis of both knees.",
          "**Rehab so far:** walking 150 feet with a walker; no chest symptoms in any session.",
          "**Social:** retired librarian; lives with her husband; has never smoked."
        ]
      },
      medications: [
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Metoprolol succinate", dose: "50 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" },
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Enoxaparin", dose: "40 mg under the skin once a day" },
        { name: "Oxycodone", dose: "5 mg every 4 hours as needed for knee pain" },
        { name: "Nitroglycerin", dose: "0.4 mg under the tongue as needed for chest pain (given by nursing)" }
      ],
      allergies: "Codeine (nausea)",
      vitals: { hr: 98, bp: "150/92", rr: 20, spo2: 96, temp: "98.8 °F", pain: "chest pressure 6/10" },
      exam: {
        list: [
          "Lying in bed, pale and sweaty, one hand pressed flat on her chest.",
          "Breathing a little fast but speaking in full sentences; lungs clear.",
          "Calves soft and not tender; right knee incision clean."
        ]
      },
      tests: [
        {
          id: "nursing-note", type: "note", title: "Nursing note — this morning", author: "Ben Okoye, RN",
          text: [
            "**7:15** — Woke with pressure in the center of her chest, spreading to her left shoulder. Says it is “like my angina, but it came on lying still and it isn't going away.”",
            "**7:30** — Nitroglycerin 0.4 mg under the tongue, as ordered.",
            "**7:40** — No relief. Pressure 6/10, sweaty. HR 98, BP 150/92, SpO2 96 %. Paging the physician."
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Read the nursing note. Which kind of angina does this episode fit?",
        options: [
          { text: "Unstable angina", correct: true, why: "Yes. It began at rest with no trigger, has lasted 25 minutes and hasn't responded to nitroglycerin — the features of unstable angina. (A heart attack can look exactly the same at the bedside.)" },
          { text: "Stable angina — the kind she has had for five years", why: "Her usual angina comes with exertion and goes within 5 minutes of rest. This came on while she lay still and isn't going away. A change from the usual pattern is itself a warning sign." },
          { text: "Pain from her knee surgery, referred to her chest", why: "Knee pain doesn't refer to the chest. Pressure in the center of the chest spreading to the left shoulder is the pattern of cardiac ischemia." },
          { text: "A chest-wall muscle strain from using the walker", why: "A strained muscle hurts when it's pressed or moved. This is a deep pressure that started at rest, with sweating — not a sore muscle." }
        ],
        hints: [
          "Compare this episode with her usual angina: what brought it on, how long has it lasted, and did nitroglycerin work?"
        ],
        explain: [
          {
            table: {
              head: ["Feature", "Stable angina", "Unstable angina"],
              rows: [
                ["Brought on by", "Exertion, stress, cold weather, large meals — predictably", "Nothing obvious; often at rest"],
                ["Lasts", "Usually 15 minutes or less", "Longer, or keeps coming back"],
                ["Rest or nitroglycerin", "Relieves it", "Often doesn't"]
              ]
            }
          },
          "Unstable angina is the more serious kind: it occurs without a cause and is often unresponsive to nitroglycerin."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Hold the session, stay with her, and make sure the rapid response team is called now", correct: true, why: "Yes. Chest pain at rest that nitroglycerin hasn't relieved is an emergency. Don't start therapy; stay with her; have her nurse activate the rapid response team (in most hospitals any staff member, you included, can call it); keep her resting and monitor her; then notify Dr. Okafor." },
          { text: "Help her take a second nitroglycerin tablet, then start the session if the pain eases", why: "A PTA doesn't give medications — her nurse does, under the physician's orders. And waiting to see whether a second tablet works delays emergency care." },
          { text: "Let her rest, and come back in an hour to try the session again", why: "Leaving her alone with unrelieved chest pain is unsafe. Unstable angina can turn into a heart attack — get help now." },
          { text: "Get her up into the chair — moving around often eases this kind of pain", why: "Activity increases her heart's demand for oxygen. She should stay at rest in a comfortable position, propped up if that makes breathing easier." }
        ],
        hints: [
          "Is this a “tell the PT later” finding or a “get help now” finding?"
        ],
        explain: [
          "**Chest pain at rest, or chest pain not relieved by nitroglycerin, is an emergency.** In hospital: stay with the patient, activate the rapid response team, keep her at rest and monitor her. Outside a hospital: call 911.",
          "Current American Heart Association advice: if chest pain is not better 5 minutes after the first nitroglycerin, call 911. Mrs. Whitaker is 10 minutes past hers and still in pain.",
          "Then notify the supervising PT. Today's therapy waits until the medical team says it's safe."
        ]
      },
      {
        id: "s3",
        type: "multi",
        prompt: "Which features of this episode mark it as unstable rather than stable angina? Select all that apply.",
        options: [
          { text: "It started at rest, while she was lying in bed", correct: true, why: "Yes. Stable angina is brought on by exertion or another trigger; unstable angina occurs without one, often at rest." },
          { text: "It has lasted 25 minutes", correct: true, why: "Yes. Stable angina typically lasts 15 minutes or less." },
          { text: "Nitroglycerin didn't relieve it", correct: true, why: "Yes. Stable angina is relieved by rest or nitroglycerin; unstable angina often isn't." },
          { text: "The pressure is in the center of her chest", why: "Both kinds feel the same: pressure, tightness or squeezing in the center of the chest. Location can't tell them apart." },
          { text: "It spreads to her left shoulder", why: "Spreading to the left shoulder, arm, back, neck or jaw happens with both kinds of angina." },
          { text: "She has had stable angina for five years", why: "Her history doesn't make this episode unstable — the episode's own features do. (Though people with known CAD are the ones most at risk.)" }
        ],
        hints: [
          "Features that both kinds of angina share can't tell them apart. Look for what's different from her usual pattern."
        ],
        explain: [
          "**Unstable angina:** occurs without cause (often at rest), lasts longer than stable angina's usual 15 minutes or less, and is often unresponsive to nitroglycerin.",
          "Both kinds feel the same — pressure, tightness, fullness or squeezing in the center of the chest, often spreading to the left arm, shoulder, back, neck or jaw — so it's the **pattern**, not the feeling, that matters."
        ]
      },
      {
        id: "s4",
        update: {
          title: "The rapid response team arrives",
          text: "Within minutes the team is at her bedside and records a 12-lead ECG. The physician shows you lead V3.",
          vitals: { hr: 96, bp: "146/90", rr: 20, spo2: 96, pain: "chest pressure 5/10" },
          exhibits: [
            {
              id: "ecg-v3", type: "ecg", title: "12-lead ECG — lead V3",
              rhythm: "nsr", rate: 96, lead: "V3", seed: 2301, tWave: "inverted",
              caption: "The same change appears in V2–V5. Her ECG on admission showed upright T waves in these leads."
            }
          ]
        },
        type: "single",
        prompt: "What does lead V3 show?",
        options: [
          { text: "Inverted T waves — a sign of myocardial ischemia", correct: true, why: "Yes. Her T waves now point downward where they were upright before. T-wave inversion is the ECG sign of ischemia — and in V2–V6 it is always abnormal." },
          { text: "ST elevation — injury from a heart attack in progress", why: "The ST segment sits on the baseline. ST elevation would mark the zone of injury — an evolving heart attack (a STEMI)." },
          { text: "Pathological Q waves — an old, completed heart attack", why: "There are no deep, wide Q waves. Pathological Q waves mean dead, electrically silent muscle from an infarction." },
          { text: "A normal ECG — so the problem must be something other than her heart", why: "Upside-down T waves are not normal in V3. (And even a normal ECG wouldn't rule out unstable angina: the history matters most.)" }
        ],
        hints: [
          "Look at the last wave of each beat. Which way does it point — and which way should it point in V3?"
        ],
        explain: [
          "**Inverted T waves = ischemia.** A 12-lead ECG is the most common test for angina; T-wave inversion in V2–V6 is always abnormal (in the limb leads it can be a normal variant).",
          "Unstable angina may show T-wave inversion, ST depression or a normal ECG. Blood tests for **troponin** then show whether any heart muscle has actually died — which would make it a heart attack (a non-ST-elevation MI, or NSTEMI)."
        ]
      },
      {
        id: "s5",
        type: "single",
        prompt: "Why is unstable angina treated as an emergency?",
        options: [
          { text: "It can progress to a heart attack — it is often the warning in the days before one", correct: true, why: "Yes. In unstable angina a coronary plaque has usually become unstable and a clot may be forming on it. About two in three people who have a heart attack had warning symptoms such as unstable angina in the days or weeks before." },
          { text: "It means part of her heart muscle has already died", why: "If heart muscle has died, it's a heart attack (myocardial infarction). In unstable angina the muscle is starved of oxygen but not yet dead — which is exactly why fast treatment matters." },
          { text: "Its pain is always more severe than the pain of a heart attack", why: "Severity doesn't separate them: the pain of unstable angina and of a heart attack can be identical. Treat both as an emergency." },
          { text: "It always turns into a heart attack within the hour", why: "It doesn't always progress — but no one can predict which episodes will, or when. That uncertainty is why it's treated as an emergency." }
        ],
        hints: [
          "What can unstable angina turn into?"
        ],
        explain: [
          "**Unstable angina is a warning sign of a heart attack.** About 2 in 3 people who have an MI had symptoms such as unstable angina, shortness of breath or fatigue in the days to weeks before it.",
          "Unstable angina and MI together are called **acute coronary syndrome**; Levine's sign — a clenched fist over the chest — is seen in both.",
          "Mrs. Whitaker was moved to the cardiac unit for monitoring, medicines and testing. Her knee rehab resumes when cardiology clears her."
        ]
      }
    ],
    debrief: {
      diagnosis: "Unstable angina — an emergency, handed over to the rapid response team",
      summary: [
        "Mrs. Whitaker's chest pressure began at rest, had lasted 25 minutes and didn't respond to nitroglycerin — unstable angina, not her usual stable pattern. Her 12-lead ECG showed new T-wave inversion in V2–V5, the sign of ischemia.",
        "You held the session, stayed with her and made sure the rapid response team was called: unstable angina can progress to a heart attack, and only the ECG and troponin tests can tell the two apart."
      ],
      takeaways: [
        "Stable angina: brought on by exertion, stress, cold or a big meal; lasts 15 minutes or less; relieved by rest or nitroglycerin.",
        "Unstable angina: at rest or without a cause, lasts longer, often not relieved by nitroglycerin — any change from the usual pattern is a red flag.",
        "Chest pain at rest, or not relieved by nitroglycerin, is an emergency: stay, get help (rapid response in hospital, 911 outside), keep the patient resting, notify the PT.",
        "Inverted T waves mean ischemia (always abnormal in V2–V6); ST elevation means injury; Q waves mean infarction.",
        "PTAs don't give medications — the nurse does; outpatients take their own prescribed nitroglycerin."
      ],
      sources: [
        "L2 s6–8 · Stable and unstable angina",
        "L2 s9 · Ischemia and inverted T waves",
        "L2 s11 · Levine's sign",
        "L2 s30 · Warning symptoms before an MI",
        "L1 s20 · Selected ECG abnormalities"
      ]
    },
    casebook: ["angina", "mi", "warning-signs", "nitrates"]
  });

  // ---------------------------------------------------------------------------------------
  // 2.4 The Blunted Pulse — beta blocker, antiplatelets, statin and orthostatic hypotension
  //     in phase II cardiac rehab (medium)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "coronary-blunted-pulse",
    unit: "coronary",
    order: 4,
    difficulty: "medium",
    title: "The Blunted Pulse",
    teaser: "The treadmill feels like hard work — so why does the monitor say his heart is barely trying?",
    patient: { name: "Marcus Bell", age: 58, sex: "M" },
    setting: "Cardiac rehabilitation gym (outpatient)",
    file: {
      referral: [
        "**Referral:** phase II cardiac rehabilitation, 4 weeks after a myocardial infarction treated with a stent in the left circumflex artery. Exercise prescription by the supervising PT. Sessions monitored with telemetry.",
        { quote: "The treadmill feels like hard work, but your monitor says my heart's barely trying. Is that thing broken?", by: "Mr. Bell" }
      ],
      history: {
        list: [
          "**Four weeks ago:** heart attack; emergency angioplasty and a stent; home after 3 days.",
          "**Past medical history:** high blood pressure; high cholesterol. No diabetes.",
          "**Rehab:** today is his third session.",
          "**Social:** high-school chemistry teacher; quit smoking after the heart attack; wants to get back to coaching tennis."
        ]
      },
      medications: [
        { name: "Metoprolol tartrate (Lopressor)", dose: "50 mg twice a day" },
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Clopidogrel (Plavix)", dose: "75 mg once a day" },
        { name: "Atorvastatin (Lipitor)", dose: "80 mg at night — started in the hospital 4 weeks ago" },
        { name: "Lisinopril", dose: "10 mg once a day" },
        { name: "Nitroglycerin", dose: "0.4 mg under the tongue as needed for chest pain (he carries it)" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 58, bp: "118/74", rr: 14, spo2: 98, rpe: 6, rhythm: "regular" },
      exam: {
        list: [
          "Small bruises on both forearms and one on his left shin: “I bump into things and they just bloom.”",
          "Right wrist: healed puncture site from the catheterization.",
          "Lungs clear; no ankle swelling."
        ]
      },
      tests: [
        {
          id: "session-log", type: "table", title: "Today's session log (treadmill)",
          head: ["Time", "Workload", "HR (beats/min)", "BP (mmHg)", "RPE (6–20)", "Notes"],
          rows: [
            ["Rest", "seated", "58", "118/74", "6", "sinus rhythm"],
            ["Warm-up, 5 min", "2.0 mph, flat", "70", "128/76", "9", "—"],
            ["10 min", "3.0 mph, 2 % grade", "78", "136/78", "13", "—"],
            ["15 min", "3.2 mph, 4 % grade", "84", "142/80", "15", "breathing hard; talks in short phrases"],
            ["Cool-down, 3 min", "2.0 mph, flat", "72", "130/76", "10", "no chest pain at any point"]
          ],
          note: "Telemetry: sinus rhythm throughout; no ST-segment changes; no early beats."
        }
      ]
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "His heart rate rose only from 58 to 84 while he rated the work 15 — “hard”. What best explains the small rise?",
        options: [
          { text: "His metoprolol, a beta blocker, is blunting his heart-rate response", correct: true, why: "Yes. Beta blockers block the receptors through which epinephrine and norepinephrine speed up the heart, so heart rate and blood pressure rise much less with exercise. The work is still hard for his muscles and lungs." },
          { text: "He isn't really working that hard — he's overstating his effort on the scale", why: "His breathing — short phrases at 15 minutes — matches a “hard” rating. With a beta blocker it's the heart rate that misleads, not his RPE." },
          { text: "His heart attack has damaged his SA node", why: "His rate does rise with exercise and his rhythm is sinus throughout. The pattern fits a medication effect, not a damaged pacemaker." },
          { text: "His clopidogrel is slowing his heart rate", why: "Clopidogrel is an antiplatelet: it stops platelets from clumping. It doesn't change the heart rate." }
        ],
        hints: [
          "Look up his medicines in the Casebook. Which drug class lowers heart rate and contractility?"
        ],
        explain: [
          "**Beta blockers** (metoprolol, atenolol) lower the heart's oxygen demand by decreasing **heart rate and contractility**. The PT implication: **heart rate and blood pressure responses to exercise are diminished**.",
          "That's protective after a heart attack — but it means a heart-rate target (such as a percentage of 220 minus age) is not a reliable guide to how hard he's working."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "How should you judge his exercise intensity from now on?",
        options: [
          { text: "With his rating of perceived exertion, kept in the range Dr. Okafor sets", correct: true, why: "Yes. The Borg RPE scale (6–20) reflects how hard his whole body is working, and the beta blocker doesn't distort it. Dr. Okafor sets his range; you keep him in it, while still watching his symptoms, blood pressure and rhythm." },
          { text: "With a target heart rate of 85 % of 220 minus his age", why: "That target is about 138. On metoprolol his heart rate may never get there — chasing it would push him far beyond a safe intensity." },
          { text: "By his oxygen saturation — keeping it above 95 %", why: "Oxygen saturation tells you about oxygen in the blood, not how hard he's working. In most heart patients it stays normal during exercise." },
          { text: "By asking him to skip his morning metoprolol on rehab days so his heart rate responds", why: "Never. A PTA doesn't tell patients to change their medications — and missing a beta blocker after a heart attack is dangerous." }
        ],
        hints: [
          "If his heart rate can't tell you how hard he's working, who can?"
        ],
        explain: [
          "The **rating of perceived exertion (RPE)** is the lecture's tool for patients on beta blockers. On the **Borg 6–20 scale**, 11 is “light”, 13 “somewhat hard” and 15 “hard”.",
          "Dr. Okafor sets his range at **RPE 11–13**. Today he reached 15 on the last stage — so next session the grade stays lower, even though his heart rate looks “low”.",
          "Keep monitoring heart rate, blood pressure, rhythm and symptoms too: the beta blocker blunts their rise, but a falling blood pressure or new symptoms still mean stop."
        ]
      },
      {
        id: "s3",
        type: "multi",
        prompt: "He takes aspirin **and** clopidogrel. Which precautions apply? Select all that apply.",
        options: [
          { text: "Protect him from bumps, scrapes and falls during exercise", correct: true, why: "Yes. Two antiplatelets together raise the bleeding risk: injuries bleed and bruise more easily." },
          { text: "Teach him to report nosebleeds that won't stop, blood in his urine or black stools", correct: true, why: "Yes. Educating the patient about side effects to report is part of the lecture's PT implications; bleeding in the gut shows up as black stools." },
          { text: "Use only gentle pressure for any manual techniques", correct: true, why: "Yes. Firm or deep pressure can leave large bruises." },
          { text: "Tell him he can stop the clopidogrel if the bruising bothers him", why: "Never. Stopping clopidogrel early after a stent can let a clot form inside the stent and cause another heart attack. Questions about bruising go to his physician." },
          { text: "Avoid aerobic exercise until he has finished the clopidogrel", why: "Exercise is the whole point of cardiac rehab. The precautions are about avoiding injury, not activity." }
        ],
        hints: [
          "Both drugs stop platelets from clumping. What happens when he bumps his shin?"
        ],
        explain: [
          "**Antiplatelet agents** (aspirin, clopidogrel) inhibit platelet aggregation and clot formation — which protects his new stent. Side effects: hemorrhage, thrombocytopenia (low platelets), possible liver toxicity and stomach upset.",
          "**PT implications:** avoid injury (excessive bleeding and bruising), and educate the patient about the side effects to report. Taking two together — dual antiplatelet therapy — raises the bleeding risk further.",
          "The small bruises on his arms and shin are expected. A large or unexplained bruise, black stools or blood in the urine get reported the same day."
        ]
      },
      {
        id: "s4",
        update: {
          title: "Session 6",
          text: [
            { quote: "My thighs have ached all week — both of them, even when I'm sitting still.", by: "Mr. Bell" },
            "Nothing in his program has changed. The aches began a few weeks after he started atorvastatin in the hospital."
          ]
        },
        type: "single",
        prompt: "What should you do about the thigh aches?",
        options: [
          { text: "Report them to Dr. Okafor — muscle aches can be a statin side effect", correct: true, why: "Yes. Myalgia (muscle aches) is a listed side effect of statins. Report it so his physician can decide what to do — and ask about weakness or dark urine, which would make it urgent." },
          { text: "Tell him to stop the atorvastatin until the aches go away", why: "A PTA never tells a patient to stop a medication. Statins protect him from another heart attack; only his physician can change the dose or the drug." },
          { text: "Treat them as normal post-exercise soreness and add more leg strengthening", why: "Exercise soreness follows a new or harder workout and fades within a few days. These aches are in both thighs, at rest, with no change in his program." },
          { text: "Call 911 — the clopidogrel may be causing bleeding into both thighs", why: "Bleeding into a muscle causes swelling, bruising and a tense, tender area — usually on one side, often after an injury. Matching aches in both thighs at rest point elsewhere." }
        ],
        hints: [
          "Which of his medicines lists muscle aches (myalgia) as a side effect?"
        ],
        explain: [
          "**Statins** (atorvastatin, simvastatin) lower LDL and triglycerides and raise HDL. Side effects: headache, stomach upset, **myalgia** and rash.",
          "New muscle aches in someone taking a statin should be reported to the supervising PT, who contacts the physician. Rarely, statins cause serious muscle breakdown: **muscle weakness or dark, cola-colored urine** needs medical attention the same day.",
          "Exercise helps the drug: aerobic training raises HDL and adds to its effect."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Session 8 — after the mat exercises",
          text: [
            "After 5 minutes of exercises lying on the mat, Mr. Bell gets up quickly and grabs the parallel bar.",
            { quote: "Whoa — the room's going gray.", by: "Mr. Bell" },
            "Lying on the mat his blood pressure was 124/78 with a heart rate of 62. Standing now: 96/60, heart rate 70. No chest pain."
          ],
          vitals: { hr: 70, bp: "96/60", rr: 16, spo2: 98 }
        },
        type: "single",
        prompt: "What's happening, and what do you do?",
        options: [
          { text: "Orthostatic hypotension — sit him down, monitor until it settles, report it", correct: true, why: "Yes. His systolic pressure fell 28 mmHg on standing, with dizziness: orthostatic hypotension. Sit (or lie) him down, recheck his blood pressure until it recovers and he feels normal, then tell Dr. Okafor." },
          { text: "His stent has suddenly blocked — call 911 and start chest compressions", why: "He's awake and talking, with no chest pain, and his symptoms came the instant he stood up. Chest compressions are only for someone who is unresponsive and not breathing normally." },
          { text: "Low blood sugar from the exercise — give him juice and carry on with standing work", why: "He doesn't have diabetes, and his symptoms began the moment he stood: a position change, not a sugar problem. Carrying on standing would risk a fall." },
          { text: "Dehydration — have him drink water and stand straight back up", why: "Water won't fix it in time, and standing straight back up invites a faint and a fall. He needs to sit and recover first." }
        ],
        hints: [
          "Compare his lying and standing blood pressures. What do several of his medicines do to blood pressure when he stands up?"
        ],
        explain: [
          "**Orthostatic hypotension** is a drop in blood pressure on standing — by the usual definition a fall of **20 mmHg or more systolic, or 10 mmHg or more diastolic** — causing dizziness, graying vision or fainting. His fell 28/18.",
          "Several of his medicines make it more likely: the **beta blocker** (it also stops his heart rate from rising to compensate — only 62 → 70), the **ACE inhibitor** (avoid sudden changes in posture) and **nitroglycerin** if he has taken it.",
          "**Prevent it:** move from lying to sitting, pause, pump the ankles a few times, then stand slowly, with you close by."
        ]
      }
    ],
    debrief: {
      diagnosis: "Phase II cardiac rehab after an MI and stent: beta-blocker, antiplatelet and statin effects, and orthostatic hypotension",
      summary: [
        "Mr. Bell's heart rate barely rose on the treadmill because metoprolol blunts the heart-rate and blood-pressure response to exercise, so his intensity is guided by RPE within the range Dr. Okafor set.",
        "Aspirin plus clopidogrel protect his stent but make him bleed and bruise easily; his new thigh aches needed reporting as a possible statin side effect; and getting up quickly from the mat dropped his blood pressure — orthostatic hypotension."
      ],
      takeaways: [
        "Beta blockers blunt heart-rate and blood-pressure responses to exercise — use RPE (Borg 6–20) within the PT's range.",
        "Antiplatelets (aspirin, clopidogrel): prevent injury, use gentle manual pressure, and teach the bleeding signs to report.",
        "Statins can cause myalgia: report new muscle aches; weakness or dark urine is urgent.",
        "Orthostatic hypotension: sit or lie the patient down, monitor until recovered, report; prevent it with slow, staged position changes.",
        "Never tell a patient to stop or skip a medication — questions go to the physician through the supervising PT."
      ],
      sources: [
        "L1 s52 · ACE inhibitors",
        "L1 s54 · Antihyperlipidemics (statins)",
        "L1 s55 · Antiplatelet agents",
        "L1 s56 · Beta blockers",
        "L2 s32–33 · MI management and cardiac rehabilitation"
      ]
    },
    casebook: ["beta-blockers", "antiplatelets", "statins", "cardiac-rehab", "ace-inhibitors", "mi"]
  });

  // ---------------------------------------------------------------------------------------
  // 2.5 The Quiet Heart Attack — atypical MI in a woman with diabetes; STEMI; zones;
  //     LAD; troponin (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "coronary-quiet-heart-attack",
    unit: "coronary",
    order: 5,
    difficulty: "hard",
    title: "The Quiet Heart Attack",
    teaser: "No chest pain. Just “feeling off” — and a session she'd rather not cancel.",
    patient: { name: "Denise Carter", age: 64, sex: "F" },
    setting: "Outpatient physical therapy clinic",
    file: {
      referral: [
        "**Referral:** osteoarthritis of both knees — strengthening and a walking program. From her primary care physician. Today is her fourth visit.",
        { quote: "I just feel… off. Queasy since breakfast, my jaw aches, and there's this ache between my shoulder blades. I took an antacid. It's probably nothing — let's just do my knees.", by: "Mrs. Carter" }
      ],
      history: {
        list: [
          "**Since this morning:** nausea; unusual tiredness; an aching jaw and a dull ache between her shoulder blades; breathless walking in from the parking lot, which is normally no problem. Two antacid tablets at 9:00 “took the edge off”. No chest pain.",
          "**Past medical history:** type 2 diabetes for 12 years, with numbness in both feet (neuropathy); high blood pressure; high cholesterol.",
          "**Her usual vital signs at this clinic:** BP about 138/82, HR about 76.",
          "**Social:** retired postal clerk; quit smoking 8 years ago; lives with her sister."
        ]
      },
      medications: [
        { name: "Metformin", dose: "1,000 mg twice a day" },
        { name: "Lisinopril", dose: "20 mg once a day" },
        { name: "Atorvastatin", dose: "40 mg once a day" }
      ],
      allergies: "No known drug allergies",
      vitals: {
        hr: 106, bp: "102/64", rr: 22, spo2: 94, temp: "98.2 °F", pain: "jaw and upper back ache 4/10",
        other: [{ label: "Blood glucose (her own meter, 10:15 a.m.)", value: "156 mg/dL" }]
      },
      exam: {
        list: [
          "Pale, clammy skin with beads of sweat on her forehead; anxious, keeps shifting in the chair.",
          "Pulse fast and regular.",
          "Breathing a little fast; lungs clear; no ankle swelling.",
          "Jaw and upper back: not tender when pressed; moving her neck and shoulders doesn't change the ache."
        ]
      },
      tests: []
    },
    steps: [
      {
        id: "s1",
        type: "single",
        prompt: "Her knees can wait. Which condition must be ruled out first?",
        options: [
          { text: "A heart attack (myocardial infarction)", correct: true, why: "Yes. Nausea, unusual fatigue, jaw and between-the-shoulder-blades pain, breathlessness, sweating, a fast pulse and a blood pressure well below her usual — in a woman with diabetes — is a heart attack until proven otherwise." },
          { text: "Indigestion — the antacid helped", why: "Pain that seems relieved by antacids is on the lecture's list of atypical heart-attack signs. Indigestion doesn't explain the sweating, breathlessness, fast pulse and low blood pressure." },
          { text: "Low blood sugar from her diabetes medicine", why: "Her meter read 156 mg/dL a few minutes ago, and metformin on its own rarely causes lows. Low blood sugar also doesn't explain jaw and back pain." },
          { text: "A strained muscle between her shoulder blades", why: "Pressing and moving don't change the ache — they would with a muscle strain. And a strain doesn't make you sweaty, pale and breathless." },
          { text: "The flu or another viral illness", why: "Flu-like symptoms without chest pain are themselves an atypical heart-attack sign — and she has no fever. Assuming flu could be fatal." }
        ],
        hints: [
          "Which explanation would be the most dangerous one to miss?",
          "Check the lecture's list of atypical heart-attack signs — especially in women."
        ],
        explain: [
          "**Atypical heart-attack signs** (especially in women): unusual chest, stomach or abdominal pain; continuous pain in the mid-back (between the shoulder blades), neck or shoulder; pain relieved by antacids; nausea, vomiting or flu-like symptoms without chest pain; unexplained intense anxiety, weakness or fatigue; breathlessness; dizziness.",
          "**Diabetes** can damage the nerves that carry pain from the heart, so a heart attack may cause little or no pain — some are completely **silent**.",
          "Her vital signs back it up: a fast pulse, a blood pressure 36 mmHg below her usual, fast breathing and an oxygen saturation of 94 %."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Call 911 now, keep her at rest, stay with her and monitor her", correct: true, why: "Yes. Activate EMS at once. Keep her sitting or resting in whatever position is comfortable, stay with her, monitor her vital signs, have the AED nearby and send someone for Dr. Okafor. Have her medication list ready for the paramedics." },
          { text: "Drive her to the emergency department yourself — it's only ten minutes away", why: "Never drive a possible heart attack yourself. Paramedics can record and transmit a 12-lead ECG, treat a dangerous rhythm on the way and alert the hospital — and she could collapse in your car." },
          { text: "Call her primary care physician's office for a same-day appointment", why: "A same-day appointment is hours too late. “Time is muscle”: every minute an artery stays blocked, more heart muscle dies." },
          { text: "Have her lie down for 20 minutes, then reassess before deciding", why: "Waiting wastes the minutes that matter most. Heart-attack symptoms that last more than a few minutes call for 911 now." },
          { text: "Give her aspirin and nitroglycerin from the clinic's first-aid kit", why: "PTAs don't give medications. The 911 dispatcher or the paramedics may tell her to chew an aspirin — that's their decision." }
        ],
        hints: [
          "This is an emergency. Who should get her to the hospital — and how fast?"
        ],
        explain: [
          "**Suspected heart attack: call 911 immediately.** Don't drive her, don't wait to see if it passes, don't give medication. Stay with her, keep her at rest, and monitor.",
          "If she becomes unresponsive and isn't breathing normally: start CPR and use the AED — every PTA is trained in both.",
          { tip: "Note when her symptoms started (this morning) and what she has taken (two antacids). The paramedics will ask." }
        ]
      },
      {
        id: "s3",
        update: {
          title: "The paramedics arrive",
          text: "Eight minutes later the paramedics are with her. They record a 12-lead ECG in the treatment room and show you lead V2.",
          vitals: { hr: 104, bp: "100/62", rr: 22, spo2: 94 },
          exhibits: [
            {
              id: "ems-ecg", type: "ecg", title: "Paramedics' 12-lead ECG — lead V2",
              rhythm: "sinus-tach", rate: 104, lead: "V2", seed: 2501, st: "elevation", stMm: 3,
              caption: "The paramedics report the same change in leads V1–V4."
            }
          ]
        },
        type: "single",
        prompt: "What does lead V2 show?",
        options: [
          { text: "ST elevation — injury: a heart attack in progress", correct: true, why: "Yes. The ST segment is raised about 3 mm above the baseline. ST elevation marks the zone of injury — an infarction happening now. In several neighboring leads it means an ST-elevation MI (STEMI)." },
          { text: "Downsloping ST depression — ischemia only, so it can wait", why: "The ST segment is raised, not depressed. (And ischemia with symptoms like hers couldn't wait either.)" },
          { text: "Inverted T waves — ischemia without injury", why: "Her T waves are upright. Look at the ST segment: it sits well above the baseline." },
          { text: "Pathological Q waves — an old, completed heart attack", why: "No deep, wide Q waves are visible yet; they can develop over the hours that follow as muscle dies. ST elevation is the sign of injury happening now." }
        ],
        hints: [
          "Look at the stretch between the end of the QRS and the T wave. Where does it sit compared with the baseline?"
        ],
        explain: [
          "**ST elevation = injury** — a new infarct. ST elevation in V1–V4 points to the front (anterior) wall of the left ventricle. Her heart rate of 104 is a sinus tachycardia.",
          "A **transmural** infarction (through the full thickness of the wall) usually shows ST elevation — a **STEMI**, or Q-wave MI. A **subendocardial** infarction (the inner third of the wall) usually doesn't — a non-ST-elevation MI, or **NSTEMI**.",
          "The paramedics send the ECG ahead, so the catheterization team is waiting when she arrives."
        ]
      },
      {
        id: "s4",
        type: "classify",
        prompt: "As the ambulance leaves, Dr. Okafor sketches the zones of a heart attack on a notepad. Match each feature to its zone.",
        categories: ["Zone of ischemia", "Zone of injury", "Zone of infarction"],
        items: [
          { text: "T-wave inversion", category: 0, why: "Ischemic cells are short of oxygen but still alive; on the ECG they invert the T wave." },
          { text: "ST elevation", category: 1, why: "Injured tissue is electrically unstable; on the ECG it raises the ST segment in the leads over it." },
          { text: "Pathological Q waves", category: 2, why: "Dead tissue is electrically inert, which shows up as pathological Q waves." },
          { text: "Necrotic tissue at the center that can no longer contract", category: 2, why: "That's the infarction itself: necrosis." },
          { text: "The outer ring: cells short of oxygen but still alive", category: 0, why: "The zone of ischemia is the outermost area." },
          { text: "Non-contractile, electrically unstable cells right next to the dead center", category: 1, why: "The zone of injury lies immediately around the infarction." }
        ],
        hints: [
          "Picture a target: dead muscle in the bull's-eye, injured muscle around it, ischemic muscle on the outside."
        ],
        explain: [
          "**Zones of infarction:** the **infarction** — necrotic, non-contractile, electrically inert tissue → pathological **Q waves**; the **injury** zone immediately around it — non-contractile, electrically unstable → **ST elevation**; the outer **ischemia** zone — cells undergoing metabolic changes → **T-wave inversion**.",
          "Fast treatment aims to rescue the injured and ischemic zones before they die too."
        ]
      },
      {
        id: "s5",
        type: "single",
        prompt: "Her changes are in V1–V4, over the front of the left ventricle. Which coronary artery supplies this area?",
        options: [
          { text: "The left anterior descending (LAD) artery", correct: true, why: "Yes. The LAD runs down the front of the heart and supplies the front of the left ventricle — and your lecture names LAD thrombosis as the most common location of a heart attack." },
          { text: "The right coronary artery (RCA)", why: "The RCA mainly supplies the right atrium and ventricle, and usually the underside (inferior wall) of the heart. Its heart attacks show up in other leads (II, III and aVF)." },
          { text: "The left circumflex artery", why: "The circumflex wraps around the side and back of the left ventricle. Its heart attacks show up in other leads (such as I, aVL, V5 and V6), not V1–V4." },
          { text: "The posterior descending artery", why: "The posterior descending artery runs along the underside of the heart, usually as a branch of the right coronary artery." }
        ],
        hints: [
          "It's the artery with the grim nickname."
        ],
        explain: [
          "The **left main coronary artery** divides into the **LAD** and the **circumflex**; the **right coronary artery** gives off a marginal branch and, usually, the posterior descending artery.",
          "The lecture names **LAD thrombosis as the most common site of infarction** (the right coronary artery is close behind). Because the LAD feeds so much of the left ventricle, the main pump, the slide calls it the “widow maker”. The nickname ignores the fact that women have heart attacks too — often atypical ones, like Mrs. Carter's."
        ]
      },
      {
        id: "s6",
        update: {
          title: "That evening",
          text: "The hospital calls Dr. Okafor with an update, and she shares it with you.",
          exhibits: [
            {
              id: "hospital-update", type: "report", title: "Cardiology update",
              text: [
                "**Diagnosis:** acute anterior ST-elevation myocardial infarction (STEMI).",
                "**Emergency catheterization:** the proximal LAD was completely blocked by a clot on a ruptured plaque. Reopened with balloon angioplasty and a stent — 84 minutes after the 911 call.",
                "**Echocardiogram:** the front wall of the left ventricle moves poorly; ejection fraction 45 %.",
                "**Plan:** aspirin and clopidogrel, metoprolol, lisinopril, high-dose atorvastatin; cardiac rehabilitation after discharge."
              ]
            },
            {
              id: "hospital-labs", type: "labs", title: "Blood tests",
              rows: [
                { name: "Troponin T (high-sensitivity), on arrival", value: 52, unit: "ng/L", ref: "under 14", flag: "high" },
                { name: "Troponin T (high-sensitivity), 6 hours later", value: "2,380", unit: "ng/L", ref: "under 14", flag: "high" },
                { name: "Glucose", value: 212, unit: "mg/dL", ref: "70–99 (fasting)", flag: "high" }
              ]
            }
          ]
        },
        type: "single",
        prompt: "Her troponin climbed from 52 to 2,380 ng/L. What does that tell the team?",
        options: [
          { text: "Heart-muscle cells have died — troponin leaks out of damaged heart muscle", correct: true, why: "Yes. Troponin is a protein inside heart-muscle cells. It spills into the blood when they're damaged, and its rise confirms a myocardial infarction. It's today's main blood test for heart-muscle injury." },
          { text: "Her coronary artery is still blocked — troponin measures blood flow", why: "Troponin shows damage, not flow. The catheterization showed the artery, and the stent has already reopened it." },
          { text: "Her diabetes is poorly controlled — troponin tracks blood sugar", why: "Blood sugar is measured as glucose (or hemoglobin A1c for long-term control). Troponin is specific to heart muscle." },
          { text: "Nothing yet — only the CPK, AST and LDH enzymes can confirm a heart attack", why: "Your lecture names creatine phosphokinase (CPK), AST and LDH — older tests that also change after an MI but are less specific to the heart. Troponin has replaced them as the main marker." }
        ],
        hints: [
          "Troponin comes from inside heart-muscle cells. When would it turn up in the blood?"
        ],
        explain: [
          "An MI is diagnosed with the **12-lead ECG** and **blood markers of heart-muscle injury**. Your lecture lists the older enzymes **CPK, AST and LDH**; today **troponin** is the main marker — more sensitive and more specific for heart muscle. A level above the lab's reference range (the exact cut-off depends on the test) that rises — or later falls — confirms the infarction; hers rose more than fortyfold.",
          "Her artery was open 84 minutes after the 911 call because someone recognized an atypical heart attack and called right away instead of waiting."
        ]
      }
    ],
    debrief: {
      diagnosis: "Acute anterior STEMI with an atypical presentation (no chest pain) in a woman with diabetes",
      summary: [
        "Mrs. Carter had no chest pain — just nausea, fatigue, jaw and between-the-shoulder-blades aches, breathlessness, sweating, a racing pulse and a blood pressure well below her usual. In a woman with diabetes, that's a heart attack until proven otherwise.",
        "You called 911 instead of driving her or waiting. The paramedics' ECG showed ST elevation in V1–V4 — injury: an anterior STEMI — the catheterization team reopened her blocked LAD, and a rising troponin confirmed the damage."
      ],
      takeaways: [
        "Heart attacks are often atypical, especially in women and people with diabetes: nausea, fatigue, jaw, neck or mid-back pain, breathlessness, “indigestion” — sometimes no symptoms at all.",
        "Suspected MI: call 911 at once, keep the patient at rest, stay and monitor; don't drive them, don't wait, don't give medications.",
        "ECG and the zones of infarction: T-wave inversion = ischemia, ST elevation = injury, pathological Q waves = infarction.",
        "The LAD supplies the front of the left ventricle; the lecture names it the most common site of infarction (the “widow maker”).",
        "Troponin is today's main blood marker of heart-muscle damage (the lecture lists CPK, AST and LDH)."
      ],
      sources: [
        "L2 s27–29 · Myocardial infarction and the zones of infarction",
        "L2 s30–31 · Clinical presentation and atypical warning signs",
        "L2 s32 · Diagnosis and medical management"
      ]
    },
    casebook: ["mi", "warning-signs", "ecg-basics", "diagnostic-tests"]
  });

  // ---------------------------------------------------------------------------------------
  // 2.6 Trouble on the Treadmill — exercise ischemia and PVCs in cardiac rehab (hard)
  // ---------------------------------------------------------------------------------------
  CCF.defineCase({
    id: "coronary-trouble-on-the-treadmill",
    unit: "coronary",
    order: 6,
    difficulty: "hard",
    title: "Trouble on the Treadmill",
    teaser: "Session 14 was going like the other thirteen — until minute 9 on the treadmill.",
    patient: { name: "Raymond Ortiz", age: 70, sex: "M" },
    setting: "Cardiac rehabilitation gym (outpatient, telemetry)",
    file: {
      referral: [
        "**Referral:** phase II cardiac rehabilitation with telemetry monitoring, 3 months after a stent in the right coronary artery for unstable angina. Today is session 14 of 36.",
        { quote: "Raked the whole yard on Saturday. Felt a bit of tightness at one point, but it went away when I stopped. I'm fine — let's go.", by: "Mr. Ortiz" }
      ],
      history: {
        list: [
          "**Three months ago:** chest pain at rest; catheterization showed a 90 % narrowing of the right coronary artery, treated with a stent.",
          "**Rehab so far:** 13 sessions without symptoms; up to 20 minutes on the treadmill at 3.0 mph and a 4 % grade, RPE 12–13.",
          "**This weekend:** chest tightness once while raking leaves, gone within a few minutes of stopping. He hadn't told anyone until today.",
          "**Past medical history:** high blood pressure; high cholesterol.",
          "**Social:** retired electrician; has never smoked; drinks 2–3 cups of coffee a day."
        ]
      },
      medications: [
        { name: "Metoprolol succinate", dose: "100 mg once a day" },
        { name: "Aspirin", dose: "81 mg once a day" },
        { name: "Clopidogrel", dose: "75 mg once a day" },
        { name: "Atorvastatin", dose: "80 mg once a day" },
        { name: "Nitroglycerin", dose: "0.4 mg under the tongue as needed for chest pain (in his gym bag)" }
      ],
      allergies: "No known drug allergies",
      vitals: { hr: 62, bp: "126/78", rr: 14, spo2: 97, rpe: 6, rhythm: "regular" },
      exam: {
        list: [
          "Comfortable at rest; no chest symptoms before exercise.",
          "Lungs clear; no ankle swelling.",
          "Telemetry at rest: sinus rhythm, flat ST segments, no early beats (see Tests)."
        ]
      },
      tests: [
        {
          id: "rest-strip", type: "ecg", title: "Telemetry at rest, before exercise (lead II)",
          rhythm: "nsr", rate: 62, seconds: 6, lead: "II", seed: 2601
        },
        {
          id: "session-log", type: "table", title: "Session 14 log",
          head: ["Time", "Activity", "HR (beats/min)", "BP (mmHg)", "RPE (6–20)", "Monitor"],
          rows: [
            ["Rest", "seated", "62", "126/78", "6", "sinus rhythm"],
            ["Warm-up, 5 min", "recumbent stepper, level 3", "74", "136/80", "10", "sinus rhythm"],
            ["Treadmill, 3 min", "2.5 mph, 2 % grade", "82", "144/82", "11", "sinus rhythm"],
            ["Treadmill, 6 min", "3.0 mph, 4 % grade", "90", "152/84", "13", "sinus rhythm"]
          ]
        }
      ]
    },
    steps: [
      {
        id: "s1",
        update: {
          title: "Minute 9 on the treadmill",
          text: [
            { quote: "There's a tightness in my chest — not bad, maybe a 3 out of 10.", by: "Mr. Ortiz" },
            "At the same moment the monitor alarms. You print the strip."
          ],
          vitals: { hr: 96, bp: "158/86", rr: 20, spo2: 96, rpe: 14, pain: "chest tightness 3/10" },
          exhibits: [
            {
              id: "minute9-strip", type: "ecg", title: "Telemetry at minute 9 (lead II)",
              rhythm: "nsr", rate: 96, seconds: 6, lead: "II", seed: 2602,
              st: "depression", stMm: 2.5, stSlope: "downsloping"
            }
          ]
        },
        type: "single",
        prompt: "Compare the minute-9 strip with his resting strip. What does it show?",
        options: [
          { text: "Downsloping ST depression — myocardial ischemia", correct: true, why: "Yes. The ST segment now sits about 2.5 mm below the baseline and slopes downward. With chest tightness at a higher workload, that's exercise-induced ischemia." },
          { text: "ST depression that's normal with exercise — carry on", why: "A small, quickly upsloping dip can be normal with exercise. A 2.5 mm *downsloping* depression is not — especially with chest tightness." },
          { text: "ST elevation — a heart attack in progress", why: "The ST segment is below the baseline, not above it." },
          { text: "A wide QRS — a new bundle branch block", why: "The QRS is as narrow as it was at rest. The change is in the ST segment." }
        ],
        hints: [
          "Compare the ST segment with the one on his resting strip: above or below the baseline, and which way does it slope?"
        ],
        explain: [
          "**ST depression may indicate ischemia if it is downsloping 2–3 mm.** His appeared with chest tightness at a higher workload: demand has outrun supply.",
          "In someone with a stent, new ischemia on exertion — together with the tightness he felt raking leaves — can mean the stented artery is narrowing again (restenosis) or that disease elsewhere has progressed. His cardiologist needs to know."
        ]
      },
      {
        id: "s2",
        type: "single",
        prompt: "What do you do?",
        options: [
          { text: "Stop the treadmill, sit him down, keep monitoring and get Dr. Okafor", correct: true, why: "Yes. Stop the exercise and let him rest seated while you watch the monitor, his symptoms and his blood pressure, and get the supervising PT. He can take his own nitroglycerin if the tightness doesn't settle with rest — and if it isn't better 5 minutes after that, call 911." },
          { text: "Lower the grade and let him keep walking through it — it's only a 3 out of 10", why: "Any continued exercise keeps the demand up. Angina with ST changes means stop, not “ease off”." },
          { text: "Speed up for one more minute to see whether the change is real", why: "Never push into ischemia to test it — that's how ischemia becomes injury or a dangerous rhythm." },
          { text: "Call 911 and start chest compressions", why: "He's awake and talking, with mild symptoms: chest compressions are only for someone who is unresponsive and not breathing normally. Stop, monitor and get the PT — and call 911 if it doesn't settle." }
        ],
        hints: [
          "First take away the demand. Then watch closely, and get help."
        ],
        explain: [
          "**Stop the session** for angina and for **downsloping ST depression** on the monitor. Sit him down, monitor symptoms, heart rate, blood pressure and rhythm, and notify the supervising PT.",
          "**Nitroglycerin:** the patient takes his own prescribed tablet under the tongue, seated. If the pain isn't better 5 minutes after the first dose, call 911."
        ]
      },
      {
        id: "s3",
        update: {
          title: "Two minutes into his rest",
          text: "Mr. Ortiz is seated and the tightness is fading. Then the monitor alarms again.",
          exhibits: [
            {
              id: "couplet-strip", type: "ecg", title: "Telemetry, seated recovery (lead II)",
              rhythm: "pvc", rate: 84, seconds: 6, lead: "II", seed: 2603,
              pvc: { pattern: "couplets" }
            }
          ]
        },
        type: "single",
        prompt: "What are the new beats on this strip?",
        options: [
          { text: "Premature ventricular contractions (PVCs), in pairs", correct: true, why: "Yes. The new beats come early, have no P wave in front of them, and are wide (more than 0.12 s) and bizarre — PVCs. Two in a row make a pair, or couplet." },
          { text: "Atrial fibrillation", why: "In atrial fibrillation there are no P waves and the rhythm is irregularly irregular, but the QRS complexes usually stay narrow. These early beats are wide and bizarre, between normal sinus beats." },
          { text: "Ventricular fibrillation", why: "Ventricular fibrillation is chaotic electrical activity with no QRS complexes at all — and he would be unresponsive. He's sitting up and talking." },
          { text: "Second-degree heart block (dropped beats)", why: "In second-degree block a P wave isn't followed by a QRS — a beat is dropped. Here there are extra, early beats, not missing ones." }
        ],
        hints: [
          "Are these beats early or late? Narrow or wide? Is there a P wave in front of them?"
        ],
        explain: [
          "**PVCs:** early beats that start in the ventricles — a **wide (more than 0.12 s), bizarre** QRS with no P wave before it, usually followed by a pause. They're the most common arrhythmia.",
          "PVCs are seen with caffeine, smoking, anxiety and alcohol — and after an MI or with ischemia from CAD or CHF, electrolyte imbalance, lung disease or low oxygen. His appeared right after an episode of ischemia."
        ]
      },
      {
        id: "s4",
        type: "multi",
        prompt: "During exercise, which PVC patterns are a concern you would act on? Select all that apply.",
        options: [
          { text: "More than 5 PVCs a minute", correct: true, why: "Yes — frequent PVCs during exercise are one of the lecture's three warning patterns." },
          { text: "PVCs in pairs (couplets)", correct: true, why: "Yes — two in a row shows a more irritable ventricle." },
          { text: "Multifocal PVCs — different shapes on the same strip", correct: true, why: "Yes — different shapes mean they come from more than one irritable spot." },
          { text: "A single PVC now and then, with no symptoms", why: "Occasional isolated PVCs are common, even in healthy people, and are often harmless. Note them, but they aren't one of the warning patterns." },
          { text: "Any PVC with a wide, bizarre QRS", why: "Every PVC has a wide, bizarre QRS — that's what makes it a PVC. Its shape alone isn't the warning sign; frequency, pairs and multiple shapes are." }
        ],
        hints: [
          "The lecture gives three warning patterns: how many, how close together, and how different from one another."
        ],
        explain: [
          "**During exercise, PVCs are a concern** at **more than 5 per minute**, in **pairs**, or when **multifocal** — and whenever they come with symptoms. Stop the exercise, monitor, and notify the supervising PT.",
          "Occasional isolated PVCs are common and often harmless (caffeine, anxiety, smoking).",
          "Mr. Ortiz has paired PVCs right after an episode of ischemia: he doesn't go back on the treadmill today."
        ]
      },
      {
        id: "s5",
        update: {
          title: "Two minutes later",
          text: "The monitor technician points at the screen: “Now they don't all look alike.” Some of the early beats point up; others point down.",
          exhibits: [
            {
              id: "multifocal-strip", type: "ecg", title: "Telemetry, 2 minutes later (lead II)",
              rhythm: "pvc", rate: 84, seconds: 6, lead: "II", seed: 2604,
              pvc: { pattern: "multifocal" }
            }
          ]
        },
        type: "single",
        prompt: "What does “multifocal” mean, and why does it matter?",
        options: [
          { text: "They come from several irritable spots in the ventricles and can lead to VT or VF", correct: true, why: "Yes. Multifocal PVCs look different because each shape comes from a different irritable spot (focus) in the ventricles. That instability can progress to ventricular tachycardia (VT) or ventricular fibrillation (VF)." },
          { text: "They all start in the SA node, which is firing at several different speeds at the same time", why: "Beats from the SA node have a P wave in front and a normal, narrow QRS. These beats are early, wide and have no P wave." },
          { text: "They come from the atria, so they are harmless", why: "Early beats from the atria are narrow and have a P wave. Wide, bizarre early beats come from the ventricles." },
          { text: "Several PVCs cancel each other out, so the heart is actually safer", why: "PVCs don't cancel out. More foci mean a more irritable ventricle, not a safer one." }
        ],
        hints: [
          "Unifocal PVCs all look alike because they come from one place. What would make them look different from each other?"
        ],
        explain: [
          "**Unifocal** PVCs look alike — they come from one irritable spot. **Multifocal** PVCs look different from each other — they come from several.",
          "PVCs **may progress to ventricular tachycardia or ventricular fibrillation**. Paired or multifocal PVCs after ischemia, in a man with a stent, mean: no more exercise today, continuous monitoring, the supervising PT at his side, the AED close by — and the cardiologist informed.",
          "Mr. Ortiz's PVCs settled after 10 minutes of rest. Dr. Okafor called his cardiologist, who saw him the next morning."
        ]
      }
    ],
    debrief: {
      diagnosis: "Exercise-induced myocardial ischemia with paired and multifocal PVCs during cardiac rehab",
      summary: [
        "At minute 9 on the treadmill, Mr. Ortiz felt chest tightness as the monitor showed 2.5 mm of downsloping ST depression — ischemia. You stopped the exercise and kept monitoring. Then paired and multifocal PVCs appeared: two of the lecture's warning patterns, signs of an irritable ventricle that can progress to VT or VF.",
        "No more exercise, the supervising PT at his side and a call to his cardiologist: new ischemia three months after a stent needs a fresh look at his arteries."
      ],
      takeaways: [
        "Downsloping ST depression of 2–3 mm means ischemia: stop, sit, monitor, notify the PT; patients use their own nitroglycerin.",
        "PVCs: early beats with a wide (more than 0.12 s), bizarre QRS and no P wave in front.",
        "During exercise, PVCs are a concern at more than 5 per minute, in pairs, or when multifocal — and whenever they come with symptoms.",
        "Multifocal PVCs come from several irritable spots in the ventricles; PVCs can progress to VT or VF.",
        "Ask about symptoms between sessions and report new ones to the supervising PT before exercise starts — his tightness while raking leaves was an early clue."
      ],
      sources: [
        "L1 s20 · Selected ECG abnormalities",
        "L1 s41–42 · Premature ventricular contractions",
        "L2 s6–8 · Angina pectoris",
        "L2 s33 · Cardiac rehabilitation"
      ]
    },
    casebook: ["ecg-basics", "pvc", "angina", "cardiac-rehab", "nitrates", "warning-signs"]
  });

  // ---------------------------------------------------------------------------------------
  // Casebook: Coronary Cases (conditions: angina, cad, mi; concept: cardiac-rehab)
  // ---------------------------------------------------------------------------------------

  CCF.defineEntry({
    id: "angina", kind: "condition", unit: "coronary",
    title: "Angina pectoris",
    aka: ["chest pain of ischemic origin", "stable angina", "unstable angina", "Levine's sign", "acute coronary syndrome"],
    summary: "Chest pain or discomfort that occurs when the heart muscle gets less oxygen than it needs. It is not a disease on its own but a **symptom of myocardial ischemia**, most often from coronary artery disease.",
    sections: [
      {
        heading: "What it is",
        body: "When the heart muscle's oxygen demand is greater than the coronary arteries can supply — usually because plaque has narrowed them (an embolus or inflammation can do it too) — the muscle becomes ischemic and hurts."
      },
      {
        heading: "Signs and symptoms",
        body: {
          list: [
            "Tightness, pressure, fullness or squeezing in the center of the chest, behind the breastbone.",
            "It may spread to the left side of the back, the arm, shoulder, neck or jaw — sometimes it is felt only in the left shoulder, or along the inner arm to the elbow.",
            "Shortness of breath, unexplained fatigue, light-headedness or sweating. It is easily mistaken for indigestion.",
            "**Levine's sign:** a clenched fist held over the chest to describe the pain."
          ]
        }
      },
      {
        heading: "Stable or unstable?",
        body: [
          {
            table: {
              head: ["Feature", "Stable angina", "Unstable angina"],
              rows: [
                ["Brought on by", "Exertion, stress, cold weather, large meals — predictably", "Nothing obvious; often at rest"],
                ["Lasts", "Usually 15 minutes or less", "Longer, or keeps coming back"],
                ["Rest or nitroglycerin", "Relieves it", "Often doesn't"],
                ["What it means", "Needs medical management", "An emergency — it can progress to a heart attack"]
              ]
            }
          },
          "Unstable angina and myocardial infarction together are called **acute coronary syndrome**. At the bedside they can look identical; only the ECG and troponin tests tell them apart."
        ]
      },
      {
        heading: "Tests",
        body: "A **12-lead ECG** is the main test: **inverted T waves** (always abnormal in V2–V6) or downsloping ST depression show ischemia. An exercise stress test can bring ischemia out; **troponin** blood tests show whether any heart muscle has died (which would make it an MI); coronary angiography maps the narrowed arteries."
      },
      {
        heading: "Treatment",
        body: {
          list: [
            "**Medicines:** aspirin, nitrates (nitroglycerin), beta blockers, statins, calcium channel blockers, ACE inhibitors.",
            "**Procedures:** angioplasty and stent placement, or coronary artery bypass graft (CABG), to improve blood flow.",
            "**Lifestyle:** stop smoking, manage weight, become more active, manage stress.",
            "**Physical therapy:** a multiphase cardiac rehabilitation program for stable angina."
          ]
        }
      },
      {
        heading: "What it means for the PTA",
        body: [
          {
            list: [
              "Before exercise, ask about chest symptoms since the last session — and where the patient's nitroglycerin is.",
              "**Angina during a session:** stop, have the patient sit and rest, monitor symptoms and vital signs, and notify the supervising PT. The patient takes their own prescribed nitroglycerin, seated.",
              "Expect nitrate side effects: headache, dizziness and orthostatic hypotension — stand up slowly."
            ]
          },
          { warn: "Call 911 (or the rapid response team in hospital) for chest pain at rest, pain that isn't better 5 minutes after the first nitroglycerin, pain that is getting worse, or pain with sweating, nausea or breathlessness." }
        ]
      }
    ],
    sources: ["L2 s6–8 · Angina pectoris", "L2 s9 · Ischemia and inverted T waves", "L2 s10 · Pain patterns in angina", "L2 s11 · Levine's sign", "L1 s2 · Angina as a cardinal symptom", "L1 s59 · Nitrate agents"]
  });

  CCF.defineEntry({
    id: "cad", kind: "condition", unit: "coronary",
    title: "Coronary artery disease (CAD)",
    aka: ["coronary heart disease", "ischemic heart disease", "coronary atherosclerosis"],
    summary: "Atherosclerotic plaque — fatty deposits containing cholesterol — building up inside the coronary arteries. It develops slowly, often unnoticed for years, until the narrowed arteries can no longer meet the heart's demand.",
    sections: [
      {
        heading: "What it is",
        body: [
          "As plaque builds up, the coronary arteries harden and narrow, so less blood reaches the heart muscle when its demand rises. That raises the risk of ischemia (angina) and of permanent damage (myocardial infarction).",
          {
            list: [
              "The **right and left coronary arteries** branch from the ascending aorta. The **right coronary artery (RCA)** mainly supplies the right atrium and ventricle; the **left** — through its **left anterior descending (LAD)** and **circumflex** branches — mainly the left atrium and ventricle.",
              "The lecture names the **LAD** as the most common site of heart attacks (the “widow maker”); the right coronary artery is close behind."
            ]
          }
        ]
      },
      {
        heading: "Risk factors",
        body: [
          {
            list: [
              "Listed in the lecture: hypertension, diabetes, obesity, chronic kidney disease, high cholesterol and triglycerides, and family history.",
              "Named as **modifiable** — habits a person can change: **smoking, inactivity, alcohol abuse and stress**."
            ]
          },
          "High blood pressure, cholesterol, blood sugar and body weight also improve with treatment and lifestyle change; age, sex and family history can't be changed."
        ]
      },
      {
        heading: "Signs and symptoms",
        body: {
          list: [
            "Often **none** for years — some people with CAD never develop symptoms.",
            "A **partial occlusion** may cause **exertion-related shortness of breath, weakness or angina** — often the first sign.",
            "Sometimes the **first sign is a myocardial infarction**, when plaque completely blocks an artery."
          ]
        }
      },
      {
        heading: "Tests",
        body: {
          list: [
            "**Cardiac catheterization with coronary angiography:** contrast dye injected through a catheter into the coronary arteries — the **most accurate** information about the location and severity of CAD.",
            "**CT or MR coronary angiography:** a less invasive way to see the coronary arteries.",
            "A 12-lead ECG and an exercise stress test look for ischemia; an echocardiogram shows how well the heart pumps."
          ]
        }
      },
      {
        heading: "Treatment",
        body: {
          list: [
            "**Medicines**, alone or combined: aspirin, nitrates, beta blockers, statins, calcium channel blockers, ACE inhibitors.",
            "**Procedures** to widen or bypass narrowed arteries: balloon angioplasty with a stent, or coronary artery bypass graft (CABG).",
            "**Physical therapy** through a formal multiphase cardiac rehabilitation program, with risk-factor education."
          ]
        }
      },
      {
        heading: "What it means for the PTA",
        body: {
          list: [
            "New breathlessness, fatigue or chest discomfort on exertion in someone with risk factors needs reporting — don't put it down to “being out of shape”.",
            "After a stent: antiplatelet medicines, so bleeding and bruising precautions. A stent fixes one narrowing, not the disease.",
            "Support the changes that matter most: activity, quitting smoking, managing stress."
          ]
        }
      }
    ],
    sources: ["L2 s16–19 · Coronary artery disease", "L2 s28 · The LAD", "L1 s9 · Coronary arteries", "L1 s48–49 · Angiography and cardiac catheterization", "L1 s61–66 · Angioplasty, stent and CABG"]
  });

  CCF.defineEntry({
    id: "mi", kind: "condition", unit: "coronary",
    title: "Myocardial infarction (heart attack)",
    aka: ["heart attack", "MI", "STEMI", "NSTEMI", "acute coronary syndrome", "coronary"],
    summary: "Prolonged ischemia that injures and kills (necrosis) an area of heart muscle, caused by occlusion of one or more coronary arteries — usually a clot on a ruptured plaque.",
    sections: [
      {
        heading: "Causes and risk factors",
        body: "Any prolonged blockage that deprives heart muscle of oxygen. Risk factors: a personal or family history of heart disease, smoking, physical inactivity, stress, hypertension, high cholesterol, diabetes and obesity; also cocaine use and aortic stenosis. Heart attacks happen more often in the morning hours."
      },
      {
        heading: "Signs and symptoms",
        body: [
          {
            list: [
              "About **2 in 3** people have warning symptoms in the days to weeks before: unstable angina, shortness of breath, fatigue.",
              "Typically: deep **pain or pressure behind the breastbone** that may spread to the jaw, the left arm or the back; **not relieved by rest or nitroglycerin**; may last for hours.",
              "The person is often anxious, pale, sweaty and fatigued, with nausea and vomiting."
            ]
          },
          "**Atypical presentations are common — especially in women and people with diabetes:** unusual chest, stomach or abdominal pain; continuous pain between the shoulder blades or in the neck or shoulder; isolated right biceps pain; pain relieved by antacids; nausea and vomiting or flu-like symptoms without chest pain; unexplained intense anxiety, weakness or fatigue; breathlessness; dizziness. Some heart attacks are **silent**."
        ]
      },
      {
        heading: "Zones of infarction and the ECG",
        body: {
          table: {
            head: ["Zone", "Tissue", "ECG sign"],
            rows: [
              ["Infarction (center)", "Necrotic, non-contractile, electrically inert", "Pathological Q waves"],
              ["Injury (around it)", "Non-contractile, electrically unstable", "ST elevation"],
              ["Ischemia (outer area)", "Short of oxygen, electrically unstable", "T-wave inversion"]
            ]
          }
        }
      },
      {
        heading: "Types and sites",
        body: {
          list: [
            "**Transmural** (the full thickness of the wall): usually an **ST-elevation MI (STEMI)**, or Q-wave MI.",
            "**Subendocardial** (the inner third of the wall): a **non-ST-elevation MI (NSTEMI)**, or non-Q-wave MI.",
            "**Thrombosis of the LAD** is the lecture's most common site (the right coronary artery is close behind); it damages the front of the left ventricle (the “widow maker”)."
          ]
        }
      },
      {
        heading: "Tests",
        body: "The **12-lead ECG** is the primary tool. Blood tests show heart-muscle damage: today the main marker is **troponin**, which rises above the lab's reference range within hours. The lecture lists the older enzymes **CPK, AST and LDH**, which also change after an MI but are less specific to the heart."
      },
      {
        heading: "Treatment",
        body: {
          list: [
            "**Stabilize and act fast** — “time is muscle”. Emergency angioplasty with a stent reopens the artery; **thrombolytics** dissolve the clot when angioplasty can't be done quickly.",
            "**Medicines:** antiplatelets and anticoagulants, beta blockers, ACE inhibitors, vasodilators such as nitrates, statins.",
            "**Procedures and surgery** when needed: stenting, endarterectomy, coronary artery bypass grafting.",
            "**Cardiac rehabilitation** once the patient is stable."
          ]
        }
      },
      {
        heading: "What it means for the PTA",
        body: [
          { warn: "Suspected heart attack: **call 911 / activate the emergency response at once.** Keep the patient at rest, stay and monitor, and have the AED ready. Don't drive them to hospital, don't wait to see if it passes, and don't give medications." },
          {
            list: [
              "If the patient becomes unresponsive and isn't breathing normally: start CPR and use the AED.",
              "After an MI: cardiac rehab with continuous monitoring of vital signs, low-level exercise progressed gradually, and education on risk factors and returning to activity."
            ]
          }
        ]
      },
      {
        heading: "Note on the slides",
        body: "Lecture 2 (slide 32) lists estrogen for women among MI treatments: current guidelines **do not** recommend hormone therapy to treat or prevent heart attacks. The same slide gives CPK, AST and LDH as the blood tests; troponin has replaced them as the main marker."
      }
    ],
    sources: ["L2 s27 · Myocardial infarction", "L2 s28–29 · Zones of infarction and the LAD", "L2 s30–31 · Clinical presentation and warning signs", "L2 s32–33 · Diagnosis, management and rehabilitation"]
  });

  CCF.defineEntry({
    id: "cardiac-rehab", kind: "concept", unit: "coronary",
    title: "Cardiac rehabilitation",
    aka: ["cardiac rehab", "phase II", "multiphase cardiac rehabilitation", "RPE", "Borg scale"],
    summary: "A supervised, multiphase program of exercise, monitoring and education for people with heart disease — the lecture's physical therapy approach after an MI and for stable angina and CAD.",
    sections: [
      {
        heading: "Who it's for",
        body: "People after a myocardial infarction, a stent or bypass surgery, and people with stable angina or coronary artery disease. Some people with hypertension and other heart conditions qualify too."
      },
      {
        heading: "The phases",
        body: {
          table: {
            head: ["Phase", "Where and when"],
            rows: [
              ["I", "In hospital, once the patient is stable: sitting, standing, short walks, education"],
              ["II", "A supervised outpatient program after discharge, usually with ECG (telemetry) monitoring — often about 36 sessions over 12 weeks"],
              ["III and beyond", "Long-term maintenance in a community or home program, with less supervision"]
            ]
          }
        }
      },
      {
        heading: "What a session includes",
        body: {
          list: [
            "Low-level therapeutic exercise and functional activities, progressed toward endurance training.",
            "A warm-up and a cool-down; relaxation and breathing techniques.",
            "**Continuous monitoring of vital signs**: heart rate, blood pressure, ECG rhythm, symptoms and the rating of perceived exertion (RPE).",
            "Education: reducing risk factors, returning to activity, and a lasting commitment to fitness and health."
          ]
        }
      },
      {
        heading: "Monitoring intensity",
        body: [
          "The **Borg RPE scale** runs from 6 (no exertion) to 20 (maximal exertion): 11 is “light”, 13 “somewhat hard” and 15 “hard”. Many programs aim for **11–13**; the supervising PT sets each patient's range.",
          "In patients taking **beta blockers** (and often calcium channel blockers), heart rate and blood pressure rise less with exercise, so RPE and symptoms guide intensity rather than a target heart rate."
        ]
      },
      {
        heading: "Stop the exercise and notify the supervising PT",
        body: {
          list: [
            "Angina, or downsloping ST depression on the monitor.",
            "PVCs more than 5 a minute, in pairs or multifocal; a new irregular rhythm.",
            "Dizziness or light-headedness, a fall in blood pressure, unusual breathlessness or fatigue.",
            "Call 911 / activate the emergency response for chest pain that doesn't settle with rest and nitroglycerin, collapse, or any other emergency."
          ]
        }
      },
      {
        heading: "Medicines to keep in mind",
        body: {
          list: [
            "Beta blockers: a blunted heart-rate response — use RPE; watch for orthostatic hypotension.",
            "Antiplatelets after a stent: bleeding and bruising precautions.",
            "Statins: report new muscle aches.",
            "Nitroglycerin: patients carry their own; expect headache and dizziness on standing."
          ]
        }
      }
    ],
    sources: ["L2 s8 · Cardiac rehabilitation for stable angina", "L2 s19 · Cardiac rehabilitation for CAD", "L2 s32–33 · Cardiac rehabilitation after MI", "L1 s20 · PVCs during exercise", "L1 s56 · Beta blockers and RPE"]
  });
})();
