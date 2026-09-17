<?php

namespace App\Jobs;

use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Bus;
use App\Jobs\ProcessImageOcrJob;
use Throwable;

/**
 * Represents the Process Document Ocr application component.
 */
class ProcessDocumentOcr implements ShouldQueue, ShouldBeUnique
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Stores the tries value used by this component. */
    public $tries = 3;
    /** Stores the backoff value used by this component. */
    public $backoff = [60, 120, 300];
    /** Stores the timeout value used by this component. */
    public $timeout = 900;
    /** Stores the uniqueFor value used by this component. */
    public $uniqueFor = 3600;

    /** Stores the documentId value used by this component. */
    protected $documentId;
    /** Stores the docType value used by this component. */
    protected $docType;
    /** Stores the languages value used by this component. */
    protected $languages;

    /**
     * Creates a new component instance.
     */
    public function __construct($documentId, $docType = '', $languages = 'en,tl')
    {
        $this->documentId = $documentId;
        $this->docType = $docType;
        $this->languages = $languages;
        $this->onQueue('low');
    }

    /**
     * Executes the unique id operation.
     */
    public function uniqueId()
    {
        return (string) $this->documentId;
    }

    /**
     * Executes the handle operation.
     */
    public function handle(): void
    {
        Log::info("ProcessDocumentOcr Coordinator starting for Document ID: " . $this->documentId);

        $doc = DB::selectOne("SELECT * FROM documents WHERE id = ?", [$this->documentId]);
        
        // 1. Check if the document exists and has a file path mapped
        if (!$doc || empty($doc->file_path)) {
            Log::error("Invalid document or missing file_path on disk for ID: " . $this->documentId);
            return;
        }

        if (strtolower($doc->status) === 'stopped') {
            Log::info("ProcessDocumentOcr job skipped because status is stopped for Document ID: " . $this->documentId);
            return;
        }

        // 2. Get the actual physical path on your Windows machine in the local disk
        $sourceFilePath = storage_path('app/public/' . $doc->file_path);

        if (!file_exists($sourceFilePath)) {
            Log::error("Physical file is missing from storage folder: " . $sourceFilePath);
            DB::update("UPDATE documents SET status = 'failed' WHERE id = ?", [$this->documentId]);
            return;
        }

        // 3. Determine extension dynamically from the file path
        $extension = strtolower(pathinfo($sourceFilePath, PATHINFO_EXTENSION));

        try {
            $imagePath = $sourceFilePath;

            // 1. If it's a PDF, split it and take only the first page
            if ($extension === 'pdf') {
                Log::info("PDF detected. Requesting Python to split into pages...");
                
                $response = Http::timeout(60)
                    ->post('http://127.0.0.1:8080/split', [
                        'file_path' => $sourceFilePath,
                    ]);

                if ($response->failed() || !($response->json()['success'] ?? false)) {
                    throw new \Exception("Failed to split PDF: " . $response->body());
                }

                $pages = $response->json()['pages'];
                Log::info("PDF split into " . count($pages) . " pages.");

                if (count($pages) === 0) {
                    throw new \Exception("PDF contains no pages.");
                }

                // Strictly process only the first page to save Gemini paid API tokens
                $imagePath = $pages[0];
            }

            // 2. Enforce Daily Scan Limit (Token budget manager check)
            $dailyLimit = (int) env('DAILY_SCAN_LIMIT', 1000);
            $start = \Carbon\Carbon::today(config('app.timezone'))->startOfDay();
            $end = \Carbon\Carbon::today(config('app.timezone'))->endOfDay();
            $todayScans = DB::table('documents')
                ->whereIn('status', ['extracted', 'Processed', 'Issued'])
                ->whereBetween('updated_at', [$start, $end])
                ->count();

            if ($todayScans >= $dailyLimit) {
                Log::warning("Daily OCR scan limit of {$dailyLimit} reached. Halting job for Document ID: " . $this->documentId);
                $metadata = json_decode($doc->metadata ?? '{}', true) ?: [];
                $metadata['failure_reason'] = 'Daily paid API scan limit reached (' . $dailyLimit . ').';
                DB::table('documents')->where('id', $this->documentId)->update([
                    'status' => 'failed',
                    'metadata' => json_encode($metadata, JSON_UNESCAPED_UNICODE),
                    'updated_at' => now()
                ]);
                return;
            }

            // 3. Mark status as Processing
            DB::table('documents')->where('id', $this->documentId)->update([
                'status' => 'Processing',
                'updated_at' => now(),
            ]);

            // Calculate total tokens used so far (cached to avoid full-table JSON scanning)
            $tokensUsed = \Illuminate\Support\Facades\Cache::remember('total_gemini_tokens_used', 300, function () {
                $docMeta = DB::select("SELECT metadata FROM documents WHERE deleted_at IS NULL AND metadata IS NOT NULL");
                $total = 0;
                foreach ($docMeta as $dMeta) {
                    $meta = json_decode($dMeta->metadata, true);
                    if (isset($meta['image_token_cost'])) {
                        $total += (int) $meta['image_token_cost'];
                    }
                }
                return $total;
            });
            $tokenBudget = (int) env('GEMINI_TOKEN_BUDGET', 1000000);

            // 4. Execute OCR via Gemini API (runs synchronously inside this job)
            Log::info("Executing Gemini OCR for Document ID {$this->documentId} using image: {$imagePath}");
            $response = Http::timeout(120)->post('http://127.0.0.1:8080/ocr/gemini', [
                'file_path' => $imagePath,
                'doc_type' => $this->docType,
                'languages' => $this->languages,
                'ocr_mode' => 'balanced',
                'total_tokens_used' => $tokensUsed,
                'token_budget' => $tokenBudget,
            ]);

            if ($response->failed() || !($response->json()['success'] ?? false)) {
                throw new \Exception("OCR Server error: " . $response->body());
            }

            $result = $response->json();
            $ocrText = $result['text'] ?? '';
            $detectedType = $result['detected_type'] ?? 'unknown';
            $extractedFields = $result['extracted_fields'] ?? [];
            $quickFillUsed = $result['quick_fill_used'] ?? false;
            $templateFamilyDetected = $result['template_family_detected'] ?? null;

            // Normalize Python fields to match React form fields
            $extractedFields = $this->normalizePythonFields($extractedFields);

            // 5. Always Run PHP Anchor Parser Fallback + Merge
            if (!empty($ocrText)) {
                $parser = new \App\Services\OcrParserService();
                $parsedData = $parser->parseText($ocrText);
                $phpFields = $parsedData['extracted_fields'] ?? [];

                // Merge PHP parser fallback fields if missing
                foreach ($phpFields as $key => $value) {
                    if (empty($extractedFields[$key]) && !empty($value)) {
                        $extractedFields[$key] = $value;
                    }
                }

                if ($detectedType === 'unknown' && !empty($parsedData['detected_type']) && $parsedData['detected_type'] !== 'unknown') {
                    $detectedType = $parsedData['detected_type'];
                }
            }

            // Keyword fallback for document type
            if ($detectedType === 'unknown') {
                $searchPool = strtolower(($doc->name ?? '') . ' ' . $ocrText);
                if (str_contains($searchPool, 'birth') || str_contains($searchPool, 'born') || str_contains($searchPool, 'form 102') || str_contains($searchPool, 'form no. 102')) {
                    $detectedType = 'birth';
                } elseif (str_contains($searchPool, 'death') || str_contains($searchPool, 'deceased') || str_contains($searchPool, 'form 103') || str_contains($searchPool, 'form no. 103')) {
                    $detectedType = 'death';
                } elseif (str_contains($searchPool, 'marriage') || str_contains($searchPool, 'contract') || str_contains($searchPool, 'form 97') || str_contains($searchPool, 'form no. 97')) {
                    $detectedType = 'marriage';
                }
            }

            // Run duplicate check on the newly extracted record against Master Registry (issuances table)
            $hasDuplicate = false;
            $dupType = $detectedType;
            if ($dupType === 'marriage_license') {
                $dupType = 'marriage';
            }
            $dupQuery = DB::table('issuances')
                ->where('type', $dupType)
                ->whereNull('deleted_at');

            if ($dupType === 'birth' || $dupType === 'death') {
                $firstName = trim($extractedFields['first_name'] ?? '');
                $lastName = trim($extractedFields['last_name'] ?? '');
                if (!empty($firstName) && !empty($lastName)) {
                    $dupQuery->where('name', 'like', "%{$lastName}%")
                             ->where('name', 'like', "%{$firstName}%");
                    if ($dupQuery->exists()) {
                        $hasDuplicate = true;
                    }
                }
            } elseif ($dupType === 'marriage') {
                $hLastName = trim($extractedFields['husband_last_name'] ?? '');
                $wLastName = trim($extractedFields['wife_last_name'] ?? '');
                if (!empty($hLastName) || !empty($wLastName)) {
                    if (!empty($hLastName)) {
                        $dupQuery->where('name', 'like', "%{$hLastName}%");
                    }
                    if (!empty($wLastName)) {
                        $dupQuery->where('name', 'like', "%{$wLastName}%");
                    }
                    if ($dupQuery->exists()) {
                        $hasDuplicate = true;
                    }
                }
            }

            // Save metadata
            $metadata = json_decode($doc->metadata ?? '{}', true) ?: [];
            $metadata['quick_fill_used'] = $quickFillUsed;
            $metadata['template_family_detected'] = $templateFamilyDetected;
            $metadata['processed_pages_count'] = 1;
            $metadata['has_duplicate'] = $hasDuplicate; // Save directly in metadata for instant client access
            if (isset($result['image_token_cost'])) {
                $cost = (int) $result['image_token_cost'];
                $metadata['image_token_cost'] = $cost;
                \Illuminate\Support\Facades\Cache::increment('total_gemini_tokens_used', $cost);
            }

            // 6. Update database record with temporary checking status phase
            DB::table('documents')->where('id', $this->documentId)->update([
                'status' => 'checking',
                'updated_at' => now()
            ]);

            // 1.5 seconds delay to allow UI to render the validation step
            usleep(1500000);

            // Update database record with final values and status = extracted
            DB::update(
                "UPDATE documents
                 SET ocr_text = ?, detected_type = ?, extracted_fields = ?, metadata = ?, status = 'extracted', updated_at = NOW()
                 WHERE id = ?",
                [
                    $ocrText,
                    $detectedType,
                    json_encode($extractedFields, JSON_UNESCAPED_UNICODE),
                    json_encode($metadata, JSON_UNESCAPED_UNICODE),
                    $this->documentId,
                ]
            );

            Log::info("ProcessDocumentOcr finished successfully for Document ID: " . $this->documentId);

        } catch (\Throwable $e) {
            Log::error("ProcessDocumentOcr failed for Document ID {$this->documentId}: " . $e->getMessage());
            Log::error($e->getTraceAsString());
            DB::update("UPDATE documents SET status = 'failed', updated_at = NOW() WHERE id = ?", [$this->documentId]);
        }
    }

    /**
     * Translate Python OCR keys → BirthConfig.js expected keys
     */
    private function normalizePythonFields(array $fields): array
    {
        // 1. Split Child Name → first_name + middle_name + last_name
        if (!empty($fields['full_name']) && empty($fields['first_name'])) {
            $parts = preg_split('/\s+/', trim($fields['full_name']));
            $fields['first_name']  = ucfirst(strtolower($parts[0] ?? ''));
            $fields['last_name']   = ucfirst(strtolower(array_pop($parts) ?? ''));
            $fields['middle_name'] = ucfirst(strtolower(implode(' ', array_slice($parts, 1))));
        }

        // 2. Split Mother's Maiden Name
        if (!empty($fields['mother_full_name']) && empty($fields['mother_first_name'])) {
            $parts = preg_split('/\s+/', trim($fields['mother_full_name']));
            $fields['mother_first_name']  = ucfirst(strtolower($parts[0] ?? ''));
            $fields['mother_last_name']   = ucfirst(strtolower(array_pop($parts) ?? ''));
            $fields['mother_middle_name'] = ucfirst(strtolower(implode(' ', array_slice($parts, 1))));
        }

        // 3. Split Father's Name
        if (!empty($fields['father_full_name']) && empty($fields['father_first_name'])) {
            $parts = preg_split('/\s+/', trim($fields['father_full_name']));
            $fields['father_first_name']  = ucfirst(strtolower($parts[0] ?? ''));
            $fields['father_last_name']   = ucfirst(strtolower(array_pop($parts) ?? ''));
            $fields['father_middle_name'] = ucfirst(strtolower(implode(' ', array_slice($parts, 1))));
        }

        // 4. Split date_of_birth → dob_day + dob_month + dob_year
        if (!empty($fields['date_of_birth']) && empty($fields['dob_day'])) {
            $raw = $fields['date_of_birth'];
            // Handle "January 11, 1943" or "11/01/1943" or "1943-01-11"
            if (preg_match('/(\w+)\s+(\d{1,2}),?\s+(\d{4})/', $raw, $m)) {
                $fields['dob_month'] = ucfirst(strtolower($m[1]));
                $fields['dob_day']   = $m[2];
                $fields['dob_year']  = $m[3];
            } elseif (preg_match('#(\d{1,2})/(\d{1,2})/(\d{4})#', $raw, $m)) {
                $fields['dob_day']   = $m[1];
                $fields['dob_month'] = $m[2]; 
                $fields['dob_year']  = $m[3];
            }
        }

        // 5. Map place_of_birth → place_of_birth_hospital
        if (!empty($fields['place_of_birth']) && empty($fields['place_of_birth_hospital'])) {
            $fields['place_of_birth_hospital'] = $fields['place_of_birth'];
        }

        // 6. Normalize Sex (M/F → Male/Female)
        if (!empty($fields['sex'])) {
            $s = strtoupper(trim($fields['sex']));
            if ($s === 'M' || str_contains($s, 'MAL')) $fields['sex'] = 'Male';
            else if ($s === 'F' || str_contains($s, 'FEM')) $fields['sex'] = 'Female';
        }

        // Cleanup intermediate keys
        unset($fields['full_name'], $fields['date_of_birth'], $fields['place_of_birth'], $fields['mother_full_name'], $fields['father_full_name']);

        return $fields;
    }
}
