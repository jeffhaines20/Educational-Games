# Case plan

34 cases in six units (9 easy, 15 medium, 10 hard). Each entry gives the case id, order,
difficulty, title, the patient and setting, what the case must teach, a suggested step
outline (types in brackets), sources, and the Casebook entries it links to. Writers may
change details (names, numbers, wording, the exact steps) as long as the objectives,
difficulty, sources and ids stay — and the result passes `node tools/validate_content.js`.

Numbers in a case must be internally consistent (vitals, ABI pressures, Wells items).
Read `docs/DESIGN.md` §6 (format and quality bar) and `docs/SOURCE-NOTES.md` (what the
lectures say, and §0 — where the game follows current practice) before writing.
The finished example to copy is **2.1 The Snow Shoveler** in `js/content/u2-coronary.js`.

## Who writes what

| File | Writer | Cases | Casebook entries to write (`CCF.defineEntry`) |
|---|---|---|---|
| `u1-basics.js` | A | 1.1–1.5 | `blood-flow`, `conduction-system`, `cardiac-output`, `cardinal-symptoms` (concepts) |
| `u2-coronary.js` | A (lead wrote 2.1) | 2.2–2.6 | `angina`, `cad`, `mi` (conditions), `cardiac-rehab` (concept) |
| `u3-rhythm.js` | B | 3.1–3.5 | `pvc`, `afib`, `heart-block`, `vfib` |
| `u4-pump.js` | B | 4.1–4.5 | `heart-failure`, `pulmonary-edema`, `cardiomyopathy`, `cor-pulmonale` |
| `u5-pressure.js` | C | 5.1–5.5 | `hypertension`, `atherosclerosis`, `aneurysm` (conditions), `orthostatic-hypotension` (concept) |
| `u6-veins.js` | C | 6.6–6.8 | `cvi`, `dvt`, `pe` |
| `u6-arteries.js` | D | 6.1–6.5 | `pvd`, `raynauds`, `buergers`, `diabetic-angiopathy` |
| `reference.js` | lead | — | drugs: `alpha-blockers`, `ace-inhibitors`, `anticoagulants`, `statins`, `antiplatelets`, `beta-blockers`, `calcium-channel-blockers`, `diuretics`, `nitrates`, `thrombolytics`, `digoxin`; tools: `bp-categories`, `abi`, `edema-scale`, `wells-dvt`, `auscultation`, `ecg-basics`, `diagnostic-tests`, `procedures`, `warning-signs` |

Every case lists the Casebook ids it relates to (`casebook: [...]`); any id in the table
above may be used by any case.

---

## Unit 1 — Heart Basics (`basics`)

### 1.1 `basics-marathon-heart` · easy · "The Marathoner's Slow Heart"
*Tessa Morgan, 29, F — outpatient PT for an ankle sprain; runs 50 miles a week.*
Resting HR 48 and regular, BP 108/68, no dizziness, fainting or chest pain. Rhythm strip:
`sinus-brady`, rate 48 (5 complexes on a 6-second strip).
Teach: the SA node sets the pace (normal sinus rhythm about 70/min); counting rate with the
6-second method; CO = SV × HR; athlete's heart (training enlarges the LV → bigger stroke
volume → the same cardiac output at a lower rate); which symptoms would make a slow rate a
concern (dizziness, fainting, fatigue → report).
Steps: [single] what sets the pace · [numeric] 6-second method (answer 50, tolerance 10) ·
[numeric] CO with SV 105 mL → 5.0 L/min (trap: 5040 = mL) · [single] why her slow rate is
expected · optional [single] which new symptom you would report.
Sources: L1 s3, s11, s14–15. Casebook: `conduction-system`, `cardiac-output`, `ecg-basics`.

### 1.2 `basics-listening-posts` · easy · "Listening Posts"
*Ruth Alvarez, 73, F — home-health visit after a hospital stay; Dr. Okafor asks you to listen to her heart.*
Teach: the auscultation areas (use the `auscultation` diagram, numbers 1–5: 1 aortic 2nd ICS
right sternal border, 2 pulmonic 2nd ICS left, 3 Erb's point 3rd ICS left, 4 tricuspid 4th
ICS left, 5 mitral 5th ICS midclavicular); S1 = closure of the mitral and tricuspid valves,
S2 = aortic and pulmonary; the path of blood through the heart; an S3 in a 73-year-old
suggests ventricular failure → report.
Steps: [single] where to listen for the mitral valve (diagram) · [single] what makes S1 ·
[order] blood flow (e.g. right atrium → right ventricle → pulmonary artery → lungs →
pulmonary veins → left atrium → left ventricle → aorta) · [single] an extra sound just after
S2 at the apex, lying on her left side — what it is and what it suggests in her.
Sources: L1 s6–8, s21–26. Casebook: `blood-flow`, `auscultation`.

