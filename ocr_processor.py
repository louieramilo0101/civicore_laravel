#!/usr/bin/env python3
"""
CiviCORE OCR Processor — EasyOCR powered
Extracts structured fields from Birth, Death, and Marriage documents.
Usage: python ocr_processor.py <file_path> [--lang en,tl] [--type image|pdf|auto] [--doc_type birth|death|marriage]
"""

import sys
import json
import os
import re
import argparse
from pathlib import Path

# ── Dependency checks ───────────────────────────────────────────────────────
try:
    import easyocr
except ImportError:
    print(json.dumps({"success": False, "error": "EasyOCR not installed. Run: pip install easyocr"}))
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print(json.dumps({"success": False, "error": "Pillow not installed. Run: pip install Pillow"}))
    sys.exit(1)


# ── Shared EasyOCR reader (lazy init) ───────────────────────────────────────
_reader = None

def get_reader(lang):
    """Return the lazily initialized EasyOCR reader for the requested languages."""
    global _reader
    if _reader is None:
        print(f"Initializing EasyOCR ({lang})…", file=sys.stderr)
        _reader = easyocr.Reader(lang, gpu=True, verbose=False)
    return _reader


# ── Document-type detection ─────────────────────────────────────────────────
BIRTH_KEYWORDS    = ['certificate of live birth', 'live birth', 'birth certificate', 'date of birth',
                     'place of birth', 'sex', 'father', 'mother', 'philsys', 'republic form no. 102']
DEATH_KEYWORDS    = ['certificate of death', 'death certificate', 'cause of death', 'date of death',
                     'place of death', 'deceased', 'attendant', 'republic form no. 103']
MARRIAGE_KEYWORDS = ['certificate of marriage', 'marriage license', 'marriage contract', 'husband',
                     'wife', 'spouse', 'date of marriage', 'place of marriage', 'republic form no. 97']

def detect_document_type(text: str) -> str:
    """Classify OCR text as a supported civil-registry certificate type."""
    """Return 'birth', 'death', 'marriage', or 'unknown'."""
    lower = text.lower()
    birth_hits    = sum(1 for kw in BIRTH_KEYWORDS    if kw in lower)
    death_hits    = sum(1 for kw in DEATH_KEYWORDS    if kw in lower)
    marriage_hits = sum(1 for kw in MARRIAGE_KEYWORDS if kw in lower)
    scores = {'birth': birth_hits, 'death': death_hits, 'marriage': marriage_hits}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else 'unknown'


# ── Field extractors ────────────────────────────────────────────────────────
def _first_match(patterns, text, flags=re.IGNORECASE):
    for pat in patterns:
        m = re.search(pat, text, flags)
        if m:
            return m.group(1).strip()
    return None

def smart_split_name(full_name: str) -> dict:
    """Split common Philippine name layouts into structured name fields."""
    """Break a full name string into structured components."""
    if not full_name:
        return {'last_name': '', 'first_name': '', 'middle_name': '', 'suffix': ''}
    
    name = full_name.strip()
    suffix = ''
    suffixes = r'\b(Jr|Sr|II|III|IV|V|VI|VII|M\.D\.|Esq|Ph\.D)\b\.?'
    
    # Extract suffix
    m_suffix = re.search(suffixes, name, re.IGNORECASE)
    if m_suffix:
        suffix = m_suffix.group(0).strip('.')
        name = re.sub(suffixes, '', name, flags=re.IGNORECASE).strip()

    # Handle "LAST, FIRST MIDDLE" format
    if ',' in name:
        parts = name.split(',', 1)
        last_name = parts[0].strip()
        remaining = parts[1].strip().split()
        first_name = remaining[0] if remaining else ''
        middle_name = ' '.join(remaining[1:]) if len(remaining) > 1 else ''
        return {'last_name': last_name, 'first_name': first_name, 'middle_name': middle_name, 'suffix': suffix}

    # Handle "FIRST MIDDLE LAST"
    parts = name.split()
    if len(parts) == 1:
        return {'last_name': parts[0], 'first_name': '', 'middle_name': '', 'suffix': suffix}
    elif len(parts) == 2:
        return {'last_name': parts[1], 'first_name': parts[0], 'middle_name': '', 'suffix': suffix}
    else:
        # Assume last word is last name, first is first, middle is everything else
        return {
            'last_name': parts[-1],
            'first_name': parts[0],
            'middle_name': ' '.join(parts[1:-1]),
            'suffix': suffix
        }

