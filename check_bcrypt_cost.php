<?php
// Check bcrypt cost in stored password
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$users = DB::select("SELECT id, email, password FROM users WHERE email LIKE '%admin%' OR email LIKE '%civicore%' LIMIT 3");
foreach ($users as $user) {
    $info = password_get_info($user->password);
    echo "Email: " . $user->email . "\n";
    echo "Password hash: " . substr($user->password, 0, 70) . "...\n";
    echo "Algo: " . $info['algo'] . " (0=unknown, 1=bcrypt)\n";
    echo "Cost: " . $info['options']['cost'] . "\n\n";
}

