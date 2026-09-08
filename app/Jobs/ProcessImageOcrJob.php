<?php

namespace App\Jobs;

use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/**
 * Represents the Process Image Ocr Job application component.
 */
class ProcessImageOcrJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Stores the timeout value used by this component. */
    public $timeout = 300;
    /** Stores the tries value used by this component. */
    public $tries = 3;

    /** Stores the documentId value used by this component. */
    protected $documentId;
    /** Stores the imagePath value used by this component. */
    protected $imagePath;
    /** Stores the pageNo value used by this component. */
    protected $pageNo;
    /** Stores the docType value used by this component. */
    protected $docType;
    /** Stores the languages value used by this component. */
    protected $languages;

    /**
     * Creates a new component instance.
     */
    public function __construct($documentId, $imagePath, $pageNo = 1, $docType = '', $languages = 'en,tl')
    {
        $this->documentId = $documentId;
        $this->imagePath = $imagePath;
        $this->pageNo = $pageNo;
        $this->docType = $docType;
        $this->languages = $languages;
    }

    /**
     * Executes the middleware operation.
     */
    public function middleware()
    {
        return [(new WithoutOverlapping('gemini-ocr-lock'))->releaseAfter(60)];
    }

    /**
     * Executes the handle operation.
     */
    public function handle(): void
    {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        // Add delay to prevent hitting Gemini API rate limits
        sleep(10);

        Log::info("ProcessImageOcrJob starting for doc {$this->documentId}, image: {$this->imagePath}");

        try {
            // Calculate total tokens used so far
            $tokensUsed = 0;
            $docMeta = DB::select("SELECT metadata FROM documents WHERE deleted_at IS NULL AND metadata IS NOT NULL");
            foreach ($docMeta as $dMeta) {
                $meta = json_decode($dMeta->metadata, true);
                if (isset($meta['image_token_cost'])) {
                    $tokensUsed += (int) $meta['image_token_cost'];
                }
            }
            $tokenBudget = (int) env('GEMINI_TOKEN_BUDGET', 1000000);

            $response = Http::timeout(120)->post('http://127.0.0.1:8080/ocr/gemini', [
                'file_path' => $this->imagePath,
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
            $newText = $result['text'] ?? '';
            $detectedType = $result['detected_type'] ?? 'unknown';
            $newFields = $result['extracted_fields'] ?? [];

            // ── Normalize Python Keys → React Form Keys ──────────────────────
            // We do this BEFORE the fallback merge so that ROI data is correctly
            // mapped and protected from being overwritten by PHP's regex guesses.
            $newFields = $this->normalizePythonFields($newFields);

            // ── Always Run PHP Anchor Parser Fallback + Merge ─────────────────
            // Even if Python returns fields, our PHP parser might find missing 
            // data using its regex anchor strategy.
            if (!empty($newText)) {
                $parser = new \App\Services\OcrParserService();
                $parsedData = $parser->parseText($newText);
                $phpFields = $parsedData['extracted_fields'] ?? [];

                // Merge: PHP fills any key that is STILL empty after Python+Normalization
                foreach ($phpFields as $key => $value) {
                    if (empty($newFields[$key]) && !empty($value)) {
                        $newFields[$key] = $value;
                    }
                }

                // If Python failed to detect type, trust PHP
                if ($detectedType === 'unknown' && !empty($parsedData['detected_type']) && $parsedData['detected_type'] !== 'unknown') {
                    $detectedType = $parsedData['detected_type'];
                }
            }

            // --- FINAL FALLBACK: Filename & Keyword Inspection ---
            if ($detectedType === 'unknown') {
                $doc = DB::table('documents')->where('id', $this->documentId)->first();
                $searchPool = strtolower(($doc->name ?? '') . ' ' . $newText);
                
                // Form 102 = Birth, Form 103 = Death, Form 97 = Marriage
                if (str_contains($searchPool, 'birth') || str_contains($searchPool, 'born') || str_contains($searchPool, 'form 102') || str_contains($searchPool, 'form no. 102')) {
                    $detectedType = 'birth';
                } elseif (str_contains($searchPool, 'death') || str_contains($searchPool, 'deceased') || str_contains($searchPool, 'form 103') || str_contains($searchPool, 'form no. 103')) {
                    $detectedType = 'death';
                } elseif (str_contains($searchPool, 'marriage') || str_contains($searchPool, 'contract') || str_contains($searchPool, 'form 97') || str_contains($searchPool, 'form no. 97')) {
                    $detectedType = 'marriage';
                }
            }

            // Temporary metadata flags for the batch aggregator
            $newFields['_quick_fill_used'] = $result['quick_fill_used'] ?? false;
            $newFields['_template_family_detected'] = $result['template_family_detected'] ?? null;
            $newFields['_detected_type'] = $detectedType;

            DB::table('document_ocr_pages')->updateOrInsert(
                [
                    'document_id' => $this->documentId,
                    'page_no' => $this->pageNo,
                ],
                [
                    'text' => $newText,
                    'detected_type' => $detectedType,
                    'extracted_fields' => json_encode($newFields, JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            Log::info("ProcessImageOcrJob finished for image: {$this->imagePath}");

        } catch (\Exception $e) {
            Log::error("ProcessImageOcrJob failed for {$this->imagePath}: " . $e->getMessage());
            $this->fail($e);
        } finally {
            // Logic Fix: We NO LONGER delete the imagePath here. 
            // If it's a permanent upload, we need it for the PDF background.
            // If it's a split PDF page, we might need page 1 for the preview.
            // Cleanup of temporary pages should be handled by the coordinator if necessary.
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
