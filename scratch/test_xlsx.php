<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setTitle('Test');
$sheet->setCellValue('A1', 'Hello XLSX');

$writer = new Xlsx($spreadsheet);
$filePath = __DIR__ . '/test_output.xlsx';
$writer->save($filePath);

echo "File exists: " . (file_exists($filePath) ? 'yes' : 'no') . ", size: " . filesize($filePath) . PHP_EOL;
@unlink($filePath);

