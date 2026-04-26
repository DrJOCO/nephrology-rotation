#!/usr/bin/env python3
"""
Expand abbreviations on FIRST occurrence in each deck.
Replace "AKI" → "acute kidney injury (AKI)" only on first hit.
Uses word-boundary matching to avoid false positives.
Skips strings that already contain the expansion nearby.

Only replaces in string literals (between quotes) — not in JS identifiers.
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

# Per-deck first-use expansions.
# Format: [(abbreviation, full_form), ...]
# Each will be expanded on first use to: "full form (abbreviation)"
# Word-boundary matched. Order matters — more specific first.
EXPANSIONS = {
    'aki.cjs': [
        # AKI is in deck title already; body first-use gets full form
        ('KDIGO', 'Kidney Disease: Improving Global Outcomes'),
        ('AEIOU', 'Acidosis, Electrolytes, Ingestion, Overload, Uremia'),
        ('KRT', 'kidney replacement therapy'),
        ('CRRT', 'continuous renal replacement therapy'),
        ('ATN', 'acute tubular necrosis'),
        ('AIN', 'acute interstitial nephritis'),
        ('TMA', 'thrombotic microangiopathy'),
        ('FeNa', 'fractional excretion of sodium'),
        ('FeUrea', 'fractional excretion of urea'),
        ('POCUS', 'point-of-care ultrasound'),
        ('MAKE30', 'major adverse kidney events at 30 days'),
    ],
    'hyperkalemia.cjs': [
        ('ESRD', 'end-stage renal disease'),
        ('KRT', 'kidney replacement therapy'),
        ('RAAS', 'renin-angiotensin-aldosterone system'),
        ('MRA', 'mineralocorticoid receptor antagonist'),
        ('SZC', 'sodium zirconium cyclosilicate'),
        ('SPS', 'sodium polystyrene sulfonate'),
        ('TMP-SMX', 'trimethoprim-sulfamethoxazole'),
        ('AMBER', 'patiromer + spironolactone in resistant HTN trial'),
        ('DIAMOND', 'patiromer + MRA in HFrEF trial'),
    ],
    'hyponatremia.cjs': [
        ('SIADH', 'syndrome of inappropriate antidiuretic hormone'),
        ('ODS', 'osmotic demyelination syndrome'),
        ('DDAVP', 'desmopressin'),
        ('ADH', 'antidiuretic hormone'),
        ('CSW', 'cerebral salt wasting'),
    ],
    'ckd.cjs': [
        ('KDIGO', 'Kidney Disease: Improving Global Outcomes'),
        ('CGA', 'Cause, GFR stage, Albuminuria'),
        ('UACR', 'urine albumin-to-creatinine ratio'),
        ('DKD', 'diabetic kidney disease'),
        ('RAAS', 'renin-angiotensin-aldosterone system'),
        ('SGLT2i', 'sodium-glucose cotransporter 2 inhibitor'),
        ('GLP-1 RA', 'glucagon-like peptide-1 receptor agonist'),
        ('MRA', 'mineralocorticoid receptor antagonist'),
        ('CKD-MBD', 'CKD mineral and bone disorder'),
        ('ESA', 'erythropoiesis-stimulating agent'),
        ('AVF', 'arteriovenous fistula'),
        ('AVG', 'arteriovenous graft'),
        ('KRT', 'kidney replacement therapy'),
        ('AOBP', 'automated office blood pressure'),
        ('KFRE', 'Kidney Failure Risk Equation'),
    ],
    'dialysis.cjs': [
        ('KRT', 'kidney replacement therapy'),
        ('RRT', 'renal replacement therapy'),
        ('IHD', 'intermittent hemodialysis'),
        ('CRRT', 'continuous renal replacement therapy'),
        ('SLED', 'sustained low-efficiency dialysis'),
        ('CAPD', 'continuous ambulatory peritoneal dialysis'),
        ('APD', 'automated peritoneal dialysis'),
        ('AEIOU', 'Acidosis, Electrolytes, Ingestion, Overload, Uremia'),
        ('AVF', 'arteriovenous fistula'),
        ('AVG', 'arteriovenous graft'),
        ('CVC', 'central venous catheter'),
        ('Kt/V', 'dialysis adequacy (clearance × time / distribution volume)'),
        ('URR', 'urea reduction ratio'),
        ('MALA', 'metformin-associated lactic acidosis'),
        ('CLABSI', 'central line-associated bloodstream infection'),
    ],
    'gn.cjs': [
        ('RPGN', 'rapidly progressive glomerulonephritis'),
        ('UPCR', 'urine protein-to-creatinine ratio'),
        ('UACR', 'urine albumin-to-creatinine ratio'),
        ('ANCA', 'antineutrophil cytoplasmic antibody'),
        ('GPA', 'granulomatosis with polyangiitis'),
        ('MPA', 'microscopic polyangiitis'),
        ('anti-GBM', 'anti-glomerular basement membrane'),
        ('PLA2R', 'phospholipase A2 receptor'),
        ('FSGS', 'focal segmental glomerulosclerosis'),
        ('MPGN', 'membranoproliferative glomerulonephritis'),
        ('PLEX', 'plasma exchange'),
        ('MPO', 'myeloperoxidase'),
        ('PR3', 'proteinase 3'),
        ('VTE', 'venous thromboembolism'),
    ],
    'transplant.cjs': [
        ('CNI', 'calcineurin inhibitor'),
        ('MMF', 'mycophenolate mofetil'),
        ('ATG', 'anti-thymocyte globulin'),
        ('PJP', 'Pneumocystis jirovecii pneumonia'),
        ('CMV', 'cytomegalovirus'),
        ('EBV', 'Epstein-Barr virus'),
        ('BK', 'BK polyomavirus'),
        ('PTLD', 'post-transplant lymphoproliferative disorder'),
        ('DSA', 'donor-specific antibody'),
        ('TMP-SMX', 'trimethoprim-sulfamethoxazole'),
        ('CYP3A4', 'cytochrome P450 3A4'),
        ('SCC', 'squamous cell carcinoma'),
        ('BCC', 'basal cell carcinoma'),
        ('SLK', 'simultaneous liver-kidney transplant'),
    ],
    'hypertension.cjs': [
        ('AOBP', 'automated office blood pressure'),
        ('ABPM', 'ambulatory blood pressure monitoring'),
        ('MRA', 'mineralocorticoid receptor antagonist'),
        ('DHP', 'dihydropyridine'),
        ('CCB', 'calcium channel blocker'),
        ('RAS', 'renal artery stenosis'),
        ('FMD', 'fibromuscular dysplasia'),
        ('OSA', 'obstructive sleep apnea'),
        ('LVH', 'left ventricular hypertrophy'),
        ('UACR', 'urine albumin-to-creatinine ratio'),
        ('LDDST', 'low-dose dexamethasone suppression test'),
    ],
    'hrs.cjs': [
        ('HRS-AKI', 'hepatorenal syndrome with acute kidney injury'),
        ('ICA', 'International Club of Ascites'),
        ('ADQI', 'Acute Disease Quality Initiative'),
        ('AASLD', 'American Association for the Study of Liver Diseases'),
        ('SAAG', 'serum-ascites albumin gradient'),
        ('MELD', 'Model for End-Stage Liver Disease'),
        ('SLK', 'simultaneous liver-kidney transplant'),
        ('TIPS', 'transjugular intrahepatic portosystemic shunt'),
        ('NSBB', 'non-selective beta-blocker'),
        ('UNOS', 'United Network for Organ Sharing'),
    ],
    'contrast-aki.cjs': [
        ('CI-AKI', 'contrast-induced acute kidney injury'),
        ('PC-AKI', 'post-contrast acute kidney injury'),
        ('NSF', 'nephrogenic systemic fibrosis'),
        ('ACR', 'American College of Radiology'),
        ('NAC', 'N-acetylcysteine'),
        ('LVEDP', 'left ventricular end-diastolic pressure'),
        ('TAVR', 'transcatheter aortic valve replacement'),
    ],
    'cardiorenal.cjs': [
        ('CRS', 'cardiorenal syndrome'),
        ('ADHF', 'acute decompensated heart failure'),
        ('HFrEF', 'heart failure with reduced ejection fraction'),
        ('HFpEF', 'heart failure with preserved ejection fraction'),
        ('GDMT', 'guideline-directed medical therapy'),
        ('ARNi', 'angiotensin-neprilysin inhibitor'),
        ('MRA', 'mineralocorticoid receptor antagonist'),
        ('POCUS', 'point-of-care ultrasound'),
        ('BNP', 'brain natriuretic peptide'),
        ('UF', 'ultrafiltration'),
    ],
    'dkd.cjs': [
        ('DKD', 'diabetic kidney disease'),
        ('ESKD', 'end-stage kidney disease'),
        ('UACR', 'urine albumin-to-creatinine ratio'),
        ('RAAS', 'renin-angiotensin-aldosterone system'),
        ('SGLT2i', 'sodium-glucose cotransporter 2 inhibitor'),
        ('GLP-1 RA', 'glucagon-like peptide-1 receptor agonist'),
        ('MRA', 'mineralocorticoid receptor antagonist'),
        ('DPP-4', 'dipeptidyl peptidase-4'),
        ('ADA', 'American Diabetes Association'),
        ('KFRE', 'Kidney Failure Risk Equation'),
        ('AOBP', 'automated office blood pressure'),
        ('CGM', 'continuous glucose monitor'),
    ],
    'pd-peritonitis.cjs': [
        ('ISPD', 'International Society for Peritoneal Dialysis'),
        ('CAPD', 'continuous ambulatory peritoneal dialysis'),
        ('APD', 'automated peritoneal dialysis'),
        ('CoNS', 'coagulase-negative staphylococci'),
        ('GNR', 'gram-negative rod'),
        ('Kt/V', 'dialysis adequacy (clearance × time / volume)'),
    ],
}


def first_use_expand(src, abbr, expansion):
    """Replace first occurrence of `abbr` (word-bounded) with `expansion (abbr)`.
    Only within string literals (skip if inside JS code like PALETTE.primary or key names).
    Simple approach: match `abbr` surrounded by non-identifier chars, AND check it's
    inside a quoted string.
    """
    # Build a regex that requires the abbreviation to appear as a word in text.
    # Escape abbr for regex, then require (^|[\s"',.;:()\[\]])abbr([\s"',.;:()\[\]]|$)
    # But to keep it simple, we use \b where possible. For abbreviations with special
    # chars like GLP-1 RA we can't use \b. Use explicit boundaries.
    esc = re.escape(abbr)
    # Allow these as boundaries: whitespace, punctuation, slashes, quote chars.
    pattern = re.compile(
        r'(?P<pre>[\s"\'(\[/,.;:`—-])'
        + esc
        + r'(?P<post>[\s"\'),.;:!?\[\]/—-])'
    )

    m = pattern.search(src)
    if not m:
        # Try more permissive boundary
        pattern2 = re.compile(r'(?P<pre>\W)' + esc + r'(?P<post>\W)')
        m = pattern2.search(src)
        if not m:
            return src, False

    # Check that the match is inside a double-quoted string literal.
    # Simple check: count double-quotes from start of file to match start;
    # odd count = inside a string.
    start = m.start()
    pre_text = src[:start]
    # Count unescaped double quotes
    # (this is a heuristic but works for our deck files)
    count = 0
    i = 0
    while i < len(pre_text):
        c = pre_text[i]
        if c == '\\':
            i += 2
            continue
        if c == '"':
            count += 1
        i += 1

    if count % 2 == 0:
        # Not inside a string — try next match
        # (Rare edge case; just bail and try another occurrence)
        after = src[m.end():]
        # Repeat recursively for next occurrence
        if pattern.search(after):
            rest, ok = first_use_expand(after, abbr, expansion)
            if ok:
                return src[: m.end()] + rest, True
        return src, False

    # Do the replacement
    full = f'{expansion} ({abbr})'
    new_src = src[:start] + m.group('pre') + full + m.group('post') + src[m.end():]
    return new_src, True


for fname, pairs in EXPANSIONS.items():
    fpath = os.path.join(BASE, fname)
    with open(fpath, 'r', encoding='utf-8') as fh:
        src = fh.read()
    expanded_count = 0
    for abbr, full in pairs:
        # Don't expand if the full form already appears somewhere in the deck
        # (avoid double expansion)
        if full.lower() in src.lower():
            continue
        src, ok = first_use_expand(src, abbr, full)
        if ok:
            expanded_count += 1
    with open(fpath, 'w', encoding='utf-8') as fh:
        fh.write(src)
    print(f'{fname}: expanded {expanded_count}/{len(pairs)} abbreviations')

print('Done.')
