<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class CleanupExpiredTokens extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'civicore:clean-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean up expired OTP verification codes and old temporary uploaded files';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting CiviCore cleanup maintenance...');

        // 1. Purge expired verification codes older than 24 hours
        $deletedCodes = DB::table('verification_codes')
            ->where('expires_at', '<', Carbon::now()->subHours(24))
            ->orWhere(function ($query) {
                $query->where('used', 1)
                      ->where('updated_at', '<', Carbon::now()->subHours(24));
            })
            ->delete();

        $this->info("Cleaned up {$deletedCodes} expired/used verification codes.");

        // 2. Clean up temporary OCR images in storage/app/public/temp/ older than 48 hours
        if (Storage::disk('public')->exists('temp')) {
            $files = Storage::disk('public')->files('temp');
            $cleanedFiles = 0;
            $now = time();

            foreach ($files as $file) {
                $lastModified = Storage::disk('public')->lastModified($file);
                if (($now - $lastModified) > 172800) { // 48 hours
                    Storage::disk('public')->delete($file);
                    $cleanedFiles++;
                }
            }
            $this->info("Cleaned up {$cleanedFiles} old temporary files.");
        }

        $this->info('CiviCore cleanup maintenance completed successfully.');
        return Command::SUCCESS;
    }
}
