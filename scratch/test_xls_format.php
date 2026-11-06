<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;

$controller = app(DocumentController::class);

echo "Testing format=xls (HTML styled Excel)..." . PHP_EOL;
$req = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'all',
    'format' => 'xls'
]);

$response = $controller->exportReport($req);
$content = $response->getContent();

echo "Content size: " . strlen($content) . " bytes" . PHP_EOL;
echo "Content-Type: " . $response->headers->get('Content-Type') . PHP_EOL;
echo "Content-Disposition: " . $response->headers->get('Content-Disposition') . PHP_EOL;
echo "Starts with HTML: " . (str_starts_with($content, '<html>') ? 'yes' : 'no') . PHP_EOL;

