<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$d4 = DB::table('documents')->where('id', 4)->first();
echo "Doc 4 created_at: {$d4->created_at}, updated_at: {$d4->updated_at}, deleted_at: {$d4->deleted_at}, person: {$d4->personName}, reg: {$d4->registry_number}" . PHP_EOL;

$d39 = DB::table('documents')->where('id', 39)->first();
echo "Doc 39 created_at: {$d39->created_at}, updated_at: {$d39->updated_at}, deleted_at: {$d39->deleted_at}, person: {$d39->personName}, reg: {$d39->registry_number}" . PHP_EOL;

$i10 = DB::table('issuances')->where('id', 10)->first();
echo "Issuance 10 created_at: {$i10->created_at}, updated_at: {$i10->updated_at}, deleted_at: {$i10->deleted_at}, name: {$i10->name}, certNumber: {$i10->certNumber}, doc_id: {$i10->document_id}" . PHP_EOL;

