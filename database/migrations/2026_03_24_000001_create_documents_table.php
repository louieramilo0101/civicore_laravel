<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Defines the Migration migration implementation.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('documents')) {
            Schema::create('documents', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type');
                $table->string('date');
                $table->string('size');
                $table->string('status')->default('Uploaded');
                $table->longText('previewData')->nullable();
                $table->string('personName')->nullable();
                $table->string('barangay')->nullable();
                $table->json('metadata')->nullable();
                
                // File path instead of LONGBLOB
                $table->string('file_path')->nullable()->comment('Path to stored file in storage/app/public/documents');
                
                // OCR and extraction fields
                $table->longText('raw_text')->nullable()->comment('Raw OCR text for full-text searchability');
                $table->json('extracted_data')->nullable()->comment('JSON extracted fields from OCR (Name, Date, etc.)');
                $table->longText('ocr_text')->nullable();
                $table->json('extracted_fields')->nullable();
                $table->string('detected_type')->nullable();
                $table->boolean('parental_consent')->default(false);
                
                $table->string('encoded_by')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });

            // Create FULLTEXT index for full-text search on raw_text and name
            if (DB::getDriverName() !== 'sqlite') {
                DB::statement('ALTER TABLE documents ADD FULLTEXT INDEX ft_raw_text_name (raw_text, name)');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
