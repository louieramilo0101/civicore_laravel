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
| - Compress Old Backups: Runs daily at 3:00 AM to compress backups older than 3 days
| - Boot-time: Can also be triggered via Windows Task Scheduler (At startup) or cron @reboot
|
*/

Schedule::command('backup:run --type=daily')->dailyAt('02:00');
Schedule::command('backup:run --type=weekly')->weeklyOn(0, '03:00');
Schedule::command('backup:run --type=monthly')->monthlyOn(1, '04:00');
Schedule::command('backup:run --type=6month')->cron('0 5 1 1,7 *');
Schedule::command('backup:prune')->dailyAt('06:00');
// Run compression daily via OS startup (Windows Task Scheduler / cron @reboot) instead of fixed time
// since the office computer may be off at night. The command can be triggered on boot:
//   Windows: Task Scheduler → "At startup" → php artisan backup:compress-old --older-than=3
//   Linux:   cron @reboot /path/to/artisan backup:compress-old --older-than=3
Schedule::command('backup:compress-old --older-than=3')->dailyAt('03:00');
