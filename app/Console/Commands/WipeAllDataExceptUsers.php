<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;

class WipeAllDataExceptUsers extends Command
{
    protected $signature = 'data:wipe-except-users 
                            {--force : Skip confirmation prompt}
                            {--keep-settings : Keep settings and barangays (default)}
                            {--keep-files : Keep uploaded files in storage}';

    protected $description = 'Wipe all application data except user accounts. Optionally keep settings/barangays and files.';

    public function handle(): int
    {
        $this->warn('⚠️  This will PERMANENTLY DELETE all data except users!');
        $this->warn('Tables to be wiped:');
        $this->line('  - documents');
        $this->line('  - issuances');
        $this->line('  - tickets');
        $this->line('  - activity_logs');
        $this->line('  - document_history_logs');
        $this->line('  - document_ocr_pages');
        $this->line('  - template_profiles');
        $this->line('  - verification_codes');
        $this->line('  - announcements');
        $this->line('  - jobs');
        $this->line('  - cache');
        $this->line('  - sessions');

        if ($this->option('keep-settings')) {
            $this->info('Keeping: settings, barangays (reference data)');
        }

        if ($this->option('keep-files')) {
            $this->info('Keeping: uploaded files in storage');
        }

        if (!$this->option('force')) {
            if (!$this->confirm('Are you absolutely sure you want to continue?')) {
                $this->info('Cancelled.');
                return Command::FAILURE;
            }
        }

        $this->info('Starting data wipe...');

        try {
            DB::beginTransaction();

            // Disable foreign key checks (SQLite compatible)
            DB::statement('PRAGMA foreign_keys = OFF');

            // Tables to truncate (in dependency order)
            $tablesToTruncate = [
                'document_history_logs',
                'document_ocr_pages',
                'activity_logs',
                'tickets',
                'issuances',
                'documents',
                'template_profiles',
                'verification_codes',
                'announcements',
                'jobs',
                'cache',
                'sessions',
            ];

            foreach ($tablesToTruncate as $table) {
                if (DB::getSchemaBuilder()->hasTable($table)) {
                    DB::table($table)->truncate();
                    $this->line("  ✓ Truncated: {$table}");
                }
            }

            // Re-enable foreign key checks
            DB::statement('PRAGMA foreign_keys = ON');

            // Clear storage files unless --keep-files
            if (!$this->option('keep-files')) {
                $this->clearStorageFiles();
            }

            // Clear all caches
            Cache::flush();
            $this->line('  ✓ Flushed all caches');

            DB::commit();
            $this->info('✅ Data wipe completed successfully!');
            $this->info('User accounts, settings, and barangays preserved.');

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            DB::statement('PRAGMA foreign_keys = ON');
            $this->error('❌ Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    private function clearStorageFiles(): void
    {
        $directories = [
            'documents',
            'issuances',
            'tickets',
            'ocr',
            'templates',
        ];

        foreach ($directories as $dir) {
            if (Storage::disk('local')->exists($dir)) {
                Storage::disk('local')->deleteDirectory($dir);
                $this->line("  ✓ Cleared storage: private/{$dir}");
            }
        }
    }
}