<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "failed_jobs: " . DB::table('failed_jobs')->count() . PHP_EOL;
foreach (DB::table('failed_jobs')->orderByDesc('id')->limit(12)->get() as $f) {
    echo "  #{$f->id} queue={$f->queue} failed_at={$f->failed_at}\n";
    echo "    " . substr($f->exception, 0, 400) . "\n";
    echo "    payload: " . substr($f->payload, 0, 120) . "\n";
}
echo "jobs now: " . DB::table('jobs')->count() . PHP_EOL;
echo "redis locks: " . json_encode(\Illuminate\Support\Facades\Redis::keys('laravel_unique_job:*')) . PHP_EOL;