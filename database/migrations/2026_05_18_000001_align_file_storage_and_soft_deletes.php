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
        Schema::table('documents', function (Blueprint $table) {
            if (!Schema::hasColumn('documents', 'file_path')) {
                $table->string('file_path')->nullable()->after('metadata');
            }

            if (!Schema::hasColumn('documents', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('issuances', function (Blueprint $table) {
            if (!Schema::hasColumn('issuances', 'file_path')) {
                $table->string('file_path')->nullable()->after('extracted_data');
            }

            if (!Schema::hasColumn('issuances', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    /**
     * Reverse the migration changes.
     */
    public function down(): void
    {
        // Keep this rollback non-destructive. These columns may have existed before
        // this alignment migration, so dropping them could remove live data.
    }
};
