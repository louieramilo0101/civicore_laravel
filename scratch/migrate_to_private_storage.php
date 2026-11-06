<?php
/**
 * One-time migration: move document files from public disk to local (private) disk.
 * Run via: php scratch/migrate_to_private_storage.php
 */

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\Storage;

$publicDisk = Storage::disk('public');
$localDisk  = Storage::disk('local');

$folders = ['documents', 'issuances'];
$moved = 0;
$skipped = 0;
$errors = 0;

foreach ($folders as $folder) {
    if (!$publicDisk->exists($folder)) {
        echo "Folder not found on public disk: $folder — skipping.\n";
        continue;
    }

    $files = $publicDisk->files($folder);
    echo "Found " . count($files) . " files in public/$folder\n";

    foreach ($files as $relativePath) {
        try {
            if ($localDisk->exists($relativePath)) {
                echo "  SKIP (already exists): $relativePath\n";
                $skipped++;
                continue;
            }

            $contents = $publicDisk->get($relativePath);
            $localDisk->put($relativePath, $contents);

            // Verify it was written
            if ($localDisk->exists($relativePath)) {
                $publicDisk->delete($relativePath);
                echo "  OK: $relativePath\n";
                $moved++;
            } else {
                echo "  ERROR: Failed to verify write for $relativePath\n";
                $errors++;
            }
        } catch (\Throwable $e) {
            echo "  ERROR: $relativePath — " . $e->getMessage() . "\n";
            $errors++;
        }
    }
}

echo "\n--- Migration complete ---\n";
echo "Moved:   $moved\n";
echo "Skipped: $skipped (already existed on private disk)\n";
echo "Errors:  $errors\n";

