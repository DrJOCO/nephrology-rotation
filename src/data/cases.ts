// ═══════════════════════════════════════════════════════════════════════
//  Clinical Case-Based Learning — Weekly Vignettes
//  12 cases (3/week), 3-5 questions each
// ═══════════════════════════════════════════════════════════════════════

export const WEEKLY_CASES = {
  1: [
    // ─── Week 1: AKI & Fluid Management ─────────────────────────────
    {
      id: "w1c1",
      title: "AKI in Sepsis",
      category: "Acute Kidney Injury",
      difficulty: "Beginner",
      topics: ["AKI", "Fluid Management"],
      scenario: `A 68-year-old man with a history of diabetes and hypertension presents to the emergency department with fever (39.2°C), chills, and right flank pain for two days. He has been taking less fluids orally due to nausea.

On exam, he is tachycardic (HR 112), hypotensive (BP 88/54), and has right costovertebral angle tenderness. Urinalysis shows pyuria and bacteriuria. Blood cultures are drawn.

Labs: Cr 3.8 mg/dL (baseline 1.1), BUN 62 mg/dL, K+ 5.1 mEq/L, bicarb 18 mEq/L, lactate 4.2 mmol/L. Urine output over the past 6 hours is 80 mL.`,
      questions: [
        {
          q: "What KDIGO stage of AKI does this patient have based on the serum creatinine criteria?",
          choices: [
            "Stage 1 — Cr increase 1.5-1.9x baseline",
            "Stage 2 — Cr increase 2.0-2.9x baseline",
            "Stage 3 — Cr increase ≥3x baseline or Cr ≥4.0 mg/dL",
            "Cannot be staged without a prior 48-hour creatinine"
          ],
          answer: 2,
          explanation: "Baseline Cr is 1.1, and current Cr is 3.8 — this is a 3.45x increase from baseline, meeting KDIGO Stage 3 criteria (≥3x baseline). The urine output criterion (< 0.3 mL/kg/hr for ≥24h) would also qualify for Stage 3 if sustained, but creatinine alone is sufficient for staging."
        },
        {
          q: "What is the most appropriate initial fluid resuscitation strategy?",
          choices: [
            "Normal saline (0.9% NaCl) 30 mL/kg bolus",
            "Lactated Ringer's or Plasma-Lyte 30 mL/kg bolus",
            "0.45% NaCl at 250 mL/hr maintenance",
            "5% albumin 500 mL bolus"
          ],
          answer: 1,
          explanation: "The Surviving Sepsis Campaign recommends 30 mL/kg crystalloid within the first 3 hours for sepsis-induced hypoperfusion. Balanced crystalloids (LR, Plasma-Lyte) are preferred over normal saline based on the SMART trial, which showed lower rates of major adverse kidney events (MAKE-30) with balanced solutions. Normal saline's supraphysiologic chloride content can worsen hyperchloremic metabolic acidosis and may reduce renal blood flow."
        },
        {
          q: "Which finding best supports a pre-renal contribution to this patient's AKI?",
          choices: [
            "BUN/Cr ratio > 20:1",
            "Urine sodium < 20 mEq/L and FENa < 1%",
            "Presence of muddy brown casts on urine microscopy",
            "Both A and B"
          ],
          answer: 3,
          explanation: "Both an elevated BUN/Cr ratio (>20:1) and a low FENa (<1%) support pre-renal physiology. However, in sepsis, the AKI is often multifactorial — pre-renal (volume depletion) and intrinsic (acute tubular injury from hypoperfusion). Muddy brown casts would indicate established ATN. In practice, these patients often have a component of both."
        },
        {
          q: "Despite 3L of IV fluids, the patient remains oliguric with rising creatinine (now 5.2). Potassium is 6.1 and ECG shows peaked T waves. What is the most urgent next step?",
          choices: [
            "Start broad-spectrum antibiotics",
            "Administer IV calcium gluconate, insulin/glucose, and consult nephrology for dialysis",
            "Order a renal ultrasound to rule out obstruction",
            "Switch to colloid resuscitation with albumin"
          ],
          answer: 1,
          explanation: "Hyperkalemia with ECG changes (peaked T waves) is a medical emergency requiring immediate cardiac membrane stabilization with IV calcium gluconate, followed by potassium-lowering measures (insulin/glucose, albuterol). With fluid-refractory oliguria and rising creatinine, nephrology should be consulted for potential renal replacement therapy. Antibiotics should already be running per sepsis protocol; renal ultrasound is important but not the most urgent step when ECG changes are present."
        }
      ]
    },
    {
      id: "w1c2",
      title: "Contrast-Induced AKI Prevention",
      category: "Acute Kidney Injury",
      difficulty: "Intermediate",
      topics: ["AKI", "CKD"],
      scenario: `A 72-year-old woman with CKD stage 3b (baseline Cr 2.1, eGFR 28) and diabetes is admitted for an acute NSTEMI. Cardiology plans urgent cardiac catheterization with possible PCI.

Her current medications include metformin, lisinopril, and furosemide. She weighs 70 kg. Her morning labs show Cr 2.3, K+ 4.8, bicarb 20.

The cardiology fellow asks for your recommendations on preventing contrast-induced nephropathy.`,
      questions: [
        {
          q: "What is the most evidence-based strategy to prevent contrast-associated AKI in this patient?",
          choices: [
            "IV N-acetylcysteine (NAC) 600 mg BID starting 24 hours before the procedure",
            "IV isotonic saline or sodium bicarbonate hydration before and after contrast",
            "Prophylactic hemodialysis immediately after the procedure to remove contrast",
            "Oral mannitol to promote osmotic diuresis"
          ],
          answer: 1,
          explanation: "IV volume expansion with isotonic crystalloid (normal saline or sodium bicarbonate) is the cornerstone of contrast-associated AKI prevention. The PRESERVE trial showed no benefit of NAC over placebo and no benefit of sodium bicarbonate over normal saline. Prophylactic dialysis has not been shown to prevent contrast-induced AKI and may worsen outcomes. The key interventions are adequate hydration and minimizing contrast volume."
        },
        {
          q: "Which of this patient's medications should be held periprocedurally?",
          choices: [
            "Lisinopril only",
            "Metformin only",
            "Metformin and furosemide",
            "All three medications"
          ],
          answer: 2,
          explanation: "Metformin should be held before contrast procedures in patients with eGFR <30 (or significant AKI risk) due to the risk of lactic acidosis if AKI develops. It can be resumed 48 hours post-procedure if renal function remains stable. Furosemide (diuretic) should be held to avoid volume depletion, which increases AKI risk. ACE inhibitors are controversial — some hold them periprocedurally, but this is less well-established than metformin/diuretic cessation."
        },
        {
          q: "Which factor most increases this patient's risk for contrast-associated AKI?",
          choices: [
            "Age over 70",
            "Baseline eGFR < 30 mL/min",
            "Diabetes mellitus",
            "Use of ACE inhibitor"
          ],
          answer: 1,
          explanation: "While all of these are risk factors, pre-existing CKD (especially eGFR <30) is the single strongest predictor of contrast-associated AKI. The Mehran risk score assigns the highest point values to eGFR <40 and use of intra-aortic balloon pump. Diabetes amplifies the risk but primarily because of its association with CKD. The risk is negligible with eGFR >60."
        }
      ]
    },
    {
      id: "w1c3",
      title: "Post-Surgical Oliguria",
      category: "Acute Kidney Injury",
      topics: ["AKI", "Post-Renal AKI", "Urinalysis"],
      difficulty: "Beginner",
      scenario: `A 55-year-old man underwent elective open abdominal aortic aneurysm repair 18 hours ago. He has been in the surgical ICU and the nurse calls you because his urine output has been 15 mL/hr for the past 4 hours (total 60 mL).

Pre-op: Cr 0.9, current Cr 1.4. He received 4 units PRBCs intra-operatively and his estimated blood loss was 1200 mL. Current vitals: BP 105/68, HR 98, CVP 4 mmHg.

His Foley catheter was just flushed and is patent. Current IVF: D5 0.45% NaCl at 75 mL/hr.`,
      questions: [
        {
          q: "What is the most likely primary mechanism of this patient's oliguria?",
          choices: [
            "Pre-renal azotemia from inadequate volume resuscitation",
            "Obstructive uropathy from Foley catheter malfunction",
            "Acute interstitial nephritis from perioperative antibiotics",
            "Atheroembolic renal disease from aortic cross-clamping"
          ],
          answer: 0,
          explanation: "Post-surgical oliguria is most commonly pre-renal. This patient had significant intra-operative blood loss (1200 mL), his CVP is low (4 mmHg suggesting inadequate filling), and his current IVF rate is conservative. The Foley was confirmed patent by flushing. While aortic cross-clamp injury is a real risk during AAA repair, pre-renal physiology should be addressed first with an IV fluid challenge."
        },
        {
          q: "You give a 500 mL LR bolus. Over the next 2 hours, urine output increases to 45 mL/hr. What does this response suggest?",
          choices: [
            "Established acute tubular necrosis with recovery phase",
            "Volume-responsive pre-renal AKI",
            "Post-renal obstruction that was relieved",
            "Contrast-induced nephropathy resolving"
          ],
          answer: 1,
          explanation: "A brisk improvement in urine output after a fluid bolus is the hallmark of volume-responsive pre-renal AKI. The kidneys are structurally intact but were underperfused. In ATN, oliguria typically persists for days despite adequate volume resuscitation before the recovery (diuretic) phase begins. This rapid response helps distinguish functional pre-renal azotemia from structural tubular injury."
        },
        {
          q: "If this patient's oliguria had persisted and Cr rose to 3.5 by post-op day 2 with muddy brown casts on urine microscopy, what would be the most likely diagnosis?",
          choices: [
            "Pre-renal azotemia",
            "Ischemic acute tubular necrosis (ATN)",
            "Acute glomerulonephritis",
            "Bilateral ureteral injury"
          ],
          answer: 1,
          explanation: "Muddy brown granular casts are the hallmark of acute tubular necrosis. In the post-surgical setting with significant blood loss and hemodynamic instability, ischemic ATN is the most common cause of persistent AKI. The transition from functional pre-renal azotemia to established ATN occurs when tubular injury becomes irreversible. Management is supportive — maintain euvolemia and avoid further nephrotoxins."
        },
        {
          q: "Which of the following is NOT an indication for emergent dialysis in this postoperative patient?",
          choices: [
            "Refractory hyperkalemia (K+ 6.8) with ECG changes",
            "Severe metabolic acidosis (pH 7.1) refractory to bicarbonate",
            "BUN of 80 mg/dL",
            "Pulmonary edema refractory to diuretics"
          ],
          answer: 2,
          explanation: "The classic indications for emergent dialysis can be remembered with the mnemonic AEIOU: Acidosis (refractory), Electrolytes (hyperkalemia), Ingestion (toxic), Overload (volume/pulmonary edema), and Uremia (symptoms like pericarditis, encephalopathy, bleeding). An elevated BUN alone, without uremic symptoms, is not an indication for emergent dialysis. BUN >100 or the presence of uremic symptoms would warrant consideration."
        }
      ]
    },
    {
      id: "w1c4",
      title: "AKI in Decompensated Cirrhosis",
      category: "Hepatorenal Syndrome",
      difficulty: "Intermediate",
      topics: ["Hepatorenal Syndrome", "AKI"],
      scenario: `A 62-year-old man with alcohol-related cirrhosis (Child-Pugh C, MELD 28) and refractory ascites is admitted with confusion and worsening abdominal distension. He underwent large-volume paracentesis (6L) two days ago without albumin replacement. His home medications include furosemide 40mg daily and spironolactone 100mg daily.

On exam, he is afebrile, BP 88/52, HR 104. He has jaundice, spider angiomata, tense ascites, and asterixis. There is no peripheral edema.

Labs: Cr 3.8 mg/dL (baseline 1.0 three months ago), BUN 48, Na 126 mEq/L, K 4.8 mEq/L. UA shows no protein, no blood, bland sediment. Urine Na 4 mEq/L. Renal ultrasound shows normal-sized kidneys without hydronephrosis.

A diagnostic paracentesis shows 380 PMNs/\u03bcL in the ascitic fluid.`,
      questions: [
        {
          q: "What is the most likely precipitant of this patient's AKI?",
          choices: [
            "Contrast-induced nephropathy",
            "Spontaneous bacterial peritonitis (SBP) and large-volume paracentesis without albumin",
            "Obstructive uropathy",
            "ATN from aminoglycoside exposure",
          ],
          answer: 1,
          explanation: "The ascitic fluid PMN count >250/\u03bcL confirms SBP, which is the most common precipitant of HRS-AKI. Additionally, large-volume paracentesis without albumin replacement causes effective hypovolemia and is another known HRS trigger. Always perform a diagnostic paracentesis in cirrhotic patients with AKI \u2014 even if they appear asymptomatic.",
        },
        {
          q: "After treating the SBP with ceftriaxone, giving adequate IV albumin volume resuscitation, and holding diuretics, the Cr remains at 3.5 mg/dL. What criteria have been met?",
          choices: [
            "KDIGO Stage 1 AKI only \u2014 too early to diagnose HRS",
            "ICA diagnostic criteria for HRS-AKI",
            "Acute tubular necrosis based on the urine Na",
            "Post-renal AKI requiring urologic intervention",
          ],
          answer: 1,
          explanation: "This patient meets the ICA/ADQI 2024 HRS-AKI criteria: (1) Cirrhosis + ascites, (2) AKI by KDIGO criteria (Cr 1.0\u21923.8, >3\u00d7 baseline = Stage 3), (3) No shock, nephrotoxins, obstruction, or glomerular disease, (4) No improvement after adequate volume resuscitation and diuretic withdrawal. The 2024 update dropped the rigid 48-hour 1 g/kg/day albumin challenge in favor of clinically adequate volume resuscitation. The very low urine Na (4 mEq/L) and bland sediment are characteristic but not required.",
        },
        {
          q: "What is the most appropriate next step in management?",
          choices: [
            "Start norepinephrine drip for vasopressor support",
            "Initiate hemodialysis via tunneled catheter",
            "Start terlipressin plus continue IV albumin",
            "Increase the IV albumin dose and wait another 48 hours",
          ],
          answer: 2,
          explanation: "Terlipressin + albumin is the standard treatment for HRS-AKI (CONFIRM trial: 39% vs 18% HRS reversal). Terlipressin causes splanchnic vasoconstriction, counteracting the vasodilation that drives HRS pathophysiology. Important caveat: assess for volume overload before starting terlipressin (respiratory failure risk). Norepinephrine + albumin is an alternative if terlipressin is unavailable. Dialysis is reserved for standard indications (AEIOU). Liver transplant remains the definitive treatment.",
        },
        {
          q: "The patient's MELD score is 28. Why is this relevant to HRS management?",
          choices: [
            "MELD determines which diuretic to use",
            "MELD incorporates creatinine and affects liver transplant priority \u2014 HRS-AKI is ultimately treated by transplant",
            "MELD determines the dose of terlipressin",
            "MELD is used to calculate the FENa",
          ],
          answer: 1,
          explanation: "The MELD score incorporates creatinine, bilirubin, and INR to predict 90-day mortality in cirrhosis. Rising Cr from HRS increases MELD, which raises liver transplant priority. This is critically important because liver transplant is the only definitive treatment for HRS \u2014 medical therapy with terlipressin is a bridge. All HRS-AKI patients should be evaluated for transplant candidacy.",
        },
      ],
    },
    {
      id: "w1c5",
      title: "Found Down with Muscle Injury",
      category: "Rhabdomyolysis",
      difficulty: "Beginner",
      topics: ["Rhabdomyolysis", "AKI"],
      scenario: `A 34-year-old man is brought to the ED by EMS after being found unresponsive in his apartment. His roommate reports he went out drinking two nights ago and was not seen until now. There is no known trauma. He has no significant medical history and takes no medications. A toxicology screen is positive for alcohol and benzodiazepines.

On exam, he is drowsy but arousable. BP 100/60, HR 110, T 37.8\u00b0C. His right thigh and buttock are swollen and tender. His urine is dark brown.

Labs: CK 82,000 U/L, Cr 4.2 mg/dL (baseline unknown, assumed normal), BUN 52, K+ 6.4 mEq/L, Ca\u00b2+ 6.8 mg/dL, Phosphorus 7.2 mg/dL, pH 7.28, HCO\u2083 16 mEq/L. UA: Heme 3+, RBCs 0-1/HPF. ECG shows peaked T waves.`,
      questions: [
        {
          q: "What does the urine dipstick result (heme 3+ with <3 RBCs/HPF) indicate?",
          choices: [
            "Glomerulonephritis with RBC casts",
            "Myoglobinuria from rhabdomyolysis",
            "Hemoglobinuria from hemolytic anemia",
            "False positive from UTI",
          ],
          answer: 1,
          explanation: "Heme-positive urine with few/no RBCs on microscopy = myoglobinuria (or hemoglobinuria). In this clinical context (CK 82,000, swollen limb, found down), myoglobinuria from rhabdomyolysis is the diagnosis. The urine dipstick detects the heme moiety in both hemoglobin and myoglobin \u2014 microscopy distinguishes them by looking for RBCs.",
        },
        {
          q: "The K+ is 6.4 mEq/L with peaked T waves on ECG. What is the FIRST intervention?",
          choices: [
            "IV insulin + D50 to shift potassium intracellularly",
            "IV calcium gluconate for cardiac membrane stabilization",
            "Oral kayexalate to remove potassium",
            "IV normal saline at 500 mL/h to enhance renal K+ excretion",
          ],
          answer: 1,
          explanation: "With ECG changes (peaked T waves), the first step is ALWAYS IV calcium gluconate \u2014 it stabilizes the cardiac membrane within minutes, protecting against arrhythmia. It does NOT lower K+ levels. After calcium, give insulin + D50 (shifts K+ into cells in 15-30 min), then consider albuterol nebs. K+ removal (kayexalate, furosemide, or dialysis) is step 3. Fluids help but are not the immediate priority when ECG is abnormal.",
        },
        {
          q: "What is the target urine output for IV fluid resuscitation in rhabdomyolysis?",
          choices: [
            "0.5 mL/kg/h (standard AKI target)",
            "1 mL/kg/h",
            "200-300 mL/h (aggressive volume resuscitation)",
            "Urine output doesn't matter \u2014 just replace the fluid deficit",
          ],
          answer: 2,
          explanation: "The target UOP in rhabdomyolysis is 200-300 mL/h \u2014 much more aggressive than typical AKI management. The goal is to dilute myoglobin in the tubules and prevent cast formation. Use isotonic crystalloid (NS or LR). There is no proven benefit to IV bicarbonate or mannitol over crystalloid alone. Monitor closely for volume overload, especially if the patient develops oliguric AKI.",
        },
      ],
    }
  ],

  2: [
    // ─── Week 2: Electrolytes & Acid-Base ────────────────────────────
    {
      id: "w2c1",
      title: "Severe Hyponatremia",
      category: "Electrolytes",
      topics: ["Hyponatremia", "Fluid Management"],
      difficulty: "Intermediate",
      scenario: `A 45-year-old woman with a history of depression presents with confusion, nausea, and a witnessed seizure. She was recently started on an SSRI (sertraline) three weeks ago. She reports increased water intake because she "heard staying hydrated is healthy."

Labs: Na+ 116 mEq/L, serum osmolality 242 mOsm/kg, urine osmolality 520 mOsm/kg, urine Na+ 48 mEq/L, K+ 3.6, Cr 0.7, glucose 95.

Physical exam: Appears euvolemic, no edema, JVP normal, mucous membranes moist.`,
      questions: [
        {
          q: "What is the most likely cause of this patient's hyponatremia?",
          choices: [
            "Primary polydipsia (psychogenic water intoxication)",
            "SIADH secondary to SSRI use",
            "Cerebral salt wasting",
            "Hypothyroidism"
          ],
          answer: 1,
          explanation: "The key findings are: euvolemic hyponatremia with a concentrated urine (osmolality 520, higher than expected if ADH were suppressed) and elevated urine sodium (48). This pattern is classic for SIADH. SSRIs are a well-known cause of SIADH. In primary polydipsia, the urine would be maximally dilute (<100 mOsm/kg) because ADH is appropriately suppressed. Cerebral salt wasting would present with hypovolemia."
        },
        {
          q: "Given that this patient is having seizures, what is the correct initial management?",
          choices: [
            "Fluid restriction to 1L/day and recheck sodium in 24 hours",
            "3% hypertonic saline 100-150 mL bolus over 10-20 minutes, may repeat x2 if symptoms persist",
            "Normal saline infusion at 150 mL/hr with serial sodium checks",
            "Tolvaptan 15 mg orally"
          ],
          answer: 1,
          explanation: "Symptomatic hyponatremia with seizures is a medical emergency. Current guidelines recommend a bolus of 100-150 mL of 3% hypertonic saline over 10-20 minutes, which can be repeated up to 2 additional times if severe symptoms persist. The goal is to raise sodium by 4-6 mEq/L in the first few hours to stop seizures, NOT to normalize sodium. Fluid restriction and tolvaptan are too slow for acute symptoms. Tolvaptan should not be used in severe symptomatic hyponatremia."
        },
        {
          q: "What is the maximum safe rate of sodium correction to avoid osmotic demyelination syndrome (ODS)?",
          choices: [
            "4-6 mEq/L per 24 hours",
            "6-8 mEq/L per 24 hours",
            "12-14 mEq/L per 24 hours",
            "No limit if the patient is symptomatic"
          ],
          answer: 1,
          explanation: "Current guidelines recommend limiting sodium correction to ≤8 mEq/L in any 24-hour period, with ≤6 mEq/L preferred for high-risk patients (liver disease, alcoholism, malnutrition, hypokalemia, chronic hyponatremia >48h). Overcorrection risks osmotic demyelination syndrome (ODS, formerly central pontine myelinolysis), which can cause devastating neurological injury. If overcorrection occurs, D5W or DDAVP can be used to re-lower sodium."
        },
        {
          q: "After initial stabilization, which long-term management strategy is most appropriate for this patient?",
          choices: [
            "Continue the SSRI and add a thiazide diuretic",
            "Switch the SSRI to an alternative antidepressant less likely to cause SIADH and fluid restrict",
            "Start demeclocycline prophylactically",
            "Initiate chronic tolvaptan therapy"
          ],
          answer: 1,
          explanation: "Since the SSRI is the likely precipitant, switching to an alternative antidepressant (e.g., bupropion, which is less associated with SIADH) is the most appropriate strategy. Fluid restriction (1-1.5 L/day) is a reasonable adjunct. Thiazides worsen hyponatremia by impairing free water excretion. Demeclocycline has significant side effects (nephrotoxicity, photosensitivity) and is rarely used. Tolvaptan is reserved for refractory cases and requires hospital initiation."
        }
      ]
    },
    {
      id: "w2c2",
      title: "Hyperkalemia Emergency",
      category: "Electrolytes",
      topics: ["Hyperkalemia"],
      difficulty: "Beginner",
      scenario: `A 72-year-old man with CKD stage 4 (eGFR 22), heart failure, and type 2 diabetes presents to the ED with generalized weakness and "heart fluttering." He ran out of his furosemide one week ago but continued taking lisinopril, spironolactone, and his potassium-containing salt substitute.

Labs: K+ 7.2 mEq/L, Cr 4.1 (baseline 3.5), Na+ 138, bicarb 16, glucose 145.
ECG shows wide QRS complexes, peaked T waves, and loss of P waves.`,
      questions: [
        {
          q: "What is the most critical first step in managing this patient?",
          choices: [
            "IV insulin (10 units) + D50W to shift potassium intracellularly",
            "IV calcium gluconate (10 mL of 10%) over 2-3 minutes",
            "Kayexalate (sodium polystyrene sulfonate) 30g orally",
            "Emergent hemodialysis"
          ],
          answer: 1,
          explanation: "With ECG changes indicating myocardial toxicity (wide QRS, loss of P waves), IV calcium gluconate is the most critical first step. It stabilizes the cardiac membrane within 1-3 minutes, reducing the risk of fatal arrhythmia. It does NOT lower potassium — it only buys time. After calcium, potassium-lowering therapies (insulin/glucose, albuterol, diuretics, or dialysis) should be administered. The sequence is: stabilize → shift → remove."
        },
        {
          q: "Which combination of factors most likely precipitated this hyperkalemic emergency?",
          choices: [
            "CKD progression alone",
            "Discontinuation of furosemide + continued RAAS blockade (lisinopril/spironolactone) + exogenous potassium (salt substitute)",
            "Metabolic acidosis from diabetic ketoacidosis",
            "Rhabdomyolysis from immobilization"
          ],
          answer: 1,
          explanation: "This is a classic \"perfect storm\" of hyperkalemia: (1) CKD impairs renal potassium excretion, (2) stopping furosemide removed the main potassium-wasting pathway, (3) continuing dual RAAS blockade (ACEi + MRA) further impairs potassium excretion, and (4) potassium-containing salt substitutes (KCl) add exogenous potassium load. The glucose of 145 and bicarb of 16 don't suggest DKA. Counseling CKD patients to avoid salt substitutes is essential."
        },
        {
          q: "After stabilization, which medication changes should be made?",
          choices: [
            "Restart furosemide; continue all other medications unchanged",
            "Restart furosemide; discontinue spironolactone; reassess lisinopril dose; stop salt substitute",
            "Discontinue all medications and start hemodialysis",
            "Add patiromer and continue current regimen"
          ],
          answer: 1,
          explanation: "The most prudent approach: (1) Restart furosemide to restore potassium excretion, (2) Discontinue spironolactone (MRA) — the combination of ACEi + MRA + CKD stage 4 carries high hyperkalemia risk, (3) Reassess lisinopril — may continue at reduced dose if cardioprotection is needed but with close monitoring, (4) Counsel to stop the potassium-based salt substitute. Potassium binders (patiromer, SZC) can be considered if RAAS blockade is essential but are not a substitute for removing precipitants."
        }
      ]
    },
    {
      id: "w2c3",
      title: "Complex Acid-Base Disorder",
      category: "Acid-Base",
      topics: ["Acid-Base"],
      difficulty: "Advanced",
      scenario: `A 58-year-old man with a history of alcoholism is brought in by EMS after being found unresponsive. He smells strongly of alcohol and has evidence of vomiting.

ABG: pH 7.22, pCO2 23, pO2 92, HCO3 9 mEq/L
Labs: Na+ 140, K+ 3.2, Cl- 102, glucose 95, BUN 32, Cr 1.8, albumin 2.5
Serum osmolality (measured) 320, calculated osmolality 297
Lactate 4.5, ethanol level 150 mg/dL
Urine ketones: positive`,
      questions: [
        {
          q: "What is the anion gap in this patient?",
          choices: [
            "29 (uncorrected); 32 (albumin-corrected)",
            "29 (uncorrected); 35 (albumin-corrected)",
            "35 (uncorrected); 38 (albumin-corrected)",
            "21 (uncorrected); 25 (albumin-corrected)"
          ],
          answer: 0,
          explanation: "AG = Na - (Cl + HCO3) = 140 - (102 + 9) = 29. Albumin correction: for every 1 g/dL albumin below 4, add 2.5 to the AG. Albumin is 2.5 (1.5 below normal), so corrected AG = 29 + (1.5 × 2.5) = 29 + 3.75 ≈ 32. Always correct for albumin — hypoalbuminemia is common in hospitalized patients and can mask a significant anion gap."
        },
        {
          q: "Calculate the delta-delta ratio. What does it tell you about this patient's acid-base status?",
          choices: [
            "Delta-delta = 1.0 — pure AGMA",
            "Delta-delta > 2.0 — concurrent metabolic alkalosis",
            "Delta-delta < 1.0 — concurrent non-anion gap metabolic acidosis (NAGMA)",
            "Cannot be calculated without baseline bicarbonate"
          ],
          answer: 0,
          explanation: "Delta AG = corrected AG - 12 = 32 - 12 = 20. Delta HCO3 = 24 - 9 = 15. Delta-delta = 20/15 = 1.33. Using uncorrected AG: 17/15 = 1.13. Both values fall in the 1-2 range, indicating a pure AGMA by the numbers. However, the clinical picture (alcoholism with vomiting) suggests a concurrent metabolic alkalosis from vomiting may be masking an even lower HCO3 — the delta-delta would be >2 if the 'true' HCO3 were lower. Always integrate the math with clinical context."
        },
        {
          q: "What is the osmolal gap, and what does it suggest?",
          choices: [
            "23 mOsm/kg — consistent with ethanol contribution alone",
            "23 mOsm/kg — suggests a toxic alcohol (methanol/ethylene glycol) in addition to ethanol",
            "10 mOsm/kg — normal",
            "5 mOsm/kg — rules out toxic alcohol ingestion"
          ],
          answer: 0,
          explanation: "Osmolal gap = measured - calculated = 320 - 297 = 23. However, ethanol contributes to the osmolal gap: ethanol contribution = 150/4.6 ≈ 32.6 mOsm/kg. The osmolal gap accounted for by ethanol alone actually exceeds the total gap, meaning there is no residual gap suggesting toxic alcohols. The AGMA is explained by alcoholic ketoacidosis (positive urine ketones, alcoholism) and lactic acidosis (lactate 4.5). Always account for ethanol when interpreting the osmolal gap."
        },
        {
          q: "What are the most likely causes of this patient's anion gap metabolic acidosis?",
          choices: [
            "Diabetic ketoacidosis",
            "Methanol ingestion",
            "Alcoholic ketoacidosis + lactic acidosis",
            "Renal tubular acidosis"
          ],
          answer: 2,
          explanation: "This patient has two concurrent causes of AGMA: (1) Alcoholic ketoacidosis (AKA) — history of alcoholism, positive urine ketones, and starvation from poor oral intake. AKA occurs after binge drinking with decreased food intake. Glucose is normal (unlike DKA). (2) Lactic acidosis — lactate 4.5, likely from dehydration, poor perfusion, and hepatic dysfunction. Treatment is IV fluids (D5NS), thiamine, and electrolyte repletion. Insulin is NOT needed for AKA (unlike DKA) because glucose is normal."
        }
      ]
    },
    {
      id: "w2c4",
      title: "Rising Creatinine During HF Diuresis",
      category: "Cardiorenal Syndrome",
      difficulty: "Intermediate",
      topics: ["Cardiorenal Syndrome", "Fluid Management", "Diuretics"],
      scenario: `A 71-year-old woman with HFrEF (EF 20%), type 2 diabetes, and CKD stage 3b (baseline eGFR 38, Cr 1.5) is admitted with 3 weeks of progressive dyspnea, orthopnea, and leg swelling. She has gained 8 kg above her dry weight. Her home medications include lisinopril 20mg, carvedilol 25mg BID, and furosemide 40mg PO daily.

On exam: BP 132/78, HR 88. JVP is elevated to 14 cm H\u2082O. Bilateral crackles at the lung bases. 3+ pitting edema to the thighs. Weight 86 kg (dry weight 78 kg).

She is started on IV furosemide 80mg BID. By day 3, she has lost 4 kg with good urine output (~2.5 L/day). However, her Cr has risen from 1.5 to 2.1 mg/dL. NT-proBNP has decreased from 12,000 to 6,500 pg/mL. Her hematocrit has risen from 32% to 37%.

The primary team pages nephrology because they are concerned about "acute kidney injury" and want to decrease the furosemide.`,
      questions: [
        {
          q: "How should you interpret this patient's rising creatinine?",
          choices: [
            "This is acute kidney injury from over-diuresis \u2014 decrease furosemide immediately",
            "This is likely hemodynamic from effective decongestion \u2014 the improving BNP and hemoconcentration are reassuring",
            "This requires urgent renal ultrasound to rule out obstruction",
            "This represents contrast-induced nephropathy from a recent CT scan",
          ],
          answer: 1,
          explanation: "The Cr rise is occurring in the context of effective decongestion: weight down 4 kg, NT-proBNP improving (12,000\u21926,500), and hemoconcentration (Hct 32\u219237%). Multiple studies show that a Cr rise with concomitant decongestion is NOT associated with worse outcomes \u2014 it's hemodynamic, not true kidney injury. Stopping diuretics here would be harmful because the patient is still 4 kg above dry weight.",
        },
        {
          q: "The patient is still 4 kg above dry weight with JVP of 12 cm and 2+ edema. By day 5, urine output has dropped to 1L/day despite furosemide 80mg IV BID. Cr is now 2.4 mg/dL. Serum chloride is 88 mEq/L (low). What is the best next step?",
          choices: [
            "Stop all diuretics and give IV normal saline",
            "Add metolazone 5mg PO before the furosemide dose (sequential nephron blockade)",
            "Start ultrafiltration at 200 mL/h",
            "Discontinue lisinopril to improve renal perfusion",
          ],
          answer: 1,
          explanation: "This is diuretic resistance with persistent volume overload. Sequential nephron blockade (adding a thiazide like metolazone to a loop diuretic) is the standard escalation strategy. The hypochloremia (Cl 88) is contributing to diuretic resistance and metabolic alkalosis. Stopping diuretics would worsen congestion. Ultrafiltration is reserved for truly refractory cases (CARRESS-HF showed diuretics are better). Don't stop ACEi/ARB unless there's hypotension or severe AKI.",
        },
        {
          q: "What is the most important hemodynamic driver of kidney dysfunction in this patient?",
          choices: [
            "Low cardiac output causing decreased renal blood flow",
            "Elevated central venous pressure causing increased renal venous pressure",
            "Atherosclerotic renal artery stenosis",
            "NSAID-induced afferent arteriolar vasoconstriction",
          ],
          answer: 1,
          explanation: "Studies from the ESCAPE trial and others consistently show that elevated CVP (venous congestion) is more strongly associated with worsening kidney function in HF than low cardiac output. Elevated CVP increases renal venous pressure, which directly reduces the transrenal pressure gradient and GFR. This is why aggressive decongestion (reducing CVP) often IMPROVES kidney function, even though it may transiently raise Cr.",
        },
      ],
    }
  ],

  3: [
    // ─── Week 3: Glomerular Disease & CKD ────────────────────────────
    {
      id: "w3c1",
      title: "Nephrotic Syndrome Workup",
      category: "Glomerular Disease",
      topics: ["Nephrotic Syndrome", "Proteinuria", "Kidney Biopsy", "APOL1-Associated Kidney Disease"],
      difficulty: "Intermediate",
      scenario: `A 52-year-old man with type 2 diabetes (A1c 9.2%) presents with progressive bilateral lower extremity edema over 6 weeks and "foamy urine." He has no history of kidney disease.

Labs: Cr 1.3, albumin 2.1, total cholesterol 340, urine protein/creatinine ratio 8.5 g/g.
Urinalysis: 3+ protein, no blood, no casts. Complement levels (C3, C4) are normal.

Renal ultrasound shows bilateral 12 cm kidneys with increased cortical echogenicity. No hydronephrosis.`,
      questions: [
        {
          q: "This patient's presentation is most consistent with which clinical syndrome?",
          choices: [
            "Nephritic syndrome",
            "Nephrotic syndrome",
            "Rapidly progressive glomerulonephritis (RPGN)",
            "Chronic tubulointerstitial nephritis"
          ],
          answer: 1,
          explanation: "The classic nephrotic syndrome features are: (1) Heavy proteinuria (>3.5 g/day; this patient has 8.5 g/g), (2) Hypoalbuminemia (albumin 2.1), (3) Edema, (4) Hyperlipidemia (cholesterol 340). The absence of hematuria and RBC casts argues against nephritic syndrome or RPGN. Nephrotic syndrome reflects podocyte (glomerular visceral epithelial cell) injury, allowing massive protein leak."
        },
        {
          q: "Given his history, what is the most likely underlying cause of his nephrotic syndrome?",
          choices: [
            "Minimal change disease",
            "Diabetic nephropathy",
            "Membranous nephropathy",
            "Focal segmental glomerulosclerosis (FSGS)"
          ],
          answer: 1,
          explanation: "Diabetic nephropathy is the most common cause of nephrotic syndrome in adults and is the leading cause of ESRD in the US. Key clues: longstanding poorly controlled diabetes (A1c 9.2%), increased renal cortical echogenicity (suggesting chronic parenchymal disease), and heavy proteinuria without hematuria. However, importantly, not all nephrotic syndrome in diabetics is from diabetic nephropathy — an atypical presentation (sudden onset, hematuria, or low complement) warrants biopsy to evaluate for superimposed disease."
        },
        {
          q: "Which factor in this patient would make you consider a renal biopsy rather than empirically treating as diabetic nephropathy?",
          choices: [
            "Proteinuria > 3.5 g/day",
            "Absence of diabetic retinopathy on fundoscopic exam",
            "Normal-sized kidneys",
            "Elevated A1c"
          ],
          answer: 1,
          explanation: "Diabetic nephropathy and diabetic retinopathy develop in parallel because both are microvascular complications. If a diabetic patient with nephrotic-range proteinuria does NOT have retinopathy, this raises the possibility that the kidney disease is from a non-diabetic cause (e.g., membranous nephropathy, FSGS, amyloidosis), and biopsy should be strongly considered. Other red flags: acute onset, active urine sediment (hematuria/casts), low complements, or rapidly declining GFR."
        },
        {
          q: "What pharmacotherapy is the cornerstone of managing proteinuria in diabetic kidney disease?",
          choices: [
            "Loop diuretics for edema",
            "ACE inhibitor or ARB at maximally tolerated dose",
            "High-dose corticosteroids",
            "Cyclophosphamide"
          ],
          answer: 1,
          explanation: "RAAS blockade (ACEi or ARB) is the cornerstone of proteinuria management in diabetic nephropathy. These agents reduce intraglomerular pressure by dilating the efferent arteriole, reducing proteinuria by 30-50%. SGLT2 inhibitors (e.g., dapagliflozin, empagliflozin) are now strongly recommended as add-on therapy based on DAPA-CKD and CREDENCE trials, providing additional renal and cardiovascular protection. Immunosuppression is NOT indicated for diabetic nephropathy."
        }
      ]
    },
    {
      id: "w3c2",
      title: "ANCA Vasculitis with RPGN",
      category: "Glomerular Disease",
      topics: ["Glomerulonephritis", "Kidney Biopsy"],
      difficulty: "Advanced",
      scenario: `A 65-year-old woman presents with 3 weeks of fatigue, myalgias, and dark ("cola-colored") urine. She also reports a 2-week history of worsening cough with occasional hemoptysis.

Labs: Cr 4.8 (was 0.9 three months ago), BUN 68, albumin 3.5, Hgb 9.2. Urinalysis: 3+ blood, 2+ protein, numerous dysmorphic RBCs and RBC casts. C3/C4 normal.

CXR shows bilateral pulmonary infiltrates. Anti-MPO (p-ANCA) is strongly positive. Anti-GBM negative.`,
      questions: [
        {
          q: "What is the most likely diagnosis?",
          choices: [
            "IgA nephropathy with Henoch-Schonlein purpura",
            "Anti-GBM (Goodpasture's) disease",
            "ANCA-associated vasculitis (microscopic polyangiitis) with pulmonary-renal syndrome",
            "Lupus nephritis (Class IV)"
          ],
          answer: 2,
          explanation: "The combination of rapidly progressive GN (Cr 0.9 → 4.8 in 3 months with RBC casts), hemoptysis (pulmonary-renal syndrome), and strongly positive p-ANCA (anti-MPO) is classic for ANCA-associated vasculitis, specifically microscopic polyangiitis (MPA). GPA (granulomatosis with polyangiitis) is associated with c-ANCA (anti-PR3). Anti-GBM disease was ruled out by negative anti-GBM antibodies. Normal complements argue against lupus."
        },
        {
          q: "What does the finding of RBC casts on urinalysis indicate?",
          choices: [
            "Urinary tract infection",
            "Glomerulonephritis (active glomerular inflammation)",
            "Renal vein thrombosis",
            "Rhabdomyolysis"
          ],
          answer: 1,
          explanation: "RBC casts are pathognomonic of glomerulonephritis. They form when red blood cells are trapped in Tamm-Horsfall protein (uromodulin) within the renal tubules, indicating that blood is entering the tubular lumen from the glomerulus. Dysmorphic RBCs (especially acanthocytes) also suggest glomerular origin. In contrast, isomorphic (normal-shaped) RBCs suggest lower urinary tract bleeding. RBC casts are one of the most important urine findings in nephrology."
        },
        {
          q: "What is the appropriate initial treatment for this patient?",
          choices: [
            "High-dose corticosteroids alone",
            "Pulse IV methylprednisolone + rituximab (or cyclophosphamide) + consider plasmapheresis",
            "Mycophenolate mofetil monotherapy",
            "Supportive care and monitoring, as ANCA vasculitis is self-limited"
          ],
          answer: 1,
          explanation: "Severe ANCA vasculitis with organ-threatening disease (RPGN + pulmonary hemorrhage) requires aggressive immunosuppression: (1) Pulse IV methylprednisolone (500-1000 mg x 3 days) followed by oral prednisone taper, (2) Rituximab is now preferred over cyclophosphamide based on the RAVE trial (non-inferior, better safety profile), (3) Plasmapheresis should be considered for pulmonary hemorrhage (PEXIVAS showed benefit for diffuse alveolar hemorrhage) or when concurrent anti-GBM antibodies are present. Without treatment, RPGN progresses to ESRD within weeks."
        },
        {
          q: "The renal biopsy shows crescentic glomerulonephritis with pauci-immune (no or scant immunoglobulin/complement) staining on immunofluorescence. This pattern is most consistent with:",
          choices: [
            "Lupus nephritis (full house pattern)",
            "IgA nephropathy (mesangial IgA deposits)",
            "ANCA-associated glomerulonephritis",
            "Membranous nephropathy (subepithelial deposits)"
          ],
          answer: 2,
          explanation: "Pauci-immune crescentic GN (no or scant Ig/complement on IF) is the hallmark biopsy pattern of ANCA-associated vasculitis. In contrast: lupus nephritis shows 'full house' IF staining (IgG, IgA, IgM, C3, C1q); IgA nephropathy shows dominant mesangial IgA; membranous shows granular IgG and C3 along capillary walls; anti-GBM disease shows linear IgG along the GBM. The crescents indicate severe glomerular injury with cellular proliferation in Bowman's space."
        }
      ]
    },
    {
      id: "w3c3",
      title: "CKD Management and SGLT2 Inhibitors",
      category: "CKD",
      topics: ["CKD", "Hypertension", "Proteinuria"],
      difficulty: "Intermediate",
      scenario: `A 60-year-old man with type 2 diabetes, hypertension, and CKD stage 3b (eGFR 38 mL/min, UACR 650 mg/g) is seen in nephrology clinic. He is on metformin 500 mg BID, losartan 100 mg daily, and amlodipine 5 mg daily. BP today: 138/82. A1c: 7.4%.

His renal function has been stable over the past year. He asks about "new kidney-protecting medications" he read about online.`,
      questions: [
        {
          q: "Based on current guidelines, which additional medication should be started for kidney protection?",
          choices: [
            "A second ARB (double RAAS blockade)",
            "An SGLT2 inhibitor (e.g., dapagliflozin or empagliflozin)",
            "A non-dihydropyridine calcium channel blocker (diltiazem)",
            "Allopurinol for uric acid reduction"
          ],
          answer: 1,
          explanation: "SGLT2 inhibitors have revolutionized CKD management. The DAPA-CKD trial demonstrated that dapagliflozin reduced the composite of sustained eGFR decline, ESRD, and renal/CV death by 39% in patients with CKD (eGFR 25-75) regardless of diabetes status. The CREDENCE trial showed similar benefits with canagliflozin. SGLT2i are now recommended by KDIGO for CKD patients with eGFR ≥20 and albuminuria. Dual RAAS blockade is harmful (ONTARGET, VA NEPHRON-D)."
        },
        {
          q: "When starting an SGLT2 inhibitor, an initial dip in eGFR of 10-15% is expected. What is the mechanism?",
          choices: [
            "Direct tubular toxicity",
            "Acute interstitial nephritis",
            "Reduced intraglomerular pressure via tubuloglomerular feedback (afferent arteriole constriction)",
            "Dehydration from osmotic diuresis"
          ],
          answer: 2,
          explanation: "SGLT2 inhibitors block sodium-glucose reabsorption in the proximal tubule, increasing sodium delivery to the macula densa. This activates tubuloglomerular feedback (TGF), causing afferent arteriole constriction, which reduces intraglomerular pressure and hyperfiltration. The initial eGFR dip reflects reduced glomerular pressure (protective long-term, similar to ACEi/ARB initiation dip). This hemodynamic effect is the primary mechanism of renal protection — it reduces mechanical stress on the glomerulus."
        },
        {
          q: "What other interventions should be optimized for this patient's CKD management? (Select the best answer)",
          choices: [
            "Target BP < 120/80 with additional antihypertensives",
            "Add finerenone (non-steroidal MRA) for additional cardiorenal protection",
            "Restrict dietary protein to 0.6 g/kg/day",
            "Start erythropoietin-stimulating agent prophylactically"
          ],
          answer: 1,
          explanation: "Finerenone, a non-steroidal mineralocorticoid receptor antagonist, showed significant kidney and cardiovascular benefit in the FIDELIO-DKD and FIGARO-DKD trials in patients with diabetic kidney disease already on RAAS blockade. KDIGO now recommends the combination of ACEi/ARB + SGLT2i + finerenone as optimal nephroprotective therapy in DKD. KDIGO 2021 recommends targeting systolic BP <120 mmHg when tolerated in CKD with albuminuria (based on SPRINT). Protein restriction to 0.8 g/kg/day (not 0.6) is reasonable. ESAs are for established anemia, not prophylaxis."
        }
      ]
    },
    {
      id: "w3c4",
      title: "Progressive Proteinuria in Diabetes",
      category: "Diabetic Kidney Disease",
      difficulty: "Intermediate",
      topics: ["Diabetic Kidney Disease", "SGLT2 Inhibitors", "CKD"],
      scenario: `A 55-year-old woman with type 2 diabetes for 18 years, hypertension, and obesity (BMI 34) is referred to nephrology clinic for progressive CKD. She has known diabetic retinopathy (laser-treated 3 years ago).

Her labs over the past 2 years:
- 2 years ago: eGFR 62, UACR 180 mg/g
- 1 year ago: eGFR 52, UACR 350 mg/g
- Today: eGFR 42, UACR 520 mg/g

Current medications: Metformin 1000mg BID, lisinopril 40mg daily (max dose), amlodipine 10mg, atorvastatin 40mg, insulin glargine 30 units at bedtime. HbA1c 7.4%. BP today 128/76. UA is bland with no hematuria.

She has not been started on an SGLT2 inhibitor, finerenone, or GLP-1 RA.`,
      questions: [
        {
          q: "Is this patient's kidney disease consistent with diabetic kidney disease (DKD)?",
          choices: [
            "No \u2014 DKD doesn't cause proteinuria this severe",
            "Yes \u2014 longstanding diabetes, progressive albuminuria, retinopathy, and bland sediment are classic for DKD",
            "No \u2014 the eGFR decline is too rapid for DKD",
            "Cannot determine without a kidney biopsy",
          ],
          answer: 1,
          explanation: "This is classic DKD: 18-year diabetes history, progressive albuminuria (A2\u2192A3), declining eGFR (~10 mL/min/year \u2014 aggressive but not atypical for unoptimized DKD), diabetic retinopathy (strongly supports DKD), and bland UA without hematuria. A biopsy is not required when the clinical picture is this consistent. Red flags that would prompt biopsy: active sediment, no retinopathy, very rapid decline, or onset <5 years after T1DM.",
        },
        {
          q: "She is already on max-dose lisinopril (Pillar 1). What should be started NEXT?",
          choices: [
            "Finerenone \u2014 start the third pillar before the second",
            "An SGLT2 inhibitor (dapagliflozin or empagliflozin) \u2014 the second pillar of DKD therapy",
            "Hydrochlorothiazide for additional BP control",
            "Cyclophosphamide for immunosuppression of the proteinuria",
          ],
          answer: 1,
          explanation: "SGLT2i is the second pillar and should be started next. DAPA-CKD showed a 39% reduction in kidney events (including non-diabetics). EMPA-KIDNEY confirmed benefits down to eGFR 20. With her eGFR of 42, she is an excellent candidate. After starting SGLT2i, consider adding finerenone (Pillar 3, per FIDELIO-DKD) and semaglutide (Pillar 4, per FLOW trial). Each pillar adds incremental benefit on top of the others.",
        },
        {
          q: "Two weeks after starting empagliflozin, her eGFR drops from 42 to 38. She feels fine. Her K+ is 4.6 and BP is 120/72. What do you tell the patient?",
          choices: [
            "\"We need to stop this medication \u2014 your kidney function is getting worse\"",
            "\"This small dip is expected and actually means the medication is working. It protects your kidneys by reducing pressure inside the filters\"",
            "\"We need to add IV fluids to prevent further damage\"",
            "\"You should increase your salt intake to compensate\"",
          ],
          answer: 1,
          explanation: "The initial eGFR dip of 3-5 mL/min with SGLT2i is hemodynamic \u2014 it reflects reduced intraglomerular pressure from restored tubuloglomerular feedback. This is the SAME mechanism that provides long-term nephroprotection (analogous to the ACEi/ARB dip). eGFR typically stabilizes by 3 months and then declines MORE SLOWLY than without the drug. Stopping the medication would remove this protection. Counsel patients about this expected dip at the time of prescribing.",
        },
        {
          q: "After optimizing ACEi/ARB + SGLT2i, what additional agents should be considered for this patient's DKD?",
          choices: [
            "Cyclophosphamide and rituximab",
            "Finerenone (non-steroidal MRA) and semaglutide (GLP-1 RA) \u2014 Pillars 3 and 4",
            "Spironolactone and hydrochlorothiazide",
            "IV iron and erythropoietin",
          ],
          answer: 1,
          explanation: "The 4 pillars of DKD therapy (2024): (1) ACEi/ARB \u2014 max dose \u2713, (2) SGLT2i \u2713, (3) Finerenone \u2014 FIDELIO-DKD showed 18% kidney risk reduction on top of ACEi/ARB, with less hyperkalemia than spironolactone, (4) GLP-1 RA (semaglutide) \u2014 FLOW trial showed 24% kidney risk reduction. Each pillar provides additive benefit. This patient should be started on finerenone (check K+ first \u2014 must be \u22644.8) and discussed for semaglutide (also helps with weight and HbA1c).",
        },
      ],
    }
  ],

  4: [
    // ─── Week 4: Dialysis, Transplant & Stones ──────────────────────
    {
      id: "w4c1",
      title: "Dialysis Initiation Decision",
      category: "Dialysis",
      topics: ["Dialysis", "Dialysis Access", "CKD", "Anemia of CKD", "CKD-MBD"],
      difficulty: "Intermediate",
      scenario: `A 58-year-old man with CKD stage 5 from diabetic nephropathy (eGFR 8 mL/min) is seen in pre-dialysis clinic. He reports progressive fatigue, poor appetite, morning nausea, difficulty concentrating, and a "metallic taste" in his mouth for the past month. He has lost 5 kg.

Labs: Cr 8.2, BUN 98, K+ 5.6, bicarb 14, Hgb 8.5, albumin 3.0, phosphorus 7.2.
Exam: BP 158/92, bilateral 2+ pitting edema. AV fistula was placed 3 months ago and has a palpable thrill.`,
      questions: [
        {
          q: "This patient's symptoms (nausea, dysgeusia, poor concentration, anorexia) are best described as:",
          choices: [
            "Diabetic gastroparesis",
            "Uremic syndrome",
            "Depression",
            "Medication side effects"
          ],
          answer: 1,
          explanation: "Uremic syndrome is the clinical manifestation of advanced renal failure. Classic symptoms include: nausea/vomiting, anorexia, dysgeusia (metallic taste), fatigue, pruritus, cognitive dysfunction ('uremic encephalopathy'), restless legs, and peripheral neuropathy. These are caused by accumulation of uremic toxins (indoxyl sulfate, p-cresyl sulfate, etc.) that are normally cleared by the kidneys. Uremic symptoms are the primary indication for dialysis initiation."
        },
        {
          q: "What is the most appropriate recommendation for this patient?",
          choices: [
            "Continue monitoring; dialysis should not start until eGFR < 5 mL/min",
            "Initiate hemodialysis — he has symptomatic uremia with a mature fistula",
            "Start a trial of erythropoietin and recheck in 3 months",
            "Begin urgent evaluation for pre-emptive kidney transplant"
          ],
          answer: 1,
          explanation: "This patient has clear indications for dialysis initiation: symptomatic uremia (nausea, dysgeusia, encephalopathy, anorexia with weight loss), refractory hyperphosphatemia, metabolic acidosis, and volume overload. The IDEAL trial showed that starting dialysis based on symptoms (rather than eGFR threshold alone) is appropriate. Importantly, his AV fistula is mature (3 months, palpable thrill), allowing hemodialysis without the need for a temporary catheter — this is ideal planning."
        },
        {
          q: "The patient asks about peritoneal dialysis (PD) vs. hemodialysis (HD). Which statement is accurate?",
          choices: [
            "PD has better survival than HD for all patients",
            "HD requires a surgical access; PD uses a temporary catheter placed at bedside",
            "PD offers more lifestyle flexibility (home-based, daily exchanges) but requires adequate peritoneal membrane function and patient motivation",
            "PD is contraindicated in diabetic patients due to glucose absorption"
          ],
          answer: 2,
          explanation: "PD is a viable home-based modality that offers lifestyle flexibility — patients perform exchanges at home (CAPD) or overnight with a cycler (APD). PD requires a Tenckhoff catheter (surgically placed, not bedside) and adequate peritoneal membrane function. PD is not contraindicated in diabetes, though glucose-based dialysate can worsen glycemic control and dyslipidemia. Outcomes between PD and HD are generally comparable in the first 2-3 years. PD may have better early survival, while HD may have better late survival."
        },
        {
          q: "Which of the following is NOT an absolute indication for emergent dialysis?",
          choices: [
            "Uremic pericarditis",
            "Refractory hyperkalemia with ECG changes",
            "Severe metabolic acidosis (pH < 7.1) refractory to bicarbonate",
            "eGFR < 10 mL/min without symptoms"
          ],
          answer: 3,
          explanation: "Low eGFR alone, without symptoms, is NOT an absolute indication for dialysis. The IDEAL trial showed no survival benefit from early (eGFR 10-14) vs. late (eGFR 5-7) dialysis initiation. Absolute/emergent indications include: refractory hyperkalemia, refractory pulmonary edema, uremic pericarditis (risk of tamponade), uremic encephalopathy/seizures, severe refractory metabolic acidosis, and certain toxic ingestions. The decision to start dialysis should be guided by symptoms and clinical status, not by an eGFR number alone."
        }
      ]
    },
    {
      id: "w4c2",
      title: "Kidney Transplant Rejection",
      category: "Transplant",
      topics: ["Transplant", "Kidney Biopsy"],
      difficulty: "Advanced",
      scenario: `A 45-year-old woman who received a deceased-donor kidney transplant 8 months ago presents with rising creatinine. Her baseline post-transplant Cr was 1.2, and today it is 2.1. She is on tacrolimus, mycophenolate, and prednisone.

She admits to missing several doses of her immunosuppression medications over the past 2 weeks due to financial difficulties. She has no fever, no urinary symptoms, and no recent infections.

Tacrolimus trough level: 3.2 ng/mL (goal: 6-10). Urinalysis: trace protein, no blood, no WBCs. Renal transplant ultrasound: normal perfusion, no hydronephrosis.`,
      questions: [
        {
          q: "What is the most likely diagnosis?",
          choices: [
            "BK polyomavirus nephropathy",
            "Acute T-cell mediated rejection (TCMR)",
            "Calcineurin inhibitor nephrotoxicity",
            "Recurrent primary disease"
          ],
          answer: 1,
          explanation: "The clinical picture strongly suggests acute T-cell mediated rejection: (1) Rising creatinine, (2) History of immunosuppression non-adherence, (3) Subtherapeutic tacrolimus level (3.2 vs. goal 6-10). Non-adherence is one of the leading causes of acute rejection and graft loss. CNI toxicity would be expected with HIGH tacrolimus levels, not low. BK nephropathy typically occurs earlier (1-6 months) and is associated with over-immunosuppression. A transplant biopsy (Banff classification) is needed to confirm."
        },
        {
          q: "What is the gold standard for diagnosing transplant rejection?",
          choices: [
            "Donor-specific antibody (DSA) panel",
            "Renal transplant biopsy with Banff classification",
            "Tacrolimus trough level trending",
            "Renal transplant ultrasound with Doppler"
          ],
          answer: 1,
          explanation: "Transplant kidney biopsy with Banff classification is the gold standard for diagnosing rejection. The Banff system classifies rejection into: T-cell mediated (TCMR) — tubulitis and interstitial inflammation, and antibody-mediated (ABMR) — peritubular capillaritis, C4d deposition, and donor-specific antibodies. Biopsy also helps differentiate rejection from other causes (BK virus, CNI toxicity, recurrent disease). DSA testing complements biopsy but is not sufficient alone."
        },
        {
          q: "The biopsy confirms Banff grade IB acute TCMR (significant tubulitis with moderate interstitial inflammation). What is the first-line treatment?",
          choices: [
            "Increase tacrolimus dose and observe",
            "Pulse IV methylprednisolone (500 mg daily x 3 days)",
            "Plasmapheresis and IVIG",
            "Graft nephrectomy and return to dialysis"
          ],
          answer: 1,
          explanation: "First-line treatment for acute TCMR is pulse IV corticosteroids (methylprednisolone 250-500 mg daily for 3 days). Response rates are 60-80% for acute TCMR. Tacrolimus levels should also be optimized to the therapeutic range. If steroid-resistant, anti-thymocyte globulin (ATG/rATG) is second-line. Plasmapheresis/IVIG is used for antibody-mediated rejection, not TCMR. Equally important: address the root cause of non-adherence (financial support, prior authorization for medications)."
        }
      ]
    },
    {
      id: "w4c3",
      title: "Recurrent Kidney Stones",
      category: "Kidney Stones",
      topics: ["Kidney Stones"],
      difficulty: "Beginner",
      scenario: `A 38-year-old man presents to the ED with acute-onset left flank pain radiating to the groin, with nausea and hematuria. He has had two prior episodes of kidney stones in the past 5 years, but never had a metabolic workup.

CT abdomen (non-contrast) shows a 6 mm stone at the left ureterovesical junction (UVJ) with mild left hydronephrosis. No evidence of infection.

Vitals: BP 142/88 (likely pain), HR 92, temp 37.0°C. Labs: Cr 1.0, Ca2+ 10.8 (slightly elevated), phosphorus 2.4, intact PTH 78 (elevated), uric acid 8.2.`,
      questions: [
        {
          q: "What is the most appropriate initial management for this patient's acute stone episode?",
          choices: [
            "Emergent ureteroscopy for stone extraction",
            "IV fluids, NSAIDs (ketorolac) for pain, and alpha-blocker (tamsulosin) for medical expulsive therapy",
            "Extracorporeal shock wave lithotripsy (ESWL)",
            "Nephrostomy tube placement"
          ],
          answer: 1,
          explanation: "For a 6 mm ureteral stone at the UVJ without signs of infection, conservative management with medical expulsive therapy (MET) is first-line. This includes: (1) IV fluids for hydration, (2) NSAIDs (ketorolac) — more effective than opioids for renal colic and reduce ureteral smooth muscle spasm, (3) Tamsulosin (alpha-blocker) — relaxes ureteral smooth muscle and improves spontaneous passage rates, especially for distal ureteral stones 5-10 mm. Stones <5mm pass spontaneously 90% of the time; 5-10mm pass ~50% of the time."
        },
        {
          q: "The elevated calcium (10.8) and PTH (78) suggest which underlying diagnosis?",
          choices: [
            "Sarcoidosis",
            "Primary hyperparathyroidism",
            "Malignancy-associated hypercalcemia",
            "Milk-alkali syndrome"
          ],
          answer: 1,
          explanation: "Elevated calcium with an inappropriately elevated (or non-suppressed) PTH is the hallmark of primary hyperparathyroidism (PHPT). In a healthy person, elevated calcium should suppress PTH via negative feedback. PHPT is the most common cause of hypercalcemia in the outpatient setting and is a well-known cause of recurrent calcium-containing kidney stones. It causes hypercalciuria by increasing calcium reabsorption from bone and GI tract, and increasing renal calcium filtration."
        },
        {
          q: "A 24-hour urine collection shows: calcium 380 mg/day (elevated), oxalate 28 mg/day (normal), citrate 220 mg/day (low), uric acid 850 mg/day (elevated), volume 1.2 L/day (low). What dietary and pharmacologic interventions would you recommend?",
          choices: [
            "Low-calcium diet and vitamin C supplementation",
            "Increase fluid intake to >2.5 L/day, start thiazide diuretic, potassium citrate, and refer for parathyroidectomy evaluation",
            "Allopurinol only",
            "Low-sodium diet and high-dose vitamin D"
          ],
          answer: 1,
          explanation: "Comprehensive stone prevention requires addressing all abnormalities: (1) Increase fluid intake (goal >2.5 L/day urine output — most important single intervention), (2) Thiazide diuretic (hydrochlorothiazide or chlorthalidone) — reduces urinary calcium excretion by enhancing proximal tubule calcium reabsorption, (3) Potassium citrate — corrects hypocitraturia (citrate inhibits calcium stone crystallization), (4) Refer for parathyroidectomy evaluation — PHPT is a surgical disease causing recurrent stones. Importantly, do NOT restrict dietary calcium — this paradoxically increases stone risk by allowing more oxalate absorption."
        }
      ]
    },
    {
      id: "w4c4",
      title: "PD Patient with Cloudy Effluent",
      category: "Peritoneal Dialysis",
      difficulty: "Beginner",
      topics: ["Peritoneal Dialysis", "Dialysis"],
      scenario: `A 48-year-old woman with ESKD from lupus nephritis has been on automated peritoneal dialysis (APD) for 2 years via a Tenckhoff catheter. She calls the PD clinic reporting that her effluent bags have been cloudy for the past 12 hours. She has mild diffuse abdominal pain and feels "achy." She denies fever, nausea, vomiting, or diarrhea. She reports no recent contamination events or breaks in sterile technique.

On exam in the ED: T 37.9\u00b0C, BP 128/78, HR 92. Abdomen is mildly tender diffusely without rebound or guarding. The PD catheter exit site is clean with no erythema, drainage, or tunnel tenderness.

She drains 2L of cloudy effluent. Effluent studies: WBC 650/\u03bcL with 90% PMNs. Gram stain shows gram-positive cocci in clusters. Cultures are pending. Her labs: WBC 9.2, Cr 8.4 (her usual baseline on PD), K+ 4.8, Albumin 3.0.`,
      questions: [
        {
          q: "Does this patient meet the diagnostic criteria for PD peritonitis?",
          choices: [
            "No \u2014 she needs a CT scan first to confirm the diagnosis",
            "No \u2014 peritonitis requires fever >38.5\u00b0C to diagnose",
            "Yes \u2014 cloudy effluent with WBC >100/\u03bcL and >50% PMNs meets criteria",
            "Yes \u2014 but only if the gram stain is positive",
          ],
          answer: 2,
          explanation: "PD peritonitis is diagnosed when the effluent WBC is >100/\u03bcL with >50% PMNs. This patient has WBC 650 with 90% PMNs \u2014 clearly meets criteria. Cloudy effluent is the most reliable clinical sign. Fever is NOT required (many PD peritonitis patients are afebrile). Gram stain positivity is helpful but not required \u2014 it's positive in only ~40% of cases. Culture-negative peritonitis (~15% of cases) is still treated as peritonitis.",
        },
        {
          q: "What is the BEST initial antibiotic regimen?",
          choices: [
            "IV vancomycin 1g + IV ceftriaxone 2g",
            "Intraperitoneal (IP) vancomycin + IP gentamicin per ISPD guidelines",
            "Oral amoxicillin-clavulanate 875mg BID for 14 days",
            "IP fluconazole empirically to cover fungal peritonitis",
          ],
          answer: 1,
          explanation: "ISPD 2022 guidelines recommend empiric IP vancomycin (for gram-positive coverage) + IP gentamicin or ceftazidime (for gram-negative coverage). IP administration is essential because IV antibiotics alone do NOT achieve adequate concentrations in the peritoneal cavity. The gram-positive cocci in clusters suggest S. aureus or S. epidermidis \u2014 vancomycin provides excellent coverage. Tailor antibiotics when culture and sensitivity results return at 48-72 hours.",
        },
        {
          q: "After 5 days of appropriate IP antibiotics, the effluent remains cloudy and cultures now grow Candida albicans. What is the next step?",
          choices: [
            "Add IP amphotericin B and continue current antibiotics",
            "Switch to IP fluconazole and continue for 21 days",
            "Remove the PD catheter, start systemic antifungals, and transition to hemodialysis",
            "Increase the dwell volume and frequency to improve drug delivery",
          ],
          answer: 2,
          explanation: "Fungal peritonitis is an ABSOLUTE indication for PD catheter removal per ISPD guidelines. Outcomes with catheter retention are very poor. The catheter should be removed promptly, systemic antifungal therapy started (fluconazole or echinocandin based on species and sensitivities), and the patient transitioned to hemodialysis via a temporary HD catheter. PD may potentially be resumed with a new catheter after adequate antifungal treatment (typically \u22652 weeks after catheter removal).",
        },
      ],
    }
  ]
};
