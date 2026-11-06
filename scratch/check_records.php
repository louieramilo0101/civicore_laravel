<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== DOCUMENTS (ALL) ===" . PHP_EOL;
$docs = App\Models\Document::withTrashed()->get();
foreach ($docs as $d) {
    echo "Doc ID: {$d->id}, RegNo: {$d->registry_number}, Status: {$d->status}, Deleted: {$d->deleted_at}, Title: {$d->title}" . PHP_EOL;
}

echo PHP_EOL . "=== ISSUANCES (ALL) ===" . PHP_EOL;
$iss = App\Models\Issuance::withTrashed()->get();
foreach ($iss as $i) {
    echo "Issuance ID: {$i->id}, Doc ID: {$i->document_id}, Cert: {$i->certificate_number}, Person: {$i->person_name}, Deleted: {$i->deleted_at}" . PHP_EOL;
}

