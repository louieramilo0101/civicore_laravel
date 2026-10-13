<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;

class RestoreCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'backup:restore {filename : The backup zip filename to restore}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Restore the CiviCORE system from a backup archive (creates a pre-restore safety snapshot first)';

    /**
     * Execute the console command.
     */
    public function handle(BackupService $backupService): int
    {
        $filename = $this->argument('filename');

        if (!$this->confirm("Are you SURE you want to restore from {$filename}? Current data will be replaced! (A pre-restore snapshot will be saved automatically).", false)) {
            $this->warn("Restore cancelled.");
            return Command::SUCCESS;
        }

        $this->info("Restoring CiviCORE from archive: {$filename}...");

        try {
            $result = $backupService->restoreBackup($filename);
            $this->info($result['message']);
            $this->info("Safety snapshot saved as: " . $result['safety_snapshot']);
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Restore failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
