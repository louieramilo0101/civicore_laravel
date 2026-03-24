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
        Schema::table('users', function (Blueprint $table) {
            $table->index('email');
        });
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->index('type');
                $table->index('status');
                $table->index('created_at');
                $table->index(['personName', 'barangay']);
            });
        }
        if (Schema::hasTable('issuances')) {
            Schema::table('issuances', function (Blueprint $table) {
                $table->index('type');
                $table->index('certNumber');
            });
        }
        if (Schema::hasTable('barangays')) {
            Schema::table('barangays', function (Blueprint $table) {
                $table->index('name');
            });
        }
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_users_email ON users');
        DB::statement('DROP INDEX IF EXISTS idx_documents_type ON documents');
        DB::statement('DROP INDEX IF EXISTS idx_issuances_type ON issuances');
        DB::statement('DROP INDEX IF EXISTS idx_issuances_cert_number ON issuances');
        DB::statement('DROP INDEX IF EXISTS idx_barangays_name ON barangays');
    }
};

