<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS issuances_certnumber_unique');
        } elseif ($driver === 'mysql') {
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
        Schema::table('issuances', function (Blueprint $table) {
            $table->unique('certNumber', 'issuances_certnumber_unique');
        });
    }
};

