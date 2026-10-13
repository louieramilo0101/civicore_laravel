<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BackupService;

class ListBackupsCommand extends Command
{
    protected $signature = 'backup:list';
    protected $description = 'List all available CiviCORE backup archives';

    public function handle(BackupService $backupService): int
    {
        $backups = $backupService->listBackups();

        if (empty($backups)) {
            $this->warn("No backup archives found.");
            return Command::SUCCESS;
        }

        $rows = array_map(function ($b) {
            return [
                $b['filename'],
                $b['type_label'],
                $b['size_human'],
                $b['created_at'],
                $b['is_safety'] ? 'Yes' : 'No',
            ];
        }, $backups);

        $this->table(
            ['Filename', 'Type', 'Size', 'Created At', 'Safety Snapshot'],
            $rows
        );

        return Command::SUCCESS;
    }
}
