<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

App\Models\Document::where('id', 4)->delete();
\Illuminate\Support\Facades\Cache::forget('dashboard_stats_cache');
echo "Doc 4 soft-deleted successfully\n";

