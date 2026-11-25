<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ExpireTickets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'civicore:expire-tickets';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire overdue pending tickets and log upcoming scheduled tickets';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting ticket expiration check...');

        // 1. Expire overdue pending tickets (past their expires_at)
        $expiredCount = Ticket::where('request_status', 'pending')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now())
            ->update([
                'request_status' => 'expired',
                'queue_status' => 'not_in_lobby',
            ]);

        if ($expiredCount > 0) {
            $this->info("Expired {$expiredCount} overdue ticket(s).");
            Log::info("Auto-expired {$expiredCount} overdue ticket(s) via civicore:expire-tickets");
        } else {
            $this->info('No overdue tickets to expire.');
        }

        // 2. Log tickets scheduled for tomorrow (for staff awareness)
        $tomorrow = Carbon::tomorrow(config('app.timezone'))->startOfDay();
        $tomorrowCount = Ticket::where('request_status', 'pending')
            ->whereDate('scheduled_date', $tomorrow)
            ->count();

        if ($tomorrowCount > 0) {
            $this->info("Found {$tomorrowCount} ticket(s) scheduled for tomorrow ({$tomorrow->format('M j, Y')}).");
            Log::info("Scheduled tickets for tomorrow: {$tomorrowCount} ticket(s) on {$tomorrow->format('Y-m-d')}");
        }

        // 3. Also expire walk-in tickets in lobby queue that are past 5 PM today
        $walkInExpired = Ticket::where('source', 'walk_in')
            ->whereIn('queue_status', ['waiting', 'serving'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now())
            ->update([
                'request_status' => 'expired',
                'queue_status' => 'not_in_lobby',
            ]);

        if ($walkInExpired > 0) {
            $this->info("Expired {$walkInExpired} walk-in ticket(s) in lobby queue.");
            Log::info("Auto-expired {$walkInExpired} walk-in ticket(s) in lobby queue via civicore:expire-tickets");
        }

        $this->info('Ticket expiration check completed.');
        return Command::SUCCESS;
    }
}