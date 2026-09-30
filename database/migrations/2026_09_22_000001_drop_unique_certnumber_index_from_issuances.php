<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Drops the global unique constraint on issuances.certNumber in MySQL environments
 * to allow type-scoped uniqueness and administrative force-overrides at the application layer.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            $indexes = DB::select("SHOW INDEX FROM issuances WHERE Key_name = 'issuances_certnumber_unique'");
            if (!empty($indexes)) {
                Schema::table('issuances', function (Blueprint $table) {
                    $table->dropUnique('issuances_certnumber_unique');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            Schema::table('issuances', function (Blueprint $table) {
                $table->unique('certNumber', 'issuances_certnumber_unique');
            });
        }
    }
};
