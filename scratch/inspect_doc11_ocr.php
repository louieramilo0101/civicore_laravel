<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$d = DB::table('documents')->where('id', 11)->first();
echo "Document 11 OCR Text:" . PHP_EOL;
echo $d->ocr_text . PHP_EOL;

