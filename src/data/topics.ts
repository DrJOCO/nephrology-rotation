export const TOPICS = [
  "AKI","Post-Renal AKI","CKD","Anemia of CKD","CKD-MBD","Hyponatremia","Hypernatremia","Hyperkalemia","Hypokalemia",
  "Acid-Base","Glomerulonephritis","Nephrotic Syndrome","Kidney Biopsy","Dialysis","Dialysis Access","Transplant",
  "Kidney Stones","AIN","Urinalysis","Hypertension","Diuretics","Fluid Management",
  "Calcium/Phosphorus","Proteinuria","Polycystic Kidney Disease",
  "APOL1-Associated Kidney Disease","Hepatorenal Syndrome","Contrast-Associated AKI","Rhabdomyolysis","Cardiorenal Syndrome","Diabetic Kidney Disease","SGLT2 Inhibitors","Peritoneal Dialysis",
  "GFR Assessment","Nephrotoxins","Other"
  // "Nephron Physiology" was removed from the selectable list: it had zero linked
  // content anywhere in the app, so offering it created a dead promise (a logged
  // consult with no matching learning). Historical entries that already carry the
  // string still render fine — it is retained in curriculum/competency mappings
  // (competency.ts) so past coverage scoring is unchanged; it is simply no longer
  // offered for new logs.
];

export const COMMON_PATIENT_TOPICS = [
  "AKI",
  "Hyperkalemia",
  "Hyponatremia",
  "CKD",
  "Cardiorenal Syndrome",
  "Hepatorenal Syndrome",
  "Dialysis",
  "Acid-Base",
];

// Keyword → topic map for auto-suggesting tags from the free-text consult reason.
// Keys are lowercased substrings checked against the dx field.
export const TOPIC_KEYWORDS: Array<{ topic: string; keywords: string[] }> = [
  { topic: "AKI", keywords: ["aki", "acute kidney", "rising cr", "rising creatinine", "atn", "tubular necrosis", "oliguria", "anuria"] },
  { topic: "CKD", keywords: ["ckd", "chronic kidney", "esrd", "eskd", "kidney disease"] },
  { topic: "Hyperkalemia", keywords: ["hyperkalemia", "high k", "elevated k", "k 6", "k 7", "k+ 6", "k+ 7", "peaked t"] },
  { topic: "Hypokalemia", keywords: ["hypokalemia", "low k", "k 2", "k 3"] },
  { topic: "Hyponatremia", keywords: ["hyponatremia", "low sodium", "low na", "siadh", "na 12", "na 11"] },
  { topic: "Hypernatremia", keywords: ["hypernatremia", "high sodium", "high na", "na 15", "na 16"] },
  { topic: "Acid-Base", keywords: ["acid-base", "acidosis", "alkalosis", "anion gap", "agma", "nagma", "bicarb", "hco3"] },
  { topic: "Fluid Management", keywords: ["volume overload", "hypovolemia", "fluid overload", "dehydration", "diuresis", "euvolemic"] },
  { topic: "Dialysis", keywords: ["dialysis", "hemodialysis", "rrt", "crrt", "cvvhdf", "cvvh", "hd "] },
  { topic: "Peritoneal Dialysis", keywords: ["peritoneal dialysis", "pd ", "tenckhoff", "cloudy effluent", "peritonitis"] },
  { topic: "Transplant", keywords: ["transplant", "rejection", "tacrolimus", "dsa", "allograft"] },
  { topic: "Hepatorenal Syndrome", keywords: ["hrs", "hepatorenal", "cirrhosis", "ascites", "terlipressin"] },
  { topic: "Contrast-Associated AKI", keywords: ["contrast", "cin", "cardiac cath", "iodinated"] },
  { topic: "Rhabdomyolysis", keywords: ["rhabdo", "rhabdomyolysis", "myoglobin", "high ck", "ck "] },
  { topic: "Cardiorenal Syndrome", keywords: ["cardiorenal", "chf", "hfref", "hfpef", "heart failure", "diuresis"] },
  { topic: "Diabetic Kidney Disease", keywords: ["diabetic nephropathy", "dkd", "diabetic kidney"] },
  { topic: "SGLT2 Inhibitors", keywords: ["sglt2", "dapagliflozin", "empagliflozin", "canagliflozin"] },
  { topic: "Glomerulonephritis", keywords: ["gn ", "glomerulonephritis", "nephritic", "rbc cast", "anca", "pauci-immune", "rpgn"] },
  { topic: "Nephrotic Syndrome", keywords: ["nephrotic", "foamy urine", "membranous", "fsgs", "minimal change"] },
  { topic: "Proteinuria", keywords: ["proteinuria", "uacr", "albuminuria"] },
  { topic: "Kidney Stones", keywords: ["stone", "nephrolithiasis", "calculus", "ureteral"] },
  { topic: "AIN", keywords: ["ain", "interstitial nephritis", "eosinophil"] },
  { topic: "Urinalysis", keywords: ["urinalysis", "ua ", "sediment", "hematuria"] },
  { topic: "Hypertension", keywords: ["hypertension", "htn", "high bp", "resistant htn"] },
  { topic: "Diuretics", keywords: ["diuretic", "furosemide", "lasix", "metolazone", "thiazide"] },
  { topic: "Calcium/Phosphorus", keywords: ["hypercalcemia", "hypocalcemia", "hyperphosphatemia", "calcium", "phosphorus"] },
  { topic: "Polycystic Kidney Disease", keywords: ["polycystic", "pkd", "adpkd"] },
  { topic: "APOL1-Associated Kidney Disease", keywords: ["apol1", "apol-1"] },
];

