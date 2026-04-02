import { CSSProperties } from "react";
import { T } from "../../data/constants";

// ═══════════════════════════════════════════════════════════════════════
//  Shared styles used across multiple student components
// ═══════════════════════════════════════════════════════════════════════

export const backBtnStyle: CSSProperties = { position: "fixed", bottom: 72, right: 16, background: T.card, border: `1.5px solid ${T.line}`, color: T.med, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontWeight: 600, minHeight: 44, borderRadius: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", zIndex: 99 };

export const inputLabel: CSSProperties = { fontSize: 11, fontWeight: 700, color: T.sub, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 };

export const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", border: `1.5px solid ${T.line}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "-apple-system, sans-serif", outline: "none" };

// ═══════════════════════════════════════════════════════════════════════
//  Pro Tips — Nephrology clinical pearls
// ═══════════════════════════════════════════════════════════════════════

export const PRO_TIPS = [
  // Secrets 1-17: Patient Assessment & AKI
  "A spot urine protein-to-creatinine ratio correlates well with a 24-hour collection — use it as a quick quantitative screen.",
  "Bleeding is the most common kidney biopsy complication, but it's usually self-limited and rarely life-threatening.",
  "AKI differential: prerenal (perfusion problem), intrinsic (kidney damage), or postrenal (obstruction). Always think in three buckets.",
  "Hepatorenal syndrome is functional kidney failure in decompensated liver disease — the kidneys themselves are structurally normal.",
  "HRS treatment: albumin + vasoconstrictors (midodrine/octreotide or terlipressin), but liver transplant is the definitive cure.",
  "Drug-induced AKI is extremely common. Always do a thorough med review — NSAIDs, ACEi/ARBs, aminoglycosides, and contrast are frequent culprits.",
  "Sepsis is one of the leading causes of AKI in the ICU and carries a high mortality rate.",
  "In sepsis, early administration of appropriate antibiotics is critical and is associated with better outcomes.",
  "In rhabdomyolysis/crush injury, early aggressive IV fluids — even before extrication — are critical for preventing AKI.",
  "The risk of AKI rises with severe rhabdomyolysis and very high CK levels, especially in the setting of volume depletion, sepsis, or delayed resuscitation.",
  "Acute GN presents with the classic nephritic syndrome: edema, new or worsening HTN, and active urine sediment with RBC casts.",
  "RPGN (rapidly progressive GN) causes kidney function loss over days to weeks — without urgent treatment it often leads to ESKD.",
  "Primary nephrotic syndrome in adults commonly includes membranous nephropathy, FSGS, and minimal change disease. Diagnosis usually integrates clinical features, serologies, and kidney biopsy; genetic testing is selective, not universal.",
  "After relieving urinary obstruction, watch for post-obstructive diuresis — check electrolytes frequently and replace fluids appropriately.",
  "Struvite stones are caused by urease-producing bacteria, especially Proteus mirabilis. E. coli almost never produces urease.",
  "Uric acid stones are radiolucent on plain X-ray but readily visible on CT scan — always use CT for stone evaluation.",
  "Uric acid stones form in acidic urine — the primary treatment is urinary alkalinization with potassium citrate, not allopurinol.",
  // Secrets 18-26: CKD & Management
  "Enteric hyperoxaluria requires an intact colon — it results from increased oxalate absorption in the setting of fat malabsorption.",
  "Low-calcium diets are NOT recommended for calcium stone formers — they can worsen bone health without reducing stone formation.",
  "Diabetes and hypertension are the leading causes of CKD, with glomerular diseases and hereditary disorders such as ADPKD also important.",
  "ESA therapy: target hemoglobin should be individualized and should not exceed 12 g/dL. Higher targets increase cardiovascular risk.",
  "Most patients on ESAs need iron supplementation. Oral iron often fails due to poor absorption — IV iron is frequently necessary.",
  "CKD-MBD involves abnormal calcium, phosphorus, PTH, and vitamin D metabolism, leading to bone disease and vascular calcification.",
  "Cardiovascular disease is the #1 cause of death in CKD. Traditional CV risk factors behave differently in this population — study the evidence carefully.",
  "Most adults age 50 or older with CKD not on dialysis, and adult kidney transplant recipients, are candidates for statin therapy per KDIGO lipid guidance.",
  "Plan vascular access early in progressive CKD — an AV fistula needs several months to mature before it can be used for hemodialysis.",
  // Secrets 27-34: Glomerular Disease
  "Minimal change disease is the #1 cause of nephrotic syndrome in children. In adults it's the third most common, after membranous and FSGS.",
  "Categorizing FSGS as genetic, secondary, or primary guides treatment decisions and helps predict posttransplant recurrence risk.",
  "High-risk APOL1 genotypes are associated with a greater risk of FSGS progression to ESKD.",
  "Membranous nephropathy: ~80% of primary cases have anti-PLA\u2082R antibodies. Always rule out secondary causes like malignancy, hepatitis B, and lupus.",
  "IgA nephropathy is the most common primary GN worldwide — a nephritic syndrome with outcomes ranging from benign hematuria to RPGN.",
  "MPGN results from immune complex deposition or complement dysregulation. It can progress to ESKD over 10-15 years.",
  "MPGN is a pattern of injury with heterogeneous causes. Management depends on the underlying mechanism, and recurrence after transplant can occur.",
  "Diabetic retinopathy is present in almost all type 1 diabetics with nephropathy. If absent, consider an alternative diagnosis.",
  // Secrets 35-42: Lupus, Vasculitis, Infections
  "In lupus nephritis, early diagnosis is key — kidney function at biopsy correlates strongly with remission rates.",
  "Most pauci-immune crescentic GN is ANCA-associated. PR3-ANCA is more often linked with GPA and MPO-ANCA with MPA, but serology and phenotype are not perfectly interchangeable.",
  "ANCA vasculitis induction typically uses glucocorticoids plus rituximab or cyclophosphamide. Plasma exchange is no longer routine, but can be considered in selected severe cases, especially diffuse alveolar hemorrhage with hypoxemia or very severe kidney involvement.",
  "Post-infectious GN occurs 1-3 weeks after streptococcal pharyngitis (longer for skin infections). It's usually self-limiting and doesn't require immunosuppression.",
  "In GN workup, always check hepatitis B status — HBeAg positivity predicts the type of glomerular disease and carries a higher kidney disease risk.",
  "Hepatitis C-related GN: think type 2 cryoglobulinemia with low C3/C4 (classical complement activation) and MPGN pattern on biopsy.",
  "HIVAN disproportionately affects people of African ancestry and is strongly associated with APOL1 high-risk variants — collapsing FSGS on biopsy is the classic finding.",
  "HAART is the primary treatment for HIVAN and can produce histologic reversal, but it's less effective for HIV immune complex disease (HIVICK).",
  // Secrets 43-53: Oncology, TMA, Genetic
  "Both rhabdomyolysis and tumor lysis syndrome cause the same electrolyte storm: hyperK, hyperPhos, hypoCa, and hyperuricemia.",
  "Rasburicase rapidly lowers uric acid and is the key agent for preventing AKI in tumor lysis syndrome.",
  "Myeloma cast nephropathy is a medical emergency — delay in diagnosis and treatment leads to irreversible kidney failure.",
  "In myeloma, light chains (not heavy chains) cause kidney damage. They're freely filtered at the glomerulus and are toxic to the proximal tubule.",
  "Bortezomib-based chemotherapy is the preferred regimen for AKI secondary to myeloma cast nephropathy.",
  "Serum-free light chains are the preferred initial study when suspecting myeloma kidney — more sensitive than SPEP alone.",
  "Amyloidosis typically presents with nephrotic syndrome and edema — always consider it in unexplained nephrotic-range proteinuria.",
  "Renal cell carcinoma treatments can be nephrotoxic: VEGF inhibitors \u2192 proteinuria, PD-1 inhibitors \u2192 autoimmune nephritis, nephrectomy \u2192 reduced nephron mass.",
  "TMAs present with microangiopathic hemolytic anemia, thrombocytopenia, and kidney dysfunction. Major causes: Shiga toxin-HUS, aHUS, and TTP.",
  "Fabry disease is an underrecognized X-linked lysosomal storage disease in ~0.2% of ESKD patients. Suspect it in males with low alpha-galactosidase A.",
  "Alport syndrome: X-linked collagen IV mutation causing microscopic hematuria, proteinuria, sensorineural hearing loss, and progressive kidney failure.",
  // Secrets 54-60: AIN, Pregnancy, Sickle Cell
  "Thin basement membrane nephropathy (TBMN) is benign — microscopic hematuria without proteinuria, hearing loss, or progressive kidney failure.",
  "The classic AIN triad (fever, rash, eosinophilia) is present in < 10% of cases. Don't rely on its absence to rule out AIN.",
  "Drug-induced AIN is typically idiosyncratic rather than dose-dependent, and re-exposure to the offending drug can trigger recurrence.",
  "Asymptomatic bacteriuria only needs treatment in two situations: pregnancy and before urologic procedures.",
  "During pregnancy, GFR increases by ~50%. A 'normal' creatinine in a pregnant patient may actually indicate kidney dysfunction.",
  "Prepregnancy kidney function is the single best predictor of maternal and fetal outcomes in women with preexisting kidney disease.",
  "Sickle cell patients are particularly vulnerable to AKI from hemodynamic insults, pyelonephritis, toxins, and urinary tract obstruction.",
  // Secrets 61-71: Dialysis & Transplant
  "Uremic toxin removal in dialysis depends on three factors: time on dialysis, dialysate flow rate, and dialyzer membrane efficiency.",
  "For conventional thrice-weekly HD, the minimum delivered spKt/V is 1.2, with a target around 1.4 per treatment. Adequacy should be individualized, especially when residual kidney function is present.",
  "Home hemodialysis offers real benefits over in-center: better volume/BP control, improved phosphorus levels, less LV hypertrophy, and better quality of life.",
  "PD is a valid first dialysis modality and may offer quality-of-life and access-related advantages in selected patients. Modality choice should be individualized.",
  "A high serum creatinine in an ESKD patient meeting dialysis adequacy targets may reflect greater muscle mass — and is actually associated with better outcomes.",
  "Reducing PD peritonitis requires a team approach: regular audits, quality improvement initiatives, and ongoing training for both patients and staff.",
  "In ANCA vasculitis, treatment decisions should be guided by phenotype, organ-threatening severity, and current guideline recommendations rather than reflexively escalating to plasma exchange.",
  "The kidney transplant allocation system uses estimated posttransplant survival score and kidney donor profile index (KDPI) to match donors and recipients.",
  "Wait time for a deceased-donor kidney transplant in the US varies widely by blood type, sensitization, geography, and allocation factors, and often spans multiple years.",
  "Living donor kidney transplant offers the best long-term outcomes for ESKD patients — always discuss it early.",
  "Calcineurin inhibitors (tacrolimus > cyclosporine) are the backbone of transplant immunosuppression. They block T-cell activation via the calcineurin/signal 3 pathway.",
  // Secrets 72-75: Transplant Complications
  "Chronic active antibody-mediated rejection is a major cause of late allograft dysfunction and loss.",
  "EBV is found in ~2/3 of patients with posttransplant lymphoproliferative disorder (PTLD). Reducing immunosuppression is the initial treatment.",
  "BK plasma PCR is an essential screening test for BK viremia, but biopsy may still be needed to confirm BK nephropathy or distinguish it from rejection.",
  "Proteinuria after kidney transplant is associated with cardiovascular events and increased mortality — monitor it regularly.",
  // Secrets 76-84: Hypertension
  "For most adults with hypertension, use a practical treatment goal of <130/80 mmHg. In CKD, standardized office SBP <120 mmHg is supported by KDIGO for most non-dialysis patients when tolerated.",
  "No randomized trial has clearly shown that revascularization beats medical management for atherosclerotic renal artery stenosis.",
  "Secondary causes are common enough in resistant hypertension that they should be actively considered, especially when there are clinical clues.",
  "Obstructive sleep apnea is one of the most common causes of secondary HTN (~20%). Treating it improves both BP and quality of life.",
  "Hypertensive emergencies cause acute target-organ damage. Reduce BP gradually over minutes to hours — don't slam it to normal.",
  "First-line antihypertensives: thiazide-like diuretic, ACE inhibitor, ARB, or calcium channel blocker.",
  "Spironolactone is highly effective for treatment-resistant HTN but requires careful monitoring of potassium and kidney function.",
  "The AHA recommends no more than 2,300 mg/day of sodium and an ideal target of 1,500 mg/day for most adults. Even reducing sodium intake by about 1,000 mg/day can improve BP and heart health.",
  "The DASH pattern and sodium restriction can produce clinically meaningful BP reduction, often on the order of several mmHg or more.",
  // Secrets 85-92: Acid-Base & Sodium
  "Diuretics in COPD/cor pulmonale can cause contraction alkalosis. Acetazolamide helps correct the alkalosis and may improve ventilation.",
  "In metabolic alkalosis with volume contraction, urine sodium may be misleadingly normal — urine chloride < 15 mEq/L is the more reliable marker.",
  "Unexplained hypokalemia or bicarb abnormalities with difficult-to-treat HTN \u2192 workup for secondary causes like primary aldosteronism.",
  "Hypotonic hyponatremia: inadequate solute intake, excess free water intake, or impaired free water excretion. Urine osmolality helps distinguish them.",
  "Acute hyponatremia can be corrected faster, but chronic hyponatremia must be corrected slowly (\u2264 8 mEq/L per 24h) to prevent osmotic demyelination.",
  "In severely symptomatic hyponatremia, raising Na\u207a by just 3-4 mEq/L with 100 mL boluses of 3% saline can stop seizures and herniation.",
  "Prediction formulas for sodium correction don't account for ongoing water losses — always measure serum sodium frequently to avoid overcorrection.",
  "When in doubt, assume hyponatremia is chronic — especially for patients presenting from outside the hospital with no clear time of onset.",
  // Secrets 93-100: Potassium, Phosphorus, Acid-Base, Palliative
  "The definitive ways to remove potassium from the body: hemodialysis or increasing fecal excretion with potassium binders.",
  "IV calcium in hyperkalemia stabilizes the myocardium but does NOT lower K\u207a — it buys time while you give definitive K\u207a-lowering therapies.",
  "Hyperphosphatemia with normal kidney function? Think: excessive intake, cellular breakdown (rhabdo/TLS), or hypoparathyroidism.",
  "Always check and correct magnesium in refractory hypokalemia — low Mg makes K\u207a correction nearly impossible.",
  "Surviving Sepsis recommends against routine bicarbonate solely to improve hemodynamics in hypoperfusion-related lactic acidosis, but suggests considering bicarbonate in septic shock patients with severe metabolic acidemia (pH \u22647.2) plus AKI.",
  "Measuring urine chloride is an excellent first step in evaluating metabolic alkalosis — it helps classify as chloride-responsive vs. resistant.",
  "Hypokalemia plays a key role in maintaining metabolic alkalosis — you must correct the K\u207a deficit to successfully fix the alkalosis.",
  "Palliative care is appropriate at any stage of serious illness, not just at end of life. It's distinct from hospice, which requires a prognosis < 6 months.",
];

// Map PRE_QUIZ question indices → week numbers
// W1: 0-6 (7 Qs), W2: 7-13 (7 Qs), W3: 14-19 (6 Qs), W4: 20-24 (5 Qs)
export const PRE_QUIZ_WEEK_MAP = [
  ...Array(7).fill(1),  // indices 0-6
  ...Array(7).fill(2),  // indices 7-13
  ...Array(6).fill(3),  // indices 14-19
  ...Array(5).fill(4),  // indices 20-24
];

// Map POST_QUIZ question indices → week numbers (same structure as pre)
// W1: 0-6 (7 Qs), W2: 7-13 (7 Qs), W3: 14-19 (6 Qs), W4: 20-24 (5 Qs)
export const POST_QUIZ_WEEK_MAP = [
  ...Array(7).fill(1),  // indices 0-6
  ...Array(7).fill(2),  // indices 7-13
  ...Array(6).fill(3),  // indices 14-19
  ...Array(5).fill(4),  // indices 20-24
];

// Week → topic area mapping for recommendation engine
export const WEEK_TOPIC_MAP = {
  1: { label: "AKI & Foundations", topics: ["AKI", "Post-Renal AKI", "Urinalysis", "CKD"] },
  2: { label: "Electrolytes & Acid-Base", topics: ["Hyponatremia", "Hypernatremia", "Hyperkalemia", "Hypokalemia", "Acid-Base", "Calcium/Phosphorus", "CKD-MBD"] },
  3: { label: "Glomerular Disease & CKD", topics: ["Glomerulonephritis", "Nephrotic Syndrome", "Kidney Biopsy", "CKD", "Anemia of CKD", "Hypertension", "Proteinuria"] },
  4: { label: "Dialysis & Therapeutics", topics: ["Dialysis", "Dialysis Access", "Transplant", "Kidney Stones", "AIN", "Diuretics"] },
};
