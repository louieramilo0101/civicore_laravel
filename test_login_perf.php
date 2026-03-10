<?php
// Test script to measure login response time with invalid credentials

// Test 1: Invalid email (should be fast - early return)
echo "Test 1: Invalid email (no user found)\n";
$startTime = microtime(true);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://127.0.0.1:8000/api/login");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'nonexistent@test.com',
    'password' => 'wrongpass'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$time = microtime(true) - $startTime;
echo "Response: $response\n";
echo "Time: " . number_format($time, 3) . "s\n\n";
curl_close($ch);

// Test 2: Valid email with plain text password - wrong password
echo "Test 2: Valid email (plain text) with wrong password\n";
$startTime2 = microtime(true);
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, "http://127.0.0.1:8000/api/login");
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'dani@gmail.com',
    'password' => 'wrongpassword'
]));
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
$response2 = curl_exec($ch2);
$time2 = microtime(true) - $startTime2;
echo "Response: $response2\n";
echo "Time: " . number_format($time2, 3) . "s\n\n";
curl_close($ch2);

// Test 3: Bcrypt password user with wrong password
echo "Test 3: Valid email (bcrypt) with wrong password\n";
$startTime3 = microtime(true);
$ch3 = curl_init();
curl_setopt($ch3, CURLOPT_URL, "http://127.0.0.1:8000/api/login");
curl_setopt($ch3, CURLOPT_POST, true);
curl_setopt($ch3, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'admin@civicOre.com',
    'password' => 'wrongpassword'
]));
curl_setopt($ch3, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch3, CURLOPT_RETURNTRANSFER, true);
$response3 = curl_exec($ch3);
$time3 = microtime(true) - $startTime3;
echo "Response: $response3\n";
echo "Time: " . number_format($time3, 3) . "s\n\n";
curl_close($ch3);

echo "=== Summary ===\n";
echo "Invalid email: " . number_format($time, 3) . "s (should be fast - early return)\n";
echo "Plain text user wrong password: " . number_format($time2, 3) . "s\n";
echo "Bcrypt user wrong password: " . number_format($time3, 3) . "s (bcrypt is intentionally slow)\n";

