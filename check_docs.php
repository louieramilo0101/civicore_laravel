<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$docs = \Illuminate\Support\Facades\DB::table('documents')
    ->orderBy('created_at', 'desc')
    ->limit(20)
    ->get();

echo "Total: " . \Illuminate\Support\Facades\DB::table('documents')->count() . "\n\n";
foreach ($docs as $doc) {
    echo $doc->id . ' | ' . $doc->name . ' | ' . $doc->status . ' | ' . $doc->created_at . PHP_EOL;
}