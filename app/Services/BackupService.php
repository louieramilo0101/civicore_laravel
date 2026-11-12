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

    /** Backup encryption key from env (base64-encoded 32 bytes) */
    protected ?string $encryptionKey = null;

    public function __construct()
    {
        $this->backupPath = storage_path('app/backups');
        if (!File::isDirectory($this->backupPath)) {
            File::makeDirectory($this->backupPath, 0700, true);
        }

        $key = env('BACKUP_ENCRYPTION_KEY');
        if ($key) {
            $this->encryptionKey = base64_decode($key);
            if (strlen($this->encryptionKey) !== 32) {
                Log::warning('BACKUP_ENCRYPTION_KEY must be 32 bytes (base64-encoded). Encryption disabled.');
                $this->encryptionKey = null;
            }
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
        // Exclude cache, logs, and temp files to save space
        $publicStorage = storage_path('app/public');
        $fileCount = 0;
        $excludePatterns = [
            '#cache#',
            '#logs#',
            '#tmp#',
            '#temp#',
            '#log$#',
            '#tmp$#',
            '#cache$#',
        ];
        
        if (File::isDirectory($publicStorage)) {
            $files = File::allFiles($publicStorage);
            foreach ($files as $file) {
                $relativePath = 'files/' . str_replace('\\', '/', $file->getRelativePathname());
                
                // Check if file should be excluded
                $shouldExclude = false;
                foreach ($excludePatterns as $pattern) {
                    if (preg_match($pattern, $relativePath)) {
                        $shouldExclude = true;
                        break;
                    }
                }
                
                if (!$shouldExclude) {
                    $zip->addFile($file->getRealPath(), $relativePath);
                    $fileCount++;
                }
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

        // Encrypt the backup if key is available
        $encrypted = false;
        $encryptedPath = $zipPath;
        if ($this->encryptionKey) {
            $encryptedPath = $this->encryptBackup($zipPath);
            if ($encryptedPath !== $zipPath) {
                $encrypted = true;
                File::delete($zipPath); // Remove unencrypted version
                $fileName = basename($encryptedPath);
            }
        }

        // Auto-prune old backups after creation (except pre_restore)
        if ($type !== 'pre_restore') {
            $this->pruneOldBackups();
            $this->compressOldBackups();
        }

        $size = File::size($encryptedPath);

        Log::info("CiviCORE backup created successfully: {$fileName} ({$size} bytes)" . ($encrypted ? ' [ENCRYPTED]' : ''));

        return [
            'filename'   => $fileName,
            'type'       => $type,
            'size'       => $size,
            'size_human' => $this->formatBytes($size),
            'files_count'=> $fileCount,
            'created_at' => Carbon::now('Asia/Manila')->format('Y-m-d H:i:s'),
            'encrypted'  => $encrypted,
        ];
    }

    /**
     * Encrypt a backup zip file using AES-256-GCM.
     *
     * @param string $zipPath
     * @return string Path to encrypted file
     */
    protected function encryptBackup(string $zipPath): string
    {
        $encryptedPath = $zipPath . '.enc';
        $iv = random_bytes(16); // 128-bit IV for GCM

        $plaintext = File::get($zipPath);
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($ciphertext === false) {
            throw new \RuntimeException('Failed to encrypt backup: ' . openssl_error_string());
        }

        // Store: IV (16 bytes) + tag (16 bytes) + ciphertext
        $encryptedData = $iv . $tag . $ciphertext;
        File::put($encryptedPath, $encryptedData);

        return $encryptedPath;
    }

    /**
     * Decrypt an encrypted backup file.
     *
     * @param string $encryptedPath
     * @return string Path to decrypted zip file
     */
    protected function decryptBackup(string $encryptedPath): string
    {
        if (!$this->encryptionKey) {
            throw new \RuntimeException('Cannot decrypt backup: BACKUP_ENCRYPTION_KEY not configured');
        }

        $data = File::get($encryptedPath);
        
        if (strlen($data) < 32) {
            throw new \RuntimeException('Invalid encrypted backup file: too short');
        }

        $iv = substr($data, 0, 16);
        $tag = substr($data, 16, 16);
        $ciphertext = substr($data, 32);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $this->encryptionKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            throw new \RuntimeException('Failed to decrypt backup: wrong key or corrupted data');
        }

        $decryptedPath = $encryptedPath . '.decrypted.zip';
        File::put($decryptedPath, $plaintext);

        return $decryptedPath;
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
        $processed = [];

        foreach ($files as $file) {
            $name = $file->getFilename();
            $isEncrypted = false;
            $baseName = $name;

            // Handle both .zip and .enc files
            if (str_ends_with($name, '.enc')) {
                $isEncrypted = true;
                $baseName = substr($name, 0, -4); // Remove .enc
            } elseif (!str_ends_with($name, '.zip')) {
                continue;
            }

            // Skip if we already processed the base name (e.g., both .zip and .enc exist)
            if (isset($processed[$baseName])) {
                continue;
            }
            $processed[$baseName] = true;

            // Parse filename format: civicore_{type}_{Ymd_His}.zip
            $type = 'manual';
            if (preg_match('/^civicore_([a-z0-9_]+?)_(\d{8}_\d{6})\.zip$/', $baseName, $matches)) {
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
                'encrypted'   => $isEncrypted,
                'confirmation_token' => $this->generateConfirmationToken($baseName),
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
        // Handle .tar.gz archived backups first
        if (str_ends_with($filename, '.tar.gz')) {
            return $this->restoreFromArchive($filename);
        }

        // Handle both .zip and .enc filenames from user input
        $targetFile = "{$this->backupPath}/{$filename}";
        
        // If file doesn't exist as-is, try common variants
        if (!File::exists($targetFile)) {
            // User gave .zip but we have .enc (encrypted backup)
            if (str_ends_with($filename, '.zip') && File::exists($targetFile . '.enc')) {
                $targetFile .= '.enc';
                $filename .= '.enc';
            }
            // User gave base name, check both extensions
            elseif (!str_ends_with($filename, '.zip') && !str_ends_with($filename, '.enc')) {
                if (File::exists($targetFile . '.enc')) {
                    $targetFile .= '.enc';
                    $filename .= '.enc';
                } elseif (File::exists($targetFile . '.zip')) {
                    $targetFile .= '.zip';
                    $filename .= '.zip';
                }
            }
        }
        
        if (!File::exists($targetFile)) {
            throw new \InvalidArgumentException("Backup archive not found: {$filename}");
        }

        // 1. Create immediate Pre-Restore Safety Snapshot of current state
        $safetySnapshot = $this->createBackup('pre_restore');

        // 2. Handle encrypted backups
        $targetZip = $targetFile;
        $decryptedTempFile = null;
        
        if (str_ends_with($targetFile, '.enc')) {
            if (!$this->encryptionKey) {
                throw new \RuntimeException('Cannot restore encrypted backup: BACKUP_ENCRYPTION_KEY not configured');
            }
            $targetZip = $this->decryptBackup($targetFile);
            $decryptedTempFile = $targetZip;
        } elseif (!str_ends_with($targetFile, '.zip')) {
            // Check if corresponding .enc file exists
            $encFile = $targetFile . '.enc';
            if (File::exists($encFile)) {
                if (!$this->encryptionKey) {
                    throw new \RuntimeException('Cannot restore encrypted backup: BACKUP_ENCRYPTION_KEY not configured');
                }
                $targetZip = $this->decryptBackup($encFile);
                $decryptedTempFile = $targetZip;
            }
        }

        // 3. Extract backup zip to a temporary folder
        $tempExtractDir = storage_path("app/backups/restore_temp_" . uniqid());
        File::makeDirectory($tempExtractDir, 0700, true);

        $zip = new ZipArchive();
        if ($zip->open($targetZip) !== true) {
            File::deleteDirectory($tempExtractDir);
            if ($decryptedTempFile) File::delete($decryptedTempFile);
            throw new \RuntimeException("Failed to open backup archive: {$filename}");
        }

        $zip->extractTo($tempExtractDir);
        $zip->close();

        // Clean up decrypted temp file
        if ($decryptedTempFile) {
            File::delete($decryptedTempFile);
        }

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
     * Restore from a monthly .tar.zst or .tar.gz archive (compressed cold storage).
     *
     * @param string $archiveName
     * @return array
     */
    protected function restoreFromArchive(string $archiveName): array
    {
        $archivePath = "{$this->backupPath}/{$archiveName}";
        
        if (!File::exists($archivePath)) {
            throw new \InvalidArgumentException("Archive not found: {$archiveName}");
        }

        // 1. Create immediate Pre-Restore Safety Snapshot of current state
        $safetySnapshot = $this->createBackup('pre_restore');

        // 2. Extract tar.zst/.tar.gz to a temporary folder
        $tempExtractDir = storage_path("app/backups/restore_archive_" . uniqid());
        File::makeDirectory($tempExtractDir, 0700, true);

        try {
            // Decompress based on extension
            $gzContent = File::get($archivePath);
            $tarContent = false;
            
            if (str_ends_with($archiveName, '.tar.zst')) {
                if (function_exists('zstd_decompress')) {
                    $tarContent = zstd_decompress($gzContent);
                } else {
                    throw new \RuntimeException("ZSTD decompression not available. Install php-zstd extension.");
                }
            } elseif (str_ends_with($archiveName, '.tar.gz')) {
                $tarContent = gzdecode($gzContent);
            }
            
            if ($tarContent === false) {
                throw new \RuntimeException("Failed to decompress archive: {$archiveName}");
            }

            // Write tar to temp file
            $tempTarPath = "{$tempExtractDir}/archive.tar";
            File::put($tempTarPath, $tarContent);

            // Extract tar using PharData
            $phar = new \PharData($tempTarPath);
            $phar->extractTo($tempExtractDir);
            $phar = null;
            File::delete($tempTarPath);

            // 3. Find backup files inside the archive (should be .zip or .zip.enc)
            $extractedFiles = File::files($tempExtractDir);
            $backupFiles = [];
            
            foreach ($extractedFiles as $file) {
                $name = $file->getFilename();
                if (str_ends_with($name, '.zip') || str_ends_with($name, '.zip.enc')) {
                    $backupFiles[] = $file->getRealPath();
                }
            }

            if (empty($backupFiles)) {
                throw new \RuntimeException("No valid backup archives found in {$archiveName}");
            }

            // Sort by date in filename (newest first)
            usort($backupFiles, function($a, $b) {
                // Extract timestamp from filename
                preg_match('/_(\d{8}_\d{6})/', basename($a), $ma);
                preg_match('/_(\d{8}_\d{6})/', basename($b), $mb);
                $da = $ma[1] ?? '';
                $db = $mb[1] ?? '';
                return strcmp($db, $da);
            });

            // Use the most recent backup in the archive
            $selectedBackup = $backupFiles[0];
            $selectedName = basename($selectedBackup);

            // 4. Handle encrypted backups inside archive
            $targetZip = $selectedBackup;
            $decryptedTempFile = null;
            
            if (str_ends_with($selectedBackup, '.enc')) {
                if (!$this->encryptionKey) {
                    throw new \RuntimeException('Cannot restore encrypted backup from archive: BACKUP_ENCRYPTION_KEY not configured');
                }
                $targetZip = $this->decryptBackup($selectedBackup);
                $decryptedTempFile = $targetZip;
            }

            // 5. Extract the selected backup zip
            $backupExtractDir = storage_path("app/backups/restore_backup_" . uniqid());
            File::makeDirectory($backupExtractDir, 0700, true);

            $zip = new ZipArchive();
            if ($zip->open($targetZip) !== true) {
                File::deleteDirectory($backupExtractDir);
                File::deleteDirectory($tempExtractDir);
                if ($decryptedTempFile) File::delete($decryptedTempFile);
                throw new \RuntimeException("Failed to open backup archive from archive: {$selectedName}");
            }

            $zip->extractTo($backupExtractDir);
            $zip->close();

            // Clean up decrypted temp file
            if ($decryptedTempFile) {
                File::delete($decryptedTempFile);
            }

            // 6. Restore Database and Files from the extracted backup
            $connection = config('database.default');

            if ($connection === 'sqlite') {
                $sqliteDump = "{$backupExtractDir}/database.sqlite";
                if (File::exists($sqliteDump)) {
                    $targetDb = config('database.connections.sqlite.database');
                    DB::purge('sqlite');
                    File::copy($sqliteDump, $targetDb);
                    DB::reconnect('sqlite');
                }
            } elseif ($connection === 'mysql') {
                $sqlDump = "{$backupExtractDir}/database.sql";
                if (File::exists($sqlDump)) {
                    $sqlContent = File::get($sqlDump);
                    DB::unprepared($sqlContent);
                }
            }

            $extractedFilesDir = "{$backupExtractDir}/files";
            if (File::isDirectory($extractedFilesDir)) {
                $publicStorage = storage_path('app/public');
                File::copyDirectory($extractedFilesDir, $publicStorage);
            }

            Log::warning("CiviCORE restored from archive {$archiveName} (using backup {$selectedName}). Safety snapshot created: {$safetySnapshot['filename']}");

            return [
                'success'         => true,
                'restored_file'   => "{$archiveName} (backup: {$selectedName})",
                'safety_snapshot' => $safetySnapshot['filename'],
                'message'         => "System successfully restored from archive {$archiveName} (using backup {$selectedName}). An automatic safety copy ({$safetySnapshot['filename']}) was saved first.",
            ];
        } finally {
            // Always clean up temporary directories
            File::deleteDirectory($tempExtractDir);
            if (isset($backupExtractDir) && File::isDirectory($backupExtractDir)) {
                File::deleteDirectory($backupExtractDir);
            }
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
                // Also delete the counterpart (.enc for .zip, .zip for .enc)
                if (str_ends_with($filePath, '.enc')) {
                    $zipPath = substr($filePath, 0, -4);
                    if (File::exists($zipPath)) {
                        File::delete($zipPath);
                    }
                } elseif (str_ends_with($filePath, '.zip')) {
                    $encPath = $filePath . '.enc';
                    if (File::exists($encPath)) {
                        File::delete($encPath);
                    }
                }
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
            'weekly'      => 'Weekly Weekly',
            'monthly'     => 'Monthly Backup',
            '6month'      => '6-Month Backup',
            'pre_restore' => 'Automatic Safety Copy',
            default       => 'Manual Backup',
        };
    }

    /**
     * Generate a short confirmation token from backup filename.
     * Used for restore verification - harder than "RESTORE" but easier than full filename.
     */
    protected function generateConfirmationToken(string $baseName): string
    {
        // Use last 8 chars of md5 of the base name (without .zip/.enc)
        // Results in something like "CONF-A3F2K9"
        $hash = md5($baseName);
        return 'CONF-' . strtoupper(substr($hash, -6));
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

    /**
     * Compress backups older than N days into monthly tar.gz archives for cold storage.
     *
     * @param int $olderThanDays
     * @return array
     */
    public function compressOldBackups(int $olderThanDays = 7): array
    {
        $backups = $this->listBackups();
        $now = Carbon::now('Asia/Manila');
        $toCompress = [];

        foreach ($backups as $backup) {
            // Skip .enc files - already encrypted (incompressible)
            if (str_ends_with($backup['filename'], '.enc')) {
                continue;
            }
            $created = Carbon::parse($backup['created_at'], 'Asia/Manila');
            if ($created->diffInDays($now) >= $olderThanDays) {
                $toCompress[] = $backup;
            }
        }

        if (empty($toCompress)) {
            return [];
        }

        // Group by month (YYYYMM)
        $byMonth = [];
        foreach ($toCompress as $backup) {
            $month = Carbon::parse($backup['created_at'], 'Asia/Manila')->format('Ym');
            $byMonth[$month][] = $backup;
        }

        $archived = [];
        foreach ($byMonth as $month => $files) {
            $archiveName = "civicore_archived_{$month}.tar.zst";
            $archivePath = "{$this->backupPath}/{$archiveName}";

            // Create temporary tar file
            $tempTarPath = "{$this->backupPath}/temp_{$month}.tar";
            $phar = new \PharData($tempTarPath);

            foreach ($files as $file) {
                $filePath = "{$this->backupPath}/{$file['filename']}";
                if (File::exists($filePath)) {
                    $phar->addFile($filePath, $file['filename']);
                }
            }
            $phar = null;

            // Read tar content and compress with ZSTD (level 9) if available, else gzip
            $tarContent = File::get($tempTarPath);
            if (function_exists('zstd_compress')) {
                $compressedContent = zstd_compress($tarContent, 9);
            } else {
                $compressedContent = gzencode($tarContent, 9);
            }
            File::put($archivePath, $compressedContent);
            File::delete($tempTarPath);

            // Delete original individual backup files
            foreach ($files as $file) {
                $filePath = "{$this->backupPath}/{$file['filename']}";
                if (File::exists($filePath)) {
                    File::delete($filePath);
                }
                if (str_ends_with($filePath, '.zip')) {
                    $encPath = $filePath . '.enc';
                    if (File::exists($encPath)) {
                        File::delete($encPath);
                    }
                }
            }

            $archived[] = [
                'archive' => $archiveName,
                'files'   => $files,
            ];
        }

        return $archived;
    }
}
