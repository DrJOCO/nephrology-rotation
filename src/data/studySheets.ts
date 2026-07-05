// ─── Study Sheets / Cheat Sheets ─────────────────────────────────────
export const STUDY_SHEETS = {
  1: [
    {
      id: "aki-cheatsheet",
      icon: "\u{1F525}",
      title: "AKI in 5 Minutes",
      subtitle: "The bread & butter of nephrology consults",
      topics: ["AKI", "Post-Renal AKI", "AIN"],
      sections: [
        {
          heading: "KDIGO AKI Staging",
          items: [
            "Stage 1: Cr \u2191 \u22650.3 mg/dL (within 48h) OR 1.5\u20131.9\u00d7 baseline; UOP <0.5 mL/kg/h \u00d76h",
            "Stage 2: Cr 2.0\u20132.9\u00d7 baseline; UOP <0.5 mL/kg/h \u00d712h",
            "Stage 3: Cr \u22653\u00d7 baseline OR \u22654.0 mg/dL OR initiation of RRT; UOP <0.3 mL/kg/h \u00d724h or anuria \u00d712h",
          ],
        },
        {
          heading: "Pre-Renal vs. Intrinsic vs. Post-Renal",
          items: [
            "Pre-renal (most common): Volume depletion, HF, cirrhosis, NSAIDs, ACEi/ARB. FENa <1%, FEUrea <35%, bland sediment",
            "Intrinsic: ATN (muddy brown casts), AIN (WBC casts \u00b1 eosinophils; classic culprits = PPIs, NSAIDs, beta-lactams, fluoroquinolones, TMP-SMX, rifampin, AND checkpoint inhibitors \u2014 PD-1/PD-L1/CTLA-4; note UA is often BLAND with ICI-AIN), GN (RBC casts, dysmorphic RBCs)",
            "Post-renal: Obstruction \u2014 always check a bladder scan and renal ultrasound!",
          ],
        },
        {
          heading: "Key Workup",
          items: [
            "BMP, UA with microscopy, urine Na/Cr/Urea, renal US",
            "FENa: <1% pre-renal, >2% intrinsic (unreliable on diuretics \u2192 use FEUrea)",
            "Urine sediment is your best friend \u2014 learn to read it or ask your attending",
          ],
        },
        {
          heading: "Management Pearls",
          items: [
            "Treat the cause: volume for pre-renal, relieve obstruction for post-renal",
            "Hold nephrotoxins (NSAIDs, aminoglycosides, contrast if possible)",
            "No magic RRT dose \u2014 standard dosing is fine (ATN Trial: 35 vs 20 mL/kg/h \u2014 no benefit to higher; KDIGO delivered dose target 20\u201325 mL/kg/h)",
            "Don\u2019t rush to dialysis \u2014 watchful waiting is safe unless urgent indications (STARRT-AKI)",
            "Emergent dialysis indications = AEIOU: Acidosis, Electrolytes (K\u207a), Ingestion, Overload, Uremia",
          ],
        },
      ],
      trialCallouts: [
        { trial: "ATN Trial", pearl: "In critically ill AKI on CKRT, intensive dose (35 mL/kg/h) matched standard (20 mL/kg/h) for 60-d mortality. Don\u2019t chase higher CKRT doses \u2014 KDIGO target is delivered 20\u201325 mL/kg/h." },
        { trial: "STARRT-AKI", pearl: "In 3019 ICU patients with severe AKI but no urgent indication, early vs delayed KRT gave identical 90-d mortality (44%). 38% of the delayed arm never needed RRT \u2014 wait for clinical indications." },
        { trial: "AKIKI", pearl: "In ICU patients with KDIGO 3 AKI and no emergent indications, delayed KRT matched early KRT for 60-d mortality. 49% of delayed patients never needed RRT \u2014 treat by AEIOU, not numbers." },
        { trial: "BICAR-ICU", pearl: "In ICU severe acidemia (pH \u22647.20), IV bicarb did NOT cut 28-d mortality overall, but in the pre-specified AKIN 2\u20133 subgroup it reduced mortality and RRT need. Consider it when the pH is tanking in AKI." },
        { trial: "SMART", pearl: "In 15,802 ICU patients, balanced crystalloids (LR/Plasmalyte) cut the MAKE30 composite (death, new dialysis, persistent kidney dysfunction) from 15.4% to 14.3%. Default to balanced fluids, not NS." },
        { trial: "PRESERVE", pearl: "In 5177 high-risk CKD patients getting angiography, neither IV sodium bicarb nor N-acetylcysteine prevented contrast AKI vs IV saline alone. Use isotonic saline when prophylaxis is indicated; avoid NAC and routine bicarbonate." },
      ],
    },
    {
      id: "gfr-urinalysis-cheatsheet",
      icon: "\u{1F52C}",
      title: "GFR & Urinalysis Decoded",
      subtitle: "What the numbers (and the urine) are telling you",
      topics: ["Urinalysis", "CKD", "GFR Assessment"],
      sections: [
        {
          heading: "GFR Estimation",
          items: [
            "CKD-EPI 2021: The current standard \u2014 uses creatinine, age, sex (race-free equation)",
            "Cystatin C: Add when creatinine may be inaccurate (muscle wasting, amputation, extremes of body size)",
            "Cr-based eGFR pitfalls: Falsely low in high-muscle-mass patients; falsely high in malnutrition/liver disease",
            "Always trend eGFR \u2014 a single value is a snapshot, the trajectory is what matters",
          ],
        },
        {
          heading: "Urinalysis: The 30-Second Read",
          items: [
            "Dipstick protein: Detects albumin only (misses light chains \u2192 use SPEP/UPEP)",
            "Specific gravity >1.020: Concentrated urine (dehydration, pre-renal AKI)",
            "Leukocyte esterase + nitrites: Think UTI",
            "Blood + protein + RBC casts: Think glomerulonephritis (get nephrology on the phone)",
          ],
        },
        {
          heading: "Urine Sediment Must-Know Casts",
          items: [
            "Muddy brown granular casts \u2192 ATN (the classic!)",
            "RBC casts \u2192 Glomerulonephritis (this is a nephrology emergency)",
            "WBC casts \u2192 Pyelonephritis or AIN",
            "Waxy/broad casts \u2192 Advanced CKD (\u2018tombstone of the nephron\u2019)",
            "Hyaline casts \u2192 Normal or concentrated urine (don\u2019t panic)",
          ],
        },
      ],
      trialCallouts: [
        { trial: "CKD-EPI 2021", pearl: "Race-free CKD-EPI equation endorsed by NKF-ASN (2021). Replaces the 2009 version that included a Black-race coefficient \u2014 now standard of care across labs and transplant lists." },
      ],
    },
    {
      id: "hrs-contrast-rhabdo-cheatsheet",
      icon: "\u{1FAC0}",
      title: "HRS, Contrast AKI & Rhabdo",
      subtitle: "Three AKI subtypes you'll see on consults",
      topics: ["Hepatorenal Syndrome", "Contrast-Associated AKI", "Rhabdomyolysis"],
      sections: [
        {
          heading: "Hepatorenal Syndrome (HRS-AKI)",
          items: [
            "Diagnosis of exclusion in cirrhosis + ascites: AKI + no shock + no nephrotoxins + no obstruction + no improvement after adequate volume resuscitation (ADQI/ICA 2024 no longer requires a fixed 48h albumin challenge; use clinical judgment based on volume status)",
            "Old classification (Type 1/2) is retired \u2192 now HRS-AKI per ICA/ADQI consensus",
            "Pathophysiology: Splanchnic vasodilation \u2192 \u2193 effective arterial volume \u2192 \u2191 RAAS/SNS \u2192 renal vasoconstriction",
            "Treatment: Terlipressin + albumin (CONFIRM trial) \u2014 FDA-approved 2022. Alternative: norepinephrine + albumin or midodrine/octreotide + albumin",
            "Key pearl: Always rule out SBP first (do a diagnostic paracentesis even if asymptomatic)",
            "Definitive treatment is liver transplant \u2014 HRS is a marker of end-stage liver disease",
          ],
        },
        {
          heading: "Contrast-Associated AKI (CA-AKI)",
          items: [
            "CA-AKI vs CI-AKI: CA-AKI = any AKI after contrast (may be coincidental). CI-AKI = AKI causally linked to contrast after excluding other causes",
            "True CI-AKI risk is much lower than historically thought \u2014 large propensity-matched studies show many cases are coincidental",
            "Risk factors: CKD (eGFR <30), diabetes + CKD, high contrast volume, hemodynamic instability, concurrent nephrotoxins",
            "Prevention: use IV isotonic saline hydration when prophylaxis is indicated (AKI, eGFR <30, or selected high-risk intra-arterial cases); PRESERVE showed NAC and bicarbonate are not better than saline. Minimize contrast volume",
            "Timeline: Cr rises within 24-48h, peaks day 3-5, usually returns to baseline within 7 days",
            "Don\u2019t withhold life-saving contrast studies (CT angiogram for PE, emergent cardiac cath) \u2014 the risk of NOT imaging is often greater",
          ],
        },
        {
          heading: "Rhabdomyolysis",
          items: [
            "Classic triad: Myalgias + weakness + dark (tea/cola-colored) urine \u2014 but full triad present in \u226410% of cases",
            "Diagnosis: CK >5x upper limit of normal (often >1000 U/L) + compatible symptoms or heme-positive urine with <3 RBCs/HPF (= myoglobinuria, not hematuria). CK >5000 U/L flags severe disease/high AKI risk.",
            "AKI in 15-50% of cases: From myoglobin pigment casts, direct tubular toxicity, and volume depletion (third-spacing into injured muscle)",
            "Electrolyte emergencies: Hyperkalemia (can be severe/rapid), hyperphosphatemia, hypocalcemia (early), hypercalcemia (late/recovery)",
            "Treatment: AGGRESSIVE IV fluid resuscitation (target UOP 200-300 mL/h). No proven benefit to bicarbonate or mannitol over isotonic crystalloid alone",
            "Common causes: Crush injury, immobilization (found down), statins, drugs/alcohol, seizures, extreme exertion, hypokalemia, infections",
          ],
        },
      ],
      trialCallouts: [
        { trial: "CONFIRM", pearl: "In 300 HRS-AKI patients, terlipressin + albumin reversed HRS in 32% vs 17% on placebo + albumin. FDA-approved 2022 \u2014 watch for respiratory failure if volume-overloaded." },
        { trial: "PRESERVE", pearl: "In 5177 high-risk CKD patients getting angiography, IV sodium bicarb and N-acetylcysteine did NOT prevent contrast AKI vs IV saline. Use isotonic saline when prophylaxis is indicated; do not add NAC or routine bicarbonate." },
      ],
    },
  ],
  2: [
    {
      id: "sodium-cheatsheet",
      icon: "\u{1F9C2}",
      title: "Sodium Disorders Survival Guide",
      subtitle: "The most feared electrolyte (for good reason)",
      topics: ["Hyponatremia", "Hypernatremia", "Fluid Management"],
      sections: [
        {
          heading: "Hyponatremia Framework",
          items: [
            "Step 1: Check serum osmolality (rule out pseudohyponatremia from lipids/proteins, or hypertonic from glucose)",
            "Step 2: Check urine osmolality \u2014 if <100 \u2192 primary polydipsia or tea-and-toast diet",
            "Step 3: Check urine Na \u2014 if <30 \u2192 low effective circulating volume; if >30 \u2192 SIADH, diuretics, adrenal insufficiency",
            "Step 4: Assess volume status (the hardest part \u2014 and we\u2019re often wrong!)",
          ],
        },
        {
          heading: "Correction Rate Limits (Critical!)",
          items: [
            "Symptomatic (seizures, obtundation, herniation risk): repeated 3% saline boluses (100\u2013150 mL over 10 min, up to 3 doses) to get an early 4\u20136 mEq/L rise \u2014 endpoint is symptom resolution, not an hourly rate",
            "Chronic (>48h or unknown): target 4\u20136 mEq/L in 24h, and do NOT exceed 8 mEq/L in any 24h period (cap at 8 is enough \u2014 lower threshold if high-risk for ODS: Na \u2264105, liver disease, alcohol use, malnutrition, hypokalemia)",
            "Overcorrection beyond these limits risks osmotic demyelination syndrome (ODS)",
            "If overcorrecting: DDAVP 1\u20132 mcg IV/SC q6\u20138h + D5W to re-lower sodium (proactive DDAVP clamp + 3% saline is a reasonable strategy in high-risk patients)",
          ],
        },
        {
          heading: "Hypernatremia in One Box",
          items: [
            "Always means free water deficit (even if total body sodium is high)",
            "Common: Inadequate water intake (elderly, intubated), diabetes insipidus, osmotic diuresis",
            "Free water deficit = TBW \u00d7 [(Na/140) \u2212 1]. Replace deficit over 48\u201372h",
            "Correction rate: \u226410 mEq/L per 24h to avoid cerebral edema",
          ],
        },
      ],
      trialCallouts: [
        { trial: "SMART", pearl: "In 15,802 ICU patients, balanced crystalloids cut the MAKE30 composite from 15.4% to 14.3% vs NS. NS drives hyperchloremic acidosis \u2014 default to LR or Plasmalyte." },
        { trial: "SALT-ED", pearl: "In 13,347 non-ICU ED patients, balanced crystalloids cut MAKE30 from 5.6% to 4.7% vs NS. Extends SMART \u2014 LR/Plasmalyte should be the default fluid everywhere, not just the ICU." },
      ],
    },
    {
      id: "potassium-acidbase-cheatsheet",
      icon: "\u26A1",
      title: "K\u207a & Acid-Base Quick Hits",
      subtitle: "Don\u2019t let these kill your patient (or your presentation)",
      topics: ["Hyperkalemia", "Hypokalemia", "Acid-Base", "Calcium/Phosphorus", "CKD-MBD"],
      sections: [
        {
          heading: "Hyperkalemia Emergency Protocol",
          items: [
            "1. Stabilize the heart: Calcium gluconate 1 g IV (10 mL of 10%) over 2\u20133 min \u2014 repeat after 5 min if ECG changes persist; use CaCl\u2082 (500\u20131000 mg) via central line only",
            "2. Shift K\u207a into cells: Insulin 10U IV + D50 (check glucose!), albuterol nebs, \u00b1 sodium bicarb (if acidotic)",
            "3. Remove K\u207a from body: furosemide (if making urine) \u2014 fast, cheap. Newer GI binders (sodium zirconium cyclosilicate / Lokelma, patiromer / Veltassa) work over hours and are the preferred binder class now. Hemodialysis is definitive. SPS / Kayexalate has slow, unpredictable onset + GI-necrosis risk \u2014 UK Kidney Association 2023 and most modern guidelines do NOT recommend it for acute emergencies.",
            "4. Monitor: Repeat K\u207a in 1\u20132h, continuous telemetry, repeat ECG",
          ],
        },
        {
          heading: "ECG Changes in Hyperkalemia (in order)",
          items: [
            "Mild (5.5\u20136.0): Peaked T waves (the early warning sign!)",
            "Moderate (6.0\u20137.0): Prolonged PR, flattened P waves, widened QRS",
            "Severe (>7.0): Sine wave \u2192 VFib \u2192 asystole (get calcium in NOW)",
            "Pearl: ECG changes don\u2019t always correlate with K\u207a level \u2014 treat the patient, not just the number",
          ],
        },
        {
          heading: "Acid-Base in 4 Steps",
          items: [
            "1. pH: Acidemia (<7.35) or alkalemia (>7.45)?",
            "2. Primary disorder: Check CO\u2082 (respiratory) and HCO\u2083 (metabolic)",
            "3. Compensation: Winter\u2019s formula for metabolic acidosis \u2192 expected pCO\u2082 = 1.5(HCO\u2083) + 8 \u00b1 2",
            "4. Anion gap: Na \u2212 (Cl + HCO\u2083). Normal is lab- and albumin-dependent; correct AG upward by ~2.5 for each 1 g/dL albumin below 4. If elevated \u2192 HAGMA (MUDPILES: Methanol, Uremia, DKA, Propylene glycol, INH/Iron, Lactic acidosis, Ethylene glycol, Salicylates)",
          ],
        },
        {
          heading: "Delta-Delta Ratio (Don\u2019t Forget!)",
          items: [
            "\u0394AG / \u0394HCO\u2083: Tells you if there\u2019s a hidden second metabolic disorder",
            "Ratio <1: Mixed HAGMA + NAGMA (e.g., DKA + diarrhea)",
            "Ratio 1\u20132: Pure HAGMA (most common)",
            "Ratio >2: Mixed HAGMA + metabolic alkalosis (e.g., DKA + vomiting)",
          ],
        },
        {
          heading: "CKD-MBD in 60 Seconds",
          items: [
            "CKD causes phosphate retention and lower calcitriol activation. The usual pattern is high phosphorus, low-normal calcium, and rising PTH.",
            "Track calcium, phosphorus, PTH, and vitamin D together \u2014 one lab by itself is rarely enough.",
            "Renal osteodystrophy is the bone-biopsy manifestation; CKD-MBD is the broader mineral, bone, and vascular disorder.",
            "High-yield management ideas: lower phosphorus burden, use binders when needed, and treat secondary hyperparathyroidism thoughtfully.",
          ],
        },
        {
          heading: "Other Electrolyte Emergencies",
          items: [
            "Severe hypercalcemia (Ca >14 mg/dL or symptomatic): (1) aggressive IV isotonic saline 200\u2013300 mL/h, titrate to UOP \u2014 avoid loop diuretics routinely unless volume-overloaded, (2) IV calcitonin 4 U/kg q6\u201312h for 24\u201348 h (tachyphylaxis limits longer use), (3) IV bisphosphonate: zoledronic acid 4 mg over 15 min OR pamidronate 60\u201390 mg over 2\u20134 h \u2014 onset ~2\u20134 days; avoid or dose-adjust in severe CKD. (4) Denosumab for hypercalcemia of malignancy refractory to bisphosphonate is typically 120 mg SC on days 1, 8, 15, and 29, then monthly; use specialist/pharmacy dosing and monitor closely for hypocalcemia in CKD G4\u20135. (5) Glucocorticoids for granulomatous / lymphoma-mediated disease. (6) Hemodialysis with a low-calcium bath for life-threatening hypercalcemia with AKI or CHF.",
            "Severe hypermagnesemia (Mg >7 mEq/L or symptomatic weakness/arrhythmia): stop the source (laxatives, antacids, MgSO4 drip); IV calcium gluconate as a functional antagonist; IV saline + loop diuretic to promote renal excretion; hemodialysis for severe/symptomatic disease, especially in CKD.",
            "Severe hypophosphatemia (PO4 <1\u20131.5 mg/dL, or symptomatic \u2014 respiratory muscle weakness, hemolysis, rhabdo): IV potassium or sodium phosphate 0.16\u20130.32 mmol/kg over 4\u20136 h (slower infusion if severe CKD). Repeat phos q6h. Watch for hypocalcemia and metastatic calcification. Oral phosphate if asymptomatic and PO4 >1 mg/dL. Refeeding, DKA recovery, and alcoholism are the classic triggers.",
          ],
        },
      ],
      trialCallouts: [
        { trial: "BiCARB (CKD Bicarb Supplementation)", pearl: "In 300 older CKD patients (eGFR <30, bicarb <22), the 2020 BiCARB RCT found NO kidney, function, or hospitalization benefit from oral NaHCO3. KDIGO 2024 now only considers alkali around bicarb <18." },
      ],
    },
    {
      id: "cardiorenal-cheatsheet",
      icon: "\u2764\uFE0F",
      title: "Cardiorenal Syndrome",
      subtitle: "When the heart and kidney stop cooperating",
      topics: ["Cardiorenal Syndrome", "Fluid Management", "Diuretics"],
      sections: [
        {
          heading: "What Is Cardiorenal Syndrome?",
          items: [
            "CRS = acute or chronic dysfunction of heart OR kidneys inducing dysfunction in the other",
            "30-60% of HF patients have eGFR <60 \u2014 this is extremely common",
            "20-30% of hospitalized HF patients develop Cr rise >0.3 mg/dL during treatment",
            "Key concept: Rising Cr during diuresis is NOT always bad \u2014 if the patient is decongesting, it may be hemodynamic (not injury)",
          ],
        },
        {
          heading: "Pathophysiology (Why Kidneys Fail in HF)",
          items: [
            "NOT just 'low forward flow' \u2014 venous congestion is often the dominant driver",
            "Elevated CVP \u2192 elevated renal venous pressure \u2192 \u2193 GFR (independent of cardiac output!)",
            "Neurohormonal activation: \u2191 RAAS, \u2191 SNS, \u2191 ADH \u2192 sodium/water retention \u2192 worsening congestion",
            "RV dilation impairs LV filling via ventricular interdependence (septal shift) \u2192 \u2193 forward output",
            "BUN/Cr ratio elevation is a weak, non-specific marker often invoked as reflecting neurohormonal activation \u2014 use it as a clue, not as evidence of 'prerenal' physiology",
          ],
        },
        {
          heading: "Management Pearls",
          items: [
            "Decongest aggressively \u2014 don\u2019t stop diuretics just because Cr rises if the patient is still volume overloaded",
            "Cr rise + hemoconcentration + \u2193 NT-proBNP = good sign (effective decongestion), NOT kidney injury",
            "Loop-diuretic escalation: max IV loop dose \u2192 add acetazolamide 500 mg IV daily (ADVOR) \u2014 especially if hypochloremic/alkalotic \u2014 and/or a thiazide (HCTZ, IV chlorothiazide, or metolazone; metolazone has a longer half-life and more K\u207a/Na\u207a derangement). UF is last-line (CARRESS-HF).",
            "Start or continue SGLT2i (empagliflozin/dapagliflozin) once stable: EMPULSE showed safe in-hospital initiation during acute HF; AHA/ACC/HFSA 2022 + ESC 2023 make SGLT2i Class I for both HFrEF and HFpEF, regardless of diabetes.",
            "Rapid GDMT up-titration BEFORE discharge (STRONG-HF): aggressive post-discharge titration of ACEi/ARNI + BB + MRA + SGLT2i cut 180-d death/HF readmission ~34%. A modest Cr bump is usually tolerable.",
            "Hypochloremia with metabolic alkalosis during diuresis \u2260 contraction alkalosis if patient is still volume overloaded \u2014 it\u2019s chloride-depletion alkalosis; acetazolamide helps both.",
            "Monitor: daily weights, strict I&Os, BMP, BNP/NT-proBNP trend, urine output. Torsemide and furosemide are equivalent for post-discharge outcomes (TRANSFORM-HF) \u2014 pick by bioavailability/cost.",
          ],
        },
      ],
      trialCallouts: [
        { trial: "CARRESS-HF", pearl: "In 188 cardiorenal syndrome patients, ultrafiltration had similar 96-h weight loss but a HIGHER Cr rise and more adverse events vs stepped IV diuretics. Diuretics remain first-line." },
        { trial: "DOSE", pearl: "In 308 ADHF patients, high-dose IV furosemide (2.5\u00d7 home oral dose) gave more net fluid loss and symptom relief with only a transient Cr bump; continuous infusion showed NO advantage over q12h bolus. Bolus q12h is fine \u2014 don\u2019t under-dose." },
        { trial: "ADVOR", pearl: "In 519 ADHF patients on IV loop diuretics, adding IV acetazolamide 500 mg/d improved successful decongestion at 3 days (OR 1.46). Especially helpful with metabolic alkalosis / hypochloremia." },
        { trial: "EMPULSE", pearl: "In 530 patients hospitalized with acute HF (HFrEF or HFpEF, diabetic or not), starting empagliflozin before discharge improved a clinical benefit composite at 90 days. Safe and effective to start in-hospital once stable." },
        { trial: "TRANSFORM-HF", pearl: "In 2859 HF patients post-hospitalization, torsemide did NOT beat furosemide for 12-month mortality. Pick by bioavailability, cost, and patient factors \u2014 not by drug superiority." },
        { trial: "STRONG-HF", pearl: "In 1078 post-HF-hospitalization patients, rapid up-titration of GDMT (ACEi/ARNI + BB + MRA) within 2 weeks with close follow-up cut 180-d death/HF readmission 34%. Push GDMT hard after discharge." },
        { trial: "FINEARTS-HF", pearl: "In 6001 HF patients with LVEF \u226540% (HFmrEF/HFpEF), finerenone cut total worsening HF events + CV death 16%. Extends finerenone beyond DKD \u2014 now has an HFpEF indication." },
      ],
    },
  ],
  3: [
    {
      id: "gn-nephrotic-cheatsheet",
      icon: "\u{1F50E}",
      title: "Glomerular Disease Cheat Sheet",
      subtitle: "Nephrotic vs. nephritic \u2014 know the difference cold",
      topics: ["Glomerulonephritis", "Nephrotic Syndrome", "Proteinuria", "Kidney Biopsy", "APOL1-Associated Kidney Disease"],
      sections: [
        {
          heading: "Nephrotic Syndrome (protein leak)",
          items: [
            "Definition: Proteinuria >3.5 g/day, hypoalbuminemia, edema, hyperlipidemia",
            "Big 4 causes in adults: Membranous nephropathy, FSGS, Minimal Change Disease, Diabetic nephropathy",
            "Complications: DVT/PE (lose antithrombin III), infections (lose immunoglobulins), AKI",
            "Workup: SPEP/UPEP + serum free light chains, serum PLA2R antibody, complement levels, hepatitis B/C, HIV, ANA. For membranous nephropathy, biopsy IHC now screens for PLA2R, THSD7A, NELL-1 (malignancy-associated), semaphorin 3B (pediatric), exostosin 1/2 (autoimmune), NCAM1, PCDH7, NDNF (syphilis-associated), HTRA1, and CNTN1 (CIDP-associated) \u2014 secondary MN hunts are increasingly antigen-directed.",
          ],
        },
        {
          heading: "Nephritic Syndrome (blood + inflammation)",
          items: [
            "Definition: Hematuria (RBC casts!), hypertension, mild-moderate proteinuria, \u2193GFR",
            "Think: IgA nephropathy, post-infectious GN, lupus nephritis, ANCA vasculitis, anti-GBM",
            "RPGN (crescentic GN) = nephritic emergency: Get biopsy ASAP, start empiric immunosuppression",
            "Serologic workup: ANCA, anti-GBM, C3/C4, ANA/dsDNA, ASO titer, hepatitis panel",
          ],
        },
        {
          heading: "When to Biopsy",
          items: [
            "Unexplained AKI with active urine sediment",
            "Nephrotic-range proteinuria in a non-diabetic",
            "Suspected RPGN (don\u2019t wait \u2014 this is urgent!)",
            "Transplant kidney dysfunction (rule out rejection)",
            "Contraindications: Single kidney (relative), bleeding disorder, uncontrolled HTN, small kidneys (CKD \u2014 won\u2019t change management)",
          ],
        },
        {
          heading: "Current Induction Regimens (2024\u201326)",
          items: [
            "Lupus nephritis (class III/IV \u00b1 V): KDIGO 2024 offers several initial options \u2014 glucocorticoids PLUS (a) MPAA (MMF/EC-MPS) alone, (b) low-dose IV cyclophosphamide (Euro-Lupus), (c) belimumab + MPAA or CYC (BLISS-LN), or (d) MPAA + a CNI (voclosporin per AURORA, or tacrolimus) when kidney function is not severely impaired. Triple regimens including belimumab or a CNI are increasingly used but are not universally the 'preferred' choice \u2014 individualize by proteinuria, eGFR, tolerability, fertility, and access.",
            "Practical notes: voclosporin requires eGFR >45. Cyclophosphamide stays useful for rapidly deteriorating kidney function or severe extrarenal disease.",
            "ANCA vasculitis induction: glucocorticoids + rituximab OR cyclophosphamide; add AVACOPAN (C5aR inhibitor) to allow rapid steroid taper (ADVOCATE).",
            "Primary membranous nephropathy (high risk): rituximab preferred over CNI (MENTOR).",
            "IgA nephropathy: optimize supportive care first (ACEi/ARB, BP/salt control, and SGLT2i when CKD criteria are met). For persistent proteinuria/high risk, choose among approved/available options based on phenotype, contraindications, label, access, and shared decision-making: sparsentan (PROTECT), atrasentan (ALIGN; accelerated approval 2025), TRF-budesonide (Nefecon/Tarpeyo), iptacopan (accelerated approval 2024), sibeprenlimab (Voyxact; accelerated approval Nov 2025), or systemic steroids in selected patients (low-dose TESTING). Sequencing is still evolving.",
            "Primary FSGS (podocytopathy): confirm primary disease (nephrotic-range proteinuria with diffuse foot-process effacement) and rule out secondary causes (APOL1, viral, obesity/hyperfiltration) before immunosuppressing. Initial therapy: high-dose glucocorticoids; CNI (tacrolimus or cyclosporine) for steroid-dependent/resistant disease. Sparsentan (Filspari, DUPLEX; FDA-approved for FSGS in Apr 2026) is indicated for FSGS WITHOUT nephrotic syndrome in patients age \u22658 \u2014 use it as an adjunct to ACEi/ARB in that narrower group, not as a routine add-on for full nephrotic-range primary FSGS. Do NOT use broad immunosuppression in genetic/secondary FSGS.",
            "aHUS (complement-mediated TMA): after ruling out TTP (ADAMTS13 \u2265 10%) and STEC-HUS, start empiric C5 inhibitor when aHUS is likely. Ravulizumab is often more convenient than eculizumab because of q8-week maintenance dosing, but choice depends on urgency, pregnancy/postpartum context, access, and local experience; both require meningococcal vaccination + prophylactic antibiotic coverage.",
            "C3 glomerulopathy (C3G / DDD): first FDA-approved therapies are now available \u2014 iptacopan (Factor B inhibitor, approved 2025) and pegcetacoplan (C3 inhibitor, approved 2025 for C3G or primary IC-MPGN in patients \u226512). Use alongside optimized supportive CKD care; add ACEi/ARB or SGLT2i when the usual proteinuric CKD indications are met. Distinguish from immune-complex MPGN on IF staining (C3-dominant vs immune-complex).",
            "TTP (iTTP): ADAMTS13 < 10% confirms the diagnosis (PLASMIC score screens in). Treatment: PLEX + glucocorticoids + caplacizumab (HERCULES trial, FDA-approved 2019) + rituximab for refractory/relapsing disease.",
          ],
        },
      ],
      trialCallouts: [
        { trial: "MENTOR", pearl: "In 130 primary MN patients, rituximab matched cyclosporine at 12 mo (60% vs 52% remission) and BEAT it at 24 mo (60% vs 20%) because CNI patients relapsed. RTX is now first-line for high-risk MN." },
        { trial: "TESTING", pearl: "In 503 IgAN patients with proteinuria >1 g/d on max ACEi/ARB, reduced-dose methylprednisolone cut the composite of 40% eGFR drop / ESKD / kidney death vs placebo. Use in selected high-risk patients." },
        { trial: "RAVE", pearl: "In 197 severe ANCA vasculitis patients, rituximab was non-inferior to cyclophosphamide for 6-mo remission (64% vs 53%) and SUPERIOR for relapsing disease. FDA-approved 2011." },
        { trial: "ADVOCATE (Avacopan)", pearl: "In 331 AAV patients, avacopan (C5aR inhibitor) + RTX or CYC achieved 52-wk sustained remission in 66% vs 55% with a standard prednisone taper \u2014 with far less steroid toxicity. FDA-approved 2021." },
        { trial: "STOP-IgAN", pearl: "In 162 IgAN patients on max supportive care (ACEi/ARB + BP), adding immunosuppression did NOT improve eGFR or ESKD at 3 years. Optimize supportive care first." },
        { trial: "PEXIVAS", pearl: "In 704 severe AAV patients (Cr >5.7 or pulmonary hemorrhage), plasma exchange did NOT reduce death or ESKD. Removed PLEX from routine AAV protocols; reduced-dose steroids were also non-inferior." },
        { trial: "BLISS-LN (Belimumab for LN)", pearl: "In 448 active LN patients, adding belimumab to MMF or CYC + steroids improved the 2-year renal response (43% vs 32% PERR). First biologic FDA-approved for LN (2020) \u2014 cornerstone of triple therapy." },
        { trial: "AURORA-1 (Voclosporin)", pearl: "In 357 active LN patients, adding voclosporin to MMF + steroids nearly doubled 1-year complete renal response (41% vs 23%). FDA-approved 2021 \u2014 use only if eGFR >45." },
        { trial: "PROTECT (Sparsentan)", pearl: "In 404 IgAN patients on max ACEi/ARB, sparsentan cut 36-wk proteinuria 49.8% vs 15.1% with irbesartan and modestly slowed eGFR decline at 2 years. FDA-approved 2023." },
        { trial: "NefIgArd (Nefecon / TRF-budesonide)", pearl: "In 364 IgAN patients on max ACEi/ARB, 9 months of gut-targeted budesonide cut UPCR 27% and preserved eGFR by ~3 mL/min/y over 2 years \u2014 benefit persisted after stopping. Approved disease-specific option for persistent proteinuria despite optimized supportive care." },
      ],
    },
    {
      id: "ckd-sglt2i-cheatsheet",
      icon: "\u{1F48A}",
      title: "CKD & the SGLT2i Revolution",
      subtitle: "Four pillars of DKD therapy you must know",
      topics: ["CKD", "Anemia of CKD", "Hypertension", "Proteinuria", "Diabetic Kidney Disease", "SGLT2 Inhibitors"],
      sections: [
        {
          heading: "CKD Staging (KDIGO Heat Map)",
          items: [
            "G1 (\u226590), G2 (60\u201389), G3a (45\u201359), G3b (30\u201344), G4 (15\u201329), G5 (<15)",
            "Albuminuria: A1 (<30 mg/g), A2 (30\u2013300), A3 (>300)",
            "Risk = GFR stage \u00d7 albuminuria stage \u2192 Green/Yellow/Orange/Red",
            "Refer to nephrology: eGFR <30, UACR >300, rapid decline (>5 mL/min/year), unexplained AKI",
          ],
        },
        {
          heading: "The 4 Pillars of DKD Therapy",
          items: [
            "Pillar 1 \u2014 ACEi/ARB: Backbone of therapy. Max tolerated dose. Don\u2019t stop for mild Cr bump (up to 30% is OK)",
            "Pillar 2 \u2014 SGLT2i: Dapagliflozin, empagliflozin, canagliflozin. Benefits INDEPENDENT of diabetes (DAPA-CKD). Use down to eGFR 20 (EMPA-KIDNEY)",
            "Pillar 3 \u2014 Finerenone (non-steroidal MRA): Add on top of ACEi/ARB for eligible DKD. Dedicated kidney/CV outcome data and no gynecomastia (FIDELIO/FIGARO); still monitor closely for hyperkalemia.",
            "Pillar 4 \u2014 GLP-1 RA (semaglutide): FLOW trial showed 24% reduction in kidney progression. The newest pillar.",
          ],
        },
        {
          heading: "SGLT2i Practical Prescribing",
          items: [
            "Start: Can initiate down to eGFR 20 (per EMPA-KIDNEY). Don\u2019t stop until dialysis or transplant",
            "Expect: Initial eGFR dip of 3\u20135 mL/min (hemodynamic, NOT harmful \u2014 like ACEi). Rebounds by 3 months",
            "Hold: Before major surgery, during acute illness (sick day rules)",
            "Side effects: Euglycemic DKA (rare), genital mycotic infections (counsel patients), volume depletion",
            "BP target in CKD: standardized office SBP <120 if tolerated (SPRINT/KDIGO). In routine clinic or home readings, many patients are managed toward <130/80; individualize for frailty, falls, and orthostasis.",
          ],
        },
        {
          heading: "CKD Complications You Should Name on Rounds",
          items: [
            "Anemia of CKD is usually low EPO plus iron-restricted erythropoiesis. Check hemoglobin, ferritin, and TSAT together.",
            "Iron deficiency is common, especially in dialysis. Replete iron before or alongside ESA therapy when appropriate.",
            "ESAs reduce transfusion burden, but higher hemoglobin targets caused harm in trials like TREAT and CHOIR.",
            "For advanced CKD, keep mentioning bicarbonate, potassium, anemia, CKD-MBD, and dialysis/transplant planning in the same breath.",
          ],
        },
      ],
      trialCallouts: [
        { trial: "Captopril Trial", pearl: "In 409 T1DM patients with overt nephropathy, captopril cut the risk of doubling serum Cr by 48% vs placebo (1993). Established ACEi/ARB as the foundation (Pillar 1) of DKD therapy." },
        { trial: "DAPA-CKD", pearl: "In 4304 CKD patients (eGFR 25\u201375, UACR 200\u20135000), dapagliflozin cut the kidney/CV composite 39% \u2014 in both diabetic and non-diabetic patients. Made SGLT2i standard for proteinuric CKD." },
        { trial: "EMPA-KIDNEY", pearl: "In 6609 CKD patients (eGFR 20\u201345 any UACR, or 45\u201390 + UACR \u2265200), empagliflozin cut kidney progression or CV death 28%. Confirmed SGLT2i class effect down to eGFR 20." },
        { trial: "CREDENCE", pearl: "In 4401 T2DM + CKD (eGFR 30\u201390 + UACR 300\u20135000) patients on max ACEi/ARB, canagliflozin cut kidney failure 30%. Stopped early \u2014 first SGLT2i kidney-specific trial." },
        { trial: "FIDELIO-DKD", pearl: "In 5734 T2DM + CKD + albuminuria patients on max ACEi/ARB, finerenone cut kidney events 18% and CV events 14%. Third pillar of DKD therapy \u2014 monitor K+." },
        { trial: "FLOW", pearl: "In 3533 T2DM + CKD (eGFR 25\u201375, albuminuria) patients, weekly semaglutide cut the kidney/CV death composite 24%. Stopped early \u2014 GLP-1 RAs are the 4th pillar of DKD therapy." },
        { trial: "SPRINT", pearl: "In 9361 non-diabetic high-CV-risk patients, intensive standardized SBP <120 vs <140 cut the primary CV composite 25% and all-cause mortality 27% \u2014 at cost of more AKI and syncope. Apply the <120 target only with standardized office technique and when tolerated." },
        { trial: "SHARP", pearl: "In 9270 CKD patients (incl dialysis), simvastatin + ezetimibe cut major atherosclerotic events 17% \u2014 benefit concentrated in non-dialysis CKD. Start statins before dialysis, not after." },
      ],
    },
    {
      id: "dkd-sglt2i-cheatsheet",
      icon: "\u{1F489}",
      title: "DKD & SGLT2i Deep Dive",
      subtitle: "The #1 cause of ESKD deserves its own sheet",
      topics: ["Diabetic Kidney Disease", "SGLT2 Inhibitors", "CKD"],
      sections: [
        {
          heading: "Diabetic Kidney Disease (DKD)",
          items: [
            "#1 cause of ESKD worldwide \u2014 affects ~40% of patients with diabetes",
            "Classic progression: Hyperfiltration \u2192 microalbuminuria (A2: 30-300 mg/g) \u2192 macroalbuminuria (A3: >300) \u2192 declining GFR \u2192 ESKD",
            "Screening: Annual UACR + eGFR for all diabetics (type 1 after 5 years, type 2 at diagnosis)",
            "When to suspect non-diabetic kidney disease in a diabetic: No retinopathy, active sediment, rapid GFR decline, onset <5 years after T1DM diagnosis \u2192 consider biopsy",
            "Pathology: Kimmelstiel-Wilson nodular glomerulosclerosis (classic but late), diffuse mesangial expansion (earlier)",
          ],
        },
        {
          heading: "SGLT2 Inhibitors \u2014 The Game Changer",
          items: [
            "Mechanism: Block sodium-glucose cotransporter-2 in proximal tubule \u2192 glucosuria \u2192 restore tubuloglomerular feedback \u2192 \u2193 intraglomerular pressure",
            "Benefits BEYOND glucose: \u2193 proteinuria, \u2193 GFR decline, \u2193 CV death, \u2193 HF hospitalization \u2014 works in NON-DIABETICS too (DAPA-CKD, EMPA-KIDNEY)",
            "Initiation: Can start down to eGFR 20 (EMPA-KIDNEY). Don\u2019t stop until dialysis/transplant even if eGFR falls below 20",
            "The 'eGFR dip': Expect 3-5 mL/min drop initially (hemodynamic, like ACEi). This is PROTECTIVE, not harmful. Rebounds by ~3 months",
            "Sick day rules: Hold during acute illness, major surgery, prolonged fasting (risk of euglycemic DKA in diabetics)",
            "Side effects: Genital mycotic infections (10-15%), volume depletion (caution with diuretics), euglycemic DKA (rare, mostly T1DM)",
          ],
        },
        {
          heading: "Four Pillars of DKD Therapy (2024)",
          items: [
            "Pillar 1 \u2014 ACEi/ARB: Max tolerated dose. Cr rise up to 30% is acceptable. Foundation since 1993 (Captopril Trial)",
            "Pillar 2 \u2014 SGLT2i: Dapagliflozin or empagliflozin. Class I recommendation for all CKD with UACR \u2265200 mg/g",
            "Pillar 3 \u2014 Finerenone (non-steroidal MRA): Add on top of ACEi/ARB in eligible DKD. 18% kidney risk reduction (FIDELIO-DKD); monitor K+ because hyperkalemia still occurs.",
            "Pillar 4 \u2014 GLP-1 RA (semaglutide): FLOW trial showed 24% kidney risk reduction. Stopped early for efficacy. The newest pillar",
            "BP target: standardized office SBP <120 mmHg if tolerated (SPRINT/KDIGO); routine/home targets are often closer to <130/80. HbA1c target: <7% for many, but avoid hypoglycemia and individualize.",
            "Statin (KDIGO lipid guidance): recommended for non-dialysis CKD adults \u226550 y; for ages 18\u201349 with CKD, use standard ASCVD risk assessment (SHARP-informed). Do NOT start a statin de novo after the patient is already on dialysis (no benefit); if already on a statin when dialysis starts, it is reasonable to continue.",
          ],
        },
      ],
      trialCallouts: [
        { trial: "CREDENCE", pearl: "In 4401 T2DM + CKD (eGFR 30\u201390 + UACR 300\u20135000) patients on max ACEi/ARB, canagliflozin cut kidney failure 30%. Stopped early \u2014 first SGLT2i kidney-specific trial." },
        { trial: "DAPA-CKD", pearl: "In 4304 CKD patients (eGFR 25\u201375, UACR 200\u20135000), dapagliflozin cut the kidney/CV composite 39% \u2014 including non-diabetics. SGLT2i are kidney drugs, not just diabetes drugs." },
        { trial: "EMPA-KIDNEY", pearl: "In 6609 CKD patients (eGFR 20\u201345 any UACR, or 45\u201390 + UACR \u2265200), empagliflozin cut kidney progression or CV death 28%. Confirms SGLT2i class effect down to eGFR 20." },
        { trial: "FIDELIO-DKD", pearl: "In 5734 T2DM + CKD + albuminuria patients on max ACEi/ARB, finerenone cut kidney events 18% and CV events 14%. Third pillar of DKD therapy \u2014 monitor K+." },
        { trial: "FLOW", pearl: "In 3533 T2DM + CKD (eGFR 25\u201375, albuminuria) patients, weekly semaglutide cut the kidney/CV death composite 24%. Stopped early \u2014 first GLP-1 RA kidney trial; 4th DKD pillar." },
      ],
    },
    {
      id: "adpkd-cheatsheet",
      icon: "\u{1FAE7}",
      title: "ADPKD: Genetics to Tolvaptan",
      subtitle: "The most common monogenic cause of ESKD",
      topics: ["Polycystic Kidney Disease", "CKD", "Hypertension"],
      sections: [
        {
          heading: "Genetics & Epidemiology",
          items: [
            "Prevalence ~1 in 1000 live births \u2014 the most common monogenic cause of CKD/ESKD",
            "PKD1 (chromosome 16): ~78% of families. More severe, earlier ESKD (median ~55 y)",
            "PKD2 (chromosome 4): ~14% of families. Milder, later ESKD (median ~70 y) \u2014 still not benign",
            "Rare genotypes: GANAB, DNAJB11, IFT140, ALG9 \u2014 usually milder, atypical imaging",
            "Risk factors for faster progression: PKD1 truncating mutation, male sex, early symptoms, large TKV, hypertension",
          ],
        },
        {
          heading: "Clinical Presentation \u2014 Think ADPKD When You See",
          items: [
            "Hypertension \u2014 earliest finding, often years before eGFR drops",
            "Flank/abdominal pain \u2014 from cyst hemorrhage, stones, or infection (most common symptom)",
            "Hematuria \u2014 gross or micro, often after cyst rupture",
            "Proteinuria \u2014 usually sub-nephrotic; heavy proteinuria should push you toward another diagnosis",
            "Nephrolithiasis (~20%) \u2014 uric acid or calcium oxalate",
            "Cyst infection: fever + focal flank pain; blood cultures often positive",
            "Palpable kidneys or incidental enlarged cystic kidneys on imaging",
          ],
        },
        {
          heading: "Diagnosis \u2014 Ultrasound Criteria (Pei, with family history)",
          items: [
            "Age 15\u201339 y: \u22653 cysts total (unilateral or bilateral)",
            "Age 40\u201359 y: \u22652 cysts in EACH kidney",
            "Age \u226560 y: \u22654 cysts in EACH kidney",
            "No family history: \u226510 cysts (\u22655 mm) in EACH kidney \u2014 and offer genetic testing",
            "CT/MRI if ultrasound equivocal, for donor evaluation, or to characterize complex cysts/masses",
          ],
        },
        {
          heading: "When to Send Genetic Testing (PKD NGS panel)",
          items: [
            "Equivocal imaging, especially living-donor evaluation",
            "Atypical presentation or sporadic ADPKD without a family history",
            "Syndromic features suggesting a non-PKD1/2 cause",
            "Reproductive counseling or pre-implantation diagnosis",
            "Known rare-genotype family",
          ],
        },
        {
          heading: "Risk Stratification \u2014 Who Gets Tolvaptan?",
          items: [
            "Mayo Imaging Classification is preferred: uses age, height, and total kidney volume (TKV) on CT-no-contrast or MRI-no-gadolinium",
            "Class 1C, 1D, 1E = HIGH RISK for progression to ESKD \u2192 tolvaptan candidates",
            "Class 2 = atypical imaging (asymmetric, unilateral, segmental) \u2014 usually slower",
            "If TKV not available: PROPKD score, rapid eGFR decline (\u22652.5\u20133 mL/min/yr), early HTN (<35 y), or early gross hematuria",
          ],
        },
        {
          heading: "General Treatment \u2014 All ADPKD Patients",
          items: [
            "BP target with ACEi/ARB (KDIGO 2025): home target \u2264110/75 is reserved for ages 18\u201349 with CKD G1\u2013G2 and BP >130/85 (HALT-PKD A). For BP already between 110/75 and 130/85, or for patients outside that age/GFR window, individualize toward standard CKD targets.",
            "Sodium restriction <2 g/day",
            "Fluid intake (KDIGO 2025): individualize \u2014 aim to suppress vasopressin when safe; liberal water intake is often at least 2\u20133 L/d in patients with eGFR \u226530 and no hyponatremia risk. Avoid fixed blanket targets in older patients, CKD G3b\u20134, or anyone with prior hyponatremia.",
            "Avoid chronic NSAIDs and other nephrotoxins",
            "SGLT2i and GLP-1 RAs: KDIGO 2025 does NOT recommend these specifically for ADPKD until more data are available (ADPKD was excluded from pivotal SGLT2i CKD trials). If a co-indication like heart failure or diabetes exists, standard guideline-directed use is reasonable.",
          ],
        },
        {
          heading: "Tolvaptan \u2014 The Only Disease-Modifying Drug",
          items: [
            "Who: high-risk adults (Mayo 1C/1D/1E) with eGFR \u226525 mL/min/1.73 m\u00b2",
            "Slows eGFR decline and TKV growth \u2014 does NOT cure",
            "Aquaretic: expect polyuria, nocturia, thirst \u2014 coach patients to drink to thirst and to keep up with urine output (often ~3\u20136 L/d on-drug), with special attention to avoiding free-water deficits overnight; individualize per KDIGO 2025",
            "Hepatotoxicity is the big safety issue: monthly LFTs \u00d718 months, then q3 months; REMS program enrollment required",
            "Contraindicated with liver impairment (except uncomplicated polycystic liver disease)",
            "Cost and adherence (polyuria) are the main real-world limitations",
          ],
        },
        {
          heading: "Extrarenal \u2014 Don\u2019t Miss These",
          items: [
            "Intracranial aneurysms (~8\u201312%) \u2014 SCREEN with time-of-flight MRA (no gadolinium) if: prior SAH, family h/o aneurysm/SAH/unexplained sudden death, upcoming major surgery, high-risk job, or chronic anticoagulation",
            "If the first screen is negative, individualize rescreening (KDIGO 2025 suggests ~5\u201310 y intervals) \u2014 sooner in those with strong family history of aneurysm/SAH, longer in lower-risk patients",
            "Hepatic cysts: common, usually asymptomatic; women > men (estrogen); symptomatic massive PLD \u2192 aspiration/sclerosis, fenestration, resection, or transplant",
            "Cardiac: MVP/regurgitation and aortic regurgitation have been reported, but modern MVP prevalence appears much lower than older 20\u201330% estimates; pericardial effusions can occur. Echo only if murmur or symptoms.",
            "Colonic diverticula (higher perforation risk, esp. post-transplant), abdominal wall/inguinal hernias, seminal vesicle cysts",
            "New sudden severe headache in an ADPKD patient = SAH until proven otherwise",
          ],
        },
        {
          heading: "Cyst Complications \u2014 Quick Management",
          items: [
            "Cyst pain: acetaminophen \u2192 tramadol; avoid chronic NSAIDs; refractory \u2192 cyst aspiration/sclerosis or laparoscopic fenestration",
            "Hematuria: usually self-limited; hydration and rest; rule out stone/infection/malignancy",
            "Cyst infection: lipophilic antibiotics (fluoroquinolone, TMP-SMX) for weeks \u2014 beta-lactams penetrate cysts poorly",
            "ESKD: all modalities work; PD is feasible despite large kidneys; transplant outcomes equal or better than non-ADPKD",
            "Nephrectomy: reserved for disabling mass effect, recurrent infection, suspected RCC, or to make room for transplant",
          ],
        },
      ],
      trialCallouts: [
        { trial: "TEMPO 3:4", pearl: "In 1445 ADPKD patients aged 18\u201350 with TKV \u2265750 mL, tolvaptan slowed TKV growth by ~50% (2.80 vs 5.51%/y) and eGFR decline by ~1 mL/min/y over 3 years. First disease-modifying ADPKD therapy \u2014 FDA-approved 2018." },
        { trial: "REPRISE", pearl: "In 1370 ADPKD patients with eGFR 25\u201365, tolvaptan slowed eGFR decline by 1.27 mL/min/y vs placebo over 1 year. Extended tolvaptan eligibility to later-stage ADPKD." },
      ],
    },
  ],
  4: [
    {
      id: "dialysis-cheatsheet",
      icon: "\u{1FA78}",
      title: "Dialysis Essentials",
      subtitle: "When, how, and what kind \u2014 the attending will quiz you",
      topics: ["Dialysis", "Dialysis Access", "Diuretics"],
      sections: [
        {
          heading: "When to Start Dialysis",
          items: [
            "NOT by eGFR alone! IDEAL trial showed no benefit to early start (eGFR 10\u201314) vs. late (5\u20137)",
            "Start when: Uremic symptoms (pericarditis, encephalopathy, bleeding), refractory fluid overload, refractory hyperkalemia/acidosis",
            "Emergent indications (AEIOU): Acidosis (refractory), Electrolytes (life-threatening/refractory hyperkalemia \u2014 often K\u207a \u22656.5 or any dangerous ECG changes), Ingestion (toxic alcohols, lithium), Overload (pulmonary edema), Uremia (encephalopathy, pericarditis)",
          ],
        },
        {
          heading: "HD vs. PD vs. CRRT",
          items: [
            "HD (hemodialysis): 3\u20134h sessions, 3\u00d7/week. Standard for most ESKD. Requires vascular access (AVF > AVG > TDC)",
            "PD (peritoneal dialysis): Patient does at home, daily exchanges. Better initial quality of life, preserves residual renal function longer",
            "CRRT: ICU only, for hemodynamically unstable patients. Slower fluid/solute removal = less hypotension",
            "Standard Kt/V target: \u22651.2 (HEMO Study showed no benefit to higher doses)",
          ],
        },
        {
          heading: "Vascular Access Hierarchy",
          items: [
            "Hierarchy in most patients: AVF (fistula) > AVG (graft) > TDC (tunneled catheter). The older \u2018Fistula First\u2019 slogan has been replaced by the KDOQI 2019 \u2018ESKD Life-Plan\u2019 \u2014 choose access based on the whole patient (anatomy, life expectancy, preferences), but avoid TDCs for long-term use whenever possible.",
            "AVF: Best long-term patency, lowest infection. Needs 2\u20133 months to mature. Thrill on palpation, bruit on auscultation",
            "AVG: Use in 2\u20133 weeks. Higher thrombosis/infection risk than AVF",
            "TDC: Immediate use but highest infection and mortality risk. Bridge only",
            "Assess access every encounter: Check for thrill, bruit, signs of infection, steal syndrome",
          ],
        },
        {
          heading: "Frequent HD & Modality Selection",
          items: [
            "FHN trial: 6\u00d7/week HD improved cardiac outcomes and QOL vs. 3\u00d7/week \u2014 but more access complications",
            "Modality choice: Patient preference matters most. PD for motivated patients; HD for those needing more support",
            "Conservative management: Discuss with elderly patients with multiple comorbidities \u2014 dialysis doesn\u2019t always prolong meaningful life",
          ],
        },
        {
          heading: "Anticoagulation in CKD & Dialysis",
          items: [
            "AFib stroke prevention, CKD G3\u2013G4 (eGFR 15\u201360): DOACs (apixaban, rivaroxaban, edoxaban) are generally preferred over warfarin per 2023 ACC/AHA/ACCP/HRS AFib guideline \u2014 better net clinical benefit, less bleeding.",
            "Dialysis/ESRD AFib: the 2023 ACC/AHA guideline says warfarin or an evidence-based dose of apixaban may be reasonable (Class 2b). RENAL-AF and AXADIA-AFNET 8 were underpowered; decisions should be individualized because both stroke and bleeding risks are high.",
            "Dabigatran: contraindicated at CrCl <30 and in dialysis (~80% renally cleared; high bleeding risk).",
            "Rivaroxaban: 15 mg daily is labeled down to CrCl 15 in some settings, but dialysis AF evidence/guideline support is thinner than for apixaban; avoid presenting it as equivalent to apixaban or warfarin in dialysis.",
            "VTE in CKD: apixaban and rivaroxaban have CKD subgroup evidence and are reasonable. LMWH accumulates at CrCl <30 \u2014 use weight-adjusted UFH or dose-reduced enoxaparin with anti-Xa monitoring. Fondaparinux contraindicated at CrCl <30.",
            "Warfarin-associated nephropathy: acute Cr rise (often with hematuria) when INR is supratherapeutic; biopsy shows RBC casts and tubular obstruction by RBCs. Include in the CKD differential.",
            "Circuit anticoagulation: systemic UFH is standard for most HD; use heparin-free HD (intermittent saline flushes) for high bleeding risk. Regional CITRATE anticoagulation is KDIGO-preferred first-line for CRRT when no liver-failure or citrate-accumulation contraindication.",
            "Aspirin in CKD: secondary prevention (known ASCVD) still indicated. PRIMARY prevention is no longer routine after age 60 (USPSTF 2022); individualize 40\u201359 based on bleeding risk \u2014 CKD and dialysis amplify bleeding risk.",
          ],
        },
      ],
      trialCallouts: [
        { trial: "IDEAL", pearl: "In 828 CKD patients, early dialysis start (eGFR 10\u201314) vs late (5\u20137) gave NO mortality difference. 76% of the late group eventually needed dialysis \u2014 start by symptoms/indications, not eGFR." },
        { trial: "HEMO Study", pearl: "In 1846 chronic HD patients, higher Kt/V (eKt/V 1.53 vs 1.16) did NOT reduce all-cause mortality. Standard per-session Kt/V \u22651.2 is the target." },
        { trial: "FHN", pearl: "In 245 HD patients, 6\u00d7/week in-center HD improved LV mass and physical-health scores vs 3\u00d7/week, but with more vascular access events. No mortality difference \u2014 benefit is QOL/LV remodeling." },
        { trial: "ADEMEX", pearl: "In 965 PD patients, increasing peritoneal Kt/V above ~1.7/week did NOT improve 2-year survival. Confirms the standard weekly Kt/V 1.7 adequacy target." },
      ],
    },
    {
      id: "transplant-stones-drugs-cheatsheet",
      icon: "\u{1F48E}",
      title: "Transplant, Stones & Nephrotoxins",
      subtitle: "The rest of week 4 in one page",
      topics: ["Transplant", "Kidney Stones", "AIN", "Nephrotoxins"],
      sections: [
        {
          heading: "Kidney Transplant Essentials",
          items: [
            "Best RRT option: better survival and QOL than dialysis. Living donor > deceased donor.",
            "Induction (modern US practice per OPTN/SRTR): rATG (thymoglobulin) for moderate\u2013high immunologic risk (~70% of US recipients); basiliximab (Simulect) for low risk. Belatacept is an alternative to CNIs in EBV-seropositive recipients.",
            "Maintenance: low-dose tacrolimus + MPAA (MMF or EC-MPS) + steroids (SYMPHONY-era framework). Envarsus XR is an extended-release tacrolimus option with more stable troughs.",
            "Post-transplant surveillance: tacrolimus troughs (center-specific, typically 8\u201310 ng/mL first 3 mo \u2192 5\u20138 \u2192 4\u20136), Cr, DSA, plasma BK PCR monthly through month 9 then q3 mo through year 2 (per 2024 international BK consensus), CMV PCR per serostatus (letermovir prophylaxis in D+/R\u2212 per SOLSTICE), PTDM screening (preferred term over NODAT).",
            "Rejection types: Hyperacute (minutes, preformed DSA); acute T-cell mediated rejection (TCMR, weeks\u2013months, Banff i/t scores); active antibody-mediated rejection (AMR \u2014 donor-specific antibodies from plasma cells, g+ptc microvascular injury \u00b1 C4d, circulating DSA, Banff 2019/2022); chronic active AMR; chronic TCMR / IF/TA.",
          ],
        },
        {
          heading: "Kidney Stones in 60 Seconds",
          items: [
            "Composition: ~75% calcium oxalate (hypercalciuria, hyperoxaluria, hypocitraturia) \u2014 radiopaque on KUB. Calcium phosphate (~5\u201310%) \u2014 associated with distal RTA / alkaline urine.",
            "Uric acid (~5\u201310%): radiolucent on KUB, acidic urine (pH <5.5). Treat with urine alkalinization with K-citrate to target pH 6.5\u20137 (over-alkalinization drives calcium phosphate stones).",
            "Struvite (10\u201315%): staghorn calculi, urease-producing infection (Proteus, Klebsiella, Providencia). Complete surgical removal (PCNL) + culture-guided antibiotics is curative \u2014 medical therapy alone will not clear them.",
            "Cystine (<1%): genetic cystinuria, classic hexagonal crystals. First-line is CONSERVATIVE \u2014 very high fluid intake (target urine output >3 L/d) + urinary alkalinization to pH >7. Reserve tiopronin / D-penicillamine for patients who fail conservative therapy (per AUA).",
            "Workup: non-contrast CT (gold-standard imaging); serum chemistries + Ca + PTH + uric acid; stone composition analysis when available. For RECURRENT stones (or first stone + high risk: family history, bowel disease, Cr rise, gout, single kidney), obtain TWO 24-hour urine collections measuring volume, Cr (adequacy), Na, Ca, oxalate, citrate, uric acid, pH, Mg, and K.",
            "Prevention: target URINE OUTPUT \u22652.5 L/day (usually needs ~3 L intake); low sodium (<2\u20133 g/d, drives calciuria); NORMAL calcium intake from food (~1000\u20131200 mg/d) \u2014 restricting dietary calcium paradoxically raises oxalate absorption and stone risk; moderate animal protein; limit high-oxalate foods in hyperoxaluria; DASH-style diet reduces recurrence.",
            "Disease-specific Rx: thiazide (e.g., chlorthalidone) for hypercalciuria with recurrent calcium stones; K-citrate for hypocitraturia and for uric acid / cystine stones; allopurinol for hyperuricosuria with recurrent calcium stones.",
            "Acute stone management: medical expulsive therapy with an alpha-blocker (tamsulosin 0.4 mg daily) is reasonable for distal ureteral stones 5\u201310 mm (AUA 2023, moderate-grade evidence). URS is first-line for most ureteral stones; ESWL for smaller stones in favorable anatomy; PCNL for >2 cm or staghorn calculi.",
          ],
        },
        {
          heading: "Common Nephrotoxins to Know",
          items: [
            "NSAIDs: Afferent arteriole vasoconstriction \u2192 \u2193GFR. Also causes AIN, papillary necrosis",
            "ACEi/ARB: Efferent dilation \u2192 \u2193GFR (usually hemodynamic, up to 30% Cr rise is OK)",
            "Aminoglycosides: Proximal tubular injury. Dose by levels. Once-daily dosing is safer",
            "Contrast: Risk is real but overhyped \u2014 use isotonic hydration when prophylaxis is indicated; do not add NAC or routine bicarbonate (PRESERVE)",
            "Lithium: Nephrogenic DI (polyuria), chronic tubulointerstitial nephritis, CKD with long-term use",
            "PPIs: AIN (acute), CKD and hypomagnesemia (chronic). Use the lowest dose for shortest duration",
          ],
        },
      ],
      trialCallouts: [
        { trial: "SYMPHONY", pearl: "In 1645 kidney transplant recipients, low-dose tacrolimus + MMF + daclizumab induction beat 3 other regimens for 1-year eGFR and biopsy-proven rejection. Basis for modern tacrolimus-based maintenance." },
        { trial: "BENEFIT", pearl: "In kidney transplant recipients, belatacept (costimulation blocker) maintenance yielded better 5\u20137-year GFR than cyclosporine with less CNI nephrotoxicity \u2014 at cost of more early acute rejection. CNI-free alternative." },
      ],
    },
    {
      id: "pd-cheatsheet",
      icon: "\u{1FAE7}",
      title: "Peritoneal Dialysis & Peritonitis",
      subtitle: "PD patients come to the hospital \u2014 you need to know this",
      topics: ["Peritoneal Dialysis", "Dialysis"],
      sections: [
        {
          heading: "PD Basics",
          items: [
            "Mechanism: Peritoneum as a dialysis membrane \u2014 dialysate instilled via Tenckhoff catheter, dwells, drains. Solute clearance by diffusion, fluid removal by osmotic ultrafiltration",
            "CAPD: 4-5 manual exchanges/day (2L each, dwell 4-6h). Continuous therapy = always has fluid in abdomen",
            "APD (cycler): Automated overnight exchanges while sleeping + daytime dwell. Most common modality in US",
            "Advantages over HD: Better residual renal function preservation, hemodynamic stability, patient independence, home-based, no vascular access needed",
            "Adequacy: Weekly Kt/V \u22651.7 (ADEMEX showed no benefit above this). Also track residual urine output + ultrafiltration volume",
          ],
        },
        {
          heading: "PD Peritonitis \u2014 The Big Complication",
          items: [
            "Suspect when: Cloudy effluent (most reliable sign!) + abdominal pain \u00b1 fever. Can present without systemic signs",
            "Diagnosis (ISPD 2022): Effluent WBC >100/\u03bcL with >50% PMNs, AFTER a dwell time of at least 2 hours. In APD or short-dwell patients, the dwell may be <2 h and the absolute WBC can be falsely low \u2014 PMN percentage becomes more informative. Send effluent for cell count + gram stain + culture (blood culture bottles).",
            "Most common organisms: Gram-positive cocci (S. epidermidis, S. aureus) = ~60%. Gram-negative = ~25%. Culture-negative = ~15%",
            "Empiric treatment (ISPD 2022): center-specific IP (intraperitoneal) regimen covering gram-positive + gram-negative. Common options: (a) IP vancomycin OR first-gen cephalosporin for gram-positive, PLUS (b) IP third-gen cephalosporin (ceftazidime) OR aminoglycoside (gentamicin) for gram-negative. IP cefepime monotherapy is also acceptable. Pick based on local sensitivities, MRSA rates, and prior cultures.",
            "Duration: Typically 14-21 days. Fungal peritonitis or refractory peritonitis \u2192 remove the catheter",
            "Prevention: Sterile exchange technique, exit site care, prophylactic antibiotics before procedures, mupirocin at exit site",
          ],
        },
        {
          heading: "Inpatient PD Management Pearls",
          items: [
            "Continue PD in the hospital if possible \u2014 coordinate with PD nursing/nephrologist",
            "Hold PD before abdominal surgery (drain abdomen). Resume per surgeon + nephrologist",
            "If admitted with peritonitis: obtain effluent cell count/culture first, start empiric IP antibiotics promptly, and continue/adjust PD exchanges with the PD team unless severe pain, surgical abdomen, catheter removal, or another clinical reason requires temporary HD.",
            "Don\u2019t use IV antibiotics alone for PD peritonitis \u2014 IP dosing is essential for adequate peritoneal levels",
            "Catheter removal indications (ISPD 2022): Fungal peritonitis, refractory peritonitis (no clinical improvement after 5 days \u2014 but expectant management is reasonable if effluent WBC is clearly trending down), relapsing peritonitis, catheter-related peritonitis with tunnel/exit-site infection",
            "Switch to HD temporarily if PD catheter removed or peritonitis is severe \u2014 place temporary HD catheter if needed",
          ],
        },
      ],
      trialCallouts: [
        { trial: "ADEMEX", pearl: "In 965 PD patients, increasing peritoneal Kt/V above ~1.7/week did NOT improve 2-year survival. Confirms the standard weekly Kt/V 1.7 adequacy target." },
      ],
    },
    {
      id: "special-topics-cheatsheet",
      icon: "🌟",
      title: "Special Topics in Nephrology",
      subtitle: "Pregnancy, genetic kidney diseases, RTA, and onco-nephrology",
      topics: ["Other"],
      sections: [
        {
          heading: "Pregnancy & the Kidney",
          items: [
            "Normal pregnancy physiology: GFR rises ~50% (serum Cr typically drops to ~0.4\u20130.6 mg/dL). A 'normal-looking' Cr of 0.8\u20131.0 in pregnancy may already indicate impaired function.",
            "Preeclampsia diagnosis (ACOG 2013/2020, reaffirmed): new-onset HTN \u226520 weeks PLUS proteinuria (UPCR \u22650.3, 24h \u2265300 mg) OR any end-organ feature \u2014 platelets <100K, Cr >1.1 or doubling, AST/ALT \u22652\u00d7 normal, pulmonary edema, new-onset headache/visual symptoms. Severe features = BP \u2265160/110, severe end-organ dysfunction. HELLP = hemolysis + elevated LFTs + low platelets. Eclampsia = seizures.",
            "Short-term rule-out: sFlt-1/PlGF ratio (FDA-approved 2023) helps exclude preeclampsia in the next 1\u20132 weeks when the clinical picture is uncertain.",
            "Low-dose aspirin for preeclampsia prevention: in US practice, use 81 mg daily after 12 weeks (ideally before 16 weeks) in high-risk patients: CKD, prior preeclampsia, chronic HTN, diabetes, SLE/APS, multifetal gestation. Some non-US/specialist protocols use 150 mg.",
            "Chronic HTN in pregnancy (CHAP trial, NEJM 2022): treat to <140/90 \u2014 improves composite maternal/fetal outcomes. The old 'do not treat unless \u2265160/105' rule is retired.",
            "First-line antihypertensives: labetalol and extended-release nifedipine. Methyldopa is now third-line (sedation, depression, weaker effect). CONTRAINDICATED: ACEi/ARB, direct renin inhibitors, MRAs (spironolactone \u2014 antiandrogen), sacubitril/valsartan, SGLT2i.",
            "Severe preeclampsia / eclampsia: IV magnesium sulfate for seizure prophylaxis + IV labetalol/hydralazine/nifedipine for severe-range BP. Delivery is definitive.",
            "Postpartum TMA differential: preeclampsia/HELLP should usually begin improving after delivery, but persistent or worsening thrombocytopenia/MAHA/AKI needs urgent hematology + nephrology input. Send ADAMTS13 immediately and do not delay plasma exchange if TTP is plausible; if TTP/STEC-HUS are unlikely, consider aHUS and start C5 inhibition. Send complement genetic panel.",
            "CKD in pregnancy: risk of preeclampsia, preterm birth, and CKD progression rises sharply with stage (G3b\u20135, especially with baseline proteinuria and HTN). Close MFM + nephrology co-management.",
            "Pregnancy on dialysis: intensified HD (\u226536 h/week) markedly improves live-birth rates (Hladunewich 2014). Anemia, BP, and volume goals are stricter.",
            "Pregnancy post-transplant: wait \u22651 year with stable graft and minimum steroid; switch MMF and mTOR inhibitors (sirolimus/everolimus) to azathioprine; avoid belatacept. Tacrolimus is generally continued with close monitoring.",
          ],
        },
        {
          heading: "Fabry Disease",
          items: [
            "X-linked lysosomal storage disorder: Deficiency of alpha-galactosidase A → accumulation of globotriaosylceramide (Gb3) in kidneys, heart, and nervous system",
            "Kidney manifestations: Progressive CKD with proteinuria, can reach ESKD by age 40-50 in males. Females are variably affected (X-inactivation)",
            "Classic symptoms: Acroparesthesias (burning pain in hands/feet in childhood), angiokeratomas, corneal verticillata, hypohidrosis, cardiac (LVH, arrhythmias)",
            "Diagnosis: Alpha-galactosidase A activity (low in males), plus GLA genetic testing; a kidney gene panel can identify GLA variants and support family screening.",
            "Treatment: Enzyme replacement therapy (agalsidase beta) or oral chaperone therapy (migalastat). Early treatment slows progression",
          ],
        },
        {
          heading: "Alport Syndrome",
          items: [
            "Genetic collagen IV disorder: Mutations in COL4A3, COL4A4, or COL4A5 → abnormal glomerular basement membrane",
            "X-linked (most common, COL4A5): Males → ESKD by 20s-30s, sensorineural hearing loss, anterior lenticonus. Females = carriers with variable hematuria/proteinuria",
            "Autosomal recessive (COL4A3/A4): Both sexes affected equally, similar severity to X-linked males",
            "Biopsy: GBM thinning, splitting, and lamellation ('basket-weave' pattern on electron microscopy)",
            "Treatment: early ACEi/ARB (slows progression \u2014 start once proteinuria appears, even before eGFR drops). Consider SGLT2i in adults with albuminuric CKD when general CKD criteria are met, but direct Alport-specific outcome data remain limited. COL4A3/A4/A5 genetic testing confirms the diagnosis and guides family screening. Bardoxolone (CARDINAL trial) met eGFR endpoints but was NOT FDA-approved (CV/fluid-retention concerns; Reata discontinued the program 2022).",
            "After transplant: Risk of anti-GBM disease against the 'new' normal collagen IV in the allograft (rare but important)",
          ],
        },
        {
          heading: "Renal Tubular Acidosis (RTA)",
          items: [
            "Type 1 (Distal RTA): Cannot secrete H+ in collecting duct → positive urine anion gap, urine pH >5.5, hypokalemia. Causes: autoimmune (Sjögren's), amphotericin, lithium",
            "Type 2 (Proximal RTA): Cannot reabsorb HCO₃ in proximal tubule → bicarb wasting, urine pH varies (initially >5.5, then <5.5 as bicarb drops). Causes: Fanconi syndrome, multiple myeloma, carbonic anhydrase inhibitors",
            "Type 4 (Hypoaldosteronism): Hyperkalemic NAGMA. Most common in DM + CKD (hyporeninemic hypoaldosteronism). Low aldosterone → ↓K+ secretion + ↓H+ secretion",
            "Urine anion gap: (UNa + UK) − UCl. Positive = impaired renal acid excretion (RTA). Negative = appropriate renal response (GI bicarb loss)",
            "Pearl: If NAGMA + hyperkalemia → think Type 4 RTA. If NAGMA + hypokalemia → think Type 1 or 2 RTA. Always check urine pH and urine anion gap",
          ],
        },
        {
          heading: "Onco-Nephrology: TLS, TMA & Cast Nephropathy",
          items: [
            "Tumor lysis syndrome (TLS): massive cell death → hyperuricemia, hyperkalemia, hyperphosphatemia, hypocalcemia, AKI. Diagnose using Cairo-Bishop criteria (2004) — laboratory TLS (≥2 lab abnormalities within 3 d before to 7 d after chemotherapy) vs clinical TLS (lab + Cr ≥1.5× ULN, seizure, or arrhythmia/sudden death). Risk-stratify prospectively with Howard 2011 (low / intermediate / high) by tumor type, WBC, LDH, and bulk. Prevention: aggressive IV fluids; allopurinol for low/intermediate risk; rasburicase (0.15–0.2 mg/kg IV × 1, often single-dose) for high risk or established TLS. Screen for G6PD deficiency before rasburicase (hemolysis / methemoglobinemia). Do NOT alkalinize urine (promotes calcium-phosphate precipitation).",
            "Thrombotic microangiopathy (TMA): MAHA (schistocytes) + thrombocytopenia + AKI. Work up ADAMTS13 (TTP if <10%), stool studies (STEC-HUS), and complement (aHUS). Drug-/cancer-associated TMA can be from gemcitabine, mitomycin C, anti-VEGF agents, or transplant/conditioning regimens. Treat aHUS with a C5 inhibitor; ravulizumab is often more convenient than eculizumab, but choice depends on syndrome, urgency, pregnancy context, access, and experience.",
            "Cast nephropathy (myeloma kidney): monoclonal free light chains precipitate in distal tubules forming large, fractured casts on biopsy. Backbone of therapy is rapid anti-clone chemotherapy — bortezomib + dexamethasone ± daratumumab — targeting ≥50% reduction in serum free light chains within days. Plasmapheresis and high cut-off HD are NOT routine (MYRE: negative for dialysis independence at 3 mo; EuLITE: negative). Reserve PLEX for selected cases where rapid sFLC clearance is considered alongside chemotherapy.",
            "Checkpoint inhibitor nephritis: immune-mediated AIN from PD-1/PD-L1 (pembrolizumab, nivolumab) and CTLA-4 (ipilimumab) inhibitors; risk is higher with combination regimens. Latency is typically weeks to months but can be >1 year. UA is often BLAND — sterile pyuria/eosinophiluria is inconsistent, so absence does NOT rule it out. Treat with prednisone 0.5–1 mg/kg/day taper over 8–12 weeks; hold the ICI during treatment. Rechallenge is reasonable after complete recovery from G1–G2 AKI; avoid after G3–G4 or recurrence. CAR-T therapy can also cause AKI, usually from cytokine release syndrome and tumor-lysis-like physiology.",
            "Cisplatin nephrotoxicity: dose-dependent proximal tubular injury (Fanconi-like features possible) + Mg²⁺ wasting. Prevention: aggressive isotonic saline hydration pre- and post-infusion; amifostine is no longer routinely recommended. Dose ≥50 mg/m² carries higher risk. May cause chronic tubulointerstitial disease with repeated cycles.",
            "MGRS (monoclonal gammopathy of renal significance): a low-grade B-cell clone producing a nephrotoxic monoclonal protein (AL amyloid, MIDD, proliferative GN with monoclonal deposits, LCPT, cast nephropathy, cryo). Treat the clone even when the MGUS is 'otherwise not malignant' — the paraprotein IS the problem.",
          ],
        },
      ],
      trialCallouts: [],
    },
  ],
};
