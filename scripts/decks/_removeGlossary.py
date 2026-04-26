#!/usr/bin/env python3
"""
Remove the abbreviations slide (slide 2) from each deck.
Change TOTAL from 13 back to 12.
Decrement slideNumber values: 3→2, 4→3, ..., 12→11.
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

deck_files = [
    'aki.cjs', 'hyperkalemia.cjs', 'hyponatremia.cjs', 'ckd.cjs',
    'dialysis.cjs', 'gn.cjs', 'transplant.cjs', 'hypertension.cjs',
    'hrs.cjs', 'contrast-aki.cjs', 'cardiorenal.cjs', 'dkd.cjs', 'pd-peritonitis.cjs',
]

for f in deck_files:
    p = os.path.join(BASE, f)
    with open(p, 'r', encoding='utf-8') as fh:
        s = fh.read()
    # 1. Remove the abbreviations slide block.
    # It starts with: // Slide 2: Abbreviations
    # and is of form: addAbbreviationsSlide(pres, { ... });
    # Use regex that matches the block from the comment through the });
    pattern = re.compile(
        r'\n\s*// Slide 2: Abbreviations\s*\n\s*addAbbreviationsSlide\(pres,\s*\{.*?\n\s*\}\);',
        re.DOTALL
    )
    new_s, n = pattern.subn('', s)
    if n != 1:
        print(f'{f}: WARN — removed {n} abbreviations blocks (expected 1)')
    else:
        print(f'{f}: removed abbreviations slide')
    s = new_s

    # 2. Change TOTAL from 13 back to 12
    s = re.sub(r'const TOTAL = 13;', 'const TOTAL = 12;', s)

    # 3. Decrement slideNumber values: slideNumber: N → slideNumber: N-1, for N in 3..12
    # Process in ascending order so we don't double-decrement
    for n in range(3, 13):
        s = re.sub(rf'slideNumber:\s*{n}\b', f'slideNumber: {n-1}', s)

    # 4. Remove the helper imports (addAbbreviationsSlide specifically — keep addCaseSlide)
    s = s.replace(
        'addAbbreviationsSlide, addCaseSlide,',
        'addCaseSlide,'
    )

    with open(p, 'w', encoding='utf-8') as fh:
        fh.write(s)
    print(f'  TOTAL updated to 12; slide numbers decremented')

print('Done.')
