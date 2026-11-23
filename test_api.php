<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\BackupController;
use App\Models\User;
use Illuminate\Session\Store;
use Illuminate\Session\Middleware\StartSession;

$user = User::find(1);
echo "User: {$user->email}, Role: {$user->role}\n";

// Create a mock request with session
$request = Request::create('/api/backups', 'GET');

// Set up session
$session = app('session.store');
$request->setLaravelSession($session);
$session->put('user_id', 1);

$controller = new BackupController(app(App\Services\BackupService::class));
$response = $controller->index($request);

echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";