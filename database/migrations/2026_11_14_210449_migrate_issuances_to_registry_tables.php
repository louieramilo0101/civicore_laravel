<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Migrate active issuances to registry tables
        $activeIssuances = DB::table('issuances')
            ->whereNull('deleted_at')
            ->whereIn('status', ['Active', 'Issued', 'Approved'])
            ->get();

        foreach ($activeIssuances as $issuance) {
            $type = strtolower($issuance->type);
            $table = match ($type) {
                'birth' => 'registry_births',
                'death' => 'registry_deaths',
                'marriage', 'marriage_license' => 'registry_marriages',
                default => null
            };

            if ($table) {
                $extractedData = $issuance->extracted_data;
                // Handle invalid JSON
                if (is_string($extractedData)) {
                    $decoded = json_decode($extractedData, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $extractedData = null;
                    }
                }

                DB::table($table)->insert([
                    'certNumber' => $issuance->certNumber,
                    'registry_number' => $issuance->registry_number ?? null,
                    'name' => $issuance->name,
                    'barangay' => $issuance->barangay,
                    'issuanceDate' => $issuance->issuanceDate,
                    'status' => 'active',
                    'encoded_by' => $issuance->encoded_by,
                    'extracted_data' => $extractedData,
                    'file_path' => $issuance->file_path,
                    'image_path' => $issuance->image_path,
                    'document_id' => $issuance->document_id,
                    'created_at' => $issuance->created_at,
                    'updated_at' => $issuance->updated_at,
                ]);
            }
        }

        // Migrate soft-deleted issuances to registry tables with archived status
        $deletedIssuances = DB::table('issuances')
            ->whereNotNull('deleted_at')
            ->get();

        foreach ($deletedIssuances as $issuance) {
            $type = strtolower($issuance->type);
            $table = match ($type) {
                'birth' => 'registry_births',
                'death' => 'registry_deaths',
                'marriage', 'marriage_license' => 'registry_marriages',
                default => null
            };

            if ($table) {
                $extractedData = $issuance->extracted_data;
                // Handle invalid JSON
                if (is_string($extractedData)) {
                    $decoded = json_decode($extractedData, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        $extractedData = null;
                    }
                }

                DB::table($table)->insert([
                    'certNumber' => $issuance->certNumber,
                    'registry_number' => $issuance->registry_number ?? null,
                    'name' => $issuance->name,
                    'barangay' => $issuance->barangay,
                    'issuanceDate' => $issuance->issuanceDate,
                    'status' => 'archived',
                    'encoded_by' => $issuance->encoded_by,
                    'extracted_data' => $extractedData,
                    'file_path' => $issuance->file_path,
                    'image_path' => $issuance->image_path,
                    'document_id' => $issuance->document_id,
                    'archived_at' => $issuance->deleted_at,
                    'archive_reason' => 'soft_delete',
                    'created_at' => $issuance->created_at,
                    'updated_at' => $issuance->updated_at,
                    'deleted_at' => $issuance->deleted_at,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot fully reverse without data loss, but clear registry tables
        DB::table('registry_births')->truncate();
        DB::table('registry_deaths')->truncate();
        DB::table('registry_marriages')->truncate();
    }
};