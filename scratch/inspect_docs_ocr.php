<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$d10 = DB::table('documents')->where('id', 10)->first();
echo "Document 10 OCR Text:" . PHP_EOL;
echo $d10->ocr_text . PHP_EOL;

$d12 = DB::table('documents')->where('id', 12)->first();
echo PHP_EOL . "Document 12 OCR Text sample:" . PHP_EOL;
echo substr($d12->ocr_text ?? '', 0, 400) . PHP_EOL;

