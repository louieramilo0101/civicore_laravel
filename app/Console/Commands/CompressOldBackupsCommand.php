<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;
use Illuminate\Support\Facades\Log;

class CompressOldBackupsCommand extends Command
{
    
    protected $signature = 
        'backup:compress-old
        {--older-than=7 : Number of days older than which to compress backups}
        {--force : Force compression even if no old backups found}';

    protected $description = 
        'Compress old backups into monthly tar.gz archives for cold storage.';

    public function handle(BackupService $backupService): int
    {
        $olderThanDays = $this->option('older-than');
        $force = $this->option('force');

        $this->info("Starting backup compression process...");
        $this->info("Compressing backups older than {$olderThanDays} days...");

        try {
            $archived = $backupService->compressOldBackups($olderThanDays);

            if (empty($archived)) {
                if ($force) {
                    $this->warn("No backups found older than {$olderThanDays} days. Skipping.");
                } else {
                    $this->info("No backups found older than {$olderThanDays} days. No compression needed.");
                    return Command::SUCCESS;
                }
            }

            foreach ($archived as $archive) {
                $this->info("Created archive: {$archive['archive']}");
                $count = count($archive['files']);
                $this->info("Compressed {$count} backups into archive");
                $this->line("Files: " . implode(", ", array_map(fn($f) => $f['filename'], $archive['files'])));
            }

            $this->info("Backup compression completed successfully!");
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            Log::error("Backup compression failed: " . $e->getMessage());
            $this->error("Backup compression failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }

}