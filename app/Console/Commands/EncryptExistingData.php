<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class EncryptExistingData extends Command
{
    protected $signature = 'encrypt:existing-data 
        {--table= : Specific table to encrypt (documents, issuances, tickets)}
        {--chunk=500 : Number of records per chunk}
        {--dry-run : Show what would be encrypted without making changes}
        {--force : Skip confirmation}';

    protected $description = 'Encrypt existing sensitive columns using Laravel Crypt';

    protected array $tables = [
        'documents' => [
            'columns' => ['extracted_data', 'extracted_fields'],
            'id_column' => 'id',
        ],
        'issuances' => [
            'columns' => ['extracted_data'],
            'id_column' => 'id',
        ],
        'tickets' => [
            'columns' => ['details'],
            'id_column' => 'id',
        ],
    ];

    public function handle(): int
    {
        $targetTable = $this->option('table');
        $chunkSize = (int) $this->option('chunk');
        $dryRun = $this->option('dry-run');
        $force = $this->option('force');

        if ($targetTable && !isset($this->tables[$targetTable])) {
            $this->error("Unknown table: {$targetTable}. Available: " . implode(', ', array_keys($this->tables)));
            return 1;
        }

        $tablesToProcess = $targetTable ? [$targetTable => $this->tables[$targetTable]] : $this->tables;

        if (!$force && !$dryRun) {
            if (!$this->confirm('This will encrypt sensitive data in the database. Ensure you have a backup. Continue?')) {
                $this->info('Cancelled.');
                return 0;
            }
        }

        $this->info('Starting encryption migration...');
        $this->info('Chunk size: ' . $chunkSize);
        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be made');
        }

        foreach ($tablesToProcess as $table => $config) {
            $this->processTable($table, $config, $chunkSize, $dryRun);
        }

        $this->info('Encryption migration complete!');
        return 0;
    }

    protected function processTable(string $table, array $config, int $chunkSize, bool $dryRun): void
    {
        $columns = $config['columns'];
        $idColumn = $config['id_column'];

        $this->info("\nProcessing table: {$table}");
        $this->info('Columns to encrypt: ' . implode(', ', $columns));

        // Get total count (including soft-deleted)
        $total = DB::table($table)->count();
        $this->info("Total records: {$total}");

        if ($total === 0) {
            $this->info('No records to process.');
            return;
        }

        $processed = 0;
        $encrypted = 0;
        $skipped = 0;
        $errors = 0;

        $progressBar = $this->output->createProgressBar($total);
        $progressBar->start();

        // Process in chunks
        DB::table($table)->orderBy($idColumn)->chunkById($chunkSize, function ($records) use (
            $table, $columns, $idColumn, $dryRun, &$processed, &$encrypted, &$skipped, &$errors, $progressBar
        ) {
            foreach ($records as $record) {
                $updates = [];
                $hasChanges = false;

                foreach ($columns as $column) {
                    $value = $record->$column ?? null;

                    if ($value === null) {
                        $skipped++;
                        continue;
                    }

                    // Check if already encrypted (Laravel encrypted cast adds "eyJ" prefix for base64)
                    if (is_string($value) && $this->looksEncrypted($value)) {
                        $skipped++;
                        continue;
                    }

                    try {
                        $encryptedValue = Crypt::encrypt($value);
                        $updates[$column] = $encryptedValue;
                        $hasChanges = true;
                    } catch (\Throwable $e) {
                        $errors++;
                        $this->error("\nError encrypting {$table}.{$column} for id {$record->$idColumn}: " . $e->getMessage());
                    }
                }

                if ($hasChanges && !$dryRun) {
                    DB::table($table)->where($idColumn, $record->$idColumn)->update($updates);
                    $encrypted++;
                } elseif ($hasChanges && $dryRun) {
                    $encrypted++; // Count as would-be-encrypted
                }

                $processed++;
                $progressBar->advance();
            }

            return true;
        });

        $progressBar->finish();
        $this->newLine();
        $this->info("Table {$table}: processed={$processed}, encrypted={$encrypted}, skipped={$skipped}, errors={$errors}");
    }

    protected function looksEncrypted(string $value): bool
    {
        // Laravel's Crypt::encrypt() produces base64-encoded JSON with specific structure:
        // {"iv":"...","value":"...","mac":"...","tag":"..."}
        // When base64 decoded, it starts with eyJ (base64 of {" )
        if (strlen($value) < 50) return false;
        
        $decoded = @base64_decode($value, true);
        if ($decoded === false) return false;
        
        // Check if it's a JSON object with iv, value, mac/tag fields
        if (str_starts_with($decoded, '{"iv"') || str_starts_with($decoded, '{"value"')) {
            return true;
        }
        
        return false;
    }
}