<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SupabaseSyncService;

class SyncSupabaseQueue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'civicore:sync-supabase {--daemon : Keep running in an infinite loop polling every 5 seconds}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Pulls unsynced online ticket requests from Supabase into local MySQL and syncs queue status';

    /**
     * Execute the console command.
     */
    public function handle(SupabaseSyncService $syncService): int
    {
        if (!$syncService->isConfigured()) {
            $this->warn('Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_KEY) are not set in .env.');
            return 1;
        }

        $isDaemon = $this->option('daemon');

        $this->info('Starting Supabase Sync Worker for Civicore Localhost...');

        // Push announcements & operating hours on startup
        $syncService->pushPublicConfig();
        $this->info('[' . now()->format('H:i:s') . '] Public portal configuration (announcements, hours) synchronized.');

        $loopCount = 0;
        do {
            $count = $syncService->pullPendingOnlineTickets();
            if ($count > 0) {
                $this->info('[' . now()->format('H:i:s') . "] Pulled and synced {$count} online ticket(s) into local MySQL.");
            }

            // Sync announcements/config every 60 seconds (12 cycles * 5s)
            $loopCount++;
            if ($loopCount >= 12) {
                $syncService->pushPublicConfig();
                $loopCount = 0;
            }

            if ($isDaemon) {
                sleep(5);
            }
        } while ($isDaemon);

        return 0;
    }
}
