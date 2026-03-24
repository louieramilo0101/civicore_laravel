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
                $table->longText('ocr_text')->nullable();
                $table->binary('file_data')->nullable(); // Using binary for longblob storage
                $table->timestamps();
            });
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
