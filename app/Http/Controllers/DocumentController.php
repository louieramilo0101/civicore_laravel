<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;
use App\Models\Document;
use App\Jobs\ProcessDocumentOcr;
use App\Support\EncryptedJson;

/**
 * Represents the Document Controller application component.
 */
class DocumentController extends Controller
{
    /**
     * Get all documents with pagination
     */
    public function index(Request $request)
    {
        $page = (int) $request->query('page', 1);
        $perPage = min((int) $request->query('per_page', 20), 100);
        $type = $request->query('type', '');
        $status = strtolower(trim($request->query('status', '')));
        $search = $request->query('search', '');
        
        // Build query
        $conditions = ["d.deleted_at IS NULL"];
        $params = [];
        
        if (!empty($type)) {
            $types = is_array($type) ? $type : explode(',', $type);
            $types = array_filter(array_map('trim', array_map('strtolower', $types)));
            if (!empty($types) && !in_array('all', $types)) {
                $placeholders = implode(',', array_fill(0, count($types), '?'));
                $conditions[] = "LOWER(d.type) IN ($placeholders)";
                foreach ($types as $t) {
                    $params[] = $t;
                }
            }
        }

        if (!empty($status) && $status !== 'all') {
            if ($status === 'processed' || $status === 'registered') {
                $conditions[] = "LOWER(d.status) IN ('processed', 'issued', 'active')";
            } elseif ($status === 'pending' || $status === 'draft') {
                $conditions[] = "LOWER(d.status) IN ('pending', 'extracted', 'draft')";
            } else {
                $conditions[] = "LOWER(d.status) = ?";
                $params[] = $status;
            }
        }

        if (!empty($search)) {
            $rawSearch = trim($search);
            // Split search into individual keywords (e.g. "Norcio Simeon" or "Ventura David")
            $terms = array_values(array_filter(preg_split('/\s+/', $rawSearch)));

            if (!empty($terms)) {
                $termConditions = [];
                foreach ($terms as $term) {
                    $termConditions[] = "(d.name LIKE ? OR d.personName LIKE ? OR d.barangay LIKE ? OR d.extracted_fields LIKE ?)";
                    $termWildcard = "%{$term}%";
                    for ($k = 0; $k < 4; $k++) {
                        $params[] = $termWildcard;
                    }
                }
                $conditions[] = "(" . implode(" AND ", $termConditions) . ")";
            }
        }

        $whereClause = " WHERE " . implode(" AND ", $conditions);
        
        // Get total count
        $countQuery = "SELECT COUNT(DISTINCT d.id) as total FROM documents d" . $whereClause;
        $totalResult = DB::select($countQuery, $params);
        $total = $totalResult[0]->total;
        
        // Get paginated results without duplicate row inflation from 1-to-many joins
        // NOTE: ticket_number comes only from the tickets table. The issuances table
        // is the pure Registry Database and no longer carries ticket_number
        // (migrated to ticket_issuances, then column dropped).
        $query = "SELECT d.id, d.name, d.type, d.date, d.size, d.status, d.personName, d.barangay, d.metadata, d.ocr_text, d.extracted_fields, d.detected_type, d.created_at, d.updated_at, d.encoded_by, d.file_path, d.image_path,
                          t.ticket_number as ticket_number,
                          i.certNumber as certNumber
                  FROM documents d
                  LEFT JOIN (
                      SELECT document_id, MIN(ticket_number) as ticket_number
                      FROM tickets
                      WHERE deleted_at IS NULL
                      GROUP BY document_id
                  ) t ON t.document_id = d.id
                  LEFT JOIN (
                      SELECT document_id, MIN(certNumber) as certNumber
                      FROM issuances
                      WHERE deleted_at IS NULL
                      GROUP BY document_id
                  ) i ON i.document_id = d.id" . $whereClause . " ORDER BY d.id DESC LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = ($page - 1) * $perPage;
        
        $documents = DB::select($query, $params);
        
        // Enhance documents with real-time batch progress and duplicate detection
        foreach ($documents as $doc) {
            if (empty($doc->ticket_number)) {
                $doc->ticket_number = 'T-2026-' . str_pad($doc->id, 4, '0', STR_PAD_LEFT);
            }
            $metadata = json_decode($doc->metadata, true) ?: [];
            $doc->has_duplicate = !empty($metadata['has_duplicate']);
            $status = strtolower($doc->status ?? '');
            if ($status === 'processing' || $status === 'pending') {
                if (isset($metadata['batch_id'])) {
                    $batch = Bus::findBatch($metadata['batch_id']);
                    if ($batch) {
                        $doc->batch_progress = $batch->progress();
                        $doc->batch_total = $batch->totalJobs;
                        $doc->batch_processed = $batch->processedJobs;
                        $doc->batch_failed = $batch->failedJobs;
                        $doc->batch_finished = $batch->finished();
                    }
                }
            } elseif (!$request->boolean('for_attach') && ($status === 'extracted' || $status === 'checking')) {
                // Check if similar records already exist in the issuances table.
                // Fetch the full candidate now so the review panel can jump straight
                // into the side-by-side comparison without an extra async round-trip.
                $fields = EncryptedJson::decode($doc->extracted_fields);
                $type = $doc->detected_type ?: $doc->type;
                if ($type === 'marriage_license') {
                    $type = 'marriage';
                }

                $candidate = $this->findDuplicateCandidate($type, $fields, (int) $doc->id);
                if ($candidate) {
                    $doc->has_duplicate = true;
                    $doc->duplicate_candidate = [
                        'id' => $candidate->id,
                        'certNumber' => $candidate->certNumber,
                        'type' => $candidate->type,
                        'name' => $candidate->name,
                        'barangay' => $candidate->barangay,
                        'issuanceDate' => $candidate->issuanceDate,
                        'encoded_by' => $candidate->encoded_by,
                        'extracted_fields' => EncryptedJson::decode($candidate->extracted_data)
                    ];
                }
            }
        }
        
        // Decrypt extracted_fields for API response (handles both encrypted and legacy plaintext)
        foreach ($documents as $doc) {
            $doc->extracted_fields = $this->decryptForExport($doc->extracted_fields);
        }
        
        return response()->json([
            'data' => $documents,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
            ]
        ]);
    }

    /**
     * Executes the bulk process operation.
     */
    public function bulkProcess(Request $request) 
    {
        // 1. Make sure we actually received an array of IDs
        $request->validate([
            'document_ids' => 'required|array',
            'document_ids.*' => 'integer|exists:documents,id' // Make sure they exist in the DB!
        ]);

        $queuedCount = 0;

        // 2. Loop through each ID and dispatch the background job if it is not already queued
        foreach ($request->document_ids as $id) {
            DB::transaction(function () use ($id, &$queuedCount) {
                $doc = DB::table('documents')->where('id', $id)->lockForUpdate()->first();
                if (!$doc) {
                    return;
                }

                $status = strtolower($doc->status ?? '');
                if (in_array($status, ['pending', 'processing'], true)) {
                    return;
                }

                DB::table('documents')->where('id', $id)->update([
                    'status' => 'Pending',
                    'updated_at' => now(),
                ]);

                ProcessDocumentOcr::dispatch($id, $doc->type)->onQueue('low');
                $queuedCount++;
            });
        }

        // 3. Return success instantly
        return response()->json([
            'success' => true, 
            'queued_count' => $queuedCount
        ]);
    }

    /**
     * Executes the toggle ocr operation.
     */
    public function toggleOcr(Request $request, $id)
    {
        $doc = DB::table('documents')->where('id', $id)->first();
        if (!$doc) {
            return response()->json(['success' => false, 'error' => 'Document not found'], 404);
        }

        $status = strtolower($doc->status ?? '');

        if (in_array($status, ['pending', 'processing'])) {
            // Stop it
            DB::table('documents')->where('id', $id)->update([
                'status' => 'Stopped',
                'updated_at' => now(),
            ]);
            
            // Cancel batch if it exists
            $metadata = json_decode($doc->metadata, true);
            if (isset($metadata['batch_id'])) {
                $batch = Bus::findBatch($metadata['batch_id']);
                if ($batch) {
                    $batch->cancel();
                }
            }
            return response()->json(['success' => true, 'new_status' => 'Stopped']);
        } else {
            // Retry / Resume
            DB::table('documents')->where('id', $id)->update([
                'status' => 'Pending',
                'updated_at' => now(),
            ]);
            ProcessDocumentOcr::dispatch($id, $doc->type)->onQueue('low');
            return response()->json(['success' => true, 'new_status' => 'Pending']);
        }
    }

    /**
     * Get persistent submission history from logs
     */
    public function history(Request $request)
    {
        // Only show 'Processed' and 'Issued' actions for the Submission History tab
        $logs = DB::table('document_history_logs')
            ->whereIn('action', ['Processed', 'Issued'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json([
            'data' => $logs
        ]);
    }

    /**
     * Create new document
     */
    public function store(Request $request) 
    {
        // 1. Validate the file exists
        $request->validate([
            'document' => 'required|file|mimes:pdf,png,jpg,jpeg|max:10240', // max 10MB
        ]);

        $this->validateUploadedFile($request->file('document'));
        // 2. Permanently save the file to storage/app/public/documents (public disk)
        $path = $request->file('document')->store('documents', 'public');

        // 3. Create the database record immediately
        $document = Document::create([
            'file_name' => $request->file('document')->getClientOriginalName(),
            'file_path' => $path,
            'status' => 'pending',
            'raw_text' => null,
            'extracted_data' => null
        ]);

        // 4. Pass the database record to the background worker
        ProcessDocumentOcr::dispatch($document->id, 'Uncategorized')->onQueue('low');

        // 5. Return success instantly to the React frontend
        return response()->json([
            'success' => true, 
            'message' => 'Upload successful. Processing in background...',
            'document_id' => $document->id
        ]);
    }

    /**
     * Upload file - saves to disk and processes OCR
     * 
     * Workflow:
     * 1. Save file to storage/app/public/documents with unique name
     * 2. Send file to OCR server at http://localhost:8000/process
     * 3. Store raw OCR text and extracted fields in database
     * 4. Dynamically rename file based on OCR results
     * 5. Queue async job for post-processing
     */
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|max:20480|mimes:pdf,png,jpg,jpeg,tiff,bmp,docx,doc,txt,webp,rtf', // 20MB max
            'docType' => 'nullable|string',
            'personName' => 'nullable|string',
            'barangay' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'error' => $validator->errors()->first()], 400);
        }

        $file = $request->file('file');
        $this->validateUploadedFile($file);

        // Enforce Daily Scan Limit (Token budget manager check) on upload
        $dailyLimit = (int) env('DAILY_SCAN_LIMIT', 1000);
        $start = \Carbon\Carbon::today(config('app.timezone'))->startOfDay();
        $end = \Carbon\Carbon::today(config('app.timezone'))->endOfDay();
        $todayScans = DB::table('documents')
            ->whereIn('status', ['extracted', 'Processed', 'Issued'])
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        if ($todayScans >= $dailyLimit) {
            return response()->json([
                'success' => false,
                'error' => 'Daily paid API scan limit reached (' . $dailyLimit . '). Please contact your administrator.'
            ], 400);
        }

        $docType = $request->input('docType', 'Uncategorized');
        $personName = $request->input('personName', '');
        $barangay = $request->input('barangay', '');
        
        // Resolve uploader name from session
        $userId = $request->session()->get('user_id');
        $user = $userId ? \App\Models\User::find($userId) : null;
        $encodedBy = $user ? $user->name : 'System';

        // Generate unique filename and size
        $originalName = $file->getClientOriginalName();
        $extension = $file->getClientOriginalExtension();
        $tempFilename = 'doc-' . time() . '-' . rand(100000000, 999999999) . '.' . $extension;
        $size = number_format($file->getSize() / (1024 * 1024), 2) . ' MB';

        try {
            // STEP 1: Process file into Dual A4 Storage (A4 PDF + A4 Picture)
            $converter = new \App\Services\DocumentPdfConverterService();
            $dualPaths = $converter->processUploadedFile($file);
            $filePath  = $dualPaths['file_path'];
            $imagePath = $dualPaths['image_path'];
            \Log::info("Dual A4 Document saved: PDF={$filePath}, Image={$imagePath}");

            $metadata = [
                'originalName' => $originalName,
                'originalExtension' => $extension,
                'image_path' => $imagePath,
                'is_dual_a4' => true,
            ];

            // STEP 2: Save initial record to database as PENDING (No OCR wait!)
            $newId = DB::table('documents')->insertGetId([
                'name' => $originalName,
                'type' => $docType,
                'date' => date('m/d/Y'),
                'size' => $size,
                'status' => 'Pending', // <--- IMPORTANT: Starts as pending
                'personName' => $personName,
                'barangay' => $barangay,
                'file_path' => $filePath, 
                'image_path' => $imagePath,
                'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE),
                'encoded_by' => $encodedBy,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // STEP 3: Log history
            $this->logHistory($newId, 'Uploaded');

            // STEP 4: Hand off to the Background Queue to do the OCR later!
            ProcessDocumentOcr::dispatch($newId, $docType)->onQueue('low');

            // STEP 5: Return to React INSTANTLY (< 500ms)
            return response()->json([
                'success' => true,
                'message' => 'Upload successful. Processing in background...',
                'id' => $newId,
                'filename' => basename($filePath),
                'image_path' => $imagePath,
                'originalName' => $originalName,
                'size' => $size,
                'status' => 'Pending'
            ]);

        } catch (\Exception $e) {
            \Log::error("Document upload failed: " . $e->getMessage());
            
            if (isset($filePath) && \Storage::disk('local')->exists($filePath)) {
                \Storage::disk('local')->delete($filePath);
            }

            return response()->json([
                'success' => false,
                'error' => 'Upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Executes the validate uploaded file operation.
     */
    private function validateUploadedFile($file)
    {
        $allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp', 'docx', 'doc', 'txt', 'webp', 'rtf'];
        $extension = strtolower($file->getClientOriginalExtension());

        if (!in_array($extension, $allowedExtensions, true)) {
            abort(400, 'Unsupported file type.');
        }

        $path = $file->getRealPath();
        if (!$path || !file_exists($path) || filesize($path) === 0) {
            abort(400, 'Uploaded file is empty or invalid.');
        }

        $magic = file_get_contents($path, false, null, 0, 16);
        $magicHex = bin2hex($magic);
        $isValid = match ($extension) {
            'pdf' => str_starts_with($magic, '%PDF-'),
            'png' => str_starts_with($magicHex, '89504e470d0a1a0a'),
            'jpg', 'jpeg' => str_starts_with($magicHex, 'ffd8'),
            'webp' => str_starts_with($magicHex, '52494646') && substr($magicHex, 16, 8) === '57454250',
            'tiff' => str_starts_with($magicHex, '49492a00') || str_starts_with($magicHex, '4d4d002a'),
            'bmp' => str_starts_with($magicHex, '424d'),
            'docx' => str_starts_with($magicHex, '504b0304'),
            'doc' => str_starts_with($magicHex, 'd0cf11e0a1b11ae1'),
            'txt', 'rtf' => true,
            default => false,
        };

        if (!$isValid) {
            \Log::warning("File validation failed for extension '{$extension}'. Real MIME type guesser: " . $file->getMimeType() . ", Magic bytes (hex): " . $magicHex);
            abort(400, 'File content does not match the allowed type.');
        }

        return true;
    }

    /**
     * Save uploaded file to storage/app/public/documents on the public disk
     * 
     * @param \Illuminate\Http\UploadedFile $file
     * @param string $filename
     * @return string Path to saved file
     */
    private function saveDocumentFile($file, $filename)
    {
        $path = $file->storeAs(
            'documents',
            $filename,
            'local'
        );

        if (!$path) {
            throw new \Exception("Failed to save file to disk");
        }

        return $path;
    }



    /**
     * Dynamically rename file based on OCR extracted data
     * 
     * Pattern: [DOC_TYPE]_[LAST_NAME]_[FIRST_NAME]_[TIMESTAMP].ext
     * Example: BIRTH_SANTOS_JUAN_20260409120000.pdf
     * 
     * @param int $documentId
     * @param string $currentPath Current file path
     * @param array $extractedData Extracted OCR data
     * @param string $detectedType Document type
     * @return string New file path
     */
    private function renameDocumentFile($documentId, $currentPath, $extractedData, $detectedType)
    {
        try {
            if (!$extractedData || count($extractedData) === 0) {
                \Log::info("No extracted data to rename file: {$documentId}");
                return $currentPath;
            }

            // Extract relevant name fields based on document type
            $lastName = '';
            $firstName = '';

            if ($detectedType === 'marriage' || $detectedType === 'marriage_license') {
                $lastName = $extractedData['husband_last_name'] ?? $extractedData['wife_last_name'] ?? '';
                $firstName = $extractedData['husband_first_name'] ?? $extractedData['wife_first_name'] ?? '';
            } else {
                // Birth, Death, or other
                $lastName = $extractedData['last_name'] ?? '';
                $firstName = $extractedData['first_name'] ?? '';
            }

            // Sanitize names (remove special characters, spaces)
            $lastName = preg_replace('/[^a-zA-Z0-9]/', '', $lastName);
            $firstName = preg_replace('/[^a-zA-Z0-9]/', '', $firstName);

            // If we don't have names, use the document ID instead
            if (empty($lastName) && empty($firstName)) {
                \Log::info("No names extracted, keeping original filename");
                return $currentPath;
            }

            // Build new filename: [TYPE]_[LASTNAME]_[FIRSTNAME]_[DOCID].[ext]
            $extension = pathinfo($currentPath, PATHINFO_EXTENSION);
            $typePrefix = strtoupper($detectedType);
            $timestamp = date('YmdHis');
            
            $newFilename = "{$typePrefix}_{$lastName}_{$firstName}_{$documentId}.{$extension}";
            $newPath = 'documents/' . $newFilename;

            // Rename in storage
            if (\Storage::disk('local')->exists($currentPath)) {
                \Storage::disk('local')->move($currentPath, $newPath);
                \Log::info("File renamed: {$currentPath} -> {$newPath}");
                return $newPath;
            } else {
                \Log::warning("Cannot rename: source file not found at {$currentPath}");
                return $currentPath;
            }

        } catch (\Exception $e) {
            \Log::error("File rename failed: " . $e->getMessage());
            // Don't fail the whole upload if rename fails
            return $currentPath;
        }
    }

    /**
     * Update document extracted fields (after OCR review)
     * PUT /api/documents/{id}
     */
    public function update(Request $request, $id)
    {
        $extractedFields = $request->input('extracted_fields');
        $ocrText         = $request->input('ocr_text', '');
        $personName      = $request->input('personName', '');
        $barangay        = $request->input('barangay', '');
        $status          = $request->input('status', 'Extracted');
        $parentalConsent = $request->input('parental_consent', false);
        $detectedType    = $request->input('detectedType') ?: $request->input('type');
        if (empty($detectedType)) {
            $docTypeInDb = DB::table('documents')->where('id', $id)->value('type');
            $detectedType = $docTypeInDb ?: 'birth';
        }

        // Backend validation and normalization of civil registry fields
        if (is_array($extractedFields)) {
            $validationError = $this->validateExtractedFields($extractedFields, $detectedType ?: 'birth');
            if ($validationError) {
                return response()->json([
                    'success' => false,
                    'error'   => $validationError,
                ], 422);
            }
        }

        return $this->performSave($request, $id, $extractedFields, $ocrText, $personName, $barangay, $status, $parentalConsent, $detectedType);
    }

    /**
     * Validates and cleans extracted fields to ensure database integrity.
     */
    private function validateExtractedFields(array &$fields, string $type = 'birth'): ?string
    {
        $validMonths = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // 1. Month validation & normalization
        foreach (['dob_month', 'marriage_parents_month'] as $mKey) {
            if (isset($fields[$mKey]) && !is_null($fields[$mKey]) && $fields[$mKey] !== '' && strtolower((string)$fields[$mKey]) !== 'n/a') {
                $rawM = trim((string)$fields[$mKey]);
                $normalized = null;
                if (is_numeric($rawM)) {
                    $mNum = (int)$rawM;
                    if ($mNum >= 1 && $mNum <= 12) {
                        $normalized = $validMonths[$mNum - 1];
                    }
                } else {
                    foreach ($validMonths as $vm) {
                        if (str_starts_with(strtolower($rawM), strtolower(substr($vm, 0, 3)))) {
                            $normalized = $vm;
                            break;
                        }
                    }
                }
                if (!$normalized) {
                    return "Invalid month '{$rawM}'. Please choose a valid month between January and December.";
                }
                $fields[$mKey] = $normalized;
            }
        }

        // 2. Day validation
        $dayKeys = [
            'dob_day' => ['month' => 'dob_month', 'year' => 'dob_year'],
            'marriage_parents_day' => ['month' => 'marriage_parents_month', 'year' => 'marriage_parents_year']
        ];
        foreach ($dayKeys as $dKey => $rel) {
            if (isset($fields[$dKey]) && !is_null($fields[$dKey]) && $fields[$dKey] !== '' && strtolower((string)$fields[$dKey]) !== 'n/a') {
                $rawDay = preg_replace('/[^0-9]/', '', (string)$fields[$dKey]);
                if ($rawDay === '') {
                    return "Day must be a number between 1 and 31.";
                }
                $day = (int)$rawDay;
                if ($day < 1 || $day > 31) {
                    return "Day must be between 1 and 31. Received: {$day}.";
                }
                $mVal = $fields[$rel['month']] ?? null;
                if ($mVal && in_array($mVal, $validMonths)) {
                    $yVal = !empty($fields[$rel['year']]) ? (int)$fields[$rel['year']] : null;
                    if ($mVal === 'February') {
                        $isLeap = $yVal && (($yVal % 4 === 0 && $yVal % 100 !== 0) || ($yVal % 400 === 0));
                        $maxFeb = $isLeap ? 29 : 28;
                        if ($day > $maxFeb) {
                            return "February has at most {$maxFeb} days" . ($isLeap ? " (leap year)." : ".");
                        }
                    } elseif (in_array($mVal, ['April', 'June', 'September', 'November'])) {
                        if ($day > 30) {
                            return "{$mVal} only has 30 days.";
                        }
                    }
                }
                $fields[$dKey] = $day;
            }
        }

        // 3. Year validation
        $currentYear = (int)date('Y');
        foreach (['dob_year', 'marriage_parents_year'] as $yKey) {
            if (isset($fields[$yKey]) && !is_null($fields[$yKey]) && $fields[$yKey] !== '' && strtolower((string)$fields[$yKey]) !== 'n/a') {
                $rawYear = preg_replace('/[^0-9]/', '', (string)$fields[$yKey]);
                $year = (int)$rawYear;
                if (strlen($rawYear) !== 4 || $year < 1850 || $year > $currentYear + 1) {
                    return "Year must be a 4-digit number between 1850 and {$currentYear}.";
                }
                $fields[$yKey] = $year;
            }
        }

        // 4. Date validation for Marriage & Death
        $today = date('Y-m-d');
        foreach (['date_of_birth', 'date_of_death', 'date_of_marriage', 'husband_dob', 'wife_dob', 'burial_permit_date_issued', 'transfer_permit_date_issued'] as $dKey) {
            if (isset($fields[$dKey]) && !is_null($fields[$dKey]) && $fields[$dKey] !== '' && strtolower((string)$fields[$dKey]) !== 'n/a') {
                $dStr = trim((string)$fields[$dKey]);
                $ts = strtotime($dStr);
                if ($ts === false) {
                    return "Invalid date format for '{$dKey}'. Please use YYYY-MM-DD.";
                }
                $formatted = date('Y-m-d', $ts);
                if ($formatted > $today) {
                    return "The date for '{$dKey}' cannot be in the future (today is {$today}).";
                }
                $fields[$dKey] = $formatted;
            }
        }

        // 5. Age numeric sanity checks
        foreach (['mother_age', 'father_age', 'husband_age', 'wife_age', 'age_completed_years', 'age_months', 'age_days'] as $aKey) {
            if (isset($fields[$aKey]) && !is_null($fields[$aKey]) && $fields[$aKey] !== '' && strtolower((string)$fields[$aKey]) !== 'n/a') {
                $cleaned = preg_replace('/[^0-9]/', '', (string)$fields[$aKey]);
                if ($cleaned === '') {
                    return "Age must be a valid non-negative number.";
                }
                $fields[$aKey] = (int)$cleaned;
            }
        }

        return null;
    }


    /**
     * Fast-track approval of extracted data without the full modal
     */
    public function quickApprove(Request $request, $id)
    {
        $docData = DB::selectOne("SELECT * FROM documents WHERE id = ?", [$id]);
        if (!$docData) return response()->json(['error' => 'Document not found'], 404);
        
        $fields = EncryptedJson::decode($docData->extracted_fields);
        $barangay = $fields['barangay'] ?? '';
        $detectedType = $docData->detected_type ?: $docData->type;
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);
        
        if ($detectedType === 'marriage_license') {
            $detectedType = 'marriage';
        }

        // Single-factor duplicate check: Registry Number scoped strictly by certificate type (skipped if staff forces through)
        if (!$force && $this->hasTrueDuplicate($detectedType, $fields, (int) $id)) {
            $regNo = trim($fields['registry_number'] ?? $fields['registry_no'] ?? $fields['certNumber'] ?? '');
            return response()->json([
                'success'   => false,
                'duplicate' => true,
                'error'     => "A record with Registry No. \"{$regNo}\" already exists in the " . ucfirst($detectedType) . " Registry. Confirm to override.",
            ], 422);
        }

        // Soft name-match warning: same person name but different registry number
        $softMatch = $this->findSoftNameMatch($detectedType, $fields, (int) $id);
        $softMatchData = null;
        if ($softMatch) {
            $softMatchData = [
                'id'          => $softMatch->id,
                'personName'  => $softMatch->personName,
                'type'        => $softMatch->type,
                'registryNo'  => $softMatch->certNumber ?? $softMatch->registry_number ?? 'N/A',
                'barangay'    => $softMatch->barangay ?? 'N/A',
                'date'        => $softMatch->date ?? $softMatch->created_at ?? 'N/A',
            ];
        }

        // Build personName from split fields
        $personName = $this->buildFullName($fields, $detectedType) ?: $docData->name;
        
        // If soft match found, return warning instead of auto-saving
        if ($softMatchData) {
            return response()->json([
                'success'      => false,
                'softMatch'    => true,
                'softMatchData' => $softMatchData,
                'error'        => "A record with the same name (" . $softMatchData['personName'] . ") exists in the " . ucfirst($detectedType) . " Registry with Registry No. \"" . $softMatchData['registryNo'] . "\". Verify this is not the same person before proceeding.",
            ], 422);
        }

        return $this->performSave($request, $id, $fields, $docData->ocr_text, $personName, $barangay, 'Processed', false, $detectedType);
    }

    /**
     * Bulk approve multiple extracted documents in a single request.
     * Replaces N sequential quick-approve calls with one batched request.
     */
    public function bulkApprove(Request $request)
    {
        $ids = $request->validate([
            'ids'   => 'required|array|max:500',
            'ids.*' => 'integer|exists:documents,id',
        ])['ids'];

        $results = [];
        $ok = 0;

        DB::transaction(function () use ($request, $ids, &$results, &$ok) {
            foreach ($ids as $id) {
                $docData = DB::selectOne("SELECT * FROM documents WHERE id = ?", [$id]);
                if (!$docData) {
                    $results[] = ['id' => $id, 'ok' => false, 'error' => 'not_found'];
                    continue;
                }

                $fields = EncryptedJson::decode($docData->extracted_fields);
                $barangay = $fields['barangay'] ?? '';
                $detectedType = $docData->detected_type ?: $docData->type;
                $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);

                if ($detectedType === 'marriage_license') {
                    $detectedType = 'marriage';
                }

                if (!$force && $this->hasTrueDuplicate($detectedType, $fields, (int)$id)) {
                    $results[] = ['id' => $id, 'ok' => false, 'error' => 'duplicate'];
                    continue;
                }

                // Soft name-match check
                $softMatch = $this->findSoftNameMatch($detectedType, $fields, (int)$id);
                if ($softMatch) {
                    $results[] = [
                        'id'           => $id,
                        'ok'           => false,
                        'error'        => 'softMatch',
                        'softMatchData' => [
                            'id'          => $softMatch->id,
                            'personName'  => $softMatch->personName,
                            'type'        => $softMatch->type,
                            'registryNo'  => $softMatch->certNumber ?? $softMatch->registry_number ?? 'N/A',
                            'barangay'    => $softMatch->barangay ?? 'N/A',
                            'date'        => $softMatch->date ?? $softMatch->created_at ?? 'N/A',
                        ],
                    ];
                    continue;
                }

                $personName = $this->buildFullName($fields, $detectedType) ?: $docData->name;
                $saveResult = $this->performSave($request, $id, $fields, $docData->ocr_text, $personName, $barangay, 'Processed', false, $detectedType);

                if ($saveResult) {
                    $results[] = ['id' => $id, 'ok' => true];
                    $ok++;
                } else {
                    $results[] = ['id' => $id, 'ok' => false, 'error' => 'save_failed'];
                }
            }
        });

        return response()->json([
            'success' => true,
            'approved' => $ok,
            'results' => $results,
        ]);
    }

    /**
     * Bulk delete multiple documents in a single request.
     * Replaces N sequential destroy calls with one batched request.
     */
    public function bulkDelete(Request $request)
    {
        $ids = $request->validate([
            'ids'   => 'required|array|max:500',
            'ids.*' => 'integer|exists:documents,id',
        ])['ids'];

        $deletedCount = 0;

        DB::transaction(function () use ($ids, &$deletedCount) {
            foreach ($ids as $id) {
                $document = DB::table('documents')->where('id', $id)->first();
                if (!$document) continue;

                $this->logHistory($id, 'Deleted');

                DB::table('documents')->where('id', $id)->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('issuances')->where('document_id', $id)->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

                DB::table('ticket_issuances')->where('document_id', $id)->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

                $deletedCount++;
            }
        });

        return response()->json([
            'success' => true,
            'deleted' => $deletedCount,
        ]);
    }

    /**
     * Single-factor duplicate detection: Registry Number scoped strictly by certificate type.
     * In civil registry operations, each civil registry book maintains its own registry series.
     * Registry Numbers are strictly unique within their respective certificate type.
     *
     * @param string $type         Normalized type: birth|death|marriage
     * @param array  $fields       Extracted fields from the current document
     * @param int    $excludeDocId Document ID to exclude from the check (the current one)
     */
    private function hasTrueDuplicate(string $type, array $fields, int $excludeDocId = 0): bool
    {
        $regNo = trim($fields['registry_number'] ?? $fields['registry_no'] ?? $fields['certNumber'] ?? '');
        if (empty($regNo)) {
            return false;
        }

        $normType = $type === 'marriage_license' ? 'marriage' : $type;

        // Check the pure Registry Database (issuances table).
        // ticket_issuances are citizen-request copies and must NOT trigger duplicate warnings.
        $registryQuery = DB::table('issuances')->whereNull('deleted_at');

        if ($normType === 'marriage') {
            $registryQuery->whereIn('type', ['marriage', 'marriage_license']);
        } elseif (!empty($normType) && $normType !== 'all') {
            $registryQuery->where('type', $normType);
        }

        if ($excludeDocId > 0) {
            $registryQuery->where('document_id', '!=', $excludeDocId);
        }

        $registryQuery->where(function ($q) use ($regNo) {
            $q->where('certNumber', $regNo)
              ->orWhere('registry_number', $regNo);
        });

        if ($registryQuery->exists()) {
            return true;
        }

        // Also check the staging documents table. A record sitting in
        // draft/extracted/checking status has not been promoted to the
        // registry yet, but it still represents a duplicate registration.
        $docsQuery = DB::table('documents')->whereNull('deleted_at');

        if ($normType === 'marriage') {
            $docsQuery->whereIn('type', ['marriage', 'marriage_license']);
        } elseif (!empty($normType) && $normType !== 'all') {
            $docsQuery->where('type', $normType);
        }

        if ($excludeDocId > 0) {
            $docsQuery->where('id', '!=', $excludeDocId);
        }

        $docsQuery->where(function ($q) use ($regNo) {
            $q->where('extracted_fields', 'like', '%"' . $regNo . '%')
              ->orWhere('metadata', 'like', '%"' . $regNo . '%');
        });

        return $docsQuery->exists();
    }

    /**
     * Soft name-match check: warns if a record with the same full name exists
     * in the registry (issuances) or staging (documents) tables, but the
     * registry number differs (or is missing). Returns the matched record
     * for side-by-side comparison, or null if no match.
     */
    private function findSoftNameMatch(string $type, array $fields, int $excludeDocId = 0): ?object
    {
        $fullName = $this->buildFullName($fields, $type);
        if (empty($fullName)) {
            return null;
        }

        $normType = $type === 'marriage_license' ? 'marriage' : $type;
        $regNo = trim($fields['registry_number'] ?? $fields['registry_no'] ?? $fields['certNumber'] ?? '');

        // Check issuances (registry) for same name, different registry number
        // Note: issuances table uses 'name' column, not 'personName'
        $registryQuery = DB::table('issuances')->whereNull('deleted_at');

        if ($normType === 'marriage') {
            $registryQuery->whereIn('type', ['marriage', 'marriage_license']);
        } elseif (!empty($normType) && $normType !== 'all') {
            $registryQuery->where('type', $normType);
        }

        if ($excludeDocId > 0) {
            $registryQuery->where('document_id', '!=', $excludeDocId);
        }

        // Use database-agnostic case-insensitive comparison on 'name' column
        $registryQuery->whereRaw('UPPER(name) = ?', [$fullName]);

        // If we have a registry number, exclude records that already match it (handled by hasTrueDuplicate)
        if (!empty($regNo)) {
            $registryQuery->where(function ($q) use ($regNo) {
                $q->where('certNumber', '!=', $regNo)
                  ->where('registry_number', '!=', $regNo);
            });
        }

        $match = $registryQuery->first();
        if ($match) {
            // Normalize: issuances uses 'name', documents uses 'personName'
            $match->personName = $match->name ?? $match->personName ?? '';
            return $match;
        }

        // Check documents (staging) for same name, different registry number
        $docsQuery = DB::table('documents')->whereNull('deleted_at');

        if ($normType === 'marriage') {
            $docsQuery->whereIn('type', ['marriage', 'marriage_license']);
        } elseif (!empty($normType) && $normType !== 'all') {
            $docsQuery->where('type', $normType);
        }

        if ($excludeDocId > 0) {
            $docsQuery->where('id', '!=', $excludeDocId);
        }

        $docsQuery->whereRaw('UPPER(personName) = ?', [$fullName]);

        // For SQLite compatibility, fetch candidates and filter in PHP
        $candidates = $docsQuery->get();
        
        if (!empty($regNo)) {
            $candidates = $candidates->filter(function ($c) use ($regNo) {
                $extracted = is_string($c->extracted_fields) 
                    ? json_decode($c->extracted_fields, true) 
                    : ($c->extracted_fields ?? []);
                $candidateRegNo = trim($extracted['registry_number'] ?? $extracted['registry_no'] ?? $extracted['certNumber'] ?? '');
                return $candidateRegNo !== $regNo;
            });
        }

        return $candidates->first() ?? null;
    }

    /**
     * Returns the full duplicate candidate record (or null).
     *
     * Same matching logic as hasTrueDuplicate(), but returns the matched
     * issuance row so the frontend can populate the side-by-side comparison
     * immediately — no extra async round-trip needed.
     */
    private function findDuplicateCandidate(string $type, array $fields, int $excludeDocId = 0): ?object
    {
        $regNo = trim($fields['registry_number'] ?? $fields['registry_no'] ?? $fields['certNumber'] ?? '');
        if (empty($regNo)) {
            return null;
        }

        $normType = $type === 'marriage_license' ? 'marriage' : $type;

        // Only check the pure Registry Database — ticket_issuances are not registry entries.
        $query = DB::table('issuances')->whereNull('deleted_at');

        if ($normType === 'marriage') {
            $query->whereIn('type', ['marriage', 'marriage_license']);
        } elseif (!empty($normType) && $normType !== 'all') {
            $query->where('type', $normType);
        }

        if ($excludeDocId > 0) {
            $query->where('document_id', '!=', $excludeDocId);
        }

        return $query->where(function ($q) use ($regNo) {
            $q->where('certNumber', $regNo)
              ->orWhere('registry_number', $regNo);
        })->first();
    }

    /**
     * Executes the build full name operation.
     */
    private function buildFullName($fields, $type)
    {
        if (!$fields || !is_array($fields)) return null;

        $cleanPart = function ($val) {
            if (!$val || !is_string($val)) return '';
            $trimmed = trim($val);
            if (str_contains($trimmed, '{') || str_contains($trimmed, '}') || str_contains($trimmed, '":') || str_contains($trimmed, 'is_valid_document')) {
                return '';
            }
            return strtoupper($trimmed);
        };

        if ($type === 'marriage' || $type === 'marriage_license') {
            $hLast = $cleanPart($fields['husband_last_name'] ?? '');
            $hFirst = $cleanPart($fields['husband_first_name'] ?? '');
            $hMiddle = $cleanPart($fields['husband_middle_name'] ?? '');
            $hSuffix = $cleanPart($fields['husband_suffix'] ?? '');
            $hParts = array_filter([$hLast ? "{$hLast}," : '', $hFirst, $hMiddle, $hSuffix]);
            $hName = implode(' ', $hParts);

            $wLast = $cleanPart($fields['wife_last_name'] ?? '');
            $wFirst = $cleanPart($fields['wife_first_name'] ?? '');
            $wMiddle = $cleanPart($fields['wife_middle_name'] ?? '');
            $wSuffix = $cleanPart($fields['wife_suffix'] ?? '');
            $wParts = array_filter([$wLast ? "{$wLast}," : '', $wFirst, $wMiddle, $wSuffix]);
            $wName = implode(' ', $wParts);

            $joined = implode(' & ', array_filter([$hName, $wName]));
            return $joined ? strtoupper($joined) : null;
        }

        $last = $cleanPart($fields['last_name'] ?? $fields['child_last_name'] ?? $fields['deceased_last_name'] ?? '');
        $first = $cleanPart($fields['first_name'] ?? $fields['child_first_name'] ?? $fields['deceased_first_name'] ?? '');
        $middle = $cleanPart($fields['middle_name'] ?? $fields['child_middle_name'] ?? $fields['deceased_middle_name'] ?? '');
        $suffix = $cleanPart($fields['suffix'] ?? '');

        $parts = array_filter([$last ? "{$last}," : '', $first, $middle, $suffix]);
        $name = implode(' ', $parts);

        return $name ? strtoupper($name) : null;
    }

    /**
     * Shared logic for saving/approving a document
     */
    private function performSave($request, $id, $extractedFields, $ocrText, $personName, $barangay, $status, $parentalConsent, $detectedType = null)
    {
        if (empty($detectedType)) {
            $docTypeInDb = DB::table('documents')->where('id', $id)->value('type');
            $detectedType = $docTypeInDb ?: 'birth';
        }

        // Sanitize any extractedFields: convert empty, 'n/a', 'Select...', or stringified JSON dumps to null
        if (is_array($extractedFields)) {
            foreach ($extractedFields as $k => $v) {
                if (is_string($v)) {
                    $t = trim($v);
                    $lower = strtolower($t);
                    if ($t === '' || $lower === 'n/a' || $lower === 'not applicable' || $t === 'Select...' || str_contains($v, 'is_valid_document') || (str_starts_with($t, '{') && str_contains($v, '":'))) {
                        $extractedFields[$k] = null;
                    }
                } elseif ($v === '') {
                    $extractedFields[$k] = null;
                }
            }
        }

        // Re-calculate personName if it wasn't explicitly provided, if generic placeholder, or if it contains JSON fragments
        if (empty($personName) || $personName === 'Document Data' || str_contains($personName, '{') || str_contains($personName, 'is_valid_document')) {
            $computedName = $this->buildFullName($extractedFields, $detectedType);
            if (!empty($computedName)) {
                $personName = $computedName;
            } elseif (str_contains($personName, '{')) {
                $personName = 'Document Record';
            }
        }

        // --- Type mismatch enforcement ---
        // If OCR detected a certificate type that differs from the upload
        // category, reject the save unless the staff member explicitly chose
        // the detected type or passed force=true to override. This backs up
        // the frontend mismatch guard at the API trust boundary so a direct
        // API call cannot register a birth certificate as a death record.
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);
        if (!$force) {
            $docRow = DB::table('documents')->where('id', $id)->first();
            if ($docRow) {
                $ocrDetected = !empty($docRow->detected_type) ? strtolower($docRow->detected_type) : '';
                $uploadCat   = !empty($docRow->type) ? strtolower($docRow->type) : '';
                $saveType    = !empty($detectedType) ? strtolower($detectedType) : '';

                // Normalize marriage_license → marriage for comparison
                if ($ocrDetected === 'marriage_license') $ocrDetected = 'marriage';
                if ($uploadCat === 'marriage_license') $uploadCat = 'marriage';

                if (!empty($ocrDetected) && $ocrDetected !== 'unknown'
                    && !empty($uploadCat) && $ocrDetected !== $uploadCat
                    && $saveType === $uploadCat) {
                    return response()->json([
                        'success' => false,
                        'error'   => "Certificate type mismatch: OCR detected '{$ocrDetected}' but the document is categorized as '{$uploadCat}'. Please review and select the correct type, or use force to override.",
                    ], 422);
                }
            }
        }

        return DB::transaction(function () use ($request, $id, $extractedFields, $ocrText, $personName, $barangay, $status, $parentalConsent, $detectedType) {
            try {
            // Get current user encoded_by logic based on custom session setup
            $userId = $request->session()->get('user_id');
            $user = $userId ? \App\Models\User::find($userId) : null;
            $encodedBy = $user ? $user->name : 'System';

            DB::update(
                "UPDATE documents SET extracted_fields = ?, ocr_text = ?, personName = ?, barangay = ?, status = ?, parental_consent = ?, encoded_by = ?, detected_type = ? WHERE id = ?",
                [
                    // documents.extracted_fields is plaintext JSON during the draft/review
                    // phase. Encryption is applied only when promoting to the registry
                    // database (issuances.extracted_data) below.
                    json_encode($extractedFields, JSON_UNESCAPED_UNICODE),
                    $ocrText,
                    $personName,
                    $barangay,
                    $status,
                    $parentalConsent ? 1 : 0,
                    $encodedBy,
                    $detectedType,
                    $id,
                ]
            );

            // --- Automatically inject or UPDATE in Issuances (Master Registry) if Processed or Issued ---
            if ($status === 'Processed' || $status === 'Issued') {
                // 1. Check if a Master Record already exists for this document
                $existing = DB::select("SELECT id, certNumber FROM issuances WHERE document_id = ?", [$id]);
                
                $doc = DB::select("SELECT * FROM documents WHERE id = ?", [$id]);
                if (count($doc) > 0) {
                    $docType = $doc[0]->detected_type ?: $doc[0]->type;

                    // --- Logic Fix: Infer type from certNumber prefix if unknown ---
                    if (empty($docType) || strtolower($docType) === 'unknown') {
                        $p = strtoupper($prefix ?? '');
                        if (str_starts_with($p, 'BC')) $docType = 'birth';
                        elseif (str_starts_with($p, 'DC')) $docType = 'death';
                        elseif (str_starts_with($p, 'ML') || str_starts_with($p, 'MC')) $docType = 'marriage';
                    }
                    
                    // Keep the original upload as the issuance source of truth, or auto-generate official PDF
                    $issuanceFilePath  = $doc[0]->file_path;
                    $issuanceImagePath = $doc[0]->image_path ?? null;

                    if (empty($issuanceFilePath) || !\Storage::disk('local')->exists($issuanceFilePath)) {
                        try {
                            $pdfService = app(\App\Services\CertificatePdfGeneratorService::class);
                            $pdfService->generateForDocument($id);
                            $issuanceFilePath = DB::table('documents')->where('id', $id)->value('file_path');
                        } catch (\Throwable $e) {
                            \Log::warning("Auto PDF generation in performSave for document {$id}: " . $e->getMessage());
                        }
                    }

                    $normCertType = 'birth';
                    if ($docType === 'death') {
                        $normCertType = 'death';
                    } elseif ($docType === 'marriage' || $docType === 'marriage_license') {
                        $normCertType = 'marriage';
                    }

                    $ticketRecord = DB::table('tickets')->where('document_id', $id)->first();
                    $ticketNumber = $ticketRecord ? $ticketRecord->ticket_number : null;

                    if (count($existing) > 0) {
                        // 2. UPDATE existing Master Record (Sync certNumber if registry_number provided)
                        // Extract registry_number for the new searchable column
                        $userRegNo = trim($extractedFields['registry_number'] ?? $extractedFields['registry_no'] ?? '');
                        $registryNumber = !empty($userRegNo) ? $userRegNo : null;

                        $updateData = [
                            'type' => $docType,
                            'certificate_type' => $normCertType,
                            'name' => $personName,
                            'barangay' => $barangay,
                            'status' => 'Active',
                            'encoded_by' => $encodedBy,
                            'extracted_data' => EncryptedJson::encode($extractedFields),
                            'registry_number' => $registryNumber,
                            'file_path' => $issuanceFilePath,
                            'image_path' => $issuanceImagePath,
                            'updated_at' => now()
                        ];

                        // If a ticket is linked, set or_number and requested_by if they aren't already set
                        $existingRecord = DB::table('issuances')->where('document_id', $id)->first();
                        if ($existingRecord && $ticketNumber) {
                            if (empty($existingRecord->or_number)) {
                                $updateData['or_number'] = 'OR-' . date('Ymd') . '-' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
                            }
                            if (empty($existingRecord->requested_by)) {
                                $updateData['requested_by'] = $encodedBy;
                            }
                        }

                        DB::table('issuances')->where('document_id', $id)->update($updateData);
                    } else {
                        // 3. INSERT new Master Record (Generate NEW certNumber with Atomic Concurrency Lock, preferring user registry_number)
                        Cache::lock('issuance_cert_number_lock', 10)->block(5, function () use ($docType, $normCertType, $personName, $barangay, $encodedBy, $id, $extractedFields, $issuanceFilePath, $issuanceImagePath, $ticketNumber) {
                            $prefix = ($docType === 'death') ? 'DC' : (($docType === 'marriage' || $docType === 'marriage_license') ? 'ML' : 'BC');
                            $year = date('Y');
                            
                            $results = DB::select("SELECT MAX(id) as max_id FROM issuances");
                            $nextNum = 1;
                            if (count($results) > 0 && $results[0]->max_id !== null) {
                                $nextNum = intval($results[0]->max_id) + 1;
                            }
                            
                            $genCertNumber = $prefix . '-' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
                            $userRegNo = trim($extractedFields['registry_number'] ?? $extractedFields['registry_no'] ?? '');
                            $certNumber = !empty($userRegNo) ? $userRegNo : $genCertNumber;
                            $registryNumber = !empty($userRegNo) ? $userRegNo : null;
                            $issuanceDate = date('m/d/Y');

                            $insertData = [
                                'certNumber' => $certNumber,
                                'type' => $docType,
                                'certificate_type' => $normCertType,
                                'name' => $personName,
                                'barangay' => $barangay,
                                'issuanceDate' => $issuanceDate,
                                'status' => 'Active',
                                'encoded_by' => $encodedBy,
                                'document_id' => $id,
                                'extracted_data' => EncryptedJson::encode($extractedFields),
                                'registry_number' => $registryNumber,
                                'file_path' => $issuanceFilePath,
                                'image_path' => $issuanceImagePath,
                                'created_at' => now(),
                                'updated_at' => now()
                            ];

                            if ($ticketNumber) {
                                $insertData['or_number'] = 'OR-' . date('Ymd') . '-' . str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
                                $insertData['requested_by'] = $encodedBy;
                            }

                            DB::table('issuances')->insert($insertData);
                        });
                    }
                }
            }

            $this->logHistory($id, $status, [
                'person_name' => $personName,
                'barangay' => $barangay,
                'type' => $detectedType
            ]);

            Cache::forget('dashboard_stats_cache');

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            // Use mb_convert_encoding to ensure the error message is safe for JSON/Logging
            // We EXPLICITLY do NOT log the trace here because it may contain binary PDF data
            $rawMsg = $e->getMessage();
            $safeError = mb_convert_encoding($rawMsg, 'UTF-8', 'UTF-8');
            \Log::error("Document Save/Approve Error: " . $safeError . " on line " . $e->getLine() . " in " . $e->getFile());
            
            // Format beginner/user-friendly message if it's a database constraint failure
            $userMsg = 'System sync failure: ' . $safeError;
            if (str_contains($rawMsg, 'UNIQUE constraint failed') || str_contains($rawMsg, 'Duplicate entry')) {
                $userMsg = 'A record with this Registry Number already exists in the registry. Please check or edit the registry number before saving.';
            }
            
            return response()->json([
                'success' => false, 
                'error' => $userMsg
            ], 500);
        }
    });
}

    /**
     * Delete document
     */
    public function destroy($id)
    {
        $document = DB::table('documents')->where('id', $id)->first();
        if (!$document) {
            return response()->json(['success' => false, 'error' => 'Document not found'], 404);
        }

        DB::transaction(function () use ($id, $document) {
            $this->logHistory($id, 'Deleted');

            DB::table('documents')->where('id', $id)->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

            // Soft-delete linked registry issuance rows
            DB::table('issuances')->where('document_id', $id)->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

            // Soft-delete linked ticket issuances (citizen-request copies)
            DB::table('ticket_issuances')->where('document_id', $id)->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

            // Ensure deletion is captured in activity_logs (avoid duplicate if recently logged from frontend)
            $recentlyLogged = DB::table('activity_logs')
                ->where('record_type', 'Document')
                ->where('record_id', $id)
                ->where('action', 'like', '%Delet%')
                ->where('created_at', '>=', now()->subSeconds(5))
                ->exists();

            if (!$recentlyLogged) {
                $userName = request()->session()->get('user_name') 
                    ?: (auth()->user()?->name ?? ($document->encoded_by ?? 'System Staff'));
                DB::table('activity_logs')->insert([
                    'user_name' => $userName,
                    'action' => 'Deleted',
                    'record_type' => 'Document',
                    'record_id' => $id,
                    'details' => "Deleted document #{$id}" . (!empty($document->name) ? " ({$document->name})" : ""),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            Cache::forget('dashboard_stats_cache');
        });

        return response()->json(['success' => true]);
    }

    /**
     * Undo soft delete for document
     */
    public function undo($id)
    {
        $document = DB::table('documents')->where('id', $id)->first();
        if (!$document) {
            return response()->json(['success' => false, 'error' => 'Document not found'], 404);
        }

        DB::transaction(function () use ($id) {
            DB::table('documents')->where('id', $id)->update([
                'deleted_at' => null,
                'updated_at' => now(),
            ]);

            DB::table('issuances')->where('document_id', $id)->update([
                'deleted_at' => null,
                'updated_at' => now(),
            ]);

            \Illuminate\Support\Facades\Cache::forget('dashboard_stats_cache');
        });

        return response()->json(['success' => true]);
    }

    /**
     * Download/view file from database
     */
    /**
     * Download the document (as attachment)
     */
    public function download($id)
    {
        return $this->serveDocument($id, 'attachment');
    }

    /**
     * View the document (inline)
     */
    public function view($id)
    {
        return $this->serveDocument($id, 'inline');
    }

    /**
     * View the document's A4 picture scan (inline image)
     */
    public function viewImage($id)
    {
        $doc = DB::table('documents')->where('id', $id)->first();
        if (!$doc) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $imagePath = $doc->image_path;

        // If imagePath is a PDF, or missing, check if there is an extracted page image in storage
        if (empty($imagePath) || str_ends_with(strtolower($imagePath), '.pdf') || !\Storage::disk('local')->exists($imagePath)) {
            $basePath = !empty($doc->file_path) ? $doc->file_path : $imagePath;
            if (!empty($basePath)) {
                $dir = dirname($basePath);
                $filename = pathinfo($basePath, PATHINFO_FILENAME);
                $candidates = [
                    $dir . '/' . $filename . '_image.jpg',
                    $dir . '/' . $filename . '_page_1_proc.jpg',
                    $dir . '/' . $filename . '_page_1.jpg',
                    $dir . '/' . $filename . '_proc.jpg',
                ];
                foreach ($candidates as $cand) {
                    if (\Storage::disk('local')->exists($cand)) {
                        $imagePath = $cand;
                        break;
                    }
                }
            }
        }

        if (empty($imagePath) || !\Storage::disk('local')->exists($imagePath)) {
            // Fall back to serveDocument if image_path is empty or missing
            return $this->serveDocument($id, 'inline');
        }

        $fullPath = \Storage::disk('local')->path($imagePath);
        $mimetype = \Illuminate\Support\Facades\File::mimeType($fullPath) ?: 'image/jpeg';

        return response()->file($fullPath, [
            'Content-Type' => $mimetype,
            'Content-Disposition' => 'inline; filename="' . basename($fullPath) . '"'
        ]);
    }

    /**
     * Shared logic for serving document content
     */
    private function serveDocument($id, $disposition = 'inline')
    {
        $request = request();
        $documents = DB::select("SELECT * FROM documents WHERE id = ?", [$id]);

        if (count($documents) === 0) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        $doc = $documents[0];
        $metadata = json_decode($doc->metadata ?? '[]', true) ?: [];
        $status = strtolower($doc->status ?? 'pending');

        if (empty($doc->file_path) || !\Storage::disk('local')->exists($doc->file_path)) {
            // Attempt to generate official standardized certificate PDF first
            try {
                $pdfService = app(\App\Services\CertificatePdfGeneratorService::class);
                $generatedPath = $pdfService->generateForDocument((int)$id);
                if ($generatedPath && file_exists($generatedPath)) {
                    $cleanName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $doc->personName ?: 'Document');
                    $filename = "{$cleanName}_doc_{$id}.pdf";
                    return response()->file($generatedPath, [
                        'Content-Type' => 'application/pdf',
                        'Content-Disposition' => $disposition . '; filename="' . addslashes($filename) . '"',
                    ]);
                }
            } catch (\Throwable $e) {
                \Log::warning("Could not auto-generate PDF for document {$id}: " . $e->getMessage());
            }

            $docTypeTitle = ucfirst($doc->type ?? 'Civil Registry') . ' Record';
            $personNameStr = htmlspecialchars($doc->personName ?? 'Manual Entry');
            $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" fill="none">
                <rect width="600" height="800" fill="#f8fafc"/>
                <rect x="40" y="40" width="520" height="720" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
                <circle cx="300" cy="330" r="48" fill="#e0e7ff"/>
                <path d="M285 330H315M300 315V345" stroke="#4f46e5" stroke-width="4" stroke-linecap="round"/>
                <text x="300" y="420" font-family="sans-serif" font-size="20" font-weight="900" fill="#0f172a" text-anchor="middle">' . $docTypeTitle . '</text>
                <text x="300" y="450" font-family="sans-serif" font-size="15" font-weight="bold" fill="#475569" text-anchor="middle">' . $personNameStr . '</text>
                <text x="300" y="485" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Manual Registration • Scanned Document File Not Attached</text>
            </svg>';
            return response($svg, 200, [
                'Content-Type' => 'image/svg+xml',
                'Content-Disposition' => 'inline; filename="manual_placeholder.svg"'
            ]);
        }

        $fullPath = \Storage::disk('local')->path($doc->file_path);
        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        $mimetype = \Illuminate\Support\Facades\File::mimeType($fullPath)
            ?: ($metadata['mimetype'] ?? null);

        if (!$mimetype) {
            $mimetype = match ($ext) {
                'png' => 'image/png',
                'jpg', 'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'gif' => 'image/gif',
                'pdf' => 'application/pdf',
                default => 'application/octet-stream',
            };
        }

        // If it's a PDF and we're asking for the raw preview, prefer the dual A4 picture scan or generated page images.
        if ($request->has('raw') && $ext === 'pdf') {
            $dir = dirname($fullPath);
            $base = pathinfo($fullPath, PATHINFO_FILENAME);

            $candidates = [
                $dir . '/' . $base . '_image.jpg',
                $dir . '/' . $base . '_page_1_proc.jpg',
                $dir . '/' . $base . '_page_1.jpg',
                $dir . '/' . $base . '_proc.jpg',
            ];

            foreach ($candidates as $candidate) {
                if (file_exists($candidate)) {
                    return response()->file($candidate, [
                        'Content-Type' => 'image/jpeg',
                        'Content-Disposition' => 'inline; filename="preview.jpg"'
                    ]);
                }
            }
        }

        $rawName = $metadata['originalName'] ?? $doc->name ?? basename($fullPath);
        $cleanName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', trim($rawName));
        if (strtolower(pathinfo($cleanName, PATHINFO_EXTENSION)) !== $ext) {
            $downloadFileName = rtrim($cleanName, '._') . '.' . $ext;
        } else {
            $downloadFileName = $cleanName;
        }

        return response()->file($fullPath, [
            'Content-Type' => $mimetype,
            'Content-Disposition' => $disposition . '; filename="' . addslashes($downloadFileName) . '"'
        ]);
    }

    /**
     * Download the extracted OCR text as a .txt file
     */
    public function downloadTxt($id)
    {
        $doc = DB::selectOne("SELECT name, ocr_text FROM documents WHERE id = ?", [$id]);

        if (!$doc || !$doc->ocr_text) {
            return response()->json(['error' => 'No text content available.'], 404);
        }

        $filename = pathinfo($doc->name, PATHINFO_FILENAME) . '.txt';

        return response($doc->ocr_text)
            ->header('Content-Type', 'text/plain')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
    }

    /**
     * Helper to log document activity persistently
     */
    private function logHistory($id, $action, $overrides = [])
    {
        try {
            // Select ONLY non-binary columns to prevent UTF-8 encoding issues in logs/exceptions
            $doc = DB::selectOne("SELECT id, name, personName, type, detected_type, barangay, encoded_by FROM documents WHERE id = ?", [$id]);
            if (!$doc) return;

            $userId = request()->session()->get('user_id');
            $user = $userId ? \App\Models\User::find($userId) : null;
            $encodedBy = $user ? $user->name : ($doc->encoded_by ?? 'System');

            $data = [
                'filename'    => $overrides['filename'] ?? $doc->name,
                'person_name' => $overrides['person_name'] ?? $doc->personName,
                'type'        => $overrides['type'] ?? ($doc->detected_type ?: $doc->type),
                'barangay'    => $overrides['barangay'] ?? $doc->barangay,
                'encoded_by'  => $encodedBy,
                'details'     => json_encode($overrides['details'] ?? []),
                'updated_at'  => now()
            ];

            // Check if this action for this document already exists to prevent duplication
            $exists = DB::table('document_history_logs')
                ->where('document_id', $id)
                ->where('action', $action)
                ->first();

            if ($exists) {
                DB::table('document_history_logs')
                    ->where('id', $exists->id)
                    ->update($data);
            } else {
                $data['document_id'] = $id;
                $data['action']      = $action;
                $data['created_at']  = now();
                DB::table('document_history_logs')->insert($data);
            }
        } catch (\Exception $e) {
            \Log::error("Failed to log document history: " . $e->getMessage());
        }
    }

    /**
     * Get soft-deleted documents (Archive Manager view)
     */
    public function archived(Request $request)
    {
        $page = (int) $request->query('page', 1);
        $perPage = min((int) $request->query('per_page', 20), 100);
        $type = $request->query('type', '');
        $search = $request->query('search', '');

        // Build query
        $whereClause = " WHERE deleted_at IS NOT NULL";
        $params = [];

        if (!empty($type) && $type !== 'all') {
            $whereClause .= " AND type = ?";
            $params[] = $type;
        }

        if (!empty($search)) {
            $whereClause .= " AND (name LIKE ? OR personName LIKE ? OR barangay LIKE ?)";
            $searchTerm = "%{$search}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM documents" . $whereClause;
        $totalResult = DB::select($countQuery, $params);
        $total = $totalResult[0]->total;

        // Get paginated results
        $query = "SELECT id, name, type, date, size, status, personName, barangay, metadata, ocr_text, extracted_fields, detected_type, created_at, updated_at, encoded_by, deleted_at 
                  FROM documents" . $whereClause . " ORDER BY deleted_at DESC LIMIT ? OFFSET ?";
        
        $params[] = $perPage;
        $params[] = ($page - 1) * $perPage;

        $documents = DB::select($query, $params);

        foreach ($documents as $doc) {
            $doc->extracted_fields = EncryptedJson::decode($doc->extracted_fields);
        }

        return response()->json([
            'data' => $documents,
            'meta' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
            ]
        ]);
    }

    /**
     * Permanently delete a document from the system (Purge)
     */
    public function purge(Request $request, $id)
    {
        $document = DB::table('documents')->where('id', $id)->first();
        
        if (!$document) {
            return response()->json(['success' => false, 'error' => 'Document not found'], 404);
        }

        return DB::transaction(function () use ($request, $id, $document) {
            // 1. Delete actual file from storage
            if (!empty($document->file_path)) {
                if (Storage::disk('local')->exists($document->file_path)) {
                    Storage::disk('local')->delete($document->file_path);
                }
            }

            // 2. Delete linked issuance files if applicable
            $issuances = DB::table('issuances')->where('document_id', $id)->get();
            foreach ($issuances as $iss) {
                if (!empty($iss->file_path) && Storage::disk('local')->exists($iss->file_path)) {
                    Storage::disk('local')->delete($iss->file_path);
                }
            }
            $ticketIssuances = DB::table('ticket_issuances')->where('document_id', $id)->get();
            foreach ($ticketIssuances as $ti) {
                if (!empty($ti->file_path) && Storage::disk('local')->exists($ti->file_path)) {
                    Storage::disk('local')->delete($ti->file_path);
                }
            }

            // 3. Log history of purge
            $this->logHistory($id, 'Purged', [
                'filename' => $document->name,
                'person_name' => $document->personName,
                'type' => $document->detected_type ?: $document->type,
                'barangay' => $document->barangay
            ]);

            // 4. Delete DB records - delete issuances FIRST due to FK ON DELETE SET NULL
            DB::table('issuances')->where('document_id', $id)->delete();
            DB::table('ticket_issuances')->where('document_id', $id)->delete();
            DB::table('documents')->where('id', $id)->delete();
            DB::table('document_ocr_pages')->where('document_id', $id)->delete();

            \Illuminate\Support\Facades\Cache::forget('dashboard_stats_cache');

            return response()->json(['success' => true]);
        });
    }

    /**
     * POST /api/documents/{id}/check-duplicate
     * Check if a record with the same Registry Number exists in the Master Registry (issuances table),
     * scoped strictly to the certificate type (Birth, Death, Marriage).
     */
    public function checkDuplicate(Request $request, $id)
    {
        $type = $request->input('type');
        $fields = $request->input('fields', []);

        if (is_string($fields)) {
            $fields = json_decode($fields, true) ?: [];
        }

        if (empty($fields)) {
            return response()->json([
                'success' => true,
                'duplicate' => false,
                'candidate' => null
            ]);
        }

        $regNo = trim($fields['registry_number'] ?? $fields['registry_no'] ?? $fields['certNumber'] ?? '');
        if (empty($regNo)) {
            return response()->json([
                'success' => true,
                'duplicate' => false,
                'candidate' => null
            ]);
        }

        // Normalize matching type to match standard issuances types
        $normType = $type;
        if ($type === 'marriage_license') {
            $normType = 'marriage';
        }

        $query = DB::table('issuances')
            ->whereNull('deleted_at');

        if ($normType === 'marriage') {
            $query->whereIn('type', ['marriage', 'marriage_license']);
        } elseif (!empty($normType) && $normType !== 'all') {
            $query->where('type', $normType);
        }

        if (is_numeric($id) && (int)$id > 0) {
            $query->where('document_id', '!=', (int)$id);
        }

        $candidate = $query->where(function ($q) use ($regNo) {
            $q->where('certNumber', $regNo)
              ->orWhere('registry_number', $regNo);
        })->first();

        if ($candidate) {
            return response()->json([
                'success' => true,
                'duplicate' => true,
                'candidate' => [
                    'id' => $candidate->id,
                    'certNumber' => $candidate->certNumber,
                    'type' => $candidate->type,
                    'name' => $candidate->name,
                    'barangay' => $candidate->barangay,
                    'issuanceDate' => $candidate->issuanceDate,
                    'encoded_by' => $candidate->encoded_by,
                    'registry_number' => $candidate->registry_number,
                    'extracted_fields' => EncryptedJson::decode($candidate->extracted_data)
                ]
            ]);
        }

        return response()->json([
            'success' => true,
            'duplicate' => false,
            'candidate' => null
        ]);
    }

    /**
     * POST /api/documents/manual
     * Create a manual document record (supports attached scanned file/picture or synthetic dummy mode).
     */
    public function storeManual(Request $request)
    {
        $rawExtracted = $request->input('extracted_fields', []);
        if (is_string($rawExtracted)) {
            $decoded = json_decode($rawExtracted, true);
            if (is_array($decoded)) {
                $rawExtracted = $decoded;
            }
        }
        $request->merge(['extracted_fields' => $rawExtracted]);

        $isDummy = filter_var($request->input('is_dummy', false), FILTER_VALIDATE_BOOLEAN);

        $request->validate([
            'type' => 'required|string|in:birth,death,marriage,marriage_license',
            'extracted_fields' => 'required|array',
            'parental_consent' => 'nullable',
            'is_dummy' => 'nullable',
            'force' => 'nullable',
            'file' => 'nullable|file|max:20480|mimes:pdf,png,jpg,jpeg,tiff,bmp,webp'
        ]);

        $userId = $request->session()->get('user_id');
        $user = $userId ? \App\Models\User::find($userId) : null;
        $encodedBy = $user ? $user->name : 'System';

        $docType = $request->input('type');
        $extractedFields = $request->input('extracted_fields', []);
        $parentalConsent = filter_var($request->input('parental_consent', false), FILTER_VALIDATE_BOOLEAN);
        $isDummy = filter_var($request->input('is_dummy', false), FILTER_VALIDATE_BOOLEAN);
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);
        
        $normType = $docType;
        if ($docType === 'marriage_license') {
            $normType = 'marriage';
        }

        // Normalize empty, 'n/a', and placeholder fields to null
        if (is_array($extractedFields)) {
            foreach ($extractedFields as $k => $v) {
                if (is_string($v)) {
                    $t = trim($v);
                    $lower = strtolower($t);
                    if ($t === '' || $lower === 'n/a' || $lower === 'not applicable' || $t === 'Select...' || str_contains($v, 'is_valid_document') || (str_starts_with($t, '{') && str_contains($v, '":'))) {
                        $extractedFields[$k] = null;
                    }
                } elseif ($v === '') {
                    $extractedFields[$k] = null;
                }
            }
        }

        // Validate extracted fields before creating database records
        $valError = $this->validateExtractedFields($extractedFields, $normType);
        if ($valError) {
            return response()->json([
                'success' => false,
                'error'   => $valError,
            ], 422);
        }

        // Duplication check strictly on registry_number scoped by certificate type
        if (!$force && $this->hasTrueDuplicate($normType, $extractedFields)) {
            $regNo = trim($extractedFields['registry_number'] ?? $extractedFields['registry_no'] ?? '');
            return response()->json([
                'success'   => false,
                'duplicate' => true,
                'error'     => "A record with Registry No. \"{$regNo}\" already exists in the " . ucfirst($normType) . " Registry. Confirm to override.",
            ], 422);
        }

        // Soft name-match warning: same person name but different registry number
        // This is a warning only - it does NOT block the save, just informs the user
        $softMatch = $this->findSoftNameMatch($normType, $extractedFields);
        $softMatchData = null;
        if ($softMatch) {
            $softMatchData = [
                'id'          => $softMatch->id,
                'personName'  => $softMatch->personName,
                'type'        => $softMatch->type,
                'registryNo'  => $softMatch->certNumber ?? $softMatch->registry_number ?? 'N/A',
                'barangay'    => $softMatch->barangay ?? 'N/A',
                'date'        => $softMatch->date ?? $softMatch->created_at ?? 'N/A',
            ];
        }

        // Build personName
        $personName = $this->buildFullName($extractedFields, $normType);
        $barangay = $extractedFields['barangay'] ?? '';

        // Handle uploaded file (if provided and not dummy mode)
        $uploadedFile = $request->file('file');
        $filePath  = null;
        $imagePath = null;
        $size      = '0 KB';
        $docName   = 'Manual Entry - ' . date('m/d/Y H:i');

        if ($uploadedFile && $uploadedFile->isValid() && !$isDummy) {
            $this->validateUploadedFile($uploadedFile);
            $converter = new \App\Services\DocumentPdfConverterService();
            $dualPaths = $converter->processUploadedFile($uploadedFile);
            $filePath  = $dualPaths['file_path'];
            $imagePath = $dualPaths['image_path'];
            $size      = number_format($uploadedFile->getSize() / (1024 * 1024), 2) . ' MB';
            $docName   = $uploadedFile->getClientOriginalName();
        }

        // Create document record with Processed status directly (so it never appears in the queue)
        $newId = DB::table('documents')->insertGetId([
            'name' => $docName,
            'type' => $docType,
            'date' => date('m/d/Y'),
            'size' => $size,
            'status' => 'Processed',
            'personName' => $personName,
            'barangay' => $barangay,
            'file_path' => $filePath, 
            'image_path' => $imagePath,
            'encoded_by' => $encodedBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // This method does dynamic template compilation and handles Master registry insert
        $response = $this->performSave($request, $newId, $extractedFields, '', $personName, $barangay, 'Processed', $parentalConsent, $docType);

        // Add soft match data to response if there was a soft match
        if ($softMatchData) {
            $responseData = $response->getData(true);
            $responseData['softMatch'] = true;
            $responseData['softMatchData'] = $softMatchData;
            $responseData['warning'] = "A record with the same name (" . $softMatchData['personName'] . ") exists in the " . ucfirst($normType) . " Registry with Registry No. \"" . $softMatchData['registryNo'] . "\". Verify this is not the same person before proceeding.";
            $response = response()->json($responseData, $response->getStatusCode());
        }

        // If no document file was uploaded (e.g. Dummy Data Mode), generate synthetic certificate PDF
        if (empty($filePath)) {
            try {
                app(\App\Services\CertificatePdfGeneratorService::class)->generateForDocument($newId);
            } catch (\Throwable $e) {
                \Log::error("Failed to generate PDF for manual document {$newId}: " . $e->getMessage());
            }
        }

        return $response;
    }

    /**
     * Get list of months that have document records with record counts.
     */
    public function availableMonths(Request $request)
    {
        $source = $request->query('source', 'internal');
        
        if ($source === 'procured') {
            // Client Procured data is in ticket_issuances, not issuances
            $rows = DB::table('ticket_issuances')
                ->whereNull('deleted_at')
                ->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")
                ->groupBy('ym')
                ->orderBy('ym', 'desc')
                ->get();
        } elseif ($source === 'all') {
            $docRows = DB::table('documents')->whereNull('deleted_at')->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")->groupBy('ym')->pluck('c', 'ym')->toArray();
            $issRows = DB::table('issuances')->whereNull('deleted_at')->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")->groupBy('ym')->pluck('c', 'ym')->toArray();
            $procRows = DB::table('ticket_issuances')->whereNull('deleted_at')->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")->groupBy('ym')->pluck('c', 'ym')->toArray();
            $allKeys = array_unique(array_merge(array_keys($docRows), array_keys($issRows), array_keys($procRows)));
            rsort($allKeys);
            $monthCounts = [];
            foreach ($allKeys as $k) {
                if (!empty($k)) {
                    $monthCounts[$k] = (int) (($docRows[$k] ?? 0) + ($issRows[$k] ?? 0) + ($procRows[$k] ?? 0));
                }
            }
            return response()->json(['success' => true, 'months' => $monthCounts]);
        } else {
            // Internal Master Registry (pure issuances table — no ticket_number column)
            $rows = DB::table('issuances')
                ->whereNull('deleted_at')
                ->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")
                ->groupBy('ym')
                ->orderBy('ym', 'desc')
                ->get();
        }

        $monthCounts = [];
        foreach ($rows as $row) {
            if (!empty($row->ym)) {
                $monthCounts[$row->ym] = (int) $row->c;
            }
        }

        return response()->json([
            'success' => true,
            'months'  => $monthCounts
        ]);
    }

    /**
     * Export Civil Registry Documents Report in CSV or Excel format (PSA-Aligned).
     * Client Requirement: Data-only export for official PSA forms submission.
     */
    public function exportReport(Request $request)
    {
        $rawType = $request->query('type', 'all');
        $types = is_array($rawType) ? $rawType : explode(',', $rawType);
        $types = array_filter(array_map('trim', array_map('strtolower', $types)));

        $format = strtolower(trim($request->query('format', 'csv')));
        $source = strtolower(trim($request->query('source', 'internal'))); // 'internal', 'procured', or 'all'
        $barangay = trim($request->query('barangay', 'all'));
        $status = trim($request->query('status', 'all'));
        $dateFrom = $request->query('date_from', '');
        $dateTo = $request->query('date_to', '');

        $records = [];

// 1. Fetch from ticket_issuances (Client Procured) if needed.
    // Citizen-request copies live in ticket_issuances, NOT the pure Registry
    // Database (issuances). The old ticket_number-based split is gone.
        if ($source === 'procured' || $source === 'all') {
            $conditions = ["ti.deleted_at IS NULL"];
            $params = [];

            if (!empty($types) && !in_array('all', $types)) {
                $placeholders = implode(',', array_fill(0, count($types), '?'));
                $conditions[] = "LOWER(ti.type) IN ($placeholders)";
                foreach ($types as $t) {
                    $params[] = $t;
                }
            }

            if (!empty($barangay) && $barangay !== 'all') {
                $conditions[] = "ti.barangay = ?";
                $params[] = $barangay;
            }

            if (!empty($status) && $status !== 'all') {
                $conditions[] = "LOWER(ti.status) = ?";
                $params[] = strtolower($status);
            }

            if (!empty($dateFrom)) {
                $conditions[] = "DATE(ti.created_at) >= ?";
                $params[] = $dateFrom;
            }

            if (!empty($dateTo)) {
                $conditions[] = "DATE(ti.created_at) <= ?";
                $params[] = $dateTo;
            }

            $whereClause = " WHERE " . implode(" AND ", $conditions);
            $query = "SELECT ti.id, ti.certNumber, ti.type, ti.name, ti.barangay, ti.status, ti.issuanceDate,
                             ti.encoded_by, ti.or_number, ti.print_remarks, ti.requested_by, ti.approved_by,
                             ti.ticket_number, ti.extracted_data, ti.created_at
                       FROM ticket_issuances ti" . $whereClause . " ORDER BY ti.id DESC LIMIT 5000";

            $issRecords = DB::select($query, $params);
            foreach ($issRecords as $r) {
                $r->_source = 'Client Procured';
                // Decrypt extracted_data for export (handles both encrypted and legacy plaintext)
                $r->extracted_fields = $this->decryptForExport($r->extracted_data);
                $records[] = $r;
            }
        }

// 2. Fetch from Issuances (Internal Master Registry) if needed
        if ($source === 'internal' || $source === 'all') {
            $conditions = [
                "i.deleted_at IS NULL",
                "(d.id IS NULL OR d.deleted_at IS NULL)"
            ];
            $params = [];

            if (!empty($types) && !in_array('all', $types)) {
                $placeholders = implode(',', array_fill(0, count($types), '?'));
                $conditions[] = "LOWER(i.type) IN ($placeholders)";
                foreach ($types as $t) {
                    $params[] = $t;
                }
            }

            if (!empty($barangay) && $barangay !== 'all') {
                $conditions[] = "i.barangay = ?";
                $params[] = $barangay;
            }

            if (!empty($status) && $status !== 'all') {
                $conditions[] = "LOWER(i.status) = ?";
                $params[] = strtolower($status);
            }

            if (!empty($dateFrom)) {
                $conditions[] = "DATE(i.created_at) >= ?";
                $params[] = $dateFrom;
            }

            if (!empty($dateTo)) {
                $conditions[] = "DATE(i.created_at) <= ?";
                $params[] = $dateTo;
            }

            $whereClause = " WHERE " . implode(" AND ", $conditions);
            $query = "SELECT i.id, i.certNumber, i.type, i.name, i.barangay, i.status, i.issuanceDate,
                             i.encoded_by, i.or_number, i.print_remarks, i.requested_by, i.approved_by,
                             i.extracted_data, i.created_at, d.personName, d.date, d.extracted_fields, d.ocr_text, d.status as doc_status
                       FROM issuances i
                       LEFT JOIN documents d ON d.id = i.document_id" . $whereClause . " ORDER BY i.id DESC LIMIT 5000";

            $docRecords = DB::select($query, $params);
            foreach ($docRecords as $r) {
                $r->_source = 'Internal Master Registry';
                // Decrypt extracted_data for export (handles both encrypted and legacy plaintext). Fallback to d.extracted_fields if empty.
                $dataPayload = !empty($r->extracted_data) ? $r->extracted_data : ($r->extracted_fields ?? null);
                $r->extracted_fields = $this->decryptForExport($dataPayload);
                $records[] = $r;
            }
        }

        // Determine specific document type mode
        $isSingleType = (count($types) === 1 && !in_array('all', $types));
        $singleType = $isSingleType ? reset($types) : 'all';

        // Initialize statistical counters for PSA summary
        $totalCount = count($records);
        $bCount = 0;
        $dCount = 0;
        $mCount = 0;
        $seniorCount = 0;
        $residentCount = 0;
        $naturalCount = 0;

        // Rich category-specific metrics (aligned with frontend Reports.jsx)
        $birthMale = 0;
        $birthFemale = 0;
        $birthTimely = 0;
        $birthDelayed = 0;
        $birthHospital = 0;
        $birthHome = 0;
        $deathMale = 0;
        $deathFemale = 0;
        $civilMarriages = 0;
        $churchMarriages = 0;
        $totalMales = 0;
        $totalFemales = 0;
        $distinctBarangays = 0;
        $timelyTotal = 0;
        $delayedTotal = 0;

        // Determine Headers based on PSA document category
        if ($singleType === 'birth') {
            $headers = [
                'Registry Number',
                'Child Full Name',
                'Sex',
                'Date of Birth',
                'Place of Birth (Hospital / Address)',
                'City / Municipality',
                'Province',
                'Father Full Name',
                'Mother Maiden Name',
                'Barangay',
                'Record Source',
                'Date Registered',
                'Encoded By'
            ];
        } elseif ($singleType === 'death') {
            $headers = [
                'Registry Number',
                'Deceased Full Name',
                'Sex',
                'Date of Death',
                'Place of Death',
                'Age',
                'Senior Citizen (≥60)',
                'Residence Status',
                'Cause of Death (Immediate)',
                'Manner of Death / Natural Cause',
                'Barangay',
                'Record Source',
                'Date Registered',
                'Encoded By'
            ];
        } elseif ($singleType === 'marriage') {
            $headers = [
                'Registry Number',
                'Husband Full Name',
                'Wife Full Name',
                'Date of Marriage',
                'Place of Marriage',
                'Solemnizing Officer / Ceremony Type',
                'Barangay',
                'Record Source',
                'Date Registered',
                'Encoded By'
            ];
        } else {
            // Unified PSA Summary Columns
            $headers = [
                'Registry Number',
                'Document Type',
                'Primary Person / Spouses',
                'Sex',
                'Event Date',
                'Place of Event',
                'Senior Citizen (Death ≥60)',
                'Resident Status',
                'Cause / Ceremony Details',
                'Parents / Relatives',
                'Barangay',
                'Status',
                'Record Source',
                'Date Registered',
                'Encoded By'
            ];
        }

        $rows = [];

        foreach ($records as $doc) {
            $ef = [];
            if (!empty($doc->extracted_fields)) {
                $ef = EncryptedJson::decode($doc->extracted_fields);
            }

            // Fallback parsing from OCR text (Gemini structured extraction) if present
            $ocrData = [];
            if (!empty($doc->ocr_text)) {
                $trimmedOcr = trim($doc->ocr_text);
                if (str_starts_with($trimmedOcr, '{') && str_ends_with($trimmedOcr, '}')) {
                    $ocrData = json_decode($trimmedOcr, true) ?: [];
                }
            }

            $docType = strtolower($doc->type ?? 'birth');
            if ($docType === 'birth') $bCount++;
            elseif ($docType === 'death') $dCount++;
            elseif ($docType === 'marriage') $mCount++;

            $regNo = $ef['registry_number'] ?? $ef['registry_no'] ?? $ocrData['registry_number'] ?? $doc->certNumber ?? 'N/A';
            $sex = ucfirst($ef['sex'] ?? $ocrData['sex'] ?? 'N/A');
            $brgy = $doc->barangay ?? $ef['barangay'] ?? $ocrData['barangay'] ?? 'N/A';
            $encodedBy = $doc->encoded_by ?? 'System Staff';
            $registeredAt = $this->formatReportDate($doc->created_at);
            $recordSource = $doc->_source ?? 'Civil Registry';

            // Senior status calculation (Death) - cascading fallbacks + calculated age from DOB/DOD
            $ageVal = (int) ($ef['age_completed_years'] ?? $ef['age'] ?? $ocrData['age_completed_years'] ?? $ocrData['age'] ?? 0);
            $deathDob = $ef['date_of_birth'] ?? $ocrData['date_of_birth'] ?? null;
            $deathDod = $ef['date_of_death'] ?? $ocrData['date_of_death'] ?? null;
            if ($ageVal === 0 && !empty($deathDob) && !empty($deathDod)) {
                try {
                    $cDob = \Carbon\Carbon::parse($deathDob);
                    $cDod = \Carbon\Carbon::parse($deathDod);
                    $ageVal = max(0, $cDob->diffInYears($cDod));
                } catch (\Throwable $e) {}
            }
            $isSenior = ($ageVal >= 60);
            if ($docType === 'death' && $isSenior) $seniorCount++;

            // Residence calculation (Resident vs Non-Resident of Naic) — death records only
            $residence = strtolower($ef['residence'] ?? $ocrData['residence'] ?? $doc->barangay ?? '');
            $isResident = (str_contains($residence, 'naic') || (!empty($doc->barangay) && $doc->barangay !== 'N/A'));
            if ($docType === 'death' && $isResident) $residentCount++;
            $residentStatusLabel = $isResident ? 'Local Resident' : 'Non-Resident';

            // Natural cause calculation (Death) — non-negotiable field fallback
            $immediateCause = $ef['cause_of_death_immediate'] 
                ?? $ef['cause_of_death'] 
                ?? $ef['cause_of_death_antecedent'] 
                ?? $ef['cause_of_death_underlying'] 
                ?? $ocrData['cause_of_death_immediate'] 
                ?? $ocrData['cause_of_death'] 
                ?? 'N/A';
            
            $mannerRaw = $ef['manner_of_death'] ?? $ocrData['manner_of_death'] ?? null;
            $manner = is_string($mannerRaw) ? strtolower(trim($mannerRaw)) : '';
            $isNatural = true;
            if (!empty($manner)) {
                $isNatural = str_contains($manner, 'natural') || (!str_contains($manner, 'accident') && !str_contains($manner, 'homicide') && !str_contains($manner, 'suicide') && !str_contains($manner, 'external') && !str_contains($manner, 'trauma'));
            } else {
                $lowerCause = strtolower($immediateCause);
                if (str_contains($lowerCause, 'accident') || str_contains($lowerCause, 'homicide') || str_contains($lowerCause, 'suicide') || str_contains($lowerCause, 'gunshot') || str_contains($lowerCause, 'trauma') || str_contains($lowerCause, 'drowning')) {
                    $isNatural = false;
                }
            }
            if ($docType === 'death' && $isNatural) $naturalCount++;
            $mannerLabel = $isNatural ? 'Natural Cause' : 'External / Non-Natural';

            // --- Rich category-specific metrics (aligned with frontend Reports.jsx) ---
            $rawSex = strtolower($ef['sex'] ?? $ocrData['sex'] ?? $ef['gender'] ?? '');
            $isMale = ($rawSex === 'male' || $rawSex === 'm');
            $isFemale = ($rawSex === 'female' || $rawSex === 'f');
            if ($isMale) $totalMales++;
            if ($isFemale) $totalFemales++;

            $isDelayed = (bool) (
                ($ef['delayed_registration'] ?? false) === true ||
                ($ef['delayed_registration'] ?? '') === 'true' ||
                ($ef['delayed_registration'] ?? 0) === 1 ||
                ($ef['is_delayed'] ?? false) === true ||
                ($ef['registration_type'] ?? '') === 'delayed' ||
                (is_string($ef['remarks'] ?? null) && str_contains(strtolower($ef['remarks']), 'delayed')) ||
                (is_string($ef['remarks'] ?? null) && str_contains(strtolower($ef['remarks']), 'late'))
            );
            if ($isDelayed) $delayedTotal++;
            else $timelyTotal++;

            if ($docType === 'birth') {
                if ($isMale) $birthMale++;
                if ($isFemale) $birthFemale++;
                if ($isDelayed) $birthDelayed++;
                else $birthTimely++;
                $hospStr = strtolower($ef['place_of_birth_hospital'] ?? $ef['place_of_birth_type'] ?? $ef['attendant_type'] ?? '');
                if (str_contains($hospStr, 'hosp') || str_contains($hospStr, 'clinic') || str_contains($hospStr, 'center') || str_contains($hospStr, 'physician') || str_contains($hospStr, 'midwife')) {
                    $birthHospital++;
                } else {
                    $birthHome++;
                }
            } elseif ($docType === 'death') {
                if ($isMale) $deathMale++;
                if ($isFemale) $deathFemale++;
            } elseif ($docType === 'marriage') {
                $officer = strtolower($ef['solemnizing_officer_name'] ?? $ef['solemnizing_officer_title'] ?? $ef['ceremony_type'] ?? $ocrData['solemnizing_officer_name'] ?? '');
                if (str_contains($officer, 'mayor') || str_contains($officer, 'judge') || str_contains($officer, 'civil')) {
                    $civilMarriages++;
                } else {
                    $churchMarriages++;
                }
            }

            if ($singleType === 'birth') {
                $childName = !empty($doc->personName) ? $doc->personName : trim(($ef['first_name'] ?? '') . ' ' . ($ef['middle_name'] ?? '') . ' ' . ($ef['last_name'] ?? ''));
                $dobDay = $ef['dob_day'] ?? '';
                $dobMonth = $ef['dob_month'] ?? '';
                $dobYear = $ef['dob_year'] ?? '';
                $rawDob = ($dobDay || $dobMonth || $dobYear) 
                    ? trim("{$dobMonth} {$dobDay}, {$dobYear}", ", ") 
                    : ($ef['date_of_birth'] ?? $ocrData['date_of_birth'] ?? $doc->date ?? 'N/A');
                $dobFormatted = $this->formatReportDate($rawDob);

                $hospital = $ef['place_of_birth_hospital'] ?? $ef['place_of_birth'] ?? $ocrData['place_of_birth'] ?? 'N/A';
                $city = $ef['place_of_birth_city'] ?? $ef['city_municipality'] ?? $ocrData['city_municipality'] ?? 'Naic';
                $province = $ef['place_of_birth_province'] ?? $ef['province'] ?? $ocrData['province'] ?? 'Cavite';

                $fatherName = trim(($ef['father_first_name'] ?? '') . ' ' . ($ef['father_middle_name'] ?? '') . ' ' . ($ef['father_last_name'] ?? '')) ?: ($ocrData['father_name'] ?? 'N/A');
                $motherName = trim(($ef['mother_first_name'] ?? $ef['mother_maiden_first_name'] ?? '') . ' ' . ($ef['mother_middle_name'] ?? '') . ' ' . ($ef['mother_last_name'] ?? $ef['mother_maiden_last_name'] ?? '')) ?: ($ocrData['mother_maiden_name'] ?? 'N/A');

                $rows[] = [
                    $regNo,
                    $childName ?: 'N/A',
                    $sex,
                    $dobFormatted,
                    $hospital,
                    $city,
                    $province,
                    $fatherName,
                    $motherName,
                    $brgy,
                    $recordSource,
                    $registeredAt,
                    $encodedBy
                ];
            } elseif ($singleType === 'death') {
                $deceasedName = !empty($doc->personName) ? $doc->personName : trim(($ef['first_name'] ?? '') . ' ' . ($ef['middle_name'] ?? '') . ' ' . ($ef['last_name'] ?? ''));
                $rawDod = $ef['date_of_death'] ?? $ocrData['date_of_death'] ?? $doc->date ?? 'N/A';
                $dod = $this->formatReportDate($rawDod);
                $pod = $ef['place_of_death'] ?? $ef['place_of_death_hospital'] ?? $ocrData['place_of_death'] ?? 'N/A';

                $rows[] = [
                    $regNo,
                    $deceasedName ?: 'N/A',
                    $sex,
                    $dod,
                    $pod,
                    $ageVal > 0 ? (string) $ageVal : 'N/A',
                    $isSenior ? 'Yes (Senior Citizen ≥60)' : ($ageVal > 0 ? 'No (<60)' : 'N/A'),
                    $residentStatusLabel,
                    $immediateCause,
                    $mannerLabel,
                    $brgy,
                    $recordSource,
                    $registeredAt,
                    $encodedBy
                ];
            } elseif ($singleType === 'marriage') {
                $hFirst = $ef['husband_first_name'] ?? $ocrData['husband_first_name'] ?? '';
                $hMid = $ef['husband_middle_name'] ?? $ocrData['husband_middle_name'] ?? '';
                $hLast = $ef['husband_last_name'] ?? $ocrData['husband_last_name'] ?? '';
                $husbandName = trim("{$hFirst} {$hMid} {$hLast}") ?: 'N/A';

                $wFirst = $ef['wife_first_name'] ?? $ocrData['wife_first_name'] ?? '';
                $wMid = $ef['wife_middle_name'] ?? $ocrData['wife_middle_name'] ?? '';
                $wLast = $ef['wife_last_name'] ?? $ocrData['wife_last_name'] ?? '';
                $wifeName = trim("{$wFirst} {$wMid} {$wLast}") ?: 'N/A';

                $rawDom = $ef['date_of_marriage'] ?? $ocrData['date_of_marriage'] ?? $doc->date ?? 'N/A';
                $dom = $this->formatReportDate($rawDom);
                $pom = $ef['place_of_marriage'] ?? $ocrData['place_of_marriage'] ?? 'N/A';

                // Solemnizing Officer / Ceremony - cascading fallback
                $officerName = trim($ef['solemnizing_officer_name'] ?? $ocrData['solemnizing_officer_name'] ?? '');
                $officerTitle = trim($ef['solemnizing_officer_title'] ?? $ocrData['solemnizing_officer_title'] ?? '');
                $ceremonyType = trim($ef['ceremony_type'] ?? $ocrData['ceremony_type'] ?? '');

                if (!empty($officerName) && !empty($officerTitle)) {
                    $ceremony = "{$officerName} ({$officerTitle})";
                } elseif (!empty($officerName)) {
                    $ceremony = $officerName;
                } elseif (!empty($officerTitle)) {
                    $ceremony = $officerTitle;
                } elseif (!empty($ceremonyType)) {
                    $ceremony = $ceremonyType;
                } else {
                    $ceremony = 'Civil / Church';
                }

                $rows[] = [
                    $regNo,
                    $husbandName,
                    $wifeName,
                    $dom,
                    $pom,
                    $ceremony,
                    $brgy,
                    $recordSource,
                    $registeredAt,
                    $encodedBy
                ];
            } else {
                // Unified All Records
                $primaryName = !empty($doc->personName) ? $doc->personName : 'N/A';
                $eventDate = $doc->date ?? 'N/A';
                $place = 'Naic, Cavite';
                $details = 'N/A';
                $parentsRel = 'N/A';

                if ($docType === 'birth') {
                    $dobDay = $ef['dob_day'] ?? '';
                    $dobMonth = $ef['dob_month'] ?? '';
                    $dobYear = $ef['dob_year'] ?? '';
                    $rawDob = ($dobDay || $dobMonth || $dobYear) 
                        ? trim("{$dobMonth} {$dobDay}, {$dobYear}", ", ") 
                        : ($ef['date_of_birth'] ?? $ocrData['date_of_birth'] ?? $doc->date ?? 'N/A');
                    $eventDate = $this->formatReportDate($rawDob);
                    $place = $ef['place_of_birth_hospital'] ?? $ef['place_of_birth'] ?? $ocrData['place_of_birth'] ?? 'Naic';
                    $f = trim(($ef['father_first_name'] ?? '') . ' ' . ($ef['father_last_name'] ?? '')) ?: ($ocrData['father_name'] ?? '');
                    $m = trim(($ef['mother_first_name'] ?? '') . ' ' . ($ef['mother_last_name'] ?? '')) ?: ($ocrData['mother_maiden_name'] ?? '');
                    $parentsRel = trim("Father: {$f} | Mother: {$m}", " |");
                } elseif ($docType === 'death') {
                    $rawDod = $ef['date_of_death'] ?? $ocrData['date_of_death'] ?? $doc->date ?? 'N/A';
                    $eventDate = $this->formatReportDate($rawDod);
                    $place = $ef['place_of_death'] ?? $ocrData['place_of_death'] ?? 'Naic';
                    $details = "Cause: {$immediateCause} ({$mannerLabel})";
                } elseif ($docType === 'marriage') {
                    $hFirst = $ef['husband_first_name'] ?? $ocrData['husband_first_name'] ?? '';
                    $hLast = $ef['husband_last_name'] ?? $ocrData['husband_last_name'] ?? '';
                    $wFirst = $ef['wife_first_name'] ?? $ocrData['wife_first_name'] ?? '';
                    $wLast = $ef['wife_last_name'] ?? $ocrData['wife_last_name'] ?? '';
                    $h = trim("{$hFirst} {$hLast}");
                    $w = trim("{$wFirst} {$wLast}");
                    $primaryName = trim("{$h} & {$w}", " &") ?: $primaryName;

                    $rawDom = $ef['date_of_marriage'] ?? $ocrData['date_of_marriage'] ?? $doc->date ?? 'N/A';
                    $eventDate = $this->formatReportDate($rawDom);
                    $place = $ef['place_of_marriage'] ?? $ocrData['place_of_marriage'] ?? 'Naic';

                    $officerName = trim($ef['solemnizing_officer_name'] ?? $ocrData['solemnizing_officer_name'] ?? '');
                    $officerTitle = trim($ef['solemnizing_officer_title'] ?? $ocrData['solemnizing_officer_title'] ?? '');
                    $ceremonyType = trim($ef['ceremony_type'] ?? $ocrData['ceremony_type'] ?? '');
                    $offStr = $officerName ?: ($officerTitle ?: ($ceremonyType ?: 'Civil/Church'));
                    $details = "Ceremony: " . $offStr;
                }

                $rows[] = [
                    $regNo,
                    ucfirst($docType),
                    $primaryName,
                    $sex,
                    $eventDate,
                    $place,
                    $docType === 'death' ? ($isSenior ? 'Yes (≥60)' : 'No (<60)') : 'N/A',
                    $residentStatusLabel,
                    $details,
                    $parentsRel,
                    $brgy,
                    ucfirst($doc->status ?? 'Registered'),
                    $recordSource,
                    $registeredAt,
                    $encodedBy
                ];
            }
        }

        $filename = "civil_registry_psa_report_" . date('Y_m_d_His') . ($format === 'excel' ? '.xlsx' : ($format === 'xls' ? '.xls' : '.csv'));
        $delimiter = ($format === 'excel' || $format === 'xls') ? "\t" : ",";

        // PSA-Aligned Summary Header Block
        $periodLabel = ($dateFrom ? $dateFrom : 'All') . " to " . ($dateTo ? $dateTo : 'Present');
        $scopeLabel = ucfirst($source) . ' Records (' . ucfirst($singleType) . ')';

        $pctNatural = $dCount > 0 ? round(($naturalCount / $dCount) * 100, 1) : 0;
        $pctSenior = $dCount > 0 ? round(($seniorCount / $dCount) * 100, 1) : 0;
        
        $summaryStatsLine = "Total: {$totalCount} | Births: {$bCount} | Deaths: {$dCount} (Senior: {$seniorCount} - {$pctSenior}%, Residents: {$residentCount}, Natural: {$naturalCount} - {$pctNatural}%) | Marriages: {$mCount}";
        
        $warningLine = ($totalCount >= 5000) ? "WARNING: Export reached 5000 limit. Some records may be omitted." : "";

        $richMetrics = [];
        if ($singleType === 'birth' || $singleType === 'all') $richMetrics[] = "Births (M/F: {$birthMale}/{$birthFemale}, Timely/Delayed: {$birthTimely}/{$birthDelayed}, Facility/Home: {$birthHospital}/{$birthHome})";
        if ($singleType === 'death' || $singleType === 'all') $richMetrics[] = "Deaths (M/F: {$deathMale}/{$deathFemale})";
        if ($singleType === 'marriage' || $singleType === 'all') $richMetrics[] = "Marriages (Civil/Church: {$civilMarriages}/{$churchMarriages})";

        if ($format === 'excel') {
            return $this->generateXlsxReport($records, $singleType, $periodLabel, $scopeLabel, $summaryStatsLine, $richMetrics, $filename);
        }

        if ($format === 'xls') {
            return $this->generateHtmlXlsReport($records, $periodLabel, $scopeLabel, $summaryStatsLine, $richMetrics, $filename);
        }

        // CSV Logic (Keep existing)
        $output = "\xEF\xBB\xBF";
        
        $summaryHeaders = [
            ["OFFICE OF THE MUNICIPAL CIVIL REGISTRAR - NAIC, CAVITE"],
            ["CIVIL REGISTRY DATA REPORT (PHILIPPINE STATISTICS AUTHORITY - PSA ALIGNED)"],
            ["Generated At: " . date('Y-m-d H:i') . " | Reporting Period: " . $periodLabel . " | Scope: " . $scopeLabel],
            ["SUMMARY AT A GLANCE: " . $summaryStatsLine],
            !empty($warningLine) ? [$warningLine] : null,
            ["DETAILED METRICS: " . implode(" | ", $richMetrics)],
            [""] // Blank separator
        ];
        $summaryHeaders = array_filter($summaryHeaders);

        foreach ($summaryHeaders as $sRow) {
            $output .= implode($delimiter, array_map(function($c) {
                return '"' . str_replace('"', '""', (string)$c) . '"';
            }, $sRow)) . "\r\n";
        }

        // Table Column Headers
        $output .= implode($delimiter, array_map(function($h) {
            return '"' . str_replace('"', '""', $h) . '"';
        }, $headers)) . "\r\n";

        // Table Data Rows
        foreach ($rows as $row) {
            $output .= implode($delimiter, array_map(function($cell) {
                return '"' . str_replace('"', '""', (string)$cell) . '"';
            }, $row)) . "\r\n";
        }

        $mimeType = $format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';

        return response($output, 200, [
            'Content-Type' => $mimeType . '; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    /**
     * Helper to get headers for specific document type
     */
    private function getHeadersForType(string $type): array
    {
        if ($type === 'birth') {
            return ['Registry Number', 'Child Full Name', 'Sex', 'Date of Birth', 'Place of Birth (Hospital / Address)', 'City / Municipality', 'Province', 'Father Full Name', 'Mother Maiden Name', 'Barangay', 'Record Source', 'Date Registered', 'Encoded By'];
        } elseif ($type === 'death') {
            return ['Registry Number', 'Deceased Full Name', 'Sex', 'Date of Death', 'Place of Death', 'Age', 'Senior Citizen (≥60)', 'Residence Status', 'Cause of Death (Immediate)', 'Manner of Death / Natural Cause', 'Barangay', 'Record Source', 'Date Registered', 'Encoded By'];
        }
        return ['Registry Number', 'Husband Full Name', 'Wife Full Name', 'Date of Marriage', 'Place of Marriage', 'Solemnizing Officer / Ceremony Type', 'Barangay', 'Record Source', 'Date Registered', 'Encoded By'];
    }

    /**
     * Helper to format a single row of data for HTML/Excel grouping
     */
    private function formatRowForType($doc, $ef, $type): array
    {
        $ocrData = [];
        if (!empty($doc->ocr_text)) {
            $trimmedOcr = trim($doc->ocr_text);
            if (str_starts_with($trimmedOcr, '{') && str_ends_with($trimmedOcr, '}')) {
                $ocrData = json_decode($trimmedOcr, true) ?: [];
            }
        }

        $regNo = $ef['registry_number'] ?? $ef['registry_no'] ?? $ocrData['registry_number'] ?? $doc->certNumber ?? 'N/A';
        $sex = ucfirst($ef['sex'] ?? $ocrData['sex'] ?? 'N/A');
        $brgy = $doc->barangay ?? $ef['barangay'] ?? $ocrData['barangay'] ?? 'N/A';
        $encodedBy = $doc->encoded_by ?? 'System Staff';
        $registeredAt = $this->formatReportDate($doc->created_at);
        $recordSource = $doc->_source ?? 'Internal Master Registry';

        if ($type === 'birth') {
            $childName = !empty($doc->personName) ? $doc->personName : trim(($ef['first_name'] ?? '') . ' ' . ($ef['middle_name'] ?? '') . ' ' . ($ef['last_name'] ?? ''));
            $dobDay = $ef['dob_day'] ?? '';
            $dobMonth = $ef['dob_month'] ?? '';
            $dobYear = $ef['dob_year'] ?? '';
            $rawDob = ($dobDay || $dobMonth || $dobYear) 
                ? trim("{$dobMonth} {$dobDay}, {$dobYear}", ", ") 
                : ($ef['date_of_birth'] ?? $ocrData['date_of_birth'] ?? $doc->date ?? 'N/A');
            $dobFormatted = $this->formatReportDate($rawDob);

            $hospital = $ef['place_of_birth_hospital'] ?? $ef['place_of_birth'] ?? $ocrData['place_of_birth'] ?? 'N/A';
            $city = $ef['place_of_birth_city'] ?? $ef['city_municipality'] ?? $ocrData['city_municipality'] ?? 'Naic';
            $province = $ef['place_of_birth_province'] ?? $ef['province'] ?? $ocrData['province'] ?? 'Cavite';

            $fatherName = trim(($ef['father_first_name'] ?? '') . ' ' . ($ef['father_middle_name'] ?? '') . ' ' . ($ef['father_last_name'] ?? '')) ?: ($ocrData['father_name'] ?? 'N/A');
            $motherName = trim(($ef['mother_first_name'] ?? $ef['mother_maiden_first_name'] ?? '') . ' ' . ($ef['mother_middle_name'] ?? '') . ' ' . ($ef['mother_last_name'] ?? $ef['mother_maiden_last_name'] ?? '')) ?: ($ocrData['mother_maiden_name'] ?? 'N/A');

            return [
                $regNo, $childName ?: 'N/A', $sex, $dobFormatted,
                $hospital, $city, $province,
                $fatherName, $motherName,
                $brgy, $recordSource, $registeredAt, $encodedBy
            ];
        } elseif ($type === 'death') {
            $ageVal = (int) ($ef['age_completed_years'] ?? $ef['age'] ?? $ocrData['age_completed_years'] ?? $ocrData['age'] ?? 0);
            $deathDob = $ef['date_of_birth'] ?? $ocrData['date_of_birth'] ?? null;
            $deathDod = $ef['date_of_death'] ?? $ocrData['date_of_death'] ?? null;
            if ($ageVal === 0 && !empty($deathDob) && !empty($deathDod)) {
                try {
                    $cDob = \Carbon\Carbon::parse($deathDob);
                    $cDod = \Carbon\Carbon::parse($deathDod);
                    $ageVal = max(0, $cDob->diffInYears($cDod));
                } catch (\Throwable $e) {}
            }
            $isSenior = ($ageVal >= 60);

            $residence = strtolower($ef['residence'] ?? $ocrData['residence'] ?? $doc->barangay ?? '');
            $isResident = (str_contains($residence, 'naic') || (!empty($doc->barangay) && $doc->barangay !== 'N/A'));

            $immediateCause = $ef['cause_of_death_immediate'] 
                ?? $ef['cause_of_death'] 
                ?? $ef['cause_of_death_antecedent'] 
                ?? $ef['cause_of_death_underlying'] 
                ?? $ocrData['cause_of_death_immediate'] 
                ?? $ocrData['cause_of_death'] 
                ?? 'N/A';

            $mannerRaw = $ef['manner_of_death'] ?? $ocrData['manner_of_death'] ?? null;
            $manner = is_string($mannerRaw) ? strtolower(trim($mannerRaw)) : '';
            $isNatural = true;
            if (!empty($manner)) {
                $isNatural = str_contains($manner, 'natural') || (!str_contains($manner, 'accident') && !str_contains($manner, 'homicide') && !str_contains($manner, 'suicide') && !str_contains($manner, 'external') && !str_contains($manner, 'trauma'));
            } else {
                $lowerCause = strtolower($immediateCause);
                if (str_contains($lowerCause, 'accident') || str_contains($lowerCause, 'homicide') || str_contains($lowerCause, 'suicide') || str_contains($lowerCause, 'gunshot') || str_contains($lowerCause, 'trauma') || str_contains($lowerCause, 'drowning')) {
                    $isNatural = false;
                }
            }
            $mannerLabel = $isNatural ? 'Natural Cause' : 'External / Non-Natural';

            $deceasedName = !empty($doc->personName) ? $doc->personName : trim(($ef['first_name'] ?? '') . ' ' . ($ef['middle_name'] ?? '') . ' ' . ($ef['last_name'] ?? ''));
            $rawDod = $ef['date_of_death'] ?? $ocrData['date_of_death'] ?? $doc->date ?? 'N/A';
            $dod = $this->formatReportDate($rawDod);
            $pod = $ef['place_of_death'] ?? $ef['place_of_death_hospital'] ?? $ocrData['place_of_death'] ?? 'N/A';

            return [
                $regNo, $deceasedName ?: 'N/A', $sex, $dod,
                $pod, $ageVal > 0 ? (string)$ageVal : 'N/A',
                $isSenior ? 'Yes (Senior Citizen ≥60)' : ($ageVal > 0 ? 'No (<60)' : 'N/A'),
                $isResident ? 'Local Resident' : 'Non-Resident',
                $immediateCause, $mannerLabel,
                $brgy, $recordSource, $registeredAt, $encodedBy
            ];
        } else {
            $hFirst = $ef['husband_first_name'] ?? $ocrData['husband_first_name'] ?? '';
            $hMid = $ef['husband_middle_name'] ?? $ocrData['husband_middle_name'] ?? '';
            $hLast = $ef['husband_last_name'] ?? $ocrData['husband_last_name'] ?? '';
            $husbandName = trim("{$hFirst} {$hMid} {$hLast}") ?: 'N/A';

            $wFirst = $ef['wife_first_name'] ?? $ocrData['wife_first_name'] ?? '';
            $wMid = $ef['wife_middle_name'] ?? $ocrData['wife_middle_name'] ?? '';
            $wLast = $ef['wife_last_name'] ?? $ocrData['wife_last_name'] ?? '';
            $wifeName = trim("{$wFirst} {$wMid} {$wLast}") ?: 'N/A';

            $rawDom = $ef['date_of_marriage'] ?? $ocrData['date_of_marriage'] ?? $doc->date ?? 'N/A';
            $dom = $this->formatReportDate($rawDom);
            $pom = $ef['place_of_marriage'] ?? $ocrData['place_of_marriage'] ?? 'N/A';

            $officerName = trim($ef['solemnizing_officer_name'] ?? $ocrData['solemnizing_officer_name'] ?? '');
            $officerTitle = trim($ef['solemnizing_officer_title'] ?? $ocrData['solemnizing_officer_title'] ?? '');
            $ceremonyType = trim($ef['ceremony_type'] ?? $ocrData['ceremony_type'] ?? '');

            if (!empty($officerName) && !empty($officerTitle)) {
                $ceremony = "{$officerName} ({$officerTitle})";
            } elseif (!empty($officerName)) {
                $ceremony = $officerName;
            } elseif (!empty($officerTitle)) {
                $ceremony = $officerTitle;
            } elseif (!empty($ceremonyType)) {
                $ceremony = $ceremonyType;
            } else {
                $ceremony = 'Civil / Church';
            }

            return [
                $regNo, $husbandName, $wifeName, $dom,
                $pom, $ceremony,
                $brgy, $recordSource, $registeredAt, $encodedBy
            ];
        }
    }

    /**
     * Standardize date formatting across export reports.
     *
     * @param string|null $dateStr
     * @param string $format
     * @return string
     */
    private function formatReportDate(?string $dateStr, string $format = 'M d, Y'): string
    {
        if (empty($dateStr) || $dateStr === 'N/A' || $dateStr === 'null') {
            return 'N/A';
        }

        $trimmed = trim($dateStr);
        try {
            $ts = strtotime($trimmed);
            if ($ts && $ts > 0 && (int) date('Y', $ts) > 1900) {
                return date($format, $ts);
            }
            $c = \Carbon\Carbon::parse($trimmed);
            return $c->format($format);
        } catch (\Throwable $e) {
            return $trimmed;
        }
    }

    /**
     * Generate native .xlsx report using PhpOffice\PhpSpreadsheet.
     */
    private function generateXlsxReport($records, string $singleType, string $periodLabel, string $scopeLabel, string $summaryStatsLine, array $richMetrics, string $filename)
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $spreadsheet->getProperties()
            ->setCreator('CivicCore Civil Registry')
            ->setTitle('Civil Registry Data Report');

        // Group records by type
        $grouped = [];
        foreach ($records as $doc) {
            $t = strtolower($doc->type ?? 'birth');
            $grouped[$t][] = $doc;
        }

        // Maintain specific tab order
        $typeOrder = ['birth', 'death', 'marriage'];
        $activeSheets = [];
        foreach ($typeOrder as $t) {
            if (isset($grouped[$t]) && count($grouped[$t]) > 0) {
                $activeSheets[$t] = $grouped[$t];
            }
        }
        if (empty($activeSheets)) {
            $activeSheets[$singleType !== 'all' ? $singleType : 'birth'] = [];
        }

        $sheetIndex = 0;
        foreach ($activeSheets as $type => $docs) {
            if ($sheetIndex === 0) {
                $sheet = $spreadsheet->getActiveSheet();
            } else {
                $sheet = $spreadsheet->createSheet();
            }
            $sheetTitle = ucfirst($type) . ' Records';
            $sheet->setTitle(substr($sheetTitle, 0, 31));

            // Summary Header block
            $sheet->setCellValue('A1', 'OFFICE OF THE MUNICIPAL CIVIL REGISTRAR - NAIC, CAVITE');
            $sheet->setCellValue('A2', 'CIVIL REGISTRY DATA REPORT (PHILIPPINE STATISTICS AUTHORITY - PSA ALIGNED)');
            $sheet->setCellValue('A3', "Reporting Period: {$periodLabel} | Scope: {$scopeLabel}");
            $sheet->setCellValue('A4', "SUMMARY: {$summaryStatsLine}");
            if (!empty($richMetrics)) {
                $sheet->setCellValue('A5', 'METRICS: ' . implode(' | ', $richMetrics));
            }

            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);
            $sheet->getStyle('A2')->getFont()->setBold(true)->setSize(11);
            $sheet->getStyle('A3:A5')->getFont()->setSize(9)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('555555'));

            // Table headers
            $headers = $this->getHeadersForType($type);
            $startRow = 7;
            
            foreach ($headers as $colIdx => $headerText) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
                $cellCoordinate = "{$colLetter}{$startRow}";
                $sheet->setCellValue($cellCoordinate, $headerText);
            }

            $lastColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($headers));
            $headerRange = "A{$startRow}:{$lastColLetter}{$startRow}";
            $sheet->getStyle($headerRange)->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1A2F4A']
                ],
                'alignment' => [
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                    'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_LEFT
                ]
            ]);
            $sheet->getRowDimension($startRow)->setRowHeight(24);

            // Data rows
            $currentRow = $startRow + 1;
            foreach ($docs as $d) {
                $dEf = EncryptedJson::decode($d->extracted_data ?? $d->extracted_fields ?? []);
                $rowData = $this->formatRowForType($d, $dEf, $type);

                foreach ($rowData as $colIdx => $val) {
                    $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
                    $sheet->setCellValueExplicit(
                        "{$colLetter}{$currentRow}",
                        (string)$val,
                        \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING
                    );
                }

                if ($currentRow % 2 === 0) {
                    $sheet->getStyle("A{$currentRow}:{$lastColLetter}{$currentRow}")->applyFromArray([
                        'fill' => [
                            'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'F8FAFC']
                        ]
                    ]);
                }
                $sheet->getRowDimension($currentRow)->setRowHeight(20);
                $currentRow++;
            }

            // Borders for table
            $dataEndRow = max($startRow, $currentRow - 1);
            $sheet->getStyle("A{$startRow}:{$lastColLetter}{$dataEndRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'E2E8F0']
                    ]
                ],
                'font' => ['size' => 9]
            ]);

            // Auto-size columns with sane max widths
            for ($col = 1; $col <= count($headers); $col++) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
                $sheet->getColumnDimension($colLetter)->setAutoSize(true);
            }

            $sheetIndex++;
        }

        // Set active sheet back to first tab
        $spreadsheet->setActiveSheetIndex(0);

        // Stream output to temporary stream
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $tempPath = tempnam(sys_get_temp_dir(), 'civicore_export_') . '.xlsx';
        $writer->save($tempPath);

        $content = file_get_contents($tempPath);
        @unlink($tempPath);

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    /**
     * Generate HTML-styled .xls report (legacy single-page spreadsheet format).
     */
    private function generateHtmlXlsReport($records, string $periodLabel, string $scopeLabel, string $summaryStatsLine, array $richMetrics, string $filename)
    {
        $html = "<html><head><meta charset='UTF-8'><style>
            body { font-family: Arial, sans-serif; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th { background-color: #1a2f4a; color: #ffffff; padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 11px; text-align: left; }
            td { padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            h2 { font-size: 13px; color: #1a2f4a; margin: 14px 0 4px; }
            p { font-size: 11px; color: #475569; margin: 2px 0; }
        </style></head><body>";

        $html .= "<p>OFFICE OF THE MUNICIPAL CIVIL REGISTRAR - NAIC, CAVITE</p>";
        $html .= "<p>CIVIL REGISTRY DATA REPORT (PHILIPPINE STATISTICS AUTHORITY - PSA ALIGNED)</p>";
        $html .= "<p>Generated At: " . date('Y-m-d H:i') . " | Reporting Period: " . $periodLabel . " | Scope: " . $scopeLabel . "</p>";
        $html .= "<p>SUMMARY AT A GLANCE: " . $summaryStatsLine . "</p>";
        if (!empty($richMetrics)) {
            $html .= "<p>DETAILED METRICS: " . implode(" | ", $richMetrics) . "</p>";
        }

        // Group records by type
        $grouped = [];
        foreach ($records as $doc) {
            $t = strtolower($doc->type ?? 'birth');
            $grouped[$t][] = $doc;
        }

        $typeOrder = ['birth', 'death', 'marriage'];
        foreach ($typeOrder as $type) {
            if (!isset($grouped[$type]) || count($grouped[$type]) === 0) continue;
            $docs = $grouped[$type];

            $html .= "<h2>" . strtoupper($type) . " CERTIFICATES (" . count($docs) . ")</h2><table><thead><tr>";
            $typeHeaders = $this->getHeadersForType($type);
            foreach ($typeHeaders as $h) {
                $html .= "<th>" . htmlspecialchars($h) . "</th>";
            }
            $html .= "</tr></thead><tbody>";

            foreach ($docs as $d) {
                $html .= "<tr>";
                $dEf = EncryptedJson::decode($d->extracted_data ?? $d->extracted_fields ?? []);
                $rowData = $this->formatRowForType($d, $dEf, $type);
                foreach ($rowData as $cell) {
                    $html .= "<td>" . htmlspecialchars((string)$cell) . "</td>";
                }
                $html .= "</tr>";
            }
            $html .= "</tbody></table>";
        }

        $html .= "</body></html>";

        return response($html, 200, [
            'Content-Type' => 'application/vnd.ms-excel; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0'
        ]);
    }

    /**
     * Decrypt extracted_data for export, handling both encrypted and legacy plaintext.
     *
     * @param string|null $data
     * @return array
     */
    private function decryptForExport($data)
    {
        if (empty($data)) {
            return [];
        }

        // If already an array (legacy or already decrypted), return as-is
        if (is_array($data)) {
            return $data;
        }

        // EncryptedJson::decode handles both encrypted (encryptString) payloads
        // and legacy plaintext JSON, so it is safe to call on any stored value.
        // NOTE: do NOT use Crypt::decrypt() here directly — it unserializes by
        // default, but EncryptedJson::encode() uses encryptString() (no
        // serialization). The mismatch silently fails and returns [].
        return EncryptedJson::decode($data);
    }

    }

