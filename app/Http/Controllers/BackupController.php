<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;
use App\Models\ActivityLog;
use App\Services\BackupService;

/**
 * Controller for SuperAdmin system backup creation, listing, and recovery.
 * Note: Direct file downloads are deliberately omitted to preserve data confidentiality.
 */
class BackupController extends Controller
{
    protected BackupService $backupService;

    public function __construct(BackupService $backupService)
    {
        $this->backupService = $backupService;
    }

    /**
     * Retrieve the current session user.
     */
    private function sessionUser(Request $request): ?User
    {
        $userId = $request->session()->get('user_id');
        return $userId ? User::find($userId) : null;
    }

    /**
     * GET /api/backups
     * SuperAdmin only - list all backup archives.
     */
    public function index(Request $request)
    {
        $actor = $this->sessionUser($request);
        if (!$actor || $actor->role !== 'SuperAdmin') {
            return response()->json(['error' => 'Forbidden. SuperAdmin access required.'], 403);
        }

        $backups = $this->backupService->listBackups();
        $totalBytes = array_sum(array_column($backups, 'size'));

        return response()->json([
            'success' => true,
            'backups' => $backups,
            'stats'   => [
                'total_count' => count($backups),
                'total_size'  => $this->formatBytes($totalBytes),
                'latest_at'   => !empty($backups) ? $backups[0]['created_at'] : null,
            ],
        ]);
    }

    /**
     * POST /api/backups
     * SuperAdmin only - trigger an on-demand snapshot.
     */
    public function store(Request $request)
    {
        $actor = $this->sessionUser($request);
        if (!$actor || $actor->role !== 'SuperAdmin') {
            return response()->json(['error' => 'Forbidden. SuperAdmin access required.'], 403);
        }

        try {
            $backup = $this->backupService->createBackup('manual');

            // Log activity
            try {
                ActivityLog::create([
                    'user_id'    => $actor->id,
                    'action'     => 'Created System Backup',
                    'details'    => "Manual backup {$backup['filename']} created ({$backup['size_human']})",
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json([
                'success' => true,
                'message' => 'System backup created successfully.',
                'backup'  => $backup,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Backup creation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/backups/restore
     * SuperAdmin only - restores the system from a selected backup.
     * Verifies administrative password, confirmation token, and takes a pre-restore safety snapshot first.
     */
    public function restore(Request $request)
    {
        $actor = $this->sessionUser($request);
        if (!$actor || $actor->role !== 'SuperAdmin') {
            return response()->json(['error' => 'Forbidden. SuperAdmin access required.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'filename' => ['required', 'string', 'regex:/^civicore_[a-z0-9_]+\.zip(?:\.enc)?$|^civicore_archived_\d{6}\.tar\.(gz|zst)$/'],
            'password' => ['required', 'string'],
            'confirmation' => ['required', 'string', 'min:6', 'max:20'],
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 400);
        }

        // Verify SuperAdmin password
        if (!Hash::check($request->input('password'), $actor->password)) {
            return response()->json(['error' => 'Invalid administrative password. Restore rejected.'], 401);
        }

        // Verify confirmation token
        $filename = $request->input('filename');
        $confirmation = $request->input('confirmation');
        
        $backups = $this->backupService->listBackups();
        $matchingBackup = null;
        
        foreach ($backups as $backup) {
            // Match filename with or without .enc suffix
            $backupFilename = $backup['filename'];
            if ($backupFilename === $filename || 
                ($backupFilename . '.enc' === $filename) ||
                (str_ends_with($backupFilename, '.enc') && substr($backupFilename, 0, -4) === $filename) ||
                $backupFilename === basename($filename)) {
                $matchingBackup = $backup;
                break;
            }
        }

        if (!$matchingBackup) {
            return response()->json(['error' => 'Backup not found: ' . $filename], 404);
        }

        // Check confirmation token (case-insensitive)
        if (strtoupper($confirmation) !== strtoupper($matchingBackup['confirmation_token'])) {
            return response()->json([
                'error' => 'Invalid confirmation token. Please type the exact token shown for this backup (' . $matchingBackup['confirmation_token'] . ').'
            ], 400);
        }

        try {
            $result = $this->backupService->restoreBackup($filename);

            // Clear cache
            try {
                Artisan::call('cache:clear');
            } catch (\Throwable $e) {}

            // Log restoration
            try {
                ActivityLog::create([
                    'user_id'    => $actor->id,
                    'action'     => 'Restored System Backup',
                    'details'    => "System restored from archive {$filename}. Safety snapshot: {$result['safety_snapshot']}",
                    'ip_address' => $request->ip(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json([
                'success'         => true,
                'message'         => $result['message'],
                'safety_snapshot' => $result['safety_snapshot'],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => 'Restore operation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper to format bytes into readable units.
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) return number_format($bytes / 1073741824, 2) . ' GB';
        if ($bytes >= 1048576)    return number_format($bytes / 1048576, 2) . ' MB';
        if ($bytes >= 1024)       return number_format($bytes / 1024, 2) . ' KB';
        return $bytes . ' B';
    }
}
