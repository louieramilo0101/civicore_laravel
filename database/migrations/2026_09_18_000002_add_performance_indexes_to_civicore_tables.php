<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->index(['type', 'status'], 'idx_documents_type_status');
            $table->index(['status', 'created_at'], 'idx_documents_status_created');
        });

        Schema::table('issuances', function (Blueprint $table) {
            $table->index(['certificate_type', 'status'], 'idx_issuances_type_status');
            $table->index(['status', 'created_at'], 'idx_issuances_status_created');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->index(['queue_status', 'request_status', 'created_at'], 'idx_tickets_queue_request_status');
        });

        Schema::table('verification_codes', function (Blueprint $table) {
            $table->index(['email', 'used', 'expires_at'], 'idx_verif_email_used_expires');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex('idx_documents_type_status');
            $table->dropIndex('idx_documents_status_created');
        });

        Schema::table('issuances', function (Blueprint $table) {
            $table->dropIndex('idx_issuances_type_status');
            $table->dropIndex('idx_issuances_status_created');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex('idx_tickets_queue_request_status');
        });

        Schema::table('verification_codes', function (Blueprint $table) {
            $table->dropIndex('idx_verif_email_used_expires');
        });
    }
};
