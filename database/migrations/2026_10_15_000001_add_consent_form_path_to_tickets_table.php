<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds consent_form_path to the tickets table for client authorization/ID uploads.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('tickets', 'consent_form_path')) {
                $table->string('consent_form_path', 500)->nullable()->after('qr_code_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'consent_form_path')) {
                $table->dropColumn('consent_form_path');
            }
        });
    }
};
