#!/usr/bin/env python3
"""
Inject addAbbreviationsSlide and addCaseSlide calls into each deck file.
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

# Per-deck content: abbreviations list + case vignette
DECK_DATA = {
    'aki.cjs': {
        'file_key': '01-AKI',
        'abbreviations': [
            ("AKI", "acute kidney injury"),
            ("KDIGO", "Kidney Disease: Improving Global Outcomes"),
            ("Cr", "creatinine"),
            ("UOP", "urine output"),
            ("BUN", "blood urea nitrogen"),
            ("eGFR", "estimated glomerular filtration rate"),
            ("FeNa", "fractional excretion of sodium"),
            ("FeUrea", "fractional excretion of urea"),
            ("ATN", "acute tubular necrosis"),
            ("AIN", "acute interstitial nephritis"),
            ("GN", "glomerulonephritis"),
            ("TMA", "thrombotic microangiopathy"),
            ("ACEi / ARB", "angiotensin-converting enzyme inhibitor / angiotensin receptor blocker"),
            ("NSAID", "non-steroidal anti-inflammatory drug"),
            ("KRT", "kidney replacement therapy (dialysis)"),
            ("AEIOU", "Acidosis, Electrolytes, Ingestion, Overload, Uremia"),
            ("CRRT", "continuous renal replacement therapy"),
            ("MAP", "mean arterial pressure"),
            ("CVP", "central venous pressure"),
            ("POCUS", "point-of-care ultrasound"),
            ("MAKE30", "major adverse kidney events at 30 days"),
        ],
        'case': {
            'vignette': "A 72-year-old man with HTN, CHF (EF 30%), and baseline Cr 1.4 is admitted for pneumonia. Started on IV piperacillin-tazobactam and NS boluses. On hospital day 3, Cr is 2.8, UOP 0.3 mL/kg/h over 12 h. BP 108/65, on room air. UA: 2+ protein, granular/muddy-brown casts. Meds held: lisinopril, furosemide. Ultrasound: no hydronephrosis.",
            'question': "What stage of AKI is this, and what's your top differential?",
            'answer': "KDIGO stage 2 AKI (Cr 2× baseline); most likely ATN from sepsis ± piperacillin-tazobactam synergistic nephrotoxicity.",
            'teaching': "Muddy-brown casts and a non-response to volume point to intrinsic ATN rather than pre-renal. Stage is driven by both Cr (2× baseline = stage 2) and UOP (< 0.5 for ≥ 12 h = stage 2). Plan: continue holding RAAS + nephrotoxins, optimize MAP ≥ 65, watch K+/HCO3 closely, daily UA, consider biopsy only if sediment unusual or failure to recover by day 7.",
        },
    },
    'hyperkalemia.cjs': {
        'file_key': '02-Hyperkalemia',
        'abbreviations': [
            ("K+", "potassium"),
            ("ECG", "electrocardiogram"),
            ("AKI / CKD", "acute / chronic kidney disease"),
            ("ESRD", "end-stage renal disease (on dialysis)"),
            ("KRT", "kidney replacement therapy"),
            ("RAAS", "renin-angiotensin-aldosterone system"),
            ("ACEi / ARB", "angiotensin-converting enzyme inhibitor / angiotensin receptor blocker"),
            ("MRA", "mineralocorticoid receptor antagonist (spironolactone/eplerenone)"),
            ("SZC", "sodium zirconium cyclosilicate (Lokelma)"),
            ("SPS", "sodium polystyrene sulfonate (Kayexalate)"),
            ("HD", "hemodialysis"),
            ("DKA", "diabetic ketoacidosis"),
            ("TMP-SMX", "trimethoprim-sulfamethoxazole"),
            ("CYP3A4", "cytochrome P450 3A4 enzyme"),
            ("HFrEF", "heart failure with reduced ejection fraction"),
            ("AMBER", "Patiromer + spironolactone trial in resistant HTN"),
            ("DIAMOND", "Patiromer + MRA trial in HFrEF"),
        ],
        'case': {
            'vignette': "A 68-year-old woman with T2DM, CKD 3b (eGFR 35), HFrEF 30%, on lisinopril 40 mg, spironolactone 25 mg, metoprolol, and furosemide 40 mg. ER check-in K+ 6.8 after missing a week of follow-up. BP 138/80, HR 62. ECG: peaked T waves, PR 220, QRS 105 ms. Pt is asymptomatic.",
            'question': "What's the immediate sequence of interventions, and what's your outpatient plan?",
            'answer': "Calcium gluconate 1 g IV now, then shift (insulin 10 U + D50 25 g; albuterol 10 mg neb), then remove (loop diuretic if UOP, SZC 10 g TID).",
            'teaching': "Three phases in order: STABILIZE → SHIFT → REMOVE. Calcium protects the heart but does NOT lower K+. After shift, the K+ rebounds in 4-6 h. Outpatient: her RAAS + MRA + CKD + diabetes are all driving hyperK, but these drugs are prognostically essential. Rather than stopping them permanently, add SZC or patiromer (AMBER, DIAMOND) and continue RAAS/MRA at adjusted doses. Diet counseling (avoid salt substitutes, bananas, potatoes) and adherence check are equally important.",
        },
    },
    'hyponatremia.cjs': {
        'file_key': '03-Hyponatremia',
        'abbreviations': [
            ("Na+", "sodium"),
            ("ADH", "antidiuretic hormone (vasopressin)"),
            ("SIADH", "syndrome of inappropriate antidiuretic hormone"),
            ("CSW", "cerebral salt wasting"),
            ("ODS", "osmotic demyelination syndrome"),
            ("DDAVP", "desmopressin (synthetic ADH)"),
            ("CNS", "central nervous system"),
            ("TSH", "thyroid stimulating hormone"),
            ("SSRI", "selective serotonin reuptake inhibitor"),
            ("HF", "heart failure"),
            ("CKD", "chronic kidney disease"),
            ("osm", "osmolality (in mOsm/kg)"),
            ("AMS", "altered mental status"),
            ("NS", "normal saline (0.9%)"),
            ("3% saline", "hypertonic saline"),
        ],
        'case': {
            'vignette': "A 74-year-old woman with small-cell lung cancer presents with 3 days of progressive confusion. Na+ 114 (baseline 138 one month ago), no seizures. Exam: alert but disoriented × 2. Euvolemic. Serum osm 244, urine osm 560, urine Na 48. TSH and AM cortisol normal. On home sertraline; no diuretic. On admission she's given 500 mL NS.",
            'question': "What's the diagnosis, is this acute or chronic, and what's the correction target?",
            'answer': "SIADH secondary to small-cell lung cancer; chronic hyponatremia (> 48 h); target Na+ rise ≤ 6–8 mEq/L per 24 h to avoid ODS.",
            'teaching': "Classic SIADH: hypotonic hyponatremia, inappropriately concentrated urine, urine Na > 30, euvolemic, normal TSH/cortisol. Isotonic saline can worsen SIADH via desalination. Treatment: fluid restriction (800-1000 mL/day) ± salt tabs; consider inpatient tolvaptan only if refractory and closely monitored. Na+ q2h during correction. If overcorrecting, rescue with DDAVP 2-4 µg IV + D5W 3 mL/kg. High-risk for ODS: alcoholism, malnutrition, hypokalemia, Na+ < 120.",
        },
    },
    'ckd.cjs': {
        'file_key': '04-CKD',
        'abbreviations': [
            ("CKD", "chronic kidney disease"),
            ("eGFR", "estimated glomerular filtration rate"),
            ("KDIGO", "Kidney Disease: Improving Global Outcomes"),
            ("CGA", "Cause, GFR stage, Albuminuria (KDIGO classification)"),
            ("UACR", "urine albumin-to-creatinine ratio"),
            ("DKD", "diabetic kidney disease"),
            ("ACEi / ARB", "angiotensin-converting enzyme inhibitor / angiotensin receptor blocker"),
            ("MRA", "mineralocorticoid receptor antagonist"),
            ("RAAS", "renin-angiotensin-aldosterone system"),
            ("SGLT2i", "sodium-glucose cotransporter 2 inhibitor"),
            ("GLP-1 RA", "glucagon-like peptide-1 receptor agonist"),
            ("CKD-MBD", "CKD mineral and bone disorder"),
            ("PTH", "parathyroid hormone"),
            ("ESA", "erythropoiesis-stimulating agent"),
            ("TSAT", "transferrin saturation"),
            ("AVF / AVG", "arteriovenous fistula / graft"),
            ("CVD", "cardiovascular disease"),
            ("KRT", "kidney replacement therapy (dialysis or transplant)"),
            ("AOBP", "automated office blood pressure"),
        ],
        'case': {
            'vignette': "A 58-year-old Black man with T2DM × 15 yr, HTN, obesity. Labs: eGFR 38 (CKD-EPI 2021), UACR 720 mg/g, HbA1c 7.8%, K+ 4.8, HCO3 23, Hb 10.9 (ferritin 90, TSAT 18%), home BP avg 148/88. On lisinopril 40, amlodipine 10, metformin 1000 BID, atorvastatin.",
            'question': "Which pillars are missing, and what's your next 3 interventions?",
            'answer': "Missing: SGLT2i, finerenone, GLP-1 RA. Also anemia workup needed. (1) Add dapagliflozin 10 mg, (2) add finerenone 10 mg (K+ < 5.0 ✓), (3) IV iron then consider ESA if Hb stays < 10.",
            'teaching': "CGA classification: G3b-A3 (very high risk). DKD pillars should be on-board when eligible. Stop metformin at eGFR < 30; he's still OK at 38. BP target is SBP < 120 when measured by standardized AOBP and tolerated. Also: retinal exam annually, vaccinate (flu, COVID, pneumococcal, HBV), modality education at eGFR < 30, nephrology follow-up q3-4 months for very-high-risk.",
        },
    },
    'dialysis.cjs': {
        'file_key': '05-Dialysis',
        'abbreviations': [
            ("KRT / RRT", "kidney / renal replacement therapy"),
            ("HD", "hemodialysis"),
            ("IHD", "intermittent hemodialysis"),
            ("CRRT", "continuous renal replacement therapy"),
            ("SLED", "sustained low-efficiency dialysis"),
            ("PD", "peritoneal dialysis"),
            ("CAPD", "continuous ambulatory peritoneal dialysis"),
            ("APD", "automated (cycler) peritoneal dialysis"),
            ("AVF / AVG", "arteriovenous fistula / graft"),
            ("CVC", "central venous catheter"),
            ("AEIOU", "Acidosis, Electrolytes, Ingestion, Overload, Uremia"),
            ("UF", "ultrafiltration"),
            ("Kt/V", "dialysis adequacy measure (clearance × time / volume)"),
            ("URR", "urea reduction ratio"),
            ("MALA", "metformin-associated lactic acidosis"),
            ("CLABSI", "central line-associated bloodstream infection"),
            ("ICU", "intensive care unit"),
        ],
        'case': {
            'vignette': "A 62-year-old man admitted to MICU with septic shock from pneumonia, on norepinephrine 0.4 µg/kg/min and vasopressin. Oliguric × 24 h, Cr rose from 1.2 to 4.6 over 72 h. K+ 6.8 (persistent despite med therapy), HCO3 14, pH 7.18, volume-overloaded with worsening oxygenation. No urgent toxin.",
            'question': "Does he meet criteria for KRT, and what modality?",
            'answer': "Yes — multiple AEIOU indications (Acidosis, Electrolytes, Overload). Start CRRT given hemodynamic instability.",
            'teaching': "AEIOU triggers: A (pH < 7.15), E (K+ > 6.5 refractory), O (pulmonary edema limiting oxygenation). CRRT preferred over IHD because he's on high-dose pressors; CRRT's gentler solute/fluid removal avoids further hemodynamic collapse. Standard dose 20-25 mL/kg/h effluent (ATN trial — more is not better). Large-bore CVC (usually IJ) for access. Goal is to bridge to renal recovery; ~60% of AKI-KRT patients recover kidney function, so this does NOT mean lifelong dialysis.",
        },
    },
    'gn.cjs': {
        'file_key': '06-GN',
        'abbreviations': [
            ("GN", "glomerulonephritis"),
            ("RPGN", "rapidly progressive glomerulonephritis"),
            ("IgA", "immunoglobulin A"),
            ("FSGS", "focal segmental glomerulosclerosis"),
            ("MPGN", "membranoproliferative glomerulonephritis"),
            ("SLE", "systemic lupus erythematosus"),
            ("ANCA", "anti-neutrophil cytoplasmic antibody"),
            ("GPA", "granulomatosis with polyangiitis"),
            ("MPA", "microscopic polyangiitis"),
            ("PR3 / MPO", "proteinase 3 / myeloperoxidase (ANCA targets)"),
            ("anti-GBM", "anti-glomerular basement membrane (Goodpasture)"),
            ("PLA2R", "phospholipase A2 receptor"),
            ("C3 / C4", "complement 3 / 4"),
            ("ANA / dsDNA", "antinuclear antibody / double-stranded DNA"),
            ("ASO", "anti-streptolysin O"),
            ("UPCR", "urine protein-to-creatinine ratio"),
            ("UACR", "urine albumin-to-creatinine ratio"),
            ("PLEX", "plasma exchange (plasmapheresis)"),
            ("IF / EM / LM", "immunofluorescence / electron / light microscopy"),
            ("VTE", "venous thromboembolism"),
        ],
        'case': {
            'vignette': "A 48-year-old man, 3-week history of sinusitis, hemoptysis, and fatigue. Admitted with Cr 3.4 (baseline 1.0 six months ago), UA: 3+ blood, 2+ protein, RBC casts, dysmorphic RBCs; UACR 2800. BP 168/102. CXR: bilateral patchy infiltrates. C3 and C4 normal. ANCA pending. No rash.",
            'question': "What's the likely diagnosis, what do you send today, and what's the urgency?",
            'answer': "ANCA-associated vasculitis (likely GPA: sinus + pulmonary + renal, normal complements). Send ANCA (MPO/PR3), anti-GBM, ANA/dsDNA. Biopsy TODAY. Empiric high-dose IV methylprednisolone after samples drawn.",
            'teaching': "Pulmonary-renal syndrome with rapidly rising Cr + active sediment = RPGN until proven otherwise. Classic triad for GPA: upper airway (sinus, nose) + lower airway (lung) + kidney. Normal C3/C4 argues against lupus or post-infectious. While waiting for biopsy: stabilize BP, oxygenation, no anticoagulation if biopsy planned. RAVE showed rituximab non-inferior to cyclophosphamide; PEXIVAS supports reduced-dose steroids. PLEX is not routine, but KDIGO 2024 still considers it for SCr > 3.4 mg/dL, dialysis/rapidly rising SCr, hypoxemic alveolar hemorrhage, or ANCA/anti-GBM overlap.",
        },
    },
    'transplant.cjs': {
        'file_key': '07-Transplant',
        'abbreviations': [
            ("CNI", "calcineurin inhibitor (tacrolimus, cyclosporine)"),
            ("MMF", "mycophenolate mofetil"),
            ("ATG", "anti-thymocyte globulin"),
            ("PJP", "Pneumocystis jirovecii pneumonia"),
            ("CMV", "cytomegalovirus"),
            ("EBV", "Epstein-Barr virus"),
            ("BK", "BK polyomavirus"),
            ("PTLD", "post-transplant lymphoproliferative disorder"),
            ("DSA", "donor-specific antibody"),
            ("D / R", "donor / recipient (e.g., D+/R- = donor positive, recipient negative)"),
            ("TMP-SMX", "trimethoprim-sulfamethoxazole (Bactrim)"),
            ("IS", "immunosuppression"),
            ("HLA", "human leukocyte antigen"),
            ("CYP3A4", "cytochrome P450 3A4 enzyme"),
            ("SCC / BCC", "squamous / basal cell carcinoma"),
            ("eGFR", "estimated glomerular filtration rate"),
            ("UACR", "urine albumin-to-creatinine ratio"),
            ("UA", "urinalysis"),
            ("LT", "liver transplant"),
            ("SLK", "simultaneous liver-kidney transplant"),
        ],
        'case': {
            'vignette': "A 55-year-old woman 14 months s/p deceased donor kidney transplant, on tacrolimus 3 mg BID (last trough 6.5), MMF 1 g BID, prednisone 5 mg. Baseline Cr 1.3. Clinic visit today: Cr 1.9. She reports 'taking drugs as prescribed.' New prescription 1 month ago from PCP: clarithromycin for bronchitis, completed. No fever, no urinary symptoms.",
            'question': "What's the most likely cause of the Cr rise, and what should you check?",
            'answer': "Tacrolimus toxicity from clarithromycin (CYP3A4 inhibition). Check tac trough NOW; expect elevated; also BK PCR, UA, UACR, volume status to exclude other causes.",
            'teaching': "Drug interactions are the #1 reversible cause of Cr rise in transplant clinic. Classic CYP3A4 inhibitors that RAISE tac: azole antifungals (fluc, vori, posa), macrolides (erythro, clarithro — NOT azithro), diltiazem, verapamil, grapefruit, HIV protease inhibitors. Always review the med list at every visit. If tac level is elevated, reduce dose and re-check in 3-5 days. If Cr doesn't return to baseline, the differential broadens: dehydration, rejection, BK nephropathy, obstruction, recurrent disease. Always get UA, UACR, BK PCR, and consider biopsy if Cr > 20% above baseline without clear reversible cause.",
        },
    },
    'hypertension.cjs': {
        'file_key': '08-Hypertension',
        'abbreviations': [
            ("BP", "blood pressure"),
            ("SBP / DBP", "systolic / diastolic blood pressure"),
            ("HTN", "hypertension"),
            ("CV", "cardiovascular"),
            ("CKD", "chronic kidney disease"),
            ("AOBP", "automated office blood pressure"),
            ("ABPM", "ambulatory blood pressure monitoring"),
            ("HBP", "home blood pressure"),
            ("ACEi / ARB", "angiotensin-converting enzyme inhibitor / angiotensin receptor blocker"),
            ("CCB", "calcium channel blocker"),
            ("DHP", "dihydropyridine (amlodipine type)"),
            ("MRA", "mineralocorticoid receptor antagonist"),
            ("RAS", "renal artery stenosis"),
            ("FMD", "fibromuscular dysplasia"),
            ("OSA", "obstructive sleep apnea"),
            ("LVH", "left ventricular hypertrophy"),
            ("UACR", "urine albumin-to-creatinine ratio"),
            ("LDDST", "low-dose dexamethasone suppression test"),
            ("OCP", "oral contraceptive pill"),
            ("NSAID", "non-steroidal anti-inflammatory drug"),
        ],
        'case': {
            'vignette': "A 52-year-old woman with T2DM, BMI 33, snoring. On lisinopril 40, HCTZ 25, amlodipine 10, metoprolol 50 BID. Office BP today 152/92 (Korotkoff, repeat 150/90). Home BP log: 148/88 to 155/94 am, 140/85 pm. Adherent by pill-count. K+ 3.4, spontaneously.",
            'question': "Is this resistant HTN? What's the most likely secondary cause and next step?",
            'answer': "Yes (uncontrolled on 3 appropriate agents incl. diuretic). Primary aldosteronism — spontaneous hypokalemia + resistant HTN. Check aldosterone/renin ratio (morning, off MRA 6 wk).",
            'teaching': "True resistant HTN requires 3 appropriately-dosed agents including a diuretic. Before adding a 4th drug, always work up secondary causes. Primary aldosteronism is the #1 secondary cause in resistant HTN, especially if spontaneous or diuretic-exaggerated hypokalemia. Testing: aldosterone/renin ratio AM, ideally off MRA × 4 weeks when safe. Other secondary causes: OSA (she snores!), RAS (younger women → FMD), pheo, Cushing, CKD, CoA. Next step after workup: add spironolactone 25 mg (PATHWAY-2 NNT 4 for resistant HTN). Also: weight loss, sleep study.",
        },
    },
    'hrs.cjs': {
        'file_key': '09-HRS',
        'abbreviations': [
            ("HRS", "hepatorenal syndrome"),
            ("HRS-AKI", "HRS with acute kidney injury (type 1 HRS)"),
            ("ICA", "International Club of Ascites"),
            ("ADQI", "Acute Disease Quality Initiative"),
            ("AASLD", "American Association for the Study of Liver Diseases"),
            ("SBP", "spontaneous bacterial peritonitis"),
            ("PMN", "polymorphonuclear cells (neutrophils)"),
            ("SAAG", "serum-ascites albumin gradient"),
            ("MELD", "Model for End-Stage Liver Disease score"),
            ("LT", "liver transplant"),
            ("SLK", "simultaneous liver-kidney transplant"),
            ("UNOS", "United Network for Organ Sharing"),
            ("TIPS", "transjugular intrahepatic portosystemic shunt"),
            ("NE", "norepinephrine"),
            ("ATN", "acute tubular necrosis"),
            ("KDIGO", "Kidney Disease: Improving Global Outcomes"),
            ("FeNa", "fractional excretion of sodium"),
            ("NSBB", "non-selective beta-blocker"),
        ],
        'case': {
            'vignette': "A 58-year-old woman with alcohol-related cirrhosis (MELD 22), ascites on furosemide/spironolactone, admitted with decreasing UOP. BP 92/58, HR 98. Cr 2.4 (baseline 1.1). Ascites tap: PMN 80/µL, culture pending. UA: bland, < 200 mg/day protein. US: normal kidneys. Diuretics held; albumin given for suspected low effective arterial volume; Cr remains 2.3 after reassessment.",
            'question': "Does she meet HRS-AKI criteria, and what's the next step?",
            'answer': "Yes — likely HRS-AKI after exclusion workup (cirrhosis + ascites, KDIGO AKI, no response after indicated resuscitation/diuretic hold, bland UA, no obstruction, no shock, no clear alternative cause). Start terlipressin + albumin with volume monitoring, and notify transplant hepatology now.",
            'teaching': "HRS-AKI is a diagnosis of exclusion, but the 2024 ICA-ADQI criteria no longer require a fixed 48-h albumin challenge or strict proteinuria/hematuria cutoffs. Paracentesis is still mandatory because SBP can precipitate AKI; PMN <250 makes SBP less likely while cultures are pending. Terlipressin 0.85 mg IV q6h (CONFIRM dose) + albumin; assess volume status carefully because respiratory failure risk rises if overloaded. Alternatives: norepinephrine in ICU or midodrine/octreotide when stronger options are unavailable. SLK is for prolonged kidney failure: sustained KRT ≥6 weeks or GFR/CrCl ≤25 for ≥6 weeks, or CKD criteria.",
        },
    },
    'contrast-aki.cjs': {
        'file_key': '10-ContrastAKI',
        'abbreviations': [
            ("CI-AKI", "contrast-induced AKI"),
            ("PC-AKI", "post-contrast AKI"),
            ("AKI", "acute kidney injury"),
            ("IV / IA", "intravenous / intra-arterial"),
            ("eGFR", "estimated glomerular filtration rate"),
            ("NSF", "nephrogenic systemic fibrosis"),
            ("KDIGO", "Kidney Disease: Improving Global Outcomes"),
            ("ACR", "American College of Radiology"),
            ("NAC", "N-acetylcysteine"),
            ("NS / LR", "normal saline / lactated Ringer's"),
            ("HCO3", "bicarbonate (sodium bicarbonate)"),
            ("PCI", "percutaneous coronary intervention"),
            ("TAVR", "transcatheter aortic valve replacement"),
            ("LVEDP", "left ventricular end-diastolic pressure"),
            ("UA", "urinalysis"),
            ("RBC", "red blood cell"),
            ("CKD", "chronic kidney disease"),
        ],
        'case': {
            'vignette': "A 70-year-old man with CKD (eGFR 28), DM, HTN is admitted with chest pain. Troponin positive; cardiology recommends urgent catheterization. Team calls nephrology to 'clear' him — worried about CI-AKI. BP 138/82, euvolemic by exam, UA bland.",
            'question': "What do you recommend regarding the cath? And what prophylaxis, if any?",
            'answer': "Proceed with catheterization — the risk of NOT treating the ACS far outweighs CI-AKI risk. Pre-hydrate with isotonic IV (1 mL/kg/h × 6-12 h pre and post). Use low-osmolar contrast, minimize volume. Skip NAC and bicarbonate.",
            'teaching': "Modern CI-AKI rates are much lower than taught historically, especially for IV contrast. Here the indication is intra-arterial (higher-risk route) in eGFR < 30 (highest-risk kidney function) — so prophylaxis is warranted. POSEIDON supports LVEDP-guided hydration in the cath lab if available. PRESERVE definitively debunked NAC and bicarbonate — neither helps vs isotonic NS. If he develops a Cr rise post-procedure: 24-48 h onset, peak 3-5 d, recovery ~7 d supports CI-AKI vs alternatives. If Cr rises 1-4 weeks after cath, think atheroemboli (livedo, eosinophilia, cholesterol clefts on biopsy).",
        },
    },
    'cardiorenal.cjs': {
        'file_key': '11-Cardiorenal',
        'abbreviations': [
            ("CRS", "cardiorenal syndrome"),
            ("HF", "heart failure"),
            ("HFrEF / HFpEF", "HF with reduced / preserved ejection fraction"),
            ("ADHF", "acute decompensated heart failure"),
            ("EF", "ejection fraction"),
            ("GDMT", "guideline-directed medical therapy"),
            ("LVH", "left ventricular hypertrophy"),
            ("CKD-MBD", "CKD mineral and bone disorder"),
            ("BNP / NT-proBNP", "brain natriuretic peptide / N-terminal proBNP"),
            ("UF", "ultrafiltration"),
            ("CVP", "central venous pressure"),
            ("POCUS", "point-of-care ultrasound"),
            ("IVC", "inferior vena cava"),
            ("ACEi / ARB / ARNi", "ACE inhibitor / ARB / angiotensin-neprilysin inhibitor (sacubitril/valsartan)"),
            ("MRA", "mineralocorticoid receptor antagonist"),
            ("SGLT2i", "sodium-glucose cotransporter 2 inhibitor"),
            ("ACE / DM", "angiotensin-converting enzyme / diabetes mellitus"),
            ("JVP", "jugular venous pressure"),
        ],
        'case': {
            'vignette': "A 66-year-old man with HFrEF (EF 25%) and CKD 3a admitted with ADHF. On furosemide 40 mg PO daily at home, now on 80 mg IV q12h. Day 3: weight down 4 kg, BNP down from 2800 → 1400, crackles improving, hematocrit up from 36 → 40. Cr rose 1.5 → 1.9 (27% increase). Team wants to hold lisinopril, stop furosemide, give albumin.",
            'question': "Is this acute kidney injury that needs volume? What do you recommend?",
            'answer': "No — this is hemodynamic Cr rise during effective decongestion. Continue loop diuretic, continue lisinopril. Add acetazolamide or metolazone only if diuresis stalls.",
            'teaching': "Rising Cr during active decongestion (weight down, BNP down, rising hct, improving exam) is usually benign and often PROTECTIVE. Stopping diuretics and 'protecting the kidneys' with saline causes reaccumulation of congestion and worse outcomes. Accept Cr rise of 20-30% on ACEi/ARB — it reflects hemodynamic adaptation, not injury. When truly stuck: sequential nephron blockade — add thiazide (CLOROTIC) or acetazolamide (ADVOR). UF is NOT first-line (CARRESS-HF). Start SGLT2i in HFrEF + CKD: dapagliflozin 10 mg (DAPA-HF) or empagliflozin (EMPEROR-Reduced) — down to eGFR 20.",
        },
    },
    'dkd.cjs': {
        'file_key': '12-DKD',
        'abbreviations': [
            ("DKD", "diabetic kidney disease"),
            ("T1DM / T2DM", "type 1 / type 2 diabetes mellitus"),
            ("A1c / HbA1c", "glycated hemoglobin"),
            ("ESKD", "end-stage kidney disease"),
            ("eGFR", "estimated glomerular filtration rate"),
            ("UACR", "urine albumin-to-creatinine ratio"),
            ("RAAS", "renin-angiotensin-aldosterone system"),
            ("ACEi / ARB", "angiotensin-converting enzyme inhibitor / angiotensin receptor blocker"),
            ("SGLT2i", "sodium-glucose cotransporter 2 inhibitor"),
            ("GLP-1 RA", "glucagon-like peptide-1 receptor agonist"),
            ("MRA", "mineralocorticoid receptor antagonist"),
            ("DPP-4", "dipeptidyl peptidase-4 inhibitor"),
            ("DKA", "diabetic ketoacidosis"),
            ("CGM", "continuous glucose monitor"),
            ("KDIGO", "Kidney Disease: Improving Global Outcomes"),
            ("ADA", "American Diabetes Association"),
            ("KFRE", "Kidney Failure Risk Equation"),
            ("AOBP", "automated office blood pressure"),
            ("CV", "cardiovascular"),
        ],
        'case': {
            'vignette': "A 45-year-old woman with T2DM × 12 yr, proliferative retinopathy (post-laser), A1c 8.4%, BP 142/88 home avg. Meds: metformin 1 g BID, glipizide 10 mg, lisinopril 20 mg, HCTZ 12.5 mg. Labs: eGFR 42, UACR 580, K+ 4.5, Hb 11.2, LDL 118 (on no statin).",
            'question': "Audit her DKD care — what are the top 4 things missing?",
            'answer': "(1) Lisinopril at SUB-maximal dose (should be 40), (2) No SGLT2i (start dapagliflozin 10 mg — eGFR qualifies), (3) No finerenone (eligible: K+ 4.5, eGFR 25-60 → start 10 mg), (4) No statin (start moderate-to-high intensity).",
            'teaching': "Classic DKD presentation with retinopathy — diagnosis secure. All 4 pillars should be ON when eligible: ACEi/ARB max dose, SGLT2i, finerenone, GLP-1 RA. The retinopathy supports microvascular disease, but keep an eye out for atypical features. Titrate lisinopril to 40 (accept Cr rise to 30%). Start SGLT2i at eGFR ≥ 20. Finerenone 10 mg with K+ recheck in 1 month. GLP-1 RA (semaglutide 1 mg weekly per FLOW) adds kidney and CV benefit, also helps A1c and weight. Statin: diabetes age 40-75 is already an indication; CKD pushes intensity higher. BP target SBP < 120 when measured by standardized AOBP and tolerated. A1c 7-8% range given CKD.",
        },
    },
    'pd-peritonitis.cjs': {
        'file_key': '13-PDPeritonitis',
        'abbreviations': [
            ("PD", "peritoneal dialysis"),
            ("CAPD", "continuous ambulatory PD"),
            ("APD", "automated (cycler) PD"),
            ("IP", "intraperitoneal"),
            ("IV", "intravenous"),
            ("WBC / PMN", "white blood cell / polymorphonuclear leukocyte"),
            ("ISPD", "International Society for Peritoneal Dialysis"),
            ("CoNS", "coagulase-negative staphylococci"),
            ("MRSA / MSSA", "methicillin-resistant / sensitive Staph aureus"),
            ("GNR", "gram-negative rod"),
            ("ID", "infectious disease"),
            ("Kt/V", "dialysis adequacy (clearance × time / volume)"),
            ("HD", "hemodialysis"),
            ("TB", "tuberculosis"),
            ("GI", "gastrointestinal"),
            ("BMP / CBC", "basic metabolic panel / complete blood count"),
            ("CT", "computed tomography"),
        ],
        'case': {
            'vignette': "A 52-year-old man on CAPD × 3 yr for ESRD from DKD, presents with 1 day of cloudy effluent and abdominal pain. Last episode 8 months ago (staph epi). T 37.9, BP 128/78. Abdomen: diffuse tenderness, no rigidity. Exit site: clean, no erythema. Effluent sent: WBC 1400/µL, 82% PMN. Gram stain: gram-positive cocci in clusters. Cultures pending.",
            'question': "What's the empiric regimen, and what would trigger catheter removal?",
            'answer': "IP vancomycin (15-30 mg/kg load) + IP ceftazidime (1 g daily); empiric coverage until cultures final. Remove catheter for fungal, refractory (no improvement by day 5), or relapsing peritonitis.",
            'teaching': "Classic PD peritonitis — cloudy effluent + pain + effluent WBC > 100 with > 50% PMN meets 2-of-3 ISPD criteria. Always send effluent in blood-culture bottles BEFORE antibiotics. Gram-positive on Gram stain suggests staph — continue vanc until sensitivities back. Dual coverage (add ceftaz) for gram-negative until final cultures. Duration 14-21 days (21 for staph aureus). Keep the catheter unless: fungal (remove immediately), refractory at day 5, relapsing (same org within 4 wk), mycobacterial, concurrent tunnel infection. After the episode: review exit-site technique, re-training (poor technique is #1 reversible risk), continue mupirocin at exit site daily.",
        },
    },
}


def build_abbrev_call(key, items):
    items_str = ",\n      ".join(f'["{a}", {js_str(full)}]' for a, full in items)
    return f"""
  // Slide 2: Abbreviations
  addAbbreviationsSlide(pres, {{
    topic: TOPIC, slideNumber: 2, totalSlides: TOTAL,
    items: [
      {items_str}
    ],
  }});
