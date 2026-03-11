# OCR Text Storage Implementation Plan

## Task: Save OCR extracted text to database and create a .txt file for verification

## Steps:

### 1. Create Database Migration ✅
- [x] Create migration to add `ocr_text` column to documents table (LONGTEXT)
- File: `database/migrations/2024_01_02_000001_add_ocr_text_to_documents.php`

### 2. Modify OcrController.php ✅
- [x] After successful OCR processing, update the document record with extracted text
- [x] Save the extracted text to the database in `ocr_text` column
- [x] Return `ocr_text_saved: true` in response to confirm save

### 3. Modify Python Script (ocr_processor.py) ✅
- [x] Add functionality to save extracted text to a .txt file
- [x] Save in same directory as original file with .txt extension for verification
- [x] Returns `txt_file_saved` path in response

### 4. Run Migration
- [ ] Run: `php artisan migrate` to add the `ocr_text` column

### 5. Test the Implementation
- [ ] Test OCR processing
- [ ] Verify .txt file is created in temp directory
- [ ] Verify text is stored in database

## Implementation Notes:
- The documents table already has `file_data` column for storing file content as BLOB
- The `ocr_text` column stores extracted text for verification
- OcrController updates the document with extracted text after processing
- Python script saves .txt file in same location as temp file for verification