### 1.3 `basics-ankle-imprint` · easy · "The Ankle Imprint"
*Samuel Price, 70, M — inpatient rehab, day 3, after a hip fracture repair.*
Both ankles swollen; pressing the shin leaves a 5 mm pit that takes about 20 seconds to fill
back in; he also reports breathlessness on exertion, unusual fatigue and a 2 kg weight gain
this week. Teach: the edema grading scale (→ 3+); bilateral pitting edema points to a
systemic cause such as CHF, unilateral to a local one (DVT, PVD, thrombophlebitis); edema +
dyspnea + fatigue together → high probability of CHF; report to the PT.
Steps: [single, keepOrder] grade the edema · [single] what bilateral vs unilateral means ·
[multi] the other findings that, with the edema, point to CHF · [single] what you do.
Sources: L1 s33–36. Casebook: `edema-scale`, `cardinal-symptoms`, `heart-failure`.

### 1.4 `basics-pump-numbers` · medium · "Numbers on the Echo"
*Gerald Fontaine, 64, M — starting outpatient cardiac rehab six weeks after an anterior MI; long-standing hypertension.*
Echo: LV end-diastolic volume 140 mL, end-systolic volume 98 mL; resting HR 72.
Teach: stroke volume = EDV − ESV (42 mL; normal 60–80); EF = SV ÷ EDV (30 %; normal > 55 %);
CO = SV × HR (≈ 3.0 L/min, below the normal 4.5–5); reduced EF limits aerobic capacity;
preload vs afterload (hypertension raises afterload).
Steps: [numeric] SV · [numeric] EF (trap 70 % = ESV ÷ EDV) · [single] what this EF means ·
[numeric] CO · [single] which term describes the force his LV must overcome.
Sources: L1 s13–16, s43. Casebook: `cardiac-output`, `mi`, `cardiac-rehab`.

### 1.5 `basics-reading-the-strip` · medium · "Reading the Strip"
*Lena Park, 58, F — inpatient on telemetry after an episode of chest pressure; you're taking her for her first walk.*
Teach: what each part of the ECG shows (P, PR, QRS, ST, T); the selected abnormalities (ST
elevation = injury/new infarct; ST depression downsloping 2–3 mm = ischemia; inverted T =
ischemia; Q waves = infarction; wide QRS = bundle branch block); the 6-second method.
Steps: [single] which wave is ventricular depolarization · [classify] findings → meaning
(categories such as Ischemia / Injury / Infarction / Conduction problem) · [single] interpret
her strip (`nsr` with `st: "depression", stMm: 2, stSlope: "downsloping"`) · [numeric] rate
by the 6-second method · optional [single] what you do if she feels chest pressure on the walk.
Sources: L1 s18–20; L2 s9, s28–29. Casebook: `ecg-basics`.

## Unit 2 — Coronary Cases (`coronary`)

### 2.1 `coronary-snow-shoveler` · easy · "The Snow Shoveler" — written by the lead (the example)

### 2.2 `coronary-plaque-in-the-pipes` · medium · "Plaque in the Pipes"
*Dennis Kowalski, 55, M — outpatient PT for knee pain; two months of breathlessness and fatigue climbing stairs.*
Smokes a pack a day, inactive, stressful job, father had an MI at 52; hypertension, high LDL.
Teach: CAD = atherosclerotic plaque in the coronary arteries, often silent for years; partial
occlusion → exertional SOB, weakness or angina; risk factors (modifiable on the slide:
smoking, inactivity, alcohol abuse, stress — keep options unambiguous; don't ask whether
obesity/hypertension/diabetes are "modifiable"); cardiac catheterization with coronary
angiography is the most accurate test for location and severity; the LAD ("widow maker"); stents
and CABG.
Steps: [multi] modifiable risk factors · [single] what his symptoms most likely reflect ·
[test] the test that shows where and how bad the blockages are (reveals a cath report:
e.g. 85 % proximal LAD, 40 % RCA) · [single] why an LAD blockage is dangerous · [single] what a
stent does (or what CABG uses).
Sources: L2 s16–19, s28; L1 s48–49, s61–66. Casebook: `cad`, `procedures`, `diagnostic-tests`.

