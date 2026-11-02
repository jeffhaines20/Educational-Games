/*
 * The Cardiac Case Files — Casebook reference entries: the drug classes and the tools
 * (scales, tables and tests) from the two lectures. Condition and concept entries live
 * with their unit's cases. Format: docs/DESIGN.md §6.5.
 */
(function () {
  "use strict";
  var def = CCF.defineEntry;

  // ---------------------------------------------------------------------------------------
  // Drug classes (Lecture 1, slides 51–60; digoxin from L1 s31, L2 s39 and s72)
  // ---------------------------------------------------------------------------------------

  def({
    id: "alpha-blockers", kind: "drug", title: "Alpha-adrenergic antagonists (alpha blockers)",
    aka: ["doxazosin", "prazosin", "Cardura", "Minipress"],
    summary: "Relax the smooth muscle of arterioles and veins, so vessels widen and blood pressure falls.",
    sections: [
      { heading: "Used for", body: "Hypertension." },
      { heading: "Side effects", body: { list: ["Dizziness", "Palpitations", "**Orthostatic hypotension** (a fall in blood pressure on standing)", "Drowsiness"] } },
      { heading: "What it means for PT", body: { list: ["Have the patient rise slowly from lying or sitting: dizziness and orthostatic hypotension are common.", "Monitor the patient closely during exercise."] } },
      { heading: "Examples", body: "Cardura (doxazosin), Minipress (prazosin)." }
    ],
    sources: ["L1 s51 · Alpha adrenergic antagonist agents"]
  });

  def({
    id: "ace-inhibitors", kind: "drug", title: "ACE inhibitors",
    aka: ["angiotensin-converting enzyme inhibitors", "captopril", "enalapril", "lisinopril", "Capoten", "Vasotec"],
    summary: "Block the enzyme that makes angiotensin II, lowering blood pressure and afterload.",
    sections: [
      { heading: "Used for", body: "Hypertension and congestive heart failure." },
      { heading: "Side effects", body: { list: ["Hypotension and dizziness", "**A dry, persistent cough**", "Hyperkalemia (high potassium) and hyponatremia (low sodium)"] } },
      { heading: "What it means for PT", body: { list: ["Avoid sudden changes in posture: dizziness and fainting from low blood pressure.", "Patients with heart failure should avoid rapid increases in physical activity."] } },
      { heading: "Examples", body: "Capoten (captopril), Vasotec (enalapril); lisinopril is another common one." }
    ],
    sources: ["L1 s52 · ACE inhibitor agents"]
  });

  def({
    id: "anticoagulants", kind: "drug", title: "Anticoagulants",
    aka: ["blood thinners", "heparin", "warfarin", "Coumadin"],
    summary: "Slow the clotting process, so new clots are less likely to form and existing ones are less likely to grow.",
    sections: [
      { heading: "Used for", body: { list: ["After coronary artery bypass graft surgery", "Preventing venous thromboembolism (DVT and PE)", "Preventing clots from the heart in atrial fibrillation and with prosthetic heart valves"] } },
      { heading: "Side effects", body: { list: ["**Hemorrhage and an increased risk of bleeding**", "Gastrointestinal upset with oral forms"] } },
      { heading: "What it means for PT", body: { list: ["Avoid anything that could injure the patient: bleeding and bruising come easily. Guard against falls; be gentle with manual techniques.", "Teach the patient the warning signs of bleeding (unusual bruising, blood in urine or stools, nosebleeds that won't stop) and to report them."] } },
      { heading: "Examples", body: "Heparin, Coumadin (warfarin)." }
    ],
    sources: ["L1 s53 · Anticoagulant agents"]
  });

  def({
    id: "statins", kind: "drug", title: "Antihyperlipidemics (statins)",
    aka: ["cholesterol-lowering drugs", "atorvastatin", "simvastatin", "Lipitor", "Zocor"],
    summary: "Statins block an enzyme the liver needs to make cholesterol: LDL and triglycerides fall and HDL rises.",
    sections: [
      { heading: "Used for", body: "High cholesterol (hyperlipidemia), atherosclerosis, and preventing heart attacks in people with coronary disease, diabetes or peripheral vascular disease." },
      { heading: "Side effects", body: { list: ["Headache", "Gastrointestinal distress", "**Myalgia (muscle aches)**", "Rash"] } },
      { heading: "What it means for PT", body: { list: ["Aerobic exercise raises HDL and adds to the drug's effect.", "Ask about new muscle aches or weakness and report them to the supervising PT: they can be a statin side effect."] } },
      { heading: "Examples", body: "Lipitor (atorvastatin), Zocor (simvastatin)." }
    ],
    sources: ["L1 s54 · Antihyperlipidemia agents"]
  });

  def({
    id: "antiplatelets", kind: "drug", title: "Antiplatelet (antithrombotic) agents",
    aka: ["aspirin", "clopidogrel", "Bayer", "Plavix"],
    summary: "Stop platelets from clumping together, which prevents clots forming in arteries.",
    sections: [
      { heading: "Used for", body: "After a myocardial infarction or a stent, atrial fibrillation, and preventing arterial clots." },
      { heading: "Side effects", body: { list: ["Hemorrhage", "Thrombocytopenia (low platelets)", "Possible liver toxicity", "Gastrointestinal distress"] } },
      { heading: "What it means for PT", body: { list: ["Avoid injury: bleeding risk is higher, especially when two antiplatelets are combined or one is combined with an anticoagulant.", "Teach the patient which side effects to report."] } },
      { heading: "Examples", body: "Bayer (aspirin), Plavix (clopidogrel)." }
    ],
    sources: ["L1 s55 · Antithrombotic (antiplatelet) agents"]
  });

  def({
    id: "beta-blockers", kind: "drug", title: "Beta blockers",
    aka: ["beta-adrenergic blocking agents", "atenolol", "metoprolol", "carvedilol", "Tenormin", "Lopressor"],
    summary: "Block beta-adrenergic receptors so the heart beats more slowly and less forcefully, lowering its oxygen demand.",
    sections: [
      { heading: "Used for", body: "Hypertension, angina, arrhythmias, heart failure, migraine and essential tremor." },
      { heading: "Side effects", body: { list: ["Bradycardia and arrhythmias", "Fatigue, weakness, dizziness", "Depression", "Blurred vision"] } },
      { heading: "What it means for PT", body: { list: ["**Heart rate and blood pressure rise less with exercise** — a target heart rate is not a reliable guide. Use the **rating of perceived exertion (RPE)** to judge intensity.", "Watch closely during position changes: orthostatic hypotension is more likely."] } },
      { heading: "Examples", body: "Tenormin (atenolol), Lopressor (metoprolol)." }
    ],
    sources: ["L1 s56 · Beta blocker agents"]
  });

  def({
    id: "calcium-channel-blockers", kind: "drug", title: "Calcium channel blockers",
    aka: ["CCBs", "nifedipine", "diltiazem", "amlodipine", "Procardia", "Cardizem", "Norvasc"],
    summary: "Reduce calcium entry into heart and vascular smooth-muscle cells: vessels widen and the heart works less hard.",
    sections: [
      { heading: "Used for", body: "Hypertension, angina, arrhythmias and heart failure; also Raynaud's disease." },
      { heading: "Side effects", body: { list: ["Dizziness and headache", "Hypotension", "**Peripheral edema** (ankle swelling)"] } },
      { heading: "What it means for PT", body: { list: ["Heart rate and blood pressure responses to exercise may be smaller than expected.", "Watch for dizziness and orthostatic hypotension when the patient stands up.", "Watch for signs of heart failure: worsening peripheral edema, dyspnea or weight gain."] } },
      { heading: "Examples", body: "Procardia (nifedipine), Cardizem (diltiazem); amlodipine (Norvasc) is another common one." }
    ],
    sources: ["L1 s57 · Calcium channel blocker agents", "L2 s56 · Raynaud's"]
  });

  def({
    id: "diuretics", kind: "drug", title: "Diuretics",
    aka: ["water pills", "furosemide", "hydrochlorothiazide", "chlorothiazide", "Lasix", "Diuril"],
    summary: "Make the kidneys excrete more sodium and water. Plasma volume falls, and with it blood pressure and edema.",
    sections: [
      { heading: "Used for", body: "Hypertension, edema from heart failure, pulmonary edema, and glaucoma." },
      { heading: "Side effects", body: { list: ["Dehydration", "Hypotension", "**Electrolyte imbalance** (for example low potassium)", "Frequent urination (polyuria)", "Raised LDL cholesterol", "Arrhythmias"] } },
      { heading: "What it means for PT", body: { list: ["Position changes can cause dizziness and falls because blood pressure is lower.", "Watch for signs of electrolyte imbalance: **muscle weakness or cramping**, and an irregular pulse.", "Patients may need the bathroom urgently — plan sessions around dosing times."] } },
      { heading: "Examples", body: "Furosemide (Lasix), Diuril (chlorothiazide); hydrochlorothiazide is another common one." }
    ],
    sources: ["L1 s58 · Diuretic agents"]
  });

  def({
    id: "nitrates", kind: "drug", title: "Nitrates",
    aka: ["nitroglycerin", "NTG", "Nitrostat", "isosorbide"],
    summary: "Relax vascular smooth muscle and widen vessels, which reduces the heart's workload and relieves ischemia.",
    sections: [
      { heading: "Used for", body: "Angina pectoris." },
      { heading: "Side effects", body: { list: ["**Headache**", "Dizziness and **orthostatic hypotension**", "Tachycardia", "Nausea and vomiting"] } },
      { heading: "What it means for PT", body: { list: ["**Sublingual nitroglycerin is the preferred treatment for an acute angina attack.** Patients should carry their own; ask where it is before exercise.", "Teach the patient to stand up slowly.", "If chest pain is not better five minutes after the first dose, call 911 (current American Heart Association advice)."] } },
      { heading: "Examples", body: "Nitrostat, nitroglycerin." }
    ],
    sources: ["L1 s59 · Nitrate agents"]
  });

  def({
    id: "thrombolytics", kind: "drug", title: "Thrombolytics",
    aka: ["clot busters", "alteplase", "urokinase", "Activase", "Kinlytic"],
    summary: "Dissolve clots: they convert plasminogen into plasmin, which breaks the clot down so a blocked vessel can reopen.",
    sections: [
      { heading: "Used for", body: "Acute myocardial infarction, pulmonary embolism, ischemic stroke, and arterial or venous thrombosis." },
      { heading: "Side effects", body: { list: ["**Hemorrhage, including bleeding inside the skull**", "Allergic reactions", "Arrhythmias"] } },
      { heading: "What it means for PT", body: "Clotting is impaired, so avoid anything that could cause trauma: falls, bumps, vigorous manual techniques." },
      { heading: "Examples", body: "Kinlytic (urokinase), Activase (alteplase)." }
    ],
    sources: ["L1 s60 · Thrombolytic agents"]
  });

  def({
    id: "digoxin", kind: "drug", title: "Digoxin (digitalis, a cardiac glycoside)",
    aka: ["digitalis", "Lanoxin", "cardiac glycoside"],
    summary: "Slows conduction through the AV node and strengthens contraction. In atrial fibrillation it **slows the ventricular rate**; it does not restore normal rhythm.",
    sections: [
      { heading: "Used for", body: "Controlling the heart rate in atrial fibrillation, and heart failure." },
      { heading: "Digitalis toxicity — know the signs", body: [{ list: ["Loss of appetite (anorexia), nausea and vomiting", "An irregular or slow heartbeat", "Visual changes: **yellow halos around objects** or blurred vision", "Confusion or weakness, especially in older adults"] }, { warn: "Signs of toxicity need prompt medical attention: stop the session and contact the supervising PT and the patient's nurse or physician. Never adjust the medication yourself." }] },
      { heading: "Who is at risk", body: "Older adults and people with kidney disease, and anyone whose potassium is low — for example from a diuretic such as furosemide." },
      { heading: "Note on the slides", body: "Lecture 1 (slide 31) says digitalis restores the atria to functional contraction. Current understanding: digoxin controls how fast the ventricles beat; the atria keep fibrillating." }
    ],
    sources: ["L1 s31 · Atrial fibrillation treatment", "L2 s39 · CHF medical management", "L2 s72 · Cor pulmonale"]
  });

  // ---------------------------------------------------------------------------------------
  // Tools: scales, tables and tests
  // ---------------------------------------------------------------------------------------

  def({
    id: "bp-categories", kind: "tool", title: "Blood pressure categories",
    aka: ["hypertension stages", "AHA blood pressure chart"],
    summary: "The American Heart Association categories used in the lecture. When the two numbers fall into different categories, use the **higher** category.",
    sections: [
      { heading: "The categories (mmHg)", body: { table: { head: ["Category", "Systolic (top number)", "and/or", "Diastolic (bottom number)"], rows: [
        ["Normal", "less than 120", "and", "less than 80"],
        ["Elevated", "120–129", "and", "less than 80"],
        ["Stage 1 hypertension", "130–139", "or", "80–89"],
        ["Stage 2 hypertension", "140 or higher", "or", "90 or higher"],
        ["Hypertensive crisis", "higher than 180", "and/or", "higher than 120"]
      ] } } },
      { heading: "Good to know", body: { list: [
        "**Isolated systolic hypertension**: a high systolic with a normal diastolic — common after age 50, often from stiff arteries.",
        "Hypertension is usually **silent**. Very high pressures can cause headache, confusion, blurred vision, fatigue, an irregular heartbeat or ringing in the ears.",
        "A hypertensive crisis needs a doctor immediately; with symptoms (chest pain, shortness of breath, weakness, vision or speech changes) call 911."
      ] } }
    ],
    sources: ["L2 s22–23 · Hypertension classification", "L2 s26 · Clinical manifestations"]
  });

  def({
    id: "abi", kind: "tool", title: "Ankle-brachial index (ABI)",
    aka: ["ankle brachial pressure index", "ABPI"],
    summary: "Compares blood pressure at the ankle with blood pressure at the arm to screen for peripheral arterial disease.",
    sections: [
      { heading: "How it's measured", body: { olist: [
        "Take the systolic pressure at **both** brachial arteries (cuff and handheld Doppler).",
        "Take the systolic pressure at the ankle — posterior tibial and dorsalis pedis arteries — on each leg.",
        "For each leg: **ABI = the higher of that leg's ankle pressures ÷ the higher of the two arm pressures.**"
      ] } },
      { heading: "Interpreting the result", body: { table: { head: ["ABI", "Meaning", "Claudication"], rows: [
        ["above 1.30", "Non-compressible (stiff, calcified) vessel — the reading is unreliable", "may be present"],
        ["1.00–1.29", "Normal", "none"],
        ["0.91–0.99", "Borderline", "none"],
        ["0.41–0.90", "Mild to moderate peripheral arterial disease", "present, limiting"],
        ["0.00–0.40", "Severe peripheral arterial disease", "early, limiting; rest pain"]
      ] } } },
      { heading: "Good to know", body: [
        "Calcified arteries — common in diabetes — can't be squeezed shut by the cuff, so the ABI reads falsely high. Other tests (Doppler studies, transcutaneous oximetry) are used instead.",
        { tip: "The lecture's table puts the non-compressible cut-off at 1.30. Current American Heart Association / American College of Cardiology guidelines use **above 1.40** (and call 1.00–1.40 normal). The cases in this game avoid values between the two." }
      ] }
    ],
    sources: ["L2 s48–50 · PVD diagnosis and ABI"]
  });

  def({
    id: "edema-scale", kind: "tool", title: "Edema grading scale",
    aka: ["pitting edema scale"],
    summary: "Press firmly over a bony area (the shin or ankle) for a second or two, then grade the pit by its depth and how long it takes to fill back in.",
    sections: [
      { heading: "Grades", body: { table: { head: ["Grade", "Pit", "Rebound"], rows: [
        ["1+ (mild)", "barely perceptible, up to 2 mm", "immediate"],
        ["2+ (moderate)", "easily seen, 2–4 mm", "within 15 seconds"],
        ["3+ (severe)", "4–6 mm", "15–30 seconds"],
        ["4+ (very severe)", "6–8 mm", "more than 30 seconds"]
      ] } } },
      { heading: "What it suggests", body: { list: [
        "**Bilateral** pitting edema points to a body-wide cause such as **congestive heart failure** — especially with shortness of breath and fatigue.",
        "**Unilateral** edema points to a local cause: deep vein thrombosis or thrombophlebitis, peripheral vascular disease, injury.",
        "New or worsening edema, or a quick weight gain, should be reported to the supervising PT."
      ] } }
    ],
    sources: ["L1 s34–35 · Edema and its grading", "L2 s72 · Teaching the edema check"]
  });

  def({
    id: "wells-dvt", kind: "tool", title: "Wells score for DVT",
    aka: ["Wells criteria"],
    summary: "A standard checklist that estimates how likely a deep vein thrombosis is. Score each item that applies.",
    sections: [
      { heading: "The criteria", body: { table: { head: ["Criterion", "Points"], rows: [
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
      ] } } },
      { heading: "Interpreting the score", body: { list: ["**Less than 2: DVT unlikely** (about 6 % probability).", "**2 or more: DVT likely** (about 28 % probability) — the patient needs prompt medical evaluation, usually a Doppler ultrasound."] } },
      { heading: "Good to know", body: { list: ["Fever and a positive Homan's sign are **not** Wells criteria. Homan's sign (calf pain on dorsiflexion) is unreliable.", "If you suspect a DVT: stop exercising the leg, don't massage it, keep the patient resting, and notify the supervising PT and the nurse or physician."] } }
    ],
    sources: ["L2 s58–60 · DVT signs, Wells score and management"]
  });

  def({
    id: "auscultation", kind: "tool", title: "Heart sounds and auscultation areas",
    aka: ["S1", "S2", "S3", "S4", "listening to the heart"],
    summary: "Where to place the stethoscope, and what the normal and extra heart sounds mean.",
    sections: [
      { heading: "The areas", body: { table: { head: ["Area", "Where"], rows: [
        ["Aortic", "2nd intercostal space, right sternal border"],
        ["Pulmonic", "2nd intercostal space, left sternal border"],
        ["Erb's point", "3rd intercostal space, left sternal border"],
        ["Tricuspid", "4th intercostal space, left sternal border"],
        ["Mitral (apex)", "5th intercostal space, left midclavicular line"]
      ] } } },
      { heading: "The sounds", body: { table: { head: ["Sound", "What makes it", "Normal?"], rows: [
        ["S1 \"lubb\"", "Closing of the mitral and tricuspid (AV) valves at the start of ventricular systole", "Normal"],
        ["S2 \"dupp\"", "Closing of the aortic and pulmonary (semilunar) valves at the end of systole", "Normal"],
        ["S3 (ventricular gallop)", "Rapid filling of the ventricles in early diastole, just after S2; best at the apex with the patient on the left side", "Normal in children and young adults; in adults over 40 it suggests ventricular failure or CHF"],
        ["S4 (atrial gallop)", "Ventricles filling as the atria contract, just before S1", "Abnormal: LV hypertrophy, chronic hypertension, cardiomyopathy, MI"],
        ["Murmur", "Turbulent blood flow", "Graded I (faint) to VI (heard without a stethoscope)"]
      ] } } },
      { heading: "Technique", body: [
        "Put the diaphragm or bell directly on bare skin with enough pressure to seal, while the patient breathes quietly through the nose.",
        { tip: "The game's chest diagram numbers the areas 1 aortic, 2 pulmonic, 3 Erb's point, 4 tricuspid, 5 mitral. The lecture's figure (L1 s25) numbers them differently — learn the locations, not the numbers." }
      ] }
    ],
    sources: ["L1 s21–26 · Heart sounds and auscultation"]
  });

  def({
    id: "ecg-basics", kind: "tool", title: "Reading an ECG strip",
    aka: ["EKG", "electrocardiogram", "rhythm strip", "6-second method"],
    summary: "What each wave means, how to count the rate, and the abnormalities the lecture highlights.",
    sections: [
      { heading: "The waves", body: { table: { head: ["Part", "What it shows"], rows: [
        ["P wave", "Atrial depolarization (the atria contract)"],
        ["PR interval", "Time for the impulse to travel from the atria through the AV node and conduction system (normally 0.12–0.20 s)"],
        ["QRS complex", "Ventricular depolarization (the ventricles contract); normally narrow, under 0.12 s"],
        ["ST segment", "Start of ventricular repolarization; normally flat, level with the baseline"],
        ["T wave", "Ventricular repolarization (recovery)"],
        ["QT interval", "Electrical systole"]
      ] } } },
      { heading: "Paper and rate", body: { list: [
        "Standard paper runs at 25 mm per second: one small square = 0.04 s, one large square (5 small) = 0.20 s.",
        "**6-second method:** count the QRS complexes in a 6-second strip and multiply by 10. Strips are often marked every 3 seconds along the top.",
        "Regular or irregular? Compare the distances between neighboring R waves (the RR intervals)."
      ] } },
      { heading: "Selected abnormalities", body: { table: { head: ["Finding", "Suggests"], rows: [
        ["ST elevation", "Injury — a new infarct (or pericarditis)"],
        ["ST depression, downsloping 2–3 mm", "Ischemia"],
        ["Inverted T waves", "Ischemia (always abnormal in V2–V6)"],
        ["Pathological Q waves", "Infarction — dead (necrotic) heart muscle"],
        ["Wide QRS (0.12 s or more)", "Bundle branch block — slowed conduction in the ventricles"],
        ["P waves absent or different", "Atrial or ventricular arrhythmia"],
        ["Premature, wide, bizarre beats", "Premature ventricular contractions (PVCs)"]
      ] } } },
      { heading: "During exercise", body: "PVCs are a concern when there are more than 5 per minute, when they come in pairs, or when they are multifocal (look different from each other). Stop, monitor, and notify the supervising PT." }
    ],
    sources: ["L1 s18–20 · ECG and selected abnormalities", "L1 s41–42 · PVCs", "L2 s9, s28–29 · Ischemia and the zones of infarction"]
  });

  def({
    id: "diagnostic-tests", kind: "tool", title: "Diagnostic tests",
    aka: ["Holter", "echocardiogram", "cardiac catheterization", "angiography", "Doppler", "V/Q scan", "chest X-ray"],
    summary: "Which test answers which question.",
    sections: [
      { heading: "Heart", body: { table: { head: ["Test", "What it shows"], rows: [
        ["12-lead ECG", "Rhythm, ischemia (inverted T), injury (ST elevation), infarction (Q waves). The first test for chest pain."],
        ["Holter (ambulatory ECG)", "Rhythm over 24–48 hours or longer, matched with a symptom diary; medication and pacemaker function."],
        ["Echocardiogram", "Ultrasound pictures in real time: chamber size, wall and septum thickness, valves, ejection fraction."],
        ["Cardiac catheterization with coronary angiography", "Contrast dye in the coronary arteries: where they are narrowed and how badly (the most accurate test for CAD); pressures inside the heart."],
        ["CT or MR coronary angiography", "Less invasive pictures of the coronary arteries."],
        ["Fluoroscopy", "Continuous X-ray; now mostly part of catheterization."],
        ["Blood tests", "Markers of heart-muscle injury (troponin today; the lecture lists CPK, AST and LDH); for heart failure: electrolytes, BUN, creatinine, TSH, CBC, urinalysis."]
      ] } } },
      { heading: "Lungs and vessels", body: { table: { head: ["Test", "What it shows"], rows: [
        ["Chest X-ray", "Fluid in the lungs (pulmonary edema), heart size."],
        ["V/Q (ventilation–perfusion) scan or CT", "Confirms a pulmonary embolism."],
        ["Doppler / duplex ultrasound", "Blood flow in arteries and veins; confirms a DVT; venous ultrasonography for chronic venous insufficiency."],
        ["Ankle-brachial index (ABI)", "Screens for peripheral arterial disease."],
        ["Transcutaneous oximetry", "Oxygen reaching the skin; useful when the ABI is unreliable."],
        ["Ultrasound, CT, MRI, angiography", "Find and measure an aneurysm."],
        ["Pulmonary function tests", "Confirm the lung disease behind cor pulmonale."]
      ] } } }
    ],
    sources: ["L1 s48–50 · Diagnostic tests", "L2 s5, s19, s32, s39, s42, s48, s60, s62, s64, s70"]
  });

  def({
    id: "procedures", kind: "tool", title: "Procedures for heart and vessel disease",
    aka: ["angioplasty", "stent", "pacemaker", "CABG", "bypass", "defibrillation"],
    summary: "The main procedures in the lecture and what they do.",
    sections: [
      { heading: "Balloon angioplasty and stent", body: "A balloon-tipped catheter is threaded into a narrowed artery and inflated to widen it. A **stent** — a small metal mesh tube — is usually left in place to prop the artery open and reduce the chance of it narrowing again (restenosis)." },
      { heading: "Pacemaker", body: "A battery-powered device placed under the skin, usually in the upper left chest, with leads to the heart (single chamber, dual chamber or biventricular). It treats slow heart rates and conduction problems such as heart block, relieving fatigue, light-headedness and fainting." },
      { heading: "Coronary artery bypass graft (CABG)", body: "Blood is rerouted around a blocked coronary artery using the patient's own saphenous vein (from the leg), internal thoracic (mammary) artery or radial artery." },
      { heading: "Defibrillation", body: "An electric shock that stops a chaotic rhythm such as ventricular fibrillation so that a normal rhythm can restart. Used with CPR; every clinician, including PTAs, is trained in CPR and the AED." },
      { heading: "Aneurysm repair", body: "Large aortic aneurysms are repaired surgically by replacing the weak section with a synthetic graft." }
    ],
    sources: ["L1 s45–47 · Ventricular fibrillation", "L1 s61–66 · Procedures", "L2 s5 · Aneurysm treatment"]
  });

  def({
    id: "warning-signs", kind: "tool", title: "Red flags: when to stop, and when to call 911",
    aka: ["emergency", "heart attack warning signs", "stop exercise"],
    summary: "A PTA doesn't diagnose — but must recognize when a session has to stop, when to get the supervising PT, and when to activate the emergency response.",
    sections: [
      { heading: "Call 911 / activate the emergency response — and stay with the patient", body: { list: [
        "Chest pain or pressure that isn't relieved by rest or nitroglycerin, chest pain at rest, or heart-attack warning signs (below).",
        "Collapse, unresponsiveness or no normal breathing: start CPR and get the AED.",
        "Sudden severe breathlessness — for example with chest pain that is worse on breathing in (pulmonary embolism) or frothy pink sputum (acute pulmonary edema).",
        "Sudden severe back, abdominal or groin pain with light-headedness and a racing pulse in someone with an aortic aneurysm.",
        "Sudden severe headache, vomiting, double vision, confusion, facial droop, arm weakness or slurred speech.",
        "Blood pressure above 180/120 with symptoms."
      ] } },
      { heading: "Heart-attack warning signs", body: [
        { list: ["Pressure, squeezing or pain in the center of the chest lasting more than a few minutes, or coming back", "Pain spreading to the shoulders, neck, jaw, arms or back", "Chest discomfort with light-headedness, fainting, sweating, nausea or shortness of breath"] },
        "**Atypical signs — common in women and people with diabetes:** unusual chest, stomach or abdominal pain; pain between the shoulder blades or in the neck or shoulder; nausea, vomiting or flu-like symptoms without chest pain; unexplained intense anxiety, weakness or fatigue; breathlessness; dizziness."
      ] },
      { heading: "Stop the session and notify the supervising PT", body: { list: [
        "A new irregular pulse (possible atrial fibrillation), or new frequent, paired or multifocal PVCs.",
        "Downsloping ST depression on the monitor, or angina during exercise.",
        "Fainting or light-headedness (cardiac syncope), or fatigue together with dyspnea, chest pain or an arrhythmia.",
        "Dyspnea that is severe or occurs at rest.",
        "Signs of a DVT (swelling, warmth, redness, pain in one leg).",
        "New or worsening edema, rapid weight gain, or signs of digitalis toxicity."
      ] } }
    ],
    sources: ["L2 s30–31 · MI presentation and warning signs", "L1 s31, s33, s36, s44 · When the PTA consults the PT", "L2 s4, s42, s62"]
  });
})();
