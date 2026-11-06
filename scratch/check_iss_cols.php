<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

echo "Issuances columns: " . implode(', ', Schema::getColumnListing('issuances')) . PHP_EOL;

$iss = DB::table('issuances')->get();
foreach ($iss as $i) {
    echo json_encode($i) . PHP_EOL;
}

