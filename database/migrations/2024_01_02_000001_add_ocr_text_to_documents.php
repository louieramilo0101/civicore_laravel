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
        if (Schema::hasTable('documents')) {
            Schema::table('documents', function (Blueprint $table) {
                // Add LONGTEXT column to store OCR extracted text
                // Using LONGTEXT to support large amounts of extracted text
                $table->longText('ocr_text')->nullable()->after('file_data');
            });
        }
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('ocr_text');
        });
    }
};

