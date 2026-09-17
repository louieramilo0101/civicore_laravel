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
from PIL import Image
import fitz  # PyMuPDF
import cv2
import numpy as np
import threading
import base64
from google import genai
from functools import wraps

process_lock = threading.Lock()

def serialize_processing(func):
    """Decorator to force sequential execution of an endpoint."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        with process_lock:
            return func(*args, **kwargs)
    return wrapper

app = FastAPI(title="CiviCORE Gemini OCR & Document Processing Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

    return ext

class SplitRequest(BaseModel):
    file_path: str
    ocr_confidence: Optional[float] = None
    base_zoom: float = 1.35
    boosted_zoom: float = 1.8
    low_confidence_threshold: float = 0.75
    max_dimension: Optional[int] = 2000
    image_format: Literal["jpeg", "webp"] = "jpeg"
    image_quality: int = 75

SIGNATURE_COORDS = {
    "birth": {
        "attendant_signature": {"x": 0.22, "y": 0.52, "w": 0.25, "h": 0.045},
        "informant_signature": {"x": 0.23, "y": 0.60, "w": 0.25, "h": 0.045},
        "prepared_by_signature": {"x": 0.58, "y": 0.60, "w": 0.25, "h": 0.045},
        "received_by_signature": {"x": 0.23, "y": 0.70, "w": 0.25, "h": 0.045},
        "registered_by_signature": {"x": 0.58, "y": 0.70, "w": 0.25, "h": 0.045},
    }
}

def crop_and_binarize_signatures(image_path: str, doc_type: str) -> dict:
    """Extract configured signature regions as transparent PNG data URLs."""
    if doc_type not in SIGNATURE_COORDS:
        return {}
    
    signatures = {}
    try:
        img = cv2.imread(image_path)
        if img is None:
            pil_img = Image.open(image_path)
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        
        height, width = img.shape[:2]
        
        for key, coord in SIGNATURE_COORDS[doc_type].items():
            x1 = int(coord["x"] * width)
            y1 = int(coord["y"] * height)
            w = int(coord["w"] * width)
            h = int(coord["h"] * height)
            x2 = min(width, x1 + w)
            y2 = min(height, y1 + h)
            
            if x2 <= x1 or y2 <= y1:
                continue
                
            crop = img[y1:y2, x1:x2]
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (3, 3), 0)
            _, binarized = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
            
            total_pixels = binarized.size
            black_pixels = np.sum(binarized == 0)
            black_ratio = black_pixels / total_pixels if total_pixels > 0 else 0.0
            
            if black_ratio < 0.005:
                signatures[key] = "n/a"
                continue
            
            rgba = cv2.cvtColor(crop, cv2.COLOR_BGR2BGRA)
            rgba[binarized == 255, 3] = 0
            
            _, buffer = cv2.imencode('.png', rgba)
            base64_str = base64.b64encode(buffer).decode('utf-8')
            signatures[key] = f"data:image/png;base64,{base64_str}"
            
    except Exception as e:
        print(f"Error in crop_and_binarize_signatures: {e}")
        
    return signatures

current_key_index = 0

@app.get('/status')
def status():
    return {"status": "ready", "engine": "gemini-3.6-flash", "persistent": True}

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

key_cooldowns = {}
current_key_index = 0

@app.post('/ocr/gemini')
@serialize_processing
def process_ocr_gemini(data: dict):
    """Process a document with Gemini Vision OCR and return structured JSON."""
    global current_key_index, key_cooldowns
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
            
    # Resize image to max 1024px to optimize Gemini token budget
    if img:
        max_size = 1024
        if max(img.size) > max_size:
            orig_w, orig_h = img.size
            resample_filter = getattr(Image, "Resampling", Image).LANCZOS
            img.thumbnail((max_size, max_size), resample_filter)
            print(f"Optimized tokens: Image resized from {orig_w}x{orig_h} to {img.size[0]}x{img.size[1]}")
            
    doc_type_clean = str(doc_type).lower().strip()
    
    if doc_type_clean in ('marriage', 'marriage_license'):
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
          
          "marriage_license_no": null,
          "marriage_license_issued_on": null,
          "marriage_license_issued_at": null,
          "solemnizing_officer_name": null,
          "solemnizing_officer_title": null,
          
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
          "place_of_death": null,
          "civil_status": null,
          "religion": null,
          "citizenship": null,
          "residence": null,
          "occupation": null,
          
          "father_name": null,
          "mother_maiden_name": null,
          "cause_of_death": null,
          
          "informant_name": null,
          "prepared_by_name": null,
          "registered_by_name": null,
          "remarks": null
        }
        """
    else:
        prompt = """
        You are an expert system for reading Philippine Civil Registry documents (specifically Certificate of Live Birth).
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
          "registry_number": null, "province": null, "city_municipality": null, "barangay": null,
          "first_name": null, "middle_name": null, "last_name": null, "sex": null,
          "dob_day": null, "dob_month": null, "dob_year": null,
          "place_of_birth_hospital": null, "place_of_birth_city": null, "place_of_birth_province": null,
          "type_of_birth": null, "multiple_birth_order": null, "birth_order": null, "weight_at_birth": null,
          
          "mother_first_name": null, "mother_middle_name": null, "mother_last_name": null,
          "mother_citizenship": null, "mother_religion": null,
          "mother_children_total": null, "mother_children_living": null, "mother_children_dead": null,
          "mother_occupation": null, "mother_age": null,
          "mother_residence_house": null, "mother_residence_city": null, "mother_residence_province": null,
          
          "father_first_name": null, "father_middle_name": null, "father_last_name": null,
          "father_citizenship": null, "father_religion": null,
          "father_occupation": null, "father_age": null,
          "father_residence_house": null, "father_residence_city": null, "father_residence_province": null,
          
          "marriage_parents_day": null, "marriage_parents_month": null, "marriage_parents_year": null,
          "marriage_parents_place_city": null, "marriage_parents_place_province": null,
          
          "attendant_type": null, "attendant_name": null,
          "informant_name": null, "prepared_by_name": null, "registered_by_name": null,
          "remarks": null
        }
        """
    
    now = time.time()
    # Filter active keys (cooldown expired) vs cooling keys
    active_keys = [(idx, k) for idx, k in enumerate(api_keys) if key_cooldowns.get(idx, 0) <= now]
    
    if not active_keys:
        # If all keys are on cooldown, pick key expiring earliest
        earliest_idx = min(key_cooldowns, key=key_cooldowns.get)
        wait_secs = max(0.5, key_cooldowns[earliest_idx] - now)
        print(f"All Gemini API keys on cooldown. Waiting {wait_secs:.1f}s for key index {earliest_idx}...")
        time.sleep(wait_secs)
        keys_to_try = [(earliest_idx, api_keys[earliest_idx])]
    else:
        # Prioritize primary key (0) if active, else cycle through remaining active keys
        keys_to_try = active_keys

    for attempt, (key_idx, key) in enumerate(keys_to_try):
        print(f"Using API Key index {key_idx} (Attempt {attempt+1}/{len(keys_to_try)})")
        success = False
        models_to_try = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        
        try:
            for model_name in models_to_try:
                try:
                    client = genai.Client(api_key=key)
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[img, prompt],
                        config={
                            "response_mime_type": "application/json"
                        }
                    )
                    key_cooldowns.pop(key_idx, None)
                    if key_idx > 0:
                        current_key_index = key_idx
                    success = True
                    break
                except Exception as model_err:
                    err_str = str(model_err)
                    if ('503' in err_str or 'UNAVAILABLE' in err_str or '404' in err_str or 'NOT_FOUND' in err_str) and model_name != models_to_try[-1]:
                        print(f"Model {model_name} unavailable. Retrying with fallback model version...")
                        continue
                    raise model_err

            if success:
                break
        except Exception as e:
            print(f"DEBUG GEMINI ERROR: {e}")
            err_str = str(e)
            if '429' in err_str or '503' in err_str or 'RESOURCE_EXHAUSTED' in err_str:
                key_cooldowns[key_idx] = time.time() + 60
                print(f"Key index {key_idx} hit rate limit. Marked on 60s cooldown.")
                if attempt < len(keys_to_try) - 1:
                    print("Immediately switching to next available API key...")
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
        err_msg = extracted_data.get("document_validation_error") or "The uploaded image does not appear to be an official Civil Registry document."
        print(f"Document Validation Failed: {err_msg}")
        return {
            "success": False,
            "error": "Invalid Document Uploaded",
            "detail": err_msg,
            "is_valid_document": False,
            "extracted_fields": {},
            "image_token_cost": 258
        }

    signatures = crop_and_binarize_signatures(file_path, doc_type)
    for k, v in signatures.items():
        extracted_data[k] = v

    img_w, img_h = img.size if img else (1024, 1024)
    tiles = math.ceil(img_w / 768) * math.ceil(img_h / 768)
    image_token_cost = tiles * 258

    text_summary = json.dumps(extracted_data, ensure_ascii=False)

    return {
        "success": True,
        "text": text_summary,
        "detected_type": doc_type,
        "extracted_fields": extracted_data,
        "engine_used": "gemini-3.6-flash",
        "quick_fill_used": True,
        "image_token_cost": image_token_cost
    }

if __name__ == '__main__':
    import uvicorn
    workers = 1
    print(f"Starting Persistent Gemini OCR Server")
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=8080,
        log_level="info"
    )
