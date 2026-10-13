<?php

namespace App\Services;

use ZipArchive;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;
use Carbon\Carbon;

/**
 * Service to manage automated & on-demand system backups,
 * compressed archive creation, retention pruning, and point-in-time recovery.
 */
class BackupService
{
    /** Path to private backups directory (outside web root). */
    protected string $backupPath;

    public function __construct()
    {
        $this->backupPath = storage_path('app/backups');
        if (!File::isDirectory($this->backupPath)) {
            File::makeDirectory($this->backupPath, 0700, true);
        }
    }

    /**
     * Creates a compressed backup archive containing the database and uploaded attachments.
     *
     * @param string $type daily|weekly|monthly|6month|manual|pre_restore
     * @return array
     */
    public function createBackup(string $type = 'manual'): array
    {
        $timestamp = Carbon::now('Asia/Manila')->format('Ymd_His');
        $fileName  = "civicore_{$type}_{$timestamp}.zip";
        $zipPath   = "{$this->backupPath}/{$fileName}";

        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException("Unable to create backup zip file at {$zipPath}");
        }

        $connection = config('database.default');
        $dbDumpName = '';

        if ($connection === 'sqlite') {
            $dbPath = config('database.connections.sqlite.database');
            if (File::exists($dbPath)) {
                // If WAL journal exists, checkpoint it
                try {
                    DB::statement('PRAGMA wal_checkpoint(FULL);');
                } catch (\Throwable $e) {}

                $zip->addFile($dbPath, 'database.sqlite');
                $dbDumpName = 'database.sqlite';
            }
        } elseif ($connection === 'mysql') {
            $tempSqlFile = storage_path("app/backups/temp_dump_{$timestamp}.sql");
            $this->dumpMysqlDatabase($tempSqlFile);
            if (File::exists($tempSqlFile)) {
                $zip->addFile($tempSqlFile, 'database.sql');
                $dbDumpName = 'database.sql';
            }
        }

        // Add physical storage files from storage/app/public
        $publicStorage = storage_path('app/public');
        $fileCount = 0;
        if (File::isDirectory($publicStorage)) {
            $files = File::allFiles($publicStorage);
            foreach ($files as $file) {
                $relativePath = 'files/' . str_replace('\\', '/', $file->getRelativePathname());
                $zip->addFile($file->getRealPath(), $relativePath);
                $fileCount++;
            }
        }

        // Add manifest metadata
        $manifest = [
            'app'           => config('app.name', 'CiviCORE'),
            'backup_type'   => $type,
            'created_at'    => Carbon::now('Asia/Manila')->toIso8601String(),
            'db_connection' => $connection,
            'db_dump'       => $dbDumpName,
            'files_count'   => $fileCount,
            'encrypted'     => false,
            'checksum'      => md5($timestamp),
        ];
        $zip->addFromString('manifest.json', json_encode($manifest, JSON_PRETTY_PRINT));
        $zip->close();

        // Clean up temp SQL file if generated
        if (isset($tempSqlFile) && File::exists($tempSqlFile)) {
            File::delete($tempSqlFile);
        }

        // Auto-prune old backups after creation (except pre_restore)
        if ($type !== 'pre_restore') {
            $this->pruneOldBackups();
        }

        $size = File::size($zipPath);

        Log::info("CiviCORE backup created successfully: {$fileName} ({$size} bytes)");

