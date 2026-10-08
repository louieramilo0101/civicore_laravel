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
        $search = $request->query('search', '');
        
        // Build query
        $whereClause = "";
        $params = [];
        
        if (!empty($type) || !empty($search)) {
            $conditions = [];
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
            if (!empty($search)) {
                $conditions[] = "(d.name LIKE ? OR d.personName LIKE ? OR d.barangay LIKE ? OR d.extracted_fields LIKE ? OR d.raw_text LIKE ? OR d.ocr_text LIKE ?)";
                $searchTerm = "%{$search}%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            $whereClause = " WHERE " . implode(" AND ", $conditions) . " AND d.deleted_at IS NULL";
        } else {
            $whereClause = " WHERE d.deleted_at IS NULL";
        }
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM documents d" . $whereClause;
        $totalResult = DB::select($countQuery, $params);
        $total = $totalResult[0]->total;
        
        // Get paginated results without loading binary content.
        $query = "SELECT d.id, d.name, d.type, d.date, d.size, d.status, d.personName, d.barangay, d.metadata, d.ocr_text, d.extracted_fields, d.detected_type, d.created_at, d.updated_at, d.encoded_by, d.file_path, d.image_path,
                         COALESCE(t.ticket_number, i.ticket_number) as ticket_number
                  FROM documents d
                  LEFT JOIN tickets t ON t.document_id = d.id
                  LEFT JOIN issuances i ON i.document_id = d.id" . $whereClause . " ORDER BY d.id DESC LIMIT ? OFFSET ?";
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
            } elseif ($status === 'extracted' || $status === 'checking') {
                if ($doc->has_duplicate) {
                    // Skip redundant query if metadata already flagged it
                } else {
                    // Check if similar records already exist in the issuances table
                    $fields = json_decode($doc->extracted_fields, true) ?: [];
                    $type = $doc->detected_type ?: $doc->type;
                    if ($type === 'marriage_license') {
                        $type = 'marriage';
                    }

                    $dupQuery = DB::table('issuances')
                        ->where('type', $type)
                        ->where('document_id', '!=', $doc->id)
                        ->whereNull('deleted_at');

                    if ($this->hasTrueDuplicate($type, $fields, (int) $doc->id)) {
                        $doc->has_duplicate = true;
                    }
                }
            }
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
            
            if (isset($filePath) && \Storage::disk('public')->exists($filePath)) {
                \Storage::disk('public')->delete($filePath);
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
            'public'
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
            if (\Storage::disk('public')->exists($currentPath)) {
                \Storage::disk('public')->move($currentPath, $newPath);
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
        $detectedType    = $request->input('detectedType');

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
            if (isset($fields[$mKey]) && $fields[$mKey] !== '' && $fields[$mKey] !== 'n/a') {
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
            if (isset($fields[$dKey]) && $fields[$dKey] !== '' && $fields[$dKey] !== 'n/a') {
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
            if (isset($fields[$yKey]) && $fields[$yKey] !== '' && $fields[$yKey] !== 'n/a') {
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
            if (isset($fields[$dKey]) && $fields[$dKey] !== '' && $fields[$dKey] !== 'n/a') {
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
            if (isset($fields[$aKey]) && $fields[$aKey] !== '' && $fields[$aKey] !== 'n/a') {
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
        
        $fields = json_decode($docData->extracted_fields, true) ?? [];
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

        // Build personName from split fields
        $personName = $this->buildFullName($fields, $detectedType) ?: $docData->name;
        
        return $this->performSave($request, $id, $fields, $docData->ocr_text, $personName, $barangay, 'Processed', false, $detectedType);
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

        $query = DB::table('issuances')
            ->whereNull('deleted_at');

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
              ->orWhere('extracted_data->registry_number', $regNo)
              ->orWhere('extracted_data->registry_no', $regNo);
        })->exists();
    }

    /**
     * Executes the build full name operation.
     */
    private function buildFullName($fields, $type)
    {
        if (!$fields) return null;

        if ($type === 'marriage') {
            $hLast = strtoupper(trim($fields['husband_last_name'] ?? ''));
            $hFirst = strtoupper(trim($fields['husband_first_name'] ?? ''));
            $hMiddle = strtoupper(trim($fields['husband_middle_name'] ?? ''));
            $hSuffix = strtoupper(trim($fields['husband_suffix'] ?? ''));
            $hParts = array_filter([$hLast ? "{$hLast}," : '', $hFirst, $hMiddle, $hSuffix]);
            $hName = implode(' ', $hParts);

            $wLast = strtoupper(trim($fields['wife_last_name'] ?? ''));
            $wFirst = strtoupper(trim($fields['wife_first_name'] ?? ''));
            $wMiddle = strtoupper(trim($fields['wife_middle_name'] ?? ''));
            $wSuffix = strtoupper(trim($fields['wife_suffix'] ?? ''));
            $wParts = array_filter([$wLast ? "{$wLast}," : '', $wFirst, $wMiddle, $wSuffix]);
            $wName = implode(' ', $wParts);

            $joined = implode(' & ', array_filter([$hName, $wName]));
            return $joined ? strtoupper($joined) : null;
        }

        $last = strtoupper(trim($fields['last_name'] ?? $fields['deceased_last_name'] ?? ''));
        $first = strtoupper(trim($fields['first_name'] ?? $fields['deceased_first_name'] ?? ''));
        $middle = strtoupper(trim($fields['middle_name'] ?? $fields['deceased_middle_name'] ?? ''));
        $suffix = strtoupper(trim($fields['suffix'] ?? ''));

        $parts = array_filter([$last ? "{$last}," : '', $first, $middle, $suffix]);
        $name = implode(' ', $parts);

        return $name ? strtoupper($name) : null;
    }

    /**
     * Shared logic for saving/approving a document
     */
    private function performSave($request, $id, $extractedFields, $ocrText, $personName, $barangay, $status, $parentalConsent, $detectedType = null)
    {
        // Re-calculate personName if it wasn't explicitly provided or if generic placeholder (safety for main update call)
        if (empty($personName) || $personName === 'Document Data') {
            $computedName = $this->buildFullName($extractedFields, $detectedType);
            if (!empty($computedName)) {
                $personName = $computedName;
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

                    if (empty($issuanceFilePath) || !\Storage::disk('public')->exists($issuanceFilePath)) {
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
                        $updateData = [
                            'type' => $docType,
                            'certificate_type' => $normCertType,
                            'name' => $personName,
                            'barangay' => $barangay,
                            'status' => 'Active',
                            'encoded_by' => $encodedBy,
                            'extracted_data' => json_encode($extractedFields, JSON_UNESCAPED_UNICODE),
                            'file_path' => $issuanceFilePath,
                            'image_path' => $issuanceImagePath,
                            'ticket_number' => $ticketNumber,
                            'updated_at' => now()
                        ];

                        $userRegNo = trim($extractedFields['registry_number'] ?? $extractedFields['registry_no'] ?? '');
                        if (!empty($userRegNo)) {
                            $updateData['certNumber'] = $userRegNo;
                        }

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
                                'extracted_data' => json_encode($extractedFields, JSON_UNESCAPED_UNICODE),
                                'file_path' => $issuanceFilePath,
                                'image_path' => $issuanceImagePath,
                                'ticket_number' => $ticketNumber,
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
            $safeError = mb_convert_encoding($e->getMessage(), 'UTF-8', 'UTF-8');
            \Log::error("Document Save/Approve Error: " . $safeError . " on line " . $e->getLine() . " in " . $e->getFile());
            
            return response()->json([
                'success' => false, 
                'error' => 'System sync failure: ' . $safeError
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

        DB::transaction(function () use ($id) {
            $this->logHistory($id, 'Deleted');

            DB::table('documents')->where('id', $id)->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('issuances')->where('document_id', $id)->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);
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
        if (empty($imagePath) || !\Storage::disk('public')->exists($imagePath)) {
            // Fall back to serveDocument if image_path is empty or missing
            return $this->serveDocument($id, 'inline');
        }

        $fullPath = \Storage::disk('public')->path($imagePath);
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

        if (empty($doc->file_path) || !\Storage::disk('public')->exists($doc->file_path)) {
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

        $fullPath = \Storage::disk('public')->path($doc->file_path);
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

        // If it's a PDF and we're asking for the raw preview, prefer generated page images.
        if ($request->has('raw') && $ext === 'pdf') {
            $dir = dirname($fullPath);
            $base = pathinfo($fullPath, PATHINFO_FILENAME);

            $candidates = [
                $dir . '/' . $base . '_page_1_proc.jpg',
                $dir . '/' . $base . '_page_2_proc.jpg',
                $dir . '/' . $base . '_page_1.jpg',
                $dir . '/' . $base . '_page_2.jpg',
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

        return response()->file($fullPath, [
            'Content-Type' => $mimetype,
            'Content-Disposition' => $disposition . '; filename="' . ($metadata['originalName'] ?? $doc->name ?? basename($fullPath)) . '"'
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
                if (Storage::disk('public')->exists($document->file_path)) {
                    Storage::disk('public')->delete($document->file_path);
                }
            }

            // 2. Delete linked issuance files if applicable
            $issuances = DB::table('issuances')->where('document_id', $id)->get();
            foreach ($issuances as $iss) {
                if (!empty($iss->file_path)) {
                    if (Storage::disk('public')->exists($iss->file_path)) {
                        Storage::disk('public')->delete($iss->file_path);
                    }
                }
            }

            // 3. Log history of purge
            $this->logHistory($id, 'Purged', [
                'filename' => $document->name,
                'person_name' => $document->personName,
                'type' => $document->detected_type ?: $document->type,
                'barangay' => $document->barangay
            ]);

            // 4. Delete DB records
            DB::table('documents')->where('id', $id)->delete();
            DB::table('issuances')->where('document_id', $id)->delete();
            DB::table('document_ocr_pages')->where('document_id', $id)->delete();

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
              ->orWhere('extracted_data->registry_number', $regNo)
              ->orWhere('extracted_data->registry_no', $regNo);
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
                    'extracted_fields' => json_decode($candidate->extracted_data, true) ?: []
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
            $rows = DB::table('issuances')
                ->whereNull('deleted_at')
                ->selectRaw("SUBSTRING(created_at, 1, 7) as year_month, COUNT(*) as count")
                ->groupBy('year_month')
                ->orderBy('year_month', 'desc')
                ->get();
        } elseif ($source === 'all') {
            $docRows = DB::table('documents')->whereNull('deleted_at')->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")->groupBy('ym')->pluck('c', 'ym')->toArray();
            $issRows = DB::table('issuances')->whereNull('deleted_at')->selectRaw("SUBSTRING(created_at, 1, 7) as ym, COUNT(*) as c")->groupBy('ym')->pluck('c', 'ym')->toArray();
            $allKeys = array_unique(array_merge(array_keys($docRows), array_keys($issRows)));
            rsort($allKeys);
            $monthCounts = [];
            foreach ($allKeys as $k) {
                if (!empty($k)) {
                    $monthCounts[$k] = (int) (($docRows[$k] ?? 0) + ($issRows[$k] ?? 0));
                }
            }
            return response()->json(['success' => true, 'months' => $monthCounts]);
        } else {
            $rows = DB::table('documents')
                ->whereNull('deleted_at')
                ->selectRaw("SUBSTRING(created_at, 1, 7) as year_month, COUNT(*) as count")
                ->groupBy('year_month')
                ->orderBy('year_month', 'desc')
                ->get();
        }

        $monthCounts = [];
        foreach ($rows as $row) {
            if (!empty($row->year_month)) {
                $monthCounts[$row->year_month] = (int) $row->count;
            }
        }

        return response()->json([
            'success' => true,
            'months'  => $monthCounts
        ]);
    }

    /**
     * Export Civil Registry Documents Report in CSV or Excel format
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

        // If exporting procured client documents from issuances table
        if ($source === 'procured') {
            $conditions = ["i.deleted_at IS NULL"];
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
                             i.ticket_number, i.created_at
                      FROM issuances i" . $whereClause . " ORDER BY i.id DESC LIMIT 5000";

            $records = DB::select($query, $params);

            $headers = [
                'ID',
                'Registry / Cert Number',
                'Record Source',
                'Ticket Number',
                'Document Type',
                'Client / Person Name',
                'Barangay',
                'Status',
                'Requested By',
                'Approved By',
                'Encoded By',
                'Remarks',
                'Issuance Date',
                'Date Requested'
            ];

            $rows = [];
            foreach ($records as $doc) {
                $rows[] = [
                    $doc->id,
                    $doc->certNumber ?: 'N/A',
                    'Client Procured Document',
                    $doc->ticket_number ?: 'N/A',
                    ucfirst($doc->type ?? 'Birth'),
                    $doc->name ?: 'N/A',
                    $doc->barangay ?: 'N/A',
                    ucfirst($doc->status ?? 'Active'),
                    $doc->requested_by ?: 'N/A',
                    $doc->approved_by ?: 'N/A',
                    $doc->encoded_by ?: 'System Staff',
                    $doc->print_remarks ?: '',
                    $doc->issuanceDate ?: 'N/A',
                    date('Y-m-d H:i', strtotime($doc->created_at))
                ];
            }
        } else {
            // Internal Master Registry records (from documents table)
            $conditions = ["deleted_at IS NULL"];
            $params = [];

            if (!empty($types) && !in_array('all', $types)) {
                $placeholders = implode(',', array_fill(0, count($types), '?'));
                $conditions[] = "LOWER(type) IN ($placeholders)";
                foreach ($types as $t) {
                    $params[] = $t;
                }
            }

            if (!empty($barangay) && $barangay !== 'all') {
                $conditions[] = "barangay = ?";
                $params[] = $barangay;
            }

            if (!empty($status) && $status !== 'all') {
                $s = strtolower($status);
                if ($s === 'processed' || $s === 'registered') {
                    $conditions[] = "LOWER(status) IN ('processed', 'issued', 'active')";
                } elseif ($s === 'pending' || $s === 'draft') {
                    $conditions[] = "LOWER(status) IN ('pending', 'extracted', 'draft')";
                } elseif ($s === 'issued' || $s === 'completed') {
                    $conditions[] = "LOWER(status) IN ('issued', 'completed')";
                } else {
                    $conditions[] = "LOWER(status) = ?";
                    $params[] = $s;
                }
            }

            if (!empty($dateFrom)) {
                $conditions[] = "DATE(created_at) >= ?";
                $params[] = $dateFrom;
            }

            if (!empty($dateTo)) {
                $conditions[] = "DATE(created_at) <= ?";
                $params[] = $dateTo;
            }

            $whereClause = " WHERE " . implode(" AND ", $conditions);

            $query = "SELECT id, name, type, date, status, personName, barangay, extracted_fields, encoded_by, created_at
                      FROM documents" . $whereClause . " ORDER BY id DESC LIMIT 5000";

            $records = DB::select($query, $params);

            // Standard Report Headers
            $headers = [
                'ID',
                'Registry Number',
                'Record Source',
                'Document Type',
                'Person Name / Spouse Names',
                'Sex / Gender',
                'Event Date',
                'Barangay',
                'City / Municipality',
                'Province',
                'Status',
                'Father / Husband Name',
                'Mother / Wife Name',
                'Encoded By',
                'Date Registered'
            ];

            $rows = [];

            foreach ($records as $doc) {
                $ef = [];
                if (!empty($doc->extracted_fields)) {
                    $ef = is_string($doc->extracted_fields) ? json_decode($doc->extracted_fields, true) : (array) $doc->extracted_fields;
                }

                $docType = ucfirst($doc->type ?? 'Birth');
                $regNo = $ef['registry_number'] ?? $ef['registry_no'] ?? 'N/A';
                $personName = !empty($doc->personName) ? $doc->personName : 'N/A';
                $sex = $ef['sex'] ?? 'N/A';

                // Event Date
                $eventDate = $doc->date ?? 'N/A';
                if (strtolower($docType) === 'marriage') {
                    $eventDate = $ef['date_of_marriage'] ?? $doc->date ?? 'N/A';
                } elseif (strtolower($docType) === 'death') {
                    $eventDate = $ef['date_of_death'] ?? $doc->date ?? 'N/A';
                } else {
                    $dobDay = $ef['dob_day'] ?? '';
                    $dobMonth = $ef['dob_month'] ?? '';
                    $dobYear = $ef['dob_year'] ?? '';
                    if ($dobDay || $dobMonth || $dobYear) {
                        $eventDate = trim("{$dobMonth} {$dobDay}, {$dobYear}", ", ");
                    }
                }

                $brgy = $doc->barangay ?? $ef['barangay'] ?? 'N/A';
                $city = $ef['city_municipality'] ?? $ef['place_of_birth_city'] ?? 'Naic';
                $province = $ef['province'] ?? 'Cavite';
                $statusVal = ucfirst($doc->status ?? 'Processed');

                // Relative / Spouse fields
                $fatherOrHusband = 'N/A';
                $motherOrWife = 'N/A';

                if (strtolower($docType) === 'marriage') {
                    $hFirst = $ef['husband_first_name'] ?? '';
                    $hLast = $ef['husband_last_name'] ?? '';
                    $wFirst = $ef['wife_first_name'] ?? '';
                    $wLast = $ef['wife_last_name'] ?? '';
                    $fatherOrHusband = trim("{$hFirst} {$hLast}");
                    $motherOrWife = trim("{$wFirst} {$wLast}");
                } else {
                    $fFirst = $ef['father_first_name'] ?? '';
                    $fLast = $ef['father_last_name'] ?? '';
                    $mFirst = $ef['mother_first_name'] ?? $ef['mother_maiden_first_name'] ?? '';
                    $mLast = $ef['mother_last_name'] ?? $ef['mother_maiden_last_name'] ?? '';
                    $fatherOrHusband = trim("{$fFirst} {$fLast}");
                    $motherOrWife = trim("{$mFirst} {$mLast}");
                }

                $encodedBy = $doc->encoded_by ?? 'System Staff';
                $registeredAt = date('Y-m-d H:i', strtotime($doc->created_at));

                $rows[] = [
                    $doc->id,
                    $regNo,
                    'Uploaded Documents',
                    $docType,
                    $personName,
                    $sex,
                    $eventDate,
                    $brgy,
                    $city,
                    $province,
                    $statusVal,
                    $fatherOrHusband ?: 'N/A',
                    $motherOrWife ?: 'N/A',
                    $encodedBy,
                    $registeredAt
                ];
            }
        }

        $filename = "civil_registry_report_" . date('Y_m_d_His') . ($format === 'excel' ? '.xls' : '.csv');
        $delimiter = $format === 'excel' ? "\t" : ",";

        $output = "\xEF\xBB\xBF"; // UTF-8 BOM for Microsoft Excel compatibility
        $output .= implode($delimiter, array_map(function($h) use ($delimiter) {
            return '"' . str_replace('"', '""', $h) . '"';
        }, $headers)) . "\r\n";

        foreach ($rows as $row) {
            $output .= implode($delimiter, array_map(function($cell) use ($delimiter) {
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
}

