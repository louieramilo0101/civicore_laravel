<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->string('registry_number')->nullable()->index()->after('certNumber');
        });
    }

    public function down(): void
    {
        Schema::table('issuances', function (Blueprint $table) {
            $table->dropIndex(['registry_number']);
            $table->dropColumn('registry_number');
        });
    }
};