### 2.3 `coronary-chest-pain-at-rest` · medium · "Chest Pain at Rest"
*Lorraine Whitaker, 69, F — inpatient rehab day 4 after a knee replacement; known CAD with stable angina.*
Before your session: chest pressure that began 25 minutes ago while lying in bed; the nurse
gave one sublingual nitroglycerin 10 minutes ago without relief; sweaty; HR 98, BP 150/92.
Teach: unstable vs stable angina (at rest, no trigger, > 15 min, not relieved by NTG); unstable
angina is an emergency that can progress to MI; ECG ischemia (ST depression / T inversion);
action — don't start therapy, stay with her, activate the emergency/rapid response with the
nurse, notify the PT.
Steps: [single] which type of angina · [single] what you do · [multi] the features that make it
unstable · [single] interpret her 12-lead strip · [single] why it's treated as an emergency.
Sources: L2 s6–8, s30; L1 s20. Casebook: `angina`, `mi`, `warning-signs`.

### 2.4 `coronary-blunted-pulse` · medium · "The Blunted Pulse"
*Marcus Bell, 58, M — phase II outpatient cardiac rehab four weeks after an MI and stent.*
Meds: metoprolol (Lopressor), aspirin, clopidogrel (Plavix), atorvastatin (Lipitor),
lisinopril, nitroglycerin as needed. His HR barely rises (58 → 84) while he says the work feels
hard. Teach: beta blockers blunt HR and BP responses → use RPE (within the range the PT set);
antiplatelets → bleeding and bruising precautions; statins → report muscle aches (myalgia);
orthostatic hypotension when standing quickly.
Steps: [single] why his HR stays low · [single] how to monitor intensity · [multi] precautions for
aspirin + clopidogrel · [single] new thigh aches since starting atorvastatin · [single]
dizziness on standing after floor exercises.
Sources: L1 s52, s54–56; L2 s32–33. Casebook: `beta-blockers`, `antiplatelets`, `statins`, `cardiac-rehab`.

### 2.5 `coronary-quiet-heart-attack` · hard · "The Quiet Heart Attack"
*Denise Carter, 64, F — outpatient PT for knee osteoarthritis; type 2 diabetes, hypertension.*
Arrives "feeling off": nausea since morning, unusual fatigue, aching jaw and pain between the
shoulder blades, breathless walking in from the car park; took an antacid; no "chest pain".
Pale, sweaty, anxious. HR 106, BP 102/64 (usually 138/82), RR 22, SpO2 94 %.
Teach: atypical MI presentations (women, diabetes; silent MI); activate EMS at once (don't drive
her, don't wait, don't give medication); STEMI on the paramedics' 12-lead (ST elevation =
injury); zones of infarction (T inversion / ST elevation / Q waves); LAD most common; troponin
as today's marker (slides: CPK, AST, LDH).
Steps: [single] what must be ruled out first · [single] what you do · [single] interpret the
paramedics' strip (update; `nsr` rate ~104, `st: "elevation", stMm: 3`, lead V2) · [classify]
ECG signs → zone (ischemia / injury / infarction; 4+ items) · [single] the most commonly
blocked artery · optional [multi] why her MI could have been missed.
Sources: L2 s27–32. Casebook: `mi`, `warning-signs`, `ecg-basics`.

### 2.6 `coronary-trouble-on-the-treadmill` · hard · "Trouble on the Treadmill"
*Raymond Ortiz, 70, M — phase II cardiac rehab on telemetry, three months after an RCA stent.*
Meds: metoprolol, aspirin, atorvastatin, nitroglycerin as needed. Session log (table): warm-up
fine; minute 9 on the treadmill he reports mild tightness and the monitor shows 2.5 mm
downsloping ST depression; then PVCs in pairs. Teach: downsloping ST depression 2–3 mm =
ischemia → stop and monitor, notify the PT; PVC morphology (early, wide > 0.12 s, bizarre);
during exercise PVCs > 5/min, in pairs or multifocal are a concern; PVCs can progress to VT/VF.
Steps: [single] interpret the minute-9 strip · [single] what you do · [single] name the new beats
(`pvc` couplets strip) · [multi] which PVC patterns are a concern during exercise · [single]
what multifocal means / why they matter.
Sources: L1 s20, s41–42; L2 s6–8, s33. Casebook: `ecg-basics`, `pvc`, `angina`, `cardiac-rehab`.

## Unit 3 — Rhythm Cases (`rhythm`)

