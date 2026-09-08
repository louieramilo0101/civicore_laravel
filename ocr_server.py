import sys
import json
import os
import re
import argparse
import time
import math
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional
# import easyocr (Moved to get_reader for memory efficiency)
from PIL import Image
import fitz  # PyMuPDF
import cv2
import numpy as np
import threading
from google import genai
from functools import wraps

process_lock = threading.Lock()

def serialize_processing(func):
    """Serialize access to an OCR endpoint while preserving its callable API."""
    """Decorator to force sequential execution of an endpoint."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        with process_lock:
            return func(*args, **kwargs)
    return wrapper

try:
    import docx
except ImportError:
    docx = None

try:
    import pytesseract
    # Common Windows path for Tesseract
    TESS_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(TESS_PATH):
        pytesseract.pytesseract.tesseract_cmd = TESS_PATH
    
    # Verify it works
    pytesseract.get_tesseract_version()
    PYTESSERACT_AVAILABLE = True
except Exception:
    PYTESSERACT_AVAILABLE = False

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Document-type detection -------------------------------------------------
BIRTH_KEYWORDS    = ['certificate of live birth', 'live birth', 'birth certificate', 'date of birth',
                     'place of birth', 'sex', 'father', 'mother', 'philsys', 'republic form no. 102']
DEATH_KEYWORDS    = ['certificate of death', 'death certificate', 'cause of death', 'date of death',
                     'place of death', 'deceased', 'attendant', 'republic form no. 103']
MARRIAGE_KEYWORDS = ['certificate of marriage', 'marriage license', 'marriage contract', 'husband',
                     'wife', 'spouse', 'date of marriage', 'place of marriage', 'republic form no. 97']

DEFAULT_QUICK_FILL_TEMPLATE_FAMILIES = {
    "birth": {
        "markers": [
            "certificate of live birth",
            "republic form no. 102",
            "municipal form no. 102",
        ],
        "roi_fields": {
            "full_name": (0.10, 0.20, 0.88, 0.30),
            "date_of_birth": (0.10, 0.30, 0.55, 0.38),
            "registry_number": (0.60, 0.14, 0.93, 0.22),
            "barangay": (0.07, 0.44, 0.46, 0.53),
        },
    },
    "death": {
        "markers": [
            "certificate of death",
            "republic form no. 103",
            "municipal form no. 103",
        ],
        "roi_fields": {
            "full_name": (0.10, 0.19, 0.88, 0.30),
            "date_of_death": (0.10, 0.30, 0.55, 0.38),
            "registry_number": (0.60, 0.14, 0.93, 0.22),
            "barangay": (0.07, 0.43, 0.46, 0.52),
        },
    },
    "marriage": {
        "markers": [
            "certificate of marriage",
            "republic form no. 97",
            "municipal form no. 97",
        ],
        "roi_fields": {
            "husbands_name": (0.10, 0.22, 0.88, 0.30),
            "wifes_name": (0.10, 0.30, 0.88, 0.38),
            "date_of_marriage": (0.10, 0.38, 0.55, 0.46),
            "registry_number": (0.60, 0.14, 0.93, 0.22),
            "barangay": (0.07, 0.46, 0.46, 0.55),
        },
    },
}

DEFAULT_QUICK_FILL_REQUIRED_FIELDS = {
    "birth": ["full_name", "date_of_birth", "registry_number", "barangay"],
    "death": ["full_name", "date_of_death", "registry_number", "barangay"],
    "marriage": ["husbands_name", "wifes_name", "date_of_marriage", "registry_number", "barangay"],
}
# Thresholds for quick fill confidence, 0.60 is the lowest 0.75 the highest
QUICK_FILL_MIN_CONFIDENCE = 0.60
QUICK_FILL_MIN_MARKER_HITS = 1
TEMPLATE_PROFILE_PATH = Path(__file__).resolve().parent / "Templates" / "roi_profiles.json"
QUICK_FILL_TEMPLATE_FAMILIES = DEFAULT_QUICK_FILL_TEMPLATE_FAMILIES
QUICK_FILL_REQUIRED_FIELDS = DEFAULT_QUICK_FILL_REQUIRED_FIELDS

DATE_PATTERNS = [
    r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',
    r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4}\b',
]

# ---------------------------------------------------------------------------
# OCR CLEANING LAYER
# Common OCR artifacts for Philippine civil registry forms.
# Maps misread strings -> correct strings. Checked case-insensitively.
# ---------------------------------------------------------------------------
OCR_CORRECTION_MAP = {
    # Months (leading-character OCR drops)
    "ANUARY": "JANUARY", "JNNUARY": "JANUARY", "JANURY": "JANUARY", "JANUAPY": "JANUARY",
    "FEBURARY": "FEBRUARY", "FEBRUAPY": "FEBRUARY", "EBRUARY": "FEBRUARY",
    "MACH": "MARCH", "MARH": "MARCH", "NARCH": "MARCH",
    "APIL": "APRIL", "APRL": "APRIL",
    "JNE": "JUNE", "JNE": "JUNE",
    "JLY": "JULY", "JVLY": "JULY",
    "AGUST": "AUGUST", "AUGAST": "AUGUST", "UGUST": "AUGUST",
    "SEPTEBER": "SEPTEMBER", "SEPTEMBE": "SEPTEMBER", "EPTEMBER": "SEPTEMBER",
    "OCTBER": "OCTOBER", "OCTOBR": "OCTOBER", "CTOBER": "OCTOBER",
    "NOVEBER": "NOVEMBER", "NOVEMBE": "NOVEMBER", "OVEMBER": "NOVEMBER",
    "DECEBER": "DECEMBER", "DECEMBE": "DECEMBER", "ECEMBER": "DECEMBER",
    # Sex field
    "MAIE": "MALE", "MALF": "MALE", "NALE": "MALE", "MA LE": "MALE",
    "FEMAL": "FEMALE", "FEMALF": "FEMALE", "FENALE": "FEMALE",
    # Marital/Type
    "SONGLE": "SINGLE", "SINGL": "SINGLE", "SIHGLE": "SINGLE",
    "MARIED": "MARRIED", "MARRIAD": "MARRIED",
    "WIDDOW": "WIDOW", "WIDW": "WIDOW",
    # Citizenship
    "FILIPINC": "FILIPINO", "FILIPLNO": "FILIPINO", "FILLPINO": "FILIPINO",
    # Type of birth
    "SINGLR": "SINGLE", "TWINN": "TWIN", "TRIPLRT": "TRIPLET",
    "NOT APPLIGASLE": "NOT APPLICABLE", "NOT APPLICABIE": "NOT APPLICABLE",
    # Generic noise tokens to drop
    "-E": "", "—": "", "–": "",
}

# Canonical month name -> number mapping (for date reconstruction)
MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
}

# Philippine provinces for fuzzy geographic correction
PH_PROVINCES = [
    "Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique",
    "Apayao", "Aurora", "Basilan", "Bataan", "Batanes", "Batangas", "Benguet",
    "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Camarines Norte",
    "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu",  
    "Compostela Valley", "Cotabato", "Davao de Oro", "Davao del Norte",
    "Davao del Sur", "Davao Occidental", "Davao Oriental", "Dinagat Islands",
    "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur",
    "Iloilo", "Isabela", "Kalinga", "La Union", "Laguna", "Lanao del Norte",
    "Lanao del Sur", "Leyte", "Maguindanao", "Marinduque", "Masbate",
    "Metro Manila", "NCR", "Misamis Occidental", "Misamis Oriental",
    "Mountain Province", "Negros Occidental", "Negros Oriental",
    "Northern Samar", "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro",
    "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan", "Quezon",
    "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor",
    "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat",
    "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac",
    "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur",
    "Zamboanga Sibugay", "Cavite", "Rizal", "Bulacan", "Laguna",
]

def _fuzzy_match(value: str, candidates: list, cutoff: float = 0.72) -> str:
    """Return the closest candidate when its similarity exceeds the cutoff."""
    """
    Simple character-level similarity match. Returns the best match from
    `candidates` if it exceeds `cutoff`, otherwise returns the original value.
    """
    if not value or len(value) < 3:
        return value
    best_match = value
    best_score = cutoff
    val_lower = value.lower()
    for candidate in candidates:
        cand_lower = candidate.lower()
        # Compute a simple overlap ratio
        common = sum(1 for a, b in zip(val_lower, cand_lower) if a == b)
        length = max(len(val_lower), len(cand_lower))
        score = common / length if length > 0 else 0.0
        if score > best_score:
            best_score = score
            best_match = candidate
    return best_match

def _clean_ocr_field(field_name: str, raw_value: str) -> str:
    """Normalize OCR artifacts using field-specific cleaning rules."""
    """
    Intelligently clean a raw OCR string based on the expected field type.
    - Strips trailing/leading noise
    - Applies the OCR correction dictionary
    - Title-cases names
    - Normalizes months for dob_month fields
    - Strips trailing punctuation from registry numbers
    - Fuzzy-matches provinces to canonical PH names
    """
    if not raw_value:
        return raw_value

    text = raw_value.strip()
    
    # Normalize "Not Applicable" variants to "N/A"
    norm_text = text.upper()
    if norm_text in ("NOT APPLICABLE", "NOTAPPLICABLE", "N/A", "N / A") or "NOT APPLICABLE" in norm_text or "NOT APPL" in norm_text:
        return "N/A"

    # Strip common leading/trailing OCR noise characters
    text = re.sub(r'^[|=\-–—.,;:!?]+|[|=\-–—.,;:!?]+$', '', text).strip()
    # Collapse internal whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    if not text:
        return text

    # Apply correction dictionary (case-insensitive, whole-word preferred)
    for wrong, right in OCR_CORRECTION_MAP.items():
        text = re.sub(re.escape(wrong), right, text, flags=re.IGNORECASE).strip()

    fl = field_name.lower()

    # --- Month field: normalize to canonical full month name ---
    if 'month' in fl:
        for month_name, _ in MONTH_MAP.items():
            if month_name[:3] in text.lower():
                text = month_name.capitalize()
                break

    # --- Day/Year fields: strip all non-digit characters ---
    if fl.endswith('_day') or fl.endswith('_year'):
        digits_only = re.sub(r'[^\d]', '', text)
        if digits_only:
            text = digits_only

    # --- Registry number: strip trailing punctuation and spaces ---
    if 'registry' in fl:
        text = re.sub(r'[^A-Za-z0-9\-]', '', text)

    # --- Name fields: apply title case, remove stray digits ---
    if 'name' in fl:
        # Remove isolated digits or short noise tokens
        text = re.sub(r'\b\d{1,2}\b', '', text).strip()
        text = re.sub(r'\s+', ' ', text).strip()
        if text:
            text = text.title()

    # --- Sex field: normalize to MALE / FEMALE ---
    if fl == 'sex':
        upper = text.upper().split()[0] if text.split() else ''
        if upper in ('M', 'MALE', 'MAKE', 'MALF', 'MALI'):
            text = 'MALE'
        elif upper in ('F', 'FEMALE', 'FEMAL', 'FENALE'):
            text = 'FEMALE'

    # --- Citizenship: normalize to FILIPINO ---
    if 'citizenship' in fl:
        if 'filip' in text.lower() or 'phili' in text.lower():
            text = 'Filipino'

    # --- Province fields: fuzzy match against PH province list ---
    if 'province' in fl and len(text) > 3:
        text = _fuzzy_match(text, PH_PROVINCES, cutoff=0.65)

    return text.strip()

def load_template_profiles():
    """Load configured template profiles used by quick-fill OCR."""
    global QUICK_FILL_TEMPLATE_FAMILIES, QUICK_FILL_REQUIRED_FIELDS
    if not TEMPLATE_PROFILE_PATH.exists():
        print(f"No external ROI profile found at {TEMPLATE_PROFILE_PATH}; using built-in defaults.")
        return

    try:
        with open(TEMPLATE_PROFILE_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
        families = payload.get("families", {})
        required_fields = payload.get("required_fields", {})
        if isinstance(families, dict) and families:
            QUICK_FILL_TEMPLATE_FAMILIES = families
        if isinstance(required_fields, dict) and required_fields:
            QUICK_FILL_REQUIRED_FIELDS = required_fields
        print(f"Loaded external ROI profile from {TEMPLATE_PROFILE_PATH}")
    except Exception as exc:
        print(f"Failed to load ROI profile ({TEMPLATE_PROFILE_PATH}): {exc}. Using built-in defaults.")

def detect_document_type(text: str) -> str:
    """Classify OCR text using certificate-specific marker phrases."""
    lower = text.lower()
    birth_hits    = sum(1 for kw in BIRTH_KEYWORDS    if kw in lower)
    death_hits    = sum(1 for kw in DEATH_KEYWORDS    if kw in lower)
    marriage_hits = sum(1 for kw in MARRIAGE_KEYWORDS if kw in lower)
    scores = {'birth': birth_hits, 'death': death_hits, 'marriage': marriage_hits}
    best = max(scores, key=scores.get)
    # Default to 'unknown' if no clear indicators are found
    return best if scores[best] > 0 else 'unknown'

def _normalize_roi_text(value: str) -> str:
    return re.sub(r'\s+', ' ', (value or '').strip())

def _field_expected_type(field_name: str) -> str:
    lower = (field_name or '').lower()
    if 'date' in lower:
        return 'date'
    if 'registry' in lower:
        return 'registry'
    if 'barangay' in lower or 'brgy' in lower:
        return 'barangay'
    if 'name' in lower:
        return 'name'
    return 'text'

def _extract_likely_date(value: str) -> str:
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, value, re.IGNORECASE)
        if m:
            return m.group(0)
    return value

def _validate_field_value(field_name: str, value: str) -> bool:
    expected_type = _field_expected_type(field_name)
    text = _normalize_roi_text(value)
    if not text:
        return False

    if expected_type == 'date':
        return any(re.search(pat, text, re.IGNORECASE) for pat in DATE_PATTERNS)
    if expected_type == 'name':
        letter_count = len(re.findall(r'[A-Za-z]', text))
        digit_count = len(re.findall(r'\d', text))
        return letter_count >= 3 and digit_count <= 2
    if expected_type == 'registry':
        return bool(re.search(r'[A-Za-z0-9]', text)) and len(re.sub(r'[^A-Za-z0-9]', '', text)) >= 4
    if expected_type == 'barangay':
        return len(text) >= 3 and len(re.findall(r'[A-Za-z]', text)) >= 2
    return len(text) >= 2

def _validate_input_file(file_path: str, expected_extensions=None):
    """Validate that an OCR input exists and has an accepted extension."""
    if not file_path or not os.path.exists(file_path) or not os.path.isfile(file_path):
        raise HTTPException(status_code=400, detail='File not found or inaccessible.')

    if os.path.getsize(file_path) == 0:
        raise HTTPException(status_code=400, detail='Uploaded file is empty.')

    if expected_extensions is None:
        expected_extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.webp', '.docx', '.txt', '.rtf']

    ext = Path(file_path).suffix.lower()
    if ext not in expected_extensions:
        raise HTTPException(status_code=400, detail=f'Unsupported file type: {ext}')

    with open(file_path, 'rb') as fp:
        magic = fp.read(16)

    if ext == '.pdf' and not magic.startswith(b'%PDF-'):
        raise HTTPException(status_code=400, detail='Corrupt or invalid PDF file.')
    if ext in ['.jpg', '.jpeg'] and magic[:2] != b'\xFF\xD8':
        raise HTTPException(status_code=400, detail='Corrupt or invalid JPEG file.')
    if ext == '.png' and magic[:8] != b'\x89PNG\r\n\x1a\n':
        raise HTTPException(status_code=400, detail='Corrupt or invalid PNG file.')
    if ext == '.webp' and not (magic[:4] == b'RIFF' and magic[8:12] == b'WEBP'):
        raise HTTPException(status_code=400, detail='Corrupt or invalid WEBP file.')
    if ext == '.bmp' and magic[:2] != b'BM':
        raise HTTPException(status_code=400, detail='Corrupt or invalid BMP file.')
    if ext == '.tiff' and magic[:4] not in [b'II*\x00', b'MM\x00*']:
        raise HTTPException(status_code=400, detail='Corrupt or invalid TIFF file.')
    if ext == '.docx' and magic[:4] != b'PK\x03\x04':
        raise HTTPException(status_code=400, detail='Corrupt or invalid DOCX file.')

    return ext


def _roi_to_pixels(roi, width: int, height: int):
    x1, y1, x2, y2 = roi
    left = max(0, int(width * x1))
    top = max(0, int(height * y1))
    right = min(width, int(width * x2))
    bottom = min(height, int(height * y2))
    return left, top, right, bottom

def _run_tesseract_roi(crop: Image.Image):
    if not PYTESSERACT_AVAILABLE:
        return '', 0.0

    config = '--oem 1 --psm 6'
    try:
        data = pytesseract.image_to_data(
            crop,
            output_type=pytesseract.Output.DICT,
            config=config
        )
        words, confidences = [], []
        for txt, conf in zip(data.get('text', []), data.get('conf', [])):
            cleaned = (txt or '').strip()
            if not cleaned:
                continue
            words.append(cleaned)
            try:
                conf_float = float(conf)
            except (ValueError, TypeError):
                conf_float = -1
            if conf_float >= 0:
                confidences.append(conf_float / 100.0)

        merged_text = _normalize_roi_text(' '.join(words))
        avg_conf = round(sum(confidences) / len(confidences), 3) if confidences else (0.9 if merged_text else 0.0)
        return merged_text, avg_conf
    except Exception:
        return '', 0.0

def _run_easyocr_roi(crop: Image.Image):
    reader = get_reader()
    if not reader:
        return '', 0.0
    try:
        results = reader.readtext(crop)
        texts = [item[1].strip() for item in results if item[1].strip()]
        scores = [float(item[2]) for item in results if item[1].strip()]
        merged_text = _normalize_roi_text(' '.join(texts))
        avg_conf = round(sum(scores) / len(scores), 3) if scores else 0.0
        return merged_text, avg_conf
    except Exception:
        return '', 0.0

def detect_template_family(image_path: str):
    """Detect the configured certificate template family from an image."""
    try:
        img = Image.open(image_path).convert('L')
    except Exception:
        return None, ''

    width, height = img.size
    header_crop = img.crop((0, 0, width, max(int(height * 0.22), 1)))
    header_text, _ = _run_tesseract_roi(header_crop)
    if not header_text:
        header_text, _ = _run_easyocr_roi(header_crop)

    lower_header = header_text.lower()
    best_family, best_hits = None, 0
    for family, cfg in QUICK_FILL_TEMPLATE_FAMILIES.items():
        hits = sum(1 for marker in cfg["markers"] if marker in lower_header)
        if hits > best_hits:
            best_hits = hits
            best_family = family

    selected_family = best_family if best_hits >= QUICK_FILL_MIN_MARKER_HITS else None
    return selected_family, header_text, best_hits

def quick_fill_extract_from_rois(image_path: str, template_family: str):
    """Extract high-value fields from the configured template regions."""
    cfg = QUICK_FILL_TEMPLATE_FAMILIES.get(template_family)
    if not cfg:
        return {}, {}

    try:
        img = Image.open(image_path).convert('L')
    except Exception:
        return {}, {}

    width, height = img.size
    fields = {}
    confidence_meta = {}
    for field_name, roi in cfg['roi_fields'].items():
        left, top, right, bottom = _roi_to_pixels(roi, width, height)
        if right <= left or bottom <= top:
            fields[field_name] = ''
            confidence_meta[field_name] = {"confidence": 0.0, "source": "roi", "roi": roi}
            continue

        crop = img.crop((left, top, right, bottom))
        # Optional: pre-process the crop for better Tesseract/EasyOCR reading
        crop_cv = cv2.cvtColor(np.array(crop), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(crop_cv, cv2.COLOR_BGR2GRAY)
        gray = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
        crop_enhanced = Image.fromarray(thresh)

        text, conf = _run_tesseract_roi(crop_enhanced)
        source = "roi_tesseract"
        
        # If Tesseract fails or confidence is low, fall back to EasyOCR for this specific ROI
        if not text or conf < 0.8:
            easy_text, easy_conf = _run_easyocr_roi(crop_enhanced)
            if easy_conf > conf and easy_text:
                text, conf = easy_text, easy_conf
                source = "roi_easyocr"

        cleaned_text = _normalize_roi_text(text)
        if _field_expected_type(field_name) == 'date':
            cleaned_text = _normalize_roi_text(_extract_likely_date(cleaned_text))

        # --- Apply intelligent field cleaning ---
        cleaned_text = _clean_ocr_field(field_name, cleaned_text)

        validation_passed = _validate_field_value(field_name, cleaned_text)
        if not validation_passed and cleaned_text:
            conf = min(conf, 0.35)

        fields[field_name] = cleaned_text
        confidence_meta[field_name] = {
            "confidence": round(conf, 3),
            "source": source,
            "roi": roi,
            "expected_type": _field_expected_type(field_name),
            "validation_passed": validation_passed,
            "low_confidence": bool((not cleaned_text) or (not validation_passed) or conf < QUICK_FILL_MIN_CONFIDENCE),
        }

    return fields, confidence_meta

# -- Field extractors --------------------------------------------------------
def _first_match(patterns, text, flags=re.IGNORECASE):
    for pat in patterns:
        m = re.search(pat, text, flags)
        if m:
            return m.group(1).strip()
    return None

def extract_birth_fields(text: str, lines: list) -> dict:
    fields = {}
    name = _first_match([
        r'(?:name of child|name)[:\s]+([A-Z][A-Za-z\s,.\-]+)',
        r'(?:last name|surname)[:\s]+([A-Za-z\s]+)',
    ], text)
    if not name:
        for line in lines[:12]:
            if re.match(r'^[A-Z][A-Z\s,.\-]{5,}$', line.strip()):
                name = line.strip()
                break
    fields['full_name'] = name or ''
    fields['date_of_birth'] = _first_match([
        r'(?:date of birth|birth date|born)[:\s]+([A-Za-z0-9\s,/\-]+)',
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
    ], text) or ''
    fields['sex'] = _first_match([r'(?:sex|gender)[:\s]+(male|female)', r'\b(male|female)\b'], text) or ''
    fields['place_of_birth'] = _first_match([r'(?:place of birth|municipality|city)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['fathers_name'] = _first_match([r"(?:father'?s?\s*name|father)[:\s]+([A-Za-z\s,.\-]+)"], text) or ''
    fields['mothers_name'] = _first_match([r"(?:mother'?s?\s*name|mother)[:\s]+([A-Za-z\s,.\-]+)"], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]+([A-Za-z\s\d\-]+)'], text) or ''
    return fields

def extract_death_fields(text: str, lines: list) -> dict:
    fields = {}
    fields['full_name'] = _first_match([r'(?:name of deceased|name)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['date_of_death'] = _first_match([r'(?:date of death|died)[:\s]+([A-Za-z0-9\s,/\-]+)', r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
    fields['age'] = _first_match([r'(?:age at death|age)[:\s]+(\d+)', r'\b(\d{1,3})\s*(?:years?|yr)'], text) or ''
    fields['sex'] = _first_match([r'(?:sex|gender)[:\s]+(male|female)', r'\b(male|female)\b'], text) or ''
    fields['place_of_death'] = _first_match([r'(?:place of death|died at|hospital|municipality)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['cause_of_death'] = _first_match([r'(?:cause of death|immediate cause)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]+([A-Za-z\s\d\-]+)'], text) or ''
    return fields

def extract_marriage_fields(text: str, lines: list) -> dict:
    fields = {}
    fields['husbands_name'] = _first_match([r"(?:husband'?s?\s*name|groom|husband)[:\s]+([A-Za-z\s,.\-]+)"], text) or ''
    fields['wifes_name'] = _first_match([r"(?:wife'?s?\s*name|bride|wife)[:\s]+([A-Za-z\s,.\-]+)"], text) or ''
    fields['date_of_marriage'] = _first_match([r'(?:date of marriage|married on|wedding date)[:\s]+([A-Za-z0-9\s,/\-]+)', r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
    fields['place_of_marriage'] = _first_match([r'(?:place of marriage|married at|municipality)[:\s]+([A-Za-z\s,.\-]+)'], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]+([A-Za-z\s\d\-]+)'], text) or ''
    return fields

def smart_split_name(full_name: str) -> dict:
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

class SpatialExtractor:
    """Locate OCR values relative to recognized anchor text and coordinates."""
    def __init__(self, raw_results):
        self.items = []
        for bbox, text, prob in raw_results:
            text = text.strip()
            if not text: continue
            xs = [pt[0] for pt in bbox]
            ys = [pt[1] for pt in bbox]
            left, right = min(xs), max(xs)
            top, bottom = min(ys), max(ys)
            self.items.append({
                'text': text, 'left': left, 'right': right,
                'top': top, 'bottom': bottom,
                'cx': (left + right) / 2, 'cy': (top + bottom) / 2,
                'width': right - left, 'height': bottom - top,
                'bbox': bbox, 'prob': prob
            })

    def find_anchor(self, anchor_text):
        anchor_text = anchor_text.lower()
        best_match = None
        for item in self.items:
            if anchor_text in item['text'].lower():
                if best_match is None or len(item['text']) < len(best_match['text']):
                    best_match = item
        return best_match

    def find_right(self, anchor_item, max_dist_x=800, max_dist_y=40):
        if not anchor_item: return ""
        best = None
        min_dist = float('inf')
        for item in self.items:
            if item == anchor_item: continue
            if item['cx'] <= anchor_item['cx']: continue
            dist_x = item['left'] - anchor_item['right']
            dist_y = abs(item['cy'] - anchor_item['cy'])
            if 0 <= dist_x < max_dist_x and dist_y < max_dist_y:
                if dist_x < min_dist:
                    min_dist, best = dist_x, item
        return best['text'] if best else ""

    def find_below(self, anchor_item, max_dist_y=200, max_dist_x=150):
        if not anchor_item: return ""
        best = None
        min_dist = float('inf')
        for item in self.items:
            if item == anchor_item: continue
            if item['cy'] <= anchor_item['cy']: continue
            dist_y = item['top'] - anchor_item['bottom']
            dist_x = abs(item['cx'] - anchor_item['cx'])
            if 0 <= dist_y < max_dist_y and dist_x < max_dist_x:
                if dist_y < min_dist:
                    min_dist, best = dist_y, item
        return best['text'] if best else ""

def extract_birth_fields(text: str, lines: list, raw_results=None) -> dict:
    fields = {}
    
    if raw_results:
        print("Using SpatialExtractor for flexible anchor-based layout parsing.")
        extractor = SpatialExtractor(raw_results)
        
        anchor_name = extractor.find_anchor('name') or extractor.find_anchor('child')
        full_child_name = extractor.find_right(anchor_name) or extractor.find_below(anchor_name)
        fields.update(smart_split_name(full_child_name))
        fields['full_name'] = full_child_name
        
        anchor_sex = extractor.find_anchor('sex') or extractor.find_anchor('gender')
        fields['sex'] = extractor.find_right(anchor_sex) or extractor.find_below(anchor_sex)
        
        anchor_dob = extractor.find_anchor('date of birth') or extractor.find_anchor('born')
        fields['date_of_birth'] = extractor.find_right(anchor_dob) or extractor.find_below(anchor_dob)
        
        anchor_place = extractor.find_anchor('place of birth') or extractor.find_anchor('hospital')
        fields['place_of_birth'] = extractor.find_right(anchor_place) or extractor.find_below(anchor_place)
        
        anchor_father = extractor.find_anchor('father')
        full_father_name = extractor.find_right(anchor_father) or extractor.find_below(anchor_father)
        for k, v in smart_split_name(full_father_name).items(): fields[f'father_{k}'] = v
        
        anchor_mother = extractor.find_anchor('mother') or extractor.find_anchor('maiden')
        full_mother_name = extractor.find_right(anchor_mother) or extractor.find_below(anchor_mother)
        for k, v in smart_split_name(full_mother_name).items(): fields[f'mother_{k}'] = v
        
        anchor_reg = extractor.find_anchor('registry no') or extractor.find_anchor('reg no')
        fields['registry_number'] = extractor.find_right(anchor_reg) or extractor.find_below(anchor_reg)
        
        anchor_brgy = extractor.find_anchor('barangay') or extractor.find_anchor('brgy')
        fields['barangay'] = extractor.find_right(anchor_brgy) or extractor.find_below(anchor_brgy)
        
        # Fallback to RegEx for missing key fields
        if not fields['date_of_birth']:
            fields['date_of_birth'] = _first_match([r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
        return fields

    # Original RegEx fallback if no raw_results
    name_str = _first_match([
        r'(?:name of child|child\'s name|name)[:\s]*([A-Z][A-Za-z\s,.\-]+)',
        r'1\.\s*NAME\s*\([A-Za-z\s]+\)\s*([A-Z\s,.\-]+)', # Form 102 style
    ], text)
    
    if not name_str:
        for line in lines[:20]:
            clean = line.strip()
            # Look for lines that are clearly names (all caps or Title Case)
            if re.match(r'^[A-Z][A-Z\s,.\-]{5,}$', clean) and not any(kw in clean.upper() for kw in ['BIRTH', 'CERTIFICATE', 'CITY', 'MUNICIPALITY']):
                name_str = clean
                break
    
    fields.update(smart_split_name(name_str))
    
    fields['date_of_birth'] = _first_match([
        r'(?:date of birth|birth date|born)[:\s]*([A-Za-z0-9\s,/\-]+)',
        r'3\.\s*DATE OF BIRTH\s*([A-Za-z0-9\s,/\-]+)',
        r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'
    ], text) or ''
    
    fields['sex'] = _first_match([r'(?:sex|gender)[:\s]*(male|female)', r'\b(male|female)\b'], text) or ''
    fields['place_of_birth'] = _first_match([r'(?:place of birth|municipality|city)[:\s]*([A-Za-z\s,.\-]+)'], text) or ''
    fields['registry_number'] = _first_match([r'(?:registry no\.|reg\.?\s*no\.)[:\s]*([A-Z0-9\s\-]+)'], text) or ''

    f_name = _first_match([r"(?:father'?s?\s*name|father)[:\s]*([A-Za-z\s,.\-]+)"], text)
    for k, v in smart_split_name(f_name).items(): fields[f'father_{k}'] = v

    m_name = _first_match([r"(?:mother'?s?\s*name|mother)[:\s]*([A-Za-z\s,.\-]+)"], text)
    for k, v in smart_split_name(m_name).items(): fields[f'mother_{k}'] = v

    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]*([A-Za-z\s\d\-]+)'], text) or ''
    return fields

def extract_death_fields(text: str, lines: list, raw_results=None) -> dict:
    fields = {}
    
    if raw_results:
        extractor = SpatialExtractor(raw_results)
        
        anchor_name = extractor.find_anchor('name') or extractor.find_anchor('deceased')
        full_name = extractor.find_right(anchor_name) or extractor.find_below(anchor_name)
        fields.update(smart_split_name(full_name))
        fields['full_name'] = full_name
        
        anchor_dod = extractor.find_anchor('date of death') or extractor.find_anchor('died')
        fields['date_of_death'] = extractor.find_right(anchor_dod) or extractor.find_below(anchor_dod)
        
        anchor_age = extractor.find_anchor('age')
        fields['age'] = extractor.find_right(anchor_age) or extractor.find_below(anchor_age)
        
        anchor_sex = extractor.find_anchor('sex') or extractor.find_anchor('gender')
        fields['sex'] = extractor.find_right(anchor_sex) or extractor.find_below(anchor_sex)
        
        anchor_place = extractor.find_anchor('place of death') or extractor.find_anchor('hospital')
        fields['place_of_death'] = extractor.find_right(anchor_place) or extractor.find_below(anchor_place)
        
        anchor_cause = extractor.find_anchor('cause of death') or extractor.find_anchor('cause')
        fields['cause_of_death'] = extractor.find_right(anchor_cause) or extractor.find_below(anchor_cause)
        
        anchor_brgy = extractor.find_anchor('barangay') or extractor.find_anchor('brgy')
        fields['barangay'] = extractor.find_right(anchor_brgy) or extractor.find_below(anchor_brgy)
        
        anchor_reg = extractor.find_anchor('registry no') or extractor.find_anchor('reg no')
        fields['registry_number'] = extractor.find_right(anchor_reg) or extractor.find_below(anchor_reg)
        
        if not fields['date_of_death']:
            fields['date_of_death'] = _first_match([r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
        return fields

    # Original RegEx fallback
    name_str = _first_match([r'(?:name of deceased|deceased name|name)[:\s]*([A-Za-z\s,.\-]+)'], text)
    fields.update(smart_split_name(name_str))
    fields['full_name'] = name_str or ''
    fields['date_of_death'] = _first_match([r'(?:date of death|died)[:\s]*([A-Za-z0-9\s,/\-]+)', r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
    fields['age'] = _first_match([r'(?:age at death|age)[:\s]*(\d+)', r'\b(\d{1,3})\s*(?:years?|yr)'], text) or ''
    fields['sex'] = _first_match([r'(?:sex|gender)[:\s]*(male|female)', r'\b(male|female)\b'], text) or ''
    fields['place_of_death'] = _first_match([r'(?:place of death|died at|hospital|municipality)[:\s]*([A-Za-z\s,.\-]+)'], text) or ''
    fields['cause_of_death'] = _first_match([r'(?:cause of death|immediate cause)[:\s]*([A-Za-z\s,.\-]+)'], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]*([A-Za-z\s\d\-]+)'], text) or ''
    fields['registry_number'] = _first_match([r'(?:registry no\.|reg\.?\s*no\.)[:\s]*([A-Z0-9\s\-]+)'], text) or ''
    return fields

def extract_marriage_fields(text: str, lines: list, raw_results=None) -> dict:
    fields = {}
    
    if raw_results:
        extractor = SpatialExtractor(raw_results)
        
        anchor_husband = extractor.find_anchor('husband') or extractor.find_anchor('groom')
        full_husband = extractor.find_right(anchor_husband) or extractor.find_below(anchor_husband)
        for k, v in smart_split_name(full_husband).items(): fields[f'husband_{k}'] = v
        fields['husbands_name'] = full_husband
        
        anchor_wife = extractor.find_anchor('wife') or extractor.find_anchor('bride')
        full_wife = extractor.find_right(anchor_wife) or extractor.find_below(anchor_wife)
        for k, v in smart_split_name(full_wife).items(): fields[f'wife_{k}'] = v
        fields['wifes_name'] = full_wife
        
        anchor_dom = extractor.find_anchor('date of marriage') or extractor.find_anchor('married on')
        fields['date_of_marriage'] = extractor.find_right(anchor_dom) or extractor.find_below(anchor_dom)
        
        anchor_place = extractor.find_anchor('place of marriage') or extractor.find_anchor('married at')
        fields['place_of_marriage'] = extractor.find_right(anchor_place) or extractor.find_below(anchor_place)
        
        anchor_brgy = extractor.find_anchor('barangay') or extractor.find_anchor('brgy')
        fields['barangay'] = extractor.find_right(anchor_brgy) or extractor.find_below(anchor_brgy)
        
        anchor_reg = extractor.find_anchor('registry no') or extractor.find_anchor('reg no')
        fields['registry_number'] = extractor.find_right(anchor_reg) or extractor.find_below(anchor_reg)
        
        if not fields['date_of_marriage']:
            fields['date_of_marriage'] = _first_match([r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
        return fields

    # Original RegEx fallback
    h_name = _first_match([r"(?:husband'?s?\s*name|groom|husband)[:\s]*([A-Za-z\s,.\-]+)"], text)
    for k, v in smart_split_name(h_name).items(): fields[f'husband_{k}'] = v
    fields['husbands_name'] = h_name or ''
    
    w_name = _first_match([r"(?:wife'?s?\s*name|bride|wife)[:\s]*([A-Za-z\s,.\-]+)"], text)
    for k, v in smart_split_name(w_name).items(): fields[f'wife_{k}'] = v
    fields['wifes_name'] = w_name or ''
    
    fields['date_of_marriage'] = _first_match([r'(?:date of marriage|married on|wedding date)[:\s]*([A-Za-z0-9\s,/\-]+)', r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})'], text) or ''
    fields['place_of_marriage'] = _first_match([r'(?:place of marriage|married at|municipality)[:\s]*([A-Za-z\s,.\-]+)'], text) or ''
    fields['barangay'] = _first_match([r'(?:barangay|brgy\.?)[:\s]*([A-Za-z\s\d\-]+)'], text) or ''
    fields['registry_number'] = _first_match([r'(?:registry no\.|reg\.?\s*no\.)[:\s]*([A-Z0-9\s\-]+)'], text) or ''
    return fields

def extract_fields(doc_type: str, text: str, lines: list, raw_results=None) -> dict:
    """Dispatch spatial or regex field extraction for a document type."""
    if doc_type == 'birth': return extract_birth_fields(text, lines, raw_results)
    elif doc_type == 'death': return extract_death_fields(text, lines, raw_results)
    elif doc_type == 'marriage': return extract_marriage_fields(text, lines, raw_results)
    return {}

# -- OCR Reader (Persistent) --------------------------------------------------
_reader = None
def get_reader():
    """Return the shared lazily initialized EasyOCR reader."""
    global _reader
    if _reader is None:
        try:
            REDER_LANGS = ['en', 'tl']
            print(f"Loading EasyOCR models for {REDER_LANGS} (First run)...")
            import easyocr
            import torch
            use_gpu = torch.cuda.is_available()
            if use_gpu:
                print("Dedicated GPU detected. Hardware acceleration enabled.")
            else:
                print("No GPU detected. Running in CPU mode.")
                
            _reader = easyocr.Reader(REDER_LANGS, gpu=use_gpu, verbose=False)
        except Exception as e:
            print(f"Failed to load EasyOCR: {e}")
            return None
    return _reader

if PYTESSERACT_AVAILABLE:
    print("PyTesseract is available! Will prioritize it for extreme speed on images.")
else:
    print("PyTesseract not found. EasyOCR will be loaded on first use (Accurate but slower on CPU).")
load_template_profiles()
print("OCR Server initialized.")

def preprocess_image(image_path: str, output_path: str = None) -> str:
    """Prepare an image for OCR while returning its processed file path."""
    """
    Cleans up the image for better OCR accuracy:
    - Deskewing (Straighten the document)
    - Adaptive Thresholding (removes shadows/noise)
    - Denoising
    """
    print(f"Applying OpenCV pre-processing to: {image_path}")
    try:
        img = cv2.imread(image_path)
        if img is None:
            return image_path

        # 1. Grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Deskewing
        coords = np.column_stack(np.where(gray < 127))
        if len(coords) > 0:
            rect = cv2.minAreaRect(coords)
            angle = rect[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            
            if abs(angle) > 0.5:
                print(f"Deskewing document by {round(angle, 2)} degrees.")
                (h, w) = img.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                gray = cv2.warpAffine(gray, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

        # 3. Denoising
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        # Modern OCR engines (EasyOCR, Tesseract LSTM) perform much better on raw grayscale
        # rather than harshly binarized images. We will skip adaptive thresholding.
        processed = denoised

        if not output_path:
            base, ext = os.path.splitext(image_path)
            output_path = f"{base}_proc{ext}"
        
        cv2.imwrite(output_path, processed)
        print(f"Pre-processing complete: {output_path}")
        return output_path
    except Exception as e:
        print(f"Pre-processing failed: {e}")
        return image_path

class OCRRequest(BaseModel):
    file_path: str
    doc_type: str = "birth"
    languages: str = "en,tl"
    ocr_mode: Literal["fast", "balanced", "accurate"] = "balanced"
    preprocess: bool = True

class SplitRequest(BaseModel):
    file_path: str
    ocr_confidence: Optional[float] = None
    base_zoom: float = 1.35
    boosted_zoom: float = 1.8
    low_confidence_threshold: float = 0.75
    max_dimension: Optional[int] = 2000
    image_format: Literal["jpeg", "webp"] = "jpeg"
    image_quality: int = 75

@app.get('/status')
def status():
    engine = "pytesseract_easyocr_fallback" if PYTESSERACT_AVAILABLE else "easyocr"
    return {"status": "ready", "engine": engine, "persistent": True}

@app.post('/split')
@serialize_processing
def split_pdf(data: SplitRequest):
    file_path = data.file_path
    ext = _validate_input_file(file_path, expected_extensions=['.pdf'])

    try:
        with fitz.open(file_path) as doc:
            if len(doc) == 0:
                raise HTTPException(status_code=400, detail='PDF contains no pages.')
            image_paths = []
            base_dir = os.path.dirname(file_path)
            base_name = os.path.splitext(os.path.basename(file_path))[0]

            base_zoom = max(1.0, min(data.base_zoom, 3.0))
            boosted_zoom = max(base_zoom, min(data.boosted_zoom, 3.0))
            use_boosted_zoom = (
                data.ocr_confidence is not None
                and data.ocr_confidence < data.low_confidence_threshold
            )
            zoom = boosted_zoom if use_boosted_zoom else base_zoom
            max_dimension = data.max_dimension if (data.max_dimension and data.max_dimension > 0) else None
            image_format = data.image_format.lower()
            image_quality = max(1, min(data.image_quality, 100))
            output_ext = "jpg" if image_format == "jpeg" else "webp"
            output_format = "JPEG" if image_format == "jpeg" else "WEBP"

            print(
                "split_pdf settings: "
                f"zoom={zoom:.2f} (boosted={use_boosted_zoom}), "
                f"format={output_format}, quality={image_quality}, "
                f"max_dimension={max_dimension}"
            )

            for i in range(min(1, len(doc))):
                page = doc.load_page(i)
                page_start = time.perf_counter()
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat)

                pil_mode = "RGBA" if pix.alpha else "RGB"
                pil_image = Image.frombytes(pil_mode, (pix.width, pix.height), pix.samples)
                grayscale_image = pil_image.convert("L")

                if max_dimension:
                    resample_filter = getattr(Image, "Resampling", Image).LANCZOS
                    grayscale_image.thumbnail((max_dimension, max_dimension), resample_filter)

                img_path = os.path.join(base_dir, f"{base_name}_page_{i+1}.{output_ext}")
                save_kwargs = {"format": output_format, "quality": image_quality}
                if output_format == "JPEG":
                    save_kwargs["optimize"] = True
                elif output_format == "WEBP":
                    save_kwargs["method"] = 6

                grayscale_image.save(img_path, **save_kwargs)
                image_paths.append(img_path)

                page_elapsed = time.perf_counter() - page_start
                print(
                    f"Rendered page {i + 1}/{len(doc)} in {page_elapsed:.3f}s "
                    f"at {grayscale_image.width}x{grayscale_image.height}"
                )

            return {"success": True, "pages": image_paths, "total": len(image_paths)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        image_paths = []
        base_dir = os.path.dirname(file_path)
        base_name = os.path.splitext(os.path.basename(file_path))[0]
        
        base_zoom = max(1.0, min(data.base_zoom, 3.0))
        boosted_zoom = max(base_zoom, min(data.boosted_zoom, 3.0))
        use_boosted_zoom = (
            data.ocr_confidence is not None
            and data.ocr_confidence < data.low_confidence_threshold
        )
        zoom = boosted_zoom if use_boosted_zoom else base_zoom
        max_dimension = data.max_dimension if (data.max_dimension and data.max_dimension > 0) else None
        image_format = data.image_format.lower()
        image_quality = max(1, min(data.image_quality, 100))
        output_ext = "jpg" if image_format == "jpeg" else "webp"
        output_format = "JPEG" if image_format == "jpeg" else "WEBP"

        print(
            "split_pdf settings: "
            f"zoom={zoom:.2f} (boosted={use_boosted_zoom}), "
            f"format={output_format}, quality={image_quality}, "
            f"max_dimension={max_dimension}"
        )

        for i in range(len(doc)):
            page = doc.load_page(i)
            page_start = time.perf_counter()
            # Render page to an image with adaptive zoom for OCR speed/quality balance
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)

            pil_mode = "RGBA" if pix.alpha else "RGB"
            pil_image = Image.frombytes(pil_mode, (pix.width, pix.height), pix.samples)
            grayscale_image = pil_image.convert("L")

            if max_dimension:
                resample_filter = getattr(Image, "Resampling", Image).LANCZOS
                grayscale_image.thumbnail((max_dimension, max_dimension), resample_filter)

            img_path = os.path.join(base_dir, f"{base_name}_page_{i+1}.{output_ext}")
            save_kwargs = {"format": output_format, "quality": image_quality}
            if output_format == "JPEG":
                save_kwargs["optimize"] = True
            elif output_format == "WEBP":
                save_kwargs["method"] = 6

            grayscale_image.save(img_path, **save_kwargs)
            image_paths.append(img_path)

            page_elapsed = time.perf_counter() - page_start
            print(
                f"Rendered page {i + 1}/{len(doc)} in {page_elapsed:.3f}s "
                f"at {grayscale_image.width}x{grayscale_image.height}"
            )
            
        return {"success": True, "pages": image_paths, "total": len(image_paths)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

SIGNATURE_COORDS = {
    "birth": {
        "attendant_signature": {"x": 0.22, "y": 0.52, "w": 0.25, "h": 0.045},
        "informant_signature": {"x": 0.23, "y": 0.60, "w": 0.25, "h": 0.045},
        "prepared_by_signature": {"x": 0.58, "y": 0.60, "w": 0.25, "h": 0.045},
        "received_by_signature": {"x": 0.23, "y": 0.70, "w": 0.25, "h": 0.045},
        "registered_by_signature": {"x": 0.58, "y": 0.70, "w": 0.25, "h": 0.045},
    }
}

import base64

def crop_and_binarize_signatures(image_path: str, doc_type: str) -> dict:
    """Extract configured signature regions as transparent PNG data URLs."""
    """
    Crops the signature regions from the scanned image according to defined coordinates,
    applies adaptive threshold binarization to isolate the ink from the background paper,
    renders the background transparent (RGBA alpha = 0), and returns base64 PNG data.
    """
    if doc_type not in SIGNATURE_COORDS:
        return {}
    
    signatures = {}
    try:
        # Load the image using OpenCV
        img = cv2.imread(image_path)
        if img is None:
            # Fallback to Pillow
            pil_img = Image.open(image_path)
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        
        height, width = img.shape[:2]
        
        for key, coord in SIGNATURE_COORDS[doc_type].items():
            # Calculate pixel boundaries
            x1 = int(coord["x"] * width)
            y1 = int(coord["y"] * height)
            w = int(coord["w"] * width)
            h = int(coord["h"] * height)
            x2 = min(width, x1 + w)
            y2 = min(height, y1 + h)
            
            if x2 <= x1 or y2 <= y1:
                continue
                
            crop = img[y1:y2, x1:x2]
            
            # Convert crop to grayscale
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            # Denoise slightly
            gray = cv2.GaussianBlur(gray, (3, 3), 0)
            # Otsu's thresholding to separate background (255) and ink (0)
            _, binarized = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
            
            # Check ink density (prevent noise crops/blank signature frames)
            total_pixels = binarized.size
            black_pixels = np.sum(binarized == 0)
            black_ratio = black_pixels / total_pixels if total_pixels > 0 else 0.0
            
            if black_ratio < 0.005:  # Less than 0.5% dark pixels means probably blank/no signature
                signatures[key] = "n/a"
                continue
            
            # Build RGBA image where background pixels (binarized == 255) are transparent
            rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA)
            rgba[binarized == 255, 3] = 0  # Set alpha channel to 0 (fully transparent) for background paper
            
            # Encode transparent crop to PNG base64 data URL
            _, buffer = cv2.imencode('.png', rgba)
            base64_str = base64.b64encode(buffer).decode('utf-8')
            signatures[key] = f"data:image/png;base64,{base64_str}"
            
    except Exception as e:
        print(f"Error in crop_and_binarize_signatures: {e}")
        
    return signatures

current_key_index = 0

@app.post('/ocr/gemini')
@serialize_processing
def process_ocr_gemini(data: dict):
    """Process a document with Gemini OCR and normalize its structured output."""
    global current_key_index
    file_path = data.get('file_path')
    doc_type = data.get('doc_type', 'birth')
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")
        
    print(f"Processing Gemini OCR for: {file_path}")
    
    # Read API keys
    api_keys = []
    keys_str = os.environ.get("GEMINI_API_KEYS")
    
    if not keys_str:
        env_path = Path(__file__).resolve().parent / '.env'
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('GEMINI_API_KEYS='):
                        keys_str = line.split('=', 1)[1].strip().strip('"').strip("'")
                        break
                    elif line.startswith('GEMINI_API_KEY='):
                        keys_str = line.split('=', 1)[1].strip().strip('"').strip("'")
                        
    if keys_str:
        api_keys = [k.strip() for k in keys_str.split(',') if k.strip()]
    else:
        single_key = os.environ.get("GEMINI_API_KEY")
        if single_key:
            api_keys = [single_key]
            
    if not api_keys:
        raise HTTPException(status_code=500, detail="No Gemini API keys found in environment or .env file.")
        
    print(f"Found {len(api_keys)} API keys for rotation.")
    
    ext = Path(file_path).suffix.lower()
    img = None
    if ext == '.pdf':
        try:
            import fitz
            doc = fitz.open(file_path)
            page = doc.load_page(0)
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")
    else:
        try:
            img = Image.open(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to open image: {str(e)}")
            
    # -- TOKEN OPTIMIZATION / BUDGET SAVINGS --
    # Downscale the loaded image to a maximum dimension of 1024px.
    # Gemini calculates image tokens based on 768x768 pixel tiles (each tile costs 258 tokens).
    # Downscaling to 1024px preserves maximum text readability for OCR while keeping
    # the image within 2 tiles (516 tokens). This reduces token costs significantly.
    if img:
        max_size = 1024
        if max(img.size) > max_size:
            orig_w, orig_h = img.size
            resample_filter = getattr(Image, "Resampling", Image).LANCZOS
            img.thumbnail((max_size, max_size), resample_filter)
            print(f"Optimized tokens: Image resized from {orig_w}x{orig_h} to {img.size[0]}x{img.size[1]}")
            
    # Dynamic prompt selection based on doc_type
    doc_type_clean = str(doc_type).lower().strip()
    
    if doc_type_clean == 'marriage' or doc_type_clean == 'marriage_license':
        prompt = """
        You are an expert system for reading Philippine Civil Registry documents (specifically Certificate of Marriage / Marriage License).
        CRITICAL SAFETY REQUIREMENT: You MUST verify if the provided image is an official Philippine Civil Registry Document (Birth, Death, or Marriage Certificate). If the image is NOT a civil registry document (for example: a photo of a person, animal, vehicle, landscape, random text, meme, or blank paper), set "is_valid_document": false and set "document_validation_error" to a clear message describing why it was rejected.
        Please extract the data from this image and return it in a clean JSON format.
        Return ONLY the JSON object. Do not include any markdown formatting or extra text outside the JSON.
        
        The valid options for the 'barangay' field are:
        'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
        'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
        'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
        'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
        'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
        'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
        Please map the extracted barangay to the closest match from this list if possible.
        
        JSON Structure to follow (use null for empty or unreadable fields):
        {
          "is_valid_document": true,
          "document_validation_error": null,
          "registry_number": null,
          "province": null,
          "city_municipality": null,
          "barangay": null,
          "date_of_marriage": null,
          "place_of_marriage": null,
          "time_of_marriage": null,
          
          "husband_first_name": null,
          "husband_middle_name": null,
          "husband_last_name": null,
          "husband_suffix": null,
          "husband_dob": null,
          "husband_age": null,
          "husband_place_of_birth": null,
          "husband_citizenship": null,
          "husband_residence": null,
          "husband_religion": null,
          "husband_civil_status": null,
          "husband_father_name": null,
          "husband_father_citizenship": null,
          "husband_mother_maiden_name": null,
          "husband_mother_citizenship": null,
          "husband_consent_person": null,
          "husband_consent_relationship": null,
          "husband_consent_residence": null,
          
          "wife_first_name": null,
          "wife_middle_name": null,
          "wife_last_name": null,
          "wife_suffix": null,
          "wife_dob": null,
          "wife_age": null,
          "wife_place_of_birth": null,
          "wife_citizenship": null,
          "wife_residence": null,
          "wife_religion": null,
          "wife_civil_status": null,
          "wife_father_name": null,
          "wife_father_citizenship": null,
          "wife_mother_maiden_name": null,
          "wife_mother_citizenship": null,
          "wife_consent_person": null,
          "wife_consent_relationship": null,
          "wife_consent_residence": null,
          
          "marriage_license_no": null,
          "marriage_license_issued_on": null,
          "marriage_license_issued_at": null,
          "solemnizing_officer_name": null,
          "solemnizing_officer_title": null,
          "solemnizing_officer_religion_sect": null,
          "solemnizing_officer_registry_no": null,
          "solemnizing_officer_expiry": null,
          
          "witness_1_name": null,
          "witness_2_name": null,
          "prepared_by_name": null,
          "prepared_by_date": null,
          "registered_by_name": null,
          "registered_by_date": null,
          "remarks": null
        }
        """
    elif doc_type_clean == 'death':
        prompt = """
        You are an expert system for reading Philippine Civil Registry documents (specifically Certificate of Death).
        CRITICAL SAFETY REQUIREMENT: You MUST verify if the provided image is an official Philippine Civil Registry Document (Birth, Death, or Marriage Certificate). If the image is NOT a civil registry document (for example: a photo of a person, animal, vehicle, landscape, random text, meme, or blank paper), set "is_valid_document": false and set "document_validation_error" to a clear message describing why it was rejected.
        Please extract the data from this image and return it in a clean JSON format.
        Return ONLY the JSON object. Do not include any markdown formatting or extra text outside the JSON.
        
        The valid options for the 'barangay' field are:
        'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
        'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
        'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
        'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
        'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
        'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
        Please map the extracted barangay to the closest match from this list if possible.
        
        JSON Structure to follow (use null for empty or unreadable fields):
        {
          "is_valid_document": true,
          "document_validation_error": null,
          "registry_number": null,
          "province": null,
          "city_municipality": null,
          "barangay": null,
          
          "first_name": null,
          "middle_name": null,
          "last_name": null,
          "suffix": null,
          "sex": null,
          "date_of_death": null,
          "date_of_birth": null,
          "age": null,
          "age_completed_years": null,
          "age_months": null,
          "age_days": null,
          "age_hours": null,
          "age_minutes": null,
          "place_of_death": null,
          "civil_status": null,
          "religion": null,
          "citizenship": null,
          "residence": null,
          "occupation": null,
          
          "father_name": null,
          "mother_maiden_name": null,
          
          "cause_of_death": null,
          "cause_of_death_immediate": null,
          "cause_of_death_antecedent": null,
          "cause_of_death_underlying": null,
          "other_significant_conditions": null,
          "maternal_condition": null,
          "manner_of_death": null,
          "place_of_external_cause": null,
          "autopsy": null,
          
          "attendant_type": null,
          "attendant_other": null,
          "attendant_duration_from": null,
          "attendant_duration_to": null,
          
          "certifying_officer_name": null,
          "certifying_officer_title": null,
          "certifying_officer_address": null,
          "certifying_officer_date": null,
          "reviewed_by_name": null,
          
          "corpse_disposal": null,
          "burial_permit_number": null,
          "burial_permit_date_issued": null,
          "transfer_permit_number": null,
          "transfer_permit_date_issued": null,
          "cemetery_address": null,
          
          "informant_name": null,
          "informant_relationship": null,
          "informant_address": null,
          "informant_date": null,
          
          "prepared_by_name": null,
          "prepared_by_title": null,
          "prepared_by_date": null,
          "received_by_name": null,
          "received_by_title": null,
          "received_by_date": null,
          "registered_by_name": null,
          "registered_by_title": null,
          "registered_by_date": null,
          "remarks": null
        }
        """
    else:
        # Default/Birth
        prompt = """
        You are an expert system for reading Philippine Civil Registry documents (specifically Certificate of Live Birth).
        CRITICAL SAFETY REQUIREMENT: You MUST verify if the provided image is an official Philippine Civil Registry Document (Birth, Death, or Marriage Certificate). If the image is NOT a civil registry document (for example: a photo of a person, animal, vehicle, landscape, random text, meme, or blank paper), set "is_valid_document": false and set "document_validation_error" to a clear message describing why it was rejected.
        There may be different varieties of this form (e.g., older forms from 1958, newer forms from 1993, or others).
        Please extract the data from this image and return it in a clean JSON format.
        Return ONLY the JSON object. Do not include any markdown formatting or extra text outside the JSON.
        
        The valid options for the 'barangay' field are:
        'Gomez-Zamora (Pob.)', 'Capt. C. Nazareno (Pob.)', 'Ibayo Silangan', 'Ibayo Estacion', 'Kanluran',
        'Makina', 'Sapa', 'Bucana Malaki', 'Bucana Sasahan', 'Bagong Karsada',
        'Balsahan', 'Bancaan', 'Muzon', 'Latoria', 'Labac',
        'Mabolo', 'San Roque', 'Santulan', 'Molino', 'Calubcob',
        'Halang', 'Malainen Bago', 'Malainen Luma', 'Palangue 1', 'Palangue 2 & 3',
        'Humbac', 'Munting Mapino', 'Sabang', 'Timalan Balsahan', 'Timalan Concepcion'
        Please map the extracted barangay to the closest match from this list if possible.
        
        Special Instructions:
        - For 'mother_children_dead', if the value is '0', blank, not specified, or indicates none, please return 'None' instead of null.
        - For marriage date fields ('marriage_parents_day', 'marriage_parents_month', 'marriage_parents_year'), if the document indicates the date is unknown, forgotten, or not applicable, you may return the text found (e.g., 'Forgotten') instead of a number.
        - For 'office_registry_code' (Registry Coding), if it contains a sequence of numbers, please return them with a space between each digit (e.g., '1 2 3 4').
        - **Form Varieties**: If the document is an older version (like the 1958 form), some field labels may differ. Please map them logically to the target schema. For example, "Usual Residence" or similar address fields should map to the corresponding residence fields (e.g., `mother_residence_house` or `place_of_birth_city` depending on context).
        
        JSON Structure to follow (use null for empty or unreadable fields):
        {
          "is_valid_document": true,
          "document_validation_error": null,
          "registry_number": null, "province": null, "city_municipality": null, "barangay": null,
          "first_name": null, "middle_name": null, "last_name": null, "sex": null,
          "dob_day": null, "dob_month": null, "dob_year": null,
          "place_of_birth_hospital": null, "place_of_birth_city": null, "place_of_birth_province": null,
          "type_of_birth": null, "multiple_birth_order": null, "birth_order": null, "weight_at_birth": null,
          
          "mother_first_name": null, "mother_middle_name": null, "mother_last_name": null,
          "mother_citizenship": null, "mother_religion": null,
          "mother_children_total": null, "mother_children_living": null, "mother_children_dead": null,
          "mother_occupation": null, "mother_age": null,
          "mother_residence_house": null, "mother_residence_city": null, "mother_residence_province": null, "mother_residence_country": null,
          
          "father_first_name": null, "father_middle_name": null, "father_last_name": null,
          "father_citizenship": null, "father_religion": null,
          "father_occupation": null, "father_age": null,
          "father_residence_house": null, "father_residence_city": null, "father_residence_province": null, "father_residence_country": null,
          
          "marriage_parents_day": null, "marriage_parents_month": null, "marriage_parents_year": null,
          "marriage_parents_place_city": null, "marriage_parents_place_province": null, "marriage_parents_place_country": null,
          
          "attendant_type": null, "attendant_time": null,
          "attendant_name": null, "attendant_title": null, "attendant_address": null, "attendant_date": null,
          
          "informant_name": null, "informant_relationship": null, "informant_address": null, "informant_date": null,
          
          "prepared_by_name": null, "prepared_by_title": null, "prepared_by_date": null,
          "received_by_name": null, "received_by_title": null, "received_by_date": null,
          "registered_by_name": null, "registered_by_title": null, "registered_by_date": null,
          
          "remarks": null, "office_registry_code": null
        }
        """
    
    retry_delay = 5  # shorter delay because we switch keys
    response = None
    
    # Prioritize primary key (index 0, e.g. Paid API key) and use others as fallback backup.
    keys_to_try = []
    if len(api_keys) > 0:
        # First key is primary
        keys_to_try.append((0, api_keys[0]))
        # Remaining keys are backup (rotating backups to distribute load)
        backup_indices = list(range(1, len(api_keys)))
        if backup_indices:
            start_back_idx = current_key_index % len(backup_indices)
            rotated_backups = backup_indices[start_back_idx:] + backup_indices[:start_back_idx]
            for idx in rotated_backups:
                keys_to_try.append((idx, api_keys[idx]))
    else:
        raise HTTPException(status_code=500, detail="No Gemini API keys found.")

    for attempt, (key_idx, key) in enumerate(keys_to_try):
        print(f"Using API Key index {key_idx} (Attempt {attempt+1}/{len(keys_to_try)})")
        
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model='gemini-3.6-flash',
                contents=[img, prompt],
                config={
                    "response_mime_type": "application/json"
                }
            )
            
            # Keep backup key distribution rotated if backup keys are used
            if key_idx > 0:
                current_key_index = key_idx
            break  # success!
        except Exception as e:
            print(f"DEBUG GEMINI ERROR: {e}")
            err_str = str(e)
            if '429' in err_str or '503' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                if attempt < len(keys_to_try) - 1:
                    print(f"Key {key_idx} rate limited. Retrying with next key in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
            raise HTTPException(status_code=500, detail=f"Gemini API error after {attempt+1} attempts: {err_str}")
            
    if not response:
        raise HTTPException(status_code=500, detail="Gemini API failed to return a response.")
        
    clean_text = response.text.strip()
    if clean_text.startswith("```json"):
        clean_text = clean_text[7:]
    if clean_text.endswith("```"):
        clean_text = clean_text[:-3]
    clean_text = clean_text.strip()
    
    try:
        extracted_data = json.loads(clean_text)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse JSON from Gemini response: {str(e)}. Response was: {clean_text}")
    
    if extracted_data.get("is_valid_document") is False:
        err_msg = extracted_data.get("document_validation_error") or "The uploaded image does not appear to be an official Civil Registry document (Birth, Death, or Marriage certificate)."
        print(f"Document Validation Failed: {err_msg}")
        return {
            "success": False,
            "error": "Invalid Document Uploaded",
            "detail": err_msg,
            "is_valid_document": False,
            "extracted_fields": {},
            "image_token_cost": 258
        }

    # Extract signature crops
    signatures = crop_and_binarize_signatures(file_path, doc_type)
    for k, v in signatures.items():
        extracted_data[k] = v

    # Calculate image token cost based on 768x768 pixel tiles
    img_w, img_h = img.size if img else (1200, 1200)
    tiles = math.ceil(img_w / 768) * math.ceil(img_h / 768)
    image_token_cost = tiles * 258

    total_used_val = 0
    try:
        if data.get('total_tokens_used') is not None:
            total_used_val = int(data.get('total_tokens_used'))
    except Exception:
        pass

    budget_val = 1000000
    try:
        if data.get('token_budget') is not None:
            budget_val = int(data.get('token_budget'))
        else:
            budget_val = int(os.getenv('GEMINI_TOKEN_BUDGET', '1000000'))
    except Exception:
        pass

    print(f"\n========================================")
    print(f" Gemini OCR Scan Token Usage Summary:")
    print(f" - Document Type: {doc_type}")
    print(f" - Image Size   : {img_w}x{img_h}")
    print(f" - Tile Count   : {tiles} (each tile is 258 tokens)")
    print(f" - Token Cost   : {image_token_cost:,}/1,000,000 tokens")
    print(f" - Cumulative   : {total_used_val + image_token_cost:,}/{budget_val:,} tokens used")
    print(f"========================================\n")

    return {
        "success": True,
        "detected_type": doc_type,
        "extracted_fields": extracted_data,
        "engine_used": "gemini-3.6-flash",
        "quick_fill_used": True,
        "image_token_cost": image_token_cost
    }


@app.post('/ocr')
@serialize_processing
def process_ocr(data: OCRRequest):
    """Run the selected OCR engines and return normalized certificate data."""
    file_path = data.file_path
    ext = _validate_input_file(file_path)
    expected_type = data.doc_type
    languages = data.languages.split(',')
    ocr_mode = data.ocr_mode

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    print(f"Processing OCR for: {file_path}")
    ext = Path(file_path).suffix.lower()
    avg_conf = 0
    lines, scores = [], []
    quick_fill_used = False
    field_confidence = {}
    detected_template_family = None
    quick_fill_debug = {
        "marker_hits": 0,
        "fallback_reason": "",
    }

    if ext == '.docx' and docx:
        print(f"Extracting text natively from DOCX (Bypassing OCR): {file_path}")
        try:
            doc = docx.Document(file_path)
            lines = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            scores = [1.0] * len(lines) # Perfect confidence for digital text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"DOCX extraction failed: {str(e)}")
    elif ext in ['.txt', '.rtf']:
        print(f"Reading raw text file natively (Bypassing OCR): {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = [line.strip() for line in content.split('\n') if line.strip()]
                scores = [1.0] * len(lines)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"TXT read failed: {str(e)}")
    else:
        # Image processing
        ocr_engine_used = "none"
        fast_mode_min_chars = 80
        # Tesseract struggles heavily with table grids and small fonts on complex certificates.
        # We lowered this from 0.75 to 0.45 so that the fast engine is used more often.
        fast_mode_min_conf = 0.45

        # Apply OpenCV pre-processing if requested
        original_file_path = file_path
        if data.preprocess:
            file_path = preprocess_image(original_file_path)

        def run_easyocr():
            reader = get_reader()
            if not reader:
                return [], [], []
            try:
                print("Running EasyOCR...")
                results = reader.readtext(file_path)
                easy_lines, easy_scores = [], []
                for (_bbox, text, prob) in results:
                    if text.strip():
                        easy_lines.append(text.strip())
                        easy_scores.append(round(prob, 3))
                print("EasyOCR completed.")
                return easy_lines, easy_scores, results
            except Exception as e:
                print(f"EasyOCR failed: {e}")
                return [], [], []

        def run_tesseract():
            if not PYTESSERACT_AVAILABLE:
                return [], [], []
            try:
                print("Running PyTesseract...")
                img = Image.open(file_path)
                # psm 6: Assume a single uniform block of text. 
                # This forces Tesseract to read left-to-right and keeps horizontally aligned fields 
                # (like "Province CAVITE") on the same line, while ignoring scattered noise.
                custom_config = r'--oem 3 --psm 6'
                data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT, config=custom_config)
                tess_lines = []
                tess_scores = []
                tess_raw = []
                
                n_boxes = len(data['level'])
                current_line = []
                current_line_scores = []
                last_line_id = None

                for i in range(n_boxes):
                    text = data['text'][i].strip()
                    conf = int(data['conf'][i])
                    # Lowered from 20 to 10 to capture more text even if low confidence
                    if conf > 10 and text:
                        line_id = f"{data['block_num'][i]}_{data['par_num'][i]}_{data['line_num'][i]}"
                        
                        if line_id != last_line_id and current_line:
                            # Push previous line
                            tess_lines.append(" ".join(current_line))
                            tess_scores.append(sum(current_line_scores) / len(current_line_scores))
                            current_line = []
                            current_line_scores = []
                            
                        current_line.append(text)
                        current_line_scores.append(conf / 100.0)
                        last_line_id = line_id
                        
                        x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
                        bbox = [[x, y], [x+w, y], [x+w, y+h], [x, y+h]]
                        prob = conf / 100.0
                        tess_raw.append((bbox, text, prob))

                if current_line:
                    tess_lines.append(" ".join(current_line))
                    tess_scores.append(sum(current_line_scores) / len(current_line_scores))
                            
                print("PyTesseract completed.")
                return tess_lines, tess_scores, tess_raw
            except Exception as e:
                print(f"PyTesseract failed: {e}")
                return [], [], []

        # Quick-fill pre-check: detect known template families via header anchors,
        # then OCR only pre-defined ROIs for target autofill fields.
        detected_template_family, _, marker_hits = detect_template_family(file_path)
        quick_fill_debug["marker_hits"] = marker_hits
        if detected_template_family:
            if expected_type and expected_type not in ('unknown', '') and detected_template_family != expected_type:
                quick_fill_debug["fallback_reason"] = (
                    f"template_expected_type_mismatch({detected_template_family}!={expected_type})"
                )
                detected_template_family = None
            else:
                print(f"Quick-fill template detected: {detected_template_family}")
                quick_fields, quick_meta = quick_fill_extract_from_rois(file_path, detected_template_family)
                field_confidence.update(quick_meta)
    
                required_fields = QUICK_FILL_REQUIRED_FIELDS.get(detected_template_family, [])
                required_field_confs = [
                    field_confidence.get(field, {}).get('confidence', 0.0)
                    for field in required_fields
                ]
                avg_roi_conf = (
                    sum(required_field_confs) / len(required_field_confs)
                    if required_field_confs else 0.0
                )
                missing_required = [
                    field for field in required_fields if not (quick_fields.get(field) or '').strip()
                ]
                low_conf_fields = [
                    field for field in required_fields
                    if field_confidence.get(field, {}).get('low_confidence')
                ]
                should_run_full_ocr = bool(
                    missing_required
                    or low_conf_fields
                    or avg_roi_conf < QUICK_FILL_MIN_CONFIDENCE
                )
    
                if quick_fields:
                    quick_fill_used = not should_run_full_ocr
                    extracted_fields = quick_fields if quick_fill_used else {}
                    # NOTE: Do NOT overwrite `lines` here. `lines` must always contain the
                    # raw OCR text so that the full-page text blob is clean and readable.
                    # The extracted_fields dict is the correct place for structured ROI output.
                    scores = required_field_confs if required_field_confs else []
                    ocr_engine_used = "quick_fill_roi"
                    print(
                        "Quick-fill ROI result "
                        f"(avg_conf={round(avg_roi_conf, 3)}, missing={missing_required}, low={low_conf_fields})"
                    )
    
                if should_run_full_ocr:
                    if missing_required:
                        quick_fill_debug["fallback_reason"] = f"missing_required_fields({','.join(missing_required)})"
                    elif low_conf_fields:
                        quick_fill_debug["fallback_reason"] = f"low_confidence_fields({','.join(low_conf_fields)})"
                    else:
                        quick_fill_debug["fallback_reason"] = "avg_roi_confidence_below_threshold"
                    print("Quick-fill confidence low; running full-page OCR fallback.")
                    lines, scores = [], []
                    quick_fill_used = False

        if not detected_template_family:
            if not quick_fill_debug["fallback_reason"]:
                quick_fill_debug["fallback_reason"] = "template_markers_not_confident_enough"
            print("No quick-fill template markers found; using full-page OCR.")

        # Always run full-page OCR to produce real text for the "Full Extracted Text" tab
        # and as input for the OcrParserService PHP fallback parser.
        if True:
            if ocr_mode in ("fast", "balanced"):
                lines, scores, raw_results = run_tesseract()
                ocr_engine_used = ocr_engine_used if quick_fill_used else ("pytesseract" if lines else "none")

                fast_text_len = len('\n'.join(lines))
                fast_avg_conf = (sum(scores) / len(scores)) if scores else 0
                
                should_fallback = False
                if ocr_mode == "balanced":
                    # If we ALREADY have ROI fields (quick_fill), be more lenient with the text blob
                    # only fallback if Tesseract is nearly empty (< 20 chars)
                    if quick_fill_used:
                        should_fallback = not lines or fast_text_len < 20
                    else:
                        should_fallback = (
                            not lines
                            or fast_text_len < fast_mode_min_chars
                            or fast_avg_conf < fast_mode_min_conf
                        )
                elif ocr_mode == "fast":
                    should_fallback = not lines or fast_text_len < 10

                if should_fallback:
                    print(
                        f"Fast mode fallback triggered (chars={fast_text_len}, conf={round(fast_avg_conf, 3)})."
                    )
                    easy_lines, easy_scores, easy_raw = run_easyocr()
                    if easy_lines:
                        lines, scores = easy_lines, easy_scores
                        raw_results = easy_raw
                        ocr_engine_used = "easyocr_fallback"
            else:
                lines, scores, raw_results = run_easyocr()
                if lines:
                    ocr_engine_used = "easyocr"
                elif PYTESSERACT_AVAILABLE:
                    print("Attempting Tesseract fallback...")
                    lines, scores, raw_results = run_tesseract()
                    if lines:
                        ocr_engine_used = "pytesseract_fallback"

    if ext in ['.docx', '.txt', '.rtf']:
        ocr_engine_used = "native_text"
    
    full_text = '\n'.join(lines)
    avg_conf = round(sum(scores) / len(scores), 3) if scores else 0
    
    # Detect & Extract
    detected_type = detect_document_type(full_text)
    extraction_type = detected_type
    if extraction_type == 'unknown' or not extraction_type:
        extraction_type = expected_type if (expected_type and expected_type != 'unknown') else 'birth'
    
    # Only run the regex extractor if we didn't successfully use Zonal OCR
    if not quick_fill_used:
        # Pass raw_results (bounding boxes) to extract_fields for Spatial Extraction
        extracted_fields = extract_fields(extraction_type, full_text, lines, raw_results if 'raw_results' in locals() else None)
    else:
        # If we used Zonal OCR, extracted_fields is already populated, 
        # but let's make sure 'full_name' is set for consistency if it's missing
        if 'full_name' not in extracted_fields and 'first_name' in extracted_fields:
            fn = extracted_fields.get('first_name', '')
            mn = extracted_fields.get('middle_name', '')
            ln = extracted_fields.get('last_name', '')
            extracted_fields['full_name'] = f"{fn} {mn} {ln}".replace("  ", " ").strip()
            
    if field_confidence and not quick_fill_used:
        for quick_field, meta in field_confidence.items():
            quick_value = extracted_fields.get(quick_field, '')
            if not quick_value:
                if meta and not meta.get('validation_passed', True):
                    continue
                # Persist direct ROI value into extracted fields if parser misses it.
                pass
    
    # Extract signature crops
    signatures = crop_and_binarize_signatures(file_path, extraction_type)
    for k, v in signatures.items():
        extracted_fields[k] = v

    type_mismatch = False
    mismatch_msg = ''
    if expected_type and expected_type not in ('unknown', '') and detected_type != 'unknown':
        if detected_type != expected_type:
            type_mismatch = True
            mismatch_msg = f"Document type mismatch: you selected '{expected_type}' but it appears to be a '{detected_type}' certificate."

    template_overlay_fields = []
    for field_key, meta in (field_confidence or {}).items():
        if not isinstance(meta, dict):
            continue
        roi = meta.get('roi')
        if not roi:
            continue
        template_overlay_fields.append({
            "key": field_key,
            "value": extracted_fields.get(field_key, ''),
            "roi": roi,
            "confidence": meta.get('confidence', 0.0),
            "expected_type": meta.get('expected_type', _field_expected_type(field_key)),
            "validation_passed": bool(meta.get('validation_passed', False)),
        })

    return {
        'success': True,
        'text': full_text,
        'confidence': avg_conf,
        'ocr_mode': ocr_mode,
        'engine_used': ocr_engine_used,
        'detected_type': detected_type,
        'type_mismatch': type_mismatch,
        'mismatch_message': mismatch_msg,
        'extracted_fields': extracted_fields,
        'quick_fill_used': quick_fill_used,
        'field_confidence': field_confidence,
        'template_family_detected': detected_template_family,
        'quick_fill_debug': quick_fill_debug,
        'template_overlay': {
            'enabled': bool(template_overlay_fields),
            'family': detected_template_family,
            'fields': template_overlay_fields,
        },
    }

if __name__ == '__main__':
    import uvicorn
    # Forced to 1 worker and 1 concurrency for stability on low-resource hardware
    # This prevents OOM (Out Of Memory) crashes when multiple documents are processed.
    workers = 1
    
    print(f"Starting OCR Server in LOW-RESOURCE MODE (Stability Optimized)")
    print(f"Workers: {workers}")
    
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8080,
        log_level="info"
    )
