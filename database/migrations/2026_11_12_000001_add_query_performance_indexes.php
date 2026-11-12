<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds composite indexes that back the hot query paths identified in
     * DocumentController (list view, daily-scan-limit, archived view):
     *
     *  - LEFT JOIN subqueries in index() filter `deleted_at IS NULL` then
     *    GROUP BY document_id. A leading (deleted_at, document_id) index
     *    lets MySQL use the index for both the filter and the grouping.
     *
     *  - The daily upload-scan-limit count uses `status IN (...)` +
     *    `updated_at BETWEEN start AND end`. (status, updated_at) is the
     *    ideal covering order.
     *
     *  - The archived() view filters `deleted_at IS NOT NULL` and sorts by
     *    `deleted_at DESC`. A (deleted_at, updated_at) index serves both.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->index(['deleted_at', 'document_id'], 'idx_tickets_del_doc');
        });

        Schema::table('issuances', function (Blueprint $table) {
            $table->index(['deleted_at', 'document_id'], 'idx_issuances_del_doc');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->index(['status', 'updated_at'], 'idx_documents_status_updated');
            $table->index(['deleted_at', 'updated_at'], 'idx_documents_del_updated');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('idx_tickets_del_doc');
        });

        Schema::table('issuances', function (Blueprint $table) {
            $table->dropIndex('idx_issuances_del_doc');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex('idx_documents_status_updated');
            $table->dropIndex('idx_documents_del_updated');
        });
    }
};