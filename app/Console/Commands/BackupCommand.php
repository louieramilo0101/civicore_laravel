<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;

class BackupCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'backup:run 
                            {--type=manual : Backup type: daily, weekly, monthly, 6month, manual}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a compressed CiviCORE backup (database + physical storage attachments)';

    /**
     * Execute the console command.
     */
    public function handle(BackupService $backupService): int
    {
        $type = $this->option('type') ?: 'manual';
        $this->info("Starting CiviCORE [{$type}] backup process...");

        try {
            $result = $backupService->createBackup($type);

            $this->info("Backup completed successfully!");
            $this->table(
                ['File Name', 'Type', 'Size', 'Files Included', 'Created At'],
                [[
                    $result['filename'],
                    $result['type'],
                    $result['size_human'],
                    $result['files_count'],
                    $result['created_at'],
                ]]
            );
            return Command::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Backup failed: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
