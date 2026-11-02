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
          { warn: "Call 911 if the pain doesn't ease within a few minutes, gets worse, or comes with sweating, nausea or breathlessness — it may not be stable angina." }
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

  // Cases 2.2–2.6 and the unit's Casebook entries (angina, cad, mi, cardiac-rehab) follow.
})();
