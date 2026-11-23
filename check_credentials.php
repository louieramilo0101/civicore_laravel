<?php
require 'vendor/autoload.php';
require 'bootstrap/app.php';

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::where('email', 'admin@civicore.gov.ph')->first();

if ($user) {
    echo "User found: " . $user->email . "\n";
    echo "Role: " . $user->role . "\n";
    echo "Is active: " . ($user->is_active ? 'Yes' : 'No') . "\n";
    echo "Password hash: " . $user->password . "\n";
    
    $password = 'admin123';
    $check = Hash::check($password, $user->password);
    echo "Password check: " . ($check ? 'MATCH' : 'FAIL') . "\n";
} else {
    echo "User not found\n";
}