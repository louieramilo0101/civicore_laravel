<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_issuances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ticket_id')->nullable()->index();
            $table->string('ticket_number')->nullable()->index();
            $table->unsignedBigInteger('document_id')->nullable()->index();
            $table->string('certNumber')->nullable()->index();
            $table->string('registry_number')->nullable()->index();
            $table->string('type')->nullable();
            $table->string('certificate_type')->nullable();
            $table->string('name')->nullable();
            $table->string('barangay')->nullable();
            $table->string('issuanceDate')->nullable();
            $table->string('status')->default('Active');
            $table->string('encoded_by')->nullable();
            $table->string('or_number')->nullable()->index();
            $table->string('print_remarks')->nullable();
            $table->string('requested_by')->nullable();
            $table->string('approved_by')->nullable();
            $table->longText('extracted_data')->nullable();
            $table->string('file_path')->nullable();
            $table->string('image_path')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_issuances');
    }
};

