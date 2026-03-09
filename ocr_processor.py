#!/usr/bin/env python3
"""
EasyOCR Processor for CiviCORE
This script processes images and PDFs using EasyOCR to extract text.
Run: pip install -r requirements.txt before using this script.
"""

import sys
import json
import os
import argparse
from pathlib import Path

# Try to import EasyOCR - show helpful error if not installed
try:
    import easyocr
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "EasyOCR not installed. Run: pip install -r requirements.txt"
    }))
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "Pillow not installed. Run: pip install pillow"
    }))
    sys.exit(1)

try:
    import cv2
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "OpenCV not installed. Run: pip install opencv-python"
    }))
    sys.exit(1)


def process_image_ocr(image_path, lang=['en', 'tl']):
    """
    Process an image file using EasyOCR and extract text.
    
    Args:
        image_path: Path to the image file
        lang: List of language codes (default: English and Tagalog)
    
    Returns:
        Dictionary with success status and extracted text
    """
    try:
        # Initialize EasyOCR reader (cache model in memory for faster processing)
        if not hasattr(process_image_ocr, 'reader'):
            print(f"Initializing EasyOCR with languages: {lang}", file=sys.stderr)
            process_image_ocr.reader = easyocr.Reader(lang, gpu=False, verbose=False)
        
        print(f"Processing image: {image_path}", file=sys.stderr)
        
        # Read the image using EasyOCR
        results = process_image_ocr.reader.readtext(image_path)
        
        # Extract text from results
        extracted_text = []
        confidence_scores = []
        
        for (bbox, text, prob) in results:
            if text.strip():  # Only add non-empty text
                extracted_text.append(text.strip())
                confidence_scores.append(round(prob, 2))
        
        full_text = '\n'.join(extracted_text)
        
        # Calculate average confidence
        avg_confidence = round(sum(confidence_scores) / len(confidence_scores), 2) if confidence_scores else 0
        
        return {
            "success": True,
            "text": full_text,
            "extracted_lines": extracted_text,
            "confidence": avg_confidence,
            "words_found": len(extracted_text)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def process_pdf_ocr(pdf_path, lang=['en', 'tl']):
    """
    Process a PDF file by converting pages to images and running OCR.
    Note: For PDFs, we extract the first page as a simple text approach.
    For full PDF OCR, consider using pdf2image + EasyOCR.
    
    Args:
        pdf_path: Path to the PDF file
        lang: List of language codes
    
    Returns:
        Dictionary with success status and extracted text
    """
    try:
        # For PDF processing, we'll try to use pdf2image if available
        try:
            from pdf2image import convert_from_path
        except ImportError:
            return {
                "success": False,
                "error": "PDF processing requires pdf2image. Run: pip install pdf2image"
            }
        
        print(f"Processing PDF: {pdf_path}", file=sys.stderr)
        
        # Convert PDF to images
        images = convert_from_path(pdf_path)
        
        if not images:
            return {
                "success": False,
                "error": "Could not convert PDF to images"
            }
        
        # Initialize reader
        if not hasattr(process_pdf_ocr, 'reader'):
            print(f"Initializing EasyOCR for PDF with languages: {lang}", file=sys.stderr)
            process_pdf_ocr.reader = easyocr.Reader(lang, gpu=False, verbose=False)
        
        all_text = []
        
        # Process each page
        for page_num, image in enumerate(images, 1):
            # Save temporary image
            temp_image_path = f"/tmp/pdf_page_{page_num}.png"
            image.save(temp_image_path, "PNG")
            
            # OCR the page
            results = process_pdf_ocr.reader.readtext(temp_image_path)
            
            # Extract text
            for (bbox, text, prob) in results:
                if text.strip():
                    all_text.append(text.strip())
            
            # Clean up temp file
            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)
        
        full_text = '\n'.join(all_text)
        
        return {
            "success": True,
            "text": full_text,
            "extracted_lines": all_text,
            "pages_processed": len(images),
            "words_found": len(all_text)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    """Main entry point for the OCR processor."""
    parser = argparse.ArgumentParser(description='EasyOCR Processor for CiviCORE')
    parser.add_argument('input_file', help='Path to the image or PDF file to process')
    parser.add_argument('--lang', default='en,tl', help='Comma-separated language codes (default: en,tl)')
    parser.add_argument('--type', choices=['image', 'pdf', 'auto'], default='auto', 
                        help='File type (auto-detect by default)')
    
    args = parser.parse_args()
    
    # Parse languages
    lang = args.lang.split(',')
    
    # Determine file type
    file_path = args.input_file
    file_ext = Path(file_path).suffix.lower()
    
    if args.type == 'auto':
        if file_ext in ['.pdf']:
            file_type = 'pdf'
        else:
            file_type = 'image'
    else:
        file_type = args.type
    
    # Check if file exists
    if not os.path.exists(file_path):
        result = {
            "success": False,
            "error": f"File not found: {file_path}"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    # Process based on file type
    if file_type == 'pdf':
        result = process_pdf_ocr(file_path, lang)
    else:
        result = process_image_ocr(file_path, lang)
    
    # Output result as JSON
    print(json.dumps(result))


if __name__ == '__main__':
    main()
