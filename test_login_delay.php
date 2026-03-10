<?php
// Test script to measure login response time with invalid credentials
$startTime = microtime(true);

// Test 1: Invalid email (should be fast - early return)
echo "Test 1: Invalid email (no user found)\n";
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

// Test 2: Valid email, wrong password (tests bcrypt check)
echo "Test 2: Valid email with wrong password\n";
$startTime2 = microtime(true);
$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, "http://127.0.0.1:8000/api/login");
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'admin@naic-registry.com',
    'password' => 'wrongpassword'
]));
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
$response2 = curl_exec($ch2);
$time2 = microtime(true) - $startTime2;
echo "Response: $response2\n";
echo "Time: " . number_format($time2, 3) . "s\n\n";

curl_close($ch);
curl_close($ch2);

echo "=== Summary ===\n";
echo "Invalid email response time: " . number_format($time, 3) . "s (should be fast - early return)\n";
echo "Wrong password response time: " . number_format($time2, 3) . "s (tests bcrypt - may take 100-300ms)\n";

