<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Defines the Migration migration implementation.
 */
return new class extends Migration
{
    /**
     * Apply the migration changes.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Expiry: set to 5 PM (17:00) on day of submission
            if (!Schema::hasColumn('tickets', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('token');
            }
            // Track if walk-in or online
            if (!Schema::hasColumn('tickets', 'source')) {
                $table->enum('source', ['online', 'walk_in'])->default('online')->after('expires_at');
            }
            // Path to generated QR PNG stored in storage/app/public/qrcodes/
            if (!Schema::hasColumn('tickets', 'qr_code_path')) {
                $table->string('qr_code_path')->nullable()->after('source');
            }
        });

        // Add 'Expired' to the status enum (MySQL specific)
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('Pending','Serving','Completed','Cancelled','Expired') DEFAULT 'Pending'");
        }
    }

    /**
     * Reverse the migration changes.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['expires_at', 'source', 'qr_code_path']);
        });
        
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE tickets MODIFY COLUMN status ENUM('Pending','Serving','Completed','Cancelled') DEFAULT 'Pending'");
        }
    }
};
