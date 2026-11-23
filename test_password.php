<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\Hash;

$password = '$2y$12$mJTW4OVCGbbYmeG6KeaMpuRe0YYReqm5KtGmDvxxSlvsBB0ZBt4W2';
echo "Testing password 'password': ";
var_dump(Hash::check('password', $password));

echo "Testing password 'admin': ";
var_dump(Hash::check('admin', $password));

echo "Testing password 'admin123': ";
var_dump(Hash::check('admin123', $password));

echo "Testing password 'superadmin': ";
var_dump(Hash::check('superadmin', $password));