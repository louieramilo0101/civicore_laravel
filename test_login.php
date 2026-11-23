<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\AuthController;

$request = Request::create('/api/login', 'POST', [
    'email' => 'admin@civicore.test',
    'password' => 'password123',
]);

// Set up session
$session = app('session.store');
$request->setLaravelSession($session);

$controller = new AuthController();
$response = $controller->login($request);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";