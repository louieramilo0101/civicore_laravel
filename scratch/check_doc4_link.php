<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$doc4 = DB::table('documents')->where('id', 4)->first();
echo "Doc 4 status: " . ($doc4 ? $doc4->status : 'null') . ", deleted_at: " . ($doc4 ? $doc4->deleted_at : 'null') . PHP_EOL;

$issWithDoc4 = DB::table('issuances')->where('document_id', 4)->first();
echo "Issuance with doc_id 4: " . ($issWithDoc4 ? $issWithDoc4->id : 'none') . PHP_EOL;

