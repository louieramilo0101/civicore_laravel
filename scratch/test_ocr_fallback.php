<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$query = "SELECT i.id, i.certNumber, i.type, i.name, i.barangay, i.status, i.issuanceDate,
                 i.encoded_by, i.or_number, i.print_remarks, i.requested_by, i.approved_by,
                 i.extracted_data, i.created_at, d.personName, d.date, d.extracted_fields, d.status as doc_status, d.ocr_text
           FROM issuances i
           LEFT JOIN documents d ON d.id = i.document_id
           WHERE i.deleted_at IS NULL ORDER BY i.id DESC";

$records = DB::select($query);

foreach ($records as $doc) {
    $dataPayload = !empty($doc->extracted_data) ? $doc->extracted_data : ($doc->extracted_fields ?? null);
    $ef = \App\Support\EncryptedJson::decode($dataPayload);
    
    // Check if doc->ocr_text has JSON
    $ocrJson = [];
    if (!empty($doc->ocr_text)) {
        $trimmed = trim($doc->ocr_text);
        if (str_starts_with($trimmed, '{') && str_ends_with($trimmed, '}')) {
            $ocrJson = json_decode($trimmed, true) ?: [];
        }
    }
    
    echo "--------------------------------------------------------" . PHP_EOL;
    echo "Record #{$doc->id} [Type: {$doc->type}] [Name: {$doc->name}]" . PHP_EOL;
    echo "certNumber: {$doc->certNumber}" . PHP_EOL;
    
    if ($doc->type === 'death') {
        $ageVal = (int) ($ef['age_completed_years'] ?? $ef['age'] ?? $ocrJson['age'] ?? 0);
        $cause = $ef['cause_of_death_immediate'] ?? $ef['cause_of_death'] ?? $ocrJson['cause_of_death'] ?? 'N/A';
        $manner = $ef['manner_of_death'] ?? $ocrJson['manner_of_death'] ?? (str_contains(strtolower($cause), 'accident') ? 'Accident' : 'Natural Cause');
        $dod = $ef['date_of_death'] ?? $ocrJson['date_of_death'] ?? $doc->date ?? 'N/A';
        echo "Death -> Age: $ageVal, Cause: $cause, Manner: $manner, DOD: $dod" . PHP_EOL;
    } elseif ($doc->type === 'marriage') {
        $officer = $ef['solemnizing_officer_name'] ?? $ef['solemnizing_officer_title'] ?? $ef['ceremony_type'] ?? $ocrJson['solemnizing_officer_name'] ?? 'N/A';
        $dom = $ef['date_of_marriage'] ?? $ocrJson['date_of_marriage'] ?? $doc->date ?? 'N/A';
        echo "Marriage -> Officer: $officer, DOM: $dom" . PHP_EOL;
    } elseif ($doc->type === 'birth') {
        $dob = $ef['date_of_birth'] ?? $ocrJson['date_of_birth'] ?? 'N/A';
        echo "Birth -> DOB: $dob" . PHP_EOL;
    }
}

