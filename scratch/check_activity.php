<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$rows = DB::table('activity_logs')
    ->where('details', 'LIKE', '%4%')
    ->orWhere('details', 'LIKE', '%39%')
    ->orWhere('details', 'LIKE', '%Alamares%')
    ->orWhere('details', 'LIKE', '%Ventura%')
    ->orderBy('id', 'desc')
    ->take(20)
    ->get();

foreach ($rows as $r) {
    echo "Log {$r->id} [{$r->created_at}] Action: {$r->action}, Type: {$r->record_type}, Details: {$r->details}" . PHP_EOL;
}

