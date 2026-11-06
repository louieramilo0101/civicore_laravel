<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Change JSON columns to LONGTEXT to accommodate encrypted data
            $table->longText('extracted_data')->nullable()->change();
            $table->longText('extracted_fields')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->json('extracted_data')->nullable()->change();
            $table->json('extracted_fields')->nullable()->change();
        });
    }
};