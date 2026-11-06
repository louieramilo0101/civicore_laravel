<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$iss = DB::table('issuances')->get(['id', 'document_id', 'registry_number', 'type', 'name', 'deleted_at']);
foreach ($iss as $i) {
    echo "Issuance ID: {$i->id}, Doc ID: {$i->document_id}, Reg: {$i->registry_number}, Type: {$i->type}, Name: {$i->name}, Del: {$i->deleted_at}" . PHP_EOL;
}

