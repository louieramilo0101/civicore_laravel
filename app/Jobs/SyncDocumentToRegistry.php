<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncDocumentToRegistry implements ShouldQueue
{
    use Dispatchable, Queueable;

    public $documentId;
    public $documentType;
    public $extractedFields;
    public $detectedType;
    public $certNumber;
    public $certType;
    public $personName;
    public $barangay;
    public $encodedBy;
    public $filePath;
    public $imagePath;

    public function __construct($documentId, $documentType, $extractedFields, $detectedType, $certNumber, $certType, $personName, $barangay, $encodedBy, $filePath, $imagePath)
    {
        $this->documentId = $documentId;
        $this->documentType = $documentType;
        $this->extractedFields = $extractedFields;
        $this->detectedType = $detectedType;
        $this->certNumber = $certNumber;
        $this->certType = $certType;
        $this->personName = $personName;
        $this->barangay = $barangay;
        $this->encodedBy = $encodedBy;
        $this->filePath = $filePath;
        $this->imagePath = $imagePath;
    }

    public function handle()
    {
        try {
            // 1. Get or generate cert number
            $prefix = match($this->certType) {
                'birth' => 'BC',
                'death' => 'DC',
                'marriage' => 'ML',
                default => 'BC'
            };

            $year = date('Y');
            $maxId = DB::select("SELECT MAX(id) as max_id FROM issuances");
            $nextNum = $maxId[0]->max_id ?? 0;
            $nextNum = max($nextNum, 1);

            $certNumber = $prefix . '-' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
            $registryNumber = $this->extractedFields['registry_number'] ?? $this->extractedFields['registry_no'] ?? $this->extractedFields['certNumber'] ?? $certNumber;

            // 2. Prepare data
            $data = [
                'certNumber' => $certNumber,
                'type' => $this->documentType,
                'certificate_type' => $this->certType,
                'name' => $this->personName,
                'barangay' => $this->barangay,
                'status' => 'Active',
                'encoded_by' => $this->encodedBy,
                'extracted_data' => DB::raw("ENCRYPTED('" . json_encode($this->extractedFields) . "')"),
                'registry_number' => $registryNumber,
                'file_path' => $this->filePath,
                'image_path' => $this->imagePath,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // 3. Insert into issuances
            DB::table('issuances')->insert($data);

            Log::info("Synced Document ID {$this->documentId} to registry (cert: {$certNumber})");
        } catch (\Exception $e) {
            Log::error("Failed to sync document {$this->documentId} to registry: " . $e->getMessage());
            throw $e;
        }
    }
}