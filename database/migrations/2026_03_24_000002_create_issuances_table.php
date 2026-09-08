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
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('issuances')) {
            Schema::create('issuances', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('document_id')->nullable()->unique('unique_document_registry');
                $table->string('certNumber')->unique();
                $table->string('type');
                $table->string('name');
                $table->string('barangay')->nullable();
                $table->string('issuanceDate');
                $table->string('status')->default('Active');
                $table->string('encoded_by')->nullable();
                $table->text('extracted_data')->nullable();
                $table->string('file_path')->nullable();
                $table->timestamps();
                $table->softDeletes();

                // Foreign key with cascadeOnDelete to ensure clean removal
                $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('issuances');
    }
};
