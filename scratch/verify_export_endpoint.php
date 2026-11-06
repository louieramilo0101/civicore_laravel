<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;

$controller = app(DocumentController::class);

echo "=== TESTING BIRTH EXPORT ===" . PHP_EOL;
$reqBirth = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'birth',
    'format' => 'csv'
]);
$resBirth = $controller->exportReport($reqBirth);
echo "Birth response type: " . get_class($resBirth) . PHP_EOL;

echo PHP_EOL . "=== TESTING DEATH EXPORT ===" . PHP_EOL;
$reqDeath = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'death',
    'format' => 'csv'
]);
$resDeath = $controller->exportReport($reqDeath);
echo "Death response type: " . get_class($resDeath) . PHP_EOL;

echo PHP_EOL . "=== TESTING MARRIAGE EXPORT ===" . PHP_EOL;
$reqMarriage = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'marriage',
    'format' => 'csv'
]);
$resMarriage = $controller->exportReport($reqMarriage);
echo "Marriage response type: " . get_class($resMarriage) . PHP_EOL;

echo PHP_EOL . "=== TESTING ALL EXPORT ===" . PHP_EOL;
$reqAll = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'all',
    'format' => 'csv'
]);
$resAll = $controller->exportReport($reqAll);
echo "All response type: " . get_class($resAll) . PHP_EOL;

