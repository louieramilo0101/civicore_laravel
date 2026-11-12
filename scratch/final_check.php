<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "jobs: " . DB::table('jobs')->count() . "\n";
echo "failed: " . DB::table('documents')->where('status','failed')->count() . "\n";
echo "pending: " . DB::table('documents')->whereIn('status', ['pending','processing','Processing'])->count() . "\n";
echo "completed: " . DB::table('documents')->whereIn('status', ['extracted','processed','Issued','active'])->count() . "\n";