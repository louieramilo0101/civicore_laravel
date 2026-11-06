<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;

$controller = app(DocumentController::class);

echo "--- EXCEL EXPORT SAMPLE ---" . PHP_EOL;
$reqExcel = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'all',
    'format' => 'excel'
]);
$resExcel = $controller->exportReport($reqExcel);
$content = $resExcel->getContent();

// Extract table parts
preg_match_all('/<h2>(.*?)<\/h2>.*?<tbody>(.*?)<\/tbody>/s', $content, $matches, PREG_SET_ORDER);
foreach ($matches as $m) {
    echo "SECTION: " . $m[1] . PHP_EOL;
    // strip tags for first few rows
    $rows = explode('</tr>', $m[2]);
    foreach (array_slice($rows, 0, 3) as $r) {
        $clean = trim(strip_tags(str_replace('</td>', ' | ', $r)));
        if (!empty($clean)) echo "  -> " . $clean . PHP_EOL;
    }
}

