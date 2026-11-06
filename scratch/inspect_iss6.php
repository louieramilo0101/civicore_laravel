<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$iss = DB::table('issuances')->where('id', 6)->first();
$ef = \App\Support\EncryptedJson::decode($iss->extracted_data);
echo "=== Issuance 6 Non-Empty Fields ===" . PHP_EOL;
foreach ($ef as $k => $v) {
    if (!empty($v)) {
        echo "$k => " . (is_array($v) ? json_encode($v) : $v) . PHP_EOL;
    }
}

echo PHP_EOL . "=== Document 11 Raw Fields / OCR ===" . PHP_EOL;
$d = DB::table('documents')->where('id', 11)->first();
echo "personName: {$d->personName}" . PHP_EOL;
echo "ocr_text sample: " . substr($d->ocr_text ?? '', 0, 300) . PHP_EOL;

