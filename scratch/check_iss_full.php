<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== ISSUANCES FULL ===" . PHP_EOL;
$iss = DB::table('issuances')->get();
foreach ($iss as $i) {
    echo "ID: {$i->id}, DocID: {$i->document_id}, CertNo: {$i->certificate_number}, RegNo: {$i->registry_number}, Type: {$i->certificate_type}, Person: {$i->person_name}, Deleted: {$i->deleted_at}" . PHP_EOL;
}

