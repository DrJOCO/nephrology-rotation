#!/usr/bin/env python3
"""
For each deck:
1. Remove the 5-sentence presentation slide block (identified by title containing '5-sentence')
2. Replace addCaseSlide call with addCaseQuestionSlide + addCaseAnswerSlide
3. Update imports
Total slide count stays the same (-1 for removed 5-sentence, +1 for added case answer slide).
"""
import os, re

BASE = os.path.dirname(os.path.abspath(__file__))

deck_files = [
    'aki.cjs', 'hyperkalemia.cjs', 'hyponatremia.cjs', 'ckd.cjs',
    'dialysis.cjs', 'gn.cjs', 'transplant.cjs', 'hypertension.cjs',
    'hrs.cjs', 'contrast-aki.cjs', 'cardiorenal.cjs', 'dkd.cjs', 'pd-peritonitis.cjs',
]


def find_slide_block(src, title_contains):
    """Find (start, end) of slide block whose title contains the given text."""
    m = re.search(r'title:\s*"[^"]*' + re.escape(title_contains) + r'[^"]*"', src)
    if not m:
        return None
    # Walk back from m.start() to find the outer block opener "  {"
    idx = src.rfind('\n  {', 0, m.start())
    if idx == -1:
        return None
    block_start = idx + 1  # position of "  {"
    # Count braces forward until balanced
    depth = 0
    i = block_start
    while i < len(src):
        ch = src[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                block_end = i + 1
                break
        i += 1
    else:
        return None
    # Include trailing newline
    if block_end < len(src) and src[block_end] == '\n':
        block_end += 1
    # Include preceding comment line(s) (e.g., "  // ============ SLIDE 10: ...")
    line_end = block_start - 1  # '\n' before '  {'
    while True:
        prev_nl = src.rfind('\n', 0, line_end)
        if prev_nl == -1:
            break
        prev_line = src[prev_nl + 1:line_end]
        if prev_line.strip().startswith('//'):
            block_start = prev_nl + 1
            line_end = prev_nl
        else:
            break
    # Include preceding blank line
    if block_start > 0 and src[block_start - 1] == '\n':
        prev_nl = src.rfind('\n', 0, block_start - 1)
        if prev_nl != -1 and src[prev_nl + 1:block_start - 1].strip() == '':
            block_start = prev_nl + 1
    return (block_start, block_end)


def extract_case_args(obj_text):
    """Extract vignette/question/answer/teaching/slideNumber from case object text."""
    # Use a robust approach for string literals that may contain escaped quotes.
    # Find each field's value by scanning.
    result = {}
    for field in ['vignette', 'question', 'answer', 'teaching']:
        # Match: field: "..."
        m = re.search(rf'{field}:\s*(".*?(?<!\\)")', obj_text, re.DOTALL)
        if m:
            result[field] = m.group(1)
    sn = re.search(r'slideNumber:\s*(\d+)', obj_text)
    if sn:
        result['slideNumber'] = int(sn.group(1))
    return result


for fname in deck_files:
    fpath = os.path.join(BASE, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        src = f.read()

    # 1. Find and remove 5-sentence slide
    block = find_slide_block(src, '5-sentence')
    if not block:
        print(f'{fname}: no 5-sentence slide found, skipping')
    else:
        # Extract the slideNumber of the 5-sentence slide
        slide_text = src[block[0]:block[1]]
        sn_match = re.search(r'slideNumber:\s*(\d+)', slide_text)
        if not sn_match:
            print(f'{fname}: ERROR — could not extract 5-sentence slideNumber')
            continue
        five_sent_slide_num = int(sn_match.group(1))
        # Remove the block
        src = src[:block[0]] + src[block[1]:]
        print(f'{fname}: removed 5-sentence slide (was #{five_sent_slide_num})')

    # 2. Find addCaseSlide(...) call block
    case_pat = re.compile(
        r'((?:  //[^\n]*\n\s*)*?)  addCaseSlide\(pres,\s*(\{.*?\})\s*\)\s*;\s*\n',
        re.DOTALL
    )
    m = case_pat.search(src)
    if not m:
        # Try simpler pattern
        m = re.search(r'  addCaseSlide\(pres,\s*(\{.*?\})\s*\)\s*;\s*\n', src, re.DOTALL)
        if not m:
            print(f'{fname}: addCaseSlide call not found')
            continue
        comment_prefix = ''
        obj_text = m.group(1)
        call_start = m.start()
        call_end = m.end()
    else:
        comment_prefix = m.group(1) or ''
        obj_text = m.group(2)
        call_start = m.start()
        call_end = m.end()

    args = extract_case_args(obj_text)
    case_slide_num = args.get('slideNumber')
    if case_slide_num is None:
        print(f'{fname}: could not extract case slideNumber')
        continue

    q_num = five_sent_slide_num  # case-Q takes old 5-sentence slot
    a_num = case_slide_num       # case-A takes old case slot

    vignette = args.get('vignette', '""')
    question = args.get('question', '""')
    answer = args.get('answer', '""')
    teaching = args.get('teaching', '""')

    replacement = f"""
  // Clinical case — question
  addCaseQuestionSlide(pres, {{
    topic: TOPIC, slideNumber: {q_num}, totalSlides: TOTAL,
    vignette: {vignette},
    question: {question},
  }});

  // Clinical case — answer
  addCaseAnswerSlide(pres, {{
    topic: TOPIC, slideNumber: {a_num}, totalSlides: TOTAL,
    answer: {answer},
    teaching: {teaching},
  }});

"""
    src = src[:call_start] + replacement + src[call_end:]
    print(f'{fname}: split case into Q(#{q_num}) + A(#{a_num})')

    # 3. Update imports
    if 'addCaseQuestionSlide' not in src:
        src = src.replace('addCaseSlide,', 'addCaseQuestionSlide, addCaseAnswerSlide,')

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(src)

print('\nDone.')