export const ADDITIONAL_PATIENT_TOPICS = TOPICS.filter(topic => !COMMON_PATIENT_TOPICS.includes(topic));

// ─── Topic → Resource Map (for patient-topic auto-linking) ──────────
export const TOPIC_RESOURCE_MAP: Record<string, { studySheets: string[]; quizWeeks: number[] }> = {
  "AKI":                  { studySheets: ["aki-cheatsheet"],                quizWeeks: [1] },
  "Post-Renal AKI":       { studySheets: ["aki-cheatsheet"],                quizWeeks: [1] },
  "CKD":                  { studySheets: ["ckd-sglt2i-cheatsheet"],         quizWeeks: [3] },
  "Anemia of CKD":        { studySheets: ["ckd-sglt2i-cheatsheet"],         quizWeeks: [] },
  "CKD-MBD":              { studySheets: ["potassium-acidbase-cheatsheet"], quizWeeks: [2] },
  "Hyponatremia":         { studySheets: ["sodium-cheatsheet"],             quizWeeks: [2] },
  "Hypernatremia":        { studySheets: ["sodium-cheatsheet"],             quizWeeks: [2] },
  "Hyperkalemia":         { studySheets: ["potassium-acidbase-cheatsheet"], quizWeeks: [2] },
  "Hypokalemia":          { studySheets: ["potassium-acidbase-cheatsheet"], quizWeeks: [2] },
  "Acid-Base":            { studySheets: ["potassium-acidbase-cheatsheet"], quizWeeks: [2] },
  "Glomerulonephritis":   { studySheets: ["gn-nephrotic-cheatsheet"],       quizWeeks: [3] },
  "Nephrotic Syndrome":   { studySheets: ["gn-nephrotic-cheatsheet"],       quizWeeks: [3] },
  "Kidney Biopsy":        { studySheets: ["gn-nephrotic-cheatsheet"],       quizWeeks: [3] },
  "Dialysis":             { studySheets: ["dialysis-cheatsheet"],           quizWeeks: [4] },
  "Dialysis Access":      { studySheets: ["dialysis-cheatsheet"],           quizWeeks: [4] },
  "Transplant":           { studySheets: ["transplant-stones-drugs-cheatsheet"], quizWeeks: [4] },
  "Kidney Stones":        { studySheets: ["transplant-stones-drugs-cheatsheet"], quizWeeks: [4] },
  "Nephrotoxins":         { studySheets: ["transplant-stones-drugs-cheatsheet"], quizWeeks: [4] },
  "AIN":                  { studySheets: ["aki-cheatsheet"],                quizWeeks: [1] },
  "Urinalysis":           { studySheets: ["gfr-urinalysis-cheatsheet"],     quizWeeks: [1] },
  "GFR Assessment":       { studySheets: ["gfr-urinalysis-cheatsheet"],     quizWeeks: [1] },
  "Hypertension":         { studySheets: ["ckd-sglt2i-cheatsheet"],         quizWeeks: [3] },
  "Diuretics":            { studySheets: ["dialysis-cheatsheet"],           quizWeeks: [4] },
  "Fluid Management":     { studySheets: ["sodium-cheatsheet"],             quizWeeks: [2] },
  "Calcium/Phosphorus":   { studySheets: ["potassium-acidbase-cheatsheet"], quizWeeks: [2] },
  "Proteinuria":          { studySheets: ["gn-nephrotic-cheatsheet"],       quizWeeks: [3] },
  "Polycystic Kidney Disease": { studySheets: ["adpkd-cheatsheet"], quizWeeks: [3] },
  "APOL1-Associated Kidney Disease": { studySheets: ["gn-nephrotic-cheatsheet"], quizWeeks: [3] },
  "Hepatorenal Syndrome": { studySheets: ["hrs-contrast-rhabdo-cheatsheet"], quizWeeks: [1] },
  "Contrast-Associated AKI": { studySheets: ["hrs-contrast-rhabdo-cheatsheet"], quizWeeks: [1] },
  "Rhabdomyolysis":       { studySheets: ["hrs-contrast-rhabdo-cheatsheet"], quizWeeks: [1] },
  "Cardiorenal Syndrome": { studySheets: ["cardiorenal-cheatsheet"],         quizWeeks: [2] },
  "Diabetic Kidney Disease": { studySheets: ["dkd-sglt2i-cheatsheet"],      quizWeeks: [3] },
  "SGLT2 Inhibitors":     { studySheets: ["dkd-sglt2i-cheatsheet"],         quizWeeks: [3] },
  "Peritoneal Dialysis":  { studySheets: ["pd-cheatsheet"],                 quizWeeks: [4] },
  "Other":                { studySheets: [],                                quizWeeks: [] },
};

// Threshold for follow-up "stale" state on patient cards. Tunable from one
// place — change here, every patient surface picks it up via getFollowUpState.
export const STALE_FOLLOWUP_DAYS = 7;
