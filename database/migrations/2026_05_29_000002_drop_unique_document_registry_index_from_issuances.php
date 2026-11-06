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
        // On MySQL, the unique index on document_id is also used as the
        // foreign key constraint, so we must drop the FK first.
        Schema::table('issuances', function (Blueprint $table) {
            $table->dropForeign(['document_id']);
        });

        Schema::table('issuances', function (Blueprint $table) {
            $table->dropUnique('unique_document_registry');
            $table->index('document_id', 'document_id_index');
            $table->foreign('document_id')->references('id')->on('documents')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->dropIndex('document_id_index');
            $table->unique('document_id', 'unique_document_registry');
        });
    }
};
