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
                $conditions[] = "type = ?";
                $params[] = $type;
            }
            if (!empty($search)) {
                $conditions[] = "(name LIKE ? OR personName LIKE ? OR barangay LIKE ?)";
                $searchTerm = "%{$search}%";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            $whereClause = " WHERE " . implode(" AND ", $conditions) . " AND deleted_at IS NULL";
        } else {
            $whereClause = " WHERE deleted_at IS NULL";
        }
        
        // Get total count
        $countQuery = "SELECT COUNT(*) as total FROM documents d" . $whereClause;
        $totalResult = DB::select($countQuery, $params);
        $total = $totalResult[0]->total;
        
        // Get paginated results without loading binary content.
        $query = "SELECT d.id, d.name, d.type, d.date, d.size, d.status, d.personName, d.barangay, d.metadata, d.ocr_text, d.extracted_fields, d.detected_type, d.created_at, d.updated_at, d.encoded_by, d.file_path, d.image_path,
                         COALESCE(t.ticket_number, i.ticket_number, CONCAT('T-2026-', LPAD(d.id, 4, '0'))) as ticket_number
                  FROM documents d
                  LEFT JOIN tickets t ON t.document_id = d.id
                  LEFT JOIN issuances i ON i.document_id = d.id" . $whereClause . " ORDER BY d.id DESC LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = ($page - 1) * $perPage;
        
        $documents = DB::select($query, $params);
        
        // Enhance documents with real-time batch progress and duplicate detection
        foreach ($documents as $doc) {
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

        // Normalize date parts (day, year) to integers if they look numeric
        if (is_array($extractedFields)) {
            foreach (['dob_day', 'dob_year', 'marriage_parents_day', 'marriage_parents_year', 'death_day', 'death_year'] as $dateKey) {
                if (isset($extractedFields[$dateKey]) && is_string($extractedFields[$dateKey])) {
                    $cleaned = preg_replace('/[^0-9]/', '', $extractedFields[$dateKey]);
                    if ($cleaned !== '') {
                        $extractedFields[$dateKey] = (int)$cleaned;
                    }
                }
            }
        }

        return $this->performSave($request, $id, $extractedFields, $ocrText, $personName, $barangay, $status, $parentalConsent, $detectedType);
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

        // Two-factor duplicate check: name + date (skipped if staff forces through)
        if (!$force && $this->hasTrueDuplicate($detectedType, $fields, (int) $id)) {
            return response()->json([
                'success'   => false,
                'duplicate' => true,
                'error'     => 'A record with this name AND date already exists in the Master Registry. Confirm to override.',
            ], 422);
        }

        // Build personName from split fields
        $personName = $this->buildFullName($fields, $detectedType) ?: $docData->name;
        
        return $this->performSave($request, $id, $fields, $docData->ocr_text, $personName, $barangay, 'Processed', false, $detectedType);
    }

    /**
     * Two-factor duplicate detection: name + date.
     * Same name alone is NOT enough — civil registry commonly has people with the same name.
     * We match on both the person's name AND a date field (DOB, DOD, or date of marriage).
     * Returns true only when BOTH match an existing issuance record.
     *
     * @param string $type         Normalized type: birth|death|marriage
     * @param array  $fields       Extracted fields from the current document
     * @param int    $excludeDocId Document ID to exclude from the check (the current one)
     */
    private function hasTrueDuplicate(string $type, array $fields, int $excludeDocId = 0): bool
    {
        $base = DB::table('issuances')
            ->where('type', $type)
            ->whereNull('deleted_at');

        if ($excludeDocId > 0) {
            $base->where('document_id', '!=', $excludeDocId);
        }

        if ($type === 'birth') {
            $firstName = trim($fields['first_name'] ?? '');
            $lastName  = trim($fields['last_name']  ?? '');
            $dob       = trim($fields['date_of_birth'] ?? $fields['birth_date'] ?? '');

            // Need at least name; date is the tiebreaker
            if (empty($firstName) || empty($lastName)) return false;

            $query = (clone $base)
                ->where('name', 'like', "%{$lastName}%")
                ->where('name', 'like', "%{$firstName}%");

            if (!$query->exists()) return false; // No name match at all — definitely not a dup

            // Name matched — now check date_of_birth in extracted_data JSON
            if (!empty($dob)) {
                return (clone $base)
                    ->where('name', 'like', "%{$lastName}%")
                    ->where('name', 'like', "%{$firstName}%")
                    ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(extracted_data, '$.date_of_birth')) = ?", [$dob])
                    ->exists();
            }

            // If we have no DOB in the new document, fall back to name-only (conservative)
            return true;

        } elseif ($type === 'death') {
            $firstName = trim($fields['first_name'] ?? '');
            $lastName  = trim($fields['last_name']  ?? '');
            $dod       = trim($fields['date_of_death'] ?? $fields['death_date'] ?? '');

            if (empty($firstName) || empty($lastName)) return false;

            $query = (clone $base)
                ->where('name', 'like', "%{$lastName}%")
                ->where('name', 'like', "%{$firstName}%");

            if (!$query->exists()) return false;

            if (!empty($dod)) {
                return (clone $base)
                    ->where('name', 'like', "%{$lastName}%")
                    ->where('name', 'like', "%{$firstName}%")
                    ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(extracted_data, '$.date_of_death')) = ?", [$dod])
                    ->exists();
            }

            return true;

        } elseif ($type === 'marriage') {
            $hLastName = trim($fields['husband_last_name'] ?? '');
            $wLastName = trim($fields['wife_last_name']   ?? '');
            $dom       = trim($fields['date_of_marriage'] ?? $fields['marriage_date'] ?? '');

            if (empty($hLastName) && empty($wLastName)) return false;

            $query = (clone $base);
            if (!empty($hLastName)) $query->where('name', 'like', "%{$hLastName}%");
            if (!empty($wLastName)) $query->where('name', 'like', "%{$wLastName}%");

            if (!$query->exists()) return false;

            if (!empty($dom)) {
                $dateQuery = (clone $base);
                if (!empty($hLastName)) $dateQuery->where('name', 'like', "%{$hLastName}%");
                if (!empty($wLastName)) $dateQuery->where('name', 'like', "%{$wLastName}%");
                return $dateQuery
                    ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(extracted_data, '$.date_of_marriage')) = ?", [$dom])
                    ->exists();
            }

            return true;
        }

        return false;
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
                    
                    // Keep the original upload as the issuance source of truth.
                    $issuanceFilePath  = $doc[0]->file_path;
                    $issuanceImagePath = $doc[0]->image_path ?? null;

                    $normCertType = 'birth';
                    if ($docType === 'death') {
                        $normCertType = 'death';
                    } elseif ($docType === 'marriage' || $docType === 'marriage_license') {
                        $normCertType = 'marriage';
                    }

                    $ticketRecord = DB::table('tickets')->where('document_id', $id)->first();
                    $ticketNumber = $ticketRecord ? $ticketRecord->ticket_number : null;

                    if (count($existing) > 0) {
                        // 2. UPDATE existing Master Record (Keep certNumber)
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
                        // 3. INSERT new Master Record (Generate NEW certNumber with Atomic Concurrency Lock)
                        Cache::lock('issuance_cert_number_lock', 10)->block(5, function () use ($docType, $normCertType, $personName, $barangay, $encodedBy, $id, $extractedFields, $issuanceFilePath, $issuanceImagePath, $ticketNumber) {
                            $prefix = ($docType === 'death') ? 'DC' : (($docType === 'marriage' || $docType === 'marriage_license') ? 'ML' : 'BC');
                            $year = date('Y');
                            
                            $results = DB::select("SELECT MAX(id) as max_id FROM issuances");
                            $nextNum = 1;
                            if (count($results) > 0 && $results[0]->max_id !== null) {
                                $nextNum = intval($results[0]->max_id) + 1;
                            }
                            
                            $certNumber = $prefix . '-' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
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
     * Check if similar fields exist in the Master Registry (issuances table).
     */
    public function checkDuplicate(Request $request, $id)
    {
        $type = $request->input('type');
        $fields = $request->input('fields', []);

        if (empty($fields)) {
            return response()->json([
                'success' => true,
                'duplicate' => false,
                'candidate' => null
            ]);
        }

        // Extract all candidate name components regardless of current category
        $firstName = trim($fields['first_name'] ?? $fields['husband_first_name'] ?? $fields['wife_first_name'] ?? $fields['deceased_first_name'] ?? '');
        $lastName  = trim($fields['last_name']  ?? $fields['husband_last_name']  ?? $fields['wife_last_name']  ?? $fields['deceased_last_name']  ?? '');
        $regNo     = trim($fields['registry_number'] ?? $fields['registry_no'] ?? '');

        if (empty($firstName) && empty($lastName) && empty($regNo)) {
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

        // Function to build query for a given type filter (or all types if null)
        $findCandidate = function ($typeFilter = null) use ($id, $firstName, $lastName, $regNo) {
            $query = DB::table('issuances')
                ->whereNull('deleted_at')
                ->where('document_id', '!=', $id);

            if ($typeFilter) {
                $query->where('type', $typeFilter);
            }

            $query->where(function ($q) use ($firstName, $lastName, $regNo) {
                if (!empty($regNo)) {
                    $q->orWhere('certNumber', 'like', "%{$regNo}%")
                      ->orWhere('extracted_data', 'like', "%{$regNo}%");
                }
                if (!empty($lastName)) {
                    if (!empty($firstName)) {
                        $q->orWhere(function ($sub) use ($firstName, $lastName) {
                            $sub->where('name', 'like', "%{$lastName}%")
                                ->where('name', 'like', "%{$firstName}%");
                        });
                    } else {
                        $q->orWhere('name', 'like', "%{$lastName}%");
                    }
                }
            });

            return $query->first();
        };

        // 1. Try matching with specific requested type
        $candidate = $findCandidate($normType);

        // 2. If no match found under current category, fallback to cross-category search
        if (!$candidate) {
            $candidate = $findCandidate(null);
        }

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
     * Create a manual document record without any file upload.
     */
    public function storeManual(Request $request)
    {
        $request->validate([
            'type' => 'required|string|in:birth,death,marriage,marriage_license',
            'extracted_fields' => 'required|array',
            'parental_consent' => 'nullable|boolean'
        ]);

        $userId = $request->session()->get('user_id');
        $user = $userId ? \App\Models\User::find($userId) : null;
        $encodedBy = $user ? $user->name : 'System';

        $docType = $request->input('type');
        $extractedFields = $request->input('extracted_fields', []);
        $parentalConsent = $request->input('parental_consent', false);
        
        $normType = $docType;
        if ($docType === 'marriage_license') {
            $normType = 'marriage';
        }

        // Two-factor duplicate check: name + date (skip if force=true)
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);

        if (!$force && $this->hasTrueDuplicate($normType, $extractedFields)) {
            return response()->json([
                'success'   => false,
                'duplicate' => true,
                'error'     => 'A record with this name AND date already exists in the Master Registry. Confirm to override.',
            ], 422);
        }

        // Build personName
        $personName = $this->buildFullName($extractedFields, $normType);
        $barangay = $extractedFields['barangay'] ?? '';
        $name = 'Manual Entry - ' . date('m/d/Y H:i');

        // Create document record with Processed status directly (so it never appears in the queue)
        $newId = DB::table('documents')->insertGetId([
            'name' => $name,
            'type' => $docType,
            'date' => date('m/d/Y'),
            'size' => '0 KB',
            'status' => 'Processed',
            'personName' => $personName,
            'barangay' => $barangay,
            'file_path' => null, 
            'encoded_by' => $encodedBy,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // This method does dynamic template compilation and handles Master registry insert
        return $this->performSave($request, $newId, $extractedFields, '', $personName, $barangay, 'Processed', $parentalConsent, $docType);
    }

    /**
     * Export Civil Registry Documents Report in CSV or Excel format
     */
    public function exportReport(Request $request)
    {
        $type = strtolower(trim($request->query('type', 'all')));
        $format = strtolower(trim($request->query('format', 'csv')));
        $barangay = trim($request->query('barangay', 'all'));
        $status = trim($request->query('status', 'all'));
        $dateFrom = $request->query('date_from', '');
        $dateTo = $request->query('date_to', '');

        $conditions = ["deleted_at IS NULL"];
        $params = [];

        if (!empty($type) && $type !== 'all') {
            $conditions[] = "LOWER(type) = ?";
            $params[] = $type;
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

