<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Adds scheduled_date to the tickets table.
 *
 * Before this migration every ticket was implicitly scheduled for its
 * created_at date.  After this change, a ticket submitted after 5 PM is
 * automatically scheduled for the following day so the per-day duplicate
 * limit is calculated against the intended service date, not the
 * submission timestamp.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('tickets', 'scheduled_date')) {
                // Store only the date portion (no time) for easy whereDate() comparisons
                $table->date('scheduled_date')->nullable()->after('expires_at');
            }
        });

        // Back-fill existing rows: use the date portion of created_at
        DB::statement("UPDATE tickets SET scheduled_date = DATE(created_at) WHERE scheduled_date IS NULL");
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'scheduled_date')) {
                $table->dropColumn('scheduled_date');
            }
        });
    }
};
