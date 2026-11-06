<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== DOCUMENTS (ALAMARES / VENTURA) ===" . PHP_EOL;
$docs = App\Models\Document::withTrashed()
    ->where(function($q) {
        $q->where('extracted_fields', 'LIKE', '%ALAMARES%')
          ->orWhere('extracted_fields', 'LIKE', '%VENTURA%');
    })->get(['id', 'tracking_number', 'status', 'deleted_at']);
foreach ($docs as $d) {
    echo "Doc ID: {$d->id}, Tracking: {$d->tracking_number}, Status: {$d->status}, Deleted: {$d->deleted_at}" . PHP_EOL;
}

echo PHP_EOL . "=== ISSUANCES (ALAMARES / VENTURA) ===" . PHP_EOL;
$iss = App\Models\Issuance::withTrashed()
    ->where(function($q) {
        $q->where('extracted_fields', 'LIKE', '%ALAMARES%')
          ->orWhere('extracted_fields', 'LIKE', '%VENTURA%')
          ->orWhere('person_name', 'LIKE', '%ALAMARES%')
          ->orWhere('person_name', 'LIKE', '%VENTURA%');
    })->get(['id', 'document_id', 'certificate_number', 'person_name', 'deleted_at']);
foreach ($iss as $i) {
    echo "Issuance ID: {$i->id}, Doc ID: {$i->document_id}, Cert: {$i->certificate_number}, Person: {$i->person_name}, Deleted: {$i->deleted_at}" . PHP_EOL;
}

