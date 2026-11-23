<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Hash;

$password = '$2y$12$mJTW4OVCGbbYmeG6KeaMpuRe0YYReqm5KtGmDvxxSlvsBB0ZBt4W2';

$testPasswords = [
    'password',
    'admin',
    'admin2024',
    'superadmin',
    'superadmin2024',
    'admin123',
    '123456',
    '12345678',
    'password123',
    'Admin2024',
    'SuperAdmin2024',
];

foreach ($testPasswords as $pwd) {
    if (Hash::check($pwd, $password)) {
        echo "FOUND: '$pwd'\n";
        break;
    }
}
echo "Done\n";