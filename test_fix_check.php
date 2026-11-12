<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$doc = DB::table('documents')->where('id', 30)->first();
echo "doc 30 status: " . $doc->status . "\n";
echo "jobs count: " . DB::table('jobs')->count() . "\n";
echo "failed docs: " . DB::table('documents')->where('status','failed')->count() . "\n";
echo "pending docs: " . DB::table('documents')->whereIn('status', ['pending','processing','Processing'])->count() . "\n";