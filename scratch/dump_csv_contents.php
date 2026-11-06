<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;

$controller = app(DocumentController::class);

echo "--- DEATH CSV OUTPUT ---" . PHP_EOL;
$reqDeath = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'death',
    'format' => 'csv'
]);
$resDeath = $controller->exportReport($reqDeath);
echo $resDeath->getContent() . PHP_EOL;

echo "--- MARRIAGE CSV OUTPUT ---" . PHP_EOL;
$reqMarriage = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'marriage',
    'format' => 'csv'
]);
$resMarriage = $controller->exportReport($reqMarriage);
echo $resMarriage->getContent() . PHP_EOL;

echo "--- BIRTH CSV OUTPUT ---" . PHP_EOL;
$reqBirth = Request::create('/api/documents/export', 'GET', [
    'source' => 'internal',
    'type' => 'birth',
    'format' => 'csv'
]);
$resBirth = $controller->exportReport($reqBirth);
echo $resBirth->getContent() . PHP_EOL;