def extract_birth_fields(text: str, lines: list) -> dict:
    """Extract birth-certificate fields from OCR text and lines."""
    fields = {}

    # Name of child
    name_str = _first_match([
        r'(?:name of child|child\'s name|name)[:\s]+([A-Z][A-Za-z\s,.\-]+)',
    ], text)
    if not name_str:
        for line in lines[:15]:
            if re.match(r'^[A-Z][A-Z\s,.\-]{5,}$', line.strip()) and 'BIRTH' not in line:
                name_str = line.strip()
                break
    
    fields.update(smart_split_name(name_str))

    fields['date_of_birth'] = _first_match([
        r'(?:date of birth|birth date|born)[:\s]+([A-Za-z0-9\s,/\-]+)',
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
    ], text) or ''

    fields['sex'] = _first_match([r'(?:sex|gender)[:\s]+(male|female)', r'\b(male|female)\b'], text) or ''
    fields['place_of_birth'] = _first_match([r'(?:place of birth|municipality|city)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''

    # Father
    f_name = _first_match([r"(?:father'?s?\s*name|father)[:\s]+([A-Za-z\s,.\-]+)"], text)
    f_parts = smart_split_name(f_name)
    for k, v in f_parts.items():
        fields[f'father_{k}'] = v

    # Mother
    m_name = _first_match([r"(?:mother'?s?\s*name|mother)[:\s]+([A-Za-z\s,.\-]+)"], text)
    m_parts = smart_split_name(m_name)
    for k, v in m_parts.items():
        fields[f'mother_{k}'] = v

    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]+([A-Za-z\s\d\-]+)'], text) or ''

    return fields


def extract_death_fields(text: str, lines: list) -> dict:
    """Extract death-certificate fields from OCR text and lines."""
    fields = {}

    name_str = _first_match([
        r'(?:name of deceased|deceased name|name)[:\s]+([A-Za-z\s,.\-]+)',
    ], text)
    fields.update(smart_split_name(name_str))

    fields['date_of_death'] = _first_match([
        r'(?:date of death|died)[:\s]+([A-Za-z0-9\s,/\-]+)',
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
    ], text) or ''

    fields['age'] = _first_match([
        r'(?:age at death|age)[:\s]+(\d+)',
        r'\b(\d{1,3})\s*(?:years?|yr)',
    ], text) or ''

    fields['sex'] = _first_match([r'(?:sex|gender)[:\s]+(male|female)', r'\b(male|female)\b'], text) or ''
    fields['place_of_death'] = _first_match([r'(?:place of death|died at|hospital|municipality)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['cause_of_death'] = _first_match([r'(?:cause of death|immediate cause)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]+([A-Za-z\s\d\-]+)'], text) or ''

    return fields


def extract_marriage_fields(text: str, lines: list) -> dict:
    """Extract marriage-certificate fields from OCR text and lines."""
    fields = {}

    # Husband
    h_name = _first_match([r"(?:husband'?s?\s*name|groom|husband)[:\s]+([A-Za-z\s,.\-]+)"], text)
    h_parts = smart_split_name(h_name)
    for k, v in h_parts.items():
        fields[f'husband_{k}'] = v

    # Wife
    w_name = _first_match([r"(?:wife'?s?\s*name|bride|wife)[:\s]+([A-Za-z\s,.\-]+)"], text)
    w_parts = smart_split_name(w_name)
    for k, v in w_parts.items():
        fields[f'wife_{k}'] = v

    fields['date_of_marriage'] = _first_match([
        r'(?:date of marriage|married on|wedding date)[:\s]+([A-Za-z0-9\s,/\-]+)',
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
    ], text) or ''

    fields['place_of_marriage'] = _first_match([r'(?:place of marriage|married at|municipality)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]+([A-Za-z\s\d\-]+)'], text) or ''

    return fields


def extract_fields(doc_type: str, text: str, lines: list) -> dict:
    """Dispatch field extraction to the parser for the detected document type."""
    if doc_type == 'birth':
        return extract_birth_fields(text, lines)
    elif doc_type == 'death':
        return extract_death_fields(text, lines)
    elif doc_type == 'marriage':
        return extract_marriage_fields(text, lines)
    return {}


# ── OCR runners ──────────────────────────────────────────────────────────────
def run_ocr_on_image(image_path: str, lang: list) -> dict:
    """Run OCR on one image and return text, confidence, and structured fields."""
    reader = get_reader(lang)
    with Image.open(image_path) as img:
        # If image is wider than 1500px, scale it down
        if img.width > 1500:
            ratio = 1500 / float(img.width)
            new_height = int(float(img.height) * float(ratio))
            img = img.resize((1500, new_height), Image.Resampling.LANCZOS)
    print(f"Running OCR on image: {image_path}", file=sys.stderr)
    results = reader.readtext(image_path, detail=0)
    lines, scores = [], []
    for (_bbox, text, prob) in results:
        if text.strip():
            lines.append(text.strip())
            scores.append(round(prob, 3))
    lines = [text for text in results if text.strip()]
    full_text = '\n'.join(lines)
    avg_conf  = round(sum(scores) / len(scores), 3) if scores else 0
    return {'success': True, 'text': full_text, 'lines': lines, 'confidence': avg_conf}


def run_ocr_on_pdf(pdf_path: str, lang: list) -> dict:
    """Render PDF pages and combine their OCR results into one response."""
    try:
        from pdf2image import convert_from_path
    except ImportError:
        return {'success': False, 'error': 'pdf2image not installed. Run: pip install pdf2image'}

    print(f"Converting PDF: {pdf_path}", file=sys.stderr)
    images = convert_from_path(pdf_path, dpi=150)
    if not images:
        return {'success': False, 'error': 'Could not convert PDF to images'}

    reader = get_reader(lang)
    all_lines, all_scores = [], []
    tmp_dir = os.path.join(os.path.dirname(pdf_path), '_ocr_tmp')
    os.makedirs(tmp_dir, exist_ok=True)

    for i, img in enumerate(images):
        tmp_path = os.path.join(tmp_dir, f'page_{i}.png')
        img.save(tmp_path, 'PNG')
        for (_bbox, text, prob) in reader.readtext(tmp_path):
            if text.strip():
                all_lines.append(text.strip())
                all_scores.append(round(prob, 3))
        try:
            os.remove(tmp_path)
        except Exception:
            pass

    try:
        os.rmdir(tmp_dir)
    except Exception:
        pass

    full_text = '\n'.join(all_lines)
    avg_conf  = round(sum(all_scores) / len(all_scores), 3) if all_scores else 0
    return {'success': True, 'text': full_text, 'lines': all_lines,
            'confidence': avg_conf, 'pages_processed': len(images)}


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    """Parse command-line input and execute the standalone OCR pipeline."""
    parser = argparse.ArgumentParser(description='CiviCORE OCR Processor')
    parser.add_argument('input_file',          help='Path to image or PDF')
    parser.add_argument('--lang',              default='en,tl', help='Comma-separated language codes')
    parser.add_argument('--type',              choices=['image', 'pdf', 'auto'], default='auto')
    parser.add_argument('--doc_type',          default='',
                        help='Expected document type: birth | death | marriage (optional)')
    args = parser.parse_args()

    lang      = [l.strip() for l in args.lang.split(',')]
    file_path = args.input_file
    ext       = Path(file_path).suffix.lower()

    if not os.path.exists(file_path):
        print(json.dumps({'success': False, 'error': f'File not found: {file_path}'}))
        sys.exit(1)

    # ── Step 1: OCR ──────────────────────────────────────────────────────────
    file_type = args.type
    if file_type == 'auto':
        file_type = 'pdf' if ext == '.pdf' else 'image'

    ocr_result = run_ocr_on_pdf(file_path, lang) if file_type == 'pdf' \
                 else run_ocr_on_image(file_path, lang)

    if not ocr_result.get('success'):
        print(json.dumps(ocr_result))
        sys.exit(1)

    raw_text = ocr_result['text']
    lines    = ocr_result.get('lines', [])

    # ── Step 2: Detect document type ─────────────────────────────────────────
    detected_type  = detect_document_type(raw_text)
    expected_type  = args.doc_type.lower().strip() if args.doc_type else ''

    # Validation: does detected type match what the user selected?
    type_mismatch  = False
    mismatch_msg   = ''
    if expected_type and expected_type not in ('unknown', '') and detected_type != 'unknown':
        if detected_type != expected_type:
            type_mismatch = True
            mismatch_msg  = (
                f"Document type mismatch: you selected '{expected_type}' "
                f"but the document appears to be a '{detected_type}' certificate."
            )

    # ── Step 3: Extract structured fields ───────────────────────────────────
    # Use detected type for extraction; fall back to expected if detection failed
    extraction_type = detected_type if detected_type != 'unknown' else expected_type
    extracted_fields = extract_fields(extraction_type, raw_text, lines)

    # ── Step 4: Output ───────────────────────────────────────────────────────
    output = {
        'success':          True,
        'text':             raw_text,
        'confidence':       ocr_result.get('confidence', 0),
        'pages_processed':  ocr_result.get('pages_processed', 1),
        'detected_type':    detected_type,
        'expected_type':    expected_type,
        'type_mismatch':    type_mismatch,
        'mismatch_message': mismatch_msg,
        'extracted_fields': extracted_fields,
    }
    print(json.dumps(output, ensure_ascii=False))


if __name__ == '__main__':
    main()
