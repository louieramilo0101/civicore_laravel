<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$docs = DB::table('documents')->where('status','failed')->whereNotNull('file_path')->limit(5)->get();
foreach ($docs as $d) {
    echo $d->id . ' | ' . $d->name . ' | ' . $d->file_path . PHP_EOL;
}