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
        // Add index on users.email for faster login lookups
        DB::statement('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        
        // Add index on documents.type for filtering
        DB::statement('CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type)');
        
        // Add index on issuances.type for certificate number generation
        DB::statement('CREATE INDEX IF NOT EXISTS idx_issuances_type ON issuances(type)');
        
        // Add index on issuances.certNumber for sorting
        DB::statement('CREATE INDEX IF NOT EXISTS idx_issuances_cert_number ON issuances(certNumber)');
        
        // Add index on barangays.name for sorting
        DB::statement('CREATE INDEX IF NOT EXISTS idx_barangays_name ON barangays(name)');
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

