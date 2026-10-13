<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;

class PruneBackupsCommand extends Command
{
    protected $signature = 'backup:prune';
    protected $description = 'Prune old expired CiviCORE backups based on retention policy';

    public function handle(BackupService $backupService): int
    {
        $this->info("Scanning for expired backups according to retention policies...");
        $deleted = $backupService->pruneOldBackups();

        if (empty($deleted)) {
            $this->info("No expired backups to prune.");
        } else {
            $this->info("Pruned " . count($deleted) . " expired backup archives:");
            foreach ($deleted as $f) {
                $this->line(" - {$f}");
            }
        }

        return Command::SUCCESS;
    }
}
