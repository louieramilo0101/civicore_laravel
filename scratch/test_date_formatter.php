<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function formatReportDate($dateStr) {
    if (empty($dateStr) || $dateStr === 'N/A') return 'N/A';
    try {
        $ts = strtotime($dateStr);
        if ($ts && $ts > 0 && date('Y', $ts) > 1900) {
            return date('M d, Y', $ts); // e.g. "Jan 01, 2001", "Feb 05, 2012"
        }
        $c = \Carbon\Carbon::parse($dateStr);
        return $c->format('M d, Y');
    } catch (\Throwable $e) {
        return $dateStr;
    }
}

$testDates = [
    '2001-01-01',
    '1-Jan-01',
    '11/4/2026',
    '17 JANUARY 2026',
    '2012-02-05',
    'February 05, 2012',
    '1966-07-16',
    'July 16, 1966',
    '1999-02-24',
    'N/A',
    ''
];

foreach ($testDates as $td) {
    echo "$td  -->  " . formatReportDate($td) . PHP_EOL;
}

