<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$iss = DB::table('issuances')->whereNull('deleted_at')->get();
foreach ($iss as $i) {
    echo "ID: {$i->id}, DocID: {$i->document_id}, Cert: {$i->certNumber}, Reg: {$i->registry_number}, Type: {$i->type}, Name: {$i->name}, Date: {$i->issuanceDate}, Created: {$i->created_at}" . PHP_EOL;
}

