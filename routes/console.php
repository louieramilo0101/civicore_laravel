<?php

use Illuminate\Support\Facades\Schedule;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Automated CiviCORE Backup & Retention Schedules
|--------------------------------------------------------------------------
|
| - Daily: Runs every night at 2:00 AM (kept for 7 days)
| - Weekly: Runs every Sunday at 3:00 AM (kept for 4 weeks)
| - Monthly: Runs on the 1st of every month at 4:00 AM (kept for 6 months)
| - Semi-Annual (6 Months): Runs Jan 1 and Jul 1 at 5:00 AM (kept for 2 years)
| - Pruning: Scans and cleans up expired files daily at 6:00 AM
|
*/

Schedule::command('backup:run --type=daily')->dailyAt('02:00');
Schedule::command('backup:run --type=weekly')->weeklyOn(0, '03:00');
Schedule::command('backup:run --type=monthly')->monthlyOn(1, '04:00');
Schedule::command('backup:run --type=6month')->cron('0 5 1 1,7 *');
Schedule::command('backup:prune')->dailyAt('06:00');