### 3.1 `rhythm-too-much-coffee` · easy · "Too Much Coffee"
*Maya Chen, 24, F — outpatient PT for knee pain; a week of "skipped beats" during exams.*
Five espressos a day, stress, vaping nicotine; no fainting or chest pain. Strip: `pvc`,
`pattern: "isolated"`. Teach: palpitations; benign causes (caffeine, anxiety, smoking/nicotine,
alcohol); recognising a PVC; when PVCs are a concern (exercise > 5/min, pairs, multifocal, or
with symptoms); report to the PT and suggest she tells her physician.
Steps: [single] what palpitations are · [single] name the early beat · [multi] triggers in her
story · [single] which PVC pattern would worry you during exercise.
Sources: L1 s3, s20, s40–42. Casebook: `pvc`, `cardinal-symptoms`.

### 3.2 `rhythm-irregular-pulse` · medium · "The Irregularly Irregular Pulse"
*Frank Morales, 76, M — outpatient PT after a hip replacement; hypertension, COPD.*
At intake: pulse irregularly irregular, ~112; fluttering in the chest, mild breathlessness,
dizziness walking — new since his referral. Teach: AFib (no P waves, irregular RR, wavy
baseline) vs flutter (regular sawtooth); loss of atrial kick lowers cardiac output; if the PTA
suspects AFib → consult the supervising PT immediately; later warfarin (Coumadin) → bleeding
and fall precautions.
Steps: [single] what the pulse suggests · [single] what you do · [test] confirm the rhythm
(reveals an `afib` strip, rate ~112) · [single] AFib vs flutter vs others on the strip ·
[single] why he's dizzy and breathless · [multi] warfarin precautions (update: he starts warfarin).
Sources: L1 s27–31, s53. Casebook: `afib`, `anticoagulants`.

### 3.3 `rhythm-fainting-grandfather` · medium · "The Fainting Grandfather"
*Earl Jackson, 82, M — home health; fainted twice this week, tired, light-headed; HR 36.*
Teach: syncope with a slow pulse is cardiac until proven otherwise → alert the PT/physician
immediately; the three degrees of heart block; third-degree (complete) block on the strip
(`av-block-3`, P rate ~80, ventricular ~36, wide escape beats); treatment is a pacemaker
(under the skin of the upper left chest; prevents slow rates → relieves fatigue,
light-headedness, fainting); a paced strip after implant. Don't say complete block "skips beats" (§0).
Steps: [single] priority response · [single] name the rhythm · [classify] descriptions →
first / second / third degree · [single] the usual treatment · [single] what the spikes on the
new strip (`paced`) are.
Sources: L1 s37, s44, s63–64. Casebook: `heart-block`, `procedures`.

### 3.4 `rhythm-yellow-halos` · hard · "Yellow Halos"
*Beatrice Novak, 81, F — home health; heart failure and atrial fibrillation.*
Meds: digoxin, furosemide (Lasix), lisinopril, warfarin. Three days of poor appetite, nausea,
vomiting twice, weakness, and "a yellow halo around the lights"; pulse irregular, 52; a little
confused. Teach: digitalis toxicity signs (anorexia, nausea, vomiting, irregular/slow heartbeat,
yellow halos); diuretics → electrolyte imbalance → raise the risk; digoxin's purpose in AFib is
rate control (§0); action: no exercise, contact the PT and her physician/nurse now; don't tell
her to change her medicines; call 911 if she faints, has chest pain or becomes unresponsive.
Steps: [single] most likely explanation · [multi] the findings that fit · [single] what you do ·
[single] which other medicine raises the risk · [single] what digoxin does for her AFib.
Sources: L2 s39, s72; L1 s31, s58. Casebook: `digoxin`, `diuretics`, `afib`, `heart-failure`.

### 3.5 `rhythm-collapse-in-the-gym` · hard · "Collapse in the Gym"
*Robert Hayes, 61, M — phase II cardiac rehab five weeks after an MI.*
A Holter this week showed frequent multifocal PVCs. On the bike he slumps over, unresponsive
and not breathing normally; the monitor shows `vfib`. Teach: VF = chaotic, no effective
contraction, fatal without treatment; the emergency sequence (current BLS: check
responsiveness and breathing → shout for help, activate the emergency response, get the AED →
start compressions → attach the AED and shock when advised → resume CPR immediately);
defibrillation stops the chaotic rhythm so a normal one can return; causes of VF; PVCs can
progress to VT/VF.
Steps: [single] name the rhythm · [order] the emergency actions · [single] what the shock does ·
[multi] common causes of VF · [single] the earlier warning sign in his file.
Sources: L1 s41–42, s45–47. Casebook: `vfib`, `pvc`.

