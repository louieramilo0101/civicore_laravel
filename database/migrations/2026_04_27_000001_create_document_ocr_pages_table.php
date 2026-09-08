<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Defines the Migration migration implementation.
 */
return new class extends Migration
{
    /**
     * Apply the migration changes.
     */
    public function up(): void
    {
        Schema::create('document_ocr_pages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_id');
            $table->unsignedInteger('page_no');
            $table->longText('text')->nullable();
            $table->json('extracted_fields')->nullable();
            $table->string('detected_type')->nullable();
            $table->timestamps();

            $table->unique(['document_id', 'page_no']);
            $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migration changes.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_ocr_pages');
    }
};
