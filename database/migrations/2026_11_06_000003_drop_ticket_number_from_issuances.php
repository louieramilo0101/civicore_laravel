<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->dropColumn('ticket_number');
        });
    }

    public function down(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->string('ticket_number')->nullable()->index()->after('document_id');
        });
    }
};

