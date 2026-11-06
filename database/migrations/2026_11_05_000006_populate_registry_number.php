<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;

return new class extends Migration
{
    public function up(): void
    {
        // Populate registry_number in documents from extracted_data/extracted_fields
        $documents = DB::table('documents')->get(['id', 'extracted_data', 'extracted_fields']);
        
        foreach ($documents as $doc) {
            $registryNumber = null;
            
            // Try extracted_data first
            if ($doc->extracted_data) {
                try {
                    $data = is_string($doc->extracted_data) 
                        ? json_decode(Crypt::decrypt($doc->extracted_data), true) 
                        : $doc->extracted_data;
                    
                    if (is_array($data)) {
                        $registryNumber = $data['registry_number'] ?? $data['registry_no'] ?? $data['certNumber'] ?? null;
                    }
                } catch (\Throwable $e) {
                    // Try without decryption if already plaintext
                    $data = is_string($doc->extracted_data) ? json_decode($doc->extracted_data, true) : $doc->extracted_data;
                    if (is_array($data)) {
                        $registryNumber = $data['registry_number'] ?? $data['registry_no'] ?? $data['certNumber'] ?? null;
                    }
                }
            }
            
            // Fallback to extracted_fields
            if (!$registryNumber && $doc->extracted_fields) {
                try {
                    $data = is_string($doc->extracted_fields) 
                        ? json_decode(Crypt::decrypt($doc->extracted_fields), true) 
                        : $doc->extracted_fields;
                    
                    if (is_array($data)) {
                        $registryNumber = $data['registry_number'] ?? $data['registry_no'] ?? $data['certNumber'] ?? null;
                    }
                } catch (\Throwable $e) {
                    $data = is_string($doc->extracted_fields) ? json_decode($doc->extracted_fields, true) : $doc->extracted_fields;
                    if (is_array($data)) {
                        $registryNumber = $data['registry_number'] ?? $data['registry_no'] ?? $data['certNumber'] ?? null;
                    }
                }
            }
            
            if ($registryNumber) {
                DB::table('documents')->where('id', $doc->id)->update(['registry_number' => $registryNumber]);
            }
        }
        
        // Populate registry_number in issuances from extracted_data
        $issuances = DB::table('issuances')->get(['id', 'extracted_data', 'certNumber']);
        
        foreach ($issuances as $iss) {
            $registryNumber = null;
            
            if ($iss->extracted_data) {
                try {
                    $data = is_string($iss->extracted_data) 
                        ? json_decode(Crypt::decrypt($iss->extracted_data), true) 
                        : $iss->extracted_data;
                    
                    if (is_array($data)) {
                        $registryNumber = $data['registry_number'] ?? $data['registry_no'] ?? $data['certNumber'] ?? null;
                    }
                } catch (\Throwable $e) {
                    $data = is_string($iss->extracted_data) ? json_decode($iss->extracted_data, true) : $iss->extracted_data;
                    if (is_array($data)) {
                        $registryNumber = $data['registry_number'] ?? $data['registry_no'] ?? $data['certNumber'] ?? null;
                    }
                }
            }
            
            // Fallback to certNumber
            if (!$registryNumber && $iss->certNumber) {
                $registryNumber = $iss->certNumber;
            }
            
            if ($registryNumber) {
                DB::table('issuances')->where('id', $iss->id)->update(['registry_number' => $registryNumber]);
            }
        }
    }

    public function down(): void
    {
        DB::table('documents')->update(['registry_number' => null]);
        DB::table('issuances')->update(['registry_number' => null]);
    }
};