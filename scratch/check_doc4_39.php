<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Doc 4:" . PHP_EOL;
$d4 = App\Models\Document::find(4);
print_r($d4->extracted_fields);

echo PHP_EOL . "Doc 39:" . PHP_EOL;
$d39 = App\Models\Document::find(39);
print_r($d39->extracted_fields);

echo PHP_EOL . "Issuance 10:" . PHP_EOL;
$i10 = App\Models\Issuance::find(10);
print_r($i10->toArray());

