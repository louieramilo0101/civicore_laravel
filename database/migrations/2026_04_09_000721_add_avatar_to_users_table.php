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
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->after('role', function ($table) {
                // Using longtext or binary for base64/blob storage
                // For direct file data storage as seen in other migrations:
            });
        });
        
        // Match the pattern used in previous migrations for BLOB data
        DB::statement("ALTER TABLE users ADD COLUMN avatar LONGBLOB AFTER role");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar');
        });
    }
};