## Unit 4 — Pump Failure (`pump`)

### 4.1 `pump-swollen-ankles` · easy · "The Swollen Ankles"
*Mae Thompson, 74, F — home health after a hospital stay for heart failure.*
2+ pitting edema of both ankles and shins, weight up 1.5 kg (3 lb) in two days, distended neck
veins sitting at 45°, swollen abdomen, ache under the right ribs, poor appetite; lungs clear.
Meds: furosemide (diuretic), lisinopril (ACE inhibitor). Teach: right-sided failure signs; JVD
reflects the right heart; diuretic precautions (dizziness and falls, dehydration, electrolyte
imbalance → weakness/cramps); report rapid weight gain.
Steps: [single] which side is failing · [classify] left vs right signs · [single] why the neck veins
show right-heart pressure · [multi] furosemide precautions.
Sources: L2 s34–38; L1 s34–35, s58. Casebook: `heart-failure`, `diuretics`, `edema-scale`.

### 4.2 `pump-three-pillows` · medium · "Three Pillows"
*Victor Hale, 67, M — outpatient PT for deconditioning; an MI two years ago, hypertension for 20 years.*
Sleeps on three pillows, wakes at night gasping, breathless after one block, dry cough at night,
tired; crackles at both lung bases; an S3; HR 102, BP 112/70, RR 22, SpO2 93 %. Meds: enalapril
(Vasotec), furosemide, metoprolol. Teach: left-sided failure signs (orthopnea, PND, crackles);
S3 in an adult over 40; echo for EF; ACE-inhibitor dry cough; exercise: walking, progressed
gradually by HR and RPE, no sudden increases.
Steps: [single] which side · [single] what the S3 suggests · [test] the test that measures EF
(reveals an echo: EF 30 %, dilated LV) · [single] which medicine can also cause his dry cough ·
[single] the best way to start his exercise.
Sources: L2 s34–39; L1 s22–23, s52, s56. Casebook: `heart-failure`, `ace-inhibitors`, `diagnostic-tests`.

### 4.3 `pump-stretched-heart` · medium · "The Stretched Heart"
*Russell Grant, 52, M — 25 years of heavy drinking (sober three months); progressive breathlessness, fatigue, ankle swelling, palpitations, poor appetite.*
Chest X-ray: enlarged heart. Teach: cardiomyopathy types (dilated — thin muscle, big chamber;
hypertrophic — thick LV; restrictive — fibrous, can't expand); causes (MI, alcoholism, long-term
severe HTN, SLE, end-stage renal disease, viral infection); complications (heart failure,
arrhythmia) to watch for during therapy.
Steps: [test] the test that shows chamber size and wall thickness (reveals echo: dilated LV, thin
walls, EF 25 %) · [single] which type · [classify] type ↔ feature · [multi] causes · [single] what
to watch for during his sessions.
Sources: L2 s43–44. Casebook: `cardiomyopathy`, `heart-failure`.

### 4.4 `pump-pink-froth` · hard · "Pink Froth"
*Gloria Simmons, 76, F — inpatient, day 2 of an admission for heart failure.*
During gait training: suddenly gasping, anxious, coughing frothy pink sputum, crackles
throughout, worse when the bed is flat; HR 128, BP 168/96, RR 34, SpO2 84 %. Teach: acute
pulmonary edema is an emergency; sit her upright, call for help (rapid response/nurse), stay and
monitor, oxygen per protocol — never lie her flat; mechanism (LV fails → pressure backs up →
fluid into alveoli); chest X-ray confirms; tell it apart from PE.
Steps: [single] what is happening · [single] your first actions · [single] the mechanism ·
[test] the test that confirms fluid in the lungs · [multi] findings pointing to pulmonary edema
rather than a pulmonary embolism.
Sources: L2 s36–37, s41–42. Casebook: `pulmonary-edema`, `heart-failure`.

### 4.5 `pump-smokers-right-heart` · hard · "The Smoker's Right Heart"
*Walter Briggs, 68, M — pulmonary rehab; 55 pack-years, COPD, home oxygen.*
Chronic productive cough, wheeze, exertional dyspnea, now ankle edema and JVD; hematocrit 57 %
(high); echo: enlarged, thickened right ventricle, raised pulmonary artery pressure; ECG report:
right ventricular hypertrophy. Meds include furosemide and digoxin. Teach: cor pulmonale
(RV enlargement from pulmonary hypertension due to lung disease); polycythemia; treatment
(oxygen, salt and fluid restriction, diuretics, treat the lung disease); PT (pursed-lip and
diaphragmatic breathing, teach the shin-press edema check, reposition if bed-bound, watch for
digitalis toxicity).
Steps: [single] which condition · [single] the mechanism · [single] the lab finding and why ·
[multi] what you'll teach or do · [single] the digoxin warning sign to watch for · optional
[single] the aim of medical treatment.
Sources: L2 s68–72. Casebook: `cor-pulmonale`, `heart-failure`, `digoxin`.

