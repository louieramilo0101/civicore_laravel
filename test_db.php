<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $columns = Illuminate\Support\Facades\Schema::getColumnListing('users');
    print_r($columns);
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
