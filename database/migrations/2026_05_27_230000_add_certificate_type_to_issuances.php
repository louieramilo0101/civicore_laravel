<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Defines the Migration migration implementation.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->enum('certificate_type', ['birth', 'death', 'marriage'])->nullable()->after('type');
        });

        // Retroactively populate existing rows
        $issuances = DB::table('issuances')->get();
        foreach ($issuances as $iss) {
            $type = strtolower($iss->type);
            $certType = null;
            if (str_contains($type, 'birth') || str_contains($type, '102')) {
                $certType = 'birth';
            } elseif (str_contains($type, 'death') || str_contains($type, '103')) {
                $certType = 'death';
            } elseif (str_contains($type, 'marriage') || str_contains($type, '97')) {
                $certType = 'marriage';
            } else {
                $certType = 'birth'; // default fallback
            }
            DB::table('issuances')->where('id', $iss->id)->update(['certificate_type' => $certType]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->dropColumn('certificate_type');
        });
    }
};
