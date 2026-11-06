<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;

$controller = app(DocumentController::class);

echo "Testing XLSX Export..." . PHP_EOL;
$req = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'all',
    'format' => 'excel'
]);

$response = $controller->exportReport($req);
$content = $response->getContent();

echo "Content size: " . strlen($content) . " bytes" . PHP_EOL;
echo "Content-Type: " . $response->headers->get('Content-Type') . PHP_EOL;
echo "Content-Disposition: " . $response->headers->get('Content-Disposition') . PHP_EOL;

// Save to scratch and inspect sheets
$testFile = __DIR__ . '/exported_sample.xlsx';
file_put_contents($testFile, $content);

$reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
$spreadsheet = $reader->load($testFile);

echo "Sheet Names: " . implode(', ', $spreadsheet->getSheetNames()) . PHP_EOL;
foreach ($spreadsheet->getSheetNames() as $name) {
    $sheet = $spreadsheet->getSheetByName($name);
    echo "Sheet [{$name}] Row count: " . $sheet->getHighestRow() . PHP_EOL;
    for ($r = 7; $r <= min(10, $sheet->getHighestRow()); $r++) {
        $reg = $sheet->getCell("A{$r}")->getValue();
        $col2 = $sheet->getCell("B{$r}")->getValue();
        $col4 = $sheet->getCell("D{$r}")->getValue();
        echo "  Row {$r}: [{$reg}] [{$col2}] [{$col4}]" . PHP_EOL;
    }
}
@unlink($testFile);