## Unit 5 — Pressure Cases (`pressure`)

### 5.1 `pressure-numbers-game` · easy · "The Numbers Game"
*Carmen Ruiz, 49, F — outpatient PT intake for shoulder pain.*
BP 144/92, repeated 142/90; no symptoms; family history of hypertension, BMI 31, desk job, 2–3
drinks most nights, salty diet. Teach: the AHA categories (L2 s23); hypertension is usually
silent; modifiable vs non-modifiable risk factors; primary vs secondary; report to the PT and
advise follow-up with her physician.
Steps: [single, keepOrder] her category · [classify] readings → category (categories may be up
to five; keepOrder for categories) · [single] why it's called silent · [multi] modifiable risk
factors in her chart · optional [single] primary vs secondary.
Sources: L2 s20–26. Casebook: `hypertension`, `bp-categories`.

### 5.2 `pressure-dizzy-at-the-bars` · medium · "Dizzy at the Parallel Bars"
*George Lindqvist, 72, M — outpatient PT after a knee replacement.*
Meds: lisinopril, hydrochlorothiazide, doxazosin (Cardura), atorvastatin. After 15 minutes of mat
exercises he stands quickly: "the room is spinning", pale. Supine 136/82, HR 70 → standing 108/66,
HR 92. Teach: orthostatic hypotension (a fall of ≥ 20 systolic or ≥ 10 diastolic on standing —
explain it); which drug classes cause it (alpha blockers, ACE inhibitors, diuretics; also beta
blockers, CCBs, nitrates); respond (sit/lie him down safely, monitor until recovered, notify
the PT); prevent (staged position changes, ankle pumps, pause sitting); diuretic cramps.
Steps: [single] what happened · [numeric] the systolic drop (28 mmHg) · [multi] which of his
medicines contribute (atorvastatin doesn't) · [single] what you do now · [single] how to prevent
it next time · optional [single] his leg cramps.
Sources: L1 s51–52, s56–59. Casebook: `orthostatic-hypotension`, `alpha-blockers`, `ace-inhibitors`, `diuretics`.

### 5.3 `pressure-stiff-aorta` · medium · "The Stiff Aorta"
*Edith Moore, 79, F — outpatient balance programme.*
BP 172/74 on repeat; a CT for another reason showed heavy calcification of the aorta; former
smoker, high cholesterol; started amlodipine three weeks ago and now has swelling of both
ankles. Teach: isolated systolic hypertension (common after 50); aortic atherosclerosis
(silent; calcified rigid aorta → hypertension; emboli; aneurysm); atherosclerosis symptoms by
artery (coronary → angina; cerebral → numbness/weakness, slurred speech, facial droop;
peripheral → claudication); CCB side effect (peripheral edema) — report, and watch for CHF signs.
Steps: [single] name her BP pattern · [single] why a rigid aorta raises systolic pressure ·
[classify] artery → symptom · [multi] complications of aortic atherosclerosis · [single] her new
ankle swelling.
Sources: L2 s12–15, s22; L1 s57. Casebook: `atherosclerosis`, `hypertension`, `calcium-channel-blockers`.

### 5.4 `pressure-back-pain-that-wasnt` · hard · "The Back Pain That Wasn't"
*Leonard Fisk, 74, M — outpatient PT for chronic low back pain; smoker, hypertension, a 5.2 cm AAA "being watched".*
Today: sudden severe low back pain spreading to his abdomen and groin, unlike his usual pain;
nauseated, light-headed, pale and clammy; HR 124, BP 86/52 (usually 146/88), RR 24. Teach:
ruptured AAA → hypovolemic shock, usually fatal → call 911 immediately, keep him lying still,
no manual therapy or heat, notify the PT; shock signs; aneurysm sites and their symptoms (AAA,
TAA, brain); imaging (ultrasound, CT); risk factors.
Steps: [single] the most dangerous explanation · [single] what you do · [multi] signs of shock ·
[classify] symptoms → AAA / TAA / brain aneurysm · [single] the imaging used to find an AAA.
Sources: L2 s2–5. Casebook: `aneurysm`.

### 5.5 `pressure-worst-headache` · hard · "The Worst Headache"
*Anita Shah, 47, F — outpatient PT for neck pain; hypertension, ran out of her BP pills a week ago.*
During the session: sudden "worst headache of my life", vomiting, double vision, confusion;
BP 196/122, HR 96. Teach: hypertensive crisis (> 180 and/or > 120); ruptured brain aneurysm
(subarachnoid hemorrhage: sudden severe headache, vision loss/double vision, vomiting, mental
change, seizure, loss of consciousness) — either way an emergency: call 911, keep her safe and
monitored, notify the PT; Circle of Willis; complications of poorly controlled hypertension.
Steps: [single] her BP category · [single] what you do · [multi] the serious conditions that could
explain this (crisis, ruptured brain aneurysm; not a tension headache) · [single] where brain
aneurysms usually form · [multi] long-term complications of uncontrolled hypertension.
Sources: L2 s4, s22–26. Casebook: `aneurysm`, `hypertension`, `bp-categories`.

## Unit 6 — Vessel Cases (`vessels`)

### 6.1 `vessels-two-blocks-and-a-bench` · easy · "Two Blocks and a Bench" (writer D)
*Arthur Bell, 68, M — referred for a supervised walking programme for leg pain; smoker, diabetes, high cholesterol.*
Right calf cramps after two blocks, eased by standing still for 2–3 minutes; right foot cool,
shiny hairless shin, weak pedal pulses, pale when raised, dusky red when hanging down.
Teach: intermittent claudication from PVD; arterial signs; the walking programme (walk to
near-maximal pain, rest until it eases, repeat; goal 30 minutes continuous); education (stop
smoking, foot and skin care, limb protection, avoid cold).
Steps: [single] name the symptom · [single] why it happens · [multi] arterial signs in his exam ·
[single] the walking programme · [multi] education points.
Sources: L1 s38; L2 s45–49, s65. Casebook: `pvd`.

### 6.2 `vessels-cold-fingers` · easy · "Cold Fingers" (D)
*Priya Nair, 31, F — hand therapy for scleroderma stiffness.*
Fingers turn white (then blue), cold and numb in the cold or when she's stressed; smokes
occasionally; takes nifedipine (Procardia). Teach: Raynaud's (women 20–49, connective-tissue
disease; triggers cold, stress, smoking, vibrating tools); no cold packs, pools at least body
temperature, no non-thermal whirlpools; CCB side effects (dizziness, headache, hypotension,
peripheral edema).
Steps: [single] which condition · [multi] her triggers · [single] the modality to avoid · [single]
a nifedipine side effect to watch for.
Sources: L2 s55–56; L1 s57. Casebook: `raynauds`, `calcium-channel-blockers`.

