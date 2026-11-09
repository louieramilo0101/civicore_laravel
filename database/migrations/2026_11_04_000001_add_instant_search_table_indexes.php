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
        // ── 1. Enable WAL mode & fast pragmas for SQLite ──
        if (DB::connection()->getDriverName() === 'sqlite') {
            try {
                DB::statement('PRAGMA journal_mode = WAL;');
                DB::statement('PRAGMA synchronous = NORMAL;');
                DB::statement('PRAGMA cache_size = -64000;'); // 64MB cache
                DB::statement('PRAGMA temp_store = MEMORY;');
            } catch (\Throwable $e) {
                // Ignore if pragma fails
            }
        }

        // Helper to safely add index
        $addIndex = function ($table, $columns, $name) {
            try {
                if (Schema::hasTable($table)) {
                    Schema::table($table, function (Blueprint $t) use ($columns, $name) {
                        $t->index($columns, $name);
                    });
                }
            } catch (\Throwable $e) {
                // Index might already exist
            }
        };

        // ── 2. Issuances table indexes ──
        $addIndex('issuances', 'certNumber', 'idx_issuances_certnumber');
        $addIndex('issuances', 'name', 'idx_issuances_name');
        $addIndex('issuances', 'barangay', 'idx_issuances_barangay');
        $addIndex('issuances', 'type', 'idx_issuances_type');
        // ticket_number column is dropped in later migration (2026_11_06), so skip index
        $addIndex('issuances', 'or_number', 'idx_issuances_or_number');
        $addIndex('issuances', 'deleted_at', 'idx_issuances_deleted_at');
        $addIndex('issuances', 'issuanceDate', 'idx_issuances_issuance_date');
        $addIndex('issuances', ['deleted_at', 'type'], 'idx_issuances_del_type');
        $addIndex('issuances', ['deleted_at', 'certNumber'], 'idx_issuances_del_certno');
        $addIndex('issuances', ['deleted_at', 'name'], 'idx_issuances_del_name');
        $addIndex('issuances', ['deleted_at', 'barangay'], 'idx_issuances_del_brgy');

        // ── 3. Documents table indexes ──
        $addIndex('documents', 'name', 'idx_documents_name');
        $addIndex('documents', 'personName', 'idx_documents_person_name');
        $addIndex('documents', 'barangay', 'idx_documents_barangay');
        $addIndex('documents', 'type', 'idx_documents_type');
        $addIndex('documents', 'status', 'idx_documents_status');
        $addIndex('documents', 'deleted_at', 'idx_documents_deleted_at');
        $addIndex('documents', ['deleted_at', 'type'], 'idx_documents_del_type');
        $addIndex('documents', ['deleted_at', 'status'], 'idx_documents_del_status');
        $addIndex('documents', ['deleted_at', 'personName'], 'idx_documents_del_person');
        $addIndex('documents', ['deleted_at', 'barangay'], 'idx_documents_del_brgy');

        // ── 4. Tickets table indexes ──
        $addIndex('tickets', 'client_name', 'idx_tickets_client_name');
        $addIndex('tickets', 'ticket_number', 'idx_tickets_ticket_num');
        $addIndex('tickets', 'purpose', 'idx_tickets_purpose');
        $addIndex('tickets', 'queue_status', 'idx_tickets_queue_status');
        $addIndex('tickets', 'request_status', 'idx_tickets_req_status');
        $addIndex('tickets', 'scheduled_date', 'idx_tickets_sched_date');
        $addIndex('tickets', 'deleted_at', 'idx_tickets_deleted_at');
        $addIndex('tickets', ['deleted_at', 'request_status'], 'idx_tickets_del_req_status');
        $addIndex('tickets', ['deleted_at', 'purpose'], 'idx_tickets_del_purpose');
        $addIndex('tickets', ['deleted_at', 'client_name'], 'idx_tickets_del_client');

        // ── 5. History & Activity logs indexes ──
        $addIndex('document_history_logs', 'action', 'idx_doc_hist_action');
        $addIndex('document_history_logs', 'created_at', 'idx_doc_hist_created');
        $addIndex('activity_logs', 'user_name', 'idx_act_logs_user_name');
        $addIndex('activity_logs', ['record_type', 'record_id'], 'idx_act_logs_record');
        $addIndex('activity_logs', 'created_at', 'idx_act_logs_created');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $dropIndex = function ($table, $name) {
            try {
                if (Schema::hasTable($table)) {
                    Schema::table($table, function (Blueprint $t) use ($name) {
                        $t->dropIndex($name);
                    });
                }
            } catch (\Throwable $e) {}
        };

        $dropIndex('issuances', 'idx_issuances_certnumber');
        $dropIndex('issuances', 'idx_issuances_name');
        $dropIndex('issuances', 'idx_issuances_barangay');
        $dropIndex('issuances', 'idx_issuances_type');
        // ticket_number index was never created (column dropped later)
        $dropIndex('issuances', 'idx_issuances_or_number');
        $dropIndex('issuances', 'idx_issuances_deleted_at');
        $dropIndex('issuances', 'idx_issuances_issuance_date');
        $dropIndex('issuances', 'idx_issuances_del_type');
        $dropIndex('issuances', 'idx_issuances_del_certno');
        $dropIndex('issuances', 'idx_issuances_del_name');
        $dropIndex('issuances', 'idx_issuances_del_brgy');

        $dropIndex('documents', 'idx_documents_name');
        $dropIndex('documents', 'idx_documents_person_name');
        $dropIndex('documents', 'idx_documents_barangay');
        $dropIndex('documents', 'idx_documents_type');
        $dropIndex('documents', 'idx_documents_status');
        $dropIndex('documents', 'idx_documents_deleted_at');
        $dropIndex('documents', 'idx_documents_del_type');
        $dropIndex('documents', 'idx_documents_del_status');
        $dropIndex('documents', 'idx_documents_del_person');
        $dropIndex('documents', 'idx_documents_del_brgy');

        $dropIndex('tickets', 'idx_tickets_client_name');
        $dropIndex('tickets', 'idx_tickets_ticket_num');
        $dropIndex('tickets', 'idx_tickets_purpose');
        $dropIndex('tickets', 'idx_tickets_queue_status');
        $dropIndex('tickets', 'idx_tickets_req_status');
        $dropIndex('tickets', 'idx_tickets_sched_date');
        $dropIndex('tickets', 'idx_tickets_deleted_at');
        $dropIndex('tickets', 'idx_tickets_del_req_status');
        $dropIndex('tickets', 'idx_tickets_del_purpose');
        $dropIndex('tickets', 'idx_tickets_del_client');

        $dropIndex('document_history_logs', 'idx_doc_hist_action');
        $dropIndex('document_history_logs', 'idx_doc_hist_created');
        $dropIndex('activity_logs', 'idx_act_logs_user_name');
        $dropIndex('activity_logs', 'idx_act_logs_record');
        $dropIndex('activity_logs', 'idx_act_logs_created');
    }
};

