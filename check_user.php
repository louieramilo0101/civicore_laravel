<?php
// Check user password format
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$users = DB::select("SELECT id, email, password FROM users LIMIT 5");
foreach ($users as $user) {
    $isBcrypt = preg_match('/^\$2[ayb]\$.{56}$/', $user->password);
    echo "Email: " . $user->email . "\n";
    echo "Password: " . substr($user->password, 0, 60) . "...\n";
    echo "Is bcrypt: " . ($isBcrypt ? 'YES' : 'NO') . "\n\n";
}

