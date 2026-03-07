export const QUICK_REFS = [
  {
    id: "fena", icon: "🧪", title: "FENa Calculator", desc: "Pre-renal vs ATN",
    type: "calculator",
    inputs: [
      { key: "uNa", label: "Urine Na (mEq/L)", placeholder: "e.g. 12" },
      { key: "pNa", label: "Plasma Na (mEq/L)", placeholder: "e.g. 140" },
      { key: "uCr", label: "Urine Cr (mg/dL)", placeholder: "e.g. 80" },
      { key: "pCr", label: "Plasma Cr (mg/dL)", placeholder: "e.g. 2.0" },
    ],
    calculate: (v) => {
      const { uNa, pNa, uCr, pCr } = v;
      if (!uNa || !pNa || !uCr || !pCr || pNa === 0 || pCr === 0 || uCr === 0) return null;
      const fena = ((uNa * pCr) / (pNa * uCr)) * 100;
      let interp = "";
      if (fena < 1) interp = "< 1% → Suggests PRE-RENAL AKI (kidneys avidly retaining Na⁺)";
      else if (fena <= 2) interp = "1-2% → Indeterminate (consider clinical context)";
      else interp = "> 2% → Suggests INTRINSIC renal disease (ATN, AIN)";
      return { value: fena.toFixed(2) + "%", interpretation: interp,
        caveat: "⚠️ Unreliable on diuretics — use FEUrea instead. Also unreliable in CKD, contrast nephropathy, myoglobinuria, and early obstruction." };
    },
  },
  {
    id: "feurea", icon: "🔬", title: "FEUrea Calculator", desc: "Use when on diuretics",
    type: "calculator",
    inputs: [
      { key: "uUrea", label: "Urine Urea (mg/dL)", placeholder: "e.g. 400" },
      { key: "pUrea", label: "Plasma BUN (mg/dL)", placeholder: "e.g. 40" },
      { key: "uCr", label: "Urine Cr (mg/dL)", placeholder: "e.g. 80" },
      { key: "pCr", label: "Plasma Cr (mg/dL)", placeholder: "e.g. 2.0" },
    ],
    calculate: (v) => {
      const { uUrea, pUrea, uCr, pCr } = v;
      if (!uUrea || !pUrea || !uCr || !pCr || pUrea === 0 || pCr === 0 || uCr === 0) return null;
      const fe = ((uUrea * pCr) / (pUrea * uCr)) * 100;
      let interp = "";
      if (fe < 35) interp = "< 35% → Suggests PRE-RENAL AKI";
      else if (fe <= 50) interp = "35-50% → Indeterminate";
      else interp = "> 50% → Suggests INTRINSIC renal disease (ATN)";
      return { value: fe.toFixed(1) + "%", interpretation: interp,
        caveat: "✅ Reliable even on diuretics (urea reabsorption is not affected by loop/thiazide diuretics)." };
    },
  },
  {
    id: "acidbase", icon: "⚗️", title: "ABG Interpreter", desc: "Step-by-step acid-base",
    type: "calculator",
    inputs: [
      { key: "ph", label: "pH", placeholder: "e.g. 7.32" },
      { key: "pco2", label: "pCO₂ (mmHg)", placeholder: "e.g. 28" },
      { key: "hco3", label: "HCO₃⁻ (mEq/L)", placeholder: "e.g. 14" },
      { key: "na", label: "Na⁺ (mEq/L, optional for AG)", placeholder: "e.g. 140" },
      { key: "cl", label: "Cl⁻ (mEq/L, optional for AG)", placeholder: "e.g. 105" },
    ],
    calculate: (v) => {
      const { ph, pco2, hco3, na, cl } = v;
      if (!ph || !pco2 || !hco3) return null;
      const steps = [];
      // Step 1: acidemia vs alkalemia
      if (ph < 7.35) steps.push("Step 1: pH " + ph + " → ACIDEMIA");
      else if (ph > 7.45) steps.push("Step 1: pH " + ph + " → ALKALEMIA");
      else steps.push("Step 1: pH " + ph + " → Normal range (7.35-7.45)");
      // Step 2: primary disorder
      let primary = "";
      if (ph < 7.35) {
        if (hco3 < 22) { primary = "Metabolic acidosis (low HCO₃⁻)"; steps.push("Step 2: HCO₃⁻ " + hco3 + " (low) → PRIMARY METABOLIC ACIDOSIS"); }
        else { primary = "Respiratory acidosis (high pCO₂)"; steps.push("Step 2: pCO₂ " + pco2 + " (high) → PRIMARY RESPIRATORY ACIDOSIS"); }
      } else if (ph > 7.45) {
        if (hco3 > 26) { primary = "Metabolic alkalosis (high HCO₃⁻)"; steps.push("Step 2: HCO₃⁻ " + hco3 + " (high) → PRIMARY METABOLIC ALKALOSIS"); }
        else { primary = "Respiratory alkalosis (low pCO₂)"; steps.push("Step 2: pCO₂ " + pco2 + " (low) → PRIMARY RESPIRATORY ALKALOSIS"); }
      }
      // Step 3: compensation
      const comp = [];
      if (primary.includes("Metabolic acidosis")) {
        const exp = 1.5 * hco3 + 8;
        steps.push("Step 3: Winter's formula → Expected pCO₂ = 1.5(" + hco3 + ")+8 = " + exp.toFixed(1) + " ± 2");
        if (Math.abs(pco2 - exp) <= 2) steps.push("  → Actual pCO₂ " + pco2 + " fits → APPROPRIATE compensation");
        else if (pco2 > exp + 2) steps.push("  → Actual pCO₂ " + pco2 + " is HIGHER than expected → Concurrent RESPIRATORY ACIDOSIS");
        else steps.push("  → Actual pCO₂ " + pco2 + " is LOWER than expected → Concurrent RESPIRATORY ALKALOSIS");
      }
      if (primary.includes("Metabolic alkalosis")) {
        const exp = 0.7 * (hco3 - 24) + 40;
        steps.push("Step 3: Expected pCO₂ = 0.7×Δ(HCO₃⁻)+40 = " + exp.toFixed(1) + " ± 2");
        if (Math.abs(pco2 - exp) <= 2) steps.push("  → Appropriate compensation");
        else if (pco2 > exp + 2) steps.push("  → Concurrent RESPIRATORY ACIDOSIS");
        else steps.push("  → Concurrent RESPIRATORY ALKALOSIS");
      }
      // Respiratory compensation
      if (primary.includes("Respiratory acidosis")) {
        const delta = pco2 - 40;
        const acuteHCO3 = 24 + delta * 0.1;
        const chronicHCO3 = 24 + delta * 0.35;
        if (hco3 < acuteHCO3 - 2) comp.push("HCO₃⁻ lower than expected even for acute → possible concurrent metabolic acidosis");
        else if (hco3 <= acuteHCO3 + 2) comp.push(`Acute respiratory acidosis (expected HCO₃⁻ ≈ ${acuteHCO3.toFixed(1)})`);
        else if (hco3 <= chronicHCO3 + 2) comp.push(`Chronic respiratory acidosis (expected HCO₃⁻ ≈ ${chronicHCO3.toFixed(1)})`);
        else comp.push("HCO₃⁻ higher than expected for chronic → possible concurrent metabolic alkalosis");
      }
      if (primary.includes("Respiratory alkalosis")) {
        const delta = 40 - pco2;
        const acuteHCO3 = 24 - delta * 0.2;
        const chronicHCO3 = 24 - delta * 0.5;
        if (hco3 > acuteHCO3 + 2) comp.push("HCO₃⁻ higher than expected even for acute → possible concurrent metabolic alkalosis");
        else if (hco3 >= acuteHCO3 - 2) comp.push(`Acute respiratory alkalosis (expected HCO₃⁻ ≈ ${acuteHCO3.toFixed(1)})`);
        else if (hco3 >= chronicHCO3 - 2) comp.push(`Chronic respiratory alkalosis (expected HCO₃⁻ ≈ ${chronicHCO3.toFixed(1)})`);
        else comp.push("HCO₃⁻ lower than expected for chronic → possible concurrent metabolic acidosis");
      }
      if (comp.length > 0) {
        steps.push("Step 3: Compensation → " + comp.join("; "));
      }
      // Step 4: Anion gap
      if (na && cl) {
        const ag = na - cl - hco3;
        steps.push("Step 4: Anion Gap = " + na + " - " + cl + " - " + hco3 + " = " + ag.toFixed(0));
        if (ag > 12) {
          steps.push("  → ELEVATED AG (>12) → AG metabolic acidosis (MUDPILES)");
          const delta = ag - 12;
          const corrBicarb = hco3 + delta;
          steps.push("Step 5: Delta-delta: ΔAG=" + delta.toFixed(0) + ", corrected HCO₃⁻=" + corrBicarb.toFixed(0));
          if (corrBicarb > 26) steps.push("  → Corrected HCO₃⁻ >26 → Concurrent METABOLIC ALKALOSIS");
          else if (corrBicarb < 22) steps.push("  → Corrected HCO₃⁻ <22 → Concurrent NON-AG METABOLIC ACIDOSIS");
          else steps.push("  → Corrected HCO₃⁻ normal → Pure AG metabolic acidosis");
        } else {
          steps.push("  → Normal AG → Non-AG metabolic acidosis (if acidotic). Think: RTA, diarrhea, NS resuscitation.");
        }
      }
      return { value: primary || "Evaluate clinically", interpretation: steps.join("\n"), caveat: "" };
    },
  },
  {
    id: "fwd", icon: "🌊", title: "Free Water Deficit", desc: "Hypernatremia correction",
    type: "calculator",
    inputs: [
      { key: "weight", label: "Weight (kg)", placeholder: "e.g. 70" },
      { key: "na", label: "Measured Na⁺ (mEq/L)", placeholder: "e.g. 155" },
      { key: "tbwFactor", label: "TBW Factor (see below)", placeholder: "e.g. 0.6" },
    ],
    calculate: (v) => {
      const { weight, na, tbwFactor } = v;
      if (!weight || !na || !tbwFactor || weight <= 0 || na <= 0 || tbwFactor <= 0 || tbwFactor > 1) return null;
      const tbw = weight * tbwFactor;
      const fwd = tbw * (1 - (140 / na));
      let interp = "";
      if (na <= 145) {
        interp = "Na⁺ is within or near normal range — no significant free water deficit.";
      } else if (na <= 150) {
        interp = `Mild hypernatremia. Free water deficit ≈ ${fwd.toFixed(1)} L.\nReplace deficit over 48-72 hours. Aim to lower Na⁺ by ≤10 mEq/L per 24h.`;
      } else if (na <= 160) {
        interp = `Moderate hypernatremia. Free water deficit ≈ ${fwd.toFixed(1)} L.\nReplace over 48-72 hours. Lower Na⁺ ≤10 mEq/L per 24h to avoid cerebral edema.`;
      } else {
        interp = `Severe hypernatremia. Free water deficit ≈ ${fwd.toFixed(1)} L.\nCorrect slowly over 48-72 hours. Rapid correction risks cerebral edema.`;
      }
      interp += `\n\nTBW = ${weight} × ${tbwFactor} = ${tbw.toFixed(1)} L`;
      return {
        value: fwd.toFixed(1) + " L",
        interpretation: interp,
        caveat: "⚠️ TBW factor: 0.6 (young male), 0.5 (young female or elderly male), 0.45 (elderly female). This estimates deficit only — also account for ongoing losses. Check Na⁺ every 4-6h during correction."
      };
    },
  },
  {
    id: "nacorr", icon: "💧", title: "Na⁺ Correction", desc: "Rate limits & formulas",
    type: "reference",
    content: {
      sections: [
        { heading: "Correction Rate Limits",
          items: [
            "Chronic hyponatremia (>48h or unknown): ≤6-8 mEq/L per 24h",
            "High-risk patients (Na <105, alcoholism, malnutrition, hypokalemia): ≤6 mEq/L per 24h",
            "Acute hyponatremia (<48h, known cause): can correct faster but still monitor closely",
            "OVERCORRECTION → Osmotic Demyelination Syndrome (ODS): devastating, often irreversible",
          ]},
        { heading: "Corrected Na⁺ for Hyperglycemia",
          items: [
            "Corrected Na⁺ = Measured Na⁺ + 1.6 × [(Glucose - 100) / 100]",
            "Always correct before interpreting hyponatremia in DKA / HHS",
          ]},
        { heading: "If Overcorrecting",
          items: [
            "Give D5W (free water) to re-lower sodium",
            "Consider DDAVP (desmopressin) 1-2 mcg IV q8h to prevent further water excretion",
            "Recheck Na⁺ every 2-4 hours during active correction",
          ]},
        { heading: "Key Treatment by Volume Status",
          items: [
            "Hypovolemic: Normal saline (volume restores → ADH shuts off)",
            "Euvolemic (SIADH): Fluid restriction ± salt tabs ± tolvaptan",
            "Hypervolemic (CHF/cirrhosis): Fluid + Na restriction, diuretics, treat underlying cause",
          ]},
      ],
    },
  },
  {
    id: "casts", icon: "🔬", title: "Urine Cast Guide", desc: "What each cast means",
    type: "reference",
    content: {
      sections: [
        { heading: "Cellular Casts",
          items: [
            "RBC casts → Glomerulonephritis (pathognomonic — RBCs crossed damaged GBM)",
            "WBC casts → Interstitial nephritis (AIN) or pyelonephritis",
            "Epithelial cell casts → ATN (tubular cell injury/necrosis)",
          ]},
        { heading: "Acellular Casts",
          items: [
            "Muddy brown granular casts → ATN (hallmark finding)",
            "Hyaline casts → Normal / concentrated urine / pre-renal (nonspecific)",
            "Waxy casts → Advanced CKD / chronic tubular stasis",
            "Fatty casts / oval fat bodies → Nephrotic syndrome (lipiduria)",
          ]},
        { heading: "Other Findings",
          items: [
            "Dysmorphic RBCs → Glomerular origin hematuria",
            "Isomorphic RBCs → Lower tract (bladder, urethra, prostate)",
            "Eosinophiluria → AIN (Wright or Hansel stain), cholesterol emboli",
            "Crystals: calcium oxalate (envelope), uric acid (rhomboid/rosette), cystine (hexagonal), struvite (coffin-lid)",
          ]},
      ],
    },
  },
  {
    id: "aeiou", icon: "⚡", title: "AEIOU", desc: "Emergent dialysis indications",
    type: "reference",
    content: {
      sections: [
        { heading: "A — Acidosis",
          items: ["Severe metabolic acidosis (pH <7.1) refractory to bicarbonate therapy"] },
        { heading: "E — Electrolytes",
          items: ["Refractory hyperkalemia (K⁺ >6.5 with ECG changes, not responding to medical Rx)", "Remember: calcium → insulin/glucose → albuterol → kayexalate. If K⁺ still ↑ → dialysis"] },
        { heading: "I — Ingestions",
          items: ["Toxic alcohols: methanol, ethylene glycol (fomepizole first, but dialysis if severe)", "Lithium (level >4, or >2.5 with symptoms)", "Salicylates (severe poisoning with altered mental status)"] },
        { heading: "O — Overload",
          items: ["Volume overload refractory to diuretics (e.g., flash pulmonary edema in anuric patient)"] },
        { heading: "U — Uremia",
          items: ["Uremic pericarditis (friction rub — do NOT give heparin during HD!)", "Uremic encephalopathy (asterixis, confusion, seizures)", "Uremic bleeding (prolonged bleeding time)"] },
      ],
    },
  },
  {
    id: "kprotocol", icon: "🫀", title: "Hyperkalemia Protocol", desc: "Step-by-step K⁺ management",
    type: "reference",
    content: {
      sections: [
        { heading: "Step 1: Confirm (rule out pseudohyperkalemia)",
          items: ["Repeat level if unexpected", "Causes of pseudo-↑K: hemolyzed sample, prolonged tourniquet, high WBC/platelets"] },
        { heading: "Step 2: Get ECG immediately if K⁺ > 6.0",
          items: ["Peaked T-waves → Prolonged PR → Wide QRS → Sine wave → VF/asystole", "ECG changes do NOT correlate perfectly with K⁺ level — treat the patient"] },
        { heading: "Step 3: STABILIZE (if ECG changes present)",
          items: ["IV Calcium gluconate 10% — 10 mL over 2-3 min (stabilizes membrane, does NOT lower K⁺)", "Onset: 1-3 minutes. Can repeat in 5 min if ECG unchanged."] },
        { heading: "Step 4: SHIFT K⁺ intracellularly",
          items: ["Regular insulin 10 units IV + D50 25g (onset 15-30 min, lasts 4-6h)", "Albuterol 10-20 mg nebulized (onset 15-30 min)", "Sodium bicarbonate if concurrent acidosis (less effective alone)"] },
        { heading: "Step 5: REMOVE K⁺ from body",
          items: ["Furosemide (if not anuric) — takes hours", "Sodium zirconium cyclosilicate (Lokelma) or patiromer (Veltassa) — newer K⁺ binders", "Kayexalate (less preferred — slower, GI side effects)", "HEMODIALYSIS — definitive treatment if refractory"] },
      ],
    },
  },
  {
    id: "ckdstages", icon: "📊", title: "CKD Staging", desc: "GFR & Albuminuria categories",
    type: "reference",
    content: {
      sections: [
        { heading: "GFR Categories (G)",
          items: [
            "G1: ≥90 mL/min (normal or high)",
            "G2: 60-89 (mildly decreased)",
            "G3a: 45-59 (mild-moderate ↓) — consider nephrology referral",
            "G3b: 30-44 (moderate-severe ↓)",
            "G4: 15-29 (severely ↓) — prep for RRT",
            "G5: <15 (kidney failure) — dialysis or transplant",
          ]},
        { heading: "Albuminuria Categories (A)",
          items: [
            "A1: <30 mg/g (normal to mildly increased)",
            "A2: 30-300 mg/g (moderately increased, formerly 'microalbuminuria')",
            "A3: >300 mg/g (severely increased, formerly 'macroalbuminuria')",
          ]},
        { heading: "Key Management by Stage",
          items: [
            "All stages: ACEi/ARB if proteinuric, SGLT2i if eGFR ≥20, BP control, lifestyle",
            "G3-G4: Monitor K⁺/bicarb/Ca/PO₄/PTH, adjust drug doses, avoid nephrotoxins",
            "G4-G5: AV fistula planning (6 months ahead), transplant evaluation, PD catheter consideration",
          ]},
      ],
    },
  },
  {
    id: "ivfluids", icon: "💉", title: "IV Fluid Guide", desc: "Composition & when to use",
    type: "reference",
    content: {
      sections: [
        { heading: "Crystalloid Composition",
          items: [
            "Normal Saline (0.9%): Na 154, Cl 154, Osm 308 — isotonic, high chloride",
            "Lactated Ringer's: Na 130, Cl 109, K 4, Ca 3, Lactate 28, Osm 273",
            "PlasmaLyte: Na 140, Cl 98, K 5, Mg 3, Acetate 27, Gluconate 23, Osm 294",
            "Half-NS (0.45%): Na 77, Cl 77, Osm 154 — hypotonic",
            "D5W: Dextrose 50g/L, Osm 252 — free water once glucose metabolized",
            "3% Saline: Na 513, Cl 513, Osm 1026 — hypertonic, for severe symptomatic hyponatremia",
          ]},
        { heading: "When to Use What",
          items: [
            "Volume resuscitation: LR or PlasmaLyte preferred (SMART trial) — NS okay for hyperK⁺",
            "Maintenance fluids: D5-½NS + 20 mEq KCl/L is classic maintenance",
            "Hypovolemic hyponatremia: NS (restores volume → suppresses ADH)",
            "Severe symptomatic hyponatremia: 3% saline 100 mL bolus over 10 min, repeat ×2 if needed",
            "Hypernatremia / free water deficit: D5W or ½NS",
            "DKA: NS initially → switch to ½NS + dextrose as glucose falls",
          ]},
        { heading: "Pearls",
          items: [
            "Excessive NS → hyperchloremic non-AG metabolic acidosis",
            "Avoid LR/PlasmaLyte in hyperkalemia (contain K⁺)",
            "D5W distributes as free water — only 1/12 stays intravascular",
            "1L NS expands plasma volume by ~250 mL (1/4 stays intravascular)",
          ]},
      ],
    },
  },
  {
    id: "nephrotoxins", icon: "☠️", title: "Nephrotoxic Drugs", desc: "Common meds that hurt kidneys",
    type: "reference",
    content: {
      sections: [
        { heading: "Hemodynamic (Pre-Renal Mechanism)",
          items: [
            "ACEi / ARBs → Reduce efferent arteriolar tone → ↓GFR. Risk ↑ with bilateral RAS, volume depletion, or combined with NSAIDs/diuretics. Cr rise <30% is acceptable and expected — hold if rise >30% or hyperkalemia develops.",
            "NSAIDs (ibuprofen, ketorolac, naproxen) → Block prostaglandin-mediated afferent vasodilation → ↓GFR. Can also cause AIN, papillary necrosis, and minimal change disease. Avoid in CKD, CHF, cirrhosis. Even short courses can precipitate AKI.",
            "Calcineurin Inhibitors (tacrolimus, cyclosporine) → Afferent arteriolar vasoconstriction → dose-dependent ↓GFR. Check trough levels; chronic use causes irreversible 'striped' interstitial fibrosis. Most common nephrotoxin in transplant patients.",
          ]},
        { heading: "Tubular Toxicity (ATN)",
          items: [
            "Aminoglycosides (gentamicin, tobramycin) → Direct proximal tubular toxicity, typically non-oliguric AKI. Risk ↑ with duration >5 days, trough >2. Use extended-interval dosing. Monitor troughs + daily Cr.",
            "Vancomycin → ATN (dose-dependent) and possibly AIN. Target AUC/MIC 400-600 (current guidelines). AKI risk ↑ with troughs >20, concurrent piperacillin-tazobactam, and duration >7 days.",
            "Cisplatin → Severe proximal tubular injury + Mg²⁺ wasting. Aggressive pre/post-hydration with NS is mandatory. Can cause permanent GFR loss. Always monitor Mg²⁺.",
            "Amphotericin B (deoxycholate) → Distal tubular injury + renal vasoconstriction → AKI, hypokalemia, hypomagnesemia. Liposomal formulation is much less nephrotoxic. Pre-hydrate with NS.",
          ]},
        { heading: "Interstitial Nephritis (AIN)",
          items: [
            "PPIs (omeprazole, pantoprazole) → AIN, often insidious onset without classic triad. One of the most common causes of drug-induced AIN. Onset weeks to months. Consider stopping in any unexplained AKI or CKD.",
            "Antibiotics (penicillins, cephalosporins, fluoroquinolones, rifampin) → Classic drug-induced AIN. Look for rash + fever + eosinophilia (full triad in only ~10% of cases). Biopsy is gold standard for diagnosis.",
            "TMP-SMX → AIN + blocks tubular Cr secretion (↑Cr without true GFR change). Also causes hyperkalemia by blocking ENaC (like amiloride). Common board question.",
          ]},
        { heading: "Crystal Nephropathy",
          items: [
            "Acyclovir/Valacyclovir → Crystal precipitation in tubules at high IV doses with poor hydration. Prevent: hydrate aggressively, infuse slowly. Birefringent needle-shaped crystals on UA.",
            "Methotrexate → Crystallizes in acidic urine. Prevent: aggressive hydration + urine alkalinization (target pH >7). Monitor levels and Cr closely.",
            "Sulfadiazine → Crystal deposition, especially in volume-depleted patients. Less common now but still seen with toxoplasmosis treatment in HIV/AIDS.",
          ]},
        { heading: "Other Important Nephrotoxins",
          items: [
            "Contrast Agents → Post-contrast AKI, mainly risk when eGFR <30. Hydrate with isotonic crystalloid pre/post. PRESERVE trial proved NAC and bicarb offer no benefit over saline alone.",
            "Lithium → Nephrogenic diabetes insipidus (polyuria, polydipsia) + chronic tubulointerstitial nephritis → CKD over decades. Monitor Cr and Li levels regularly. Amiloride can help NDI.",
            "Metformin → Does NOT cause kidney injury directly, but lactic acidosis risk ↑ when renally accumulated. Hold when eGFR <30 or acutely ill. Safe to continue if eGFR ≥30 and stable (KDIGO 2024).",
            "Tenofovir disoproxil (TDF) → Proximal tubular toxicity (Fanconi syndrome: glucosuria, phosphaturia, proteinuria, acidosis). TAF (alafenamide) form is much less nephrotoxic.",
          ]},
        { heading: "⚠️ The Nephrotoxin Checklist (Use on Every AKI Consult)",
          items: [
            "Systematically review: NSAIDs, ACEi/ARB, diuretics, vancomycin, aminoglycosides, contrast (last 72h), PPIs, TMP-SMX, and any new medications",
            "Triple Whammy: ACEi/ARB + NSAID + Diuretic → synergistic AKI risk. Counsel patients on 'sick day rules' (hold ACEi/ARB and NSAIDs during acute illness, dehydration, or diarrhea)",
            "Always dose-adjust renally cleared medications when GFR drops — consult pharmacy references or UpToDate drug dosing tables",
          ]},
      ],
    },
  },
  {
    id: "sediment", icon: "🔬", title: "Urine Sediment Atlas", desc: "Visual guide to urine microscopy",
    type: "atlas",
    imageLinks: [
      { name: "Renal Fellow — Urine Sediment of the Month", url: "https://www.renalfellow.org/category/urine-sediment/" },
      { name: "UKidney — Urine Microscopy Gallery", url: "https://ukidney.com/nephrology-resources/urine-microscopy" },
      { name: "AJKD — Urinalysis Teaching Cases", url: "https://ajkdblog.org/category/urinalysis/" },
    ],
    content: {
      sections: [
        { heading: "Casts (Formed in Renal Tubules)",
          items: [
            { finding: "RBC Casts",
              appearance: "Red-brown cylindrical casts with embedded intact red blood cells. May appear orange-red under low power.",
              significance: "Pathognomonic for glomerulonephritis — RBCs crossed a damaged GBM and were trapped in Tamm-Horsfall protein within the tubule.",
              associations: "IgA nephropathy, lupus nephritis, ANCA vasculitis, anti-GBM disease, post-infectious GN",
              clinicalPearl: "If you see RBC casts, it IS glomerulonephritis until proven otherwise. Initiate urgent workup: complement levels (C3, C4), ANCA, anti-GBM, ANA/anti-dsDNA, hepatitis B/C panel, SPEP/UPEP." },
            { finding: "WBC Casts",
              appearance: "Cylindrical casts with embedded white blood cells (neutrophils or lymphocytes). May be granular if cells are degenerating.",
              significance: "Indicates intrarenal inflammation — white cells originated within the kidney parenchyma, not the bladder.",
              associations: "Acute interstitial nephritis (drug-induced), pyelonephritis, lupus nephritis, transplant rejection",
              clinicalPearl: "WBC casts + new drug exposure (antibiotics, PPIs, NSAIDs) + rising Cr = think AIN. Consider urine eosinophils, though they are unreliable alone. Biopsy is gold standard." },
            { finding: "Muddy Brown Granular Casts",
              appearance: "Dark brown, coarsely granular casts with a 'dirty' or 'muddy' appearance. Often numerous.",
              significance: "Hallmark of acute tubular necrosis (ATN) — represent necrotic tubular epithelial cells that have sloughed into the lumen.",
              associations: "Ischemic ATN (sepsis, shock, surgery), nephrotoxic ATN (aminoglycosides, contrast, cisplatin)",
              clinicalPearl: "Muddy brown casts + FENa >2% + rising Cr = ATN. The number of casts often correlates with severity. These are the most commonly tested cast on board exams." },
            { finding: "Waxy Casts",
              appearance: "Smooth, homogeneous, waxy-appearing broad casts with sharp edges and cracked margins. Translucent.",
              significance: "Represent 'old' degenerated granular casts — indicate prolonged tubular stasis. Sign of chronicity.",
              associations: "Advanced CKD, chronic tubular disease, any long-standing kidney disease",
              clinicalPearl: "Waxy casts suggest CHRONIC kidney disease, not an acute process. Finding them in a patient with elevated Cr points toward long-standing damage. Broad casts ('renal failure casts') indicate dilated, damaged tubules." },
            { finding: "Hyaline Casts",
              appearance: "Transparent, colorless, cylindrical. Composed of pure Tamm-Horsfall protein. Easy to miss — use low light.",
              significance: "Usually benign — can be seen in normal concentrated urine, dehydration, exercise, and diuretic use.",
              associations: "Normal finding, dehydration, vigorous exercise, diuretic use, pre-renal states",
              clinicalPearl: "Hyaline casts alone do NOT indicate kidney disease. They are the most common cast type. If the only finding on UA, the sediment is essentially 'bland.' Don't over-interpret them." },
            { finding: "Epithelial Cell Casts",
              appearance: "Casts containing renal tubular epithelial cells (larger than WBCs, with visible nuclei).",
              significance: "Indicate tubular injury — cells are sloughing from the tubular lining. An early finding in ATN.",
              associations: "ATN (early), acute rejection in transplant, nephrotoxin exposure",
              clinicalPearl: "Renal tubular epithelial (RTE) cells in casts distinguish ATN from pre-renal AKI. They may appear before muddy brown casts in evolving ATN." },
          ]},
        { heading: "Cells & Bodies",
          items: [
            { finding: "Dysmorphic RBCs",
              appearance: "Irregular, distorted red blood cells with blebs, budding, fragmentation, or 'Mickey Mouse ear' protrusions. Best seen with phase contrast microscopy.",
              significance: "Suggest glomerular origin — cells are damaged as they squeeze through an inflamed or damaged glomerular basement membrane.",
              associations: "Any glomerulonephritis (IgA, lupus, ANCA, anti-GBM, membranoproliferative, etc.)",
              clinicalPearl: "Isomorphic (normal-shaped) RBCs suggest lower urinary tract bleeding (bladder, prostate, stones). Dysmorphic RBCs = glomerular origin. >80% dysmorphic strongly suggests GN. Acanthocytes (ring-shaped with protrusions) are the most specific dysmorphic form." },
            { finding: "Oval Fat Bodies (Maltese Cross)",
              appearance: "Renal tubular cells filled with lipid droplets. Under polarized light, they show a characteristic 'Maltese cross' pattern (bright cross on dark background).",
              significance: "Indicate heavy proteinuria with lipiduria — the kidney is leaking enough protein to allow lipoproteins to cross the GBM.",
              associations: "Nephrotic syndrome (MCD, FSGS, membranous, diabetic nephropathy)",
              clinicalPearl: "Maltese crosses under polarized light are classic for nephrotic syndrome. Combined with heavy proteinuria (>3.5 g/day), hypoalbuminemia, and edema, they confirm the nephrotic picture. A beautiful and high-yield exam finding." },
          ]},
        { heading: "Crystals",
          items: [
            { finding: "Calcium Oxalate (Envelope/Dumbbell)",
              appearance: "Dihydrate: classic bipyramidal 'envelope' shape. Monohydrate: ovoid or dumbbell-shaped.",
              significance: "Most common crystal in kidney stones (~80% of stones are calcium-based). Also seen in ethylene glycol poisoning.",
              associations: "Kidney stones, hyperoxaluria, ethylene glycol ingestion, high-oxalate diet, Crohn's disease (enteric hyperoxaluria)",
              clinicalPearl: "In a patient with HAGMA + calcium oxalate crystals + osmolar gap, think ETHYLENE GLYCOL poisoning — this is an emergency requiring fomepizole and emergent dialysis." },
            { finding: "Uric Acid Crystals (Rhomboid/Rosette)",
              appearance: "Pleomorphic: rhomboid, rosette, or barrel shapes. Yellow-brown in color. Form in acidic urine (pH <5.5).",
              significance: "Seen in gout, tumor lysis syndrome, highly concentrated acidic urine, and uric acid stones.",
              associations: "Gout/hyperuricemia, tumor lysis syndrome, uric acid nephrolithiasis, chronic diarrhea (acidic urine)",
              clinicalPearl: "Uric acid stones are RADIOLUCENT on X-ray (invisible on KUB). Need CT for diagnosis. Treatment: alkalinize urine with potassium citrate (target pH 6.5-7.0), which can dissolve existing stones — the only dissolvable stone type." },
            { finding: "Triple Phosphate / Struvite (Coffin Lid)",
              appearance: "Large rectangular prisms with beveled edges — classic 'coffin lid' shape. Form in alkaline urine (pH >7).",
              significance: "Pathognomonic for urease-producing bacterial infection (Proteus, Klebsiella, Pseudomonas). Can form large staghorn calculi.",
              associations: "UTI with urease-producing organisms, staghorn kidney stones, chronic UTI, neurogenic bladder",
              clinicalPearl: "Struvite stones = INFECTION stones. They cannot form without urease-producing bacteria. Treatment requires both antibiotics AND stone removal (PCNL). Medical dissolution alone is insufficient." },
            { finding: "Cystine Crystals (Hexagonal)",
              appearance: "Flat, colorless hexagonal plates — look like benzene rings or stop signs. Pathognomonic shape.",
              significance: "Diagnostic of cystinuria — autosomal recessive defect in tubular reabsorption of cystine and dibasic amino acids.",
              associations: "Cystinuria (genetic), recurrent cystine kidney stones (often starting in childhood/adolescence)",
              clinicalPearl: "Hexagonal crystals = cystinuria, always. These patients need lifelong prevention: high fluid intake (>3L/day), urine alkalinization (target pH >7), and sometimes tiopronin or D-penicillamine to increase cystine solubility." },
          ]},
      ],
    },
  },
];