        return [
            'filename'   => $fileName,
            'type'       => $type,
            'size'       => $size,
            'size_human' => $this->formatBytes($size),
            'files_count'=> $fileCount,
            'created_at' => Carbon::now('Asia/Manila')->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * List all existing backups ordered by creation date descending.
     *
     * @return array
     */
    public function listBackups(): array
    {
        if (!File::isDirectory($this->backupPath)) {
            return [];
        }

        $files = File::files($this->backupPath);
        $backups = [];

        foreach ($files as $file) {
            $name = $file->getFilename();
            if (pathinfo($name, PATHINFO_EXTENSION) !== 'zip') {
                continue;
            }

            // Parse filename format: civicore_{type}_{Ymd_His}.zip
            $type = 'manual';
            if (preg_match('/^civicore_([a-z0-9_]+?)_(\d{8}_\d{6})\.zip$/', $name, $matches)) {
                $type = $matches[1];
                $dateString = $matches[2];
                try {
                    $createdAt = Carbon::createFromFormat('Ymd_His', $dateString, 'Asia/Manila')->format('Y-m-d H:i:s');
                } catch (\Throwable $e) {
                    $createdAt = Carbon::createFromTimestamp($file->getMTime(), 'Asia/Manila')->format('Y-m-d H:i:s');
                }
            } else {
                $createdAt = Carbon::createFromTimestamp($file->getMTime(), 'Asia/Manila')->format('Y-m-d H:i:s');
            }

            $size = $file->getSize();

            $backups[] = [
                'filename'    => $name,
                'type'        => $type,
                'type_label'  => $this->getTypeLabel($type),
                'size'        => $size,
                'size_human'  => $this->formatBytes($size),
                'created_at'  => $createdAt,
                'is_safety'   => $type === 'pre_restore',
            ];
        }

        // Sort newest first
        usort($backups, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return $backups;
    }

    /**
     * Restores the system state from a designated backup archive.
     * Automatically creates a safety snapshot before modifying any files.
     *
     * @param string $filename
     * @return array
     */
    public function restoreBackup(string $filename): array
    {
        $targetZip = "{$this->backupPath}/{$filename}";
        if (!File::exists($targetZip)) {
            throw new \InvalidArgumentException("Backup archive not found: {$filename}");
        }

        // 1. Create immediate Pre-Restore Safety Snapshot of current state
        $safetySnapshot = $this->createBackup('pre_restore');

        // 2. Extract backup zip to a temporary folder
        $tempExtractDir = storage_path("app/backups/restore_temp_" . uniqid());
        File::makeDirectory($tempExtractDir, 0700, true);

        $zip = new ZipArchive();
        if ($zip->open($targetZip) !== true) {
            File::deleteDirectory($tempExtractDir);
            throw new \RuntimeException("Failed to open backup archive: {$filename}");
        }

        $zip->extractTo($tempExtractDir);
        $zip->close();

        try {
            $connection = config('database.default');

            // 3. Restore Database
            if ($connection === 'sqlite') {
                $sqliteDump = "{$tempExtractDir}/database.sqlite";
                if (File::exists($sqliteDump)) {
                    $targetDb = config('database.connections.sqlite.database');
                    // Disconnect current PDO connections
                    DB::purge('sqlite');
                    File::copy($sqliteDump, $targetDb);
                    DB::reconnect('sqlite');
                }
            } elseif ($connection === 'mysql') {
                $sqlDump = "{$tempExtractDir}/database.sql";
                if (File::exists($sqlDump)) {
                    $sqlContent = File::get($sqlDump);
                    DB::unprepared($sqlContent);
                }
            }

            // 4. Restore uploaded storage files
            $extractedFilesDir = "{$tempExtractDir}/files";
            if (File::isDirectory($extractedFilesDir)) {
                $publicStorage = storage_path('app/public');
                File::copyDirectory($extractedFilesDir, $publicStorage);
            }

            Log::warning("CiviCORE restored from backup {$filename}. Safety snapshot created: {$safetySnapshot['filename']}");

            return [
                'success'         => true,
                'restored_file'   => $filename,
                'safety_snapshot' => $safetySnapshot['filename'],
                'message'         => "System successfully restored from {$filename}. An automatic safety copy ({$safetySnapshot['filename']}) was saved first.",
            ];
        } finally {
            // 5. Always clean up temporary directory
            File::deleteDirectory($tempExtractDir);
        }
    }

    /**
     * Prune expired backups according to retention policies.
     *
     * @return array
     */
    public function pruneOldBackups(): array
    {
        $backups = $this->listBackups();
        $now = Carbon::now('Asia/Manila');
        $deleted = [];

        $preRestoreCount = 0;
        $manualCount     = 0;

        foreach ($backups as $backup) {
            $filePath = "{$this->backupPath}/{$backup['filename']}";
            if (!File::exists($filePath)) continue;

            $created = Carbon::parse($backup['created_at'], 'Asia/Manila');
            $ageDays = $now->diffInDays($created);
            $type    = $backup['type'];
            $shouldDelete = false;

            if ($type === 'daily' && $ageDays > 7) {
                $shouldDelete = true;
            } elseif ($type === 'weekly' && $ageDays > 28) {
                $shouldDelete = true;
            } elseif ($type === 'monthly' && $ageDays > 180) {
                $shouldDelete = true;
            } elseif ($type === '6month' && $ageDays > 730) {
                $shouldDelete = true;
            } elseif ($type === 'pre_restore') {
                $preRestoreCount++;
                if ($preRestoreCount > 5) {
                    $shouldDelete = true;
                }
            } elseif ($type === 'manual') {
                $manualCount++;
                if ($manualCount > 10) {
                    $shouldDelete = true;
                }
            }

            if ($shouldDelete) {
                File::delete($filePath);
                $deleted[] = $backup['filename'];
            }
        }

        if (!empty($deleted)) {
            Log::info("Pruned expired backups: " . implode(', ', $deleted));
        }

        return $deleted;
    }

    /**
     * Dumps MySQL database using mysqldump or PHP PDO fallback.
     */
    protected function dumpMysqlDatabase(string $outputPath): void
    {
        $host     = config('database.connections.mysql.host', '127.0.0.1');
        $port     = config('database.connections.mysql.port', '3306');
        $database = config('database.connections.mysql.database');
        $username = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');

        // Check if mysqldump command is available
        $mysqldump = 'mysqldump';
        if (File::exists('C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysqldump.exe')) {
            $mysqldump = 'C:/laragon/bin/mysql/mysql-8.0.30-winx64/bin/mysqldump.exe';
        }

        $passwordParam = $password ? "--password=\"" . addcslashes($password, '"') . "\"" : '';
        $cmd = "\"{$mysqldump}\" --host={$host} --port={$port} --user={$username} {$passwordParam} {$database} --single-transaction --quick > \"{$outputPath}\" 2>&1";

        @exec($cmd, $output, $returnVar);

        if ($returnVar !== 0 || !File::exists($outputPath) || File::size($outputPath) === 0) {
            // Fallback: Generate SQL dump via PDO
            $this->dumpMysqlViaPdo($outputPath);
        }
    }

    /**
     * Native PHP PDO MySQL dumper fallback if mysqldump binary is not in PATH.
     */
    protected function dumpMysqlViaPdo(string $outputPath): void
    {
        $handle = fopen($outputPath, 'w');
        if (!$handle) return;

        fwrite($handle, "-- CiviCORE MySQL Database Dump\n-- Generated: " . Carbon::now()->toDateTimeString() . "\n\nSET FOREIGN_KEY_CHECKS=0;\n\n");

        $tables = DB::select('SHOW TABLES');
        $dbName = config('database.connections.mysql.database');
        $keyName = "Tables_in_{$dbName}";

        foreach ($tables as $tableRow) {
            $table = $tableRow->$keyName ?? array_values((array)$tableRow)[0];

            // Create table DDL
            $createRes = DB::select("SHOW CREATE TABLE `{$table}`");
            if (!empty($createRes)) {
                $ddl = $createRes[0]->{'Create Table'} ?? '';
                fwrite($handle, "DROP TABLE IF EXISTS `{$table}`;\n{$ddl};\n\n");
            }

            // Insert rows
            $rows = DB::table($table)->get();
            foreach ($rows as $row) {
                $rowArray = (array) $row;
                $cols = array_map(fn($col) => "`{$col}`", array_keys($rowArray));
                $vals = array_map(function ($val) {
                    if (is_null($val)) return 'NULL';
                    return "'" . addslashes((string) $val) . "'";
                }, array_values($rowArray));

                fwrite($handle, "INSERT INTO `{$table}` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ");\n");
            }
            fwrite($handle, "\n");
        }

        fwrite($handle, "SET FOREIGN_KEY_CHECKS=1;\n");
        fclose($handle);
    }

    /**
     * User-friendly label for backup types.
     */
    protected function getTypeLabel(string $type): string
    {
        return match ($type) {
            'daily'       => 'Daily Backup',
            'weekly'      => 'Weekly Backup',
            'monthly'     => 'Monthly Backup',
            '6month'      => '6-Month Backup',
            'pre_restore' => 'Automatic Safety Copy',
            default       => 'Manual Backup',
        };
    }

    /**
     * Converts raw bytes to human-readable format.
     */
    protected function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }
}
