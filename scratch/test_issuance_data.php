<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$issList = DB::table('issuances')->whereNull('deleted_at')->get();
foreach ($issList as $iss) {
    echo "=== Issuance ID {$iss->id} ({$iss->type} / {$iss->certNumber}) ===" . PHP_EOL;
    $ef = \App\Support\EncryptedJson::decode($iss->extracted_data);
    echo "Decoded keys count: " . count($ef) . PHP_EOL;
    
    // Check specific fields requested
    if ($iss->type === 'birth') {
        echo "DOB: " . ($ef['date_of_birth'] ?? 'none') . " | Parts: " . ($ef['dob_month'] ?? '') . " " . ($ef['dob_day'] ?? '') . ", " . ($ef['dob_year'] ?? '') . PHP_EOL;
        echo "Child: " . ($ef['first_name'] ?? '') . " " . ($ef['last_name'] ?? '') . PHP_EOL;
    } elseif ($iss->type === 'death') {
        echo "Deceased: " . ($ef['first_name'] ?? '') . " " . ($ef['last_name'] ?? '') . PHP_EOL;
        echo "DOD: " . ($ef['date_of_death'] ?? 'none') . PHP_EOL;
        echo "DOB: " . ($ef['date_of_birth'] ?? 'none') . PHP_EOL;
        echo "Age: " . ($ef['age'] ?? 'none') . " | Age Completed Years: " . ($ef['age_completed_years'] ?? 'none') . PHP_EOL;
        echo "Cause Immediate: " . ($ef['cause_of_death_immediate'] ?? 'none') . PHP_EOL;
        echo "Cause Antecedent: " . ($ef['cause_of_death_antecedent'] ?? 'none') . PHP_EOL;
        echo "Cause Underlying: " . ($ef['cause_of_death_underlying'] ?? 'none') . PHP_EOL;
        echo "Cause Generic: " . ($ef['cause_of_death'] ?? 'none') . PHP_EOL;
        echo "Manner of Death: " . ($ef['manner_of_death'] ?? 'none') . PHP_EOL;
    } elseif ($iss->type === 'marriage') {
        echo "Husband: " . ($ef['husband_first_name'] ?? '') . " " . ($ef['husband_last_name'] ?? '') . PHP_EOL;
        echo "Wife: " . ($ef['wife_first_name'] ?? '') . " " . ($ef['wife_last_name'] ?? '') . PHP_EOL;
        echo "DOM: " . ($ef['date_of_marriage'] ?? 'none') . PHP_EOL;
        echo "Solemnizing Officer Name: " . ($ef['solemnizing_officer_name'] ?? 'none') . PHP_EOL;
        echo "Solemnizing Officer Title: " . ($ef['solemnizing_officer_title'] ?? 'none') . PHP_EOL;
        echo "Ceremony Type: " . ($ef['ceremony_type'] ?? 'none') . PHP_EOL;
    }
}

