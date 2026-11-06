<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$rows = DB::table('documents')->whereIn('id', [3, 4, 10, 11, 12, 39])->get(['id', 'registry_number', 'status', 'extracted_fields', 'extracted_data']);
foreach ($rows as $r) {
    echo "ID: {$r->id}, Reg: {$r->registry_number}, Status: {$r->status}" . PHP_EOL;
    echo "Fields raw prefix: " . substr($r->extracted_fields ?? '', 0, 40) . PHP_EOL;
    $decoded = \App\Support\EncryptedJson::decode($r->extracted_fields);
    echo "Decoded keys count: " . count($decoded) . PHP_EOL;
    if (count($decoded) > 0) {
        echo "Keys: " . implode(', ', array_keys($decoded)) . PHP_EOL;
        echo "Sample data: ";
        foreach (['first_name', 'last_name', 'child_name', 'deceased_name', 'cause_of_death', 'manner_of_death', 'solemnizing_officer', 'age_completed_years', 'age', 'date_of_death', 'date_of_marriage', 'date_of_birth'] as $k) {
            if (isset($decoded[$k])) {
                echo "[$k: {$decoded[$k]}] ";
            }
        }
        echo PHP_EOL;
    }
    echo "-----------------------------------" . PHP_EOL;
}