export const GUIDE_SECTIONS = [
  { id: "firstday", icon: "🌅", title: "First Day Orientation", sub: "What to do and set up on day 1" },
  { id: "consults", icon: "📋", title: "New Consult H&P", sub: "What to ask & gather by consult reason" },
  { id: "followups", icon: "🔄", title: "Inpatient Follow-ups", sub: "Daily rounding on existing consults" },
  { id: "office", icon: "🏢", title: "Office Visit Guide", sub: "Outpatient referrals by reason" },
  { id: "dialysis_inpt", icon: "🏥", title: "Dialysis Patient in Hospital", sub: "Key questions & coordination" },
  { id: "access", icon: "🩺", title: "Dialysis Access Assessment", sub: "How to examine AVF, AVG, & catheters" },
  { id: "presenting", icon: "🎤", title: "Presenting to Your Attending", sub: "How to give a sharp consult presentation" },
  { id: "notes", icon: "✍️", title: "Writing Consult & Progress Notes", sub: "Templates and tips" },
  { id: "career", icon: "🩻", title: "Life of a Nephrologist", sub: "What a career in nephrology actually looks like" },
  { id: "templates", icon: "📝", title: "Presentation Templates", sub: "Structured formats for consults, follow-ups & dialysis" },
];

export const GUIDE_DATA = {
  firstday: {
    intro: "Your first day on nephrology can feel overwhelming. Here's what to set up and learn so you're ready to contribute from day one. Do as much of this as possible before or on your first morning.",
    categories: [
      {
        title: "Before You Start (or Morning of Day 1)",
        emoji: "📋",
        color: "#2980B9",
        items: [
          "Get your attending's cell number and preferred contact method (text, page, call)",
          "Ask: What time do we round? Where do we meet?",
          "Get access to the EMR (Epic, Cerner, etc.) — make sure it works!",
          "Set up your patient list template in the EMR",
          "Find out how consults come in: pager, Epic InBasket, text, phone call?",
          "Locate the inpatient dialysis unit — introduce yourself to the charge nurse",
          "Find the nearest supply room for UA cups and urine dipsticks",
          "Download MDCalc app on your phone — you'll use it daily",
          "Bookmark this app on your phone's home screen for quick reference",
          "Bring a small notebook and a pen that works — you'll take a lot of notes at the bedside",
        ],
      },
      {
        title: "Your Daily Routine Template",
        emoji: "⏰",
        color: "#16A085",
        items: [
          "Pre-round (before attending arrives): Look up labs, I&Os, vitals, overnight events for every patient",
          "Know the Cr, K⁺, Na⁺, bicarb, and UOP for EVERY patient — these are the numbers that matter",
          "Check if any new consults came in overnight",
          "Write or update your progress notes before rounds",
          "Round with attending: present patients, examine together, discuss plan",
          "After rounds: place orders, call primary teams with recommendations, update notes",
          "Afternoon: see new consults, do histories and physicals, look at urinalyses",
          "End of day: brief attending on new consults, update patient list for tomorrow",
          "Study: review one topic related to a patient you saw today",
        ],
      },
      {
        title: "What Your Attending Expects",
        emoji: "🎯",
        color: "#E67E22",
        items: [
          "Know YOUR patients — labs, trends, meds, overnight events, the current plan",
          "Be prepared: have your presentation organized before rounds",
          "Show initiative: look things up, read about your patients' conditions",
          "Ask questions — but try to look things up first, then ask informed questions",
          "Be honest when you don't know something — then go find out",
          "Follow up: if your attending teaches you something, bring it up with the next relevant case",
          "Be present: put your phone away during patient encounters",
          "Be kind to patients, nurses, and consulting teams",
          "Offer to do things: 'I can spin that urine' or 'I'll call the primary team'",
        ],
      },
      {
        title: "Key Things to Learn in Week 1",
        emoji: "📚",
        color: "#8E44AD",
        items: [
          "How to take a nephrology-focused history (different from a general H&P)",
          "How to assess volume status at the bedside (JVP, edema, skin turgor, mucous membranes)",
          "How to read a urinalysis and understand the microscopy",
          "How to calculate FENa (this app has a calculator!)",
          "The KDIGO AKI staging criteria (know them by memory)",
          "How to examine a dialysis access (thrill, bruit, look-feel-listen)",
          "Where to find urine lytes, UA, and urine microscopy in YOUR EMR",
          "How to write a basic nephrology consult note",
          "The difference between pre-renal, intrinsic, and post-renal AKI",
        ],
      },
    ],
  },
  consults: {
    intro: "When you get a new nephrology consult, the questions you ask depend on WHY you were consulted. Here's what to gather for the most common consult reasons. For ALL consults, always get: the consult question, relevant PMH, current meds (especially nephrotoxins), baseline Cr, and a fresh urinalysis with microscopy.",
    categories: [
      {
        title: "AKI / Rising Creatinine",
        emoji: "🔺",
        color: "#E74C3C",
        items: [
          "What is the baseline Cr? When did it start rising?",
          "Volume status: I&Os, daily weights, BP trends, any hypotension episodes?",
          "Recent contrast, antibiotics (vanc, pip-tazo, aminoglycosides), NSAIDs, ACEi/ARBs?",
          "Any recent procedures or surgeries?",
          "Foley output — oliguric (<400 mL/day)?",
          "Urinalysis with microscopy — ask the nurse to spin it fresh if possible",
          "Urine electrolytes: Na, Cr, urea (to calculate FENa / FEUrea)",
          "Any rash, eosinophilia, new meds → think AIN",
          "Any hematuria, proteinuria, low complement → think GN",
          "Renal ultrasound — hydronephrosis? Kidney size? Echogenicity?",
          "Review the med list for ALL nephrotoxins and dose-adjust renally cleared meds",
        ],
      },
      {
        title: "Hyperkalemia",
        emoji: "⬆️",
        color: "#E67E22",
        items: [
          "K⁺ level and was it hemolyzed? Repeat if uncertain",
          "ECG done? Peaked T-waves, widened QRS, sine wave?",
          "Medications: ACEi/ARB, K-sparing diuretics, TMP-SMX, heparin, NSAIDs, beta-blockers?",
          "Diet: bananas, oranges, potatoes, salt substitutes, protein shakes?",
          "Kidney function — AKI or CKD? Current GFR?",
          "Urine output — oliguric?",
          "Any tissue breakdown: rhabdo, tumor lysis, hemolysis, GI bleed?",
          "Acidosis? (K⁺ shifts out of cells with acidemia)",
          "Insulin/dextrose given? Calcium gluconate? Kayexalate? Patiromer?",
          "Does patient need emergent dialysis?",
        ],
      },
      {
        title: "Hyponatremia",
        emoji: "💧",
        color: "#2980B9",
        items: [
          "Na⁺ level and how fast it dropped — acute (<48h) vs chronic?",
          "Symptoms: headache, nausea, confusion, seizures? (if severe → 3% saline)",
          "Volume status exam: JVP, skin turgor, mucous membranes, edema, orthostatics",
          "Serum osmolality — is this truly hypotonic?",
          "Urine Na and urine osmolality (the two most important labs!)",
          "UNa >30 + Uosm >100 → SIADH vs CSW vs adrenal insufficiency",
          "UNa <20 + volume down → true volume depletion",
          "Edematous (CHF, cirrhosis, nephrotic) → dilutional",
          "Medications: thiazides (#1 cause!), SSRIs, carbamazepine, desmopressin?",
          "Thyroid and cortisol levels checked?",
          "What IV fluids are running? (D5W and hypotonic fluids worsen it)",
          "Rate of correction — MUST NOT exceed 8 mEq/L in 24 hours",
        ],
      },
      {
        title: "Metabolic Acidosis",
        emoji: "⚗️",
        color: "#16A085",
        items: [
          "ABG or VBG — pH, pCO₂, HCO₃?",
          "Anion gap = Na – (Cl + HCO₃): elevated or normal (non-gap)?",
          "If elevated AG: MUDPILES — Methanol, Uremia, DKA, Propylene glycol, INH/Iron, Lactic acid, Ethylene glycol, Salicylates",
          "Lactate level?",
          "Serum ketones / beta-hydroxybutyrate?",
          "Osmolar gap if suspecting toxic ingestion (>10 is abnormal)",
          "If non-gap acidosis: urine AG (positive = renal cause, negative = GI loss)",
          "Delta-delta ratio: (AG-12)/(24-HCO₃) — mixed disorder?",
          "Is respiratory compensation appropriate? Winter's formula: expected pCO₂ = 1.5(HCO₃) + 8 ± 2",
          "Any GI losses — diarrhea, ostomy, fistula?",
          "RTA workup: urine pH, urine AG, serum K⁺",
        ],
      },
      {
        title: "Hematuria / Proteinuria / GN Workup",
        emoji: "🔬",
        color: "#8E44AD",
        items: [
          "Urinalysis: RBCs, RBC casts (= glomerular), protein, WBCs?",
          "Is hematuria glomerular (dysmorphic RBCs, casts) or non-glomerular (urologic)?",
          "Proteinuria: spot urine protein/Cr ratio (or albumin/Cr ratio)",
          "Quantify: <150 mg/day normal, >3.5 g/day = nephrotic range",
          "Serum albumin — low suggests nephrotic syndrome",
          "GN serologies to order: C3/C4 complement, ANA, anti-dsDNA, ANCA (MPO, PR3), anti-GBM, hepatitis B/C panel, HIV, SPEP/UPEP/free light chains, cryoglobulins",
          "ASO / anti-DNase B titers if post-infectious GN suspected",
          "Review skin for purpura, rash (vasculitis), edema (nephrotic)",
          "Lung involvement? (Pulmonary-renal syndrome → think ANCA, anti-GBM)",
          "Is biopsy indicated? Discuss with attending",
          "Any family history of kidney disease? (Alport, PCKD)",
        ],
      },
      {
        title: "CKD Consult / Elevated Creatinine (Chronic)",
        emoji: "📉",
        color: "#7D3C98",
        items: [
          "Baseline Cr trend — has it been stable? Slowly rising?",
          "Etiology: DM? HTN? GN? PCKD? Unknown?",
          "Current GFR and CKD stage?",
          "Proteinuria: UACR or UPCR?",
          "On ACEi/ARB? On SGLT2 inhibitor? (standard of care if proteinuric CKD)",
          "BP control: target <130/80 (or <120 systolic per SPRINT)?",
          "A1c if diabetic — target <7%?",
          "Review meds for nephrotoxins and dose adjustments",
          "CKD labs: calcium, phosphorus, PTH, vitamin D, CBC (anemia of CKD?)",
          "Is the patient approaching ESRD? (GFR <20 → begin access/transplant discussion)",
          "Renal ultrasound — kidney size? (small kidneys = chronic changes)",
          "Dietary counseling: sodium, potassium, phosphorus restriction?",
        ],
      },
      {
        title: "Volume / Electrolyte Management",
        emoji: "💉",
        color: "#2C3E50",
        items: [
          "What specific electrolyte is abnormal? Na, K, Ca, Mg, Phos?",
          "For ANY electrolyte: always check Mg (low Mg makes K and Ca refractory)",
          "Volume status: daily weights trending? I&Os matching? BP stable?",
          "What IV fluids are running? Rate?",
          "Dietary intake: PO vs NPO vs tube feeds?",
          "GI losses: vomiting, NG suction, diarrhea?",
          "Urine output: adequate (>0.5 mL/kg/hr)?",
          "Any third-spacing: ascites, effusions?",
          "Current diuretic regimen — is it working?",
          "Acid-base status affects electrolyte levels (pH matters!)",
        ],
      },
    ],
  },

  followups: {
    intro: "When following a patient you've already seen, focus on interval changes. Your follow-up note should be brief and targeted. Here's what to gather each day:",
    categories: [
      {
        title: "Daily Follow-up Checklist",
        emoji: "📝",
        color: "#2980B9",
        items: [
          "Overnight events: any hypotension, fever, code, intubation?",
          "Vitals trend: BP, HR, temperature, O₂ requirement",
          "I&Os from the last 24 hours — net positive or negative?",
          "Daily weight — trending which direction?",
          "Urine output: total and trend (improving? worsening?)",
          "New labs: Cr, K, Na, HCO₃, Ca, Phos, Mg, CBC",
          "Compare to yesterday: is the Cr rising, stable, or improving?",
          "Any med changes overnight? New nephrotoxins?",
          "IV fluid rate — does it need adjusting?",
          "Check: are we answering the original consult question?",
          "Does the plan need to change based on the trajectory?",
        ],
      },
      {
        title: "AKI Follow-up Specifically",
        emoji: "🔺",
        color: "#E74C3C",
        items: [
          "Cr today vs yesterday vs baseline — trajectory?",
          "Urine output trend — improving or oliguric?",
          "Volume status reassessment — too dry or overloaded?",
          "Any new labs: urinalysis, urine lytes, imaging?",
          "Nephrotoxins removed? Doses adjusted?",
          "Do we need to discuss dialysis? (AEIOU indications)",
          "Is the patient ready for diuretic challenge?",
          "Diet order: is it renal appropriate?",
        ],
      },
      {
        title: "Electrolyte Follow-up",
        emoji: "⚡",
        color: "#E67E22",
        items: [
          "Repeat level: is it trending toward goal?",
          "Rate of correction appropriate? (especially Na⁺ — track q6h)",
          "Repletion given? Dose and route?",
          "Was Mg checked and repleted?",
          "Ongoing losses identified and addressed?",
          "ECG repeated if K⁺ was critical?",
          "When to recheck: typically q6–12h for acute issues",
        ],
      },
      {
        title: "Dialysis Patient Follow-up",
        emoji: "🔄",
        color: "#163B50",
        items: [
          "Did dialysis happen yesterday? Any issues?",
          "Post-dialysis weight — at dry weight?",
          "Pre/post BUN, K⁺, bicarb?",
          "Access functioning? Any alarms during treatment?",
          "Fluid balance: how much removed? Still overloaded?",
          "Next session scheduled? Any orders needed?",
          "Medications held for dialysis (e.g., BP meds)?",
        ],
      },
    ],
  },

  office: {
    intro: "Outpatient nephrology visits have a different tempo than inpatient consults. You have more time to take a thorough history. Here's what to cover based on the referral reason:",
    categories: [
      {
        title: "CKD / Elevated Creatinine Referral",
        emoji: "📉",
        color: "#7D3C98",
        items: [
          "When was the elevated Cr first noticed? By whom?",
          "Any prior Cr values — is this acute, subacute, or chronic?",
          "Family history: CKD, PCKD, dialysis, transplant?",
          "PMH: diabetes, HTN, heart failure, liver disease, autoimmune?",
          "Medications: full list including OTC, supplements, herbals, NSAIDs",
          "Urinalysis and UACR — has proteinuria been quantified?",
          "Renal ultrasound done? Kidney size and appearance?",
          "Current BP meds — on ACEi/ARB? SGLT2i?",
          "Diet and lifestyle: sodium intake, exercise, smoking?",
          "Review CKD labs: Ca, Phos, PTH, vitamin D, CBC, iron studies",
          "If GFR <20: introduce concept of RRT planning (early is better!)",
          "Vaccinations: Hep B status (important before dialysis/transplant)",
        ],
      },
      {
        title: "Proteinuria / Hematuria Referral",
        emoji: "🔬",
        color: "#8E44AD",
        items: [
          "How was it found? Incidental on UA or symptomatic?",
          "Quantify proteinuria: UACR or UPCR, 24-hour collection?",
          "Hematuria: gross or microscopic? Duration? Painful?",
          "Urologic workup done? (CT, cystoscopy — especially if >40 with gross hematuria)",
          "If glomerular pattern: order serologies (ANA, ANCA, C3/C4, anti-GBM, Hep B/C, HIV, SPEP/UPEP)",
          "Family history: hematuria (Alport, thin basement membrane)?",
          "Review UA sediment: dysmorphic RBCs, casts?",
          "Edema, hypertension, frothy urine?",
          "Is biopsy indicated? Discuss criteria with attending",
          "Start ACEi/ARB if proteinuric (antiproteinuric therapy)",
        ],
      },
      {
        title: "Hypertension Referral",
        emoji: "🫀",
        color: "#C0392B",
        items: [
          "Current BP meds: names, doses, adherence?",
          "Home BP log — are they checking regularly?",
          "White coat effect? Consider ambulatory BP monitoring",
          "Secondary causes screen: age of onset, severity, resistant HTN",
          "Renal artery stenosis: bruit on exam? CKD + flash pulm edema?",
          "Primary aldosteronism: low K⁺ + HTN? Check aldosterone/renin ratio",
          "Pheochromocytoma: episodic symptoms? 24h urine catecholamines",
          "OSA: daytime somnolence, snoring, neck circumference?",
          "Lifestyle: sodium intake, alcohol, exercise, weight?",
          "End-organ damage: LVH on echo? Retinopathy? Proteinuria?",
          "Target: <130/80 for most, <120 systolic per SPRINT if tolerated",
        ],
      },
      {
        title: "Kidney Stones Referral",
        emoji: "🪨",
        color: "#D4AC0D",
        items: [
          "Stone history: how many episodes? First stone age?",
          "Stone analysis: has a stone ever been caught and analyzed?",
          "Family history of stones?",
          "24-hour urine collection done? (gold standard for metabolic workup)",
          "Dietary history: fluid intake, sodium, protein, calcium, oxalate?",
          "Medications: thiazides, potassium citrate, allopurinol?",
          "Imaging: last CT KUB? Current stone burden?",
          "Recurrence risk factors: low volume, high sodium, high oxalate",
          "Urology involvement for large or obstructing stones?",
          "Gout history? (uric acid stones)",
          "Diet counseling: increase fluids to >2.5L/day, limit sodium, moderate protein",
        ],
      },
      {
        title: "Electrolyte Disorder Referral",
        emoji: "⚡",
        color: "#E67E22",
        items: [
          "Which electrolyte? How long has it been abnormal?",
          "Severity: has it ever been critically abnormal?",
          "Hospitalizations for this? ER visits?",
          "Medications that affect the electrolyte?",
          "Dietary contributors?",
          "GI losses: chronic diarrhea, ostomy?",
          "Kidney function: CKD contributing?",
          "Previous workup: urine studies, hormone levels?",
          "Current supplements or replacements?",
          "Is there a genetic condition? (Gitelman, Bartter, Liddle, etc.)",
        ],
      },
      {
        title: "Pre-Dialysis / ESRD Planning",
        emoji: "🩺",
        color: "#163B50",
        items: [
          "Current GFR and trajectory — when might they need RRT?",
          "Has RRT been discussed? Patient's understanding and goals?",
          "Modality preference: in-center HD, home HD, PD, transplant?",
          "Transplant evaluation: referred? Living donor options?",
          "Access planning: fistula referral if HD likely (6+ months lead time!)",
          "Hep B vaccination status (must complete before dialysis)",
          "Social support: transportation, caregiver, financial resources?",
          "Advance directives: does the patient want dialysis?",
          "Conservative management discussed if appropriate (elderly, comorbid)?",
          "Dietary education: K⁺, phos, fluid restriction counseling",
          "Nephrology social worker referral?",
        ],
      },
    ],
  },

  dialysis_inpt: {
    intro: "Dialysis patients admitted to the hospital need special attention. They have unique physiology and coordination needs. Here's your checklist:",
    categories: [
      {
        title: "Key Questions on Admission",
        emoji: "🏥",
        color: "#E74C3C",
        items: [
          "What type of dialysis? HD (in-center or home) vs PD?",
          "Home dialysis unit: name and phone number?",
          "Nephrologist outpatient: name and contact?",
          "Dialysis schedule: what days/times? (e.g., MWF, TThS)",
          "When was the last treatment? Did they miss any sessions?",
          "Dry weight — what is it? Current weight?",
          "Residual urine output — any, or truly anuric?",
          "Access type: AVF, AVG, or catheter? Location?",
          "Is the access working? When was it last used?",
          "What is their typical K⁺ bath? Typical UF goal?",
          "Reason for admission: is it dialysis-related?",
          "Medications: which are held on dialysis days? (BP meds, etc.)",
        ],
      },
      {
        title: "Daily Management Priorities",
        emoji: "📋",
        color: "#2980B9",
        items: [
          "Order dialysis for today? (coordinate with inpatient HD unit EARLY)",
          "Pre-dialysis labs: BMP, CBC, phosphorus",
          "K⁺ level — what bath do they need? (1K, 2K, 3K)",
          "Volume status: how much to remove? (current weight – dry weight)",
          "BP medications: hold morning of dialysis to prevent intradialytic hypotension",
          "Anticoagulation: are they on heparin for the circuit? Any contraindication?",
          "Drug dosing: many meds are dialyzed out — check timing (give AFTER HD)",
          "Access: protect the access arm — NO blood draws, NO BP cuff, NO IVs in that arm!",
          "Diet order: renal diet (low K⁺, low phos, fluid restricted)",
          "If PD patient: can they do PD in hospital? Or switch to HD temporarily?",
        ],
      },
      {
        title: "Medications in Dialysis Patients",
        emoji: "💊",
        color: "#16A085",
        items: [
          "Give AFTER dialysis: vancomycin, many antibiotics, antiepileptics",
          "Hold before dialysis: antihypertensives (prevent intradialytic hypotension)",
          "Avoid: NSAIDs (even more dangerous), gadolinium (NSF risk if on HD)",
          "Phosphorus binders: continue with meals (calcium acetate, sevelamer, etc.)",
          "EPO/darbepoetin: being given at dialysis unit — don't duplicate",
          "Calcimimetics (cinacalcet): continue for secondary hyperparathyroidism",
          "Iron: usually IV at dialysis — don't give oral iron that interferes with binders",
          "Review EVERY medication for renal dosing",
        ],
      },
      {
        title: "When to Call Nephrology Urgently",
        emoji: "🚨",
        color: "#C0392B",
        items: [
          "Access dysfunction: not getting flow, clotted, signs of infection",
          "K⁺ > 6.5 or ECG changes (may need emergent dialysis)",
          "Severe volume overload with respiratory distress",
          "Altered mental status (uremic encephalopathy?)",
          "Pericardial effusion / pericarditis (uremic pericarditis)",
          "Uncontrolled bleeding (uremic platelet dysfunction)",
          "PD catheter complications: peritonitis (cloudy effluent!), leakage",
          "Missed ≥2 dialysis sessions with symptoms",
        ],
      },
    ],
  },

  access: {
    intro: "Examining dialysis access is a core nephrology skill. You should assess every dialysis patient's access on every encounter. Here's how:",
    categories: [
      {
        title: "AV Fistula (AVF) Exam",
        emoji: "💪",
        color: "#2980B9",
        items: [
          "LOOK: visible pulsation? Aneurysms? Skin changes? Needle site scabbing?",
          "FEEL the thrill — a continuous, soft buzzing vibration over the anastomosis",
          "A thrill should feel like a purring cat — continuous and soft",
          "LISTEN with stethoscope: low-pitched continuous bruit",
          "⚠ High-pitched bruit or loss of thrill = stenosis! Report immediately",
          "⚠ No thrill at all = possible thrombosis — this is an emergency",
          "Check for steal syndrome: is the hand distal to the fistula cool, painful, or pale?",
          "Check augmentation: occlude fistula above, feel it distend below — good outflow?",
          "Arm elevation test: elevate arm — fistula should collapse (if not → outflow stenosis)",
          "Note the maturation: is the vein >6mm diameter, <6mm depth, and >6cm usable length? (Rule of 6's)",
          "Document: type (radiocephalic, brachiocephalic, etc.), arm, thrill quality, bruit quality",
        ],
      },
      {
        title: "AV Graft (AVG) Exam",
        emoji: "🔗",
        color: "#E67E22",
        items: [
          "LOOK: location (usually forearm loop or upper arm straight), any swelling, redness?",
          "FEEL: thrill present? (should feel similar to AVF but may be less prominent)",
          "LISTEN: continuous bruit throughout the graft",
          "⚠ Pulsatile graft without thrill = outflow stenosis",
          "⚠ No pulse or thrill = thrombosed → urgent referral",
          "Check for pseudoaneurysm at needle sites — soft, compressible?",
          "Check for perigraft fluid or tenderness (infection?)",
          "Compare both arms: swelling of the access arm → central stenosis",
          "Grafts have higher infection and clotting rates than fistulae",
        ],
      },
      {
        title: "Tunneled Dialysis Catheter",
        emoji: "🔴",
        color: "#E74C3C",
        items: [
          "Location: usually right IJ (preferred), left IJ, or femoral",
          "Exit site exam: any redness, warmth, tenderness, drainage, crusting?",
          "Tunnel: palpate along the tunnel tract — any tenderness or swelling?",
          "Is the cuff visible or extruding? (should be subcutaneous, ~2cm from exit)",
          "⚠ Purulent drainage, erythema, or fever → catheter-related bloodstream infection",
          "Check catheter function: does it draw well? Any alarms during HD?",
          "Catheter lock: usually heparin or alteplase — check that it's locked after use",
          "Catheters are temporary! — always ask about fistula or graft plan",
          "Document: type (tunneled/non-tunneled), location, exit site appearance",
        ],
      },
      {
        title: "Critical Rules for All Access Types",
        emoji: "🚫",
        color: "#1C2833",
        items: [
          "NEVER use the access arm for blood pressure",
          "NEVER draw blood from the access (unless specifically ordered for access recirculation study)",
          "NEVER place an IV in the access arm",
          "NEVER apply a tourniquet to the access arm",
          "Always ask the patient which arm has the access before any procedure",
          "If a patient has a catheter, avoid placing IVs in the subclavian on the same side",
          "Protect future access: avoid PICC lines in CKD stage 4-5 patients",
          "Post-surgical: check for pulse/thrill after any OR trip (positioning can compress)",
        ],
      },
    ],
  },

  presenting: {
    intro: "Your attending is busy. A great presentation is organized, concise, and shows you understand the clinical reasoning. Here's the structure that works:",
    categories: [
      {
        title: "Consult Presentation Framework",
        emoji: "🎯",
        color: "#2980B9",
        items: [
          "Lead with the consult question: 'We were consulted for...'",
          "One-liner: '[Age] [sex] with [key PMH] admitted for [reason] found to have [nephrology problem]'",
          "Brief relevant HPI: what happened and when? Key timeline only",
          "Relevant PMH: kidney-relevant only (CKD, DM, HTN, transplant)",
          "Medications: focus on nephrotoxins, ACEi/ARB, diuretics, immunosuppressants",
          "Key vitals: BP, UOP, weight trend",
          "Key labs: Cr (baseline → now), BMP, UA, urine studies",
          "Your assessment: 'I think this is [diagnosis] because [reasoning]'",
          "Your plan: 'I'd suggest [1-3 concrete recommendations]'",
          "END with the question: 'Does that make sense, or would you approach it differently?'",
        ],
      },
      {
        title: "Common Presentation Pitfalls",
        emoji: "⚠️",
        color: "#E74C3C",
        items: [
          "Don't recite every lab — only the relevant ones",
          "Don't read the entire PMH — focus on kidney-relevant history",
          "Don't just list facts — show your THINKING and differential",
          "Don't be afraid to say 'I'm not sure' — then offer what you'd do next",
          "Don't bury the lead — state the problem early",
          "Don't forget to examine the patient before presenting!",
          "Don't present the UA without actually looking at the sediment yourself",
          "The attending wants to hear YOUR assessment, not just a data dump",
        ],
      },
      {
        title: "Daily Follow-up Presentation (30 seconds)",
        emoji: "⏱",
        color: "#16A085",
        items: [
          "'Mr. X is day [#] of our consult for [reason]'",
          "'Overnight: [any events or stable]'",
          "'Cr today [value] from [yesterday] from baseline [baseline]' — trending [up/down/stable]",
          "'UOP [volume], I&Os [net], weight [trending]'",
          "'Key electrolytes: [only abnormal ones]'",
          "'Plan: [1-2 specific changes or continue current plan]'",
          "That's it! Follow-ups should be BRIEF — under 60 seconds",
          "Save detail for patients who are actively changing or complicated",
        ],
      },
      {
        title: "Attending Interaction Tips",
        emoji: "💡",
        color: "#E67E22",
        items: [
          "Write down your presentation bullets BEFORE calling or rounding",
          "Know the numbers cold — Cr trend, K⁺, Na⁺, UOP",
          "Have the UA in front of you (print it or screenshot it)",
          "If the attending asks something you don't know: 'I'll check and get back to you'",
          "Ask teaching questions: 'Why did you choose X over Y?'",
          "Take notes during rounds — you'll forget otherwise",
          "Show initiative: 'I looked up the guidelines and...'",
          "Own the patient — know them better than anyone",
        ],
      },
    ],
  },

  notes: {
    intro: "Your notes should be clear, organized, and help the next reader understand the kidney problem and plan. Here's the nephrology-specific note structure:",
    categories: [
      {
        title: "New Consult Note Template",
        emoji: "📄",
        color: "#2980B9",
        items: [
          "CONSULT REASON: 'Nephrology consulted for [specific question]'",
          "HPI: Focused on the kidney problem — timeline, events, relevant context",
          "KIDNEY-RELEVANT PMH: CKD (baseline Cr, etiology), DM, HTN, transplant, stones, dialysis history",
          "MEDICATIONS: Full list, HIGHLIGHT nephrotoxins and renal-dosed meds",
          "ALLERGIES: Important for contrast and antibiotics",
          "EXAM: Vitals (especially BP, weight), volume status, edema, access exam if dialysis",
          "LABS: Present in a logical order — BMP, then UA, then urine studies, then serologies",
          "IMAGING: Renal ultrasound findings, CT if relevant",
          "ASSESSMENT: State the diagnosis or differential clearly. Show reasoning",
          "PLAN: Numbered list, specific and actionable. Include follow-up labs, meds to start/stop/adjust, and contingency plans",
          "ATTESTATION: 'Discussed with Dr. [attending]. Patient examined. Agree with plan.'",
        ],
      },
      {
        title: "Daily Progress Note Template",
        emoji: "📝",
        color: "#16A085",
        items: [
          "SUBJECTIVE: Brief — overnight events, patient symptoms, any complaints",
          "OBJECTIVE: Vitals, I&Os (last 24h), daily weight, UOP",
          "LABS: Today's BMP, compare Cr to yesterday and baseline",
          "UA / Urine studies: if new results",
          "DIALYSIS: If applicable — date, UF removed, bath, complications",
          "ASSESSMENT/PLAN: Problem-based, concise",
          "Example: 'AKI — Cr 2.8 from 3.2 yesterday (baseline 1.0), trending down. Likely ATN from sepsis. UOP improving to 60 mL/hr. Continue gentle IVF, hold nephrotoxins, recheck Cr AM.'",
          "Address each active nephrology problem separately",
          "Include concrete recommendations: specific lab timing, med changes, when to escalate",
        ],
      },
      {
        title: "Note Writing Best Practices",
        emoji: "✅",
        color: "#E67E22",
        items: [
          "Lead with the consult question — the reader should know why you're involved in one sentence",
          "Always include the baseline Cr — this is the #1 missing piece in bad consult notes",
          "Cr trend: present as 'Cr 2.3 (baseline 1.1, peak 3.8)' — three numbers tell the whole story",
          "Be specific in your plan: 'Start desmopressin 2 mcg IV' NOT 'consider desmopressin'",
          "Use 'recommend' language — you're a consultant, not the primary team",
          "Include indications for dialysis if AKI is severe, even if not needed yet",
          "Document volume status with exam findings, not just 'euvolemic'",
          "List meds you want stopped by name: 'Recommend stopping vancomycin and NSAIDs'",
          "Include follow-up plan: 'Will follow daily, recheck BMP in AM'",
          "Sign-off: 'Thank you for this interesting consult. Please call with questions.'",
        ],
      },
      {
        title: "Common Note Mistakes",
        emoji: "🚫",
        color: "#E74C3C",
        items: [
          "Copying forward yesterday's note without updating — always update daily!",
          "Forgetting the baseline Cr — EVERY nephrology note needs this",
          "Writing 'AKI — monitor' as a plan — what exactly are you monitoring?",
          "Not documenting urine output or I&Os",
          "Not mentioning which nephrotoxins you want held",
          "Using vague language: 'may consider' instead of a clear recommendation",
          "Not dating your lab values — 'Cr 2.1' means nothing without 'Cr 2.1 today (2.5 yesterday)'",
          "Not checking if your recommendations were actually followed (look at the MAR!)",
          "Ignoring the original consult question in your daily notes",
          "Longest note ≠ best note. Be clear and concise.",
        ],
      },
    ],
  },

  career: {
    intro: "Curious what nephrologists actually do every day? This section walks you through a typical week in private practice nephrology — hospital consults, dialysis rounds, and outpatient clinic. It's a diverse specialty with a great mix of acute and chronic medicine.",
    categories: [
      {
        title: "Hospital Consults",
        emoji: "🏥",
        color: "#2980B9",
        items: [
          "You'll round at one or more hospitals, seeing new consults and following existing patients",
          "Typical volume: 8–15 inpatient consults per day (varies by practice size)",
          "Common consults: AKI, electrolyte derangements, uncontrolled HTN, CKD management, dialysis issues",
          "Morning starts early — most nephrologists pre-round by 6:30–7am, review labs and overnight events",
          "You'll write consult notes, call primary teams with recommendations, and coordinate care",
          "Some days you're on call for new consults — phone rings with ER and floor pages throughout the day",
          "You're the electrolyte and acid-base expert in the hospital — other teams rely on you",
          "Procedures: you may place temporary dialysis catheters and perform kidney biopsies",
          "Collaboration: you work closely with ICU, cardiology, transplant surgery, and hospitalists",
          "Inpatient work is intellectually stimulating — every consult is a puzzle to solve",
        ],
      },
      {
        title: "Dialysis Rounds",
        emoji: "🔄",
        color: "#E74C3C",
        items: [
          "You'll oversee dialysis treatments at one or more dialysis units (in-center HD)",
          "Typical panel: 30–60+ dialysis patients depending on practice",
          "You round on patients during their treatment — they sit in chairs for 3–4 hours while dialyzing",
          "Monthly comprehensive assessment: review labs, access, medications, nutrition, volume status",
          "Interval visits (weekly or biweekly): address acute issues, review vitals/labs between monthly visits",
          "You manage their prescriptions: dialysis duration, blood flow rate, K⁺ bath, UF goals, dry weight",
          "Common issues: hypotension during dialysis, access clotting, missed sessions, hyperkalemia, volume overload",
          "You work with a team: nurses, dietitians, social workers, and patient care technicians",
          "You build long-term relationships — these patients are YOUR patients for years",
          "Some practices have home HD and peritoneal dialysis programs too — growing rapidly",
          "Dialysis rounds can be done early morning (6am treatments) or between hospital and clinic",
        ],
      },
      {
        title: "Outpatient Clinic",
        emoji: "🏢",
        color: "#16A085",
        items: [
          "Office clinic is usually 1–3 half-days per week (varies by practice)",
          "You see CKD patients, post-transplant patients, stone formers, GN patients, hypertension referrals",
          "Typical visit: 15–30 minutes, review labs, adjust meds, counsel on diet and lifestyle",
          "CKD management: slow progression with ACEi/ARB, SGLT2i, BP control, dietary counseling",
          "Pre-dialysis planning: you guide patients through the transition from CKD to dialysis or transplant",
          "Post-transplant care: immunosuppression management, infection monitoring, graft function",
          "Stone clinic: metabolic workups, 24-hour urine analysis, prevention strategies",
          "GN follow-up: monitor remission, adjust immunosuppressants, watch for relapse",
          "You build longitudinal relationships — some patients follow with you for 10–20+ years",
          "Clinic days tend to be more predictable hours than hospital days",
        ],
      },
      {
        title: "A Typical Week",
        emoji: "📅",
        color: "#E67E22",
        items: [
          "Monday: Hospital rounds 7am → Dialysis unit 10am → Afternoon new consults",
          "Tuesday: Hospital rounds 7am → Office clinic 9am–12pm → Hospital follow-ups",
          "Wednesday: Hospital rounds 7am → Dialysis unit 10am → Procedures (biopsies, catheters)",
          "Thursday: Hospital rounds 7am → Office clinic 9am–3pm",
          "Friday: Hospital rounds 7am → Dialysis unit 10am → Admin/catch-up afternoon",
          "Weekend call: varies (1 in 3 to 1 in 6) — cover hospital and emergent dialysis",
          "Call nights: phone calls from ER for critical labs (K⁺ > 7, Na⁺ < 120, etc.) and new consults",
          "Private practice offers flexibility — many partners split hospital and office days",
          "Some nephrologists subspecialize further: transplant, onco-nephrology, critical care nephrology, home dialysis",
        ],
      },
      {
        title: "Why Nephrology?",
        emoji: "💡",
        color: "#8E44AD",
        items: [
          "Intellectual depth: electrolytes, acid-base, and physiology are endlessly interesting",
          "Variety: hospital consults + dialysis + clinic + procedures in a single week",
          "Longitudinal relationships: you follow patients for years, not just one admission",
          "Work-life balance: better than many procedural subspecialties, especially in group practice",
          "Impact: you manage chronic disease AND handle acute emergencies — not many specialties do both",
          "Growing demand: CKD and ESRD rates are increasing — job market is strong",
          "Procedures: kidney biopsies, dialysis catheter placement, access management",
          "Team-based: you work with nurses, dietitians, social workers, surgeons — never alone",
          "Transplant medicine: if you pursue it, one of the most rewarding fields in medicine",
          "The kidney is connected to everything — cardiology, endocrine, rheumatology, oncology, critical care",
          "Private practice is thriving in nephrology — good earning potential with autonomy",
        ],
      },
      {
        title: "Training Path",
        emoji: "🎓",
        color: "#163B50",
        items: [
          "Medical school (4 years) → Internal Medicine residency (3 years) → Nephrology fellowship (2 years)",
          "Fellowship: heavy clinical training + research time; exposed to transplant, ICU nephrology, dialysis",
          "Board certification: ABIM Nephrology boards after fellowship",
          "After fellowship: most go into private practice groups or academic centers",
          "Private practice: group practices typically 3–10 nephrologists, cover multiple hospitals and dialysis units",
          "Academic: teaching + research + clinical; usually at university hospitals",
          "Salary range: competitive with other IM subspecialties, especially in private practice",
          "Loan repayment: some underserved areas offer significant loan forgiveness for nephrologists",
          "Visa-friendly: nephrology fellowship and practice are accessible for IMG physicians",
          "Subspecialty options: transplant nephrology (extra year), critical care nephrology, onco-nephrology, interventional nephrology",
        ],
      },
    ],
  },
  templates: {
    intro: "Having a structured presentation format makes you sound organized and confident. Your attending wants to hear your assessment and reasoning, not a data dump. Here are templates for the most common nephrology presentation scenarios — adapt them to your style.",
    categories: [
      {
        title: "New Consult Presentation",
        emoji: "📋",
        color: "#2980B9",
        items: [
          "OPENING: '[Initials] is a [age] [sex] with [relevant PMH: CKD stage, DM, HTN] admitted for [reason], and we were consulted for [specific question].'",
          "RELEVANT HPI: Focus on kidney-relevant timeline only — when did Cr start rising? What is baseline Cr? Volume status changes? Recent medications, procedures, or contrast?",
          "KEY LABS: 'Baseline Cr was X, now Y (peaked at Z). BMP: Na [X], K [Y], bicarb [Z], BUN/Cr ratio. UA: [proteinuria, hematuria, casts].'",
          "URINE STUDIES: 'Urine lytes: UNa [X], UCr [Y], FENa [Z]% (or FEUrea if on diuretics). Microscopy: [specific findings or bland/inactive].'",
          "IMAGING: 'Renal US: [kidney size, echogenicity, hydronephrosis present/absent, Doppler if relevant].'",
          "ASSESSMENT: 'This is most consistent with [your diagnosis] because [2-3 supporting reasons].' — This is the MOST important part of your presentation.",
          "PLAN: 'I would recommend [specific interventions]. I have already [what you've done: held nephrotoxins, started IV fluids, ordered studies].'",
          "⚠️ Common mistake: presenting every lab value. Your attending can look at the chart — present the data that supports YOUR assessment and reasoning.",
        ],
      },
      {
        title: "Follow-Up Presentation (Daily Rounding)",
        emoji: "🔄",
        color: "#16A085",
        items: [
          "OPENING: '[Initials] is our [AKI / CKD / electrolyte / GN] consult, hospital day [X].'",
          "OVERNIGHT EVENTS: 'Overnight: [any events, vitals changes, new symptoms — or nothing significant].'",
          "TREND DATA: 'Cr trending [up/down/stable]: [yesterday] → [today]. UOP [X mL] over [Y hours]. I&Os [net positive/negative by Z liters].'",
          "KEY LABS: Only report what CHANGED or MATTERS. 'K normalized to 4.2 (was 6.1). Bicarb improved from 18 → 22. Na stable at 138.'",
          "VOLUME STATUS: 'On exam: [euvolemic / volume overloaded / dry]. Findings: [JVP, edema, lung sounds, weight trend].'",
          "ASSESSMENT: 'The [AKI is improving / electrolyte is correcting / issue persists], likely because [brief reasoning].'",
          "PLAN: 'Continue current plan / Make specific changes. Can consider discharge from consult service when [criteria: Cr trending down, K stable, etc.].'",
          "⚠️ Keep follow-ups SHORT — 30-60 seconds max. Your attending wants: Is the patient better, worse, or the same? Why? What's the plan?",
        ],
      },
      {
        title: "Dialysis Patient Presentation",
        emoji: "💉",
        color: "#E67E22",
        items: [
          "OPENING: '[Initials] is a [age] [sex] with ESKD on [HD MWF / HD TTS / PD], admitted for [reason].'",
          "DIALYSIS DETAILS: 'Dialyzes at [unit name], schedule [MWF or TTS]. Access: [AVF left forearm / AVG right upper arm / TDC right IJ]. Last HD was [date/day].'",
          "MISSED SESSIONS: 'They [made / missed] their last [X] session(s). [If missed: reason and duration].'",
          "DRY WEIGHT: 'Dry weight is [X] kg, current weight is [Y] kg — [Z kg over/under target].'",
          "ACCESS EXAM: 'Access exam: [thrill present/absent, bruit present/absent, no signs of infection, no aneurysm — or describe concerns].'",
          "VOLUME / LYTES: 'K [X], bicarb [Y], phosphorus [Z]. Volume status: [over target / at dry weight / below dry weight]. Fluid restriction [in place / not].'",
          "DIALYSIS PLAN: 'Scheduled for [inpatient HD today at (time) / needs urgent HD for (AEIOU indication)].'",
          "MEDICATIONS: 'Holding [drug] pre-HD. [Dialyzable drugs adjusted]. Binders, ESA, vitamin D [status].'",
          "🚫 NEVER use the access arm for blood draws, IVs, or BP measurements. Verify which arm. If unsure, ask the patient — they always know.",
        ],
      },
      {
        title: "Transplant Patient Presentation",
        emoji: "🫘",
        color: "#8E44AD",
        items: [
          "OPENING: '[Initials] is a [age] [sex] who is [X months/years] post kidney transplant from [deceased / living related / living unrelated donor], admitted for [reason].'",
          "TRANSPLANT DETAILS: 'Transplanted on [date] at [center]. Original disease: [cause of ESKD]. Baseline Cr [X] (best post-transplant Cr [Y]).'",
          "IMMUNOSUPPRESSION: 'Current regimen: [tacrolimus X mg BID / mycophenolate X mg BID / prednisone X mg daily]. Any recent changes?'",
          "CURRENT ISSUE: 'Cr has risen from baseline [X] to [Y] over [timeframe]. Symptoms: [fever, graft tenderness, decreased UOP, or none].'",
          "DRUG LEVELS: 'Tacrolimus trough: [level] (target [range for time post-transplant]). Last dose timing: [time]. Recent med additions that interact with tacrolimus?'",
          "INFECTION SCREEN: 'BK viral load: [result/pending]. CMV viral load: [result/pending]. UA: [clean / pyuria / bacteriuria]. Blood cultures: [result/pending].'",
          "DIFFERENTIAL: 'Differential for acute graft dysfunction: [rejection (cellular vs antibody-mediated), CNI toxicity, BK nephropathy, obstruction, recurrent/de novo disease].'",
          "PLAN: 'Recommend [transplant biopsy / adjust tacrolimus dose / imaging / monitor Cr q6-12h]. Have notified the transplant team at [center].'",
          "⚠️ NEVER independently adjust immunosuppression — always discuss with the transplant nephrologist first. Even small changes can trigger rejection or toxicity.",
        ],
      },
    ],
  },
};
