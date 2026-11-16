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
            $normType = $this->certType === 'marriage_license' ? 'marriage' : $this->certType;

            // Determine target registry table
            $registryTable = match ($normType) {
                'birth' => 'registry_births',
                'death' => 'registry_deaths',
                'marriage' => 'registry_marriages',
                default => 'registry_births'
            };

            // 1. Get or generate cert number
            $prefix = match($normType) {
                'birth' => 'BC',
                'death' => 'DC',
                'marriage' => 'ML',
                default => 'BC'
            };

            $year = date('Y');
            $maxId = DB::select("SELECT MAX(id) as max_id FROM {$registryTable} WHERE deleted_at IS NULL");
            $nextNum = $maxId[0]->max_id ?? 0;
            $nextNum = max($nextNum, 1);

            $certNumber = $prefix . '-' . $year . '-' . str_pad($nextNum, 3, '0', STR_PAD_LEFT);
            $registryNumber = $this->extractedFields['registry_number'] ?? $this->extractedFields['registry_no'] ?? $this->extractedFields['certNumber'] ?? $certNumber;

            // 2. Prepare data
            $data = [
                'certNumber' => $certNumber,
                'name' => $this->personName,
                'barangay' => $this->barangay,
                'issuanceDate' => date('m/d/Y'),
                'status' => 'active',
                'encoded_by' => $this->encodedBy,
                'extracted_data' => json_encode($this->extractedFields, JSON_UNESCAPED_UNICODE),
                'registry_number' => $registryNumber,
                'file_path' => $this->filePath,
                'image_path' => $this->imagePath,
                'document_id' => $this->documentId,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // 3. Insert into registry table
            DB::table($registryTable)->insert($data);

            Log::info("Synced Document ID {$this->documentId} to {$registryTable} (cert: {$certNumber})");
        } catch (\Exception $e) {
            Log::error("Failed to sync document {$this->documentId} to registry: " . $e->getMessage());
            throw $e;
        }
    }
}