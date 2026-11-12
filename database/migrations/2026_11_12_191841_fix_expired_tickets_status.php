<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update tickets that were auto-cancelled due to expiry (expires_at in the past)
        // to the new 'expired' status instead of 'cancelled'
        DB::table('tickets')
            ->where('request_status', 'cancelled')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now())
            ->update([
                'request_status' => 'expired',
                'queue_status' => 'not_in_lobby',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert: change 'expired' back to 'cancelled' for those with expired expires_at
        DB::table('tickets')
            ->where('request_status', 'expired')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', Carbon::now())
            ->update([
                'request_status' => 'cancelled',
                'queue_status' => 'not_in_lobby',
            ]);
    }
};