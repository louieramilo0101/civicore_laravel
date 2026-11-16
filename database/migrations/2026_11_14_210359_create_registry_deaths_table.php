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
        Schema::create('registry_deaths', function (Blueprint $table) {
            $table->id();
            $table->string('certNumber')->unique()->index();
            $table->string('registry_number')->nullable()->index();
            $table->string('name');
            $table->string('barangay')->nullable()->index();
            $table->string('issuanceDate')->index();
            $table->enum('status', ['active', 'archived'])->default('active')->index();
            $table->string('encoded_by')->nullable();
            $table->longText('extracted_data')->nullable();
            $table->string('file_path')->nullable();
            $table->string('image_path')->nullable();
            $table->unsignedBigInteger('document_id')->nullable()->index();
            $table->timestamp('archived_at')->nullable();
            $table->string('archive_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Foreign key to documents table (scans/uploads)
            $table->foreign('document_id')->references('id')->on('documents')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registry_deaths');
    }
};