### 6.3 `vessels-the-index-case` · medium · "The Index Case" (D)
*Ingrid Larsen, 71, F — calf pain walking, worse on the right.*
Brachial systolic: right 132, left 140. Ankle systolic: right posterior tibial 90, dorsalis
pedis 84; left posterior tibial 122, dorsalis pedis 118. ABI right = 90 ÷ 140 = 0.64; left =
122 ÷ 140 = 0.87. Teach: the ABI method (each leg: its higher ankle pressure ÷ the higher arm
pressure); the interpretation table; > 1.30 = non-compressible calcified vessels (common in
diabetes; ABI unreliable).
Steps: [single] which pressures to use · [numeric] right ABI (0.64 ± 0.01; traps 0.68 = right
arm, 0.60 = lower ankle) · [numeric] left ABI (0.87 ± 0.01) · [single, keepOrder] interpret the
right leg · [single] what an ABI of 1.40 would mean.
Sources: L2 s48–50. Casebook: `abi`, `pvd`.

### 6.4 `vessels-young-smokers-fingertips` · medium · "The Young Smoker's Fingertips" (D)
*Tyler Brooks, 29, M — construction worker; 1½ packs a day plus chewing tobacco.*
Painful, cold, bluish fingertips and toes; a small painful ulcer on the tip of his right index
finger; tingling; can't tell hot from cold well. Teach: Buerger's disease (inflammatory
occlusion of small arteries and veins of hands and feet; young male tobacco users; starts
distally, moves proximally; ulcers, gangrene); stopping all tobacco is essential; protect from
heat and cold (poor sensation and circulation).
Steps: [single] the most likely condition (vs Raynaud's, atherosclerotic PAD, DVT) · [multi]
features that fit · [single] the most important treatment · [single] modality safety · [single]
how it progresses.
Sources: L2 s52–53. Casebook: `buergers`, `pvd`.

### 6.5 `vessels-painless-wound` · medium · "The Painless Wound" (D)
*Rosa Delgado, 63, F — wound care referral; type 2 diabetes for 18 years with neuropathy.*
A round 1.5 cm ulcer under the first metatarsal head she "never felt"; absent monofilament
sensation at 6 of 10 sites; cool feet, faint pulses; ABI 1.38. Teach: diabetic angiopathy
(accelerated atherosclerosis + neuropathy); diabetic ulcers are painless, slow to heal, on the
plantar surface → gangrene/amputation risk; ABI > 1.30 = non-compressible (unreliable) → other
tests (Doppler, transcutaneous oximetry); daily foot-care education.
Steps: [single] why it doesn't hurt · [single] what her ABI means · [test] a better test of
blood supply here · [multi] foot-care teaching · optional [single] why it heals slowly.
Sources: L2 s54, s47–50. Casebook: `diabetic-angiopathy`, `abi`.

### 6.6 `vessels-tale-of-two-ulcers` · medium · "A Tale of Two Ulcers" (writer C)
*Vera Simmons, 70, F — wound clinic; a DVT in her left leg 10 years ago; works as a cashier.*
Left lower leg: brown (hemosiderin) staining, swelling worse by evening, heavy aching that eases
with her legs up, a shallow, weeping, irregular ulcer above the inner ankle; pulses normal; ABI
1.02. Teach: chronic venous insufficiency (venous hypertension → edema, hemosiderin, stasis
ulcers); the arterial-vs-venous table (L2 s65–66); elevate legs, avoid long standing; venous
ultrasonography.
Steps: [single] which condition · [classify] findings → arterial or venous (her findings plus
classic arterial ones) · [single] where venous ulcers typically form · [single] positioning
advice · [test] the test that shows the veins.
Sources: L2 s63–67. Casebook: `cvi`, `pvd`.

### 6.7 `vessels-post-op-calf` · hard · "The Post-Op Calf" (C)
*Marcus Webb, 58, M — inpatient, nine days after abdominal surgery for colon cancer (chemotherapy planned); mostly in bed for the first four days.*
Left calf 3.5 cm larger than the right (10 cm below the tibial tuberosity), warm, red, tender
along the deep veins; pitting edema in the left leg only; temperature 99.9 °F; he winces when
his foot is dorsiflexed; the whole leg is not swollen; no previous DVT; the surgeon's note says no
other diagnosis is more likely. Wells = 5 (cancer, surgery/bedridden, calf > 3 cm, localised
tenderness, pitting edema in that leg). Teach: DVT signs; Homan's sign is unreliable; Wells
score (≥ 2 likely); stop — no walking or exercise of the leg, no massage — keep him resting and
notify the PT and nurse/physician now; Doppler ultrasound confirms; PE is the danger; once
anticoagulated, early walking is encouraged (§0).
Steps: [multi] findings suggesting DVT (Homan's as a distractor) · [numeric] Wells score with a
criteria table exhibit (5; traps e.g. 6 or 7 for counting fever/Homan's) · [single] what the
score means · [single] what you do · [test] the confirming test (reveals the ultrasound) ·
[single] the complication you watch for.
Sources: L2 s57–61. Casebook: `dvt`, `wells-dvt`, `anticoagulants`.

### 6.8 `vessels-sudden-breathlessness` · hard · "Sudden Breathlessness" (C)
*Joan Mercer, 38, F — outpatient PT for ankle-fracture rehab; cast off a week ago after six weeks; on combined oral contraceptives; smokes; flew 11 hours two days ago.*
Mid-session: sudden breathlessness, sharp chest pain worse with deep breaths and coughing,
blood-streaked sputum, anxious and sweaty; right calf swollen and tender; HR 122, BP 118/76,
RR 30, SpO2 88 %. Teach: PE (can mimic MI; pleuritic pain, sudden dyspnea, hemoptysis,
unilateral leg swelling); emergency — call 911, keep her at rest sitting up, monitor, oxygen per
protocol, notify the PT; risk factors; CT or V/Q scan confirm; thrombolytics (alteplase) →
bleeding risk including intracranial — avoid trauma.
Steps: [single] the most likely cause · [single] what you do · [multi] features pointing to PE
rather than MI · [multi] her clot risk factors · [test] the confirming test · [single] the PT
implication of a thrombolytic.
Sources: L2 s57–62; L1 s60. Casebook: `pe`, `dvt`, `thrombolytics`.