"""


def build_case_call(case):
    return f"""
  // Slide 12: Clinical case
  addCaseSlide(pres, {{
    topic: TOPIC, slideNumber: 12, totalSlides: TOTAL,
    vignette: {js_str(case['vignette'])},
    question: {js_str(case['question'])},
    answer: {js_str(case['answer'])},
    teaching: {js_str(case['teaching'])},
  }});
"""


def js_str(s):
    # JS string literal with safe escapes
    return '"' + s.replace('\\', '\\\\').replace('"', '\\"') + '"'


for fname, data in DECK_DATA.items():
    fpath = os.path.join(BASE, fname)
    with open(fpath, 'r', encoding='utf-8') as fh:
        src = fh.read()

    # Skip if already injected
    already_has_abbrev = 'addAbbreviationsSlide(pres,' in src
    already_has_case = 'addCaseSlide(pres,' in src

    # 1. Insert abbreviations call right after the addCoverSlide call (find closing });)
    if not already_has_abbrev:
        # Find first occurrence of addCoverSlide(pres, { ... });
        m = re.search(r'addCoverSlide\(pres,\s*\{[^}]*\}\);', src, re.DOTALL)
        if m:
            insert_pos = m.end()
            abbrev_code = build_abbrev_call(data['file_key'], data['abbreviations'])
            src = src[:insert_pos] + abbrev_code + src[insert_pos:]
            print(f'{fname}: abbreviations inserted')
        else:
            print(f'{fname}: FAILED to find addCoverSlide call')
            continue

    # 2. Insert case call right before the addReferencesSlide call
    if not already_has_case:
        m = re.search(r'(  // \d+\.[^\n]*\n  addReferencesSlide\(pres,)', src)
        if not m:
            # try another pattern
            m = re.search(r'(  addReferencesSlide\(pres,)', src)
        if m:
            insert_pos = m.start()
            case_code = build_case_call(data['case'])
            src = src[:insert_pos] + case_code + '\n' + src[insert_pos:]
            print(f'{fname}: case inserted')
        else:
            print(f'{fname}: FAILED to find addReferencesSlide call')

    with open(fpath, 'w', encoding='utf-8') as fh:
        fh.write(src)

print('Done.')
