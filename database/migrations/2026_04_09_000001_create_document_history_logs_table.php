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
        Schema::create('document_history_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('document_id')->index();
            $table->string('filename');
            $table->string('person_name')->nullable();
            $table->string('type');
            $table->string('barangay')->nullable();
            $table->string('encoded_by');
            $table->string('action'); // Uploaded, Processed, Deleted
            $table->text('details')->nullable();
            $table->timestamps();
            
            $table->foreign('document_id')->references('id')->on('documents')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_history_logs');
    }
};
